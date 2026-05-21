import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
    description:
      "Search releases, collections, and lyrical fragments across the archive.",
    title: "Explore"
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
    const nextCollection =
      nextState.collection || selectedCollection;
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
      : collections.find(
          (collection) => collection.slug === selectedCollection
        )?.title || "Filtered";
  const hasActiveFilters =
    Boolean(query.trim()) ||
    selectedCollection !== DEFAULT_COLLECTION_FILTER;
  const utilitySignals = [
    {
      label: "Current lane",
      value: selectedCollectionTitle
    },
    {
      label: "Catalog surface",
      value: `${posts.length} public songs`
    },
    {
      label: "Search phrase",
      value: query.trim() || "Browsing broadly"
    }
  ];
  const resultsLaneSummary = hasActiveFilters
    ? `${selectedCollectionTitle} / ${filteredPosts.length} matches`
    : `${filteredPosts.length} releases across the broad archive`;

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <div className="explore-hero-grid">
          <div>
            <p className="eyebrow">Explore</p>
            <h1>Search the archive by title, release notes, and collection.</h1>
            <p className="hero-copy">
              Explore is the utility layer of the site: search by phrase, switch
              lanes with collection filters, and move from loose memory to the
              exact release page you wanted.
            </p>
          </div>
          <div className="hero-note-card explore-summary-card">
            <p className="note-label">Search Surface</p>
            <h2>Use phrase first, filters second.</h2>
            <p>
              Explore works best when you begin with a lyric fragment, title
              memory, or release note phrase, then narrow the archive only if
              the first pass is too wide.
            </p>
            <label className="search-field">
              Find a release
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
            title="Explore could not reach the archive"
          />
        ) : loading && !posts.length && !collections.length ? (
          <PublicLoadingState
            message="Search data is loading before filters can be applied."
            title="Preparing search"
          />
        ) : null}

        <section className="intro-card homepage-panel explore-toolbar">
          <div className="section-head">
            <h2>Refine Results</h2>
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
              <span>Shareable URL state</span>
            )}
          </div>
          <div className="filter-field">
            <p className="eyebrow">Filter By Collection</p>
            <p className="filter-field-copy">
              Keep the search wide, or step into a specific world or shelf once
              you know the lane you want.
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

        <section className="explore-utility-board">
          {utilitySignals.map((signal) => (
            <article className="explore-utility-card" key={signal.label}>
              <p className="eyebrow">{signal.label}</p>
              <strong>{signal.value}</strong>
            </article>
          ))}
        </section>

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
              ? "This result set is already narrowed. Clear filters if you want to move back to a wider discovery view."
              : "This is the broad discovery surface. Start with a phrase, then narrow only when the archive gets too wide."}
          </p>

          {!loading && filteredPosts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Matches</p>
              <h3>Nothing lines up with that search yet.</h3>
              <p>
                Try a broader phrase or switch the collection filter back to all
                collections.
              </p>
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
