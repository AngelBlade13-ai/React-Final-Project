import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

export default function PublicLayout({
  currentUser,
  hasAdminSession,
  isThemeLocked = false,
  isUserSessionReady = true,
  onUserLogout,
  theme,
  setTheme
}) {
  const [siteMarkPressCount, setSiteMarkPressCount] = useState(0);
  const [showAdminAccess, setShowAdminAccess] = useState(hasAdminSession);

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
      <header className="public-site-header">
        <Link
          className="site-mark"
          onClick={() => {
            if (!hasAdminSession) {
              setSiteMarkPressCount((current) => current + 1);
            }
          }}
          to="/"
        >
          <span className="eyebrow">Suno Diary</span>
          <strong>Releases, collections, and notes in one place.</strong>
        </Link>
        <div className="public-site-actions">
          <nav className="site-nav" aria-label="Primary">
            <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/">
              Home
            </NavLink>
            <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/collections">
              Collections
            </NavLink>
            <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/explore">
              Explore
            </NavLink>
            <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/about">
              About
            </NavLink>
            {!hasAdminSession ? (
              <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/account">
                {currentUser ? "Account" : "Join"}
              </NavLink>
            ) : null}
          </nav>
          {!isThemeLocked ? <ThemeToggle setTheme={setTheme} theme={theme} /> : null}
          {currentUser ? (
            <div className="site-user-controls">
              <Link className="site-account-link" to="/account">
                {currentUser.displayName}
              </Link>
              <button className="site-user-logout" onClick={onUserLogout} type="button">
                Sign Out
              </button>
            </div>
          ) : isUserSessionReady && !hasAdminSession ? (
            <Link className="site-account-link" to="/account">
              Sign In
            </Link>
          ) : null}
          {showAdminAccess ? (
            <Link className="site-admin-link" to="/admin">
              {hasAdminSession ? "Manage Posts" : "Admin Access"}
            </Link>
          ) : null}
        </div>
      </header>
      <Outlet />
    </div>
  );
}
