import { Link } from "react-router-dom";
import {
  PublicErrorState,
  PublicLoadingState,
  PublicSkeletonGrid
} from "../../components/PublicDataState";
import {
  usePublicCollections,
  usePublicPosts,
  useSiteContent
} from "../../hooks/usePublicApi";
import usePageMetadata from "../../hooks/usePageMetadata";
import { resolveGuidedListeningPaths } from "../../lib/listeningPaths";

export default function GuidedPathsIndexPage() {
  usePageMetadata({
    canonicalPath: "/paths",
    description:
      "Follow listening paths built around worlds, moods, and recurring themes.",
    title: "Listening Paths"
  });
  const {
    posts,
    error: postsError,
    isLoading: postsLoading,
    retry: retryPosts
  } = usePublicPosts();
  const {
    collections,
    error: collectionsError,
    isLoading: collectionsLoading,
    retry: retryCollections
  } = usePublicCollections("all");
  const {
    siteContent,
    error: siteContentError,
    isLoading: siteContentLoading,
    retry: retrySiteContent
  } = useSiteContent();
  const loading = postsLoading || collectionsLoading || siteContentLoading;
  const error =
    postsError?.message ||
    collectionsError?.message ||
    siteContentError?.message ||
    "";

  const paths = resolveGuidedListeningPaths(posts, collections, siteContent);

  return (
    <>
      <header className="hero section-hero guided-paths-hero">
        <p className="eyebrow">Listening Paths</p>
        <h1>Start with a mood and follow the songs from there.</h1>
        <p className="hero-copy">
          Each path is a suggested listening order for a world, feeling, or
          recurring theme.
        </p>
      </header>

      <main className="content-grid">
        {error ? (
          <PublicErrorState
            eyebrow="Listening Paths"
            message={error}
            onRetry={() => {
              retryPosts();
              retryCollections();
              retrySiteContent();
            }}
            secondaryHref="/explore"
            secondaryLabel="Search archive"
            title="Listening paths could not load"
          />
        ) : loading && !paths.length ? (
          <PublicLoadingState
            message="The listening paths are being gathered from songs and collections."
            title="Preparing listening paths"
          />
        ) : null}
        <section className="guided-path-grid">
          {loading && !paths.length ? (
            <PublicSkeletonGrid count={3} label="Loading listening paths" />
          ) : (
            paths.map((path) => (
              <article
                className="intro-card homepage-panel guided-path-card"
                key={path.slug}
              >
                <p className="eyebrow">{path.eyebrow}</p>
                <h2>{path.title}</h2>
                <p>{path.intro}</p>
                <p className="guided-path-note">{path.moodNote}</p>
                <div className="tag-row">
                  <span className="meta-badge">
                    {loading ? "..." : `${path.count} songs`}
                  </span>
                  {path.posts.slice(0, 2).map((post) => (
                    <span className="meta-badge subtle-badge" key={post.slug}>
                      {post.title}
                    </span>
                  ))}
                </div>
                <Link className="card-link" to={`/paths/${path.slug}`}>
                  Start Path
                </Link>
              </article>
            ))
          )}
        </section>
      </main>
    </>
  );
}
