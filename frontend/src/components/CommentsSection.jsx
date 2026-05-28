import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { withMutationIntent } from "../lib/api";
import { apiBaseUrl } from "../lib/site";

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "hate", label: "Hate or abuse" },
  { value: "spam", label: "Spam" },
  { value: "explicit", label: "Explicit content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" }
];

function getInitial(name = "L") {
  return String(name || "L").trim().slice(0, 1).toUpperCase() || "L";
}

function buildCommentTree(comments = []) {
  const byId = new Map();
  const roots = [];

  comments.forEach((comment) => {
    byId.set(comment.id, { ...comment, replies: [] });
  });

  byId.forEach((comment) => {
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
      byId.get(comment.parentCommentId).replies.push(comment);
      return;
    }

    roots.push(comment);
  });

  return roots;
}

export default function CommentsSection({
  currentUser,
  onUserLogout,
  postSlug
}) {
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingToId, setReplyingToId] = useState("");
  const [reportingId, setReportingId] = useState("");
  const [reportReason, setReportReason] = useState("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${apiBaseUrl}/posts/${postSlug}/comments`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load comments.");
        }

        if (!cancelled) {
          setComments(data.comments || []);
        }
      } catch (apiError) {
        if (!cancelled) {
          setError(apiError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [postSlug]);

  async function createComment(body, parentCommentId = "") {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiBaseUrl}/posts/${postSlug}/comments`, {
        method: "POST",
        credentials: "include",
        headers: withMutationIntent({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({ body, parentCommentId })
      });
      const data = await response.json();

      if (response.status === 401) {
        onUserLogout?.();
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to post comment.");
      }

      setComments((current) => [...current, data.comment]);
      setSuccess(parentCommentId ? "Reply posted." : "Comment posted.");
      return true;
    } catch (apiError) {
      setError(apiError.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateComment(event) {
    event.preventDefault();

    if (await createComment(draft)) {
      setDraft("");
    }
  }

  async function handleCreateReply(event, commentId) {
    event.preventDefault();
    const body = String(replyDrafts[commentId] || "").trim();

    if (await createComment(body, commentId)) {
      setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
      setReplyingToId("");
    }
  }

  async function handleSaveComment(commentId) {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiBaseUrl}/comments/${commentId}`, {
        method: "PUT",
        credentials: "include",
        headers: withMutationIntent({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({ body: editingBody })
      });
      const data = await response.json();

      if (response.status === 401) {
        onUserLogout?.();
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to update comment.");
      }

      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? data.comment : comment
        )
      );
      setEditingId("");
      setEditingBody("");
      setSuccess("Comment updated.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiBaseUrl}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: withMutationIntent()
      });
      const data = await response.json();

      if (response.status === 401) {
        onUserLogout?.();
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete comment.");
      }

      setComments((current) =>
        current.filter((comment) => comment.id !== commentId)
      );
      setPendingDeleteId("");
      setSuccess("Comment deleted.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportComment(event, commentId) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiBaseUrl}/comments/${commentId}/report`, {
        method: "POST",
        credentials: "include",
        headers: withMutationIntent({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails
        })
      });
      const data = await response.json();

      if (response.status === 401) {
        onUserLogout?.();
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to report comment.");
      }

      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? data.comment : comment
        )
      );
      setReportingId("");
      setReportReason("harassment");
      setReportDetails("");
      setSuccess("Report sent to moderation.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderComment(comment, depth = 0) {
    const isOwner = currentUser?.id === comment.author?.id;
    const isEditing = editingId === comment.id;
    const isPendingDelete = pendingDeleteId === comment.id;
    const isReplying = replyingToId === comment.id;
    const isReporting = reportingId === comment.id;
    const authorName = comment.author?.displayName || "Listener";

    return (
      <article
        className={`comment-card${depth ? " comment-reply-card" : ""}`}
        key={comment.id}
      >
        <div className="comment-card-head">
          <Link className="comment-author-link" to={`/users/${comment.author?.id}`}>
            <span aria-hidden="true" className="comment-author-avatar">
              {comment.author?.avatarUrl ? (
                <img alt="" src={comment.author.avatarUrl} />
              ) : (
                getInitial(authorName)
              )}
            </span>
            <span className="comment-author-main">
              <strong>{authorName}</strong>
              <span className="comment-meta">
                {new Date(
                  comment.updatedAt || comment.createdAt
                ).toLocaleString()}
              </span>
            </span>
          </Link>
          <div className="comment-card-actions">
            {currentUser ? (
              <button
                className="secondary-button"
                onClick={() => {
                  setReplyingToId(isReplying ? "" : comment.id);
                  setReportingId("");
                }}
                type="button"
              >
                Reply
              </button>
            ) : null}
            {currentUser && !isOwner ? (
              <button
                className="secondary-button"
                onClick={() => {
                  setReportingId(isReporting ? "" : comment.id);
                  setReplyingToId("");
                }}
                type="button"
              >
                Report
              </button>
            ) : null}
            {isOwner ? (
              <>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditingBody(comment.body);
                    setPendingDeleteId("");
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setPendingDeleteId(comment.id);
                    setEditingId("");
                  }}
                  type="button"
                >
                  Delete
                </button>
              </>
            ) : null}
          </div>
        </div>

        {isPendingDelete ? (
          <div className="comment-delete-confirm">
            <p>Delete this comment?</p>
            <div className="comment-form-actions">
              <button
                className="secondary-button"
                disabled={submitting}
                onClick={() => handleDeleteComment(comment.id)}
                type="button"
              >
                Yes, delete
              </button>
              <button
                className="secondary-button"
                onClick={() => setPendingDeleteId("")}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isEditing ? (
          <div className="comment-edit-shell">
            <textarea
              onChange={(event) => setEditingBody(event.target.value)}
              rows="4"
              value={editingBody}
            />
            <div className="comment-form-actions">
              <button
                disabled={submitting || editingBody.trim().length < 2}
                onClick={() => handleSaveComment(comment.id)}
                type="button"
              >
                Save
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setEditingId("");
                  setEditingBody("");
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="comment-body">{comment.body}</p>
        )}

        {isReplying ? (
          <form
            className="comment-reply-form"
            onSubmit={(event) => handleCreateReply(event, comment.id)}
          >
            <label>
              <span className="comment-composer-label">Reply to {authorName}</span>
              <textarea
                onChange={(event) =>
                  setReplyDrafts((current) => ({
                    ...current,
                    [comment.id]: event.target.value
                  }))
                }
                rows="3"
                value={replyDrafts[comment.id] || ""}
              />
            </label>
            <div className="comment-form-actions">
              <button
                disabled={
                  submitting ||
                  String(replyDrafts[comment.id] || "").trim().length < 2
                }
                type="submit"
              >
                Post Reply
              </button>
              <button
                className="secondary-button"
                onClick={() => setReplyingToId("")}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {isReporting ? (
          <form
            className="comment-report-form"
            onSubmit={(event) => handleReportComment(event, comment.id)}
          >
            <label>
              <span className="comment-composer-label">Report reason</span>
              <select
                onChange={(event) => setReportReason(event.target.value)}
                value={reportReason}
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="comment-composer-label">Optional details</span>
              <textarea
                maxLength={500}
                onChange={(event) => setReportDetails(event.target.value)}
                rows="3"
                value={reportDetails}
              />
            </label>
            <div className="comment-form-actions">
              <button disabled={submitting} type="submit">
                Send Report
              </button>
              <button
                className="secondary-button"
                onClick={() => setReportingId("")}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {comment.replies?.length ? (
          <div className="comment-replies">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <details className="intro-card homepage-panel comments-panel public-collapsible-section">
      <summary>
        <span className="section-head comments-head">
          <h2>Comments</h2>
          <span>{comments.length} visible</span>
        </span>
      </summary>

      <div className="public-collapsible-body">
        <p className="form-helper-text comments-guidelines">
          Be kind and talk about the music. See{" "}
          <Link to="/community">community guidelines</Link> for more.
        </p>

        {currentUser ? (
          <form className="comment-composer" onSubmit={handleCreateComment}>
            <label>
              <span className="comment-composer-label">
                Commenting as {currentUser.displayName}
              </span>
              <textarea
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Share how this song lands for you."
                rows="4"
                value={draft}
              />
            </label>
            <div className="comment-form-actions">
              <button
                disabled={submitting || draft.trim().length < 2}
                type="submit"
              >
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
        ) : (
          <div className="comments-auth-prompt">
            <p>Want to join the conversation?</p>
            <Link className="hero-link" to="/login">
              Create an account or sign in
            </Link>
          </div>
        )}

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        {loading ? (
          <p className="lyrics-placeholder">Loading comments...</p>
        ) : comments.length ? (
          <div className="comment-list">{commentTree.map(renderComment)}</div>
        ) : (
          <p className="lyrics-placeholder">
            No comments yet. Be the first person to leave one.
          </p>
        )}
      </div>
    </details>
  );
}
