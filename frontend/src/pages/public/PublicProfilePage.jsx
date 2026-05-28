import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  PublicErrorState,
  PublicLoadingState
} from "../../components/PublicDataState";
import usePageMetadata from "../../hooks/usePageMetadata";
import { apiBaseUrl } from "../../lib/site";

function getProfileInitial(profile = {}) {
  return (
    String(profile.displayName || "L")
      .trim()
      .slice(0, 1)
      .toUpperCase() || "L"
  );
}

export default function PublicProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  usePageMetadata({
    description: profile
      ? `Public listener profile for ${profile.displayName}.`
      : "Public listener profile.",
    title: profile?.displayName || "Listener Profile"
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${apiBaseUrl}/users/${id}/profile`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Profile could not be loaded.");
        }

        if (!cancelled) {
          setProfile(data.profile || null);
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

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="content-grid">
        <PublicLoadingState
          message="Loading this listener profile."
          title="Loading profile"
        />
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="content-grid">
        <PublicErrorState
          message={error || "Profile not found."}
          title="Profile unavailable"
        />
      </main>
    );
  }

  return (
    <main className="content-grid account-page">
      <section className="account-profile-shell">
        <div className="account-profile-main">
          <Link className="back-link" to="/explore">
            Back to songs
          </Link>

          <div className="account-profile-header">
            <div
              aria-hidden="true"
              className="profile-avatar profile-avatar-large"
            >
              {profile.avatarUrl ? (
                <img alt="" src={profile.avatarUrl} />
              ) : (
                getProfileInitial(profile)
              )}
            </div>

            <div className="account-profile-copy">
              <p className="eyebrow">Listener Profile</p>
              <h1>{profile.displayName}</h1>
              <div className="profile-pill-row">
                <span>{profile.role === "admin" ? "Admin" : "Listener"}</span>
                <span>
                  {profile.stats?.visibleCommentCount || 0} public comments
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside className="account-profile-side">
          <p className="eyebrow">Community</p>
          <p className="form-helper-text">
            This public profile only shows display name, profile picture, and
            visible comments.
          </p>
        </aside>
      </section>

      <section className="intro-card homepage-panel account-library-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Recent Comments</p>
            <h2>Public activity</h2>
          </div>
          <span>{profile.recentComments?.length || 0}</span>
        </div>

        {profile.recentComments?.length ? (
          <div className="comment-list">
            {profile.recentComments.map((comment) => (
              <article className="comment-card" key={comment.id}>
                <p className="comment-body">{comment.body}</p>
                <p className="comment-meta">
                  {new Date(
                    comment.updatedAt || comment.createdAt
                  ).toLocaleString()}
                </p>
                <Link className="inline-link" to={`/release/${comment.postSlug}`}>
                  {comment.postTitle}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="form-helper-text">
            This listener has no visible comments yet.
          </p>
        )}
      </section>
    </main>
  );
}
