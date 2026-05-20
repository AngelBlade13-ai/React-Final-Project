import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  PublicErrorState,
  PublicLoadingState
} from "../../components/PublicDataState";
import {
  usePublicCollections,
  usePublicPosts,
  useSiteContent
} from "../../hooks/usePublicApi";
import usePageMetadata from "../../hooks/usePageMetadata";
import { formatPostDate } from "../../lib/formatters";
import { resolveGuidedListeningPath } from "../../lib/listeningPaths";
import { getVisibleCollectionsForPost, hasVideo } from "../../lib/site";

export default function GuidedPathPage({
  onPlayTrack,
  setActiveCollectionTheme,
  setForcedTheme
}) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
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

  const path = resolveGuidedListeningPath(slug, posts, collections, siteContent);
  const activePost = path?.posts?.[activeIndex] || null;
  const activeCollections = getVisibleCollectionsForPost(activePost);
  const playbackContext = path
    ? {
        collectionId: path.slug,
        collectionName: path.title,
        collectionSlug: path.slug,
        queue: path.posts
      }
    : null;

  usePageMetadata({
    canonicalPath: `/paths/${slug}`,
    description: path?.intro || "Follow an authored route through the archive.",
    title: path?.title || "Guided Path"
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [slug]);

  useEffect(() => {
    if (!path) {
      return;
    }

    if (activeIndex >= path.posts.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, path]);

  useEffect(() => {
    if (!path?.themeHint) {
      setActiveCollectionTheme?.("");
      setForcedTheme?.(null);
      return undefined;
    }

    setActiveCollectionTheme?.(path.themeHint);

    if (path.themeHint === "fractureverse" || path.themeHint === "eldoria") {
      setForcedTheme?.("dark");
    } else {
      setForcedTheme?.(null);
    }

    return () => {
      setActiveCollectionTheme?.("");
      setForcedTheme?.(null);
    };
  }, [path, setActiveCollectionTheme, setForcedTheme]);

  useEffect(() => {
    if (!loading || path || error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate("/paths", { replace: true });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [error, loading, navigate, path]);

  return (
    <>
      <header className="hero section-hero guided-paths-hero">
        <div className="public-page-links">
          <Link className="back-link" to="/paths">
            All paths
          </Link>
          <Link className="back-link" to="/collections">
            Collections
          </Link>
        </div>
        <p className="eyebrow">{path?.eyebrow || "Guided Path"}</p>
        <h1>{path?.title || "Loading path..."}</h1>
        <p className="hero-copy">{path?.intro || "Building the path..."}</p>
        {path ? (
          <div className="hero-note-stats">
            <span className="meta-badge">{path.posts.length} tracks</span>
            <span className="meta-badge subtle-badge">{path.moodNote}</span>
          </div>
        ) : null}
      </header>

      <main className="content-grid">
        {error ? (
          <PublicErrorState
            eyebrow="Guided Path"
            message={error}
            onRetry={() => {
              retryPosts();
              retryCollections();
              retrySiteContent();
            }}
            secondaryHref="/paths"
            secondaryLabel="All paths"
            title="This guided path could not load"
          />
        ) : null}
        {path && activePost ? (
          <>
            <section className="intro-card homepage-panel guided-path-focus-card">
              <div className="section-head">
                <h2>Current Step</h2>
                <span>
                  {activeIndex + 1} / {path.posts.length}
                </span>
              </div>
              <div className="guided-path-focus-layout">
                <div className="guided-path-focus-copy">
                  <p className="eyebrow">Path Focus</p>
                  <h3>{activePost.title}</h3>
                  <p>{activePost.excerpt}</p>
                  <p className="meta">{formatPostDate(activePost.createdAt)}</p>
                  <div className="tag-row">
                    {activeCollections.map((collection) => (
                      <Link
                        className="collection-chip"
                        key={collection.slug}
                        to={`/collections/${collection.slug}`}
                      >
                        {collection.title}
                      </Link>
                    ))}
                  </div>
                  <div className="home-doorway-actions">
                    <button
                      className="secondary-button"
                      disabled={!hasVideo(activePost.videoUrl)}
                      onClick={() => onPlayTrack(activePost, playbackContext)}
                      type="button"
                    >
                      {hasVideo(activePost.videoUrl)
                        ? "Play In Path Queue"
                        : "Video Pending"}
                    </button>
                    <Link
                      className="hero-link"
                      to={`/release/${activePost.slug}`}
                    >
                      Open Release
                    </Link>
                  </div>
                </div>
                <div className="guided-path-step-controls">
                  <button
                    className="secondary-button"
                    disabled={activeIndex === 0}
                    onClick={() =>
                      setActiveIndex((current) => Math.max(0, current - 1))
                    }
                    type="button"
                  >
                    Previous Step
                  </button>
                  <button
                    className="secondary-button"
                    disabled={activeIndex >= path.posts.length - 1}
                    onClick={() =>
                      setActiveIndex((current) =>
                        Math.min(path.posts.length - 1, current + 1)
                      )
                    }
                    type="button"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            </section>

            <section className="intro-card homepage-panel">
              <div className="section-head">
                <h2>Path Sequence</h2>
                <span>{path.posts.length} authored stops</span>
              </div>
              <div className="guided-path-sequence">
                {path.posts.map((entry, index) => (
                  <button
                    className={`guided-path-step${index === activeIndex ? " active" : ""}`}
                    key={entry.slug}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    <span className="guided-path-step-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{entry.title}</strong>
                    <p>{entry.excerpt}</p>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : path ? (
          <section className="intro-card homepage-panel empty-state-card">
            <p className="eyebrow">Path Needs Songs</p>
            <h3>This guided path is saved, but no public songs resolve yet.</h3>
            <p>
              The path exists in the admin configuration. Add manual songs or
              adjust its rules to make it playable.
            </p>
          </section>
        ) : loading ? (
          <PublicLoadingState
            message="The path is being assembled from the current public catalog."
            title="Gathering the route"
          />
        ) : null}
      </main>
    </>
  );
}
