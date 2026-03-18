import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle";
import { apiBaseUrl, tokenKey } from "../../lib/site";

export default function AdminLogin({ setHasAdminSession, theme, setTheme }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      localStorage.setItem(tokenKey, data.token);
      setHasAdminSession(true);
      navigate("/admin");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell auth-shell">
      <div className="auth-page-grid">
        <section className="hero homepage-hero auth-intro-panel">
          <div className="hero-header-row auth-header-row">
            <Link className="back-link" to="/">
              Back to site
            </Link>
            <ThemeToggle setTheme={setTheme} theme={theme} />
          </div>
          <p className="eyebrow">Admin Only</p>
          <h1>Step back into the archive and shape what visitors discover.</h1>
          <p className="hero-copy">
            The admin side manages releases, collections, and the About page. It should feel like the working room
            behind the public-facing archive, not a disconnected utility page.
          </p>
          <div className="hero-note-card auth-note-card">
            <p className="note-label">Inside The Workspace</p>
            <h2>Posts, collections, and site identity in one place.</h2>
            <p>Sign in to update release notes, curate collection shelves, and keep the archive voice consistent.</p>
          </div>
        </section>

        <form className="auth-card auth-login-card" onSubmit={handleSubmit}>
          <div className="auth-form-intro">
            <p className="eyebrow">Welcome Back</p>
            <h2>Admin Login</h2>
            <p>Use your admin credentials to manage the site.</p>
          </div>
          <label>
            Email
            <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label>
            Password
            <input onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit">{submitting ? "Signing in..." : "Login"}</button>
        </form>
      </div>
    </div>
  );
}
