import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WorldThresholdLink from "../../components/WorldThresholdLink";
import ReleaseMedia from "../../components/ReleaseMedia";
import { CollectionCard, ReleaseCard } from "../../components/cards";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatPostDate } from "../../lib/formatters";
import {
  apiBaseUrl,
  emptySiteSettings,
  getHomepageCuratedPosts,
  getVisibleCollectionsForPost,
  hasVideo,
  sortCollectionsForPublicNavigation
} from "../../lib/site";

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
  const latestPosts = (featuredPost ? curatedPosts.filter((post) => post.id !== featuredPost.id) : curatedPosts).slice(0, 4);
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
              <a className="hero-link secondary-link" href="#home-doorways">
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
            <div className="home-hero-threshold-note">
              <strong>The threshold is curated.</strong>
              <p>Start with a release, enter a world, or choose a collection that acts like an authored path instead of a pile of posts.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="home-doorway-section" id="home-doorways">
          <div className="section-head">
            <h2>Choose a Doorway</h2>
            <span>Start here</span>
          </div>
          <div className="home-doorway-grid">
            {featuredPost ? (
              <Link className="home-doorway-link" to={`/release/${featuredPost.slug}`}>
                <article className="intro-card homepage-panel home-doorway-card home-doorway-featured">
                  <p className="eyebrow">Featured Release</p>
                  <h3>{featuredPost.title}</h3>
                  <p>{featuredPost.excerpt}</p>
                  <div className="home-doorway-footer">
                    <span className="home-doorway-stat">{formatPostDate(featuredPost.createdAt)}</span>
                    <span className="home-doorway-cta">
                      Enter release <span aria-hidden="true">-&gt;</span>
                    </span>
                  </div>
                </article>
              </Link>
            ) : null}

            {fractureverseCollection ? (
              <WorldThresholdLink className="home-doorway-link" theme="fractureverse" to={`/collections/${fractureverseCollection.slug}`}>
                <article className="intro-card homepage-panel home-doorway-card home-doorway-fractureverse">
                  <p className="eyebrow">World</p>
                  <h3>{fractureverseCollection.title}</h3>
                  <p>{fractureverseCollection.description}</p>
                  <div className="home-doorway-footer">
                    <span className="home-doorway-stat">{fractureverseCollection.releaseCount} fragments</span>
                    <span className="home-doorway-cta">
                      Enter world <span aria-hidden="true">-&gt;</span>
                    </span>
                  </div>
                </article>
              </WorldThresholdLink>
            ) : null}

            {eldoriaCollection ? (
              <WorldThresholdLink className="home-doorway-link" theme="eldoria" to={`/collections/${eldoriaCollection.slug}`}>
                <article className="intro-card homepage-panel home-doorway-card home-doorway-eldoria">
                  <p className="eyebrow">World</p>
                  <h3>{eldoriaCollection.title}</h3>
                  <p>{eldoriaCollection.description}</p>
                  <div className="home-doorway-footer">
                    <span className="home-doorway-stat">{eldoriaCollection.releaseCount} ballads</span>
                    <span className="home-doorway-cta">
                      Enter world <span aria-hidden="true">-&gt;</span>
                    </span>
                  </div>
                </article>
              </WorldThresholdLink>
            ) : null}

            <article className="intro-card homepage-panel home-doorway-card home-doorway-utility">
              <p className="eyebrow">{homeContent.browseEyebrow}</p>
              <h3>{homeContent.browseTitle}</h3>
              <p>{homeContent.browseText}</p>
              <p className="home-doorway-support">{homeContent.exploreText}</p>
              <div className="home-doorway-actions">
                <Link className="card-link" to="/collections">
                  {homeContent.browseLinkLabel}
                </Link>
                <Link className="secondary-link home-doorway-secondary-link" to="/paths">
                  Guided Paths
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className="intro-card homepage-panel home-identity-panel">
          <p className="eyebrow">{homeContent.identityEyebrow}</p>
          <h2>{homeContent.identityTitle}</h2>
          <p>{homeContent.identityText}</p>
          <p className="identity-line">{homeContent.identityLine}</p>
        </section>

        {featuredPost ? (
          <section className="featured-release-section" id="featured-release">
            <div className="section-head">
              <h2>Featured Release</h2>
              <span>Lead entry</span>
            </div>
            <article className="featured-release-link intro-card homepage-panel featured-release-card">
              <Link className="featured-release-surface" to={`/release/${featuredPost.slug}`}>
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
              </Link>
              <div className="featured-release-copy">
                <p className="eyebrow">Threshold Lead</p>
                <h3>
                  <Link className="card-title-link" to={`/release/${featuredPost.slug}`}>
                    {featuredPost.title}
                  </Link>
                </h3>
                <p className="featured-release-intro">
                  Start with the release itself, then let the archive widen from there into worlds, versions, and collections.
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
                    onClick={() => onPlayTrack(featuredPost)}
                    type="button"
                  >
                    {hasVideo(featuredPost.videoUrl) ? "Play in Mini Player" : "Video Pending"}
                  </button>
                  <Link className="hero-link" to={`/release/${featuredPost.slug}`}>
                    Enter Release
                  </Link>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        <section>
          <div className="section-head">
            <h2>Begin With a Collection</h2>
            <span>{loading ? "Loading..." : `${featuredCollections.length} curated entries`}</span>
          </div>
          <div className="collection-grid collection-index-grid">
            {featuredCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </section>

        <section id="latest-releases">
          <div className="section-head">
            <h2>Latest at the Threshold</h2>
            <span>{loading ? "Loading..." : `${latestPosts.length} recent selections`}</span>
          </div>
          {!loading && posts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Releases Yet</p>
              <h3>Something is coming.</h3>
              <p>No releases have been published yet. Check back soon for the first threshold entry.</p>
            </section>
          ) : !loading && latestPosts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">More Soon</p>
              <h3>The lead release is live.</h3>
              <p>Additional curated entries will appear here as the archive expands.</p>
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
