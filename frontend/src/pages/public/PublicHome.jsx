import { Link } from "react-router-dom";
import {
  PublicErrorState,
  PublicLoadingState,
  PublicSkeletonGrid
} from "../../components/PublicDataState";
import WorldThresholdLink from "../../components/WorldThresholdLink";
import ReleaseMedia from "../../components/ReleaseMedia";
import { CollectionCard, ReleaseCard } from "../../components/cards";
import { usePublicCollections, usePublicPosts } from "../../hooks/usePublicApi";
import usePageMetadata from "../../hooks/usePageMetadata";
import { formatPostDate } from "../../lib/formatters";
import {
  emptySiteSettings,
  getHomepageCuratedPosts,
  getPlaybackStateCopy,
  getVisibleCollectionsForPost,
  sortCollectionsForPublicNavigation
} from "../../lib/site";

export default function PublicHome({ onPlayTrack, siteContent }) {
  const homeContent = {
    ...emptySiteSettings.home,
    ...(siteContent?.home || {})
  };
  usePageMetadata({
    description: homeContent.heroText,
    title: ""
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
  } = usePublicCollections();
  const loading = postsLoading || collectionsLoading;
  const loadError = postsError || collectionsError;
  const curatedPosts = getHomepageCuratedPosts(posts);
  const manuallyFeaturedPost =
    posts.find((post) => post.slug === homeContent.featuredReleaseSlug) ||
    curatedPosts.find(
      (post) => post.slug === homeContent.featuredReleaseSlug
    ) ||
    null;
  const featuredPost = manuallyFeaturedPost || curatedPosts[0] || null;
  const latestPosts = (
    featuredPost
      ? curatedPosts.filter((post) => post.id !== featuredPost.id)
      : curatedPosts
  ).slice(0, 4);
  const homepageSelectionPosts = curatedPosts
    .filter(
      (post) =>
        post.id !== featuredPost?.id &&
        !latestPosts.some((latestPost) => latestPost.id === post.id)
    )
    .slice(0, 6);
  const featuredCollections = sortCollectionsForPublicNavigation(
    collections
  ).slice(0, 4);
  const featuredPostCollections = getVisibleCollectionsForPost(featuredPost);
  const featuredPlaybackCopy = getPlaybackStateCopy(featuredPost);
  const fractureverseCollection =
    collections.find((collection) => collection.slug === "fractureverse") ||
    null;
  const eldoriaCollection =
    collections.find((collection) => collection.slug === "eldoria") || null;

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
                <button
                  className="hero-link"
                  onClick={() => onPlayTrack(featuredPost)}
                  type="button"
                >
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
              <span className="meta-badge">
                {loading ? "..." : `${posts.length} songs`}
              </span>
              <span className="meta-badge subtle-badge">
                {loading ? "..." : `${collections.length} collections`}
              </span>
            </div>
            <div className="home-hero-threshold-note">
              <strong>Start where the feeling pulls you.</strong>
              <p>
                Play a song, enter a story world, or follow a listening path
                when you want the next step chosen for you.
              </p>
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
            title="The public archive could not load"
          />
        ) : loading && !posts.length && !collections.length ? (
          <PublicLoadingState
            message="Songs and collections are being loaded."
            title="Opening the archive"
          />
        ) : null}

        <section className="home-doorway-section" id="home-doorways">
          <div className="section-head">
            <h2>Choose a Doorway</h2>
            <span>Start here</span>
          </div>
          <div className="home-doorway-grid">
            <Link className="home-doorway-link" to="/paths">
              <article className="intro-card homepage-panel home-doorway-card home-doorway-guided">
                <p className="eyebrow">Listening Paths</p>
                <h3>Choose by feeling, not chronology.</h3>
                <p>
                  Follow a curated route through the archive when you want the
                  next song chosen by mood, world, or emotional thread.
                </p>
                <div className="home-doorway-footer">
                  <span className="home-doorway-stat">Curated routes</span>
                  <span className="home-doorway-cta">
                    Browse paths <span aria-hidden="true">-&gt;</span>
                  </span>
                </div>
              </article>
            </Link>

            {fractureverseCollection ? (
              <WorldThresholdLink
                className="home-doorway-link"
                theme="fractureverse"
                to={`/collections/${fractureverseCollection.slug}`}
              >
                <article className="intro-card homepage-panel home-doorway-card home-doorway-fractureverse">
                  <p className="eyebrow">World</p>
                  <h3>{fractureverseCollection.title}</h3>
                  <p>{fractureverseCollection.description}</p>
                  <div className="home-doorway-footer">
                    <span className="home-doorway-stat">
                      {fractureverseCollection.releaseCount} fragments
                    </span>
                    <span className="home-doorway-cta">
                      Enter world <span aria-hidden="true">-&gt;</span>
                    </span>
                  </div>
                </article>
              </WorldThresholdLink>
            ) : null}

            {eldoriaCollection ? (
              <WorldThresholdLink
                className="home-doorway-link"
                theme="eldoria"
                to={`/collections/${eldoriaCollection.slug}`}
              >
                <article className="intro-card homepage-panel home-doorway-card home-doorway-eldoria">
                  <p className="eyebrow">World</p>
                  <h3>{eldoriaCollection.title}</h3>
                  <p>{eldoriaCollection.description}</p>
                  <div className="home-doorway-footer">
                    <span className="home-doorway-stat">
                      {eldoriaCollection.releaseCount} ballads
                    </span>
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
              <div className="home-doorway-copy">
                <p>{homeContent.browseText}</p>
                <p className="home-doorway-support">
                  {homeContent.exploreText}
                </p>
              </div>
              <div className="home-doorway-actions">
                <Link className="card-link" to="/collections">
                  {homeContent.browseLinkLabel}
                </Link>
                <Link
                  className="secondary-link home-doorway-secondary-link"
                  to="/paths"
                >
                  Listening Paths
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
              <h2>Featured Song</h2>
              <span>Start here</span>
            </div>
            <article className="featured-release-link intro-card homepage-panel featured-release-card">
              <Link
                className="featured-release-surface"
                to={`/release/${featuredPost.slug}`}
              >
                <div className="featured-release-media">
                  <ReleaseMedia
                    className="featured-release-video"
                    compact
                    eyebrow={featuredPlaybackCopy.mediaEyebrow}
                    muted
                    text={featuredPlaybackCopy.mediaText}
                    title={featuredPost.title}
                    videoUrl={featuredPost.videoUrl}
                  />
                  <div className="release-card-overlay" />
                  <div className="play-pill featured-play-pill">
                    {featuredPlaybackCopy.playable
                      ? "Featured"
                      : featuredPlaybackCopy.pillLabel}
                  </div>
                </div>
              </Link>
              <div className="featured-release-copy">
                <p className="eyebrow">Featured Song</p>
                <h3>
                  <Link
                    className="card-title-link"
                    to={`/release/${featuredPost.slug}`}
                  >
                    {featuredPost.title}
                  </Link>
                </h3>
                <p className="featured-release-intro">
                  Start with the song itself, then follow the connections into
                  worlds, versions, and collections.
                </p>
                <p className="featured-release-excerpt">
                  {featuredPost.excerpt}
                </p>
                <p className="meta">{formatPostDate(featuredPost.createdAt)}</p>
                <div className="tag-row">
                  {featuredPostCollections.map((collection) => (
                    <Link
                      className="collection-chip"
                      key={collection.slug}
                      to={`/collections/${collection.slug}`}
                    >
                      {collection.title}
                    </Link>
                  ))}
                </div>
                <div className="featured-release-actions">
                  <button
                    className="secondary-button mini-player-trigger"
                    disabled={!featuredPlaybackCopy.playable}
                    onClick={() => onPlayTrack(featuredPost)}
                    type="button"
                  >
                    {featuredPlaybackCopy.actionLabel}
                  </button>
                  <Link
                    className="hero-link"
                    to={`/release/${featuredPost.slug}`}
                  >
                    Open Song
                  </Link>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        <section>
          <div className="section-head">
            <h2>Begin With a Collection</h2>
            <span>
              {loading
                ? "Loading..."
                : `${featuredCollections.length} curated entries`}
            </span>
          </div>
          <div className="collection-grid collection-index-grid">
            {loading && !featuredCollections.length ? (
              <PublicSkeletonGrid count={4} label="Loading collections" />
            ) : (
              featuredCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))
            )}
          </div>
        </section>

        <section id="latest-releases">
          <div className="section-head">
            <h2>Recently Added</h2>
            <span>
              {loading ? "Loading..." : `${latestPosts.length} recent songs`}
            </span>
          </div>
          {!loading && posts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Songs Yet</p>
              <h3>Something is coming.</h3>
              <p>
                No songs have been published yet. Check back soon for the first
                one.
              </p>
            </section>
          ) : !loading && latestPosts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">More Soon</p>
              <h3>The featured song is live.</h3>
              <p>More songs will appear here as the archive expands.</p>
            </section>
          ) : (
            <div className="post-grid latest-release-grid">
              {loading && !latestPosts.length ? (
                <PublicSkeletonGrid count={4} label="Loading latest songs" />
              ) : (
                latestPosts.map((post) => (
                  <ReleaseCard
                    key={post.id}
                    onPlayTrack={onPlayTrack}
                    post={post}
                  />
                ))
              )}
            </div>
          )}
        </section>

        {homepageSelectionPosts.length ? (
          <section className="homepage-selection-section">
            <div className="section-head">
              <h2>More Curated Starts</h2>
              <span>{`${homepageSelectionPosts.length} homepage picks`}</span>
            </div>
            <p className="results-context-copy">
              These songs are also good starting points if you want a different
              mood before diving deeper.
            </p>
            <div className="homepage-selection-grid">
              {homepageSelectionPosts.map((post) => (
                <ReleaseCard
                  key={post.id}
                  layout="compact"
                  onPlayTrack={onPlayTrack}
                  post={post}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
