import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PublicErrorState,
  PublicLoadingState,
  PublicSkeletonGrid
} from "../../components/PublicDataState";
import { ReleaseCard } from "../../components/cards";
import { usePublicCollections, usePublicPosts } from "../../hooks/usePublicApi";
import usePageMetadata from "../../hooks/usePageMetadata";
import { partitionCollectionsForExplore } from "../../lib/site";

const DEFAULT_COLLECTION_FILTER = "all";

export default function ExplorePage({ onPlayTrack }) {
  usePageMetadata({
    description: "Search songs, lyrics, notes, moods, and collections.",
    title: "Search"
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [showInternalCollections, setShowInternalCollections] = useState(false);
  const loading = postsLoading || collectionsLoading;
  const loadError = postsError || collectionsError;
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const queryParam = searchParams.get("q") || "";
  const requestedCollection =
    searchParams.get("collection") || DEFAULT_COLLECTION_FILTER;
  const selectedCollection =
    requestedCollection === DEFAULT_COLLECTION_FILTER ||
    collections.some((collection) => collection.slug === requestedCollection)
      ? requestedCollection
      : DEFAULT_COLLECTION_FILTER;

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  function updateSearchState(nextState) {
    const nextQuery = Object.prototype.hasOwnProperty.call(nextState, "query")
      ? nextState.query
      : query;
    const nextCollection = nextState.collection || selectedCollection;
    const nextParams = new URLSearchParams();
    const trimmedQuery = String(nextQuery || "").trim();

    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    }

    if (nextCollection !== DEFAULT_COLLECTION_FILTER) {
      nextParams.set("collection", nextCollection);
    }

    startTransition(() => {
      setSearchParams(nextParams, { replace: true });
    });
  }

  const filteredPosts = posts.filter((post) => {
    const matchesCollection =
      selectedCollection === DEFAULT_COLLECTION_FILTER ||
      (post.collectionSlugs || []).includes(selectedCollection);
    const searchHaystack = [post.title, post.excerpt, post.content, post.lyrics]
      .join(" ")
      .toLowerCase();
    const matchesQuery =
      !normalizedQuery || searchHaystack.includes(normalizedQuery);

    return matchesCollection && matchesQuery;
  });
  const { primaryCollections, internalCollections } =
    partitionCollectionsForExplore(collections);
  const selectedCollectionTitle =
    selectedCollection === DEFAULT_COLLECTION_FILTER
      ? "All collections"
      : collections.find((collection) => collection.slug === selectedCollection)
          ?.title || "Filtered";
  const hasActiveFilters =
    Boolean(query.trim()) || selectedCollection !== DEFAULT_COLLECTION_FILTER;
  const resultsLaneSummary = hasActiveFilters
    ? `${selectedCollectionTitle} / ${filteredPosts.length} matches`
    : `${filteredPosts.length} songs across the archive`;

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <div className="explore-hero-grid">
          <div>
            <p className="eyebrow">Search</p>
            <h1>Search the songs.</h1>
            <p className="hero-copy">
              Type a title, lyric, mood, or phrase you remember. Use collections
              when you want to narrow the list.
            </p>
          </div>
          <div className="hero-note-card explore-summary-card">
            <p className="note-label">Search</p>
            <h2>Use phrase first, filters second.</h2>
            <p>
              Search works best when you begin with a lyric fragment, title,
              mood, or phrase, then narrow by collection only if the first pass
              is too wide.
            </p>
            <label className="search-field">
              Find a song
              <input
                className="explore-search-input"
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setQuery(nextQuery);
                  updateSearchState({ query: nextQuery });
                }}
                placeholder="Search titles, notes, lyrics, and excerpts"
                type="search"
                value={query}
              />
            </label>
            <div className="collection-meta-row">
              <span className="meta-badge">
                {loading ? "..." : `${filteredPosts.length} matches`}
              </span>
              <span className="meta-badge subtle-badge">
                {selectedCollectionTitle}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="content-grid">
        {loadError ? (
          <PublicErrorState
            message={loadError.message}
            onRetry={() => {
              retryPosts();
              retryCollections();
            }}
            title="Search could not load"
          />
        ) : loading && !posts.length && !collections.length ? (
          <PublicLoadingState
            message="Search data is loading before filters can be applied."
            title="Preparing search"
          />
        ) : null}

        <section className="intro-card homepage-panel explore-toolbar">
          <div className="section-head">
            <h2>Narrow The List</h2>
            {hasActiveFilters ? (
              <button
                className="secondary-button"
                onClick={() => {
                  setQuery("");
                  updateSearchState({
                    query: "",
                    collection: DEFAULT_COLLECTION_FILTER
                  });
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : (
              <span>Shareable search link</span>
            )}
          </div>
          <div className="filter-field">
            <p className="eyebrow">Filter By Collection</p>
            <p className="filter-field-copy">
              Keep the search wide, or step into a specific collection once you
              know the kind of song you want.
            </p>
            <div className="filter-chip-row">
              <button
                className={`filter-chip${selectedCollection === DEFAULT_COLLECTION_FILTER ? " active" : ""}`}
                onClick={() =>
                  updateSearchState({ collection: DEFAULT_COLLECTION_FILTER })
                }
                type="button"
              >
                All collections
              </button>
              {primaryCollections.map((collection) => (
                <button
                  className={`filter-chip${selectedCollection === collection.slug ? " active" : ""}`}
                  key={collection.id}
                  onClick={() =>
                    updateSearchState({ collection: collection.slug })
                  }
                  type="button"
                >
                  {collection.title}
                </button>
              ))}
            </div>
            {internalCollections.length ? (
              <details
                className="archive-link-picker"
                open={showInternalCollections}
              >
                <summary
                  onClick={(event) => {
                    event.preventDefault();
                    setShowInternalCollections((current) => !current);
                  }}
                >
                  More Filters
                </summary>
                {showInternalCollections ? (
                  <div className="filter-chip-row">
                    {internalCollections.map((collection) => (
                      <button
                        className={`filter-chip${selectedCollection === collection.slug ? " active" : ""}`}
                        key={collection.id}
                        onClick={() =>
                          updateSearchState({ collection: collection.slug })
                        }
                        type="button"
                      >
                        {collection.title}
                      </button>
                    ))}
                  </div>
                ) : null}
              </details>
            ) : null}
          </div>
        </section>

        {hasActiveFilters ? (
          <section
            className="explore-filter-summary"
            aria-label="Active filters"
          >
            <p className="results-context-copy">
              {selectedCollectionTitle}
              {query.trim() ? ` · “${query.trim()}”` : ""} ·{" "}
              {filteredPosts.length}{" "}
              {filteredPosts.length === 1 ? "match" : "matches"}
            </p>
          </section>
        ) : null}

        <section>
          <div className="section-head">
            <h2>Results</h2>
            <span>
              {loading ? "Loading..." : `${filteredPosts.length} matches`}
            </span>
          </div>
          <p className="results-lane-summary">{resultsLaneSummary}</p>
          <p className="results-context-copy">
            {hasActiveFilters
              ? "This list is already narrowed. Clear filters if you want a wider search again."
              : "Start with a phrase, then narrow by collection only when there are too many matches."}
          </p>

          {!loading && filteredPosts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Matches</p>
              <h3>Nothing lines up with that search yet.</h3>
              <p>
                Try a broader phrase or switch the collection filter back to all
                collections.
              </p>
              <div className="hero-links-row">
                <Link className="hero-link" to="/paths/start-here">
                  Start Here path
                </Link>
                <Link className="hero-link secondary-link" to="/collections">
                  Browse collections
                </Link>
              </div>
            </section>
          ) : (
            <div className="results-grid">
              {loading && !filteredPosts.length ? (
                <PublicSkeletonGrid count={6} label="Loading search results" />
              ) : (
                filteredPosts.map((post) => (
                  <ReleaseCard
                    key={post.id}
                    layout="horizontal"
                    onPlayTrack={onPlayTrack}
                    post={post}
                  />
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
