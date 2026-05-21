import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MiniPlayer from "./components/MiniPlayer";
import RouteAnnouncer from "./components/RouteAnnouncer";
import {
  SiteMetadataProvider,
  defaultSiteMetadata
} from "./contexts/SiteMetadataContext";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout, { ProtectedRoute } from "./layouts/AdminLayout";
import { useSiteContent } from "./hooks/usePublicApi";
import {
  apiBaseUrl,
  getPreferredCollectionForPost,
  getThemeCssVariables,
  hasVideo,
  themeKey
} from "./lib/site";
import { withMutationIntent } from "./lib/api";

const AdminAboutPage = lazy(() => import("./pages/admin/AdminAboutPage"));
const AdminCommentsPage = lazy(() => import("./pages/admin/AdminCommentsPage"));
const AdminCollectionsPage = lazy(
  () => import("./pages/admin/AdminCollectionsPage")
);
const AdminInsightsPage = lazy(() => import("./pages/admin/AdminInsightsPage"));
const AdminNotFoundPage = lazy(() => import("./pages/admin/AdminNotFoundPage"));
const AdminPathsPage = lazy(() => import("./pages/admin/AdminPathsPage"));
const AdminPostsPage = lazy(() => import("./pages/admin/AdminPostsPage"));
const AdminSitePage = lazy(() => import("./pages/admin/AdminSitePage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const PublicTrustPage = lazy(() => import("./pages/public/PublicTrustPage"));
const AccountPage = lazy(() => import("./pages/public/AccountPage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const CollectionDetailPage = lazy(
  () => import("./pages/public/CollectionDetailPage")
);
const CollectionsIndexPage = lazy(
  () => import("./pages/public/CollectionsIndexPage")
);
const ExplorePage = lazy(() => import("./pages/public/ExplorePage"));
const GuidedPathPage = lazy(() => import("./pages/public/GuidedPathPage"));
const GuidedPathsIndexPage = lazy(
  () => import("./pages/public/GuidedPathsIndexPage")
);
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage"));
const PublicHome = lazy(() => import("./pages/public/PublicHome"));
const PublicReleasePage = lazy(
  () => import("./pages/public/PublicReleasePage")
);

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="content-grid route-loading-shell" role="alert">
          <section className="intro-card homepage-panel">
            <p className="eyebrow">Page Unavailable</p>
            <h2>This page could not load.</h2>
            <p>Refresh the page to try again.</p>
            <button
              className="hero-link"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh Page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function RouteFallback() {
  return (
    <main className="content-grid route-loading-shell" aria-live="polite">
      <section className="intro-card homepage-panel">
        <p className="eyebrow">Loading</p>
        <h2>Opening the next page.</h2>
      </section>
    </main>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(themeKey);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });
  const [forcedTheme, setForcedTheme] = useState(null);
  const [activeCollectionTheme, setActiveCollectionTheme] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserSessionReady, setIsUserSessionReady] = useState(false);
  const [playerQueue, setPlayerQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [playerCollectionId, setPlayerCollectionId] = useState("");
  const [playerCollectionName, setPlayerCollectionName] = useState("");
  const [isMiniPlayerPlaying, setIsMiniPlayerPlaying] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(0.78);
  const audioRef = useRef(null);
  const playerStateRef = useRef({ queue: [], index: -1 });
  const currentTrack =
    currentQueueIndex >= 0 ? playerQueue[currentQueueIndex] || null : null;
  const hasAdminSession = currentUser?.role === "admin";
  const isAdminSessionReady = isUserSessionReady;
  const { siteContent } = useSiteContent();
  const siteName =
    String(siteContent?.branding?.siteName || "").trim() ||
    defaultSiteMetadata.siteName;
  const siteDescription =
    String(siteContent?.home?.heroText || "").trim() ||
    defaultSiteMetadata.siteDescription;

  useEffect(() => {
    playerStateRef.current = { queue: playerQueue, index: currentQueueIndex };
  }, [playerQueue, currentQueueIndex]);

  const activeTheme = forcedTheme || theme;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", activeTheme);

    if (activeCollectionTheme) {
      root.setAttribute("data-collection-theme", activeCollectionTheme);
    } else {
      root.removeAttribute("data-collection-theme");
    }

    const themeVars = getThemeCssVariables(
      activeCollectionTheme,
      activeTheme,
      siteContent
    );
    const knownVars = [
      "--background",
      "--surface",
      "--surface-alt",
      "--text",
      "--muted-text",
      "--border",
      "--primary",
      "--primary-strong",
      "--secondary",
      "--player-progress-start",
      "--player-progress-mid",
      "--player-progress-end",
      "--player-progress-glow",
      "--player-progress-glow-strong",
      "--player-thumb",
      "--player-track",
      "--player-volume-track",
      "--player-volume-fill-start",
      "--player-volume-fill-end",
      "--player-volume-thumb",
      "--player-volume-thumb-glow"
    ];

    knownVars.forEach((cssVar) => {
      if (themeVars[cssVar]) {
        root.style.setProperty(cssVar, themeVars[cssVar]);
      } else {
        root.style.removeProperty(cssVar);
      }
    });
  }, [activeCollectionTheme, activeTheme, siteContent]);

  useEffect(() => {
    localStorage.setItem(themeKey, theme);
  }, [theme]);

  useEffect(() => {
    function handleUserUpdated(event) {
      setCurrentUser(event.detail || null);
      setIsUserSessionReady(true);
    }

    window.addEventListener("suno:user-updated", handleUserUpdated);

    return () => {
      window.removeEventListener("suno:user-updated", handleUserUpdated);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          credentials: "include"
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Session expired.");
        }

        if (!isCancelled) {
          setCurrentUser(data.user || null);
        }
      } catch {
        if (!isCancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsUserSessionReady(true);
        }
      }
    }

    setIsUserSessionReady(false);
    loadCurrentUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return undefined;
    }

    function syncTime() {
      setPlayerProgress(audio.currentTime || 0);
      setPlayerDuration(audio.duration || 0);
    }

    function findAdjacentPlayableIndex(queue, startIndex, step) {
      for (
        let index = startIndex + step;
        index >= 0 && index < queue.length;
        index += step
      ) {
        if (hasVideo(queue[index]?.videoUrl)) {
          return index;
        }
      }

      return -1;
    }

    function handleEnded() {
      const { queue, index } = playerStateRef.current;
      const nextIndex = findAdjacentPlayableIndex(queue, index, 1);

      if (nextIndex === -1) {
        setIsMiniPlayerPlaying(false);
        return;
      }

      setCurrentQueueIndex(nextIndex);
      setPlayerProgress(0);
      setPlayerDuration(0);
      setIsMiniPlayerPlaying(true);
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

    if (!audio) {
      return;
    }

    audio.volume = playerVolume;
  }, [playerVolume]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentTrack) {
      return;
    }

    if (!currentTrack.videoUrl) {
      audio.pause();
      setIsMiniPlayerPlaying(false);
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

  function findAdjacentPlayableIndex(queue, startIndex, step) {
    for (
      let index = startIndex + step;
      index >= 0 && index < queue.length;
      index += step
    ) {
      if (hasVideo(queue[index]?.videoUrl)) {
        return index;
      }
    }

    return -1;
  }

  function normalizeQueue(queue = []) {
    const seen = new Set();

    return queue.filter((track) => {
      const key = track?.slug || track?.id;

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  async function resolvePlaybackContext(track, options = {}) {
    let queue = normalizeQueue(options.queue || []);
    let collectionId = options.collectionId || "";
    let collectionName = options.collectionName || "";
    const preferredCollection = getPreferredCollectionForPost(track);
    const requestedCollectionSlug =
      options.collectionSlug || preferredCollection?.slug || "";

    if (requestedCollectionSlug && queue.length <= 1) {
      try {
        const response = await fetch(
          `${apiBaseUrl}/collections/${requestedCollectionSlug}`
        );
        const data = await response.json();

        if (response.ok) {
          queue = normalizeQueue(data.releases || []);
          collectionId = data.collection?.id || requestedCollectionSlug;
          collectionName = data.collection?.title || collectionName;
        }
      } catch {
        queue = [];
      }
    }

    if (!queue.length) {
      queue = [track];
    }

    if (!queue.some((entry) => entry.slug === track.slug)) {
      queue = normalizeQueue([track, ...queue]);
    }

    return {
      queue,
      collectionId:
        collectionId ||
        preferredCollection?.id ||
        requestedCollectionSlug ||
        track.slug,
      collectionName: collectionName || preferredCollection?.title || ""
    };
  }

  async function playTrack(track, options = {}) {
    const context = await resolvePlaybackContext(track, options);
    const trackIndex = Math.max(
      0,
      context.queue.findIndex((entry) => entry.slug === track.slug)
    );

    setPlayerQueue(context.queue);
    setCurrentQueueIndex(trackIndex);
    setPlayerCollectionId(context.collectionId);
    setPlayerCollectionName(context.collectionName);
    setPlayerProgress(0);
    setPlayerDuration(0);
    setIsMiniPlayerPlaying(hasVideo(track.videoUrl));

    if (currentUser && track?.slug) {
      fetch(`${apiBaseUrl}/auth/library/releases/${track.slug}/listen`, {
        method: "POST",
        credentials: "include",
        headers: withMutationIntent()
      })
        .then((response) => response.json().catch(() => ({})))
        .then((data) => {
          if (data.user) {
            setCurrentUser(data.user);
          }
        })
        .catch(() => {});
    }
  }

  function toggleMiniPlayer() {
    if (!currentTrack) return;
    setIsMiniPlayerPlaying((current) => !current);
  }

  function playQueueIndex(nextIndex, autoplay = true) {
    const nextTrack = playerQueue[nextIndex];

    if (!nextTrack) {
      return;
    }

    setCurrentQueueIndex(nextIndex);
    setPlayerProgress(0);
    setPlayerDuration(0);
    setIsMiniPlayerPlaying(autoplay && hasVideo(nextTrack.videoUrl));
  }

  function playPreviousTrack() {
    const audio = audioRef.current;

    if (!currentTrack || currentQueueIndex === -1) {
      return;
    }

    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setPlayerProgress(0);
      return;
    }

    const previousIndex = findAdjacentPlayableIndex(
      playerQueue,
      currentQueueIndex,
      -1
    );

    if (previousIndex !== -1) {
      playQueueIndex(previousIndex);
    }
  }

  function playNextTrack() {
    if (!currentTrack || currentQueueIndex === -1) {
      return;
    }

    const nextIndex = findAdjacentPlayableIndex(
      playerQueue,
      currentQueueIndex,
      1
    );

    if (nextIndex !== -1) {
      playQueueIndex(nextIndex);
    }
  }

  function closeMiniPlayer() {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    setPlayerQueue([]);
    setCurrentQueueIndex(-1);
    setPlayerCollectionId("");
    setPlayerCollectionName("");
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

  function adjustMiniPlayerVolume(event) {
    const nextVolume = Number(event.target.value);
    setPlayerVolume(nextVolume);
  }

  function handleUserAuthSuccess(payload) {
    setCurrentUser(payload?.user || null);
    setIsUserSessionReady(true);
  }

  async function handleUserLogout() {
    try {
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: withMutationIntent()
      });
    } catch {
      // Ignore logout transport failures and still clear local session state.
    }

    setCurrentUser(null);
    setIsUserSessionReady(true);
  }

  const previousQueueIndex = findAdjacentPlayableIndex(
    playerQueue,
    currentQueueIndex,
    -1
  );
  const nextQueueIndex = findAdjacentPlayableIndex(
    playerQueue,
    currentQueueIndex,
    1
  );
  const nextQueueTrack =
    nextQueueIndex !== -1 ? playerQueue[nextQueueIndex] : null;

  return (
    <SiteMetadataProvider siteDescription={siteDescription} siteName={siteName}>
      <BrowserRouter>
        <RouteAnnouncer />
        <video
          className="visually-hidden-media"
          playsInline
          preload="metadata"
          ref={audioRef}
        />
        <RouteErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route
                element={
                  <PublicLayout
                    currentUser={currentUser}
                    isThemeLocked={Boolean(forcedTheme)}
                    isUserSessionReady={isUserSessionReady}
                    onUserLogout={handleUserLogout}
                    siteContent={siteContent}
                    theme={theme}
                    setTheme={setTheme}
                  />
                }
              >
                <Route
                  index
                  element={
                    <PublicHome
                      hasAdminSession={hasAdminSession}
                      onPlayTrack={playTrack}
                      siteContent={siteContent}
                    />
                  }
                />
                <Route path="/collections" element={<CollectionsIndexPage />} />
                <Route
                  path="/collections/:slug"
                  element={
                    <CollectionDetailPage
                      currentTrack={currentTrack}
                      isPlayerActive={isMiniPlayerPlaying}
                      onPlayTrack={playTrack}
                      setActiveCollectionTheme={setActiveCollectionTheme}
                      setForcedTheme={setForcedTheme}
                      siteContent={siteContent}
                    />
                  }
                />
                <Route
                  path="/explore"
                  element={<ExplorePage onPlayTrack={playTrack} />}
                />
                <Route path="/paths" element={<GuidedPathsIndexPage />} />
                <Route
                  path="/paths/:slug"
                  element={
                    <GuidedPathPage
                      onPlayTrack={playTrack}
                      setActiveCollectionTheme={setActiveCollectionTheme}
                      setForcedTheme={setForcedTheme}
                    />
                  }
                />
                <Route
                  path="/account"
                  element={
                    <AccountPage
                      currentUser={currentUser}
                      isUserSessionReady={isUserSessionReady}
                      onUserAuthSuccess={handleUserAuthSuccess}
                      onUserLogout={handleUserLogout}
                    />
                  }
                />
                <Route
                  path="/login"
                  element={
                    <LoginPage
                      currentUser={currentUser}
                      isUserSessionReady={isUserSessionReady}
                      onUserAuthSuccess={handleUserAuthSuccess}
                    />
                  }
                />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/community" element={<PublicTrustPage />} />
                <Route
                  path="/release/:slug"
                  element={
                    <PublicReleasePage
                      currentUser={currentUser}
                      currentTrack={currentTrack}
                      hasAdminSession={hasAdminSession}
                      isPlayerActive={isMiniPlayerPlaying}
                      onPlayTrack={playTrack}
                      onUserLogout={handleUserLogout}
                      setActiveCollectionTheme={setActiveCollectionTheme}
                      setForcedTheme={setForcedTheme}
                      siteContent={siteContent}
                    />
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              <Route
                path="/admin/login"
                element={<Navigate replace to="/login" />}
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute
                    hasAdminSession={hasAdminSession}
                    isAdminSessionReady={isAdminSessionReady}
                  >
                    <AdminLayout
                      onAdminLogout={handleUserLogout}
                      theme={theme}
                      setTheme={setTheme}
                    />
                  </ProtectedRoute>
                }
              >
                <Route
                  index
                  element={<Navigate replace to="/admin/insights" />}
                />
                <Route path="insights" element={<AdminInsightsPage />} />
                <Route path="posts" element={<AdminPostsPage />} />
                <Route path="comments" element={<AdminCommentsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="collections" element={<AdminCollectionsPage />} />
                <Route path="paths" element={<AdminPathsPage />} />
                <Route path="about" element={<AdminAboutPage />} />
                <Route path="site" element={<AdminSitePage />} />
                <Route path="*" element={<AdminNotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
        <MiniPlayer
          currentTrack={currentTrack}
          collectionId={playerCollectionId}
          collectionName={playerCollectionName}
          currentIndex={currentQueueIndex}
          duration={playerDuration}
          isPlaying={isMiniPlayerPlaying}
          nextTrack={nextQueueTrack}
          onClose={closeMiniPlayer}
          onNext={playNextTrack}
          onPrevious={playPreviousTrack}
          onScrub={scrubMiniPlayer}
          onTogglePlay={toggleMiniPlayer}
          onVolumeChange={adjustMiniPlayerVolume}
          previousTrack={
            previousQueueIndex !== -1 ? playerQueue[previousQueueIndex] : null
          }
          progress={playerProgress}
          queueLength={playerQueue.length}
          siteContent={siteContent}
          volume={playerVolume}
        />
      </BrowserRouter>
    </SiteMetadataProvider>
  );
}

export default App;
