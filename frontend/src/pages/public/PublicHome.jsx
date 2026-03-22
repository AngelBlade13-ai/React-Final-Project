import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReleaseMedia from "../../components/ReleaseMedia";
import { CollectionCard, ReleaseCard } from "../../components/cards";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatPostDate, normalizeTitle } from "../../lib/formatters";
import { apiBaseUrl, hasVideo } from "../../lib/site";

export default function PublicHome({ onPlayTrack }) {
  useDocumentTitle("");
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const featuredPost = posts.find((post) => normalizeTitle(post.title) === "hopes song") || posts[0] || null;
  const latestPosts = featuredPost ? posts.filter((post) => post.id !== featuredPost.id) : posts;
  const featuredCollections = collections.slice(0, 3);

  useEffect(() => {
    async function loadHomeData() {
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
        console.error("Failed to load homepage data", error);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  return (
    <>
      <header className="hero homepage-hero">
        <div className="homepage-hero-grid">
          <div className="hero-copy-block">
            <p className="eyebrow">Suno Diary</p>
            <h1>A soft archive for releases, collections, and the stories that let each song keep breathing.</h1>
            <p className="hero-copy">
              Browse curated groupings, move through release notes with more context, and treat the site less like a
              feed and more like a small world of connected songs.
            </p>
            <div className="hero-links-row">
              {featuredPost ? (
                <button className="hero-link" onClick={() => onPlayTrack(featuredPost)} type="button">
                  Play Featured Release
                </button>
              ) : null}
              <a className="hero-link secondary-link" href="#latest-releases">
                Jump to Latest Releases
              </a>
            </div>
          </div>

          <div className="hero-note-card">
            <p className="note-label">What Changed</p>
            <h2>Discovery is part of the identity now, not just a homepage feed.</h2>
            <p>
              Collections organize releases into verses, moods, and projects. Explore lets you search by title and
              written notes. About frames the artist, the site, and the reason this archive exists.
            </p>
            <div className="hero-note-stats">
              <span className="meta-badge">{loading ? "..." : `${posts.length} releases`}</span>
              <span className="meta-badge subtle-badge">{loading ? "..." : `${collections.length} curated paths`}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="home-transition-grid">
          <article className="intro-card homepage-panel transition-card">
            <p className="eyebrow">Browse</p>
            <h2>Move through the archive by collection instead of only by chronology.</h2>
            <p>
              Collections turn the catalog into verses, projects, moods, and small emotional shelves rather than one
              uninterrupted stream.
            </p>
            <Link className="card-link" to="/collections">
              See the collection shelves
            </Link>
          </article>
          <article className="intro-card homepage-panel transition-card">
            <p className="eyebrow">Find</p>
            <h2>Search inside release notes, titles, and lyrics when you know the feeling but not the page.</h2>
            <p>
              The explore view is built for rediscovery: search by phrase, narrow by collection, and jump straight into
              the release that fits.
            </p>
            <Link className="card-link" to="/explore">
              Open explore
            </Link>
          </article>
        </section>

        <section className="intro-card homepage-panel">
          <p className="eyebrow">Site Identity</p>
          <h2>A personal home for releases, track stories, and the discovery paths between them</h2>
          <p>
            Each page still keeps the music close, but now the archive has a stronger structure: releases can live in
            more than one collection, search can surface them by title or text, and the site has space to explain the
            artist voice behind the catalog.
          </p>
          <p className="identity-line">A collection of songs, stories, and moments in motion.</p>
        </section>

        {featuredPost ? (
          <section className="featured-release-section">
            <div className="section-head">
              <h2>Featured Release</h2>
              <span>Now Playing</span>
            </div>
            <Link className="featured-release-link" to={`/release/${featuredPost.slug}`}>
              <article className="intro-card homepage-panel featured-release-card">
                <div className="featured-release-media">
                  <ReleaseMedia
                    className="featured-release-video"
                    compact
                    muted
                    text="The release note is live now. The video can be added later without taking the post down."
                    title={featuredPost.title}
                    videoUrl={featuredPost.videoUrl}
                  />
                  <div className="release-card-overlay" />
                  <div className="play-pill featured-play-pill">{hasVideo(featuredPost.videoUrl) ? "Featured" : "Video Pending"}</div>
                </div>
                <div className="featured-release-copy">
                  <p className="eyebrow">New Drop</p>
                  <h3>{featuredPost.title}</h3>
                  <p className="featured-release-intro">
                    A focused release entry with the song front and center, followed by the note behind it.
                  </p>
                  <p className="featured-release-excerpt">{featuredPost.excerpt}</p>
                  <p className="meta">{formatPostDate(featuredPost.createdAt)}</p>
                  <div className="tag-row">
                    {featuredPost.collections?.map((collection) => (
                      <Link className="collection-chip" key={collection.slug} to={`/collections/${collection.slug}`}>
                        {collection.title}
                      </Link>
                    ))}
                  </div>
                  <div className="featured-release-actions">
                    <button
                      className="secondary-button mini-player-trigger"
                      disabled={!hasVideo(featuredPost.videoUrl)}
                      onClick={(event) => {
                        event.preventDefault();
                        onPlayTrack(featuredPost);
                      }}
                      type="button"
                    >
                      {hasVideo(featuredPost.videoUrl) ? "Play in Mini Player" : "Video Pending"}
                    </button>
                    <span className="hero-link">Enter Release</span>
                  </div>
                </div>
              </article>
            </Link>
          </section>
        ) : null}

        <section>
          <div className="section-head">
            <h2>Collections</h2>
            <span>{loading ? "Loading..." : `${collections.length} curated paths`}</span>
          </div>
          <div className="collection-grid">
            {featuredCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </section>

        <section id="latest-releases">
          <div className="section-head">
            <h2>Latest Releases</h2>
            <span>{loading ? "Loading..." : `${latestPosts.length} releases`}</span>
          </div>
          {!loading && posts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Releases Yet</p>
              <h3>Something is coming.</h3>
              <p>No releases have been published yet. Check back soon for the first drop.</p>
            </section>
          ) : !loading && latestPosts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">More Soon</p>
              <h3>The featured release is live.</h3>
              <p>More songs will appear here as new releases are added.</p>
            </section>
          ) : (
            <div className="post-grid latest-release-grid">
              {latestPosts.map((post) => (
                <ReleaseCard key={post.id} onPlayTrack={onPlayTrack} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
