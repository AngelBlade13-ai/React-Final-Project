import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    description: currentUser
      ? "Manage your public account and stay connected to the archive conversation."
      : "Create an account, sign in, and join the public conversation around each release.",
    title: currentUser ? "Account" : "Sign In"
  });
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  function validateAuthForm() {
    if (mode === "register" && displayName.trim().length < 2) {
      return "Display name must be at least 2 characters.";
    }

    if (!email.trim()) {
      return "Email is required.";
    }

    if (mode === "register" && password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (mode === "login" && !password) {
      return "Password is required.";
    }

    return "";
  }

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

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const validationError = validateAuthForm();

    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/auth/${mode === "register" ? "register" : "login"}`,
        {
          method: "POST",
          credentials: "include",
          headers: withMutationIntent({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify({
            displayName,
            email,
            password
          })
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      onUserAuthSuccess(data);
      setProfileName(data.user?.displayName || "");
      setDisplayName("");
      setEmail("");
      setPassword("");
      setSuccess(mode === "register" ? "Account created." : "Signed in.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

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

  return (
    <div className="content-grid">
      <section className="hero homepage-hero account-hero">
        <div className="hero-header-row auth-header-row">
          <Link className="back-link" to="/">
            Back to site
          </Link>
        </div>
        <p className="eyebrow">Community Access</p>
        <h1>
          Sign in once, keep your place, and unlock the right workspace.
        </h1>
        <p className="hero-copy">
          Public accounts can comment, save releases, react to songs, and keep
          recent listens. Admin accounts use the same login, with an extra role
          flag that opens the studio and moderation tools.
        </p>
      </section>

      {!isUserSessionReady ? (
        <PublicLoadingState
          message="Checking whether this browser already has a public account session."
          title="Checking your session"
        />
      ) : currentUser ? (
        <>
          <section className="auth-card auth-login-card account-panel">
            <div className="auth-form-intro">
              <p className="eyebrow">Signed In</p>
              <h2>{currentUser.displayName}</h2>
              <p>{currentUser.email}</p>
            </div>
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
                Leave the password blank to keep the current one. New passwords
                must be at least 8 characters.
              </p>
              {error ? <p className="error-text">{error}</p> : null}
              {success ? <p className="success-text">{success}</p> : null}
              <div className="account-action-row">
                {currentUser.role === "admin" ? (
                  <Link className="hero-link" to="/admin">
                    Open Admin Studio
                  </Link>
                ) : null}
                <button disabled={submitting} type="submit">
                  {submitting ? "Saving..." : "Update Account"}
                </button>
                <button
                  className="secondary-button"
                  onClick={onUserLogout}
                  type="button"
                >
                  Sign Out
                </button>
              </div>
            </form>
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
                    Save releases from their pages to build your library.
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
        </>
      ) : (
        <section className="auth-card auth-login-card account-panel">
          <div className="auth-form-intro">
            <p className="eyebrow">
              {mode === "register" ? "Create Account" : "Welcome Back"}
            </p>
            <h2>{mode === "register" ? "Join the archive" : "User Sign In"}</h2>
            <p>
              {mode === "register"
                ? "Create an account to comment, save releases, and build a library."
                : "Sign in to manage your library, comments, and any studio access tied to your account."}
            </p>
          </div>
          <form className="account-form-grid" onSubmit={handleAuthSubmit}>
            {mode === "register" ? (
              <label>
                Display Name
                <input
                  minLength="2"
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  type="text"
                  value={displayName}
                />
              </label>
            ) : null}
            <label>
              Email
              <input
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Password
              <input
                minLength={mode === "register" ? 8 : undefined}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {mode === "register" ? (
              <p className="form-helper-text">
                Use at least 8 characters for account passwords.
              </p>
            ) : null}
            {error ? <p className="error-text">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}
            <div className="account-action-row">
              <button disabled={submitting} type="submit">
                {submitting
                  ? "Working..."
                  : mode === "register"
                    ? "Create Account"
                    : "Sign In"}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setMode((current) =>
                    current === "register" ? "login" : "register"
                  );
                  setError("");
                  setSuccess("");
                }}
                type="button"
              >
                {mode === "register" ? "Use Sign In" : "Create Account"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
