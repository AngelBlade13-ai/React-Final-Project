import { useEffect, useMemo, useState } from "react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useAdminContext } from "../../layouts/AdminLayout";
import { apiBaseUrl } from "../../lib/site";

function parseGuidedPathDraft(value) {
  const parsedPaths = JSON.parse(value);

  if (!Array.isArray(parsedPaths)) {
    throw new Error("Guided paths must be a JSON array.");
  }

  return parsedPaths;
}

function formatPatchValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "None";
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value || "Clear field");
}

export default function AdminPathsPage() {
  useDocumentTitle("Admin Paths");
  const {
    adminFetch,
    saveSiteSettingsDraft,
    savingSiteSettings,
    siteSettingsForm,
    siteSettingsMessage,
    updateSiteSettingsRoot
  } = useAdminContext();
  const [guidedPathsDraft, setGuidedPathsDraft] = useState("[]");
  const [guidedPathsError, setGuidedPathsError] = useState("");
  const [selectedGuidedPathSlug, setSelectedGuidedPathSlug] = useState("");
  const [guidedPathSuggestion, setGuidedPathSuggestion] = useState(null);
  const [guidedPathAssistantLoading, setGuidedPathAssistantLoading] =
    useState(false);
  const [guidedPathAssistantError, setGuidedPathAssistantError] = useState("");
  const [guidedPathAssistantMessage, setGuidedPathAssistantMessage] =
    useState("");

  useEffect(() => {
    setGuidedPathsDraft(
      JSON.stringify(siteSettingsForm.guidedPaths || [], null, 2)
    );
    setGuidedPathsError("");
  }, [siteSettingsForm.guidedPaths]);

  const draftPaths = useMemo(() => {
    try {
      return parseGuidedPathDraft(guidedPathsDraft);
    } catch {
      return [];
    }
  }, [guidedPathsDraft]);

  useEffect(() => {
    if (!draftPaths.length) {
      setSelectedGuidedPathSlug("");
      return;
    }

    if (!draftPaths.some((path) => path.slug === selectedGuidedPathSlug)) {
      setSelectedGuidedPathSlug(draftPaths[0].slug);
    }
  }, [draftPaths, selectedGuidedPathSlug]);

  function applyGuidedPathsDraft(nextPaths, message) {
    setGuidedPathsDraft(JSON.stringify(nextPaths, null, 2));
    updateSiteSettingsRoot("guidedPaths", nextPaths);
    setGuidedPathsError("");
    setGuidedPathAssistantMessage(message);
  }

  function handleGuidedPathsApply() {
    try {
      applyGuidedPathsDraft(
        parseGuidedPathDraft(guidedPathsDraft),
        "Guided paths applied to the unsaved site settings draft."
      );
    } catch (error) {
      setGuidedPathsError(error.message || "Guided paths JSON is invalid.");
    }
  }

  async function handleGuidedPathsSubmit(event) {
    event.preventDefault();

    try {
      const parsedPaths = parseGuidedPathDraft(guidedPathsDraft);
      setGuidedPathsError("");
      updateSiteSettingsRoot("guidedPaths", parsedPaths);
      await saveSiteSettingsDraft({
        ...siteSettingsForm,
        guidedPaths: parsedPaths
      });
    } catch (error) {
      setGuidedPathsError(error.message || "Guided paths JSON is invalid.");
    }
  }

  async function requestPathSuggestion(endpoint, body) {
    const response = await adminFetch(
      `${apiBaseUrl}/admin/assistant/${endpoint}`,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Guided path assistant suggestion failed."
      );
    }

    return data.suggestion || null;
  }

  async function handleGuidedPathAssistantSuggest() {
    setGuidedPathAssistantLoading(true);
    setGuidedPathAssistantError("");
    setGuidedPathAssistantMessage("");
    setGuidedPathSuggestion(null);

    try {
      const paths = parseGuidedPathDraft(guidedPathsDraft);
      const selectedPath =
        paths.find((path) => path.slug === selectedGuidedPathSlug) || paths[0];

      if (!selectedPath) {
        throw new Error(
          "Add or select a guided path before asking the assistant."
        );
      }

      setSelectedGuidedPathSlug(selectedPath.slug);
      setGuidedPathSuggestion(
        await requestPathSuggestion("guided-path-suggestions", {
          guidedPath: selectedPath,
          guidedPaths: paths
        })
      );
    } catch (error) {
      setGuidedPathAssistantError(
        error.message || "Guided path assistant suggestion failed."
      );
    } finally {
      setGuidedPathAssistantLoading(false);
    }
  }

  async function handleNewGuidedPathSuggestion() {
    setGuidedPathAssistantLoading(true);
    setGuidedPathAssistantError("");
    setGuidedPathAssistantMessage("");
    setGuidedPathSuggestion(null);

    try {
      setGuidedPathSuggestion(
        await requestPathSuggestion("guided-path-new-suggestion", {
          guidedPaths: parseGuidedPathDraft(guidedPathsDraft)
        })
      );
    } catch (error) {
      setGuidedPathAssistantError(
        error.message || "New guided path suggestion failed."
      );
    } finally {
      setGuidedPathAssistantLoading(false);
    }
  }

  function handleApplyGuidedPathSuggestion() {
    const patch = guidedPathSuggestion?.suggestedPatch || {};
    const patchKeys = Object.keys(patch);

    if (!patchKeys.length) {
      setGuidedPathAssistantError(
        "The assistant did not return any guided path fields to apply."
      );
      return;
    }

    try {
      const paths = parseGuidedPathDraft(guidedPathsDraft);

      if (guidedPathSuggestion?.isNewPath) {
        const nextSlug = String(patch.slug || "").trim();

        if (!nextSlug) {
          throw new Error("New path suggestions must include a slug.");
        }

        if (paths.some((path) => path.slug === nextSlug)) {
          throw new Error("The suggested path slug already exists.");
        }

        applyGuidedPathsDraft(
          [...paths, patch],
          "Added the new guided path to the unsaved site settings draft."
        );
        setSelectedGuidedPathSlug(nextSlug);
      } else {
        const selectedIndex = paths.findIndex(
          (path) => path.slug === selectedGuidedPathSlug
        );

        if (selectedIndex === -1) {
          throw new Error(
            "Selected guided path no longer exists in the draft JSON."
          );
        }

        applyGuidedPathsDraft(
          paths.map((path, index) =>
            index === selectedIndex ? { ...path, ...patch } : path
          ),
          `Applied ${patchKeys.length} guided path suggestion${patchKeys.length === 1 ? "" : "s"} to the draft.`
        );
      }

      setGuidedPathSuggestion(null);
      setGuidedPathAssistantError("");
    } catch (error) {
      setGuidedPathAssistantError(
        error.message || "Failed to apply guided path suggestion."
      );
    }
  }

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">Guided Paths</p>
        <h2>Manage authored listening paths without touching frontend code.</h2>
        <p>
          Edit existing routes, ask the assistant for path membership, or
          generate new path concepts from catalog gaps. Apply changes here, then
          save site settings to publish them.
        </p>
      </section>

      <section className="intro-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Path Assistant</p>
            <h2>Review or create a guided path.</h2>
          </div>
          <span>{`${draftPaths.length} draft paths`}</span>
        </div>
        <div className="admin-form">
          <label>
            Assistant Target
            <select
              onChange={(event) =>
                setSelectedGuidedPathSlug(event.target.value)
              }
              value={selectedGuidedPathSlug}
            >
              {draftPaths.map((path) => (
                <option key={path.slug} value={path.slug}>
                  {path.title || path.slug}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-form-actions">
            <button
              className="secondary-button"
              disabled={guidedPathAssistantLoading || !draftPaths.length}
              onClick={handleGuidedPathAssistantSuggest}
              type="button"
            >
              {guidedPathAssistantLoading
                ? "Asking Path Assistant..."
                : "Suggest Path Patch"}
            </button>
            <button
              className="secondary-button"
              disabled={guidedPathAssistantLoading}
              onClick={handleNewGuidedPathSuggestion}
              type="button"
            >
              Suggest New Path
            </button>
            {guidedPathSuggestion ? (
              <button
                className="hero-link"
                onClick={handleApplyGuidedPathSuggestion}
                type="button"
              >
                {guidedPathSuggestion.isNewPath
                  ? "Add New Path"
                  : "Apply Path Suggestion"}
              </button>
            ) : null}
          </div>
          {guidedPathAssistantError ? (
            <p className="error-text full-span">{guidedPathAssistantError}</p>
          ) : null}
          {guidedPathAssistantMessage ? (
            <p className="success-text full-span">
              {guidedPathAssistantMessage}
            </p>
          ) : null}
          {guidedPathSuggestion ? (
            <div className="full-span editor-validation-group">
              <p className="meta">
                {guidedPathSuggestion.model || "Local assistant"} /{" "}
                {guidedPathSuggestion.mode || "manual"}
                {guidedPathSuggestion.isNewPath ? " / new path" : ""}
              </p>
              {guidedPathSuggestion.summary ? (
                <p className="upload-status">{guidedPathSuggestion.summary}</p>
              ) : null}
              {Object.keys(guidedPathSuggestion.suggestedPatch || {}).length ? (
                <div className="editor-issue-list">
                  {Object.entries(
                    guidedPathSuggestion.suggestedPatch || {}
                  ).map(([key, value]) => (
                    <article className="editor-issue-link advisory" key={key}>
                      <strong>{key}</strong>
                      <span>{formatPatchValue(value)}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="upload-status">
                  No guided path fields were suggested for this pass.
                </p>
              )}
              {guidedPathSuggestion.rationale?.length ? (
                <>
                  <p className="meta">Rationale</p>
                  <div className="editor-issue-list">
                    {guidedPathSuggestion.rationale.map((item) => (
                      <article
                        className="editor-issue-link advisory"
                        key={item}
                      >
                        <span>{item}</span>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
              {guidedPathSuggestion.warnings?.length ? (
                <>
                  <p className="meta">Warnings</p>
                  <div className="editor-issue-list">
                    {guidedPathSuggestion.warnings.map((item) => (
                      <article className="editor-issue-link" key={item}>
                        <span>{item}</span>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="intro-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Path JSON</p>
            <h2>Edit path definitions and algorithm rules.</h2>
          </div>
          <span>{`${draftPaths.length} paths`}</span>
        </div>
        <form className="admin-form" onSubmit={handleGuidedPathsSubmit}>
          <label className="full-span">
            Paths JSON
            <textarea
              onChange={(event) => setGuidedPathsDraft(event.target.value)}
              rows="22"
              spellCheck="false"
              value={guidedPathsDraft}
            />
          </label>
          <p className="full-span meta">
            Use <code>postSlugs</code> for an exact manual order, or{" "}
            <code>algorithm</code> with fields like <code>collectionSlug</code>,{" "}
            <code>sectionKeys</code>, <code>themeTags</code>,{" "}
            <code>worldLayers</code>, <code>releaseStatuses</code>,{" "}
            <code>maxItems</code>, and <code>sort</code>.
          </p>
          <div className="full-span admin-form-actions">
            <button
              className="secondary-button"
              onClick={handleGuidedPathsApply}
              type="button"
            >
              Apply Paths JSON
            </button>
            <button type="submit">
              {savingSiteSettings ? "Saving..." : "Save Site Settings"}
            </button>
          </div>
          {guidedPathsError ? (
            <p className="error-text full-span">{guidedPathsError}</p>
          ) : null}
          {siteSettingsMessage ? (
            <p className="success-text full-span">{siteSettingsMessage}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
