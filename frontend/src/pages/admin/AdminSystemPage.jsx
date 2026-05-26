import { useEffect, useState } from "react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatRelativeTime } from "../../lib/formatters";
import { apiBaseUrl } from "../../lib/site";
import { useAdminContext } from "../../layouts/AdminLayout";

function formatAuditAction(action) {
  return String(action || "activity.logged")
    .replace(/[._-]+/g, " ")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function formatUptime(totalSeconds = 0) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${Math.max(1, minutes)}m`;
}

function describeAuditDetails(entry) {
  const details = entry?.details || {};

  if (Array.isArray(details.changedFields) && details.changedFields.length) {
    return `Changed: ${details.changedFields.join(", ")}`;
  }

  if (Number.isFinite(details.updatedCount)) {
    return `Updated ${details.updatedCount} posts${details.unchangedCount ? `, skipped ${details.unchangedCount}` : ""}.`;
  }

  if (details.previousStatus && details.nextStatus) {
    return `Status changed from ${details.previousStatus} to ${details.nextStatus}.`;
  }

  if (details.slug) {
    return `Slug: ${details.slug}`;
  }

  if (details.siteName) {
    return `Site name: ${details.siteName}`;
  }

  return "Operation recorded.";
}

async function readJson(responsePromise, fallbackMessage) {
  let response;
  try {
    response = await responsePromise;
  } catch (error) {
    throw new Error(
      `${fallbackMessage} The browser could not reach the backend; the task may still be running. Check the result again in a moment.`,
      { cause: error }
    );
  }
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function AdminSystemPage() {
  useDocumentTitle("Admin System");
  const { adminFetch } = useAdminContext();
  const [opsHealth, setOpsHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [healthError, setHealthError] = useState("");
  const [auditError, setAuditError] = useState("");
  const [syncPreview, setSyncPreview] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncWriting, setSyncWriting] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [reseedLoading, setReseedLoading] = useState(false);
  const [reseedError, setReseedError] = useState("");
  const [reseedMessage, setReseedMessage] = useState("");
  const [reseedResult, setReseedResult] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadSystemStatus() {
      try {
        setLoading(true);
        setHealthError("");
        setAuditError("");

        const [healthResult, auditResult] = await Promise.allSettled([
          readJson(
            fetch(`${apiBaseUrl}/health`, { credentials: "include" }),
            "Failed to load health snapshot."
          ),
          readJson(
            adminFetch(`${apiBaseUrl}/admin/audit-logs?limit=24`),
            "Failed to load admin audit trail."
          )
        ]);

        if (!isCancelled) {
          if (healthResult.status === "fulfilled") {
            setOpsHealth(healthResult.value || null);
          } else {
            setOpsHealth(null);
            setHealthError(
              healthResult.reason?.message || "Failed to load health snapshot."
            );
          }

          if (auditResult.status === "fulfilled") {
            setAuditLogs(auditResult.value.auditLogs || []);
          } else {
            setAuditLogs([]);
            setAuditError(
              auditResult.reason?.message || "Failed to load admin audit trail."
            );
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadSystemStatus();

    return () => {
      isCancelled = true;
    };
  }, [adminFetch]);

  async function handlePreviewLiveSync() {
    try {
      setSyncLoading(true);
      setSyncError("");
      setSyncMessage("");

      const data = await readJson(
        adminFetch(`${apiBaseUrl}/admin/live-store-sync`),
        "Failed to preview live admin drift."
      );

      setSyncPreview(data.preview || null);
    } catch (apiError) {
      setSyncError(apiError.message);
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleApplyLiveSync() {
    const confirmed = window.confirm(
      "This will overwrite backend/data/posts.json from the current live admin-backed store. Continue?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setSyncWriting(true);
      setSyncError("");
      setSyncMessage("");

      const data = await readJson(
        adminFetch(`${apiBaseUrl}/admin/live-store-sync`, {
          method: "POST"
        }),
        "Failed to write live admin data back into posts.json."
      );

      setSyncPreview({
        generatedAt: data.sync?.generatedAt,
        postsFile: data.sync?.postsFile,
        report: data.sync?.report,
        artifactPaths: data.sync?.artifactPaths
      });
      setSyncMessage(
        data.message || "Live admin data was written back into posts.json."
      );
    } catch (apiError) {
      setSyncError(apiError.message);
    } finally {
      setSyncWriting(false);
    }
  }

  async function handleReseedLiveSite() {
    const confirmed = window.confirm(
      "This will reseed the live database from backend/data/posts.json. Continue?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setReseedLoading(true);
      setReseedError("");
      setReseedMessage("");
      setReseedResult(null);

      const data = await readJson(
        adminFetch(`${apiBaseUrl}/admin/reseed-live-site`, {
          method: "POST"
        }),
        "Failed to reseed the live website from posts.json."
      );
      const startedJob = data.reseedJob || null;

      if (startedJob?.jobId) {
        setReseedMessage(
          startedJob.message ||
            "Live site reseed started. Waiting for it to finish..."
        );
        const finishedJob = await waitForReseedJob(startedJob.jobId);
        setReseedResult(finishedJob.reseed || null);
        setReseedMessage(
          finishedJob.message ||
            "Live site reseeded from backend/data/posts.json."
        );
        return;
      }

      setReseedResult(data.reseed || null);
      setReseedMessage(
        data.message || "Live site reseeded from backend/data/posts.json."
      );
    } catch (apiError) {
      setReseedError(apiError.message);
    } finally {
      setReseedLoading(false);
    }
  }

  async function waitForReseedJob(jobId) {
    for (;;) {
      await delay(1500);
      const data = await readJson(
        adminFetch(
          `${apiBaseUrl}/admin/reseed-live-site/jobs/${encodeURIComponent(jobId)}`
        ),
        "Failed to read live reseed progress."
      );
      const job = data.reseedJob || {};

      if (job.status === "running") {
        setReseedMessage(job.message || "Live site reseed is still running...");
        continue;
      }

      if (job.status === "success") {
        return job;
      }

      throw new Error(job.error || job.message || "Live site reseed failed.");
    }
  }

  const syncReport = syncPreview?.report || null;
  const syncPostSummary = syncReport?.posts || null;
  const syncCollectionSummary = syncReport?.collections || null;
  const syncPostSamples = [
    ...(syncPostSummary?.onlyInLive || []).slice(0, 4).map((entry) => ({
      label: "Live only",
      title: entry.title || entry.key,
      note: entry.key
    })),
    ...(syncPostSummary?.changed || []).slice(0, 4).map((entry) => ({
      label: "Changed",
      title: entry.title || entry.key,
      note: entry.changedFields.join(", ")
    }))
  ].slice(0, 6);

  return (
    <main className="admin-grid admin-insights-grid">
      <section className="intro-card homepage-panel full-span">
        <p className="eyebrow">System</p>
        <h2>Runtime health, audit history, and source-of-truth tools.</h2>
        <p>
          This page contains operational actions that affect local files or the
          live database. Keep them separate from everyday content editing.
        </p>
      </section>

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>Operational Status</h2>
          <span>
            {loading
              ? "Loading..."
              : opsHealth
                ? "Live runtime snapshot"
                : "Unavailable"}
          </span>
        </div>
        {healthError ? <p className="meta">{healthError}</p> : null}
        <div className="metric-summary-grid">
          <article className="metric-summary-card">
            <p className="note-label">Backend</p>
            <strong>{loading ? "--" : opsHealth?.status || "Unknown"}</strong>
            <span>
              {loading
                ? "..."
                : opsHealth
                  ? `${opsHealth.environment} / ${opsHealth.database?.connected ? "DB connected" : "DB unavailable"}`
                  : "No health snapshot available."}
            </span>
          </article>
          <article className="metric-summary-card">
            <p className="note-label">Uptime</p>
            <strong>
              {loading ? "--" : formatUptime(opsHealth?.uptimeSeconds)}
            </strong>
            <span>
              {loading
                ? "..."
                : opsHealth?.timestamp
                  ? `Snapshot ${formatRelativeTime(opsHealth.timestamp)}`
                  : "No timestamp available."}
            </span>
          </article>
          <article className="metric-summary-card">
            <p className="note-label">Request Logs</p>
            <strong>
              {loading
                ? "--"
                : opsHealth?.logging?.requestLogging
                  ? "Enabled"
                  : "Disabled"}
            </strong>
            <span>
              {loading
                ? "..."
                : `${opsHealth?.logging?.level || "info"} / slow at ${opsHealth?.logging?.slowRequestThresholdMs || 0} ms`}
            </span>
          </article>
          <article className="metric-summary-card">
            <p className="note-label">Monitoring</p>
            <strong>
              {loading
                ? "--"
                : opsHealth?.logging?.monitoringWebhookConfigured
                  ? "Webhook"
                  : "Logs Only"}
            </strong>
            <span>
              {loading
                ? "..."
                : opsHealth?.logging?.adminAuditLogging
                  ? "Admin audit trail enabled"
                  : "Audit trail disabled"}
            </span>
          </article>
        </div>
      </section>

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>Source Of Truth Sync</h2>
          <span>
            {syncPreview ? "Preview ready" : "Run a preview before writing"}
          </span>
        </div>
        <p className="meta">
          This pulls the live admin-backed Mongo store back into{" "}
          <code>backend/data/posts.json</code>. Use it before any reseed if you
          have been editing posts in the admin and do not want those changes
          overwritten by stale file data.
        </p>
        <div className="archive-intelligence-actions">
          <button
            className="hero-link"
            disabled={syncLoading || syncWriting}
            onClick={handlePreviewLiveSync}
            type="button"
          >
            {syncLoading ? "Scanning Live Drift..." : "Preview Live Drift"}
          </button>
          <button
            className="secondary-button"
            disabled={!syncPreview || syncLoading || syncWriting}
            onClick={handleApplyLiveSync}
            type="button"
          >
            {syncWriting
              ? "Writing posts.json..."
              : "Write Live Store To posts.json"}
          </button>
          <button
            className="secondary-button"
            disabled={reseedLoading || syncLoading || syncWriting}
            onClick={handleReseedLiveSite}
            type="button"
          >
            {reseedLoading ? "Reseeding Live DB..." : "Reseed Live Site"}
          </button>
        </div>
        {syncError ? <p className="error-text">{syncError}</p> : null}
        {syncMessage ? <p className="meta">{syncMessage}</p> : null}
        {reseedError ? <p className="error-text">{reseedError}</p> : null}
        {reseedMessage ? <p className="meta">{reseedMessage}</p> : null}
        {reseedResult ? (
          <div
            className="insight-issue-card severity-info"
            style={{ marginTop: "1rem" }}
          >
            <div className="insight-issue-head">
              <div>
                <p className="eyebrow">Reseed</p>
                <h3>Live database reseed complete</h3>
              </div>
            </div>
            <p>
              {`Generated at ${formatRelativeTime(reseedResult.generatedAt)} | `}
              {`Log: ${reseedResult.logPath || "n/a"}`}
            </p>
            {reseedResult.output ? <pre>{reseedResult.output}</pre> : null}
          </div>
        ) : null}
        {syncReport ? (
          <div className="insight-issue-grid" style={{ marginTop: "1rem" }}>
            <article className="insight-issue-card severity-info">
              <div className="insight-issue-head">
                <div>
                  <p className="eyebrow">Posts</p>
                  <h3>Live vs File Drift</h3>
                </div>
                <span className="issue-count-pill">
                  {syncPostSummary?.changed?.length || 0}
                </span>
              </div>
              <p>
                {`${syncPostSummary?.liveCount || 0} live / ${syncPostSummary?.fileCount || 0} file | `}
                {`${syncPostSummary?.onlyInLive?.length || 0} live-only | `}
                {`${syncPostSummary?.onlyInFile?.length || 0} file-only`}
              </p>
              {syncPostSamples.length ? (
                <div className="insight-sample-list">
                  {syncPostSamples.map((sample, index) => (
                    <article
                      className="insight-sample-link"
                      key={`${sample.label}-${sample.title}-${index}`}
                    >
                      <strong>{sample.title}</strong>
                      <span>{sample.label}</span>
                      <small>{sample.note}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="meta">
                  No post drift was detected between the live store and
                  posts.json.
                </p>
              )}
            </article>
            <article className="insight-issue-card severity-info">
              <div className="insight-issue-head">
                <div>
                  <p className="eyebrow">Collections</p>
                  <h3>Collection Drift</h3>
                </div>
                <span className="issue-count-pill">
                  {syncCollectionSummary?.changed?.length || 0}
                </span>
              </div>
              <p>
                {`${syncCollectionSummary?.liveCount || 0} live / ${syncCollectionSummary?.fileCount || 0} file | `}
                {`${syncCollectionSummary?.onlyInLive?.length || 0} live-only | `}
                {`${syncCollectionSummary?.onlyInFile?.length || 0} file-only`}
              </p>
              <p className="meta">
                {`Reports: ${syncPreview?.artifactPaths?.reportPath || "n/a"} | Snapshot: ${syncPreview?.artifactPaths?.liveSnapshotPath || "n/a"}`}
              </p>
              {syncPreview?.artifactPaths?.backupPath ? (
                <p className="meta">
                  {`Backup written: ${syncPreview.artifactPaths.backupPath}`}
                </p>
              ) : (
                <p className="meta">
                  No file write has happened yet. Preview mode is read-only.
                </p>
              )}
            </article>
          </div>
        ) : null}
      </section>

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>Admin Audit Trail</h2>
          <span>
            {loading ? "Loading..." : `${auditLogs.length} recent actions`}
          </span>
        </div>
        {auditError ? <p className="meta">{auditError}</p> : null}
        {!loading && !auditLogs.length ? (
          <p className="meta">No admin mutations have been recorded yet.</p>
        ) : (
          <div className="activity-list">
            {auditLogs.map((entry) => (
              <article className="activity-card" key={entry.id}>
                <div className="activity-card-head">
                  <div>
                    <h3>
                      {entry.entityLabel ||
                        entry.entityId ||
                        formatAuditAction(entry.action)}
                    </h3>
                    <p>{`${entry.actorEmail || "Admin"} / ${formatRelativeTime(entry.createdAt)}`}</p>
                  </div>
                  <span className="activity-status-pill">
                    {formatAuditAction(entry.action)}
                  </span>
                </div>
                <p className="meta">{`${entry.method} ${entry.path}`}</p>
                <p className="meta">{describeAuditDetails(entry)}</p>
                {entry.requestId ? (
                  <small>{`Request ${entry.requestId.slice(0, 8)}`}</small>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
