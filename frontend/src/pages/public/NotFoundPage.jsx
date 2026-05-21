import { Link, useLocation } from "react-router-dom";
import usePageMetadata from "../../hooks/usePageMetadata";

export default function NotFoundPage() {
  const location = useLocation();

  usePageMetadata({
    canonicalPath: location.pathname,
    description:
      "This page does not exist. Return home, browse collections, or search the songs.",
    title: "Page Not Found"
  });

  return (
    <>
      <header className="hero homepage-hero section-hero not-found-hero">
        <p className="eyebrow">404 / Lost Signal</p>
        <h1>This page is not here.</h1>
        <p className="hero-copy">
          The link may have moved, the slug may have changed, or this part of
          the archive may not be ready yet.
        </p>
        <div className="hero-links-row">
          <Link className="hero-link" to="/">
            Return Home
          </Link>
          <Link className="hero-link secondary-link" to="/explore">
            Search Archive
          </Link>
        </div>
      </header>

      <main className="content-grid">
        <section className="intro-card homepage-panel not-found-panel">
          <p className="eyebrow">Useful Doorways</p>
          <h2>Try another way in.</h2>
          <p>
            Use collections if you want curated worlds, explore if you remember
            a title or lyric fragment, or about if you want the context behind
            the project.
          </p>
          <div className="not-found-link-grid">
            <Link className="linked-echo-card" to="/collections">
              <span className="fracture-sequence-state">Worlds</span>
              <strong>Browse collections</strong>
              <p>Open story worlds, mood groups, and connected songs.</p>
            </Link>
            <Link className="linked-echo-card" to="/paths">
              <span className="fracture-sequence-state">Guides</span>
              <strong>Follow listening paths</strong>
              <p>Use a curated listening path instead of browsing cold.</p>
            </Link>
            <Link className="linked-echo-card" to="/about">
              <span className="fracture-sequence-state">Context</span>
              <strong>Read about the archive</strong>
              <p>Learn what this project is trying to preserve.</p>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
