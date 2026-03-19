import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EldoriaSigil from "../../components/EldoriaSigil";
import EldoriaWorldMap from "../../components/EldoriaWorldMap";
import ReleaseMedia from "../../components/ReleaseMedia";
import { FractureFragmentCard, TimelineCard } from "../../components/cards";
import {
  apiBaseUrl,
  FRACTUREVERSE_FEATURED_SLUG,
  FRACTUREVERSE_ORDER,
  FRACTUREVERSE_WORLD,
  getCollectionThemeHint,
  getCollectionDerivedContent,
  getEldoriaMeta,
  getFractureverseMeta,
  getThemeConfig,
  hasVideo,
  sortEldoriaPosts,
  sortFractureversePosts
} from "../../lib/site";

const FRACTURE_LINE_LAYOUT = {
  anchor: { x: 50, y: 6 },
  nodes: {
    "F-01": { x: 26, y: 36 },
    "F-02": { x: 74, y: 28 },
    "F-04": { x: 24, y: 76 },
    "F-05": { x: 76, y: 72 }
  }
};

function buildFractureConnections({ featuredMeta, gridMetas, interaction }) {
  const pairs = new Map();

  function addPair(from, to) {
    const key = [from, to].sort().join(":");
    if (!pairs.has(key)) {
      pairs.set(key, { from, to });
    }
  }

  gridMetas.forEach((meta) => {
    addPair("ANCHOR", meta.fragmentId);
  });

  gridMetas.forEach((meta) => {
    meta.linkedTo.forEach((linkedId) => {
      if (linkedId !== featuredMeta?.fragmentId && FRACTURE_LINE_LAYOUT.nodes[linkedId]) {
        addPair(meta.fragmentId, linkedId);
      }
    });
  });

  return [...pairs.values()].map((connection) => {
    if (!interaction.hasInteraction) {
      return { ...connection, emphasized: false, connected: false, dimmed: false, anchorGlow: false };
    }

    const nonAnchorId = connection.from === "ANCHOR" ? connection.to : connection.to === "ANCHOR" ? connection.from : null;
    const touchesActive =
      connection.from === interaction.activeId ||
      connection.to === interaction.activeId ||
      (nonAnchorId && interaction.connectedIds.has(nonAnchorId));
    const connected = interaction.primaryEngaged
      ? true
      : connection.from === "ANCHOR" || connection.to === "ANCHOR"
        ? interaction.connectedIds.has(nonAnchorId)
        : touchesActive && interaction.connectedIds.has(connection.from) && interaction.connectedIds.has(connection.to);

    return {
      ...connection,
      emphasized: interaction.primaryEngaged || connected,
      connected,
      dimmed: !interaction.primaryEngaged && !connected,
      anchorGlow: interaction.primaryEngaged
    };
  });
}

function buildFractureInteraction(activeSlug, featuredSlug, releases) {
  if (!activeSlug) {
    return {
      activeId: "",
      activeSlug: "",
      connectedIds: new Set(),
      hasInteraction: false,
      primaryEngaged: false
    };
  }

  const activeMeta = getFractureverseMeta(releases.find((post) => post.slug === activeSlug), releases);
  if (!activeMeta) {
    return {
      activeId: "",
      activeSlug: "",
      connectedIds: new Set(),
      hasInteraction: false,
      primaryEngaged: false
    };
  }

  return {
    activeId: activeMeta.fragmentId,
    activeSlug,
    connectedIds: new Set([activeMeta.fragmentId, ...activeMeta.linkedTo]),
    hasInteraction: true,
    primaryEngaged: activeSlug === featuredSlug
  };
}

export default function CollectionDetailPage({ currentTrack, isPlayerActive, onPlayTrack }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFragmentSlug, setActiveFragmentSlug] = useState("");
  const [eldoriaMousePosition, setEldoriaMousePosition] = useState({ x: 50, y: 34 });
  const [eldoriaScrollDepth, setEldoriaScrollDepth] = useState(0);
  const [eldoriaTransitionSlug, setEldoriaTransitionSlug] = useState("");

  useEffect(() => {
    async function loadCollection() {
      try {
        const response = await fetch(`${apiBaseUrl}/collections/${slug}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load collection.");
        }

        setCollection(data.collection);
        setReleases(data.releases || []);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadCollection();
  }, [slug]);

  const featuredRelease = collection?.featuredRelease || null;
  const themeConfig = getThemeConfig(collection?.theme);
  const isFractureverse = collection?.theme === "fractureverse";
  const isEldoria = collection?.theme === "eldoria";
  const eldoriaReleases = isEldoria ? sortEldoriaPosts(releases) : [];
  const baseReleases = isEldoria ? eldoriaReleases : releases;
  const otherReleases = featuredRelease ? baseReleases.filter((post) => post.slug !== featuredRelease.slug) : baseReleases;
  const timelineReleases = featuredRelease ? [featuredRelease, ...otherReleases] : baseReleases;
  const fractureverseReleases = isFractureverse
    ? sortFractureversePosts(
        FRACTUREVERSE_ORDER.map((entrySlug) => releases.find((post) => post.slug === entrySlug))
          .filter(Boolean)
          .concat(releases.filter((post) => !FRACTUREVERSE_ORDER.includes(post.slug)))
      )
    : [];
  const fractureverseFeatured =
    fractureverseReleases.find((post) => post.slug === FRACTUREVERSE_FEATURED_SLUG) || featuredRelease;
  const fractureverseGrid = fractureverseReleases.filter((post) => post.slug !== fractureverseFeatured?.slug);
  const playbackContext = collection
    ? {
        collectionId: collection.id,
        collectionName: collection.title,
        collectionSlug: collection.slug,
        queue: isFractureverse ? fractureverseReleases : isEldoria ? eldoriaReleases : timelineReleases
      }
    : null;
  const featuredFragmentMeta = getFractureverseMeta(fractureverseFeatured, fractureverseReleases);
  const displayFragmentMeta =
    getFractureverseMeta(fractureverseReleases.find((post) => post.slug === activeFragmentSlug), fractureverseReleases) ||
    featuredFragmentMeta;
  const fractureInteraction = buildFractureInteraction(activeFragmentSlug, fractureverseFeatured?.slug, fractureverseReleases);
  const fractureDominantState = "Collapsed";
  const fractureIntegrity = Math.max(24, 64 - fractureverseReleases.length * 4);
  const fractureConnections = buildFractureConnections({
    featuredMeta: featuredFragmentMeta,
    gridMetas: fractureverseGrid.map((post) => getFractureverseMeta(post, fractureverseReleases)).filter(Boolean),
    interaction: fractureInteraction
  });
  const derivedContent = getCollectionDerivedContent(collection, timelineReleases);
  const eldoriaFeaturedMeta = getEldoriaMeta(featuredRelease);
  const eldoriaAudioActive = Boolean(
    isEldoria &&
      isPlayerActive &&
      currentTrack?.collections?.some((entry) => entry.slug === collection?.slug)
  );
  const hintedTheme = collection?.theme || getCollectionThemeHint(slug);

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

  useEffect(() => {
    if (!eldoriaTransitionSlug) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(`/release/${eldoriaTransitionSlug}`);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [eldoriaTransitionSlug, navigate]);

  function handleEldoriaPointerMove(event) {
    if (!isEldoria) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setEldoriaMousePosition({
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 34
    });
  }

  function enterEldoriaChronicle(nextSlug) {
    if (!isEldoria || !nextSlug) {
      return;
    }

    setEldoriaTransitionSlug(nextSlug);
  }

  const eldoriaPlaceholderEntries = isEldoria
    ? Array.from({ length: Math.max(0, 3 - timelineReleases.length) }, (_, index) => ({
        id: `eldoria-placeholder-${index + 1}`,
        state: index === 0 ? "unwritten" : "hidden",
        title: index === 0 ? "Yet To Be Recorded" : "Sealed Entry",
        copy:
          index === 0
            ? "The next voice has not reached the chronicle yet, but the page has already been left waiting for it."
            : "Some parts of Eldoria remain sealed until the world is ready to remember them aloud."
      }))
    : [];
  const eldoriaMapEntries = isEldoria
    ? eldoriaReleases.map((entry, index) => {
        const meta = getEldoriaMeta(entry);

        return {
          id: entry.id,
          slug: entry.slug,
          title: meta?.subtitle || entry.title,
          subtitle: meta?.chapterLabel || `Chapter ${index + 1}`,
          state: entry.slug === featuredRelease?.slug ? "active" : hasVideo(entry.videoUrl) ? "available" : "unwritten",
          action: entry.slug === featuredRelease?.slug ? "Enter Chronicle" : "Open Recorded Path"
        };
      })
    : [];

  return (
    <>
      <header
        className={`section-hero world-header ${collection?.theme ? `world-header-${collection.theme}` : ""}${
          isEldoria ? " eldoria-world-header" : ""
        }${isEldoria && eldoriaAudioActive ? " eldoria-world-awake" : ""}`}
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
        {loading ? <h1>Loading collection...</h1> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {collection ? (
          <div className="world-header-layout">
            <div className="world-header-inner">
              <p className="eyebrow">{isFractureverse ? FRACTUREVERSE_WORLD.headerEyebrow : themeConfig.worldEyebrow}</p>
              <h1>{collection.title}</h1>
              {isEldoria ? <p className="eldoria-whisper-line">The world remembers its queen.</p> : null}
              <p className="hero-copy world-header-copy">
                {isFractureverse ? FRACTUREVERSE_WORLD.description : collection.description}
              </p>
              {isFractureverse ? (
                <div className="world-status-bar world-header-status-bar">
                  {FRACTUREVERSE_WORLD.stats.map((item) => (
                    <div className="world-status-item" key={item.label}>
                      <span className="world-status-label">{item.label}</span>
                      <strong>{item.label === "Observed Fragments" ? fractureverseReleases.length : item.value}</strong>
                    </div>
                  ))}
                </div>
              ) : isEldoria ? (
                <div className="world-status-bar world-header-status-bar eldoria-world-status">
                  {derivedContent.stats?.map((item) => (
                    <div className="world-status-item" key={item.label}>
                      <span className="world-status-label">{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="collection-meta-row world-header-meta">
                  <span className="meta-badge">{collection.releaseCount} releases</span>
                  {collection.featuredRelease ? (
                    <Link className="collection-chip" to={`/release/${collection.featuredRelease.slug}`}>
                      Featured: {collection.featuredRelease.title}
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
            {isFractureverse ? (
              <div aria-hidden="true" className="world-header-aside fracture-aside">
                <div className="fracture-line" />
              </div>
            ) : isEldoria ? (
              <div aria-hidden="true" className="world-header-aside eldoria-aside">
                <div className="eldoria-ambient-dust" />
                <EldoriaSigil awake={eldoriaAudioActive} />
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
      {isEldoria && eldoriaTransitionSlug ? (
        <div aria-hidden="true" className="eldoria-transition-screen">
          <p>The world remembers you.</p>
        </div>
      ) : null}

      {collection ? (
        <main
          className={`content-grid collection-world-page${isFractureverse ? " fractureverse-page" : ""}${isEldoria ? " eldoria-page" : ""}${
            fractureInteraction.primaryEngaged ? " fracture-anchor-engaged" : ""
          }${isEldoria && eldoriaAudioActive ? " eldoria-world-awake" : ""}`}
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
          {isFractureverse ? (
            <>
              <section className="intro-card homepage-panel fracture-analysis-panel">
                <div className="section-head fracture-analysis-head">
                  <h2>Timeline Analysis</h2>
                  <span>Observation log updated</span>
                </div>
                <div className="fracture-analysis-grid">
                  <div className="fracture-analysis-item">
                    <span className="world-status-label">Timeline Integrity</span>
                    <strong>{fractureIntegrity}%</strong>
                  </div>
                  <div className="fracture-analysis-item">
                    <span className="world-status-label">Dominant State</span>
                    <strong>{fractureDominantState}</strong>
                  </div>
                  <div className="fracture-analysis-item">
                    <span className="world-status-label">Primary Anchor</span>
                    <strong>{featuredFragmentMeta?.fragmentId || "F-03"}</strong>
                  </div>
                  <div className="fracture-analysis-item">
                    <span className="world-status-label">Emotional Load</span>
                    <strong>Critical</strong>
                  </div>
                </div>
              </section>

              <section className="intro-card homepage-panel fracture-sequence-panel">
                <div className="section-head fractureverse-sequence-head">
                  <h2>Observed Sequence</h2>
                  <span>Timeline divergence detected</span>
                </div>
                <div className="fracture-sequence-strip" onMouseLeave={() => setActiveFragmentSlug("")}>
                  {fractureverseReleases.map((post) => {
                    const meta = getFractureverseMeta(post, fractureverseReleases);
                    const isActive = fractureInteraction.activeSlug === post.slug;
                    const isConnected = fractureInteraction.connectedIds.has(meta.fragmentId);
                    const hasActive = fractureInteraction.hasInteraction;
                    const isDimmed = hasActive && !isConnected && !fractureInteraction.primaryEngaged;

                    if (!meta) {
                      return null;
                    }

                    return (
                      <Link
                        className={`fracture-sequence-node fracture-${meta.state.toLowerCase()}${isActive ? " active" : ""}${
                          isConnected && !isActive ? " connected" : ""
                        }${isDimmed ? " dimmed" : ""}${fractureInteraction.primaryEngaged ? " primary-influenced" : ""}`}
                        key={post.slug}
                        onFocus={() => setActiveFragmentSlug(post.slug)}
                        onMouseEnter={() => setActiveFragmentSlug(post.slug)}
                        to={`/release/${post.slug}`}
                      >
                        <span className="fracture-sequence-id">{meta.fragmentId}</span>
                        <span className="fracture-sequence-state">{meta.state}</span>
                        <strong>{meta.title}</strong>
                      </Link>
                    );
                  })}
                </div>
                {displayFragmentMeta ? (
                  <p className="fracture-sequence-note">
                    {displayFragmentMeta.fragmentId} / {displayFragmentMeta.signalType} / Fragment link unstable / Linked echoes:{" "}
                    {displayFragmentMeta.linkedTo.join(", ")}
                  </p>
                ) : null}
              </section>
            </>
          ) : null}

          {isFractureverse && fractureverseFeatured ? (
            <section className="collection-fragment-shell">
              <div className="section-head fractureverse-featured-head">
                <h2>Primary Fragment</h2>
                <span>{featuredFragmentMeta?.fragmentId || "F-03"} / flagship record</span>
              </div>
              <article
                className={`intro-card homepage-panel collection-fragment-card fracture-primary-card${
                  fractureInteraction.primaryEngaged ? " active" : fractureInteraction.hasInteraction ? " dimmed" : ""
                }`}
                onFocus={() => setActiveFragmentSlug(fractureverseFeatured.slug)}
                onMouseEnter={() => setActiveFragmentSlug(fractureverseFeatured.slug)}
                onMouseLeave={() => setActiveFragmentSlug("")}
              >
                <div className="collection-fragment-media fracture-primary-media">
                  <ReleaseMedia
                    className="featured-release-video"
                    compact
                    eyebrow={hasVideo(fractureverseFeatured.videoUrl) ? "Primary Fragment" : "Data Corrupted"}
                    muted
                    text={
                      hasVideo(fractureverseFeatured.videoUrl)
                        ? "Observation log updated. Primary anchor available for playback."
                        : "Visual record lost. Playback unavailable. Emotional imprint preserved."
                    }
                    title={fractureverseFeatured.title}
                    videoUrl={fractureverseFeatured.videoUrl}
                  />
                  <div className="release-card-overlay" />
                  <div className="play-pill featured-play-pill">
                    {hasVideo(fractureverseFeatured.videoUrl) ? "Primary Fragment" : "Primary Fragment / Video Pending"}
                  </div>
                </div>
                <div className="collection-fragment-copy fracture-primary-copy">
                  <p className="eyebrow">Primary Fragment</p>
                  <p className="fracture-fragment-meta">
                    {featuredFragmentMeta?.fragmentId} / {featuredFragmentMeta?.state} / {featuredFragmentMeta?.perspective} /{" "}
                    {featuredFragmentMeta?.signalType}
                  </p>
                  <h2>{featuredFragmentMeta?.title || fractureverseFeatured.title}</h2>
                  <p className="collection-fragment-excerpt">
                    {featuredFragmentMeta?.description || fractureverseFeatured.excerpt}
                  </p>
                  <p className="collection-fragment-context">
                    {featuredFragmentMeta?.systemNote || "Collapse event stabilized through force of will. Structural integrity compromised."}
                  </p>
                  <p className="fracture-system-voice">Observation log updated. Primary anchor remains unstable but reachable.</p>
                  <div className="featured-release-actions">
                    <button
                      className="secondary-button mini-player-trigger"
                      disabled={!hasVideo(fractureverseFeatured.videoUrl)}
                      onClick={() => onPlayTrack(fractureverseFeatured, playbackContext)}
                      type="button"
                    >
                      {hasVideo(fractureverseFeatured.videoUrl) ? "Begin Playback" : "Signal Unavailable"}
                    </button>
                    <Link className="hero-link" to={`/release/${fractureverseFeatured.slug}`}>
                      Enter Fragment
                    </Link>
                    <Link className="hero-link secondary-link" to={`/release/${fractureverseFeatured.slug}`}>
                      View Record
                    </Link>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {isEldoria ? (
            <EldoriaWorldMap currentSlug={featuredRelease?.slug || ""} entries={eldoriaMapEntries} onEnterChronicle={enterEldoriaChronicle} />
          ) : null}

          {!isFractureverse && featuredRelease ? (
            <section className="collection-fragment-shell">
              <div className={`section-head${isEldoria ? " eldoria-featured-head" : ""}`}>
                <h2>{themeConfig.featuredLabel}</h2>
                <span>{isEldoria ? "A leading ballad from this chronicle" : "Featured collection entry"}</span>
              </div>
              <article className={`intro-card homepage-panel collection-fragment-card${isEldoria ? " eldoria-featured-card" : ""}`}>
                <div className="collection-fragment-media">
                  <ReleaseMedia
                    className="featured-release-video"
                    compact
                    muted
                    text={
                      isEldoria
                        ? "This ballad is already part of the chronicle in written form. Its visual can arrive when the telling is ready."
                        : "This fragment is live as a written record first. Its video can arrive later."
                    }
                    title={featuredRelease.title}
                    videoUrl={featuredRelease.videoUrl}
                  />
                  <div className="release-card-overlay" />
                  <div className="play-pill featured-play-pill">
                    {hasVideo(featuredRelease.videoUrl)
                      ? eldoriaFeaturedMeta?.chapterNumber === "1"
                        ? "First Chronicle Entry"
                        : themeConfig.featuredLabel
                      : "Video Pending"}
                  </div>
                </div>
                <div className="collection-fragment-copy">
                  <p className="eyebrow">{themeConfig.featuredLabel}</p>
                  {isEldoria && eldoriaFeaturedMeta?.identityLine ? (
                    <p className="fracture-fragment-meta eldoria-entry-meta">{eldoriaFeaturedMeta.identityLine}</p>
                  ) : null}
                  <h2>{featuredRelease.title}</h2>
                  <p className="collection-fragment-excerpt">{featuredRelease.excerpt}</p>
                  <p className="collection-fragment-context">
                    {isEldoria
                      ? derivedContent.featuredContext
                      : collection.theme === "fractureverse"
                      ? "An anchor point inside the fracture: a record that holds one possible version of the world in place."
                      : derivedContent.featuredContext}
                  </p>
                  <div className="tag-row">
                    {(featuredRelease.collections || []).map((entry) => (
                      <span className="collection-chip static-chip" key={entry.slug}>
                        {entry.title}
                      </span>
                    ))}
                  </div>
                  <div className="featured-release-actions">
                    <button
                      className="secondary-button mini-player-trigger"
                      disabled={!hasVideo(featuredRelease.videoUrl)}
                      onClick={() => onPlayTrack(featuredRelease, playbackContext)}
                      type="button"
                    >
                      {hasVideo(featuredRelease.videoUrl)
                        ? collection.theme === "eldoria"
                          ? "Listen to Ballad"
                          : "Play in Mini Player"
                        : "Video Pending"}
                    </button>
                    <Link
                      className="hero-link"
                      onClick={(event) => {
                        if (!isEldoria) {
                          return;
                        }

                        event.preventDefault();
                        enterEldoriaChronicle(featuredRelease.slug);
                      }}
                      to={`/release/${featuredRelease.slug}`}
                    >
                      {themeConfig.featuredAction}
                    </Link>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          <section>
            <div className={`section-head timeline-section-head${isFractureverse ? " fractureverse-timeline-head" : ""}${isEldoria ? " eldoria-chronicle-head" : ""}`}>
              <h2>{themeConfig.listLabel}</h2>
              <span>
                {isFractureverse
                  ? derivedContent.collectionCountLabel
                  : isEldoria
                    ? derivedContent.collectionCountLabel
                    : derivedContent.collectionCountLabel}
              </span>
            </div>
            {isFractureverse ? (
              fractureverseReleases.length === 0 ? (
                <section className="intro-card homepage-panel empty-state-card fracture-empty-state">
                  <p className="eyebrow">{themeConfig.noItemsEyebrow}</p>
                  <h3>{themeConfig.noItemsTitle}</h3>
                  <p>{themeConfig.noItemsText}</p>
                </section>
              ) : (
                <div className="timeline-grid fracture-fragment-grid-shell">
                  <div aria-hidden="true" className={`fracture-link-layer${fractureInteraction.primaryEngaged ? " primary-influenced" : ""}`}>
                    <svg className="fracture-link-svg" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="fracture-link-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                          <stop offset="50%" stopColor="currentColor" stopOpacity="0.42" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0.12" />
                        </linearGradient>
                      </defs>
                      {fractureConnections.map((connection) => {
                        const from =
                          connection.from === "ANCHOR"
                            ? FRACTURE_LINE_LAYOUT.anchor
                            : FRACTURE_LINE_LAYOUT.nodes[connection.from];
                        const to =
                          connection.to === "ANCHOR"
                            ? FRACTURE_LINE_LAYOUT.anchor
                            : FRACTURE_LINE_LAYOUT.nodes[connection.to];

                        if (!from || !to) {
                          return null;
                        }

                        return (
                          <g key={`${connection.from}-${connection.to}`}>
                            <line
                              className={`fracture-link-path${connection.emphasized ? " active" : ""}${
                                connection.connected ? " connected" : ""
                              }${connection.dimmed ? " dimmed" : ""}`}
                              x1={from.x}
                              x2={to.x}
                              y1={from.y}
                              y2={to.y}
                            />
                            {connection.from !== "ANCHOR" ? (
                              <circle
                                className={`fracture-link-node${connection.connected ? " connected" : ""}${
                                  connection.dimmed ? " dimmed" : ""
                                }`}
                                cx={from.x}
                                cy={from.y}
                                r="1.2"
                              />
                            ) : null}
                            {connection.to !== "ANCHOR" ? (
                              <circle
                                className={`fracture-link-node${connection.connected ? " connected" : ""}${
                                  connection.dimmed ? " dimmed" : ""
                                }`}
                                cx={to.x}
                                cy={to.y}
                                r="1.4"
                              />
                            ) : null}
                          </g>
                        );
                      })}
                      <circle
                        className={`fracture-link-anchor${fractureInteraction.primaryEngaged ? " active" : ""}`}
                        cx={FRACTURE_LINE_LAYOUT.anchor.x}
                        cy={FRACTURE_LINE_LAYOUT.anchor.y}
                        r="2.2"
                      />
                    </svg>
                  </div>
                  <div className="timeline-grid fracture-fragment-grid" onMouseLeave={() => setActiveFragmentSlug("")}>
                  {fractureverseGrid.map((post) => {
                    const meta = getFractureverseMeta(post, fractureverseReleases);
                    const isActive = fractureInteraction.activeSlug === post.slug;
                    const isLinked = meta && fractureInteraction.connectedIds.has(meta.fragmentId);
                    const isDimmed = fractureInteraction.hasInteraction && !isLinked && !fractureInteraction.primaryEngaged;

                    if (!meta) {
                      return null;
                    }

                    return (
                      <FractureFragmentCard
                        active={isActive}
                        dimmed={isDimmed}
                        highlighted={isLinked}
                        key={post.id}
                        meta={meta}
                        onFocusFragment={setActiveFragmentSlug}
                        onPlayTrack={onPlayTrack}
                        playbackContext={playbackContext}
                        primaryInfluenced={fractureInteraction.primaryEngaged}
                        post={post}
                      />
                    );
                  })}
                  </div>
                </div>
              )
            ) : timelineReleases.length === 0 ? (
              <section className="intro-card homepage-panel empty-state-card">
                <p className="eyebrow">{themeConfig.noItemsEyebrow}</p>
                <h3>{themeConfig.noItemsTitle}</h3>
                <p>{themeConfig.noItemsText}</p>
              </section>
            ) : timelineReleases.length === 1 ? (
              isEldoria ? (
                <div className="timeline-grid eldoria-chronicle-grid eldoria-chronicle-grid-sparse">
                  {timelineReleases.map((post, index) => (
                    <TimelineCard
                      index={index}
                      key={post.id}
                      onEnterChronicle={enterEldoriaChronicle}
                      onPlayTrack={onPlayTrack}
                      playbackContext={playbackContext}
                      post={post}
                      themeConfig={themeConfig}
                    />
                  ))}
                  {eldoriaPlaceholderEntries.map((entry) => (
                    <article
                      className={`post-card homepage-post-card release-feed-card timeline-card eldoria-chronicle-card eldoria-entry-${entry.state} eldoria-placeholder-card`}
                      key={entry.id}
                    >
                      <div className="release-card-media timeline-card-media eldoria-placeholder-media">
                        <div className="release-card-overlay" />
                      </div>
                      <div className="post-body timeline-card-body">
                        <p className="meta">Chronicle Reserve / Eldoria</p>
                        <p className="eldoria-entry-state">{entry.state === "unwritten" ? "Yet To Be Recorded" : "Sealed"}</p>
                        <h3>{entry.title}</h3>
                        <p>{entry.copy}</p>
                        <div className="card-action-row">
                          <span className="result-card-cta">Awaiting Chronicle</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <section className={`intro-card homepage-panel collection-archive-note${isEldoria ? " eldoria-archive-note" : ""}`}>
                  <p className="eyebrow">{themeConfig.singleItemEyebrow}</p>
                  <h3>{themeConfig.singleItemTitle}</h3>
                  <p>{themeConfig.singleItemText}</p>
                </section>
              )
            ) : (
              <div className={`timeline-grid${isEldoria ? " eldoria-chronicle-grid" : ""}`}>
                {timelineReleases.map((post, index) => (
                  <TimelineCard
                    index={index}
                    key={post.id}
                    onEnterChronicle={enterEldoriaChronicle}
                    onPlayTrack={onPlayTrack}
                    playbackContext={playbackContext}
                    post={post}
                    themeConfig={themeConfig}
                  />
                ))}
              </div>
            )}
          </section>

          {isFractureverse ? (
            <section className="intro-card homepage-panel world-note-card fracture-echo-card">
              <p className="eyebrow">Residual Echo</p>
              <h3>{FRACTUREVERSE_WORLD.residualEcho}</h3>
            </section>
          ) : (
            <section className={`intro-card homepage-panel world-note-card${isEldoria ? " eldoria-world-note" : ""}`}>
              <p className="eyebrow">{themeConfig.worldNoteTitle}</p>
              <h3>{derivedContent.worldNote || themeConfig.worldNoteText}</h3>
            </section>
          )}
        </main>
      ) : null}
    </>
  );
}
