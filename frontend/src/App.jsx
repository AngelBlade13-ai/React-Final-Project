import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MiniPlayer from "./components/MiniPlayer";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout, { ProtectedRoute } from "./layouts/AdminLayout";
import { apiBaseUrl, emptySiteSettings, getPreferredCollectionForPost, getThemeCssVariables, hasVideo, themeKey, tokenKey, userTokenKey } from "./lib/site";
import AdminAboutPage from "./pages/admin/AdminAboutPage";
import AdminCommentsPage from "./pages/admin/AdminCommentsPage";
import AdminCollectionsPage from "./pages/admin/AdminCollectionsPage";
import AdminInsightsPage from "./pages/admin/AdminInsightsPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminPostsPage from "./pages/admin/AdminPostsPage";
import AdminSitePage from "./pages/admin/AdminSitePage";
import AboutPage from "./pages/public/AboutPage";
import AccountPage from "./pages/public/AccountPage";
import CollectionDetailPage from "./pages/public/CollectionDetailPage";
import CollectionsIndexPage from "./pages/public/CollectionsIndexPage";
import ExplorePage from "./pages/public/ExplorePage";
import PublicHome from "./pages/public/PublicHome";
import PublicReleasePage from "./pages/public/PublicReleasePage";

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
  const [hasAdminSession, setHasAdminSession] = useState(() =>
    Boolean(localStorage.getItem("suno-blog-admin-token")),
  );
  const [userToken, setUserToken] = useState(() => localStorage.getItem(userTokenKey) || "");
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserSessionReady, setIsUserSessionReady] = useState(false);
  const [siteContent, setSiteContent] = useState(emptySiteSettings);
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
  const currentTrack = currentQueueIndex >= 0 ? playerQueue[currentQueueIndex] || null : null;

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

    const themeVars = getThemeCssVariables(activeCollectionTheme, activeTheme, siteContent);
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
    let cancelled = false;

    async function loadSiteContent() {
      try {
        const response = await fetch(`${apiBaseUrl}/site-content`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load site content.");
        }

        if (!cancelled) {
          setSiteContent({
            ...emptySiteSettings,
            ...(data.siteContent || {}),
            branding: {
              ...emptySiteSettings.branding,
              ...(data.siteContent?.branding || {})
            },
            home: {
              ...emptySiteSettings.home,
              ...(data.siteContent?.home || {})
            },
            collectionThemes: Array.isArray(data.siteContent?.collectionThemes)
              ? data.siteContent.collectionThemes
              : emptySiteSettings.collectionThemes
          });
        }
      } catch {
        if (!cancelled) {
          setSiteContent(emptySiteSettings);
        }
      }
    }

    loadSiteContent();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (userToken) {
      localStorage.setItem(userTokenKey, userToken);
      return;
    }

    localStorage.removeItem(userTokenKey);
  }, [userToken]);

  useEffect(() => {
    let isCancelled = false;

    async function loadCurrentUser() {
      if (!userToken) {
        if (!isCancelled) {
          setCurrentUser(null);
          setIsUserSessionReady(true);
        }
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Session expired.");
        }

        if (!isCancelled) {
          setCurrentUser(data.user || null);
        }
      } catch {
        if (!isCancelled) {
          setUserToken("");
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
  }, [userToken]);

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
      for (let index = startIndex + step; index >= 0 && index < queue.length; index += step) {
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
    for (let index = startIndex + step; index >= 0 && index < queue.length; index += step) {
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
    const requestedCollectionSlug = options.collectionSlug || preferredCollection?.slug || "";

    if (requestedCollectionSlug && queue.length <= 1) {
      try {
        const response = await fetch(`${apiBaseUrl}/collections/${requestedCollectionSlug}`);
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
      collectionId: collectionId || preferredCollection?.id || requestedCollectionSlug || track.slug,
      collectionName: collectionName || preferredCollection?.title || ""
    };
  }

  async function playTrack(track, options = {}) {
    const context = await resolvePlaybackContext(track, options);
    const trackIndex = Math.max(
      0,
      context.queue.findIndex((entry) => entry.slug === track.slug),
    );

    setPlayerQueue(context.queue);
    setCurrentQueueIndex(trackIndex);
    setPlayerCollectionId(context.collectionId);
    setPlayerCollectionName(context.collectionName);
    setPlayerProgress(0);
    setPlayerDuration(0);
    setIsMiniPlayerPlaying(hasVideo(track.videoUrl));
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

    const previousIndex = findAdjacentPlayableIndex(playerQueue, currentQueueIndex, -1);

    if (previousIndex !== -1) {
      playQueueIndex(previousIndex);
    }
  }

  function playNextTrack() {
    if (!currentTrack || currentQueueIndex === -1) {
      return;
    }

    const nextIndex = findAdjacentPlayableIndex(playerQueue, currentQueueIndex, 1);

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
    localStorage.removeItem(tokenKey);
    setHasAdminSession(false);
    setUserToken(payload?.token || "");
    setCurrentUser(payload?.user || null);
    setIsUserSessionReady(true);
  }

  function handleUserLogout() {
    setUserToken("");
    setCurrentUser(null);
    setIsUserSessionReady(true);
  }

  function handleAdminAuthSuccess() {
    localStorage.removeItem(userTokenKey);
    setUserToken("");
    setCurrentUser(null);
    setIsUserSessionReady(true);
    setHasAdminSession(true);
  }

  function handleAdminLogout() {
    localStorage.removeItem(tokenKey);
    setHasAdminSession(false);
  }

  const previousQueueIndex = findAdjacentPlayableIndex(playerQueue, currentQueueIndex, -1);
  const nextQueueIndex = findAdjacentPlayableIndex(playerQueue, currentQueueIndex, 1);
  const nextQueueTrack = nextQueueIndex !== -1 ? playerQueue[nextQueueIndex] : null;

  return (
    <BrowserRouter>
      <audio ref={audioRef} preload="metadata" />
      <Routes>
        <Route
          element={
            <PublicLayout
              currentUser={currentUser}
              hasAdminSession={hasAdminSession}
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
          <Route
            path="/account"
            element={
              <AccountPage
                currentUser={currentUser}
                hasAdminSession={hasAdminSession}
                isUserSessionReady={isUserSessionReady}
                onUserAuthSuccess={handleUserAuthSuccess}
                onUserLogout={handleUserLogout}
              />
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/release/:slug"
            element={
              <PublicReleasePage
                currentUser={currentUser}
                currentTrack={currentTrack}
                hasAdminSession={hasAdminSession}
                isPlayerActive={isMiniPlayerPlaying}
                onPlayTrack={playTrack}
                onUserAuthSuccess={handleUserAuthSuccess}
                onUserLogout={handleUserLogout}
                setActiveCollectionTheme={setActiveCollectionTheme}
                setForcedTheme={setForcedTheme}
                siteContent={siteContent}
                userToken={userToken}
              />
            }
          />
        </Route>
        <Route
          path="/admin/login"
          element={
            <AdminLogin
              onAdminAuthSuccess={handleAdminAuthSuccess}
              theme={theme}
              setTheme={setTheme}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout
                onAdminLogout={handleAdminLogout}
                theme={theme}
                setTheme={setTheme}
              />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate replace to="/admin/insights" />} />
          <Route path="insights" element={<AdminInsightsPage />} />
          <Route path="posts" element={<AdminPostsPage />} />
          <Route path="comments" element={<AdminCommentsPage />} />
          <Route path="collections" element={<AdminCollectionsPage />} />
          <Route path="about" element={<AdminAboutPage />} />
          <Route path="site" element={<AdminSitePage />} />
        </Route>
      </Routes>
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
        previousTrack={previousQueueIndex !== -1 ? playerQueue[previousQueueIndex] : null}
        progress={playerProgress}
        queueLength={playerQueue.length}
        siteContent={siteContent}
        volume={playerVolume}
      />
    </BrowserRouter>
  );
}

export default App;
