import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatPercent, formatPostDate, formatRelativeTime } from "../../lib/formatters";
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
    .replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)
    .replace("-", " ");
}

export default function AdminInsightsPage() {
  useDocumentTitle("Admin Insights");
  const { authHeaders } = useAdminContext();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadInsights() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${apiBaseUrl}/admin/insights`, {
          headers: authHeaders()
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load archive insights.");
        }

        if (!isCancelled) {
          setInsights(data.insights || null);
        }
      } catch (apiError) {
        if (!isCancelled) {
          setError(apiError.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadInsights();

    return () => {
      isCancelled = true;
    };
  }, []);

  const summary = insights?.summary || {};
  const readinessEntries = insights ? Object.values(insights.readiness || {}) : [];
  const scoreTone = getScoreTone(summary.archiveHealthScore || 0);

  return (
    <main className="admin-grid admin-insights-grid">
      <section className={`intro-card homepage-panel full-span archive-intelligence-hero score-${scoreTone}`}>
        <div className="archive-intelligence-copy">
          <p className="eyebrow">Archive Intelligence</p>
          <h2>The admin now has a pulse.</h2>
          <p>
            This view turns the site into something you can read operationally: what is healthy, what is drifting, and
            what will have the biggest impact if you fix it next.
          </p>
          <div className="archive-intelligence-actions">
            <Link className="hero-link" to="/admin/posts">
              Open Posts
            </Link>
            <Link className="secondary-button" to="/admin/comments">
              Moderate Comments
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
                ? "The archive is in strong shape, with only smaller cleanup wins left."
                : scoreTone === "watch"
                  ? "The archive is healthy overall, but a few curation gaps are starting to stack."
                  : "There are enough content gaps right now that the site could drift without a cleanup pass."}
          </p>
        </div>
      </section>

      {error ? (
        <section className="intro-card homepage-panel full-span">
          <p className="eyebrow">Insights Unavailable</p>
          <h3>Archive intelligence could not load.</h3>
          <p>{error}</p>
        </section>
      ) : null}

      <section className="intro-card homepage-panel full-span metric-summary-grid">
        <article className="metric-summary-card">
          <p className="note-label">Releases</p>
          <strong>{loading ? "--" : summary.totalPosts || 0}</strong>
          <span>{loading ? "..." : `${summary.publishedPosts || 0} published / ${summary.publicPosts || 0} publicly visible`}</span>
        </article>
        <article className="metric-summary-card">
          <p className="note-label">Collections</p>
          <strong>{loading ? "--" : summary.totalCollections || 0}</strong>
          <span>{loading ? "..." : `${summary.publicPrimaryCollections || 0} top-level public collections`}</span>
        </article>
        <article className="metric-summary-card">
          <p className="note-label">Conversation</p>
          <strong>{loading ? "--" : summary.totalComments || 0}</strong>
          <span>{loading ? "..." : `${summary.visibleComments || 0} visible / ${summary.hiddenComments || 0} hidden`}</span>
        </article>
        <article className="metric-summary-card">
          <p className="note-label">Accounts</p>
          <strong>{loading ? "--" : summary.totalUsers || 0}</strong>
          <span>Registered community members</span>
        </article>
      </section>

      <section className="intro-card homepage-panel">
        <div className="section-head">
          <h2>Readiness Board</h2>
          <span>{loading ? "Loading..." : `${readinessEntries.length} signals`}</span>
        </div>
        <div className="readiness-list">
          {loading ? (
            <p className="meta">Measuring release coverage, world metadata, and collection readiness.</p>
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
                  <span style={{ width: `${Math.max(8, Math.round(entry.ratio * 100))}%` }} />
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
            <article className={`status-breakdown-card status-${entry.status}`} key={entry.status}>
              <p className="eyebrow">{entry.status}</p>
              <strong>{entry.count}</strong>
              <span>{`${entry.publishedCount} published / ${entry.publicCount} public`}</span>
            </article>
          ))}
          {loading ? <p className="meta">Scanning release classification mix.</p> : null}
        </div>
      </section>

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>Quick Wins</h2>
          <span>{loading ? "Loading..." : `${insights?.quickWins?.length || 0} priorities`}</span>
        </div>
        {!loading && !insights?.quickWins?.length ? (
          <p className="meta">No immediate cleanup spikes were detected. The archive looks steady from here.</p>
        ) : (
          <div className="insight-issue-grid">
            {(insights?.quickWins || []).map((issue) => (
              <article className={`insight-issue-card severity-${issue.severity}`} key={issue.key}>
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
                  {issue.sample.map((sample, index) => (
                    <Link className="insight-sample-link" key={`${issue.key}-${index}`} to={sample.href}>
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

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>World Coverage</h2>
          <span>{loading ? "Loading..." : `${insights?.themeCoverage?.length || 0} lanes tracked`}</span>
        </div>
        <div className="theme-coverage-list">
          {(insights?.themeCoverage || []).map((theme) => (
            <article className="theme-coverage-card" key={theme.key}>
              <div className="theme-coverage-head">
                <div>
                  <h3>{theme.label}</h3>
                  <p>{`${theme.collectionCount} collections / ${theme.releaseCount} releases`}</p>
                </div>
                <strong>
                  {theme.metadataRelevantCount ? formatPercent(theme.metadataCoverage) : `${theme.publishedCount} published`}
                </strong>
              </div>
              <div aria-hidden="true" className="readiness-meter compact-meter">
                <span
                  style={{
                    width: `${Math.max(
                      10,
                      Math.round((theme.metadataRelevantCount ? theme.metadataCoverage : theme.releaseCount ? theme.publishedCount / theme.releaseCount : 1) * 100)
                    )}%`
                  }}
                />
              </div>
              <p className="meta">
                {theme.metadataRelevantCount
                  ? `${theme.metadataReadyCount} of ${theme.metadataRelevantCount} immersive releases are metadata-complete.`
                  : `${theme.publicCount} releases are currently visible on public surfaces.`}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="intro-card homepage-panel full-span">
        <div className="section-head">
          <h2>Collection Health</h2>
          <span>{loading ? "Loading..." : `${insights?.collectionHealth?.length || 0} collections surfaced`}</span>
        </div>
        <div className="collection-health-grid">
          {(insights?.collectionHealth || []).map((collection) => (
            <article className="collection-health-card" key={collection.id}>
              <div className="collection-health-head">
                <div>
                  <p className="eyebrow">{collection.isPublicPrimary ? "Public Primary" : "Internal Collection"}</p>
                  <h3>{collection.title}</h3>
                </div>
                <span className={`collection-health-score score-${getScoreTone(collection.healthScore)}`}>{collection.healthScore}</span>
              </div>
              <p className="meta">
                {`${collection.releaseCount} releases / ${collection.publishedCount} published / ${collection.commentCount} comments`}
              </p>
              {collection.theme ? <p className="meta">{`Theme: ${collection.theme}`}</p> : null}
              {collection.featuredReleaseSlug ? (
                <p className="meta">{`Featured: ${collection.featuredReleaseTitle || collection.featuredReleaseSlug}`}</p>
              ) : null}
              {collection.issues.length ? (
                <div className="collection-health-issues">
                  {collection.issues.map((issue) => (
                    <span className="collection-health-pill" key={issue}>
                      {issue}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="meta">This collection is currently reading as healthy.</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="intro-card homepage-panel">
        <div className="section-head">
          <h2>Recent Release Activity</h2>
          <span>{loading ? "Loading..." : `${insights?.recentActivity?.posts?.length || 0} recent`}</span>
        </div>
        <div className="activity-list">
          {(insights?.recentActivity?.posts || []).map((post) => (
            <article className="activity-card" key={post.id}>
              <div className="activity-card-head">
                <div>
                  <h3>{post.title}</h3>
                  <p>{`${formatPostDate(post.createdAt)} • ${formatRelativeTime(post.createdAt)}`}</p>
                </div>
                <span className={`activity-status-pill status-${post.releaseStatus}`}>{post.releaseStatus}</span>
              </div>
              <p className="meta">
                {post.published ? "Published" : "Draft"} | {post.hasVideo ? "Video ready" : "Video pending"} |{" "}
                {post.hasLyrics ? "Lyrics ready" : "Lyrics empty"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="intro-card homepage-panel">
        <div className="section-head">
          <h2>Conversation Pulse</h2>
          <span>{loading ? "Loading..." : `${insights?.topCommentedPosts?.length || 0} active releases`}</span>
        </div>
        <div className="conversation-grid">
          <div className="activity-list">
            {(insights?.recentActivity?.comments || []).map((comment) => (
              <article className="activity-card" key={comment.id}>
                <div className="activity-card-head">
                  <div>
                    <h3>{comment.postTitle}</h3>
                    <p>{`${comment.authorName} • ${formatRelativeTime(comment.createdAt)}`}</p>
                  </div>
                  <span className={`activity-status-pill status-${comment.status}`}>{comment.status}</span>
                </div>
                <p className="comment-body">{comment.bodyPreview}</p>
              </article>
            ))}
          </div>
          <div className="top-commented-list">
            {(insights?.topCommentedPosts || []).map((post) => (
              <div className="top-commented-row" key={post.postSlug}>
                <div>
                  <strong>{post.title}</strong>
                  <p>{post.postSlug}</p>
                </div>
                <span className="issue-count-pill">{post.count}</span>
              </div>
            ))}
            {!loading && !insights?.topCommentedPosts?.length ? <p className="meta">Comments have not started clustering around specific releases yet.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
