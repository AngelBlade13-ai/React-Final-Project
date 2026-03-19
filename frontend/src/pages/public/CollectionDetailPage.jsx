import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReleaseMedia from "../../components/ReleaseMedia";
import { FractureFragmentCard, TimelineCard } from "../../components/cards";
import {
  apiBaseUrl,
  FRACTUREVERSE_FEATURED_SLUG,
  FRACTUREVERSE_METADATA,
  FRACTUREVERSE_ORDER,
  FRACTUREVERSE_WORLD,
  getFractureverseMeta,
  getThemeConfig,
  hasVideo
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

function buildFractureConnections(activeMeta) {
  const links = [
    ["ANCHOR", "F-02"],
    ["ANCHOR", "F-04"],
    ["F-01", "F-02"],
    ["F-01", "F-04"],
    ["F-02", "F-05"],
    ["F-04", "F-05"]
  ];
  const activeId = activeMeta?.fragmentId;
  const linkedIds = new Set(activeMeta?.linkedTo || []);

  return links.map(([from, to]) => {
    const active =
      !activeId || activeId === from || activeId === to || (from === "ANCHOR" && linkedIds.has(to)) || (to === "ANCHOR" && linkedIds.has(from));

    return {
      from,
      to,
      active
    };
  });
}

export default function CollectionDetailPage({ onPlayTrack }) {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFragmentSlug, setActiveFragmentSlug] = useState("");

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

  const featuredRelease = collection?.featuredRelease || releases[0] || null;
  const otherReleases = releases.filter((post) => post.slug !== featuredRelease?.slug);
  const themeConfig = getThemeConfig(collection?.theme);
  const timelineReleases = featuredRelease ? [featuredRelease, ...otherReleases] : releases;
  const isFractureverse = collection?.theme === "fractureverse";
  const fractureverseReleases = isFractureverse
    ? FRACTUREVERSE_ORDER.map((entrySlug) => releases.find((post) => post.slug === entrySlug)).filter(Boolean)
    : [];
  const fractureverseFeatured =
    fractureverseReleases.find((post) => post.slug === FRACTUREVERSE_FEATURED_SLUG) || featuredRelease;
  const fractureverseGrid = fractureverseReleases.filter((post) => post.slug !== fractureverseFeatured?.slug);
  const activeFragmentMeta =
    FRACTUREVERSE_METADATA[activeFragmentSlug] ||
    FRACTUREVERSE_METADATA[fractureverseFeatured?.slug] ||
    FRACTUREVERSE_METADATA[FRACTUREVERSE_FEATURED_SLUG];
  const fractureDominantState = "Collapsed";
  const fractureIntegrity = Math.max(24, 64 - fractureverseReleases.length * 4);
  const fractureConnections = buildFractureConnections(activeFragmentMeta);

  useEffect(() => {
    const root = document.documentElement;

    if (collection?.theme) {
      root.setAttribute("data-collection-theme", collection.theme);
      return () => {
        root.removeAttribute("data-collection-theme");
      };
    }

    root.removeAttribute("data-collection-theme");
    return () => {
      root.removeAttribute("data-collection-theme");
    };
  }, [collection?.theme]);

  return (
    <>
      <header className={`section-hero world-header ${collection?.theme ? `world-header-${collection.theme}` : ""}`}>
        {loading ? <h1>Loading collection...</h1> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {collection ? (
          <div className="world-header-layout">
            <div className="world-header-inner">
              <p className="eyebrow">{isFractureverse ? FRACTUREVERSE_WORLD.headerEyebrow : themeConfig.worldEyebrow}</p>
              <h1>{collection.title}</h1>
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
            ) : null}
          </div>
        ) : null}
      </header>

      {collection ? (
        <main className={`content-grid collection-world-page${isFractureverse ? " fractureverse-page" : ""}`}>
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
                    <strong>{getFractureverseMeta(fractureverseFeatured)?.fragmentId || "F-03"}</strong>
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
                    const meta = getFractureverseMeta(post);
                    const isActive = activeFragmentSlug === post.slug;
                    const hasActive = Boolean(activeFragmentSlug);

                    if (!meta) {
                      return null;
                    }

                    return (
                      <Link
                        className={`fracture-sequence-node${isActive ? " active" : ""}${hasActive && !isActive ? " dimmed" : ""}`}
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
                {activeFragmentMeta ? (
                  <p className="fracture-sequence-note">
                    {activeFragmentMeta.fragmentId} / {activeFragmentMeta.signalType} / Fragment link unstable / Linked echoes:{" "}
                    {activeFragmentMeta.linkedTo.join(", ")}
                  </p>
                ) : null}
              </section>
            </>
          ) : null}

          {isFractureverse && fractureverseFeatured ? (
            <section className="collection-fragment-shell">
              <div className="section-head fractureverse-featured-head">
                <h2>Primary Fragment</h2>
                <span>{getFractureverseMeta(fractureverseFeatured)?.fragmentId || "F-03"} / flagship record</span>
              </div>
              <article className="intro-card homepage-panel collection-fragment-card fracture-primary-card">
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
                    {getFractureverseMeta(fractureverseFeatured)?.fragmentId} / {getFractureverseMeta(fractureverseFeatured)?.state} /{" "}
                    {getFractureverseMeta(fractureverseFeatured)?.perspective} / {getFractureverseMeta(fractureverseFeatured)?.signalType}
                  </p>
                  <h2>{getFractureverseMeta(fractureverseFeatured)?.title || fractureverseFeatured.title}</h2>
                  <p className="collection-fragment-excerpt">
                    {getFractureverseMeta(fractureverseFeatured)?.description || fractureverseFeatured.excerpt}
                  </p>
                  <p className="collection-fragment-context">
                    {getFractureverseMeta(fractureverseFeatured)?.systemNote ||
                      "Collapse event stabilized through force of will. Structural integrity compromised."}
                  </p>
                  <p className="fracture-system-voice">Observation log updated. Primary anchor remains unstable but reachable.</p>
                  <div className="featured-release-actions">
                    <button
                      className="secondary-button mini-player-trigger"
                      disabled={!hasVideo(fractureverseFeatured.videoUrl)}
                      onClick={() => onPlayTrack(fractureverseFeatured)}
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

          {!isFractureverse && featuredRelease ? (
            <section className="collection-fragment-shell">
              <article className="intro-card homepage-panel collection-fragment-card">
                <div className="collection-fragment-media">
                  <ReleaseMedia
                    className="featured-release-video"
                    compact
                    muted
                    text="This fragment is live as a written record first. Its video can arrive later."
                    title={featuredRelease.title}
                    videoUrl={featuredRelease.videoUrl}
                  />
                  <div className="release-card-overlay" />
                  <div className="play-pill featured-play-pill">
                    {hasVideo(featuredRelease.videoUrl) ? themeConfig.featuredLabel : "Video Pending"}
                  </div>
                </div>
                <div className="collection-fragment-copy">
                  <p className="eyebrow">{themeConfig.featuredLabel}</p>
                  <h2>{featuredRelease.title}</h2>
                  <p className="collection-fragment-excerpt">{featuredRelease.excerpt}</p>
                  <p className="collection-fragment-context">
                    {collection.theme === "fractureverse"
                      ? "An anchor point inside the fracture: a record that holds one possible version of the world in place."
                      : "The featured release acts as the clearest entry point into this collection before the rest of the archive opens beneath it."}
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
                      onClick={() => onPlayTrack(featuredRelease)}
                      type="button"
                    >
                      {hasVideo(featuredRelease.videoUrl) ? "Play in Mini Player" : "Video Pending"}
                    </button>
                    <Link className="hero-link" to={`/release/${featuredRelease.slug}`}>
                      {themeConfig.featuredAction}
                    </Link>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          <section>
            <div className={`section-head timeline-section-head${isFractureverse ? " fractureverse-timeline-head" : ""}`}>
              <h2>{themeConfig.listLabel}</h2>
              <span>{isFractureverse ? `${fractureverseGrid.length} linked fragments` : `${timelineReleases.length} entries`}</span>
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
                  <div aria-hidden="true" className="fracture-link-layer">
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
                              className={`fracture-link-path${connection.active ? " active" : ""}`}
                              x1={from.x}
                              x2={to.x}
                              y1={from.y}
                              y2={to.y}
                            />
                            <circle className={`fracture-link-node${connection.active ? " active" : ""}`} cx={to.x} cy={to.y} r="1.4" />
                          </g>
                        );
                      })}
                      <circle className="fracture-link-anchor" cx={FRACTURE_LINE_LAYOUT.anchor.x} cy={FRACTURE_LINE_LAYOUT.anchor.y} r="2.2" />
                    </svg>
                  </div>
                  <div className="timeline-grid fracture-fragment-grid">
                  {fractureverseGrid.map((post) => {
                    const meta = getFractureverseMeta(post);
                    const isActive = activeFragmentSlug === post.slug;
                    const isLinked = Boolean(
                      activeFragmentMeta &&
                        meta &&
                        (activeFragmentMeta.linkedTo.includes(meta.fragmentId) ||
                          activeFragmentMeta.fragmentId === meta.fragmentId)
                    );

                    if (!meta) {
                      return null;
                    }

                    return (
                      <FractureFragmentCard
                        active={isActive}
                        highlighted={isLinked}
                        key={post.id}
                        meta={meta}
                        onFocusFragment={setActiveFragmentSlug}
                        onPlayTrack={onPlayTrack}
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
              <section className="intro-card homepage-panel collection-archive-note">
                <p className="eyebrow">{themeConfig.singleItemEyebrow}</p>
                <h3>{themeConfig.singleItemTitle}</h3>
                <p>{themeConfig.singleItemText}</p>
              </section>
            ) : (
              <div className="timeline-grid">
                {timelineReleases.map((post, index) => (
                  <TimelineCard
                    index={index}
                    key={post.id}
                    onPlayTrack={onPlayTrack}
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
            <section className="intro-card homepage-panel world-note-card">
              <p className="eyebrow">{themeConfig.worldNoteTitle}</p>
              <h3>{themeConfig.worldNoteText}</h3>
            </section>
          )}
        </main>
      ) : null}
    </>
  );
}
