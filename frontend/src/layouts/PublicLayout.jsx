import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { emptySiteSettings } from "../lib/site";

export default function PublicLayout({
  currentUser,
  hasAdminSession,
  isThemeLocked = false,
  isUserSessionReady = true,
  onUserLogout,
  siteContent,
  theme,
  setTheme
}) {
  const [siteMarkPressCount, setSiteMarkPressCount] = useState(0);
  const [showAdminAccess, setShowAdminAccess] = useState(hasAdminSession);
  const branding = {
    ...emptySiteSettings.branding,
    ...(siteContent?.branding || {})
  };

  useEffect(() => {
    if (hasAdminSession) {
      setShowAdminAccess(true);
      return undefined;
    }

    if (!siteMarkPressCount) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSiteMarkPressCount(0);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasAdminSession, siteMarkPressCount]);

  useEffect(() => {
    if (siteMarkPressCount >= 5) {
      setShowAdminAccess(true);
      setSiteMarkPressCount(0);
    }
  }, [siteMarkPressCount]);

  useEffect(() => {
    if (hasAdminSession || !showAdminAccess) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShowAdminAccess(false);
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasAdminSession, showAdminAccess]);

  return (
    <div className="page-shell">
      <a className="skip-link" href="#public-content">
        Skip to content
      </a>
      <div aria-hidden="true" className="threshold-overlay" />
      <header className="public-site-header">
        <div className="public-header-brand">
          <Link
            className="site-mark"
            onClick={() => {
              if (!hasAdminSession) {
                setSiteMarkPressCount((current) => current + 1);
              }
            }}
            to="/"
          >
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
              className={({ isActive }) =>
                `site-nav-link${isActive ? " active" : ""}`
              }
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
              Explore
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `site-nav-link${isActive ? " active" : ""}`
              }
              to="/about"
            >
              About
            </NavLink>
            {!hasAdminSession ? (
              <NavLink
                className={({ isActive }) =>
                  `site-nav-link${isActive ? " active" : ""}`
                }
                to="/account"
              >
                {currentUser ? "Account" : "Join"}
              </NavLink>
            ) : null}
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
          ) : isUserSessionReady && !hasAdminSession ? (
            <Link className="site-account-link" to="/account">
              Sign In
            </Link>
          ) : null}
          {!hasAdminSession ? (
            <Link className="site-utility-link quiet" to="/admin/login">
              Admin
            </Link>
          ) : null}
          {showAdminAccess ? (
            <Link className="site-admin-link" to="/admin">
              {hasAdminSession ? "Manage Posts" : "Admin Access"}
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
            A curated release archive with worlds, listening paths, comments,
            and an admin studio behind the public surface.
          </p>
        </div>
        <nav aria-label="Footer" className="footer-link-row">
          <Link to="/collections">Collections</Link>
          <Link to="/paths">Paths</Link>
          <Link to="/explore">Explore</Link>
          <Link to="/about">About</Link>
        </nav>
      </footer>
    </div>
  );
}
