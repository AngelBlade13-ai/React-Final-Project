import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiBaseUrl } from "../lib/site";

export default function CommentsSection({ currentUser, onUserLogout, postSlug, userToken }) {
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${apiBaseUrl}/posts/${postSlug}/comments`);
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

  async function handleCreateComment(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiBaseUrl}/posts/${postSlug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ body: draft })
      });
      const data = await response.json();

      if (response.status === 401) {
        onUserLogout?.();
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to post comment.");
      }

      setComments((current) => [...current, data.comment]);
      setDraft("");
      setSuccess("Comment posted.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveComment(commentId) {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiBaseUrl}/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ body: editingBody })
      });
      const data = await response.json();

      if (response.status === 401) {
        onUserLogout?.();
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to update comment.");
      }

      setComments((current) => current.map((comment) => (comment.id === commentId ? data.comment : comment)));
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
    const confirmed = window.confirm("Delete this comment?");

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiBaseUrl}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      const data = await response.json();

      if (response.status === 401) {
        onUserLogout?.();
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete comment.");
      }

      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setSuccess("Comment deleted.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="intro-card homepage-panel comments-panel">
      <div className="section-head comments-head">
        <h2>Comments</h2>
        <span>{comments.length} visible</span>
      </div>

      {currentUser ? (
        <form className="comment-composer" onSubmit={handleCreateComment}>
          <label>
            <span className="comment-composer-label">Commenting as {currentUser.displayName}</span>
            <textarea
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Leave a response to this release."
              rows="4"
              value={draft}
            />
          </label>
          <div className="comment-form-actions">
            <button disabled={submitting || draft.trim().length < 2} type="submit">
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="comments-auth-prompt">
          <p>Want to join the conversation?</p>
          <Link className="hero-link" to="/account">
            Create an account or sign in
          </Link>
        </div>
      )}

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      {loading ? (
        <p className="lyrics-placeholder">Loading comments...</p>
      ) : comments.length ? (
        <div className="comment-list">
          {comments.map((comment) => {
            const isOwner = currentUser?.id === comment.author?.id;
            const isEditing = editingId === comment.id;

            return (
              <article className="comment-card" key={comment.id}>
                <div className="comment-card-head">
                  <div>
                    <strong>{comment.author?.displayName || "Archive Reader"}</strong>
                    <p className="comment-meta">
                      {new Date(comment.updatedAt || comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {isOwner ? (
                    <div className="comment-card-actions">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditingBody(comment.body);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button className="secondary-button" onClick={() => handleDeleteComment(comment.id)} type="button">
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="comment-edit-shell">
                    <textarea onChange={(event) => setEditingBody(event.target.value)} rows="4" value={editingBody} />
                    <div className="comment-form-actions">
                      <button disabled={submitting || editingBody.trim().length < 2} onClick={() => handleSaveComment(comment.id)} type="button">
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
              </article>
            );
          })}
        </div>
      ) : (
        <p className="lyrics-placeholder">No comments yet. Be the first person to leave one.</p>
      )}
    </section>
  );
}
