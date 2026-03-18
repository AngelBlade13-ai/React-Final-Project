import { useDeferredValue, useEffect, useState } from "react";
import { ReleaseCard } from "../../components/cards/ArchiveCards";
import { apiBaseUrl } from "../../lib/site";

export default function ExplorePage({ onPlayTrack }) {
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [loading, setLoading] = useState(true);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  useEffect(() => {
    async function loadExploreData() {
      try {
        const [postsResponse, collectionsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/posts`),
          fetch(`${apiBaseUrl}/collections`)
        ]);
        const postsData = await postsResponse.json();
        const collectionsData = await collectionsResponse.json();
        setPosts(postsData.posts || []);
        setCollections(collectionsData.collections || []);
      } catch (error) {
        console.error("Failed to load explore data", error);
      } finally {
        setLoading(false);
      }
    }

    loadExploreData();
  }, []);

  const filteredPosts = posts.filter((post) => {
    const matchesCollection =
      selectedCollection === "all" || (post.collectionSlugs || []).includes(selectedCollection);
    const searchHaystack = [post.title, post.excerpt, post.content, post.lyrics].join(" ").toLowerCase();
    const matchesQuery = !normalizedQuery || searchHaystack.includes(normalizedQuery);

    return matchesCollection && matchesQuery;
  });

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <div className="explore-hero-grid">
          <div>
            <p className="eyebrow">Explore</p>
            <h1>Search the archive by title, release notes, and collection.</h1>
            <p className="hero-copy">
              Explore is the utility layer of the site: search by phrase, switch lanes with collection filters, and
              move from loose memory to the exact release page you wanted.
            </p>
          </div>
          <div className="hero-note-card explore-summary-card">
            <p className="note-label">Search Surface</p>
            <label className="search-field">
              Find a release
              <input
                className="explore-search-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, notes, lyrics, and excerpts"
                type="search"
                value={query}
              />
            </label>
            <div className="collection-meta-row">
              <span className="meta-badge">{loading ? "..." : `${filteredPosts.length} matches`}</span>
              <span className="meta-badge subtle-badge">
                {selectedCollection === "all"
                  ? "All collections"
                  : collections.find((collection) => collection.slug === selectedCollection)?.title || "Filtered"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="intro-card homepage-panel explore-toolbar">
          <div className="filter-field">
            <p className="eyebrow">Filter By Collection</p>
            <div className="filter-chip-row">
              <button
                className={`filter-chip${selectedCollection === "all" ? " active" : ""}`}
                onClick={() => setSelectedCollection("all")}
                type="button"
              >
                All collections
              </button>
              {collections.map((collection) => (
                <button
                  className={`filter-chip${selectedCollection === collection.slug ? " active" : ""}`}
                  key={collection.id}
                  onClick={() => setSelectedCollection(collection.slug)}
                  type="button"
                >
                  {collection.title}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Results</h2>
            <span>{loading ? "Loading..." : `${filteredPosts.length} matches`}</span>
          </div>

          {!loading && filteredPosts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Matches</p>
              <h3>Nothing lines up with that search yet.</h3>
              <p>Try a broader phrase or switch the collection filter back to all collections.</p>
            </section>
          ) : (
            <div className="results-grid">
              {filteredPosts.map((post) => (
                <ReleaseCard key={post.id} layout="horizontal" onPlayTrack={onPlayTrack} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
