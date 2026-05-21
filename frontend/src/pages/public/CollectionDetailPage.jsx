import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  PublicErrorState,
  PublicLoadingState
} from "../../components/PublicDataState";
import EldoriaSigil from "../../components/EldoriaSigil";
import EldoriaWorldMap from "../../components/EldoriaWorldMap";
import ReleaseMedia from "../../components/ReleaseMedia";
import { FractureFragmentCard, TimelineCard } from "../../components/cards";
import { usePublicCollection } from "../../hooks/usePublicApi";
import usePageMetadata from "../../hooks/usePageMetadata";
import {
  FRACTUREVERSE_FEATURED_SLUG,
  FRACTUREVERSE_ORDER,
  FRACTUREVERSE_WORLD,
  getCanonicalCollectionSurfacePosts,
  getCollectionThemeHint,
  getCollectionDerivedContent,
  getEldoriaMapEntries,
  getEldoriaMeta,
  getFractureverseMeta,
  getPlaybackStateCopy,
  getPrimaryCollectionSurfacePosts,
  getPublicCollectionPosts,
  getSecondaryVersionPosts,
  getThemeConfig,
  getVisibleCollectionsForPost,
  groupOriginalPersonalPosts,
  getVideoPosterUrl,
  sortEldoriaPosts,
  sortFractureversePosts
} from "../../lib/site";
import {
  clearThresholdState,
  consumePendingWorldEntry,
  isImmersiveTheme,
  prefersReducedMotion,
  readPendingWorldEntry
} from "../../lib/worldTransition";

const WORLD_ENTRY_DURATIONS_MS = {
  eldoria: 2200,
  fractureverse: 1350
};

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
      if (
        linkedId !== featuredMeta?.fragmentId &&
        FRACTURE_LINE_LAYOUT.nodes[linkedId]
      ) {
        addPair(meta.fragmentId, linkedId);
      }
    });
  });

  return [...pairs.values()].map((connection) => {
    if (!interaction.hasInteraction) {
      return {
        ...connection,
        emphasized: false,
        connected: false,
        dimmed: false,
        anchorGlow: false
      };
    }

    const nonAnchorId =
      connection.from === "ANCHOR"
        ? connection.to
        : connection.to === "ANCHOR"
          ? connection.from
          : null;
    const touchesActive =
      connection.from === interaction.activeId ||
      connection.to === interaction.activeId ||
      (nonAnchorId && interaction.connectedIds.has(nonAnchorId));
    const connected = interaction.primaryEngaged
      ? true
      : connection.from === "ANCHOR" || connection.to === "ANCHOR"
        ? interaction.connectedIds.has(nonAnchorId)
        : touchesActive &&
          interaction.connectedIds.has(connection.from) &&
          interaction.connectedIds.has(connection.to);

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

  const activeMeta = getFractureverseMeta(
    releases.find((post) => post.slug === activeSlug),
    releases
  );
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

export default function CollectionDetailPage({
  currentTrack,
  isPlayerActive,
  onPlayTrack,
  setActiveCollectionTheme,
  setForcedTheme,
  siteContent
}) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const {
    collection,
    releases,
    redirectSlug,
    error: collectionError,
    isLoading: loading,
    retry
  } = usePublicCollection(slug);
  const [activeFragmentSlug, setActiveFragmentSlug] = useState("");
  const worldHeaderRef = useRef(null);
  const worldContentRef = useRef(null);
  const eldoriaScrollFrameRef = useRef(0);
  const eldoriaPointerFrameRef = useRef(0);
  const eldoriaPointerRef = useRef({ x: 50, y: 34 });
  const [eldoriaTransitionSlug, setEldoriaTransitionSlug] = useState("");
  const [worldEntryMode, setWorldEntryMode] = useState("");
  const worldEntryStartedAtRef = useRef(0);
  const error = collectionError?.message || "";
  usePageMetadata({
    canonicalPath: `/collections/${redirectSlug || collection?.slug || slug}`,
    description:
      collection?.description ||
      "Explore the songs gathered inside this collection.",
    image: getVideoPosterUrl(collection?.featuredRelease?.videoUrl),
    title: collection?.title || "Collection"
  });

  useEffect(() => {
    if (redirectSlug && redirectSlug !== slug) {
      navigate(`/collections/${redirectSlug}`, { replace: true });
    }
  }, [navigate, redirectSlug, slug]);

  const publicReleases = getPublicCollectionPosts(releases);
  const themeConfig = getThemeConfig(collection?.theme, siteContent);
  const isFractureverse = collection?.theme === "fractureverse";
  const isEldoria = collection?.theme === "eldoria";
  const isOriginalPersonal = collection?.slug === "original-personal";
  const isImmersiveCollection = isFractureverse || isEldoria;
  const primarySurfaceReleases = isFractureverse
    ? getCanonicalCollectionSurfacePosts(publicReleases, {
        collection,
        surface: "collection"
      })
    : getPrimaryCollectionSurfacePosts(publicReleases, {
        collection,
        surface: "collection"
      });
  const featuredRelease =
    primarySurfaceReleases.find(
      (post) =>
        post.slug === collection?.featuredRelease?.slug ||
        post.slug === collection?.featuredReleaseSlug
    ) ||
    primarySurfaceReleases[0] ||
    null;
  const eldoriaReleases = isEldoria
    ? sortEldoriaPosts(primarySurfaceReleases)
    : [];
  const baseReleases = isEldoria ? eldoriaReleases : primarySurfaceReleases;
  const otherReleases = featuredRelease
    ? baseReleases.filter((post) => post.slug !== featuredRelease.slug)
    : baseReleases;
  const timelineReleases = featuredRelease
    ? [featuredRelease, ...otherReleases]
    : baseReleases;
  const displayTimelineReleases = timelineReleases;
  const fractureverseReleases = isFractureverse
    ? sortFractureversePosts(
        FRACTUREVERSE_ORDER.map((entrySlug) =>
          primarySurfaceReleases.find((post) => post.slug === entrySlug)
        )
          .filter(Boolean)
          .concat(
            primarySurfaceReleases.filter(
              (post) => !FRACTUREVERSE_ORDER.includes(post.slug)
            )
          )
      )
    : [];
  const fractureverseTimelineReleases = fractureverseReleases.filter((post) =>
    getFractureverseMeta(post, fractureverseReleases)
  );
  const fractureverseSupplementalReleases = fractureverseReleases.filter(
    (post) => !getFractureverseMeta(post, fractureverseReleases)
  );
  const secondaryVersionReleases = getSecondaryVersionPosts(
    publicReleases,
    baseReleases,
    { collection, surface: "collection" }
  );
  const fractureverseFeatured =
    fractureverseTimelineReleases.find(
      (post) => post.slug === FRACTUREVERSE_FEATURED_SLUG
    ) ||
    fractureverseTimelineReleases[0] ||
    featuredRelease;
  const fractureverseGrid = fractureverseTimelineReleases.filter(
    (post) => post.slug !== fractureverseFeatured?.slug
  );
  const playbackContext = collection
    ? {
        collectionId: collection.id,
        collectionName: collection.title,
        collectionSlug: collection.slug,
        queue: isFractureverse
          ? fractureverseTimelineReleases
          : isEldoria
            ? eldoriaReleases
            : displayTimelineReleases
      }
    : null;
  const featuredFragmentMeta = getFractureverseMeta(
    fractureverseFeatured,
    fractureverseTimelineReleases
  );
  const fractureverseFeaturedPlaybackCopy = getPlaybackStateCopy(
    fractureverseFeatured,
    "fractureverse"
  );
  const featuredPlaybackCopy = getPlaybackStateCopy(
    featuredRelease,
    collection?.theme || ""
  );
  const displayFragmentMeta =
    getFractureverseMeta(
      fractureverseTimelineReleases.find(
        (post) => post.slug === activeFragmentSlug
      ),
      fractureverseTimelineReleases
    ) || featuredFragmentMeta;
  const fractureInteraction = buildFractureInteraction(
    activeFragmentSlug,
    fractureverseFeatured?.slug,
    fractureverseTimelineReleases
  );
  const fractureDominantState = "Collapsed";
  const fractureIntegrity = Math.max(
    24,
    64 - fractureverseTimelineReleases.length * 4
  );
  const fractureConnections = buildFractureConnections({
    featuredMeta: featuredFragmentMeta,
    gridMetas: fractureverseGrid
      .map((post) => getFractureverseMeta(post, fractureverseTimelineReleases))
      .filter(Boolean),
    interaction: fractureInteraction
  });
  const derivedContent = getCollectionDerivedContent(
    collection,
    displayTimelineReleases,
    siteContent
  );
  const journeySequence = isFractureverse
    ? fractureverseTimelineReleases
    : displayTimelineReleases;
  const collectionJourneyStops = [
    journeySequence[0]
      ? {
          label: isFractureverse
            ? "Start With The First Fragment"
            : isEldoria
              ? "Begin With The Opening Ballad"
              : "Start Here",
          post: journeySequence[0]
        }
      : null,
    featuredRelease
      ? {
          label: isFractureverse
            ? "Primary Anchor"
            : isEldoria
              ? "Lead Ballad"
              : "Featured Entry",
          post: featuredRelease
        }
      : null,
    journeySequence.length > 1
      ? {
          label: isFractureverse
            ? "Latest Observed Fragment"
            : isEldoria
              ? "Most Recent Chapter"
              : "Continue Deeper",
          post: journeySequence[journeySequence.length - 1]
        }
      : null
  ]
    .filter(Boolean)
    .filter(
      (entry, index, entries) =>
        entries.findIndex(
          (candidate) => candidate.post.slug === entry.post.slug
        ) === index
    );
  const eldoriaFeaturedMeta = getEldoriaMeta(featuredRelease);
  const featuredCollections = getVisibleCollectionsForPost(featuredRelease);
  const originalPersonalSections = isOriginalPersonal
    ? groupOriginalPersonalPosts(displayTimelineReleases)
    : [];
  const eldoriaAudioActive = Boolean(
    isEldoria &&
    isPlayerActive &&
    currentTrack?.collections?.some((entry) => entry.slug === collection?.slug)
  );
  const hintedTheme = collection?.theme || getCollectionThemeHint(slug);
  const worldEntryActive = Boolean(worldEntryMode);

  useEffect(() => {
    clearThresholdState();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) {
      return;
    }

    const pendingEntry = readPendingWorldEntry();

    if (
      !pendingEntry ||
      pendingEntry.slug !== slug ||
      !isImmersiveTheme(pendingEntry.theme)
    ) {
      return;
    }

    const consumedEntry = consumePendingWorldEntry({
      slug,
      theme: pendingEntry.theme
    });

    if (!consumedEntry) {
      return;
    }

    worldEntryStartedAtRef.current = Date.now();
    setWorldEntryMode(consumedEntry.theme);
  }, [slug]);

  useEffect(() => {
    if (!collection?.slug || !collection?.theme || !isImmersiveCollection) {
      return undefined;
    }

    const pendingEntry = consumePendingWorldEntry({
      slug: collection.slug,
      theme: collection.theme
    });

    if (!pendingEntry || !isImmersiveTheme(collection.theme)) {
      return undefined;
    }

    if (prefersReducedMotion()) {
      return undefined;
    }

    worldEntryStartedAtRef.current = Date.now();
    setWorldEntryMode(collection.theme);
    return undefined;
  }, [collection?.slug, collection?.theme, isImmersiveCollection]);

  useEffect(() => {
    if (!worldEntryMode || !collection?.slug) {
      return undefined;
    }

    const startedAt = worldEntryStartedAtRef.current || Date.now();
    const durationMs = WORLD_ENTRY_DURATIONS_MS[worldEntryMode] ?? 1350;
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = Math.max(0, durationMs - elapsedMs);
    const timeoutId = window.setTimeout(() => {
      setWorldEntryMode("");
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [collection?.slug, worldEntryMode]);

  useEffect(() => {
    setActiveCollectionTheme?.(hintedTheme || "");
    return () => {
      setActiveCollectionTheme?.("");
    };
  }, [hintedTheme, setActiveCollectionTheme]);

  useEffect(() => {
    if (!setForcedTheme) {
      return undefined;
    }

    if (isImmersiveCollection) {
      setForcedTheme("dark");
      return () => {
        setForcedTheme(null);
      };
    }

    setForcedTheme(null);
    return () => {
      setForcedTheme(null);
    };
  }, [isImmersiveCollection, setForcedTheme]);

  useEffect(() => {
    if (!isEldoria) {
      [worldHeaderRef.current, worldContentRef.current].forEach((element) => {
        if (!element) {
          return;
        }

        element.style.setProperty("--eldoria-scroll-depth", "0px");
        element.style.setProperty("--eldoria-mouse-x", "50%");
        element.style.setProperty("--eldoria-mouse-y", "34%");
      });
      return undefined;
    }

    function applyScrollDepth() {
      eldoriaScrollFrameRef.current = 0;
      const nextDepth = `${window.scrollY || 0}px`;

      [worldHeaderRef.current, worldContentRef.current].forEach((element) => {
        element?.style.setProperty("--eldoria-scroll-depth", nextDepth);
      });
    }

    function updateScrollDepth() {
      if (eldoriaScrollFrameRef.current) {
        return;
      }

      eldoriaScrollFrameRef.current =
        window.requestAnimationFrame(applyScrollDepth);
    }

    applyScrollDepth();
    window.addEventListener("scroll", updateScrollDepth, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollDepth);

      if (eldoriaScrollFrameRef.current) {
        window.cancelAnimationFrame(eldoriaScrollFrameRef.current);
        eldoriaScrollFrameRef.current = 0;
      }
    };
  }, [isEldoria]);

  useEffect(() => {
    if (!eldoriaTransitionSlug) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(`/release/${eldoriaTransitionSlug}`);
    }, 1500);

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

    eldoriaPointerRef.current = {
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 34
    };

    if (eldoriaPointerFrameRef.current) {
      return;
    }

    eldoriaPointerFrameRef.current = window.requestAnimationFrame(() => {
      eldoriaPointerFrameRef.current = 0;
      const nextMouseX = `${eldoriaPointerRef.current.x}%`;
      const nextMouseY = `${eldoriaPointerRef.current.y}%`;

      [worldHeaderRef.current, worldContentRef.current].forEach((element) => {
        if (!element) {
          return;
        }

        element.style.setProperty("--eldoria-mouse-x", nextMouseX);
        element.style.setProperty("--eldoria-mouse-y", nextMouseY);
      });
    });
  }

  function enterEldoriaChronicle(nextSlug) {
    if (!isEldoria || !nextSlug) {
      return;
    }

    setEldoriaTransitionSlug(nextSlug);
  }

  const eldoriaPlaceholderEntries = isEldoria
    ? Array.from(
        { length: Math.max(0, 3 - timelineReleases.length) },
        (_, index) => ({
          id: `eldoria-placeholder-${index + 1}`,
          state: index === 0 ? "unwritten" : "hidden",
          title: index === 0 ? "Yet To Be Recorded" : "Sealed Entry",
          copy:
            index === 0
              ? "The next voice has not reached the chronicle yet, but the page has already been left waiting for it."
              : "Some parts of Eldoria remain sealed until the world is ready to remember them aloud."
        })
      )
    : [];
  const eldoriaMapEntries = isEldoria
    ? getEldoriaMapEntries(eldoriaReleases, featuredRelease?.slug || "")
    : [];

  return (
    <>
      <header
        ref={worldHeaderRef}
        className={`section-hero world-header ${collection?.theme ? `world-header-${collection.theme}` : ""}${
          isEldoria ? " eldoria-world-header" : ""
        }${isEldoria && eldoriaAudioActive ? " eldoria-world-awake" : ""}${worldEntryActive ? " world-entry-pending" : ""}`}
        onMouseMove={handleEldoriaPointerMove}
        style={
          isEldoria
            ? {
                "--eldoria-mouse-x": "50%",
                "--eldoria-mouse-y": "34%",
                "--eldoria-scroll-depth": "0px"
              }
            : undefined
        }
      >
        {loading && !collection ? <h1>Loading collection...</h1> : null}
        {collection ? (
          <div className="world-header-layout">
            <div className="world-header-inner">
              <p className="eyebrow">
                {isFractureverse
                  ? FRACTUREVERSE_WORLD.headerEyebrow
                  : themeConfig.worldEyebrow}
              </p>
              <h1>{collection.title}</h1>
              {isEldoria ? (
                <p className="eldoria-whisper-line">
                  The world remembers its queen.
                </p>
              ) : null}
              <p className="hero-copy world-header-copy">
                {isFractureverse
                  ? FRACTUREVERSE_WORLD.description
                  : collection.description}
              </p>
              {isImmersiveCollection ? (
                <p className="world-mode-lock-note">
                  This world is experienced in Midnight Mode.
                </p>
              ) : null}
              {isFractureverse ? (
                <div className="world-status-bar world-header-status-bar">
                  {FRACTUREVERSE_WORLD.stats.map((item) => (
                    <div className="world-status-item" key={item.label}>
                      <span className="world-status-label">{item.label}</span>
                      <strong>
                        {item.label === "Observed Fragments"
                          ? fractureverseTimelineReleases.length
                          : item.value}
                      </strong>
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
                  <span className="meta-badge">
                    {collection.releaseCount} songs
                  </span>
                  {collection.featuredRelease ? (
                    <Link
                      className="collection-chip"
                      to={`/release/${collection.featuredRelease.slug}`}
                    >
                      Featured: {collection.featuredRelease.title}
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
            {isFractureverse ? (
              <div
                aria-hidden="true"
                className="world-header-aside fracture-aside"
              >
                <div className="fracture-line" />
              </div>
            ) : isEldoria ? (
              <div
                aria-hidden="true"
                className="world-header-aside eldoria-aside"
              >
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
      {worldEntryActive ? (
        <div
          aria-hidden="true"
          className={`world-entry-screen world-entry-screen-${worldEntryMode}`}
        >
          <div className="world-entry-copy">
            <p className="eyebrow">
              {worldEntryMode === "eldoria"
                ? "Chronicle Entry"
                : "Signal Reconstruction"}
            </p>
            <h2>
              {worldEntryMode === "eldoria"
                ? "The world remembers you."
                : "Reconstructing observed sequence..."}
            </h2>
          </div>
        </div>
      ) : null}

      {!collection && error ? (
        <main className="content-grid">
          <PublicErrorState
            eyebrow="Collection"
            message={error}
            onRetry={retry}
            secondaryHref="/collections"
            secondaryLabel="Browse collections"
            title="This collection could not be opened"
          />
        </main>
      ) : !collection && loading ? (
        <main className="content-grid">
          <PublicLoadingState
            message="The collection page is waiting on songs and world details."
            title="Opening collection"
          />
        </main>
      ) : collection ? (
        <main
          ref={worldContentRef}
          className={`content-grid collection-world-page${isFractureverse ? " fractureverse-page" : ""}${isEldoria ? " eldoria-page" : ""}${
            fractureInteraction.primaryEngaged ? " fracture-anchor-engaged" : ""
          }${isEldoria && eldoriaAudioActive ? " eldoria-world-awake" : ""}${worldEntryActive ? " world-entry-pending" : ""}`}
          onMouseMove={handleEldoriaPointerMove}
          style={
            isEldoria
              ? {
                  "--eldoria-mouse-x": "50%",
                  "--eldoria-mouse-y": "34%",
                  "--eldoria-scroll-depth": "0px"
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
                    <span className="world-status-label">
                      Timeline Integrity
                    </span>
                    <strong>{fractureIntegrity}%</strong>
                  </div>
                  <div className="fracture-analysis-item">
                    <span className="world-status-label">Dominant State</span>
                    <strong>{fractureDominantState}</strong>
                  </div>
                  <div className="fracture-analysis-item">
                    <span className="world-status-label">Primary Anchor</span>
                    <strong>
                      {featuredFragmentMeta?.fragmentId || "F-03"}
                    </strong>
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
                <div
                  className="fracture-sequence-strip"
                  onMouseLeave={() => setActiveFragmentSlug("")}
                >
                  {fractureverseTimelineReleases.map((post) => {
                    const meta = getFractureverseMeta(
                      post,
                      fractureverseTimelineReleases
                    );
                    if (!meta) {
                      return null;
                    }

                    const isActive =
                      fractureInteraction.activeSlug === post.slug;
                    const isConnected = fractureInteraction.connectedIds.has(
                      meta.fragmentId
                    );
                    const hasActive = fractureInteraction.hasInteraction;
                    const isDimmed =
                      hasActive &&
                      !isConnected &&
                      !fractureInteraction.primaryEngaged;

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
                        <span className="fracture-sequence-id">
                          {meta.fragmentId}
                        </span>
                        <span className="fracture-sequence-state">
                          {meta.state}
                        </span>
                        <strong>{meta.title}</strong>
                      </Link>
                    );
                  })}
                </div>
                {displayFragmentMeta ? (
                  <p className="fracture-sequence-note">
                    {displayFragmentMeta.fragmentId} /{" "}
                    {displayFragmentMeta.signalType} / Fragment link unstable /
                    Linked echoes: {displayFragmentMeta.linkedTo.join(", ")}
                  </p>
                ) : null}
              </section>
            </>
          ) : null}

          {isFractureverse && fractureverseFeatured ? (
            <section className="collection-fragment-shell">
              <div className="section-head fractureverse-featured-head">
                <h2>Primary Fragment</h2>
                <span>
                  {featuredFragmentMeta?.fragmentId || "F-03"} / flagship record
                </span>
              </div>
              <article
                className={`intro-card homepage-panel collection-fragment-card fracture-primary-card${
                  fractureInteraction.primaryEngaged
                    ? " active"
                    : fractureInteraction.hasInteraction
                      ? " dimmed"
                      : ""
                }`}
                onFocus={() =>
                  setActiveFragmentSlug(fractureverseFeatured.slug)
                }
                onMouseEnter={() =>
                  setActiveFragmentSlug(fractureverseFeatured.slug)
                }
                onMouseLeave={() => setActiveFragmentSlug("")}
              >
                <div className="collection-fragment-media fracture-primary-media">
                  <ReleaseMedia
                    className="featured-release-video"
                    compact
                    eyebrow={
                      fractureverseFeaturedPlaybackCopy.playable
                        ? "Primary Fragment"
                        : fractureverseFeaturedPlaybackCopy.mediaEyebrow
                    }
                    muted
                    text={
                      fractureverseFeaturedPlaybackCopy.playable
                        ? "Observation log updated. Primary anchor available for playback."
                        : fractureverseFeaturedPlaybackCopy.mediaText
                    }
                    title={fractureverseFeatured.title}
                    videoUrl={fractureverseFeatured.videoUrl}
                  />
                  <div className="release-card-overlay" />
                  <div className="play-pill featured-play-pill">
                    {fractureverseFeaturedPlaybackCopy.playable
                      ? "Primary Fragment"
                      : fractureverseFeaturedPlaybackCopy.pillLabel}
                  </div>
                </div>
                <div className="collection-fragment-copy fracture-primary-copy">
                  <p className="eyebrow">Primary Fragment</p>
                  <p className="fracture-fragment-meta">
                    {featuredFragmentMeta?.fragmentId} /{" "}
                    {featuredFragmentMeta?.state} /{" "}
                    {featuredFragmentMeta?.perspective} /{" "}
                    {featuredFragmentMeta?.signalType}
                  </p>
                  <h2>
                    {featuredFragmentMeta?.title || fractureverseFeatured.title}
                  </h2>
                  <p className="collection-fragment-excerpt">
                    {featuredFragmentMeta?.description ||
                      fractureverseFeatured.excerpt}
                  </p>
                  <p className="collection-fragment-context">
                    {featuredFragmentMeta?.systemNote ||
                      "Collapse event stabilized through force of will. Structural integrity compromised."}
                  </p>
                  <p className="fracture-system-voice">
                    Observation log updated. Primary anchor remains unstable but
                    reachable.
                  </p>
                  <div className="featured-release-actions">
                    <button
                      className="secondary-button mini-player-trigger"
                      disabled={!fractureverseFeaturedPlaybackCopy.playable}
                      onClick={() =>
                        onPlayTrack(fractureverseFeatured, playbackContext)
                      }
                      type="button"
                    >
                      {fractureverseFeaturedPlaybackCopy.actionLabel}
                    </button>
                    <Link
                      className="hero-link"
                      to={`/release/${fractureverseFeatured.slug}`}
                    >
                      Enter Fragment
                    </Link>
                    <Link
                      className="hero-link secondary-link"
                      to={`/release/${fractureverseFeatured.slug}`}
                    >
                      View Record
                    </Link>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {isEldoria ? (
            <EldoriaWorldMap
              currentSlug={featuredRelease?.slug || ""}
              entries={eldoriaMapEntries}
              onEnterChronicle={enterEldoriaChronicle}
            />
          ) : null}

          {!isFractureverse && featuredRelease ? (
            <section className="collection-fragment-shell">
              <div
                className={`section-head${isEldoria ? " eldoria-featured-head" : ""}`}
              >
                <h2>{themeConfig.featuredLabel}</h2>
                <span>
                  {isEldoria
                    ? "A leading ballad from this chronicle"
                    : "Featured collection entry"}
                </span>
              </div>
              <article
                className={`intro-card homepage-panel collection-fragment-card${isEldoria ? " eldoria-featured-card" : ""}`}
              >
                <div className="collection-fragment-media">
                  <ReleaseMedia
                    className="featured-release-video"
                    compact
                    muted
                    text={featuredPlaybackCopy.mediaText}
                    title={featuredRelease.title}
                    videoUrl={featuredRelease.videoUrl}
                  />
                  <div className="release-card-overlay" />
                  <div className="play-pill featured-play-pill">
                    {featuredPlaybackCopy.playable
                      ? eldoriaFeaturedMeta?.chapterNumber === "1"
                        ? "First Chronicle Entry"
                        : themeConfig.featuredLabel
                      : featuredPlaybackCopy.pillLabel}
                  </div>
                </div>
                <div className="collection-fragment-copy">
                  <p className="eyebrow">{themeConfig.featuredLabel}</p>
                  {isEldoria && eldoriaFeaturedMeta?.identityLine ? (
                    <p className="fracture-fragment-meta eldoria-entry-meta">
                      {eldoriaFeaturedMeta.identityLine}
                    </p>
                  ) : null}
                  <h2>{featuredRelease.title}</h2>
                  <p className="collection-fragment-excerpt">
                    {featuredRelease.excerpt}
                  </p>
                  <p className="collection-fragment-context">
                    {isEldoria
                      ? derivedContent.featuredContext
                      : collection.theme === "fractureverse"
                        ? "An anchor point inside the fracture: a record that holds one possible version of the world in place."
                        : derivedContent.featuredContext}
                  </p>
                  <div className="tag-row">
                    {featuredCollections.map((entry) => (
                      <span
                        className="collection-chip static-chip"
                        key={entry.slug}
                      >
                        {entry.title}
                      </span>
                    ))}
                  </div>
                  <div className="featured-release-actions">
                    <button
                      className="secondary-button mini-player-trigger"
                      disabled={!featuredPlaybackCopy.playable}
                      onClick={() =>
                        onPlayTrack(featuredRelease, playbackContext)
                      }
                      type="button"
                    >
                      {featuredPlaybackCopy.actionLabel}
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

          {collectionJourneyStops.length ? (
            <section className="intro-card homepage-panel journey-rail-card">
              <div className="section-head">
                <h2>
                  {isFractureverse
                    ? "Continue Through The Sequence"
                    : isEldoria
                      ? "Continue Through The Chronicle"
                      : "Continue Through This Collection"}
                </h2>
                <span>
                  {journeySequence.length
                    ? derivedContent.releaseSequenceLabel
                    : derivedContent.collectionCountLabel}
                </span>
              </div>
              <div className="journey-rail-grid">
                <article className="journey-summary-card">
                  <p className="eyebrow">
                    {isFractureverse
                      ? "World Guide"
                      : isEldoria
                        ? "Chronicle Guide"
                        : "Collection Guide"}
                  </p>
                  <h3>{collection.title}</h3>
                  <p>
                    {isFractureverse
                      ? "Move from the earliest stable anchor through the primary fragment and out toward the most recent observed collapse."
                      : isEldoria
                        ? "Treat the world like a guided chronicle: begin at the opening, pass through the lead ballad, and continue toward the latest recorded chapter."
                        : "Use this rail to start at the clearest entry point, then continue toward the collection's later songs without losing the thread."}
                  </p>
                </article>
                {collectionJourneyStops.map((entry) => {
                  const entryMeta = isFractureverse
                    ? getFractureverseMeta(entry.post, journeySequence)
                    : isEldoria
                      ? getEldoriaMeta(entry.post)
                      : null;

                  return (
                    <Link
                      className="linked-echo-card journey-rail-link"
                      key={`${entry.label}-${entry.post.slug}`}
                      to={`/release/${entry.post.slug}`}
                    >
                      <span className="fracture-sequence-state">
                        {entry.label}
                      </span>
                      <strong>{entry.post.title}</strong>
                      <p>
                        {isFractureverse
                          ? [
                              entryMeta?.fragmentId,
                              entryMeta?.state,
                              entryMeta?.signalType
                            ]
                              .filter(Boolean)
                              .join(" / ")
                          : isEldoria
                            ? entryMeta?.chapterLabel ||
                              entryMeta?.openingPassage ||
                              entry.post.excerpt
                            : entry.post.excerpt}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className={isEldoria ? "eldoria-chronicle-section" : ""}>
            <div
              className={`section-head timeline-section-head${isFractureverse ? " fractureverse-timeline-head" : ""}${isEldoria ? " eldoria-chronicle-head" : ""}`}
            >
              <h2>{themeConfig.listLabel}</h2>
              <span>
                {isFractureverse
                  ? derivedContent.collectionCountLabel
                  : isEldoria
                    ? derivedContent.collectionCountLabel
                    : derivedContent.collectionCountLabel}
              </span>
            </div>
            {isEldoria ? (
              <p className="eldoria-chronicle-intro">
                The royal archive remains below as a written record, but the map
                above is now the truest way into the world.
              </p>
            ) : null}
            {isFractureverse ? (
              fractureverseTimelineReleases.length === 0 ? (
                <section className="intro-card homepage-panel empty-state-card fracture-empty-state">
                  <p className="eyebrow">{themeConfig.noItemsEyebrow}</p>
                  <h3>{themeConfig.noItemsTitle}</h3>
                  <p>{themeConfig.noItemsText}</p>
                </section>
              ) : (
                <div className="timeline-grid fracture-fragment-grid-shell">
                  <div
                    aria-hidden="true"
                    className={`fracture-link-layer${fractureInteraction.primaryEngaged ? " primary-influenced" : ""}`}
                  >
                    <svg
                      className="fracture-link-svg"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 100"
                    >
                      <defs>
                        <linearGradient
                          id="fracture-link-gradient"
                          x1="0%"
                          x2="100%"
                          y1="0%"
                          y2="0%"
                        >
                          <stop
                            offset="0%"
                            stopColor="currentColor"
                            stopOpacity="0.12"
                          />
                          <stop
                            offset="50%"
                            stopColor="currentColor"
                            stopOpacity="0.42"
                          />
                          <stop
                            offset="100%"
                            stopColor="currentColor"
                            stopOpacity="0.12"
                          />
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
                  <div
                    className="timeline-grid fracture-fragment-grid"
                    onMouseLeave={() => setActiveFragmentSlug("")}
                  >
                    {fractureverseGrid.map((post) => {
                      const meta = getFractureverseMeta(
                        post,
                        fractureverseTimelineReleases
                      );
                      const isActive =
                        fractureInteraction.activeSlug === post.slug;
                      const isLinked =
                        meta &&
                        fractureInteraction.connectedIds.has(meta.fragmentId);
                      const isDimmed =
                        fractureInteraction.hasInteraction &&
                        !isLinked &&
                        !fractureInteraction.primaryEngaged;

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
            ) : displayTimelineReleases.length === 0 ? (
              <section className="intro-card homepage-panel empty-state-card">
                <p className="eyebrow">{themeConfig.noItemsEyebrow}</p>
                <h3>{themeConfig.noItemsTitle}</h3>
                <p>{themeConfig.noItemsText}</p>
              </section>
            ) : isOriginalPersonal ? (
              <div className="collection-section-stack">
                {originalPersonalSections.map((section) => (
                  <section key={section.key}>
                    <div className="section-head">
                      <h3>{section.label}</h3>
                      <span>{section.posts.length} songs</span>
                    </div>
                    <div className="timeline-grid">
                      {section.posts.map((post, index) => (
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
                  </section>
                ))}
              </div>
            ) : displayTimelineReleases.length === 1 ? (
              isEldoria ? (
                <div className="timeline-grid eldoria-chronicle-grid eldoria-chronicle-grid-sparse">
                  {displayTimelineReleases.map((post, index) => (
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
                        <p className="eldoria-entry-state">
                          {entry.state === "unwritten"
                            ? "Yet To Be Recorded"
                            : "Sealed"}
                        </p>
                        <h3>{entry.title}</h3>
                        <p>{entry.copy}</p>
                        <div className="card-action-row">
                          <span className="result-card-cta">
                            Awaiting Chronicle
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <section
                  className={`intro-card homepage-panel collection-archive-note${isEldoria ? " eldoria-archive-note" : ""}`}
                >
                  <p className="eyebrow">{themeConfig.singleItemEyebrow}</p>
                  <h3>{themeConfig.singleItemTitle}</h3>
                  <p>{themeConfig.singleItemText}</p>
                </section>
              )
            ) : (
              <div
                className={`timeline-grid${isEldoria ? " eldoria-chronicle-grid" : ""}`}
              >
                {displayTimelineReleases.map((post, index) => (
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

          {isFractureverse && fractureverseSupplementalReleases.length ? (
            <section className="intro-card homepage-panel">
              <div className="section-head">
                <h2>Supplemental Fragments</h2>
                <span>{fractureverseSupplementalReleases.length} entries</span>
              </div>
              <div className="timeline-grid">
                {fractureverseSupplementalReleases.map((post, index) => (
                  <TimelineCard
                    index={index}
                    key={post.id}
                    onPlayTrack={onPlayTrack}
                    playbackContext={playbackContext}
                    post={post}
                    themeConfig={themeConfig}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {secondaryVersionReleases.length ? (
            <section className="intro-card homepage-panel">
              <details className="archive-link-picker">
                <summary>Version Family Branches</summary>
                <div className="collection-section-stack secondary-version-stack">
                  <p className="hero-copy">
                    The main list keeps one clear version of each song family.
                    Alternate public branches stay here when you want to follow
                    the wider family tree.
                  </p>
                  <div
                    className={`timeline-grid${isEldoria ? " eldoria-chronicle-grid" : ""}`}
                  >
                    {secondaryVersionReleases.map((post, index) => (
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
                </div>
              </details>
            </section>
          ) : null}

          {isFractureverse ? (
            <section className="intro-card homepage-panel world-note-card fracture-echo-card">
              <p className="eyebrow">Residual Echo</p>
              <h3>{FRACTUREVERSE_WORLD.residualEcho}</h3>
            </section>
          ) : (
            <section
              className={`intro-card homepage-panel world-note-card${isEldoria ? " eldoria-world-note" : ""}`}
            >
              <p className="eyebrow">{themeConfig.worldNoteTitle}</p>
              <h3>{derivedContent.worldNote || themeConfig.worldNoteText}</h3>
            </section>
          )}
        </main>
      ) : null}
    </>
  );
}
