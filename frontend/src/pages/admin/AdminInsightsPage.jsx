import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import {
  formatPercent,
  formatPostDate,
  formatRelativeTime
} from "../../lib/formatters";
import { apiBaseUrl } from "../../lib/site";
import { useAdminContext } from "../../layouts/AdminLayout";

function getScoreTone(score) {
  if (score >= 85) {
    return "stable";
  }

  if (score >= 65) {
    return "watch";
  }

  return "attention";
}

function formatSeverity(severity) {
  return String(severity || "info")
    .replace(
      /(^|-)([a-z])/g,
      (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`
    )
    .replace("-", " ");
}

async function readJson(responsePromise, fallbackMessage) {
  const response = await responsePromise;
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

export default function AdminInsightsPage() {
  useDocumentTitle("Admin Dashboard");
  const { adminFetch } = useAdminContext();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const data = await readJson(
          adminFetch(`${apiBaseUrl}/admin/insights`),
          "Failed to load archive insights."
        );

        if (!isCancelled) {
          setInsights(data.insights || null);
        }
      } catch (apiError) {
        if (!isCancelled) {
          setInsights(null);
          setError(apiError.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, [adminFetch]);

  const summary = insights?.summary || {};
  const readinessEntries = insights
    ? Object.values(insights.readiness || {})
    : [];
  const scoreTone = getScoreTone(summary.archiveHealthScore || 0);
  const topQuickWins = (insights?.quickWins || []).slice(0, 4);
  const recentPosts = (insights?.recentActivity?.posts || []).slice(0, 4);
  const recentComments = (insights?.recentActivity?.comments || []).slice(0, 3);

  return (
    <main className="admin-grid admin-insights-grid">
      <section
        className={`intro-card homepage-panel full-span archive-intelligence-hero score-${scoreTone}`}
      >
        <div className="archive-intelligence-copy">
          <p className="eyebrow">Admin Dashboard</p>
          <h2>What needs attention next?</h2>
          <p>
            A focused overview of archive health, content gaps, recent activity,
            and the next useful actions. Runtime and file operations now live in
            their own admin workspaces.
          </p>
          <div className="archive-intelligence-actions">
            <Link className="hero-link" to="/admin/posts">
              New Or Edit Post
            </Link>
            <Link className="hero-link" to="/admin/comments">
              Moderate Comments
            </Link>
            <Link className="hero-link" to="/admin/ai-runtime">
              AI Runtime
            </Link>
          </div>
        </div>
        <div className="archive-score-shell">
          <div className="archive-score-ring">
            <span>{loading ? "--" : summary.archiveHealthScore || 0}</span>
            <small>Health Score</small>
          </div>
          <p className="archive-score-note">
            {loading
              ? "Reading archive signals..."
              : scoreTone === "stable"
                ? "The archive is in strong shape. Keep changes focused."
                : scoreTone === "watch"
                  ? "The archive is healthy, but a few cleanup items are stacking."
                  : "There are enough gaps that the archive needs a cleanup pass."}
          </p>
        </div>
      </section>

      {error ? (
        <section className="intro-card homepage-panel full-span">
          <p className="eyebrow">Dashboard Unavailable</p>
          <h3>Archive insights could not load.</h3>
          <p>{error}</p>
        </section>
      ) : null}

      <section className="admin-ops-board full-span">
        <article className="admin-ops-card">
          <p className="eyebrow">Songs</p>
          <strong>{loading ? "--" : summary.totalPosts || 0}</strong>
          <span>
            {loading
              ? "Loading..."
              : `${summary.publicPosts || 0} public / ${summary.publishedPosts || 0} published`}
          </span>
        </article>
        <article className="admin-ops-card">
          <p className="eyebrow">Collections</p>
          <strong>{loading ? "--" : summary.totalCollections || 0}</strong>
          <span>
            {loading
              ? "Loading..."
              : `${summary.publicPrimaryCollections || 0} public primary`}
          </span>
        </article>
        <article className="admin-ops-card">
          <p className="eyebrow">Comments</p>
          <strong>{loading ? "--" : summary.totalComments || 0}</strong>
          <span>
            {loading
              ? "Loading..."
              : `${summary.visibleComments || 0} visible / ${summary.hiddenComments || 0} hidden`}
          </span>
        </article>
        <article className="admin-ops-card">
          <p className="eyebrow">Accounts</p>
          <strong>{loading ? "--" : summary.totalUsers || 0}</strong>
          <span>Registered listeners</span>
        </article>
      </section>

      <section className="intro-card homepage-panel">
        <div className="section-head">
          <h2>Readiness Board</h2>
          <span>
            {loading ? "Loading..." : `${readinessEntries.length} signals`}
          </span>
        </div>
        <div className="readiness-list">
          {loading ? (
            <p className="meta">Measuring release and collection readiness.</p>
          ) : (
            readinessEntries.map((entry) => (
              <article className="readiness-card" key={entry.label}>
                <div className="readiness-card-head">
                  <div>
                    <h3>{entry.label}</h3>
                    <p>{`${entry.ready} of ${entry.total}`}</p>
                  </div>
                  <strong>{formatPercent(entry.ratio)}</strong>
                </div>
                <div aria-hidden="true" className="readiness-meter">
                  <span
                    style={{
                      width: `${Math.max(8, Math.round(entry.ratio * 100))}%`
                    }}
                  />
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="intro-card homepage-panel">
        <div className="section-head">
          <h2>Release Status</h2>
          <span>{loading ? "Loading..." : "Surface balance"}</span>
        </div>
        <div className="status-breakdown-grid">
          {(insights?.releaseStatusBreakdown || []).map((entry) => (
            <article
              className={`status-breakdown-card status-${entry.status}`}
              key={entry.status}
            >
              <p className="eyebrow">{entry.status}</p>
              <strong>{entry.count}</strong>
              <span>{`${entry.publishedCount} published / ${entry.publicCount} public`}</span>
            </article>
          ))}
          {loading ? (
            <p className="meta">Scanning release classification mix.</p>
          ) : null}
        </div>
      </section>

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>Quick Wins</h2>
          <span>{loading ? "Loading..." : `${topQuickWins.length} shown`}</span>
        </div>
        {!loading && !topQuickWins.length ? (
          <p className="meta">
            No immediate cleanup spikes were detected. The archive looks steady
            from here.
          </p>
        ) : (
          <div className="insight-issue-grid">
            {topQuickWins.map((issue) => (
              <article
                className={`insight-issue-card severity-${issue.severity}`}
                key={issue.key}
              >
                <div className="insight-issue-head">
                  <div>
                    <p className="eyebrow">{formatSeverity(issue.severity)}</p>
                    <h3>{issue.label}</h3>
                  </div>
                  <span className="issue-count-pill">{issue.count}</span>
                </div>
                <p>{issue.description}</p>
                <p className="insight-action-note">{issue.action}</p>
                <div className="insight-sample-list">
                  {issue.sample.slice(0, 3).map((sample, index) => (
                    <Link
                      className="insight-sample-link"
                      key={`${issue.key}-${index}`}
                      to={sample.href}
                    >
                      <strong>{sample.title}</strong>
                      <span>{sample.meta}</span>
                      <small>{sample.note}</small>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="intro-card homepage-panel">
        <div className="section-head">
          <h2>Recent Songs</h2>
          <span>{loading ? "Loading..." : `${recentPosts.length} recent`}</span>
        </div>
        <div className="activity-list">
          {recentPosts.map((post) => (
            <article className="activity-card" key={post.id}>
              <div className="activity-card-head">
                <div>
                  <h3>{post.title}</h3>
                  <p>{`${formatPostDate(post.createdAt)} / ${formatRelativeTime(post.createdAt)}`}</p>
                </div>
                <span
                  className={`activity-status-pill status-${post.releaseStatus}`}
                >
                  {post.releaseStatus}
                </span>
              </div>
              <p className="meta">
                {post.published ? "Published" : "Draft"} |{" "}
                {post.hasVideo ? "Video ready" : "Video pending"} |{" "}
                {post.hasLyrics ? "Lyrics ready" : "Lyrics empty"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="intro-card homepage-panel">
        <div className="section-head">
          <h2>Recent Comments</h2>
          <span>
            {loading ? "Loading..." : `${recentComments.length} recent`}
          </span>
        </div>
        <div className="activity-list">
          {recentComments.map((comment) => (
            <article className="activity-card" key={comment.id}>
              <div className="activity-card-head">
                <div>
                  <h3>{comment.postTitle}</h3>
                  <p>{`${comment.authorName} / ${formatRelativeTime(comment.createdAt)}`}</p>
                </div>
                <span
                  className={`activity-status-pill status-${comment.status}`}
                >
                  {comment.status}
                </span>
              </div>
              <p className="comment-body">{comment.bodyPreview}</p>
            </article>
          ))}
          {!loading && !recentComments.length ? (
            <p className="meta">No recent comment activity.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
