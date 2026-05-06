import { useEffect, useMemo, useState } from "react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useAdminContext } from "../../layouts/AdminLayout";
import { resolveGuidedListeningPaths } from "../../lib/listeningPaths";
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
    collections,
    posts,
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
  const [songToAddSlug, setSongToAddSlug] = useState("");
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);

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

  const selectedPath = useMemo(
    () =>
      draftPaths.find((path) => path.slug === selectedGuidedPathSlug) ||
      draftPaths[0] ||
      null,
    [draftPaths, selectedGuidedPathSlug]
  );
  const resolvedPaths = useMemo(
    () =>
      resolveGuidedListeningPaths(posts, collections, {
        guidedPaths: draftPaths
      }),
    [collections, draftPaths, posts]
  );
  const resolvedSelectedPath = useMemo(
    () =>
      resolvedPaths.find((path) => path.slug === selectedPath?.slug) || null,
    [resolvedPaths, selectedPath]
  );
  const publicPosts = useMemo(
    () =>
      [...posts]
        .filter((post) => post.published && post.isPubliclyVisible !== false)
        .sort((left, right) =>
          String(left.title || "").localeCompare(String(right.title || ""))
        ),
    [posts]
  );
  const selectedPostSlugs = Array.isArray(selectedPath?.postSlugs)
    ? selectedPath.postSlugs
    : [];
  const selectedUsesManualOrder = selectedPostSlugs.length > 0;
  const selectedResolvedPosts = resolvedSelectedPath?.posts || [];
  const availablePostsToAdd = publicPosts.filter(
    (post) => !selectedPostSlugs.includes(post.slug)
  );

  function applyGuidedPathsDraft(nextPaths, message) {
    setGuidedPathsDraft(JSON.stringify(nextPaths, null, 2));
    updateSiteSettingsRoot("guidedPaths", nextPaths);
    setGuidedPathsError("");
    setGuidedPathAssistantMessage(message);
  }

  function updateSelectedPath(updater, message = "Path draft updated.") {
    if (!selectedPath) {
      setGuidedPathsError("Select a path before editing it.");
      return;
    }

    const nextPaths = draftPaths.map((path) =>
      path.slug === selectedPath.slug ? updater(path) : path
    );

    applyGuidedPathsDraft(nextPaths, message);
  }

  function handlePathFieldChange(key, value) {
    updateSelectedPath((path) => ({ ...path, [key]: value }));
  }

  function handleAlgorithmFieldChange(key, value) {
    updateSelectedPath((path) => ({
      ...path,
      algorithm: {
        ...(path.algorithm || {}),
        [key]: value
      }
    }));
  }

  function handleConvertToManualPath() {
    const nextSlugs = selectedResolvedPosts.map((post) => post.slug);

    if (!nextSlugs.length) {
      setGuidedPathsError("This path has no resolved songs to convert.");
      return;
    }

    updateSelectedPath(
      (path) => ({
        ...path,
        postSlugs: nextSlugs
      }),
      "Converted this path to a manual song order."
    );
  }

  function handleRevertToAlgorithmPath() {
    updateSelectedPath(
      (path) => ({
        ...path,
        postSlugs: []
      }),
      "Returned this path to algorithm-driven membership."
    );
  }

  function handleAddSongToPath() {
    const nextSlug = String(songToAddSlug || "").trim();

    if (!nextSlug || selectedPostSlugs.includes(nextSlug)) {
      return;
    }

    updateSelectedPath(
      (path) => ({
        ...path,
        postSlugs: [...(path.postSlugs || []), nextSlug],
        algorithm: selectedUsesManualOrder ? path.algorithm || {} : {}
      }),
      "Added song to the manual path order."
    );
    setSongToAddSlug("");
  }

  function handleRemoveSongFromPath(slug) {
    updateSelectedPath(
      (path) => ({
        ...path,
        postSlugs: (path.postSlugs || []).filter((entry) => entry !== slug)
      }),
      "Removed song from the manual path order."
    );
  }

  function handleMoveSongInPath(slug, direction) {
    const index = selectedPostSlugs.indexOf(slug);
    const nextIndex = index + direction;

    if (
      index === -1 ||
      nextIndex < 0 ||
      nextIndex >= selectedPostSlugs.length
    ) {
      return;
    }

    updateSelectedPath((path) => {
      const nextSlugs = [...(path.postSlugs || [])];
      const [movedSlug] = nextSlugs.splice(index, 1);
      nextSlugs.splice(nextIndex, 0, movedSlug);

      return {
        ...path,
        postSlugs: nextSlugs
      };
    }, "Reordered the manual path.");
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
        <h2>Curate the songs inside each listening path.</h2>
        <p>
          Paths can be algorithm-driven or manually ordered. Algorithm paths
          show the resolved songs they currently produce; convert one to manual
          when you want direct control over the exact song list and order.
        </p>
      </section>

      <section className="intro-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Path Editor</p>
            <h2>Edit path copy and song membership.</h2>
          </div>
          <span>{`${draftPaths.length} paths / ${selectedResolvedPosts.length} songs shown`}</span>
        </div>
        <div className="admin-form">
          <label>
            Path
            <select
              onChange={(event) => {
                setSelectedGuidedPathSlug(event.target.value);
                setGuidedPathSuggestion(null);
                setGuidedPathAssistantError("");
              }}
              value={selectedGuidedPathSlug}
            >
              {draftPaths.map((path) => (
                <option key={path.slug} value={path.slug}>
                  {path.title || path.slug}
                </option>
              ))}
            </select>
          </label>
          <label>
            Membership Mode
            <input
              readOnly
              value={
                selectedUsesManualOrder
                  ? "Manual song order"
                  : "Algorithm-driven"
              }
            />
            <span className="input-help-text">
              {selectedUsesManualOrder
                ? "This path uses the exact postSlugs order below."
                : "postSlugs is empty because this path is resolved from rules, not because it has no songs."}
            </span>
          </label>
          <label>
            Title
            <input
              onChange={(event) =>
                handlePathFieldChange("title", event.target.value)
              }
              value={selectedPath?.title || ""}
            />
          </label>
          <label>
            Eyebrow
            <input
              onChange={(event) =>
                handlePathFieldChange("eyebrow", event.target.value)
              }
              value={selectedPath?.eyebrow || ""}
            />
          </label>
          <label className="full-span">
            Intro
            <textarea
              onChange={(event) =>
                handlePathFieldChange("intro", event.target.value)
              }
              rows="3"
              value={selectedPath?.intro || ""}
            />
          </label>
          <label>
            Mood Note
            <input
              onChange={(event) =>
                handlePathFieldChange("moodNote", event.target.value)
              }
              value={selectedPath?.moodNote || ""}
            />
          </label>
          <label>
            Theme Hint
            <input
              onChange={(event) =>
                handlePathFieldChange("themeHint", event.target.value)
              }
              value={selectedPath?.themeHint || ""}
            />
          </label>
          <div className="full-span admin-form-actions">
            {!selectedUsesManualOrder ? (
              <button
                className="secondary-button"
                disabled={!selectedResolvedPosts.length}
                onClick={handleConvertToManualPath}
                type="button"
              >
                Convert Resolved Songs To Manual Order
              </button>
            ) : (
              <button
                className="secondary-button"
                onClick={handleRevertToAlgorithmPath}
                type="button"
              >
                Clear Manual Order And Use Rules
              </button>
            )}
            <button
              disabled={savingSiteSettings}
              onClick={handleGuidedPathsSubmit}
              type="button"
            >
              {savingSiteSettings ? "Saving..." : "Save Paths"}
            </button>
          </div>
          {guidedPathsError ? (
            <p className="error-text full-span">{guidedPathsError}</p>
          ) : null}
          {siteSettingsMessage ? (
            <p className="success-text full-span">{siteSettingsMessage}</p>
          ) : null}
        </div>
      </section>

      <section className="intro-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              {selectedUsesManualOrder ? "Manual Song Order" : "Resolved Songs"}
            </p>
            <h2>
              {selectedUsesManualOrder
                ? "Drag-free ordering controls for this path."
                : "Songs currently produced by this path's rules."}
            </h2>
          </div>
          <span>{`${selectedResolvedPosts.length} songs`}</span>
        </div>
        {selectedUsesManualOrder ? (
          <div className="admin-form">
            <label className="full-span">
              Add Song
              <select
                onChange={(event) => setSongToAddSlug(event.target.value)}
                value={songToAddSlug}
              >
                <option value="">Choose a public song to add</option>
                {availablePostsToAdd.map((post) => (
                  <option key={post.slug} value={post.slug}>
                    {post.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="full-span admin-form-actions">
              <button
                className="secondary-button"
                disabled={!songToAddSlug}
                onClick={handleAddSongToPath}
                type="button"
              >
                Add Song To Path
              </button>
            </div>
          </div>
        ) : (
          <div className="admin-form">
            <label>
              Collection Rule
              <input
                onChange={(event) =>
                  handleAlgorithmFieldChange(
                    "collectionSlug",
                    event.target.value
                  )
                }
                placeholder="fractureverse"
                value={selectedPath?.algorithm?.collectionSlug || ""}
              />
            </label>
            <label>
              Max Items
              <input
                min="0"
                onChange={(event) =>
                  handleAlgorithmFieldChange(
                    "maxItems",
                    Number(event.target.value) || 0
                  )
                }
                type="number"
                value={selectedPath?.algorithm?.maxItems || 0}
              />
            </label>
            <label>
              Sort
              <select
                onChange={(event) =>
                  handleAlgorithmFieldChange("sort", event.target.value)
                }
                value={selectedPath?.algorithm?.sort || "curated"}
              >
                <option value="curated">Curated</option>
                <option value="fractureverse">Fractureverse</option>
                <option value="eldoria">Eldoria</option>
              </select>
            </label>
            <p className="full-span meta">
              This is a rule preview. Use Convert Resolved Songs To Manual Order
              when the displayed songs are right and you want to lock the path
              down.
            </p>
          </div>
        )}
        <div className="path-song-list">
          {selectedResolvedPosts.map((post, index) => (
            <article className="path-song-row" key={post.slug}>
              <div>
                <span className="path-song-index">{index + 1}</span>
                <strong>{post.title}</strong>
                <p className="meta">
                  {post.slug} / {post.releaseStatus || "canon"}
                </p>
              </div>
              {selectedUsesManualOrder ? (
                <div className="admin-actions">
                  <button
                    className="secondary-button"
                    disabled={index === 0}
                    onClick={() => handleMoveSongInPath(post.slug, -1)}
                    type="button"
                  >
                    Up
                  </button>
                  <button
                    className="secondary-button"
                    disabled={index === selectedResolvedPosts.length - 1}
                    onClick={() => handleMoveSongInPath(post.slug, 1)}
                    type="button"
                  >
                    Down
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => handleRemoveSongFromPath(post.slug)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {!selectedResolvedPosts.length ? (
            <p className="upload-status">
              This path currently resolves to no public songs.
            </p>
          ) : null}
        </div>
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
            <p className="eyebrow">Advanced</p>
            <h2>Raw path JSON for fallback editing.</h2>
          </div>
          <span>{`${draftPaths.length} paths`}</span>
        </div>
        <div className="admin-form">
          <p className="full-span meta">
            Most path work should happen in the editor above. Open this only
            when you need to inspect or paste full path configuration.
          </p>
          <div className="full-span admin-form-actions">
            <button
              className="secondary-button"
              onClick={() => setShowAdvancedJson((current) => !current)}
              type="button"
            >
              {showAdvancedJson ? "Hide Raw JSON" : "Show Raw JSON"}
            </button>
          </div>
        </div>
        {showAdvancedJson ? (
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
              <code>algorithm</code> with fields like{" "}
              <code>collectionSlug</code>, <code>sectionKeys</code>,{" "}
              <code>themeTags</code>, <code>worldLayers</code>,{" "}
              <code>releaseStatuses</code>, <code>maxItems</code>, and{" "}
              <code>sort</code>.
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
        ) : null}
      </section>
    </main>
  );
}
