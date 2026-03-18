import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReleaseMedia from "../../components/ReleaseMedia";
import { apiBaseUrl, emptyAbout, getPrimaryThemeForPost, getThemeConfig, hasVideo } from "../../lib/site";
import { formatPostDate } from "../../lib/formatters";

export function AboutPage() {
  const [about, setAbout] = useState(emptyAbout);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAbout() {
      try {
        const response = await fetch(`${apiBaseUrl}/about`);
        const data = await response.json();
        setAbout({ ...emptyAbout, ...(data.about || {}) });
      } catch (error) {
        console.error("Failed to load about content", error);
      } finally {
        setLoading(false);
      }
    }

    loadAbout();
  }, []);

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <p className="eyebrow">{about.heroEyebrow}</p>
        <h1>{loading ? "Loading about page..." : about.heroTitle}</h1>
        <p className="hero-copy">{about.heroText}</p>
      </header>

      <main className="content-grid about-grid">
        <section className="intro-card homepage-panel">
          <p className="eyebrow">{about.artistEyebrow}</p>
          <h2>{about.artistTitle}</h2>
          <p>{about.artistText}</p>
        </section>

        <section className="intro-card homepage-panel">
          <p className="eyebrow">{about.siteEyebrow}</p>
          <h2>{about.siteTitle}</h2>
          <p>{about.siteText}</p>
        </section>

        <section className="intro-card homepage-panel about-quote-card">
          <p className="eyebrow">{about.quoteEyebrow}</p>
          <h2>{about.quoteTitle}</h2>
          <p className="identity-line">{about.quoteText}</p>
        </section>
      </main>
    </>
  );
}

export function PublicReleasePage({ hasAdminSession, onPlayTrack }) {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);

  useEffect(() => {
    async function loadPost() {
      try {
        const response = await fetch(`${apiBaseUrl}/posts/${slug}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load release.");
        }

        setPost(data.post);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [slug]);

  const primaryTheme = getPrimaryThemeForPost(post);
  const labels = getThemeConfig(primaryTheme);

  return (
    <>
      <header className="hero homepage-hero release-hero">
        <div className="hero-header-row">
          <div className="public-page-links">
            <Link className="back-link" to="/">
              Back to home
            </Link>
            <Link className="back-link" to="/collections">
              Browse collections
            </Link>
            {hasAdminSession ? (
              <Link className="back-link" to="/admin">
                Manage Posts
              </Link>
            ) : null}
          </div>
        </div>
        {loading ? <h1>Loading release...</h1> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {post ? (
          <div className="release-hero-layout">
            <div className="release-hero-media">
              <ReleaseMedia
                className="release-video"
                controls
                text="This release has been published before the final video upload. The written entry is live now, and the visual can be added later."
                title={post.title}
                videoUrl={post.videoUrl}
              />
            </div>
            <div className="release-hero-copy">
              <p className="eyebrow">Release Entry</p>
              <h1>{post.title}</h1>
              <p className="release-hero-intro">
                A focused listening view for the video, the note behind it, and the words that shaped the release.
              </p>
              <p className="hero-copy">{post.excerpt}</p>
              <p className="meta">{formatPostDate(post.createdAt)}</p>
              <div className="tag-row">
                {post.collections?.map((collection) => (
                  <Link className="collection-chip" key={collection.slug} to={`/collections/${collection.slug}`}>
                    {collection.title}
                  </Link>
                ))}
              </div>
              <div className="release-hero-actions">
                <button
                  className="secondary-button mini-player-trigger"
                  disabled={!hasVideo(post.videoUrl)}
                  onClick={() => onPlayTrack(post)}
                  type="button"
                >
                  {hasVideo(post.videoUrl) ? "Play in Mini Player" : "Video Pending"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {post ? (
        <main className="content-grid release-detail-grid">
          <section className="intro-card homepage-panel release-copy-panel">
            <p className="eyebrow">{labels.releaseNote}</p>
            <div className="release-prose">
              {post.content.split("\n").filter(Boolean).map((paragraph, index) => (
                <p key={`${post.id}-content-${index}`}>{paragraph}</p>
              ))}
            </div>
          </section>

          {post.lyrics ? (
            <section className="intro-card homepage-panel lyrics-panel">
              <div className="lyrics-header">
                <div>
                  <p className="eyebrow">{labels.lyrics}</p>
                  <h2>{labels.lyrics}</h2>
                </div>
                <button className="secondary-button lyrics-toggle" onClick={() => setShowLyrics((current) => !current)} type="button">
                  {showLyrics ? `Hide ${labels.lyrics}` : `Show ${labels.lyrics}`}
                </button>
              </div>
              {showLyrics ? (
                <pre className="lyrics-block">{post.lyrics}</pre>
              ) : (
                <p className="lyrics-placeholder">Open the lyrics when you want to read along.</p>
              )}
            </section>
          ) : null}
        </main>
      ) : null}
    </>
  );
}
