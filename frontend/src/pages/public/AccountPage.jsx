import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { apiBaseUrl, userTokenKey } from "../../lib/site";

export default function AccountPage({ currentUser, hasAdminSession, isUserSessionReady, onUserAuthSuccess, onUserLogout }) {
  useDocumentTitle(currentUser ? "Account" : "Sign In");
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileName, setProfileName] = useState(currentUser?.displayName || "");
  const [profilePassword, setProfilePassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setProfileName(currentUser?.displayName || "");
    setProfilePassword("");
  }, [currentUser]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiBaseUrl}/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          displayName,
          email,
          password
        })
      });
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

    try {
      const token = localStorage.getItem(userTokenKey) || "";
      const response = await fetch(`${apiBaseUrl}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
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
        <h1>Create an account, keep your place, and speak inside the archive.</h1>
        <p className="hero-copy">
          User accounts unlock public interaction. Right now that means comments on release pages, plus a basic account
          profile you can update without touching the admin workspace.
        </p>
      </section>

      {!isUserSessionReady ? (
        <section className="intro-card homepage-panel">
          <p className="eyebrow">Loading</p>
          <h2>Checking your session.</h2>
        </section>
      ) : hasAdminSession && !currentUser ? (
        <section className="auth-card auth-login-card account-panel">
          <div className="auth-form-intro">
            <p className="eyebrow">Admin Session Active</p>
            <h2>User accounts are separate from admin access.</h2>
            <p>
              You are currently signed in as an admin. Public user accounts are used for comments and community actions,
              not for site management.
            </p>
          </div>
          <div className="account-action-row">
            <Link className="hero-link" to="/admin">
              Return to Admin
            </Link>
            <Link className="secondary-button" to="/">
              Back to Site
            </Link>
          </div>
        </section>
      ) : currentUser ? (
        <section className="auth-card auth-login-card account-panel">
          <div className="auth-form-intro">
            <p className="eyebrow">Signed In</p>
            <h2>{currentUser.displayName}</h2>
            <p>{currentUser.email}</p>
          </div>
          <form className="account-form-grid" onSubmit={handleProfileSubmit}>
            <label>
              Display Name
              <input onChange={(event) => setProfileName(event.target.value)} required type="text" value={profileName} />
            </label>
            <label>
              New Password
              <input
                onChange={(event) => setProfilePassword(event.target.value)}
                placeholder="Leave blank to keep current password"
                type="password"
                value={profilePassword}
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}
            <div className="account-action-row">
              <button type="submit">{submitting ? "Saving..." : "Update Account"}</button>
              <button className="secondary-button" onClick={onUserLogout} type="button">
                Sign Out
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="auth-card auth-login-card account-panel">
          <div className="auth-form-intro">
            <p className="eyebrow">{mode === "register" ? "Create Account" : "Welcome Back"}</p>
            <h2>{mode === "register" ? "Join the archive" : "User Sign In"}</h2>
            <p>{mode === "register" ? "Create an account to comment on releases." : "Sign in to manage your comments."}</p>
          </div>
          <form className="account-form-grid" onSubmit={handleAuthSubmit}>
            {mode === "register" ? (
              <label>
                Display Name
                <input onChange={(event) => setDisplayName(event.target.value)} required type="text" value={displayName} />
              </label>
            ) : null}
            <label>
              Email
              <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label>
              Password
              <input onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}
            <div className="account-action-row">
              <button type="submit">{submitting ? "Working..." : mode === "register" ? "Create Account" : "Sign In"}</button>
              <button
                className="secondary-button"
                onClick={() => {
                  setMode((current) => (current === "register" ? "login" : "register"));
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
