import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { apiBaseUrl } from "../../lib/site";
import { resolveGuidedListeningPaths } from "../../lib/listeningPaths";

export default function GuidedPathsIndexPage() {
  useDocumentTitle("Guided Paths");
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPathData() {
      try {
        setLoading(true);
        setError("");
        const [postsResponse, collectionsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/posts`),
          fetch(`${apiBaseUrl}/collections?scope=all`)
        ]);
        const postsData = await postsResponse.json();
        const collectionsData = await collectionsResponse.json();

        if (!postsResponse.ok || !collectionsResponse.ok) {
          throw new Error(postsData.message || collectionsData.message || "Failed to load guided paths.");
        }

        setPosts(postsData.posts || []);
        setCollections(collectionsData.collections || []);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadPathData();
  }, []);

  const paths = resolveGuidedListeningPaths(posts, collections);

  return (
    <>
      <header className="hero section-hero guided-paths-hero">
        <p className="eyebrow">Guided Listening Paths</p>
        <h1>Enter the archive through authored routes.</h1>
        <p className="hero-copy">
          These are not generic filters. Each path is meant to feel like a chosen doorway into a mood, world, or thread of identity.
        </p>
      </header>

      <main className="content-grid">
        {error ? <p className="error-text">{error}</p> : null}
        <section className="guided-path-grid">
          {paths.map((path) => (
            <article className="intro-card homepage-panel guided-path-card" key={path.slug}>
              <p className="eyebrow">{path.eyebrow}</p>
              <h2>{path.title}</h2>
              <p>{path.intro}</p>
              <p className="guided-path-note">{path.moodNote}</p>
              <div className="tag-row">
                <span className="meta-badge">{loading ? "..." : `${path.count} tracks`}</span>
                {path.posts.slice(0, 2).map((post) => (
                  <span className="meta-badge subtle-badge" key={post.slug}>
                    {post.title}
                  </span>
                ))}
              </div>
              <Link className="card-link" to={`/paths/${path.slug}`}>
                Enter Path
              </Link>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
