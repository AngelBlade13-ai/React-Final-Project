import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import {
  buildAssistantStatusUrl,
  readAssistantModelProfile,
  withAssistantProfile,
  writeAssistantModelProfile
} from "../../lib/adminAssistant";
import { apiBaseUrl } from "../../lib/site";
import { useAdminContext } from "../../layouts/AdminLayout";

function formatSeverity(severity) {
  return String(severity || "info")
    .replace(
      /(^|-)([a-z])/g,
      (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`
    )
    .replace("-", " ");
}

function buildAdminFindingLink(finding = {}) {
  const targetSlug = String(finding?.targetSlug || "").trim();
  const targetType = String(finding?.targetType || "catalog")
    .trim()
    .toLowerCase();

  if (targetType === "post" && targetSlug) {
    return `/admin/posts?slug=${encodeURIComponent(targetSlug)}`;
  }

  if (targetType === "collection" && targetSlug) {
    return `/admin/collections?slug=${encodeURIComponent(targetSlug)}`;
  }

  if (targetType === "path" && targetSlug) {
    return `/admin/paths?slug=${encodeURIComponent(targetSlug)}`;
  }

  return "";
}

function formatFindingTarget(finding = {}) {
  const targetType = String(finding?.targetType || "catalog")
    .trim()
    .toLowerCase();
  const targetSlug = String(finding?.targetSlug || "").trim();
  const field = String(finding?.field || "").trim();
  const baseLabel =
    targetType === "post"
      ? "Post"
      : targetType === "collection"
        ? "Collection"
        : targetType === "path"
          ? "Path"
          : "Catalog";

  return [baseLabel, targetSlug, field].filter(Boolean).join(": ");
}

function buildFindingKey(finding = {}, fallback = "") {
  return (
    String(finding?.fingerprint || "").trim() ||
    [
      finding?.targetType || "catalog",
      finding?.targetSlug || "",
      finding?.field || "",
      finding?.issue || "",
      fallback
    ].join(":")
  );
}

function formatPatchValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value || "");
}

async function readJson(responsePromise, fallbackMessage) {
  const response = await responsePromise;
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

export default function AdminAiRuntimePage() {
  useDocumentTitle("Admin AI Runtime");
  const { adminFetch } = useAdminContext();
  const [localAiStatus, setLocalAiStatus] = useState(null);
  const [remotePodStatus, setRemotePodStatus] = useState(null);
  const [remoteTunnelStatus, setRemoteTunnelStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localAiError, setLocalAiError] = useState("");
  const [localAiReview, setLocalAiReview] = useState(null);
  const [localAiReviewLoading, setLocalAiReviewLoading] = useState(false);
  const [localAiReviewError, setLocalAiReviewError] = useState("");
  const [findingReviewLoadingKey, setFindingReviewLoadingKey] = useState("");
  const [findingReviewError, setFindingReviewError] = useState("");
  const [findingReviews, setFindingReviews] = useState({});
  const [remotePodActionLoading, setRemotePodActionLoading] = useState("");
  const [remotePodActionError, setRemotePodActionError] = useState("");
  const [remoteTunnelActionLoading, setRemoteTunnelActionLoading] =
    useState("");
  const [remoteTunnelActionError, setRemoteTunnelActionError] = useState("");
  const [remoteOllamaActionLoading, setRemoteOllamaActionLoading] =
    useState(false);
  const [remoteOllamaActionError, setRemoteOllamaActionError] = useState("");
  const [remoteOllamaMessage, setRemoteOllamaMessage] = useState("");
  const [selectedAssistantProfile, setSelectedAssistantProfile] = useState(() =>
    readAssistantModelProfile()
  );

  const loadAssistantStatus = useCallback(async () => {
    try {
      setLocalAiError("");
      const data = await readJson(
        adminFetch(
          buildAssistantStatusUrl(apiBaseUrl, selectedAssistantProfile)
        ),
        "Failed to load assistant status."
      );

      setLocalAiStatus(data.localAi || null);
      setRemotePodStatus(data.remotePod || null);
      setRemoteTunnelStatus(data.remoteTunnel || null);
    } catch (apiError) {
      setLocalAiStatus(null);
      setRemotePodStatus(null);
      setRemoteTunnelStatus(null);
      setLocalAiError(apiError.message);
    }
  }, [adminFetch, selectedAssistantProfile]);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialStatus() {
      setLoading(true);
      await loadAssistantStatus();

      if (!isCancelled) {
        setLoading(false);
      }
    }

    loadInitialStatus();

    return () => {
      isCancelled = true;
    };
  }, [loadAssistantStatus]);

  function handleAssistantProfileChange(event) {
    const nextProfile = event.target.value;
    setSelectedAssistantProfile(nextProfile);
    writeAssistantModelProfile(nextProfile);
  }

  async function handleRemotePodAction(action) {
    try {
      setRemotePodActionLoading(action);
      setRemotePodActionError("");

      const data = await readJson(
        adminFetch(`${apiBaseUrl}/admin/assistant/remote-pod/${action}`, {
          method: "POST"
        }),
        `Failed to ${action} the remote AI pod.`
      );

      setRemotePodStatus(data.remotePod || null);
      await loadAssistantStatus();
    } catch (apiError) {
      setRemotePodActionError(apiError.message);
    } finally {
      setRemotePodActionLoading("");
    }
  }

  async function handleRemoteTunnelAction(action) {
    try {
      setRemoteTunnelActionLoading(action);
      setRemoteTunnelActionError("");

      const data = await readJson(
        adminFetch(`${apiBaseUrl}/admin/assistant/remote-tunnel/${action}`, {
          method: "POST"
        }),
        `Failed to ${action} the remote AI SSH tunnel.`
      );

      setRemoteTunnelStatus(data.remoteTunnel || null);
      await loadAssistantStatus();
    } catch (apiError) {
      setRemoteTunnelActionError(apiError.message);
    } finally {
      setRemoteTunnelActionLoading("");
    }
  }

  async function handleRemoteOllamaWake() {
    try {
      setRemoteOllamaActionLoading(true);
      setRemoteOllamaActionError("");
      setRemoteOllamaMessage("");

      const data = await readJson(
        adminFetch(`${apiBaseUrl}/admin/assistant/remote-ollama/wake`, {
          method: "POST"
        }),
        "Failed to wake remote Ollama."
      );

      setRemoteOllamaMessage(
        data.remoteOllama?.message || "Remote Ollama wake command finished."
      );
      await loadAssistantStatus();
    } catch (apiError) {
      setRemoteOllamaActionError(apiError.message);
    } finally {
      setRemoteOllamaActionLoading(false);
    }
  }

  async function handleLocalAiCatalogReview() {
    try {
      setLocalAiReviewLoading(true);
      setLocalAiReviewError("");
      setFindingReviewError("");
      setFindingReviews({});
      setLocalAiReview(null);

      const data = await readJson(
        adminFetch(`${apiBaseUrl}/admin/assistant/catalog-review`, {
          method: "POST",
          body: JSON.stringify(
            withAssistantProfile({}, selectedAssistantProfile)
          )
        }),
        "Failed to run local assistant catalog review."
      );

      setLocalAiReview(data.review || null);
      await loadAssistantStatus();
    } catch (apiError) {
      setLocalAiReviewError(apiError.message);
    } finally {
      setLocalAiReviewLoading(false);
    }
  }

  async function handleReviewFindingWithPostAssistant(finding, index) {
    const findingKey = buildFindingKey(finding, index);

    try {
      setFindingReviewLoadingKey(findingKey);
      setFindingReviewError("");

      const data = await readJson(
        adminFetch(`${apiBaseUrl}/admin/assistant/catalog-finding-review`, {
          method: "POST",
          body: JSON.stringify(
            withAssistantProfile({ finding }, selectedAssistantProfile)
          )
        }),
        "Failed to review finding with the post assistant."
      );

      setFindingReviews((current) => ({
        ...current,
        [findingKey]: data.review || { decision: data.decision }
      }));
      await loadAssistantStatus();
    } catch (apiError) {
      setFindingReviewError(apiError.message);
    } finally {
      setFindingReviewLoadingKey("");
    }
  }

  async function handleDismissFinding(finding, index) {
    const findingKey = buildFindingKey(finding, index);

    try {
      setFindingReviewLoadingKey(findingKey);
      setFindingReviewError("");

      await readJson(
        adminFetch(`${apiBaseUrl}/admin/assistant/catalog-finding-dismiss`, {
          method: "POST",
          body: JSON.stringify({ finding })
        }),
        "Failed to dismiss finding."
      );

      setLocalAiReview((current) =>
        current?.findings?.length
          ? {
              ...current,
              findings: current.findings.filter(
                (entry, entryIndex) =>
                  buildFindingKey(entry, entryIndex) !== findingKey
              ),
              suppressedFindingCount: (current.suppressedFindingCount || 0) + 1
            }
          : current
      );
    } catch (apiError) {
      setFindingReviewError(apiError.message);
    } finally {
      setFindingReviewLoadingKey("");
    }
  }

  return (
    <main className="admin-grid admin-insights-grid">
      <section className="intro-card homepage-panel full-span">
        <p className="eyebrow">AI Runtime</p>
        <h2>Assistant infrastructure and catalog review tools.</h2>
        <p>
          This workspace owns local Ollama status, remote RunPod controls,
          tunnel controls, model profile selection, and assistant-driven catalog
          review.
        </p>
      </section>

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>Runtime Status</h2>
          <span>
            {loading
              ? "Loading..."
              : localAiStatus?.available
                ? "Assistant reachable"
                : "Assistant offline"}
          </span>
        </div>
        <div className="metric-summary-grid">
          <article className="metric-summary-card">
            <p className="note-label">Local Ollama</p>
            <strong>
              {localAiStatus?.available ? "Reachable" : "Unavailable"}
            </strong>
            <span>
              {localAiError ||
                localAiStatus?.message ||
                "Install and start Ollama to enable local assistant calls."}
            </span>
          </article>
          <article className="metric-summary-card">
            <p className="note-label">Model</p>
            <strong>{localAiStatus?.model || "qwen2.5:7b"}</strong>
            <span>
              {localAiStatus?.modelInstalled
                ? "Installed"
                : `Run: ollama pull ${localAiStatus?.model || "qwen2.5:7b"}`}
            </span>
          </article>
          <article className="metric-summary-card">
            <p className="note-label">Remote Pod</p>
            <strong>{remotePodStatus?.runtimeStatus || "unconfigured"}</strong>
            <span>
              {remotePodStatus?.message ||
                "Configure RunPod env vars to control a remote GPU pod."}
            </span>
            <small>
              {remotePodStatus?.configuredPodName
                ? `Configured name: ${remotePodStatus.configuredPodName}`
                : "Configured name: not set"}
            </small>
            <small>
              {remotePodStatus?.podId
                ? `Resolved pod ID: ${remotePodStatus.podId}`
                : remotePodStatus?.configuredPodId
                  ? `Fallback pod ID: ${remotePodStatus.configuredPodId}`
                  : "Resolved pod ID: not found"}
            </small>
            <small>{`Resolved by: ${remotePodStatus?.resolveSource || "none"}`}</small>
          </article>
          <article className="metric-summary-card">
            <p className="note-label">SSH Tunnel</p>
            <strong>
              {remoteTunnelStatus?.running
                ? "Active"
                : remoteTunnelStatus?.configured
                  ? "Inactive"
                  : "Unconfigured"}
            </strong>
            <span>
              {remoteTunnelStatus?.message ||
                "Automate the local SSH forward used by LOCAL_AI_BASE_URL."}
            </span>
          </article>
        </div>
        <div className="admin-form" style={{ marginTop: "1rem" }}>
          <label>
            Assistant Model Profile
            <select
              onChange={handleAssistantProfileChange}
              value={
                selectedAssistantProfile ||
                localAiStatus?.selectedProfileKey ||
                ""
              }
            >
              {(localAiStatus?.modelProfiles || []).map((profile) => (
                <option key={profile.key} value={profile.key}>
                  {`${profile.label} - ${profile.model}${profile.installed ? "" : " (missing)"}`}
                </option>
              ))}
              {!localAiStatus?.modelProfiles?.length ? (
                <option value="">Default runtime model</option>
              ) : null}
            </select>
          </label>
          <p className="full-span meta">
            {localAiStatus?.selectedProfileLabel
              ? `${localAiStatus.selectedProfileLabel} routes assistant requests to ${localAiStatus.model}.`
              : `Assistant requests currently target ${localAiStatus?.model || "the default Ollama model"}.`}
          </p>
        </div>
        <div className="archive-intelligence-actions">
          <button
            className="secondary-button"
            onClick={loadAssistantStatus}
            type="button"
          >
            Refresh Status
          </button>
          <button
            className="secondary-button"
            disabled={
              remotePodActionLoading === "start" || !remotePodStatus?.configured
            }
            onClick={() => handleRemotePodAction("start")}
            type="button"
          >
            {remotePodActionLoading === "start"
              ? "Starting Remote Pod..."
              : "Start Remote AI"}
          </button>
          <button
            className="secondary-button"
            disabled={
              remotePodActionLoading === "stop" || !remotePodStatus?.configured
            }
            onClick={() => handleRemotePodAction("stop")}
            type="button"
          >
            {remotePodActionLoading === "stop"
              ? "Stopping Remote Pod..."
              : "Stop Remote AI"}
          </button>
          <button
            className="secondary-button"
            disabled={
              remoteTunnelActionLoading === "start" ||
              !remoteTunnelStatus?.configured
            }
            onClick={() => handleRemoteTunnelAction("start")}
            type="button"
          >
            {remoteTunnelActionLoading === "start"
              ? "Opening Tunnel..."
              : "Open SSH Tunnel"}
          </button>
          <button
            className="secondary-button"
            disabled={
              remoteTunnelActionLoading === "stop" ||
              !remoteTunnelStatus?.configured
            }
            onClick={() => handleRemoteTunnelAction("stop")}
            type="button"
          >
            {remoteTunnelActionLoading === "stop"
              ? "Closing Tunnel..."
              : "Close SSH Tunnel"}
          </button>
          <button
            className="secondary-button"
            disabled={
              remoteOllamaActionLoading ||
              (!remoteTunnelStatus?.running && !localAiStatus?.available)
            }
            onClick={handleRemoteOllamaWake}
            type="button"
          >
            {remoteOllamaActionLoading
              ? "Waking Remote Ollama..."
              : "Wake Remote Ollama"}
          </button>
        </div>
        {remotePodActionError ? (
          <p className="error-text">{remotePodActionError}</p>
        ) : null}
        {remoteTunnelActionError ? (
          <p className="error-text">{remoteTunnelActionError}</p>
        ) : null}
        {remoteOllamaActionError ? (
          <p className="error-text">{remoteOllamaActionError}</p>
        ) : null}
        {remoteOllamaMessage ? (
          <p className="meta">{remoteOllamaMessage}</p>
        ) : null}
      </section>

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>Catalog Review</h2>
          <span>
            {localAiReview
              ? `${(localAiReview.findings?.length || 0) + (localAiReview.risks?.length || 0)} items`
              : "Assistant review"}
          </span>
        </div>
        <p className="meta">
          Runs a non-destructive assistant review against the catalog. It can
          suggest changes, but nothing is saved until you open the target
          workspace and apply edits yourself.
        </p>
        <div className="archive-intelligence-actions">
          <button
            className="hero-link"
            disabled={
              localAiReviewLoading ||
              !localAiStatus?.available ||
              !localAiStatus?.modelInstalled
            }
            onClick={handleLocalAiCatalogReview}
            type="button"
          >
            {localAiReviewLoading
              ? "Reviewing Catalog..."
              : "Run Catalog Review"}
          </button>
        </div>
        {localAiReviewError ? (
          <p className="error-text">{localAiReviewError}</p>
        ) : null}
        {findingReviewError ? (
          <p className="error-text">{findingReviewError}</p>
        ) : null}
        {localAiReview ? (
          <div className="insight-issue-grid" style={{ marginTop: "1rem" }}>
            <article className="insight-issue-card severity-info">
              <div className="insight-issue-head">
                <div>
                  <p className="eyebrow">{localAiReview.model}</p>
                  <h3>Assistant Review</h3>
                </div>
                <span className="issue-count-pill">
                  {(localAiReview.findings?.length || 0) +
                    (localAiReview.risks?.length || 0)}
                </span>
              </div>
              <p>{localAiReview.summary}</p>
              {localAiReview.suppressedFindingCount ? (
                <p className="meta">
                  {`${localAiReview.suppressedFindingCount} finding${localAiReview.suppressedFindingCount === 1 ? "" : "s"} hidden by prior review or dismissal.`}
                </p>
              ) : null}
            </article>
            {(localAiReview.findings || []).map((finding, index) => {
              const targetLink = buildAdminFindingLink(finding);
              const key = buildFindingKey(finding, index);
              const findingReview = findingReviews[key];
              const patchEntries = Object.entries(
                findingReview?.suggestedPatch || {}
              );
              const isReviewing = findingReviewLoadingKey === key;

              return (
                <article
                  className={`insight-issue-card severity-${finding.severity || "info"}`}
                  key={key}
                >
                  <div className="insight-issue-head">
                    <div>
                      <p className="eyebrow">
                        {formatSeverity(finding.severity)}
                      </p>
                      <h4>{formatFindingTarget(finding)}</h4>
                    </div>
                  </div>
                  <p>{finding.issue}</p>
                  <p className="meta">{finding.recommendedAction}</p>
                  {findingReview ? (
                    <div className="insight-sample-list">
                      <article className="insight-sample-link">
                        <strong>
                          {findingReview.verdict === "accepted"
                            ? "Post Assistant Confirmed"
                            : "Post Assistant Rejected"}
                        </strong>
                        <span>
                          {findingReview.reasonCode ||
                            findingReview.decision?.reasonCode ||
                            "reviewed"}
                        </span>
                        <small>
                          {findingReview.summary ||
                            findingReview.decision?.summary ||
                            "The finding was reviewed against the current post."}
                        </small>
                      </article>
                      {patchEntries.length ? (
                        <article className="insight-sample-link">
                          <strong>Suggested Patch</strong>
                          {patchEntries.map(([field, value]) => (
                            <small key={field}>
                              {`${field}: ${formatPatchValue(value).slice(0, 220)}`}
                            </small>
                          ))}
                        </article>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="archive-intelligence-actions">
                    {finding.targetType === "post" ? (
                      <button
                        className="secondary-button"
                        disabled={
                          isReviewing ||
                          !localAiStatus?.available ||
                          !localAiStatus?.modelInstalled
                        }
                        onClick={() =>
                          handleReviewFindingWithPostAssistant(finding, index)
                        }
                        type="button"
                      >
                        {isReviewing
                          ? "Reviewing..."
                          : "Review With Post Assistant"}
                      </button>
                    ) : null}
                    <button
                      className="secondary-button"
                      disabled={isReviewing}
                      onClick={() => handleDismissFinding(finding, index)}
                      type="button"
                    >
                      Dismiss Finding
                    </button>
                    {targetLink ? (
                      <Link className="secondary-button" to={targetLink}>
                        Open Target
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {(localAiReview.risks || []).map((risk) => (
              <article className="insight-sample-link" key={risk}>
                <strong>{risk}</strong>
              </article>
            ))}
            {(localAiReview.suggestedActions || []).map((action) => (
              <article className="insight-sample-link" key={action}>
                <strong>{action}</strong>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
