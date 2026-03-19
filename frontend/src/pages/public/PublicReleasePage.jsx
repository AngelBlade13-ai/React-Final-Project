import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReleaseMedia from "../../components/ReleaseMedia";
import { formatPostDate } from "../../lib/formatters";
import { apiBaseUrl, getFractureverseMeta, getPrimaryThemeForPost, getThemeConfig, hasVideo, sortFractureversePosts } from "../../lib/site";

export default function PublicReleasePage({ hasAdminSession, onPlayTrack }) {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [sequencePosts, setSequencePosts] = useState([]);
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
  const primaryCollection = post?.collections?.find((collection) => collection.theme) || post?.collections?.[0] || null;
  const isFractureverse = primaryTheme === "fractureverse";
  const fractureMeta = getFractureverseMeta(post, sequencePosts.length ? sequencePosts : post ? [post] : []);
  const orderedFragments = sortFractureversePosts(sequencePosts)
    .map((entry) => ({
      post: entry,
      meta: getFractureverseMeta(entry, sequencePosts)
    }))
    .filter((entry) => entry.meta);
  const currentFragmentIndex = orderedFragments.findIndex((entry) => entry.post.slug === post?.slug);
  const previousFragment = currentFragmentIndex > 0 ? orderedFragments[currentFragmentIndex - 1] : null;
  const nextFragment =
    currentFragmentIndex >= 0 && currentFragmentIndex < orderedFragments.length - 1 ? orderedFragments[currentFragmentIndex + 1] : null;
  const linkedFragments = fractureMeta?.linkedPosts || [];

  useEffect(() => {
    async function loadSequence() {
      if (!post || !isFractureverse || !primaryCollection?.slug) {
        setSequencePosts([]);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/collections/${primaryCollection.slug}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load collection context.");
        }

        setSequencePosts(data.releases || []);
      } catch {
        setSequencePosts([]);
      }
    }

    loadSequence();
  }, [isFractureverse, post, primaryCollection?.slug]);

  useEffect(() => {
    const root = document.documentElement;

    if (primaryTheme && primaryTheme !== "default") {
      root.setAttribute("data-collection-theme", primaryTheme);
      return () => {
        root.removeAttribute("data-collection-theme");
      };
    }

    root.removeAttribute("data-collection-theme");
    return () => {
      root.removeAttribute("data-collection-theme");
    };
  }, [primaryTheme]);

  return (
    <>
      <header className={`hero homepage-hero release-hero${isFractureverse ? " fracture-release-hero" : ""}`}>
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
                eyebrow={isFractureverse ? (hasVideo(post.videoUrl) ? "Playback Available" : "Fragment Unrecorded") : "Video Pending"}
                text={
                  isFractureverse
                    ? hasVideo(post.videoUrl)
                      ? fractureMeta?.systemNote || "Observation log updated. Fragment playback available."
                      : "Signal trace detected. Playback unavailable. Emotional imprint preserved."
                    : "This release has been published before the final video upload. The written entry is live now, and the visual can be added later."
                }
                title={post.title}
                videoUrl={post.videoUrl}
              />
            </div>
            <div className="release-hero-copy">
              <p className="eyebrow">{isFractureverse ? "Timeline Record" : "Release Entry"}</p>
              <h1>{post.title}</h1>
              <p className="release-hero-intro">
                {isFractureverse
                  ? "An in-world fragment view: playback, record, linked echoes, and the position this entry holds inside the larger fracture."
                  : "A focused listening view for the video, the note behind it, and the words that shaped the release."}
              </p>
              <p className="hero-copy">{post.excerpt}</p>
              <p className="meta">{formatPostDate(post.createdAt)}</p>
              {isFractureverse && fractureMeta ? (
                <div className="world-status-bar release-world-status">
                  <div className="world-status-item">
                    <span className="world-status-label">Fragment</span>
                    <strong>{fractureMeta.fragmentId}</strong>
                  </div>
                  <div className="world-status-item">
                    <span className="world-status-label">State</span>
                    <strong>{fractureMeta.state}</strong>
                  </div>
                  <div className="world-status-item">
                    <span className="world-status-label">Perspective</span>
                    <strong>{fractureMeta.perspective}</strong>
                  </div>
                  <div className="world-status-item">
                    <span className="world-status-label">Signal</span>
                    <strong>{fractureMeta.signalType}</strong>
                  </div>
                </div>
              ) : null}
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
                  {hasVideo(post.videoUrl) ? (isFractureverse ? "Begin Playback" : "Play in Mini Player") : isFractureverse ? "Signal Unavailable" : "Video Pending"}
                </button>
                {primaryCollection ? (
                  <Link className="hero-link secondary-link" to={`/collections/${primaryCollection.slug}`}>
                    {isFractureverse ? "Return to Sequence" : "Back to Collection"}
                  </Link>
                ) : null}
              </div>
              {isFractureverse ? <p className="fracture-system-voice">Observation log updated. Fragment link stability fluctuating.</p> : null}
            </div>
          </div>
        ) : null}
      </header>

      {post ? (
        <main className="content-grid release-detail-grid">
          <section className="intro-card homepage-panel release-copy-panel">
            <p className="eyebrow">{labels.releaseNote}</p>
            {isFractureverse && fractureMeta ? (
              <>
                <h2 className="release-panel-title">
                  {fractureMeta.fragmentId} / {fractureMeta.state} / {fractureMeta.signalType}
                </h2>
                <p className="release-panel-intro">{fractureMeta.description}</p>
              </>
            ) : null}
            <div className="release-prose">
              {post.content.split("\n").filter(Boolean).map((paragraph, index) => (
                <p key={`${post.id}-content-${index}`}>{paragraph}</p>
              ))}
            </div>
          </section>

          {isFractureverse && orderedFragments.length ? (
            <section className="intro-card homepage-panel fracture-release-panel">
              <div className="section-head">
                <h2>Observed Sequence</h2>
                <span>Primary world path</span>
              </div>
              <div className="fracture-sequence-strip">
                {orderedFragments.map((entry) => (
                  <Link
                    className={`fracture-sequence-node${entry.post.slug === post.slug ? " active" : ""}`}
                    key={entry.post.id}
                    to={`/release/${entry.post.slug}`}
                  >
                    <span className="fracture-sequence-id">{entry.meta.fragmentId}</span>
                    <span className="fracture-sequence-state">{entry.meta.state}</span>
                    <strong>{entry.meta.title}</strong>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {isFractureverse ? (
            <section className="release-support-grid">
              <section className="intro-card homepage-panel fracture-release-panel">
                <div className="section-head">
                  <h2>Linked Echoes</h2>
                  <span>{linkedFragments.length} connected fragments</span>
                </div>
                {linkedFragments.length ? (
                  <div className="linked-echo-grid">
                    {linkedFragments.map((entry) => {
                      const meta = getFractureverseMeta(entry, sequencePosts);

                      return (
                        <Link className="linked-echo-card" key={entry.id} to={`/release/${entry.slug}`}>
                          <span className="fracture-sequence-id">{meta?.fragmentId || "F-00"}</span>
                          <strong>{meta?.title || entry.title}</strong>
                          <p>{meta?.description || entry.excerpt}</p>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="lyrics-placeholder">No linked echoes have been mapped for this fragment yet.</p>
                )}
              </section>

              <section className="intro-card homepage-panel fracture-release-panel">
                <div className="section-head">
                  <h2>Fragment Navigation</h2>
                  <span>Move through the archive</span>
                </div>
                <div className="release-nav-stack">
                  {previousFragment ? (
                    <Link className="linked-echo-card release-nav-card" to={`/release/${previousFragment.post.slug}`}>
                      <span className="fracture-sequence-state">Previous Fragment</span>
                      <strong>{previousFragment.meta.fragmentId} / {previousFragment.meta.title}</strong>
                      <p>{previousFragment.meta.state} / {previousFragment.meta.signalType}</p>
                    </Link>
                  ) : null}
                  {nextFragment ? (
                    <Link className="linked-echo-card release-nav-card" to={`/release/${nextFragment.post.slug}`}>
                      <span className="fracture-sequence-state">Next Fragment</span>
                      <strong>{nextFragment.meta.fragmentId} / {nextFragment.meta.title}</strong>
                      <p>{nextFragment.meta.state} / {nextFragment.meta.signalType}</p>
                    </Link>
                  ) : null}
                </div>
              </section>
            </section>
          ) : null}

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
                <p className="lyrics-placeholder">
                  {isFractureverse ? "Open the recovered dialogue when you want to read along." : "Open the lyrics when you want to read along."}
                </p>
              )}
            </section>
          ) : null}

          {isFractureverse && fractureMeta ? (
            <section className="intro-card homepage-panel fracture-release-panel">
              <p className="eyebrow">Residual Echo</p>
              <h2 className="release-panel-title">{fractureMeta.systemNote}</h2>
              <p className="release-panel-intro">
                Primary subject integrity remains unstable. Continue through linked echoes or return to the observed sequence.
              </p>
            </section>
          ) : null}
        </main>
      ) : null}
    </>
  );
}
