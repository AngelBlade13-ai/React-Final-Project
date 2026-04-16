import { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatPostDate, formatRelativeTime } from "../../lib/formatters";
import { apiBaseUrl } from "../../lib/site";
import { useAdminContext } from "../../layouts/AdminLayout";

function getCommentAuthor(comment) {
  return comment?.author?.displayName || "Unknown user";
}

export default function AdminCommentsPage() {
  useDocumentTitle("Admin Comments");
  const { authHeaders, posts } = useAdminContext();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let isCancelled = false;

    async function loadComments() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${apiBaseUrl}/admin/comments`, {
          headers: authHeaders()
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load comments.");
        }

        if (!isCancelled) {
          setComments(data.comments || []);
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

    loadComments();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function updateCommentStatus(commentId, nextStatus) {
    try {
      setUpdatingId(commentId);
      setError("");
      const response = await fetch(`${apiBaseUrl}/admin/comments/${commentId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update comment.");
      }

      setComments((current) =>
        current.map((comment) => (comment.id === commentId ? { ...comment, ...(data.comment || {}), status: nextStatus } : comment))
      );
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setUpdatingId("");
    }
  }

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredComments = comments.filter((comment) => {
    const post = posts.find((entry) => entry.slug === comment.postSlug);
    const matchesStatus = statusFilter === "all" || String(comment.status || "visible") === statusFilter;
    const haystack = [comment.body, getCommentAuthor(comment), post?.title || "", comment.postSlug].join(" ").toLowerCase();
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
  const counts = {
    all: comments.length,
    visible: comments.filter((comment) => comment.status === "visible").length,
    hidden: comments.filter((comment) => comment.status === "hidden").length
  };

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">Comments</p>
        <h2>Public conversation now has a dedicated moderation desk.</h2>
        <p>
          Search by release, author, or phrase, then quickly hide or restore comments without leaving the admin
          workspace.
        </p>
      </section>

      <section className="intro-card homepage-panel full-span admin-comments-toolbar">
        <label className="search-field">
          Find comments
          <input
            className="explore-search-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search release title, author, slug, or comment text"
            type="search"
            value={query}
          />
        </label>
        <div className="filter-chip-row">
          {[
            { key: "all", label: "All comments" },
            { key: "visible", label: "Visible" },
            { key: "hidden", label: "Hidden" }
          ].map((option) => (
            <button
              className={`filter-chip${statusFilter === option.key ? " active" : ""}`}
              key={option.key}
              onClick={() => setStatusFilter(option.key)}
              type="button"
            >
              {option.label} ({counts[option.key]})
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="intro-card homepage-panel full-span">
          <p className="eyebrow">Moderation Error</p>
          <h3>Comments could not be updated.</h3>
          <p>{error}</p>
        </section>
      ) : null}

      <section className="full-span">
        <div className="section-head">
          <h2>Moderation Queue</h2>
          <span>{loading ? "Loading..." : `${filteredComments.length} comments`}</span>
        </div>

        {!loading && !filteredComments.length ? (
          <section className="intro-card homepage-panel empty-state-card">
            <p className="eyebrow">No Matches</p>
            <h3>No comments match that filter yet.</h3>
            <p>Try a broader phrase or switch back to all comments.</p>
          </section>
        ) : (
          <div className="comment-list admin-comment-list">
            {filteredComments.map((comment) => {
              const post = posts.find((entry) => entry.slug === comment.postSlug);

              return (
                <article className="comment-card admin-comment-card" key={comment.id}>
                  <div className="comment-card-head">
                    <div>
                      <h3>{post?.title || "Missing release"}</h3>
                      <p className="comment-meta">
                        {getCommentAuthor(comment)} | {formatPostDate(comment.createdAt)} | {formatRelativeTime(comment.createdAt)}
                      </p>
                    </div>
                    <span className={`activity-status-pill status-${comment.status || "visible"}`}>{comment.status || "visible"}</span>
                  </div>
                  <p className="comment-body">{comment.body}</p>
                  <div className="admin-comment-footer">
                    <div className="admin-comment-meta-stack">
                      <span>{`Slug: ${comment.postSlug}`}</span>
                      {post ? (
                        <Link className="inline-link" to={`/release/${comment.postSlug}`}>
                          View public release
                        </Link>
                      ) : (
                        <span>Release record is missing</span>
                      )}
                    </div>
                    <div className="comment-card-actions">
                      <button
                        className="secondary-button"
                        disabled={updatingId === comment.id || comment.status === "visible"}
                        onClick={() => updateCommentStatus(comment.id, "visible")}
                        type="button"
                      >
                        {updatingId === comment.id && comment.status !== "visible" ? "Saving..." : "Show"}
                      </button>
                      <button
                        className="danger-button"
                        disabled={updatingId === comment.id || comment.status === "hidden"}
                        onClick={() => updateCommentStatus(comment.id, "hidden")}
                        type="button"
                      >
                        {updatingId === comment.id && comment.status !== "hidden" ? "Saving..." : "Hide"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
