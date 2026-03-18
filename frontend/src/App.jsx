import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MiniPlayer from "./components/MiniPlayer";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout, { ProtectedRoute } from "./layouts/AdminLayout";
import { themeKey } from "./lib/site";
import AdminAboutPage from "./pages/admin/AdminAboutPage";
import AdminCollectionsPage from "./pages/admin/AdminCollectionsPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminPostsPage from "./pages/admin/AdminPostsPage";
import AboutPage from "./pages/public/AboutPage";
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
  const [hasAdminSession, setHasAdminSession] = useState(() =>
    Boolean(localStorage.getItem("suno-blog-admin-token")),
  );
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
          element={
            <PublicLayout
              hasAdminSession={hasAdminSession}
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
              />
            }
          />
          <Route path="/collections" element={<CollectionsIndexPage />} />
          <Route
            path="/collections/:slug"
            element={<CollectionDetailPage onPlayTrack={playTrack} />}
          />
          <Route
            path="/explore"
            element={<ExplorePage onPlayTrack={playTrack} />}
          />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/release/:slug"
            element={
              <PublicReleasePage
                hasAdminSession={hasAdminSession}
                onPlayTrack={playTrack}
              />
            }
          />
        </Route>
        <Route
          path="/admin/login"
          element={
            <AdminLogin
              setHasAdminSession={setHasAdminSession}
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
                setHasAdminSession={setHasAdminSession}
                theme={theme}
                setTheme={setTheme}
              />
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

export default App;
