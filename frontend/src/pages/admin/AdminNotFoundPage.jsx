import { Link } from "react-router-dom";

export default function AdminNotFoundPage() {
  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-not-found-card">
        <p className="eyebrow">Admin Route</p>
        <h2>This admin surface does not exist.</h2>
        <p>
          Return to a stable workspace before making changes. Insights is the
          safest place to verify archive health, recent activity, and content
          readiness.
        </p>
        <div className="admin-not-found-actions">
          <Link className="hero-link" to="/admin/insights">
            Open Insights
          </Link>
          <Link className="hero-link secondary-link" to="/admin/posts">
            Manage Posts
          </Link>
          <Link className="hero-link secondary-link" to="/admin/site">
            Site Settings
          </Link>
        </div>
      </section>
    </main>
  );
}
