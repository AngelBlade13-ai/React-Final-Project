import {
  PublicErrorState,
  PublicLoadingState,
  PublicSkeletonGrid
} from "../../components/PublicDataState";
import { CollectionCard } from "../../components/cards";
import { usePublicCollections } from "../../hooks/usePublicApi";
import usePageMetadata from "../../hooks/usePageMetadata";

export default function CollectionsIndexPage() {
  usePageMetadata({
    description: "Browse songs by collection, story world, mood, and theme.",
    title: "Collections"
  });
  const {
    collections,
    error,
    isLoading: loading,
    retry
  } = usePublicCollections();
  const worldCollections = collections.filter(
    (collection) =>
      collection.theme === "fractureverse" || collection.theme === "eldoria"
  );
  const archiveCollections = collections.filter(
    (collection) =>
      !worldCollections.some((entry) => entry.id === collection.id)
  );
  const atlasSummary = loading
    ? "Loading collections..."
    : `${worldCollections.length} story worlds / ${archiveCollections.length} other collections / ${collections.length} total`;

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <div className="collection-index-hero-grid">
          <div>
            <p className="eyebrow">Collections</p>
            <h1>Browse by world, mood, and theme.</h1>
            <p className="hero-copy">
              Collections group songs that belong together, whether they share a
              story world, a feeling, or the same emotional language.
            </p>
          </div>
          <div className="hero-note-card collection-index-note-card">
            <p className="note-label">Where To Begin</p>
            <h2>Start with a story world, or follow a feeling.</h2>
            <p>
              Choose Fractureverse or Eldoria when you want atmosphere and
              story. Choose another collection when you want a mood, theme, or
              kind of song.
            </p>
            <div className="collection-meta-row">
              <span className="meta-badge">
                {loading ? "..." : `${worldCollections.length} story worlds`}
              </span>
              <span className="meta-badge subtle-badge">
                {loading ? "..." : `${archiveCollections.length} collections`}
              </span>
            </div>
            <p className="collection-index-summary">{atlasSummary}</p>
          </div>
        </div>
      </header>

      <main className="content-grid">
        {error ? (
          <PublicErrorState
            message={error.message}
            onRetry={retry}
            title="Collections could not load"
          />
        ) : loading && !collections.length ? (
          <PublicLoadingState
            message="Worlds and shelves are being requested from the API."
            title="Loading collections"
          />
        ) : null}

        <section className="collection-index-section">
          <div className="section-head">
            <h2>Story Worlds</h2>
            <span>
              {loading ? "Loading..." : `${collections.length} collections`}
            </span>
          </div>
          <p className="results-context-copy">
            Start here if you want songs that feel like they belong to a larger
            world.
          </p>
          {collections.length === 0 && !loading ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Collections Yet</p>
              <h3>The archive is still taking shape.</h3>
              <p>Collections will appear here as soon as they are added.</p>
            </section>
          ) : (
            <div className="collection-grid collection-index-grid">
              {loading && !worldCollections.length ? (
                <PublicSkeletonGrid
                  count={2}
                  label="Loading world collections"
                />
              ) : (
                worldCollections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    showFeatured
                  />
                ))
              )}
            </div>
          )}
        </section>

        {archiveCollections.length ? (
          <section className="collection-index-section">
            <div className="section-head">
              <h2>Collections</h2>
              <span>Browse by feeling</span>
            </div>
            <p className="results-context-copy">
              These groups are for browsing by mood, subject, genre color, or
              emotional thread.
            </p>
            <div className="collection-grid collection-index-grid">
              {archiveCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  showFeatured
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
