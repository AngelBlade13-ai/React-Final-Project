import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WorldThresholdLink from "../../components/WorldThresholdLink";
import ReleaseMedia from "../../components/ReleaseMedia";
import { CollectionCard, ReleaseCard } from "../../components/cards";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatPostDate } from "../../lib/formatters";
import { apiBaseUrl, emptySiteSettings, getHomepageCuratedPosts, getVisibleCollectionsForPost, hasVideo, sortCollectionsForPublicNavigation } from "../../lib/site";

export default function PublicHome({ onPlayTrack, siteContent }) {
  useDocumentTitle("");
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const homeContent = {
    ...emptySiteSettings.home,
    ...(siteContent?.home || {})
  };
  const curatedPosts = getHomepageCuratedPosts(posts);
  const manuallyFeaturedPost =
    posts.find((post) => post.slug === homeContent.featuredReleaseSlug) ||
    curatedPosts.find((post) => post.slug === homeContent.featuredReleaseSlug) ||
    null;
  const featuredPost = manuallyFeaturedPost || curatedPosts[0] || null;
  const latestPosts = (featuredPost ? curatedPosts.filter((post) => post.id !== featuredPost.id) : curatedPosts).slice(0, 15);
  const featuredCollections = sortCollectionsForPublicNavigation(collections).slice(0, 4);
  const featuredPostCollections = getVisibleCollectionsForPost(featuredPost);
  const fractureverseCollection = collections.find((collection) => collection.slug === "fractureverse") || null;
  const eldoriaCollection = collections.find((collection) => collection.slug === "eldoria") || null;

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
            <p className="eyebrow">{homeContent.heroEyebrow}</p>
            <h1>{homeContent.heroTitle}</h1>
            <p className="hero-copy">{homeContent.heroText}</p>
            <div className="hero-links-row">
              {featuredPost ? (
                <button className="hero-link" onClick={() => onPlayTrack(featuredPost)} type="button">
                  {homeContent.featuredCtaLabel}
                </button>
              ) : null}
              <a className="hero-link secondary-link" href="#latest-releases">
                {homeContent.jumpCtaLabel}
              </a>
            </div>
          </div>

          <div className="hero-note-card">
            <p className="note-label">{homeContent.noteEyebrow}</p>
            <h2>{homeContent.noteTitle}</h2>
            <p>{homeContent.noteText}</p>
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
            <p className="eyebrow">{homeContent.browseEyebrow}</p>
            <h2>{homeContent.browseTitle}</h2>
            <p>{homeContent.browseText}</p>
            <Link className="card-link" to="/collections">
              {homeContent.browseLinkLabel}
            </Link>
          </article>
          <article className="intro-card homepage-panel transition-card">
            <p className="eyebrow">{homeContent.exploreEyebrow}</p>
            <h2>{homeContent.exploreTitle}</h2>
            <p>{homeContent.exploreText}</p>
            <Link className="card-link" to="/explore">
              {homeContent.exploreLinkLabel}
            </Link>
          </article>
        </section>

        <section className="intro-card homepage-panel">
          <p className="eyebrow">{homeContent.identityEyebrow}</p>
          <h2>{homeContent.identityTitle}</h2>
          <p>{homeContent.identityText}</p>
          <p className="identity-line">{homeContent.identityLine}</p>
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
                    {featuredPostCollections.map((collection) => (
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

        {fractureverseCollection || eldoriaCollection ? (
          <section className="world-portal-section">
            <div className="section-head world-portal-head">
              <h2>Enter a World</h2>
              <span>Thresholds</span>
            </div>
            <p className="world-portal-intro">
              Some stories are not meant to be browsed.
              <br />
              They are meant to be stepped into.
            </p>
            <div className="world-portal-grid">
              {fractureverseCollection ? (
                <WorldThresholdLink className="world-portal-link" theme="fractureverse" to={`/collections/${fractureverseCollection.slug}`}>
                  <article className="intro-card homepage-panel world-portal-card world-portal-card-fractureverse">
                    <div className="world-portal-topline">
                      <p className="eyebrow">World</p>
                      <span className="meta-badge subtle-badge">{fractureverseCollection.releaseCount} fragments</span>
                    </div>
                    <h3>{fractureverseCollection.title}</h3>
                    <p>{fractureverseCollection.description}</p>
                    <div className="world-portal-footer">
                      <span className="world-portal-hint">Instability detected</span>
                      <span className="world-portal-cta">
                        Enter <span aria-hidden="true">-&gt;</span>
                      </span>
                    </div>
                  </article>
                </WorldThresholdLink>
              ) : null}
              {eldoriaCollection ? (
                <WorldThresholdLink className="world-portal-link" theme="eldoria" to={`/collections/${eldoriaCollection.slug}`}>
                  <article className="intro-card homepage-panel world-portal-card world-portal-card-eldoria">
                    <div className="world-portal-topline">
                      <p className="eyebrow">World</p>
                      <span className="meta-badge subtle-badge">{eldoriaCollection.releaseCount} ballads</span>
                    </div>
                    <h3>{eldoriaCollection.title}</h3>
                    <p>{eldoriaCollection.description}</p>
                    <div className="world-portal-footer">
                      <span className="world-portal-hint">The sigil is awake</span>
                      <span className="world-portal-cta">
                        Enter <span aria-hidden="true">-&gt;</span>
                      </span>
                    </div>
                  </article>
                </WorldThresholdLink>
              ) : null}
            </div>
          </section>
        ) : null}

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
              {latestPosts.map((post, index) => (
                <ReleaseCard emphasis={index < 2} key={post.id} onPlayTrack={onPlayTrack} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
