import { Link, NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

export default function PublicLayout({ hasAdminSession, theme, setTheme }) {
  return (
    <div className="page-shell">
      <header className="public-site-header">
        <Link className="site-mark" to="/">
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
          </nav>
          <ThemeToggle setTheme={setTheme} theme={theme} />
          {hasAdminSession ? (
            <Link className="site-admin-link" to="/admin">
              Manage Posts
            </Link>
          ) : (
            <Link className="site-admin-link" to="/admin/login">
              Admin Login
            </Link>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  );
}
