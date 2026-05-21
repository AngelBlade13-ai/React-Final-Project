import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { PublicLoadingState } from "../../components/PublicDataState";
import { withMutationIntent } from "../../lib/api";
import usePageMetadata from "../../hooks/usePageMetadata";
import { apiBaseUrl } from "../../lib/site";

export default function LoginPage({
  currentUser,
  isUserSessionReady,
  onUserAuthSuccess
}) {
  usePageMetadata({
    description:
      "Sign in or create an account to save releases, comment, react, and access any role-based studio tools.",
    title: "Sign In"
  });
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setDisplayName("");
      setEmail("");
      setPassword("");
      setSuccess(mode === "register" ? "Account created." : "Signed in.");
      navigate("/account", { replace: true });
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
          message="Checking whether this browser already has an account session."
          title="Checking your session"
        />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate replace to="/account" />;
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
        <h1>Sign in to your archive account.</h1>
        <p className="hero-copy">
          Public accounts can comment, save releases, react to songs, and keep
          recent listens. Admin accounts use the same login, with a role flag
          that opens the studio and moderation tools after sign-in.
        </p>
      </section>
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
    </div>
  );
}
