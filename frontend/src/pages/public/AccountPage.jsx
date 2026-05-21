import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PublicLoadingState } from "../../components/PublicDataState";
import { withMutationIntent } from "../../lib/api";
import usePageMetadata from "../../hooks/usePageMetadata";
import { apiBaseUrl } from "../../lib/site";

export default function AccountPage({
  currentUser,
  isUserSessionReady,
  onUserAuthSuccess,
  onUserLogout
}) {
  usePageMetadata({
    description:
      "Manage your public account, library, comments, and role-based archive access.",
    title: "Account"
  });
  const [profileName, setProfileName] = useState(
    currentUser?.displayName || ""
  );
  const [profilePassword, setProfilePassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [library, setLibrary] = useState({
    savedReleases: [],
    recentReleases: [],
    releaseReactions: {}
  });
  const [libraryError, setLibraryError] = useState("");
  const [libraryLoading, setLibraryLoading] = useState(false);
  const reactionCount = Object.keys(library.releaseReactions || {}).length;
  const profileInitial =
    String(currentUser?.displayName || currentUser?.email || "A")
      .trim()
      .slice(0, 1)
      .toUpperCase() || "A";

  useEffect(() => {
    setProfileName(currentUser?.displayName || "");
    setProfilePassword("");
  }, [currentUser]);

  useEffect(() => {
    let isCancelled = false;

    async function loadLibrary() {
      if (!currentUser) {
        setLibrary({
          savedReleases: [],
          recentReleases: [],
          releaseReactions: {}
        });
        return;
      }

      try {
        setLibraryLoading(true);
        setLibraryError("");

        const response = await fetch(`${apiBaseUrl}/auth/library`, {
          credentials: "include"
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Could not load your library.");
        }

        if (!isCancelled) {
          setLibrary({
            savedReleases: data.savedReleases || [],
            recentReleases: data.recentReleases || [],
            releaseReactions: data.releaseReactions || {}
          });
        }
      } catch (apiError) {
        if (!isCancelled) {
          setLibraryError(apiError.message);
        }
      } finally {
        if (!isCancelled) {
          setLibraryLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (profileName.trim().length < 2) {
      setError("Display name must be at least 2 characters.");
      setSubmitting(false);
      return;
    }

    if (profilePassword && profilePassword.length < 8) {
      setError("New password must be at least 8 characters.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/me`, {
        method: "PUT",
        credentials: "include",
        headers: withMutationIntent({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          displayName: profileName,
          password: profilePassword
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Profile update failed.");
      }

      onUserAuthSuccess(data);
      setProfilePassword("");
      setSuccess("Account updated.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isUserSessionReady) {
    return (
      <div className="content-grid">
        <PublicLoadingState
          message="Checking whether this browser already has a public account session."
          title="Checking your session"
        />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  return (
    <div className="content-grid">
      <section className="hero homepage-hero account-hero">
        <div className="hero-header-row auth-header-row">
          <Link className="back-link" to="/">
            Back to site
          </Link>
        </div>
        <p className="eyebrow">Archive Profile</p>
        <h1>Your account, library, and archive trail.</h1>
        <p className="hero-copy">
          Manage your listener identity, return to saved songs, and open any
          role-based tools connected to this account.
        </p>
      </section>

      <section className="profile-hero-card">
        <div className="profile-avatar" aria-hidden="true">
          {profileInitial}
        </div>
        <div className="profile-identity">
          <p className="eyebrow">
            {currentUser.role === "admin"
              ? "Admin Profile"
              : "Listener Profile"}
          </p>
          <h2>{currentUser.displayName}</h2>
          <p>{currentUser.email}</p>
          <div className="profile-pill-row">
            <span>
              {currentUser.role === "admin"
                ? "Studio access"
                : "Public account"}
            </span>
            <span>{currentUser.status || "active"}</span>
          </div>
        </div>
        <div className="profile-action-stack">
          <div className="profile-stat-grid">
            <article>
              <strong>{library.savedReleases.length}</strong>
              <span>Saved</span>
            </article>
            <article>
              <strong>{library.recentReleases.length}</strong>
              <span>Recent</span>
            </article>
            <article>
              <strong>{reactionCount}</strong>
              <span>Reactions</span>
            </article>
          </div>
          <div className="account-action-row">
            {currentUser.role === "admin" ? (
              <Link className="hero-link" to="/admin">
                Open Admin Studio
              </Link>
            ) : null}
            <button
              className="secondary-button"
              onClick={onUserLogout}
              type="button"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
      <section className="profile-dashboard-grid">
        <article className="intro-card homepage-panel profile-feature-card">
          <p className="eyebrow">Current Shelf</p>
          <h2>
            {library.savedReleases[0]?.title ||
              library.recentReleases[0]?.title ||
              "Start building your archive trail."}
          </h2>
          <p>
            {library.savedReleases[0]
              ? "Your latest saved release is waiting here whenever you come back."
              : library.recentReleases[0]
                ? "Your most recent listen is ready to continue."
                : "Save a release or press play while signed in to shape this profile."}
          </p>
          {library.savedReleases[0] || library.recentReleases[0] ? (
            <Link
              className="card-link"
              to={`/release/${(library.savedReleases[0] || library.recentReleases[0]).slug}`}
            >
              Open Release
            </Link>
          ) : (
            <Link className="card-link" to="/explore">
              Explore Releases
            </Link>
          )}
        </article>
        <article className="intro-card homepage-panel profile-settings-card">
          <p className="eyebrow">Profile Settings</p>
          <h2>Account details</h2>
          <form className="account-form-grid" onSubmit={handleProfileSubmit}>
            <label>
              Display Name
              <input
                minLength="2"
                onChange={(event) => setProfileName(event.target.value)}
                required
                type="text"
                value={profileName}
              />
            </label>
            <label>
              New Password
              <input
                minLength="8"
                onChange={(event) => setProfilePassword(event.target.value)}
                placeholder="Leave blank to keep current password"
                type="password"
                value={profilePassword}
              />
            </label>
            <p className="form-helper-text">
              Leave the password blank to keep the current one.
            </p>
            {error ? <p className="error-text">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}
            <button disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Update Profile"}
            </button>
          </form>
        </article>
      </section>
      <section className="intro-card homepage-panel account-library-panel">
        <div className="section-head">
          <h2>Your Library</h2>
          <span>{libraryLoading ? "Loading..." : "Saved + recent"}</span>
        </div>
        {libraryError ? <p className="error-text">{libraryError}</p> : null}
        <div className="account-library-grid">
          <article className="account-library-list">
            <p className="eyebrow">Saved Releases</p>
            {library.savedReleases.length ? (
              library.savedReleases.map((release) => (
                <Link
                  className="account-library-link"
                  key={release.slug}
                  to={`/release/${release.slug}`}
                >
                  <strong>{release.title}</strong>
                  <span>
                    {library.releaseReactions[release.slug] ||
                      "Saved for later"}
                  </span>
                </Link>
              ))
            ) : (
              <p className="form-helper-text">
                Save songs from their pages to build your library.
              </p>
            )}
          </article>
          <article className="account-library-list">
            <p className="eyebrow">Recently Played</p>
            {library.recentReleases.length ? (
              library.recentReleases.map((release) => (
                <Link
                  className="account-library-link"
                  key={release.slug}
                  to={`/release/${release.slug}`}
                >
                  <strong>{release.title}</strong>
                  <span>Continue listening</span>
                </Link>
              ))
            ) : (
              <p className="form-helper-text">
                Play a release while signed in and it will appear here.
              </p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
