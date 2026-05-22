import { useEffect, useMemo, useState } from "react";
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
      "Manage your profile, saved songs, recent listens, and account settings.",
    title: "Account"
  });

  const [profileName, setProfileName] = useState(
    currentUser?.displayName || ""
  );
  const [profilePassword, setProfilePassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
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

  const displayName =
    currentUser?.displayName || currentUser?.email || "Your Profile";

  const roleLabel = currentUser?.role === "admin" ? "Admin" : "Listener";
  const statusLabel = currentUser?.status || "active";

  const continueRelease = useMemo(() => {
    return library.recentReleases[0] || library.savedReleases[0] || null;
  }, [library.recentReleases, library.savedReleases]);

  const favoriteRelease = useMemo(() => {
    return library.savedReleases[0] || null;
  }, [library.savedReleases]);

  useEffect(() => {
    setProfileName(currentUser?.displayName || "");
    setProfilePassword("");
  }, [currentUser]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [avatarFile]);

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
      setSuccess("Profile updated.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAvatarFileChange(event) {
    const file = event.target.files?.[0] || null;
    setAvatarError("");
    setAvatarSuccess("");

    if (!file) {
      setAvatarFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAvatarFile(null);
      setAvatarError("Choose an image file for your profile picture.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarFile(null);
      setAvatarError("Profile pictures must be 5 MB or smaller.");
      return;
    }

    setAvatarFile(file);
  }

  async function handleAvatarSubmit(event) {
    event.preventDefault();
    setAvatarError("");
    setAvatarSuccess("");

    if (!avatarFile) {
      setAvatarError("Choose an image before uploading.");
      return;
    }

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const response = await fetch(`${apiBaseUrl}/auth/me/avatar`, {
        method: "POST",
        credentials: "include",
        headers: withMutationIntent(),
        body: formData
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Profile picture upload failed.");
      }

      onUserAuthSuccess(data);
      setAvatarFile(null);
      setAvatarSuccess("Profile picture updated.");
    } catch (apiError) {
      setAvatarError(apiError.message);
    } finally {
      setAvatarUploading(false);
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
    <div className="content-grid account-page">
      <section className="account-profile-shell">
        <div className="account-profile-main">
          <Link className="back-link" to="/">
            Back to site
          </Link>

          <div className="account-profile-header">
            <div
              className="profile-avatar profile-avatar-large"
              aria-hidden="true"
            >
              {currentUser.avatarUrl ? (
                <img alt="" src={currentUser.avatarUrl} />
              ) : (
                profileInitial
              )}
            </div>

            <div className="account-profile-copy">
              <p className="eyebrow">Your Profile</p>
              <h1>{displayName}</h1>
              <p>{currentUser.email}</p>

              <div className="profile-pill-row">
                <span>{roleLabel}</span>
                <span>{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="account-profile-side">
          <p className="eyebrow">Listening Snapshot</p>
          <div className="profile-stat-grid profile-stat-grid-wide">
            <article>
              <strong>{library.savedReleases.length}</strong>
              <span>Saved songs</span>
            </article>
            <article>
              <strong>{library.recentReleases.length}</strong>
              <span>Recent listens</span>
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
        </aside>
      </section>

      <section className="account-dashboard-grid">
        <article className="intro-card homepage-panel account-avatar-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Profile Picture</p>
              <h2>Your listener image</h2>
            </div>
            <span>Optional</span>
          </div>

          <div className="account-avatar-upload-layout">
            <div
              className="profile-avatar account-avatar-preview"
              aria-hidden="true"
            >
              {avatarPreviewUrl || currentUser.avatarUrl ? (
                <img alt="" src={avatarPreviewUrl || currentUser.avatarUrl} />
              ) : (
                profileInitial
              )}
            </div>

            <form className="account-avatar-form" onSubmit={handleAvatarSubmit}>
              <label className="avatar-file-picker">
                Choose image
                <input
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  type="file"
                />
              </label>
              <p className="form-helper-text">
                Use a square image if you have one. Large images are cropped to
                fit.
              </p>
              {avatarFile ? (
                <p className="avatar-file-name">{avatarFile.name}</p>
              ) : null}
              {avatarError ? <p className="error-text">{avatarError}</p> : null}
              {avatarSuccess ? (
                <p className="success-text">{avatarSuccess}</p>
              ) : null}
              <button disabled={avatarUploading || !avatarFile} type="submit">
                {avatarUploading ? "Uploading..." : "Upload picture"}
              </button>
            </form>
          </div>
        </article>

        <article className="intro-card homepage-panel account-feature-card">
          <p className="eyebrow">Continue Listening</p>
          <h2>{continueRelease?.title || "No recent listens yet"}</h2>
          <p>
            {continueRelease
              ? "Pick up from the last song you opened, or keep browsing from your saved list."
              : "Play a song while signed in and it will appear here for quick access."}
          </p>

          {continueRelease ? (
            <Link className="card-link" to={`/release/${continueRelease.slug}`}>
              Open song
            </Link>
          ) : (
            <Link className="card-link" to="/explore">
              Browse songs
            </Link>
          )}
        </article>

        <article className="intro-card homepage-panel account-feature-card">
          <p className="eyebrow">Saved Favorite</p>
          <h2>{favoriteRelease?.title || "Nothing saved yet"}</h2>
          <p>
            {favoriteRelease
              ? "Your saved songs are kept here so the pieces you want to return to stay easy to find."
              : "Save songs from their release pages to start building your personal shelf."}
          </p>

          {favoriteRelease ? (
            <Link className="card-link" to={`/release/${favoriteRelease.slug}`}>
              Open saved song
            </Link>
          ) : (
            <Link className="card-link" to="/collections">
              Explore collections
            </Link>
          )}
        </article>
      </section>

      <section className="intro-card homepage-panel account-library-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Your Music</p>
            <h2>Library</h2>
          </div>
          <span>{libraryLoading ? "Loading..." : "Saved and recent"}</span>
        </div>

        {libraryError ? <p className="error-text">{libraryError}</p> : null}

        <div className="account-library-grid">
          <article className="account-library-list">
            <div className="account-list-heading">
              <h3>Saved Songs</h3>
              <span>{library.savedReleases.length}</span>
            </div>

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
            <div className="account-list-heading">
              <h3>Recently Played</h3>
              <span>{library.recentReleases.length}</span>
            </div>

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
                Play a song while signed in and it will appear here.
              </p>
            )}
          </article>
        </div>
      </section>

      <section className="intro-card homepage-panel account-settings-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Account Settings</p>
            <h2>Profile details</h2>
          </div>
          <span>Private</span>
        </div>

        <form className="account-form-grid" onSubmit={handleProfileSubmit}>
          <label>
            Display name
            <input
              minLength="2"
              onChange={(event) => setProfileName(event.target.value)}
              required
              type="text"
              value={profileName}
            />
          </label>

          <label>
            New password
            <input
              minLength="8"
              onChange={(event) => setProfilePassword(event.target.value)}
              placeholder="Leave blank to keep current password"
              type="password"
              value={profilePassword}
            />
          </label>

          <p className="form-helper-text">
            Leave the password blank if you do not want to change it.
          </p>

          {error ? <p className="error-text">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}

          <button disabled={submitting} type="submit">
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>
    </div>
  );
}
