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
      "Enter the archive through authored routes built around worlds, moods, and recurring themes.",
    title: "Guided Paths"
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
        <p className="eyebrow">Guided Listening Paths</p>
        <h1>Enter the archive through authored routes.</h1>
        <p className="hero-copy">
          These are not generic filters. Each path is meant to feel like a
          chosen doorway into a mood, world, or thread of identity.
        </p>
      </header>

      <main className="content-grid">
        {error ? (
          <PublicErrorState
            eyebrow="Guided Paths"
            message={error}
            onRetry={() => {
              retryPosts();
              retryCollections();
              retrySiteContent();
            }}
            secondaryHref="/explore"
            secondaryLabel="Search archive"
            title="Guided paths could not load"
          />
        ) : loading && !paths.length ? (
          <PublicLoadingState
            message="The route list is being assembled from releases, collections, and site settings."
            title="Preparing guided paths"
          />
        ) : null}
        <section className="guided-path-grid">
          {loading && !paths.length ? (
            <PublicSkeletonGrid count={3} label="Loading guided paths" />
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
                    {loading ? "..." : `${path.count} tracks`}
                  </span>
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
            ))
          )}
        </section>
      </main>
    </>
  );
}
