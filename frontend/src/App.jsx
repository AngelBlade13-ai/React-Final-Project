import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useOutletContext,
  useParams
} from "react-router-dom";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const tokenKey = "suno-blog-admin-token";
const themeKey = "suno-blog-theme";

const emptyPost = {
  title: "",
  videoUrl: "",
  excerpt: "",
  content: "",
  lyrics: "",
  createdAt: "",
  published: false,
  collectionSlugs: []
};

const emptyCollection = {
  title: "",
  description: "",
  featuredReleaseSlug: "",
  theme: ""
};

const emptyAbout = {
  heroEyebrow: "About",
  heroTitle: "",
  heroText: "",
  artistEyebrow: "The Artist",
  artistTitle: "",
  artistText: "",
  siteEyebrow: "The Site",
  siteTitle: "",
  siteText: "",
  quoteEyebrow: "Why It Exists",
  quoteTitle: "",
  quoteText: ""
};

const COLLECTION_THEMES = {
  default: {
    worldEyebrow: "Collection",
    worldTitlePrefix: "",
    worldDescriptionPrefix: "",
    featuredLabel: "Primary Release",
    featuredAction: "View Full Record",
    listLabel: "Latest Releases",
    releaseNote: "Release Note",
    lyrics: "Lyrics",
    noItemsEyebrow: "No Published Releases",
    noItemsTitle: "This collection exists, but nothing is live in it yet.",
    noItemsText: "Add or publish a release to bring this lane of the archive to life.",
    singleItemEyebrow: "Single Release Collection",
    singleItemTitle: "This collection is currently anchored by one release.",
    singleItemText:
      "As more entries are added, they will stack here beneath the spotlight instead of leaving the page feeling unfinished.",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Each collection is a different shelf in the archive, with its own tone and memory.",
    itemName: "Release",
    itemAction: "Open Release"
  },
  "soft-archive": {
    worldEyebrow: "Soft Archive",
    featuredLabel: "Primary Entry",
    featuredAction: "Open Entry",
    listLabel: "Recent Entries",
    releaseNote: "Entry",
    lyrics: "Words",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Quiet songs do not need to be small. They just need enough room to stay gentle.",
    itemName: "Entry",
    itemAction: "Open Entry"
  },
  fractureverse: {
    worldEyebrow: "Fractureverse",
    featuredLabel: "Primary Timeline Fragment",
    featuredAction: "View Full Record",
    listLabel: "Timeline Fragments",
    releaseNote: "Fragment Record",
    lyrics: "Recovered Dialogue",
    noItemsEyebrow: "No Fragments Detected",
    noItemsTitle: "No fragments detected.",
    noItemsText: "Either this world is newly formed,\nor something erased what came before.",
    singleItemEyebrow: "Single Recorded Fragment",
    singleItemTitle: "This world is currently anchored by one recorded fragment.",
    singleItemText: "As more releases enter the Fractureverse, they will appear here as additional observed entries beneath the first fracture.",
    worldNoteTitle: "Echo",
    worldNoteText: "Some timelines collapse.\nSome repeat.\nSome are never meant to be found.",
    itemName: "Fragment",
    itemAction: "Open Fragment"
  },
  stage: {
    worldEyebrow: "Stage",
    featuredLabel: "Opening Act",
    featuredAction: "Continue Act",
    listLabel: "Acts",
    releaseNote: "Performance Notes",
    lyrics: "Script",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Some songs are meant to arrive like entrances, spotlights, and final bows.",
    itemName: "Act",
    itemAction: "Open Act"
  },
  signal: {
    worldEyebrow: "Signal",
    featuredLabel: "Primary Transmission",
    featuredAction: "Open Transmission",
    listLabel: "Signals",
    releaseNote: "Transmission Log",
    lyrics: "Decoded Signal",
    worldNoteTitle: "A note about this world",
    worldNoteText: "What survives here sounds like a message from somewhere distant, imperfect, and still reaching back.",
    itemName: "Signal",
    itemAction: "Open Signal"
  }
};

const FRACTUREVERSE_FEATURED_SLUG = "shattered-trust-reimagined";
const FRACTUREVERSE_ORDER = [
  "the-one-you-used-to-be-reimagined",
  "still-breathing-in-a-dying-world-reimagined",
  "shattered-trust-reimagined",
  "you-were-better-before-you-saved-the-world-reimagined",
  "we-were-never-meant-to-survive-reimagined-duet"
];

const FRACTUREVERSE_WORLD = {
  headerEyebrow: "World / Fractureverse",
  description:
    "A fractured reality where every choice creates a new world, and every version of love carries a different cost.\n\nHere, memory, sacrifice, collapse, obsession, and convergence exist side by side - none of them fully gone, none of them fully resolved.",
  stats: [
    { label: "World Status", value: "Unstable" },
    { label: "Observed Fragments", value: "5" },
    { label: "Primary Subjects", value: "Angel, Grissom" },
    { label: "Current Condition", value: "Active recursion detected" }
  ],
  residualEcho: "Some timelines collapse. Some repeat. Some never stop trying to become real."
};

const FRACTUREVERSE_METADATA = {
  "the-one-you-used-to-be-reimagined": {
    fragmentId: "F-01",
    state: "Stable",
    perspective: "Grissom",
    signalType: "Origin",
    title: "The One You Used to Be",
    description: "A preserved fragment from before the fracture - where love existed without cost.",
    linkedTo: ["F-02", "F-04"],
    systemNote: "Reference timeline detected. Emotional imprint preserved."
  },
  "still-breathing-in-a-dying-world-reimagined": {
    fragmentId: "F-02",
    state: "Divergent",
    perspective: "Angel",
    signalType: "Conflict",
    title: "Still Breathing (In a Dying World)",
    description:
      "The moment she chose everything, knowing it would cost her the one thing she wanted to keep.",
    linkedTo: ["F-01", "F-03"],
    systemNote: "Critical divergence detected. Global stability prioritized over personal attachment."
  },
  "shattered-trust-reimagined": {
    fragmentId: "F-03",
    state: "Collapsed",
    perspective: "Angel",
    signalType: "Primary",
    title: "Shattered Trust (Reimagined)",
    description:
      "A post-collapse fragment where trust failed, and the cost of saving everything became permanent.",
    linkedTo: ["F-01", "F-02"],
    systemNote: "Collapse event stabilized through force of will. Structural integrity compromised."
  },
  "you-were-better-before-you-saved-the-world-reimagined": {
    fragmentId: "F-04",
    state: "Divergent",
    perspective: "Grissom",
    signalType: "Conflict",
    title: "You Were Better Before You Saved the World",
    description:
      "A hostile fragment where loss becomes obsession, and one version of him refuses to accept the world she chose.",
    linkedTo: ["F-02", "F-03"],
    systemNote: "Hostile recursion detected. Subject actively destabilizing timelines."
  },
  "we-were-never-meant-to-survive-reimagined-duet": {
    fragmentId: "F-05",
    state: "Unstable",
    perspective: "Both",
    signalType: "Convergence",
    title: "We Were Never Meant to Survive",
    description:
      "A convergence event where opposing truths collide, and the timeline can no longer resolve itself.",
    linkedTo: ["F-02", "F-03", "F-04"],
    systemNote: "Convergence detected. Conflicting directives unresolved."
  }
};

function getThemeConfig(theme) {
  return COLLECTION_THEMES[theme] || COLLECTION_THEMES.default;
}

function getPrimaryThemeForPost(post) {
  const themedCollection = (post?.collections || []).find((collection) => collection.theme);
  return themedCollection?.theme || "default";
}

function getFractureverseMeta(post) {
  return FRACTUREVERSE_METADATA[post?.slug] || null;
}

function hasVideo(videoUrl) {
  return Boolean(String(videoUrl || "").trim());
}

function ReleaseMedia({
  videoUrl,
  className = "",
  title = "Video Coming Soon",
  text = "This release is already live. Add the video whenever it is ready.",
  compact = false,
  controls = false,
  muted = false
}) {
  if (hasVideo(videoUrl)) {
    return <video className={className} controls={controls} muted={muted} playsInline preload="metadata" src={videoUrl} />;
  }

  return (
    <div className={`media-placeholder ${compact ? "media-placeholder-compact" : ""} ${className}`.trim()}>
      <div className="media-placeholder-copy">
        <p className="eyebrow">Video Pending</p>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(themeKey);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [hasAdminSession, setHasAdminSession] = useState(() => Boolean(localStorage.getItem(tokenKey)));
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isMiniPlayerPlaying, setIsMiniPlayerPlaying] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(themeKey, theme);
  }, [theme]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return undefined;
    }

    function syncTime() {
      setPlayerProgress(audio.currentTime || 0);
      setPlayerDuration(audio.duration || 0);
    }

    function handleEnded() {
      setIsMiniPlayerPlaying(false);
    }

    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentTrack?.videoUrl) {
      return;
    }

    if (audio.src !== currentTrack.videoUrl) {
      audio.src = currentTrack.videoUrl;
      audio.currentTime = 0;
    }

    if (isMiniPlayerPlaying) {
      audio.play().catch(() => {
        setIsMiniPlayerPlaying(false);
      });
      return;
    }

    audio.pause();
  }, [currentTrack, isMiniPlayerPlaying]);

  function playTrack(track) {
    setCurrentTrack(track);
    setPlayerProgress(0);
    setPlayerDuration(0);
    setIsMiniPlayerPlaying(true);
  }

  function toggleMiniPlayer() {
    if (!currentTrack) return;
    setIsMiniPlayerPlaying((current) => !current);
  }

  function closeMiniPlayer() {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    setCurrentTrack(null);
    setIsMiniPlayerPlaying(false);
    setPlayerProgress(0);
    setPlayerDuration(0);
  }

  function scrubMiniPlayer(event) {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);

    if (!audio) {
      return;
    }

    audio.currentTime = nextTime;
    setPlayerProgress(nextTime);
  }

  return (
    <BrowserRouter>
      <audio ref={audioRef} preload="metadata" />
      <Routes>
        <Route
          element={<PublicLayout hasAdminSession={hasAdminSession} theme={theme} setTheme={setTheme} />}
        >
          <Route index element={<PublicHome hasAdminSession={hasAdminSession} onPlayTrack={playTrack} />} />
          <Route path="/collections" element={<CollectionsIndexPage />} />
          <Route path="/collections/:slug" element={<CollectionDetailPage onPlayTrack={playTrack} />} />
          <Route path="/explore" element={<ExplorePage onPlayTrack={playTrack} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/release/:slug"
            element={<PublicReleasePage hasAdminSession={hasAdminSession} onPlayTrack={playTrack} />}
          />
        </Route>
        <Route
          path="/admin/login"
          element={<AdminLogin setHasAdminSession={setHasAdminSession} theme={theme} setTheme={setTheme} />}
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout setHasAdminSession={setHasAdminSession} theme={theme} setTheme={setTheme} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate replace to="/admin/posts" />} />
          <Route path="posts" element={<AdminPostsPage />} />
          <Route path="collections" element={<AdminCollectionsPage />} />
          <Route path="about" element={<AdminAboutPage />} />
        </Route>
      </Routes>
      <MiniPlayer
        currentTrack={currentTrack}
        duration={playerDuration}
        isPlaying={isMiniPlayerPlaying}
        onClose={closeMiniPlayer}
        onScrub={scrubMiniPlayer}
        onTogglePlay={toggleMiniPlayer}
        progress={playerProgress}
      />
    </BrowserRouter>
  );
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      type="button"
    >
      {theme === "dark" ? "Pastel Mode" : "Midnight Mode"}
    </button>
  );
}

function PublicLayout({ hasAdminSession, theme, setTheme }) {
  return (
    <div className="page-shell">
      <header className="public-site-header">
        <Link className="site-mark" to="/">
          <span className="eyebrow">Suno Diary</span>
          <strong>Releases, collections, and notes in one place.</strong>
        </Link>
        <div className="public-site-actions">
          <nav className="site-nav" aria-label="Primary">
            <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/">
              Home
            </NavLink>
            <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/collections">
              Collections
            </NavLink>
            <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/explore">
              Explore
            </NavLink>
            <NavLink className={({ isActive }) => `site-nav-link${isActive ? " active" : ""}`} to="/about">
              About
            </NavLink>
          </nav>
          <ThemeToggle setTheme={setTheme} theme={theme} />
          {hasAdminSession ? (
            <Link className="site-admin-link" to="/admin">
              Manage Posts
            </Link>
          ) : (
            <Link className="site-admin-link" to="/admin/login">
              Admin Login
            </Link>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function PublicHome({ hasAdminSession, onPlayTrack }) {
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const featuredPost =
    posts.find((post) => normalizeTitle(post.title) === "hopes song") || posts[0] || null;
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

function CollectionsIndexPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollections() {
      try {
        const response = await fetch(`${apiBaseUrl}/collections`);
        const data = await response.json();
        setCollections(data.collections || []);
      } catch (error) {
        console.error("Failed to load collections", error);
      } finally {
        setLoading(false);
      }
    }

    loadCollections();
  }, []);

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <p className="eyebrow">Collections</p>
        <h1>Curated groups for verses, projects, moods, and recurring worlds.</h1>
        <p className="hero-copy">
          Collections give the archive stronger shape: some are emotional lanes, some are projects, and some are just
          the releases that clearly belong together.
        </p>
      </header>

      <main className="content-grid">
        <section>
          <div className="section-head">
            <h2>All Collections</h2>
            <span>{loading ? "Loading..." : `${collections.length} collections`}</span>
          </div>
          {collections.length === 0 && !loading ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Collections Yet</p>
              <h3>The archive is still taking shape.</h3>
              <p>Collections will appear here as soon as they are added.</p>
            </section>
          ) : (
            <div className="collection-grid collection-index-grid">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} showFeatured />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function CollectionDetailPage({ onPlayTrack }) {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [releases, setReleases] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFragmentSlug, setActiveFragmentSlug] = useState("");

  useEffect(() => {
    async function loadCollection() {
      try {
        const [collectionResponse, collectionsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/collections/${slug}`),
          fetch(`${apiBaseUrl}/collections`)
        ]);
        const data = await collectionResponse.json();
        const collectionsData = await collectionsResponse.json();

        if (!collectionResponse.ok) {
          throw new Error(data.message || "Failed to load collection.");
        }

        setCollection(data.collection);
        setReleases(data.releases || []);
        setCollections(collectionsData.collections || []);
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
  const fractureverseFeatured = fractureverseReleases.find((post) => post.slug === FRACTUREVERSE_FEATURED_SLUG) || featuredRelease;
  const fractureverseGrid = fractureverseReleases.filter((post) => post.slug !== fractureverseFeatured?.slug);
  const activeFragmentMeta =
    FRACTUREVERSE_METADATA[activeFragmentSlug] ||
    FRACTUREVERSE_METADATA[fractureverseFeatured?.slug] ||
    FRACTUREVERSE_METADATA[FRACTUREVERSE_FEATURED_SLUG];

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
            <section className="intro-card homepage-panel fracture-sequence-panel">
              <div className="section-head fractureverse-sequence-head">
                <h2>Observed Sequence</h2>
                <span>{fractureverseReleases.length} tracked fragments</span>
              </div>
              <div className="fracture-sequence-strip" onMouseLeave={() => setActiveFragmentSlug("")}>
                {fractureverseReleases.map((post) => {
                  const meta = getFractureverseMeta(post);
                  const isActive = activeFragmentSlug === post.slug;

                  if (!meta) {
                    return null;
                  }

                  return (
                    <Link
                      className={`fracture-sequence-node${isActive ? " active" : ""}`}
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
                  {activeFragmentMeta.fragmentId} / {activeFragmentMeta.signalType} / Linked echoes: {activeFragmentMeta.linkedTo.join(", ")}
                </p>
              ) : null}
            </section>
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
                    muted
                    text="This fragment is live as a written record first. Its video can arrive later."
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
                  <div className="featured-release-actions">
                    <button
                      className="secondary-button mini-player-trigger"
                      disabled={!hasVideo(fractureverseFeatured.videoUrl)}
                      onClick={() => onPlayTrack(fractureverseFeatured)}
                      type="button"
                    >
                      {hasVideo(fractureverseFeatured.videoUrl) ? "Play in Mini Player" : "Video Pending"}
                    </button>
                    <Link className="hero-link" to={`/release/${fractureverseFeatured.slug}`}>
                      Open Fragment
                    </Link>
                    <Link className="hero-link secondary-link" to={`/release/${fractureverseFeatured.slug}`}>
                      Read Fragment Record
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
              )
            ) : timelineReleases.length === 0 ? (
              <section className={`intro-card homepage-panel empty-state-card${isFractureverse ? " fracture-empty-state" : ""}`}>
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

function ExplorePage({ onPlayTrack }) {
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [loading, setLoading] = useState(true);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  useEffect(() => {
    async function loadExploreData() {
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
        console.error("Failed to load explore data", error);
      } finally {
        setLoading(false);
      }
    }

    loadExploreData();
  }, []);

  const filteredPosts = posts.filter((post) => {
    const matchesCollection =
      selectedCollection === "all" || (post.collectionSlugs || []).includes(selectedCollection);
    const searchHaystack = [post.title, post.excerpt, post.content, post.lyrics].join(" ").toLowerCase();
    const matchesQuery = !normalizedQuery || searchHaystack.includes(normalizedQuery);

    return matchesCollection && matchesQuery;
  });

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <div className="explore-hero-grid">
          <div>
            <p className="eyebrow">Explore</p>
            <h1>Search the archive by title, release notes, and collection.</h1>
            <p className="hero-copy">
              Explore is the utility layer of the site: search by phrase, switch lanes with collection filters, and
              move from loose memory to the exact release page you wanted.
            </p>
          </div>
          <div className="hero-note-card explore-summary-card">
            <p className="note-label">Search Surface</p>
            <label className="search-field">
              Find a release
              <input
                className="explore-search-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, notes, lyrics, and excerpts"
                type="search"
                value={query}
              />
            </label>
            <div className="collection-meta-row">
              <span className="meta-badge">{loading ? "..." : `${filteredPosts.length} matches`}</span>
              <span className="meta-badge subtle-badge">
                {selectedCollection === "all"
                  ? "All collections"
                  : collections.find((collection) => collection.slug === selectedCollection)?.title || "Filtered"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="intro-card homepage-panel explore-toolbar">
          <div className="filter-field">
            <p className="eyebrow">Filter By Collection</p>
            <div className="filter-chip-row">
              <button
                className={`filter-chip${selectedCollection === "all" ? " active" : ""}`}
                onClick={() => setSelectedCollection("all")}
                type="button"
              >
                All collections
              </button>
              {collections.map((collection) => (
                <button
                  className={`filter-chip${selectedCollection === collection.slug ? " active" : ""}`}
                  key={collection.id}
                  onClick={() => setSelectedCollection(collection.slug)}
                  type="button"
                >
                  {collection.title}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Results</h2>
            <span>{loading ? "Loading..." : `${filteredPosts.length} matches`}</span>
          </div>

          {!loading && filteredPosts.length === 0 ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Matches</p>
              <h3>Nothing lines up with that search yet.</h3>
              <p>Try a broader phrase or switch the collection filter back to all collections.</p>
            </section>
          ) : (
            <div className="results-grid">
              {filteredPosts.map((post) => (
                <ReleaseCard key={post.id} layout="horizontal" onPlayTrack={onPlayTrack} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function AboutPage() {
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

function PublicReleasePage({ hasAdminSession, onPlayTrack }) {
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
              {showLyrics ? <pre className="lyrics-block">{post.lyrics}</pre> : <p className="lyrics-placeholder">Open the lyrics when you want to read along.</p>}
            </section>
          ) : null}
        </main>
      ) : null}
    </>
  );
}

function MiniPlayer({ currentTrack, duration, isPlaying, onClose, onScrub, onTogglePlay, progress }) {
  if (!currentTrack) {
    return null;
  }

  return (
    <div className="mini-player-shell">
      <div className="mini-player-card">
        <div className="mini-player-copy">
          <p className="eyebrow">Now Playing</p>
          <h2>{currentTrack.title}</h2>
        </div>
        <div className="mini-player-controls">
          <button className="mini-player-button" onClick={onTogglePlay} type="button">
            {isPlaying ? "Pause" : "Play"}
          </button>
          <input
            className="mini-player-progress"
            max={duration || 0}
            min="0"
            onChange={onScrub}
            step="0.1"
            type="range"
            value={Math.min(progress, duration || 0)}
          />
          <span className="mini-player-time">
            {formatClock(progress)} / {formatClock(duration)}
          </span>
          <button className="mini-player-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ setHasAdminSession, theme, setTheme }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      localStorage.setItem(tokenKey, data.token);
      setHasAdminSession(true);
      navigate("/admin");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell auth-shell">
      <div className="auth-page-grid">
        <section className="hero homepage-hero auth-intro-panel">
          <div className="hero-header-row auth-header-row">
            <Link className="back-link" to="/">
              Back to site
            </Link>
            <ThemeToggle setTheme={setTheme} theme={theme} />
          </div>
          <p className="eyebrow">Admin Only</p>
          <h1>Step back into the archive and shape what visitors discover.</h1>
          <p className="hero-copy">
            The admin side manages releases, collections, and the About page. It should feel like the working room
            behind the public-facing archive, not a disconnected utility page.
          </p>
          <div className="hero-note-card auth-note-card">
            <p className="note-label">Inside The Workspace</p>
            <h2>Posts, collections, and site identity in one place.</h2>
            <p>Sign in to update release notes, curate collection shelves, and keep the archive voice consistent.</p>
          </div>
        </section>

        <form className="auth-card auth-login-card" onSubmit={handleSubmit}>
          <div className="auth-form-intro">
            <p className="eyebrow">Welcome Back</p>
            <h2>Admin Login</h2>
            <p>Use your admin credentials to manage the site.</p>
          </div>
          <label>
            Email
            <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label>
            Password
            <input onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit">{submitting ? "Signing in..." : "Login"}</button>
        </form>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem(tokenKey);

  if (!token) {
    return <Navigate replace to="/admin/login" />;
  }

  return children;
}

function AdminLayout({ setHasAdminSession, theme, setTheme }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [form, setForm] = useState(emptyPost);
  const [collectionForm, setCollectionForm] = useState(emptyCollection);
  const [aboutForm, setAboutForm] = useState(emptyAbout);
  const [editingId, setEditingId] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [collectionMessage, setCollectionMessage] = useState("");
  const [aboutMessage, setAboutMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);

  function authToken() {
    return localStorage.getItem(tokenKey);
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken()}`
    };
  }

  async function loadAdminData() {
    try {
      setLoading(true);
      setError("");
      const [postsResponse, collectionsResponse, siteContentResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/admin/posts`, { headers: authHeaders() }),
        fetch(`${apiBaseUrl}/admin/collections`, { headers: authHeaders() }),
        fetch(`${apiBaseUrl}/admin/site-content`, { headers: authHeaders() })
      ]);

      if (postsResponse.status === 401 || collectionsResponse.status === 401 || siteContentResponse.status === 401) {
        localStorage.removeItem(tokenKey);
        setHasAdminSession(false);
        navigate("/admin/login");
        return;
      }

      const postsData = await postsResponse.json();
      const collectionsData = await collectionsResponse.json();
      const siteContentData = await siteContentResponse.json();
      setPosts(postsData.posts || []);
      setCollections(collectionsData.collections || []);
      setAboutForm({ ...emptyAbout, ...(siteContentData.siteContent?.about || {}) });
    } catch (apiError) {
      setError("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCollectionForm(key, value) {
    setCollectionForm((current) => ({ ...current, [key]: value }));
  }

  function updateAboutForm(key, value) {
    setAboutForm((current) => ({ ...current, [key]: value }));
  }

  function togglePostCollection(slug) {
    setForm((current) => ({
      ...current,
      collectionSlugs: current.collectionSlugs.includes(slug)
        ? current.collectionSlugs.filter((entry) => entry !== slug)
        : [...current.collectionSlugs, slug]
    }));
  }

  function startEdit(post) {
    setEditingId(post.id);
    setSelectedVideoFile(null);
    setUploadError("");
    setForm({
      title: post.title,
      videoUrl: post.videoUrl,
      excerpt: post.excerpt,
      content: post.content,
      lyrics: post.lyrics,
      createdAt: post.createdAt,
      published: post.published,
      collectionSlugs: post.collectionSlugs || []
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCollectionEdit(collection) {
    setEditingCollectionId(collection.id);
    setCollectionForm({
      title: collection.title,
      description: collection.description,
      featuredReleaseSlug: collection.featuredReleaseSlug || "",
      theme: collection.theme || ""
    });
  }

  function resetPostForm() {
    setForm(emptyPost);
    setEditingId("");
    setSelectedVideoFile(null);
    setUploadError("");
  }

  function resetCollectionForm() {
    setCollectionForm(emptyCollection);
    setEditingCollectionId("");
  }

  async function handleVideoUpload() {
    if (!selectedVideoFile) {
      setUploadError("Choose a video file before uploading.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setSaveMessage("");

    try {
      const uploadForm = new FormData();
      uploadForm.append("video", selectedVideoFile);

      const response = await fetch(`${apiBaseUrl}/uploads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken()}`
        },
        body: uploadForm
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      updateField("videoUrl", data.videoUrl);
      setSaveMessage("Video uploaded. Save the release when you are ready.");
    } catch (apiError) {
      setUploadError(apiError.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const response = await fetch(editingId ? `${apiBaseUrl}/admin/posts/${editingId}` : `${apiBaseUrl}/admin/posts`, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Save failed.");
      }

      resetPostForm();
      setSaveMessage("Release saved successfully.");
      await loadAdminData();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCollectionSubmit(event) {
    event.preventDefault();
    setSavingCollection(true);
    setCollectionMessage("");
    setError("");

    try {
      const response = await fetch(
        editingCollectionId ? `${apiBaseUrl}/admin/collections/${editingCollectionId}` : `${apiBaseUrl}/admin/collections`,
        {
          method: editingCollectionId ? "PUT" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(collectionForm)
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Save failed.");
      }

      resetCollectionForm();
      setCollectionMessage("Collection saved successfully.");
      await loadAdminData();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSavingCollection(false);
    }
  }

  async function handleAboutSubmit(event) {
    event.preventDefault();
    setSavingAbout(true);
    setAboutMessage("");
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/admin/site-content/about`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(aboutForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Save failed.");
      }

      setAboutForm({ ...emptyAbout, ...(data.about || {}) });
      setAboutMessage("About page saved successfully.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSavingAbout(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;

    try {
      await fetch(`${apiBaseUrl}/admin/posts/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      await loadAdminData();
    } catch (apiError) {
      setError("Delete failed.");
    }
  }

  async function handleCollectionDelete(id) {
    const confirmed = window.confirm("Delete this collection?");
    if (!confirmed) return;

    try {
      await fetch(`${apiBaseUrl}/admin/collections/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      await loadAdminData();
    } catch (apiError) {
      setError("Collection delete failed.");
    }
  }

  function handleLogout() {
    localStorage.removeItem(tokenKey);
    setHasAdminSession(false);
    navigate("/admin/login");
  }

  return (
    <div className="page-shell">
      <header className="hero compact-hero admin-hero">
        <div className="admin-hero-copy">
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Manage Site Content</h1>
          <p className="admin-hero-note">Posts, collections, and about content in one workspace.</p>
        </div>
        <div className="hero-actions-row admin-hero-actions">
          <ThemeToggle setTheme={setTheme} theme={theme} />
          <Link className="hero-link secondary-link" to="/">
            View Site
          </Link>
          <button className="secondary-button" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </header>

      <nav className="admin-subnav" aria-label="Admin sections">
        <NavLink className="admin-subnav-link" to="/admin/posts">
          Posts
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/collections">
          Collections
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/about">
          About
        </NavLink>
      </nav>

      {error ? <p className="error-text admin-error-banner">{error}</p> : null}

      <Outlet
        context={{
          posts,
          collections,
          aboutForm,
          collectionForm,
          editingCollectionId,
          editingId,
          form,
          loading,
          saveMessage,
          collectionMessage,
          aboutMessage,
          saving,
          savingAbout,
          savingCollection,
          uploading,
          uploadError,
          selectedVideoFile,
          updateField,
          updateCollectionForm,
          updateAboutForm,
          togglePostCollection,
          setSelectedVideoFile,
          handleVideoUpload,
          handleSubmit,
          handleCollectionSubmit,
          handleAboutSubmit,
          handleDelete,
          handleCollectionDelete,
          startEdit,
          startCollectionEdit,
          resetPostForm,
          resetCollectionForm
        }}
      />
    </div>
  );
}

function AdminPostsPage() {
  const {
    collections,
    editingId,
    form,
    handleDelete,
    handleSubmit,
    handleVideoUpload,
    loading,
    posts,
    resetPostForm,
    saveMessage,
    saving,
    selectedVideoFile,
    setSelectedVideoFile,
    startEdit,
    togglePostCollection,
    updateField,
    uploadError,
    uploading
  } = useAdminContext();

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">Posts</p>
        <h2>Write, edit, and publish releases without the form feeling like an afterthought.</h2>
        <p>
          This section is the release workspace: upload media, shape the note behind the song, and place each release
          into the collections where it belongs.
        </p>
      </section>

      <section className="intro-card">
        <h2>{editingId ? "Edit Post" : "Create Post"}</h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Title
            <input onChange={(event) => updateField("title", event.target.value)} required value={form.title} />
          </label>
          <div className="full-span upload-panel">
            <label>
              Video File
              <input
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(event) => setSelectedVideoFile(event.target.files?.[0] || null)}
                type="file"
              />
            </label>
            <div className="upload-actions-row">
              <button onClick={handleVideoUpload} type="button">
                {uploading ? "Uploading..." : "Upload Video"}
              </button>
              <span className="upload-status">
                {selectedVideoFile
                  ? selectedVideoFile.name
                  : form.videoUrl
                    ? "Video uploaded and ready."
                    : "No video selected yet. You can still publish without one."}
              </span>
            </div>
            {form.videoUrl ? (
              <div className="video-preview-card">
                <p className="meta">Preview</p>
                <ReleaseMedia className="post-media" controls title={form.title || "Current Release"} videoUrl={form.videoUrl} />
                <p className="upload-status">Hosted URL ready for this release.</p>
              </div>
            ) : (
              <p className="upload-status">Publishing without a video will show a built-in “video pending” state until you add one.</p>
            )}
            {uploadError ? <p className="error-text">{uploadError}</p> : null}
          </div>
          <label className="full-span">
            Excerpt
            <textarea onChange={(event) => updateField("excerpt", event.target.value)} required rows="3" value={form.excerpt} />
          </label>
          <label className="full-span">
            Content
            <textarea onChange={(event) => updateField("content", event.target.value)} required rows="8" value={form.content} />
          </label>
          <label className="full-span">
            Lyrics
            <textarea onChange={(event) => updateField("lyrics", event.target.value)} rows="8" value={form.lyrics} />
          </label>
          <fieldset className="full-span collection-picker">
            <legend>Collections</legend>
            <div className="checkbox-pill-row">
              {collections.map((collection) => (
                <label className="checkbox-pill" key={collection.id}>
                  <input
                    checked={form.collectionSlugs.includes(collection.slug)}
                    onChange={() => togglePostCollection(collection.slug)}
                    type="checkbox"
                  />
                  <span>{collection.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="checkbox-field full-span">
            <input
              checked={form.published}
              onChange={(event) => updateField("published", event.target.checked)}
              type="checkbox"
            />
            <span>{form.videoUrl ? "Published" : "Published, even without a video yet"}</span>
          </label>
          <div className="full-span admin-form-actions">
            <button type="submit">{saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}</button>
            {editingId ? (
              <button className="secondary-button" onClick={resetPostForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
          {saveMessage ? <p className="success-text full-span">{saveMessage}</p> : null}
        </form>
      </section>

      <section>
        <div className="section-head">
          <h2>All Posts</h2>
          <span>{loading ? "Loading..." : `${posts.length} posts`}</span>
        </div>
        <div className="post-grid">
          {posts.map((post) => (
            <article className="post-card" key={post.id}>
              <ReleaseMedia
                className="post-media"
                compact
                controls
                text="This release is published first and waiting on its video upload."
                title={post.title}
                videoUrl={post.videoUrl}
              />
              <div className="post-body">
                <p className="meta">
                  {formatPostDate(post.createdAt)} | {post.published ? "Published" : "Draft"}
                </p>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="tag-row compact-tag-row">
                  {(post.collections || []).map((collection) => (
                    <span className="collection-chip static-chip" key={collection.slug}>
                      {collection.title}
                    </span>
                  ))}
                </div>
                <div className="admin-actions">
                  <button className="secondary-button" onClick={() => startEdit(post)} type="button">
                    Edit
                  </button>
                  <button className="danger-button" onClick={() => handleDelete(post.id)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminCollectionsPage() {
  const {
    collectionForm,
    collectionMessage,
    collections,
    editingCollectionId,
    handleCollectionDelete,
    handleCollectionSubmit,
    loading,
    posts,
    resetCollectionForm,
    savingCollection,
    startCollectionEdit,
    updateCollectionForm
  } = useAdminContext();

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">Collections</p>
        <h2>Define shelves, verses, and projects that make the archive feel curated.</h2>
        <p>
          Collections should read like distinct worlds. Use this section to name them clearly, describe their identity,
          and choose what leads the page.
        </p>
      </section>

      <section className="intro-card">
        <h2>{editingCollectionId ? "Edit Collection" : "Create Collection"}</h2>
        <form className="admin-form" onSubmit={handleCollectionSubmit}>
          <label>
            Title
            <input
              onChange={(event) => updateCollectionForm("title", event.target.value)}
              required
              value={collectionForm.title}
            />
          </label>
          <label>
            Featured Release
            <select
              onChange={(event) => updateCollectionForm("featuredReleaseSlug", event.target.value)}
              value={collectionForm.featuredReleaseSlug}
            >
              <option value="">None</option>
              {posts.map((post) => (
                <option key={post.id} value={post.slug}>
                  {post.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Theme
            <select onChange={(event) => updateCollectionForm("theme", event.target.value)} value={collectionForm.theme}>
              <option value="">Default</option>
              <option value="soft-archive">Soft Archive</option>
              <option value="fractureverse">Fractureverse</option>
              <option value="stage">Stage / Spotlight</option>
              <option value="signal">Signal / Broadcast</option>
            </select>
          </label>
          <label className="full-span">
            Description
            <textarea
              onChange={(event) => updateCollectionForm("description", event.target.value)}
              required
              rows="4"
              value={collectionForm.description}
            />
          </label>
          <div className="full-span admin-form-actions">
            <button type="submit">
              {savingCollection ? "Saving..." : editingCollectionId ? "Update Collection" : "Create Collection"}
            </button>
            {editingCollectionId ? (
              <button className="secondary-button" onClick={resetCollectionForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
          {collectionMessage ? <p className="success-text full-span">{collectionMessage}</p> : null}
        </form>
      </section>

      <section>
        <div className="section-head">
          <h2>Collections</h2>
          <span>{loading ? "Loading..." : `${collections.length} collections`}</span>
        </div>
        <div className="collection-grid">
          {collections.map((collection) => (
            <article className="intro-card homepage-panel collection-card" key={collection.id}>
              <p className="eyebrow">Collection</p>
              <h3>{collection.title}</h3>
              <p>{collection.description}</p>
              {collection.featuredReleaseSlug ? <p className="meta">Featured slug: {collection.featuredReleaseSlug}</p> : null}
              {collection.theme ? <p className="meta">Theme: {collection.theme}</p> : null}
              <div className="admin-actions">
                <button className="secondary-button" onClick={() => startCollectionEdit(collection)} type="button">
                  Edit
                </button>
                <button className="danger-button" onClick={() => handleCollectionDelete(collection.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminAboutPage() {
  const { aboutForm, aboutMessage, handleAboutSubmit, savingAbout, updateAboutForm } = useAdminContext();

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">About</p>
        <h2>Keep the artist and site voice aligned with the rest of the archive.</h2>
        <p>
          The About page explains the person, the music, and the reason the site exists. This editor should feel like a
          narrative surface, not just a text dump.
        </p>
      </section>

      <section className="intro-card">
        <h2>Edit About Page</h2>
        <form className="admin-form" onSubmit={handleAboutSubmit}>
          <label>
            Hero Eyebrow
            <input onChange={(event) => updateAboutForm("heroEyebrow", event.target.value)} value={aboutForm.heroEyebrow} />
          </label>
          <label className="full-span">
            Hero Title
            <textarea onChange={(event) => updateAboutForm("heroTitle", event.target.value)} required rows="3" value={aboutForm.heroTitle} />
          </label>
          <label className="full-span">
            Hero Text
            <textarea onChange={(event) => updateAboutForm("heroText", event.target.value)} required rows="4" value={aboutForm.heroText} />
          </label>
          <label>
            Artist Section Eyebrow
            <input onChange={(event) => updateAboutForm("artistEyebrow", event.target.value)} value={aboutForm.artistEyebrow} />
          </label>
          <label className="full-span">
            Artist Section Title
            <textarea onChange={(event) => updateAboutForm("artistTitle", event.target.value)} required rows="3" value={aboutForm.artistTitle} />
          </label>
          <label className="full-span">
            Artist Section Text
            <textarea onChange={(event) => updateAboutForm("artistText", event.target.value)} required rows="5" value={aboutForm.artistText} />
          </label>
          <label>
            Site Section Eyebrow
            <input onChange={(event) => updateAboutForm("siteEyebrow", event.target.value)} value={aboutForm.siteEyebrow} />
          </label>
          <label className="full-span">
            Site Section Title
            <textarea onChange={(event) => updateAboutForm("siteTitle", event.target.value)} required rows="3" value={aboutForm.siteTitle} />
          </label>
          <label className="full-span">
            Site Section Text
            <textarea onChange={(event) => updateAboutForm("siteText", event.target.value)} required rows="5" value={aboutForm.siteText} />
          </label>
          <label>
            Quote Eyebrow
            <input onChange={(event) => updateAboutForm("quoteEyebrow", event.target.value)} value={aboutForm.quoteEyebrow} />
          </label>
          <label className="full-span">
            Quote Title
            <textarea onChange={(event) => updateAboutForm("quoteTitle", event.target.value)} required rows="2" value={aboutForm.quoteTitle} />
          </label>
          <label className="full-span">
            Quote Text
            <textarea onChange={(event) => updateAboutForm("quoteText", event.target.value)} required rows="4" value={aboutForm.quoteText} />
          </label>
          <div className="full-span admin-form-actions">
            <button type="submit">{savingAbout ? "Saving..." : "Save About Page"}</button>
          </div>
          {aboutMessage ? <p className="success-text full-span">{aboutMessage}</p> : null}
        </form>
      </section>
    </main>
  );
}

function useAdminContext() {
  return useOutletContext();
}

function ReleaseCard({ post, onPlayTrack, layout = "card" }) {
  return (
    <Link className="release-card-link" to={`/release/${post.slug}`}>
      <article className={`post-card homepage-post-card release-feed-card ${layout === "horizontal" ? "result-card" : ""}`}>
        <div className="release-card-media">
          <ReleaseMedia
            className="post-media"
            compact
            muted
            text="This release is live now. The video can be attached later."
            title={post.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
          <div className="play-pill">{hasVideo(post.videoUrl) ? "Play" : "Video Pending"}</div>
          <div className="release-card-arrow">{hasVideo(post.videoUrl) ? "Play ->" : "Open ->"}</div>
        </div>
        <div className="post-body">
          <p className="meta">{formatPostDate(post.createdAt)}</p>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
          <div className="tag-row compact-tag-row">
            {(post.collections || []).map((collection) => (
              <span className="collection-chip static-chip" key={collection.slug}>
              {collection.title}
            </span>
          ))}
          </div>
          <div className="card-action-row">
            <button
              className="secondary-button mini-player-trigger"
              disabled={!hasVideo(post.videoUrl)}
              onClick={(event) => {
                event.preventDefault();
                onPlayTrack(post);
              }}
              type="button"
            >
              {hasVideo(post.videoUrl) ? "Play in Mini Player" : "Video Pending"}
            </button>
            {layout === "horizontal" ? <span className="result-card-cta">Open release</span> : null}
          </div>
        </div>
      </article>
    </Link>
  );
}

function TimelineCard({ index, onPlayTrack, post, themeConfig }) {
  return (
    <Link className="release-card-link" to={`/release/${post.slug}`}>
      <article className="post-card homepage-post-card release-feed-card timeline-card">
        <div className="release-card-media timeline-card-media">
          <ReleaseMedia
            className="post-media"
            compact
            muted
            text="This fragment has been published as writing first. The video can arrive later."
            title={post.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
        </div>
        <div className="post-body timeline-card-body">
          <p className="meta">
            {themeConfig.itemName} #{String(index + 1).padStart(2, "0")}
          </p>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
          <div className="card-action-row">
            <button
              className="secondary-button mini-player-trigger"
              disabled={!hasVideo(post.videoUrl)}
              onClick={(event) => {
                event.preventDefault();
                onPlayTrack(post);
              }}
              type="button"
            >
              {hasVideo(post.videoUrl) ? "Play in Mini Player" : "Video Pending"}
            </button>
            <span className="result-card-cta">{themeConfig.itemAction}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function FractureFragmentCard({ active, highlighted, meta, onFocusFragment, onPlayTrack, post }) {
  return (
    <Link
      className="release-card-link"
      onFocus={() => onFocusFragment(post.slug)}
      onMouseEnter={() => onFocusFragment(post.slug)}
      to={`/release/${post.slug}`}
    >
      <article
        className={`post-card homepage-post-card release-feed-card fracture-fragment-card fracture-${meta.state.toLowerCase()}${
          active ? " active" : ""
        }${highlighted ? " highlighted" : ""}`}
      >
        <div className="release-card-media fracture-fragment-media">
          <ReleaseMedia
            className="post-media"
            compact
            muted
            text={meta.systemNote}
            title={meta.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
        </div>
        <div className="post-body fracture-fragment-body">
          <p className="fracture-fragment-meta">
            {meta.fragmentId} / {meta.state} / {meta.perspective} / {meta.signalType}
          </p>
          <h3>{meta.title}</h3>
          <p>{meta.description}</p>
          <p className="fracture-relation-line">Linked to: {meta.linkedTo.join(", ")}</p>
          <p className="fracture-system-note">{meta.systemNote}</p>
          <div className="card-action-row">
            <button
              className="secondary-button mini-player-trigger"
              disabled={!hasVideo(post.videoUrl)}
              onClick={(event) => {
                event.preventDefault();
                onPlayTrack(post);
              }}
              type="button"
            >
              {hasVideo(post.videoUrl) ? "Play in Mini Player" : "Video Pending"}
            </button>
            <span className="result-card-cta">Open Fragment</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function CollectionCard({ collection, showFeatured = false }) {
  return (
    <Link className="collection-link" to={`/collections/${collection.slug}`}>
      <article className="intro-card homepage-panel collection-card">
        <div className="collection-card-topline">
          <p className="eyebrow">Collection</p>
          <span className="meta-badge subtle-badge">{collection.releaseCount} releases</span>
        </div>
        <h3>{collection.title}</h3>
        <p>{collection.description}</p>
        <div className="collection-meta-row">
          {collection.featuredRelease ? <span className="meta-badge subtle-badge">Featured release ready</span> : null}
          {collection.theme ? <span className="meta-badge subtle-badge">{collection.theme}</span> : null}
          <span className="collection-card-cta">Open shelf</span>
        </div>
        {showFeatured && collection.featuredRelease ? (
          <div className="featured-collection-panel">
            <p className="meta">Featured release</p>
            <strong>{collection.featuredRelease.title}</strong>
            <p>{collection.featuredRelease.excerpt}</p>
          </div>
        ) : null}
      </article>
    </Link>
  );
}

function formatPostDate(createdAt) {
  if (!createdAt) return "Unscheduled";
  return new Date(createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function normalizeTitle(title) {
  return (title || "").replace(/["']/g, "").trim().toLowerCase();
}

function formatClock(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export default App;
