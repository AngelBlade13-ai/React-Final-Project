import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ReleaseCard } from "../../components/cards";
import { usePublicCollections, usePublicPosts } from "../../hooks/usePublicApi";
import usePageMetadata from "../../hooks/usePageMetadata";
import {
  getReleaseStatus,
  partitionCollectionsForExplore
} from "../../lib/site";

const DEFAULT_COLLECTION_FILTER = "all";
const DEFAULT_STATUS_FILTER = "public";
const STATUS_FILTERS = [
  { key: "public", label: "Public surface" },
  { key: "canon", label: "Canon only" },
  { key: "alternate", label: "Alternates" },
  { key: "working", label: "Working versions" },
  { key: "all", label: "All statuses" }
];
const VALID_STATUS_FILTERS = new Set(STATUS_FILTERS.map((option) => option.key));

export default function ExplorePage({ onPlayTrack }) {
  usePageMetadata({
    description:
      "Search releases, collections, and lyrical fragments across the archive.",
    title: "Explore"
  });
  const { posts, isLoading: postsLoading } = usePublicPosts();
  const { collections, isLoading: collectionsLoading } =
    usePublicCollections("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [showInternalCollections, setShowInternalCollections] = useState(false);
  const loading = postsLoading || collectionsLoading;
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const queryParam = searchParams.get("q") || "";
  const requestedCollection =
    searchParams.get("collection") || DEFAULT_COLLECTION_FILTER;
  const requestedStatus =
    searchParams.get("status") || DEFAULT_STATUS_FILTER;
  const selectedCollection =
    requestedCollection === DEFAULT_COLLECTION_FILTER ||
    collections.some((collection) => collection.slug === requestedCollection)
      ? requestedCollection
      : DEFAULT_COLLECTION_FILTER;
  const selectedStatus = VALID_STATUS_FILTERS.has(requestedStatus)
    ? requestedStatus
    : DEFAULT_STATUS_FILTER;

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  function updateSearchState(nextState) {
    const nextQuery = Object.prototype.hasOwnProperty.call(nextState, "query")
      ? nextState.query
      : query;
    const nextCollection =
      nextState.collection || selectedCollection;
    const nextStatus = nextState.status || selectedStatus;
    const nextParams = new URLSearchParams();
    const trimmedQuery = String(nextQuery || "").trim();

    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    }

    if (nextCollection !== DEFAULT_COLLECTION_FILTER) {
      nextParams.set("collection", nextCollection);
    }

    if (nextStatus !== DEFAULT_STATUS_FILTER) {
      nextParams.set("status", nextStatus);
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
    const releaseStatus = getReleaseStatus(post);
    const matchesReleaseStatus =
      selectedStatus === "all"
        ? true
        : selectedStatus === DEFAULT_STATUS_FILTER
          ? releaseStatus !== "working"
          : releaseStatus === selectedStatus;

    return matchesCollection && matchesQuery && matchesReleaseStatus;
  });
  const { primaryCollections, internalCollections } =
    partitionCollectionsForExplore(collections);
  const selectedCollectionTitle =
    selectedCollection === DEFAULT_COLLECTION_FILTER
      ? "All collections"
      : collections.find(
          (collection) => collection.slug === selectedCollection
        )?.title || "Filtered";
  const selectedStatusLabel =
    STATUS_FILTERS.find((option) => option.key === selectedStatus)?.label ||
    "Public surface";
  const statusCounts = {
    public: posts.filter((post) => getReleaseStatus(post) !== "working").length,
    canon: posts.filter((post) => getReleaseStatus(post) === "canon").length,
    alternate: posts.filter((post) => getReleaseStatus(post) === "alternate").length,
    working: posts.filter((post) => getReleaseStatus(post) === "working").length,
    all: posts.length
  };
  const hasActiveFilters =
    Boolean(query.trim()) ||
    selectedCollection !== DEFAULT_COLLECTION_FILTER ||
    selectedStatus !== DEFAULT_STATUS_FILTER;

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
              <span className="meta-badge subtle-badge">
                {selectedStatusLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="content-grid">
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
                    collection: DEFAULT_COLLECTION_FILTER,
                    status: DEFAULT_STATUS_FILTER
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
          <div className="filter-field">
            <p className="eyebrow">Filter By Release Status</p>
            <div className="filter-chip-row">
              {STATUS_FILTERS.map((option) => (
                <button
                  className={`filter-chip${selectedStatus === option.key ? " active" : ""}`}
                  key={option.key}
                  onClick={() => updateSearchState({ status: option.key })}
                  type="button"
                >
                  {option.label} ({statusCounts[option.key]})
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Results</h2>
            <span>
              {loading ? "Loading..." : `${filteredPosts.length} matches`}
            </span>
          </div>

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
              {filteredPosts.map((post) => (
                <ReleaseCard
                  key={post.id}
                  layout="horizontal"
                  onPlayTrack={onPlayTrack}
                  post={post}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
