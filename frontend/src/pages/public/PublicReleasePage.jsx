import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CommentsSection from "../../components/CommentsSection";
import EldoriaSigil from "../../components/EldoriaSigil";
import ReleaseMedia from "../../components/ReleaseMedia";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatPostDate } from "../../lib/formatters";
import { apiBaseUrl, getCollectionDerivedContent, getEldoriaMeta, getFractureverseMeta, getPrimaryThemeForPost, getReleaseThemeHint, getThemeConfig, hasVideo, sortEldoriaPosts, sortFractureversePosts } from "../../lib/site";

export default function PublicReleasePage({
  currentUser,
  currentTrack,
  hasAdminSession,
  isPlayerActive,
  onPlayTrack,
  onUserLogout,
  setForcedTheme,
  userToken
}) {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [sequencePosts, setSequencePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [eldoriaMousePosition, setEldoriaMousePosition] = useState({ x: 52, y: 30 });
  const [eldoriaScrollDepth, setEldoriaScrollDepth] = useState(0);
  useDocumentTitle(post?.title || "Release");

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
  const isEldoria = primaryTheme === "eldoria";
  const isThemedSequence = isFractureverse || isEldoria;
  const fractureMeta = getFractureverseMeta(post, sequencePosts.length ? sequencePosts : post ? [post] : []);
  const eldoriaMeta = getEldoriaMeta(post);
  const getSequenceMeta = (entry) => {
    if (isFractureverse) {
      return getFractureverseMeta(entry, sequencePosts);
    }

    if (isEldoria) {
      return getEldoriaMeta(entry);
    }

    return null;
  };
  const orderedSequence = (isFractureverse ? sortFractureversePosts(sequencePosts) : isEldoria ? sortEldoriaPosts(sequencePosts) : sequencePosts)
    .map((entry) => ({
      post: entry,
      meta: getSequenceMeta(entry)
    }))
    .filter((entry) => entry.post);
  const currentFragmentIndex = orderedSequence.findIndex((entry) => entry.post.slug === post?.slug);
  const previousFragment = currentFragmentIndex > 0 ? orderedSequence[currentFragmentIndex - 1] : null;
  const nextFragment =
    currentFragmentIndex >= 0 && currentFragmentIndex < orderedSequence.length - 1 ? orderedSequence[currentFragmentIndex + 1] : null;
  const linkedFragments = fractureMeta?.linkedPosts || [];
  const companionBallads = orderedSequence.filter((entry) => entry.post.slug !== post?.slug);
  const derivedContent = getCollectionDerivedContent(primaryCollection, orderedSequence.map((entry) => entry.post));
  const hintedTheme =
    (currentTrack?.slug === slug ? getPrimaryThemeForPost(currentTrack) : "") ||
    getReleaseThemeHint(slug) ||
    (primaryTheme !== "default" ? primaryTheme : "");
  const eldoriaAudioActive = Boolean(
    isEldoria &&
      isPlayerActive &&
      currentTrack?.collections?.some((entry) => entry.slug === primaryCollection?.slug)
  );
  const playbackContext = primaryCollection
    ? {
        collectionId: primaryCollection.id || primaryCollection.slug,
        collectionName: primaryCollection.title,
        collectionSlug: primaryCollection.slug,
        queue: isThemedSequence && orderedSequence.length
          ? orderedSequence.map((entry) => entry.post)
          : sequencePosts.length
            ? sequencePosts
            : [post].filter(Boolean)
      }
    : null;

  useEffect(() => {
    async function loadSequence() {
      if (!post || !isThemedSequence || !primaryCollection?.slug) {
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
  }, [isThemedSequence, post, primaryCollection?.slug]);

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (hintedTheme) {
      root.setAttribute("data-collection-theme", hintedTheme);
      return () => {
        root.removeAttribute("data-collection-theme");
      };
    }

    root.removeAttribute("data-collection-theme");
    return () => {
      root.removeAttribute("data-collection-theme");
    };
  }, [hintedTheme]);

  useEffect(() => {
    if (!setForcedTheme) {
      return undefined;
    }

    if (isThemedSequence) {
      setForcedTheme("dark");
      return () => {
        setForcedTheme(null);
      };
    }

    setForcedTheme(null);
    return () => {
      setForcedTheme(null);
    };
  }, [isThemedSequence, setForcedTheme]);

  useEffect(() => {
    if (!isEldoria) {
      setEldoriaScrollDepth(0);
      return undefined;
    }

    function updateScrollDepth() {
      setEldoriaScrollDepth(window.scrollY || 0);
    }

    updateScrollDepth();
    window.addEventListener("scroll", updateScrollDepth, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollDepth);
    };
  }, [isEldoria]);

  function handleEldoriaPointerMove(event) {
    if (!isEldoria) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setEldoriaMousePosition({
      x: Number.isFinite(x) ? x : 52,
      y: Number.isFinite(y) ? y : 30
    });
  }

  return (
    <>
      <header
        className={`hero homepage-hero release-hero${isFractureverse ? " fracture-release-hero" : ""}${isEldoria ? " eldoria-release-hero" : ""}${
          isEldoria && eldoriaAudioActive ? " eldoria-release-awake" : ""
        }`}
        onMouseMove={handleEldoriaPointerMove}
        style={
          isEldoria
            ? {
                "--eldoria-mouse-x": `${eldoriaMousePosition.x}%`,
                "--eldoria-mouse-y": `${eldoriaMousePosition.y}%`
              }
            : undefined
        }
      >
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
            <div className={`release-hero-media${isEldoria ? " eldoria-release-media" : ""}`}>
              <ReleaseMedia
                className="release-video"
                controls
                eyebrow={
                  isFractureverse
                    ? hasVideo(post.videoUrl)
                      ? "Playback Available"
                      : "Fragment Unrecorded"
                    : isEldoria
                      ? hasVideo(post.videoUrl)
                        ? "Ballad Ready"
                        : "Ballad Awaiting Visuals"
                      : "Video Pending"
                }
                text={
                  isFractureverse
                    ? hasVideo(post.videoUrl)
                      ? fractureMeta?.systemNote || "Observation log updated. Fragment playback available."
                      : "Signal trace detected. Playback unavailable. Emotional imprint preserved."
                    : isEldoria
                      ? hasVideo(post.videoUrl)
                        ? "This entry is part of the living chronicle. Playback is available whenever you want to step back into the tale."
                        : "This ballad already belongs to the chronicle in written form. Its visual telling can be added later without losing the page."
                    : "This release has been published before the final video upload. The written entry is live now, and the visual can be added later."
                }
                title={post.title}
                videoUrl={post.videoUrl}
              />
              {isEldoria ? (
                <div aria-hidden="true" className="eldoria-release-media-ornament">
                  <EldoriaSigil awake={eldoriaAudioActive} className="eldoria-release-sigil" compact />
                </div>
              ) : null}
            </div>
            <div className={`release-hero-copy${isEldoria ? " eldoria-release-copy" : ""}`}>
              <p className="eyebrow">{isFractureverse ? "Timeline Record" : isEldoria ? "Chronicle Entry" : labels.releaseNote}</p>
              {isEldoria && eldoriaMeta?.identityLine ? <p className="fracture-fragment-meta eldoria-entry-meta">{eldoriaMeta.identityLine}</p> : null}
              <h1>{post.title}</h1>
              {isEldoria ? <p className="eldoria-whisper-line eldoria-release-whisper">The chronicle never mistook her for a stranger.</p> : null}
              {isEldoria && eldoriaMeta?.subtitle ? <p className="release-panel-intro eldoria-subtitle">{eldoriaMeta.subtitle}</p> : null}
              {isThemedSequence ? (
                <p className="world-mode-lock-note">This world is experienced in Midnight Mode.</p>
              ) : null}
              <p className="release-hero-intro">
                {isFractureverse
                  ? "An in-world fragment view: playback, record, linked echoes, and the position this entry holds inside the larger fracture."
                  : isEldoria
                    ? "A story-forward view for the ballad, its place inside the chronicle, and the verses that keep the world feeling lived in."
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
              ) : isEldoria ? (
                <div className="world-status-bar release-world-status eldoria-release-status">
                  <div className="world-status-item">
                    <span className="world-status-label">World</span>
                    <strong>{primaryCollection?.title || "Eldoria"}</strong>
                  </div>
                  <div className="world-status-item">
                    <span className="world-status-label">Chapter</span>
                    <strong>{eldoriaMeta?.chapterLabel || (currentFragmentIndex >= 0 ? `${currentFragmentIndex + 1} / ${orderedSequence.length || 1}` : "Opening")}</strong>
                  </div>
                  <div className="world-status-item">
                    <span className="world-status-label">Type</span>
                    <strong>{eldoriaMeta?.entryType || "Ballad"}</strong>
                  </div>
                  <div className="world-status-item">
                    <span className="world-status-label">Season</span>
                    <strong>{orderedSequence.length > 1 ? "Chronicle in motion" : "First telling"}</strong>
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
                  onClick={() => onPlayTrack(post, playbackContext)}
                  type="button"
                >
                    {hasVideo(post.videoUrl)
                      ? isFractureverse
                        ? "Begin Playback"
                      : primaryTheme === "eldoria"
                        ? "Listen to Ballad"
                        : "Play in Mini Player"
                    : isFractureverse
                      ? "Signal Unavailable"
                      : "Video Pending"}
                </button>
                {primaryCollection ? (
                  <Link className="hero-link secondary-link" to={`/collections/${primaryCollection.slug}`}>
                    {isFractureverse ? "Return to Sequence" : isEldoria ? "Return to Chronicle" : "Back to Collection"}
                  </Link>
                ) : null}
              </div>
              {isFractureverse ? <p className="fracture-system-voice">Observation log updated. Fragment link stability fluctuating.</p> : null}
              {isEldoria ? <p className="eldoria-system-voice">This page is kept as part of the wider chronicle, not as a standalone upload.</p> : null}
            </div>
          </div>
        ) : null}
      </header>

      {post ? (
        <main
          className={`content-grid release-detail-grid${isEldoria ? " eldoria-release-detail-grid" : ""}${isEldoria && eldoriaAudioActive ? " eldoria-release-awake" : ""}`}
          onMouseMove={handleEldoriaPointerMove}
          style={
            isEldoria
              ? {
                  "--eldoria-mouse-x": `${eldoriaMousePosition.x}%`,
                  "--eldoria-mouse-y": `${eldoriaMousePosition.y}%`,
                  "--eldoria-scroll-depth": `${eldoriaScrollDepth}px`
                }
              : undefined
          }
        >
          <section className={`intro-card homepage-panel release-copy-panel${isEldoria ? " eldoria-royal-record" : ""}`}>
            <p className="eyebrow">{isEldoria ? "Royal Record" : labels.releaseNote}</p>
            {isFractureverse && fractureMeta ? (
              <>
                <h2 className="release-panel-title">
                  {fractureMeta.fragmentId} / {fractureMeta.state} / {fractureMeta.signalType}
                </h2>
                <p className="release-panel-intro">{fractureMeta.description}</p>
              </>
            ) : isEldoria ? (
              <>
                <h2 className="release-panel-title">{eldoriaMeta?.subtitle || "Ballad Notes"}</h2>
                {eldoriaMeta?.openingPassage ? <p className="release-panel-intro eldoria-opening-passage">{eldoriaMeta.openingPassage}</p> : null}
                {eldoriaMeta?.coreSituation ? <p className="release-panel-intro">{eldoriaMeta.coreSituation}</p> : null}
                {eldoriaMeta?.coreTension ? <p className="release-panel-intro">{eldoriaMeta.coreTension}</p> : null}
              </>
            ) : null}
            <div className="release-prose">
              {isEldoria && eldoriaMeta ? (
                <>
                  {eldoriaMeta.chronicleObservation ? (
                    <section className="eldoria-entry-block">
                      <p className="eyebrow">Chronicle Layer</p>
                      <p>{eldoriaMeta.chronicleObservation}</p>
                      {eldoriaMeta.chronicleContradiction ? <p>{eldoriaMeta.chronicleContradiction}</p> : null}
                      {eldoriaMeta.chronicleConclusion ? (
                        <p className="eldoria-conclusion-line">
                          <strong>Conclusion:</strong> {eldoriaMeta.chronicleConclusion}
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  {eldoriaMeta.emotionalState || eldoriaMeta.coreConflict || eldoriaMeta.risk ? (
                    <section className="eldoria-entry-block">
                      <p className="eyebrow">Emotional Annotation</p>
                      {eldoriaMeta.emotionalState ? (
                        <p>
                          <strong>Emotional State:</strong> {eldoriaMeta.emotionalState}
                        </p>
                      ) : null}
                      {eldoriaMeta.coreConflict ? (
                        <p>
                          <strong>Core Conflict:</strong> {eldoriaMeta.coreConflict}
                        </p>
                      ) : null}
                      {eldoriaMeta.risk ? (
                        <p>
                          <strong>Risk:</strong> {eldoriaMeta.risk}
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  {eldoriaMeta.anchorQuote ? <blockquote className="eldoria-anchor-quote">{eldoriaMeta.anchorQuote}</blockquote> : null}
                  {eldoriaMeta.resolution ? (
                    <section className="eldoria-entry-block">
                      <p className="eyebrow">Where It Lands</p>
                      <p>{eldoriaMeta.resolution}</p>
                    </section>
                  ) : null}
                  {eldoriaMeta.entryType || eldoriaMeta.entryStatus ? (
                    <section className="eldoria-entry-block eldoria-classification-block">
                      <p className="eyebrow">Classification</p>
                      {eldoriaMeta.entryType ? (
                        <p>
                          <strong>Entry Classification:</strong> {eldoriaMeta.entryType}
                        </p>
                      ) : null}
                      {eldoriaMeta.entryStatus ? (
                        <p>
                          <strong>Status:</strong> {eldoriaMeta.entryStatus}
                        </p>
                      ) : null}
                      <p>The subject remains active.</p>
                    </section>
                  ) : null}
                </>
              ) : (
                post.content.split("\n").filter(Boolean).map((paragraph, index) => (
                  <p key={`${post.id}-content-${index}`}>{paragraph}</p>
                ))
              )}
            </div>
          </section>

          {isFractureverse && orderedSequence.length ? (
            <section className="intro-card homepage-panel fracture-release-panel">
              <div className="section-head">
                <h2>Observed Sequence</h2>
                <span>Primary world path</span>
              </div>
              <div className="fracture-sequence-strip">
                {orderedSequence.map((entry) => (
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

          {isEldoria ? (
              <section className="intro-card homepage-panel eldoria-release-panel">
                <div className="section-head eldoria-chronicle-head">
                  <h2>Song Cycle</h2>
                <span>{orderedSequence.length ? derivedContent.releaseSequenceLabel : "Chronicle context"}</span>
              </div>
              {orderedSequence.length ? (
                <div className="eldoria-song-cycle">
                  {orderedSequence.map((entry, index) => (
                    <Link
                      className={`linked-echo-card eldoria-cycle-card${entry.post.slug === post.slug ? " current" : ""}`}
                      key={entry.post.id}
                      to={`/release/${entry.post.slug}`}
                    >
                      <span className="fracture-sequence-id">{getEldoriaMeta(entry.post)?.chapterLabel || `Chapter ${String(index + 1).padStart(2, "0")}`}</span>
                      <strong>{entry.post.title}</strong>
                      <p>{getEldoriaMeta(entry.post)?.openingPassage || entry.post.excerpt}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="lyrics-placeholder">This ballad is currently the only recorded chapter in the chronicle.</p>
              )}
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

          {isEldoria ? (
            <section className="release-support-grid">
              <section className="intro-card homepage-panel eldoria-release-panel">
                <div className="section-head">
                  <h2>Companion Ballads</h2>
                  <span>{derivedContent.companionLabel}</span>
                </div>
                {companionBallads.length ? (
                  <div className="linked-echo-grid">
                    {companionBallads.map((entry, index) => (
                      <Link className="linked-echo-card eldoria-linked-card" key={entry.post.id} to={`/release/${entry.post.slug}`}>
                        <span className="fracture-sequence-id">{getEldoriaMeta(entry.post)?.chapterLabel || `Chapter ${String(index + 1).padStart(2, "0")}`}</span>
                        <strong>{entry.post.title}</strong>
                        <p>{getEldoriaMeta(entry.post)?.coreSituation || entry.post.excerpt}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="lyrics-placeholder">No companion ballads have been gathered into this part of the chronicle yet.</p>
                )}
              </section>

              <section className="intro-card homepage-panel eldoria-release-panel">
                <div className="section-head">
                  <h2>Chronicle Path</h2>
                  <span>Move through the telling</span>
                </div>
                <div className="release-nav-stack">
                  {previousFragment ? (
                    <Link className="linked-echo-card release-nav-card eldoria-linked-card" to={`/release/${previousFragment.post.slug}`}>
                      <span className="fracture-sequence-state">Previous Ballad</span>
                      <strong>{previousFragment.post.title}</strong>
                      <p>{previousFragment.meta?.chapterLabel || "Earlier chapter"} in this world.</p>
                    </Link>
                  ) : null}
                  {nextFragment ? (
                    <Link className="linked-echo-card release-nav-card eldoria-linked-card" to={`/release/${nextFragment.post.slug}`}>
                      <span className="fracture-sequence-state">Next Ballad</span>
                      <strong>{nextFragment.post.title}</strong>
                      <p>{nextFragment.meta?.chapterLabel || "Later chapter"} awaits further along the chronicle.</p>
                    </Link>
                  ) : null}
                  {!previousFragment && !nextFragment ? (
                    <div className="linked-echo-card release-nav-card eldoria-linked-card static-card">
                      <span className="fracture-sequence-state">Single Ballad Chronicle</span>
                      <strong>This entry currently stands alone.</strong>
                      <p>As more ballads are added, the path through Eldoria will begin to branch outward from here.</p>
                    </div>
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
                  {isFractureverse
                    ? "Open the recovered dialogue when you want to read along."
                    : isEldoria
                      ? "Open the verses when you want to read the ballad alongside the playback."
                      : "Open the lyrics when you want to read along."}
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
          ) : isEldoria ? (
            <section className="intro-card homepage-panel eldoria-release-panel eldoria-residual-panel">
              <p className="eyebrow">Closing Benediction</p>
              <h2 className="release-panel-title">{eldoriaMeta?.chronicleConclusion || "Every ballad leaves a mark on the chronicle that carries it."}</h2>
              <p className="release-panel-intro">{eldoriaMeta?.resolution || "Some entries feel like beginnings, some like old promises returning. Either way, they belong to the same world once they are written here."}</p>
            </section>
          ) : null}

          <CommentsSection currentUser={currentUser} onUserLogout={onUserLogout} postSlug={post.slug} userToken={userToken} />
        </main>
      ) : null}
    </>
  );
}
