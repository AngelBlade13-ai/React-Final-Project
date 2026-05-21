import { Link, NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { emptySiteSettings } from "../lib/site";

export default function PublicLayout({
  currentUser,
  isThemeLocked = false,
  isUserSessionReady = true,
  onUserLogout,
  siteContent,
  theme,
  setTheme
}) {
  const branding = {
    ...emptySiteSettings.branding,
    ...(siteContent?.branding || {})
  };

  return (
    <div className="page-shell">
      <a className="skip-link" href="#public-content">
        Skip to content
      </a>
      <div aria-hidden="true" className="threshold-overlay" />
      <header className="public-site-header">
        <div className="public-header-brand">
          <Link className="site-mark" to="/">
            <span className="eyebrow">{branding.siteName}</span>
            <strong>{branding.siteTagline}</strong>
          </Link>
        </div>
        <div className="public-header-nav">
          <nav className="site-nav" aria-label="Primary">
            <NavLink
              className={({ isActive }) =>
                `site-nav-link${isActive ? " active" : ""}`
              }
              to="/"
            >
              Home
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `site-nav-link${isActive ? " active" : ""}`
              }
              to="/collections"
            >
              Collections
            </NavLink>
            <NavLink
              aria-label="Listening Paths"
              className={({ isActive }) =>
                `site-nav-link${isActive ? " active" : ""}`
              }
              title="Listening Paths"
              to="/paths"
            >
              Paths
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `site-nav-link${isActive ? " active" : ""}`
              }
              to="/explore"
            >
              Search
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `site-nav-link${isActive ? " active" : ""}`
              }
              to="/about"
            >
              About
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `site-nav-link${isActive ? " active" : ""}`
              }
              to={currentUser ? "/account" : "/login"}
            >
              {currentUser ? "Account" : "Join"}
            </NavLink>
          </nav>
        </div>
        <div className="public-header-utility">
          {!isThemeLocked ? (
            <ThemeToggle setTheme={setTheme} theme={theme} />
          ) : null}
          {currentUser ? (
            <div className="site-user-controls">
              <Link className="site-account-link" to="/account">
                {currentUser.displayName}
              </Link>
              <button
                className="site-user-logout"
                onClick={onUserLogout}
                type="button"
              >
                Sign Out
              </button>
            </div>
          ) : isUserSessionReady ? (
            <Link className="site-account-link" to="/login">
              Sign In
            </Link>
          ) : null}
        </div>
      </header>
      <div id="public-content" tabIndex="-1">
        <Outlet />
      </div>
      <footer className="public-site-footer">
        <div>
          <p className="eyebrow">{branding.siteName}</p>
          <strong>{branding.siteTagline}</strong>
          <p>
            A personal music archive with story worlds, listening paths, and
            songs I did not want to lose.
          </p>
        </div>
        <nav aria-label="Footer" className="footer-link-row">
          <Link to="/paths/start-here">Start Here</Link>
          <Link to="/collections">Collections</Link>
          <Link to="/paths">Paths</Link>
          <Link to="/explore">Search</Link>
          <Link to="/about">About</Link>
          <Link to="/community">Community</Link>
        </nav>
      </footer>
    </div>
  );
}
