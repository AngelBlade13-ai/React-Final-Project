import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

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
  published: false
};

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(themeKey);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [hasAdminSession, setHasAdminSession] = useState(() => Boolean(localStorage.getItem(tokenKey)));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(themeKey, theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<PublicHome hasAdminSession={hasAdminSession} theme={theme} setTheme={setTheme} />}
        />
        <Route
          path="/release/:slug"
          element={<PublicReleasePage hasAdminSession={hasAdminSession} theme={theme} setTheme={setTheme} />}
        />
        <Route
          path="/admin/login"
          element={<AdminLogin setHasAdminSession={setHasAdminSession} theme={theme} setTheme={setTheme} />}
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard setHasAdminSession={setHasAdminSession} theme={theme} setTheme={setTheme} />
            </ProtectedRoute>
          }
        />
      </Routes>
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

function PublicHome({ hasAdminSession, theme, setTheme }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const featuredPost =
    posts.find((post) => normalizeTitle(post.title) === "hope's song") || posts[0] || null;
  const latestPosts = featuredPost ? posts.filter((post) => post.id !== featuredPost.id) : posts;

  useEffect(() => {
    async function loadPosts() {
      try {
        const response = await fetch(`${apiBaseUrl}/posts`);
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error("Failed to load posts", error);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, []);

  return (
    <div className="page-shell">
      <header className="hero homepage-hero">
        <div className="hero-header-row">
          <p className="eyebrow">Suno Diary</p>
          <ThemeToggle setTheme={setTheme} theme={theme} />
        </div>

        <div className="homepage-hero-grid">
          <div className="hero-copy-block">
            <h1>A quiet corner for my Suno releases, late-night drafts, and the stories behind each song.</h1>
            <p className="hero-copy">
              This is where I archive each release with a little more context: the finished track, the video version,
              lyric fragments, production notes, and whatever was happening around the song when it finally clicked.
            </p>

            <div className="hero-links-row">
              <a className="hero-link" href="#latest-releases">
                Explore Releases
              </a>
              {hasAdminSession ? (
                <Link className="hero-link secondary-link" to="/admin">
                  Manage Posts
                </Link>
              ) : (
                <Link className="hero-link secondary-link" to="/admin/login">
                  Admin Login
                </Link>
              )}
            </div>
          </div>

          <div className="hero-note-card">
            <p className="note-label">What Lives Here</p>
            <h2>Song drops, release notes, and the small details that make each track feel personal.</h2>
            <p>
              Think of it as part listening room, part notebook: a place for Suno posts, embedded media, lyric excerpts,
              and the creative notes that usually stay off the timeline.
            </p>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="intro-card homepage-panel">
          <p className="eyebrow">About This Blog</p>
          <h2>A personal home for releases, track stories, and behind-the-song notes</h2>
          <p>
            Each post is meant to hold more than a title card. Alongside the music, I want room for release context,
            visual uploads, process notes, and the little story fragments that give each post a life of its own.
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
                  <video className="featured-release-video" muted playsInline preload="metadata" src={featuredPost.videoUrl} />
                  <div className="release-card-overlay" />
                  <div className="play-pill featured-play-pill">Featured</div>
                </div>

                <div className="featured-release-copy">
                  <p className="eyebrow">New Drop</p>
                  <h3>{featuredPost.title}</h3>
                  <p className="featured-release-intro">An emotional release entry with the song front and center, followed by the note behind it.</p>
                  <p className="featured-release-excerpt">{featuredPost.excerpt}</p>
                  <p className="meta">{formatPostDate(featuredPost.createdAt)}</p>
                  <div className="featured-release-actions">
                    <span className="hero-link">Enter Release</span>
                  </div>
                </div>
              </article>
            </Link>
          </section>
        ) : null}

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
                <Link className="release-card-link" key={post.id} to={`/release/${post.slug}`}>
                  <article className="post-card homepage-post-card release-feed-card">
                    <div className="release-card-media">
                      <video className="post-media" muted playsInline preload="metadata" src={post.videoUrl} />
                      <div className="release-card-overlay" />
                      <div className="play-pill">Play</div>
                      <div className="release-card-arrow">{"Play ->"}</div>
                    </div>
                    <div className="post-body">
                      <p className="meta">{formatPostDate(post.createdAt)}</p>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function PublicReleasePage({ hasAdminSession, theme, setTheme }) {
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

  return (
    <div className="page-shell">
      <header className="hero homepage-hero release-hero">
        <div className="hero-header-row">
          <div className="public-page-links">
            <Link className="back-link" to="/">
              Back to home
            </Link>
            {hasAdminSession ? (
              <Link className="back-link" to="/admin">
                Manage Posts
              </Link>
            ) : null}
          </div>
          <ThemeToggle setTheme={setTheme} theme={theme} />
        </div>
        {loading ? <h1>Loading release...</h1> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {post ? (
          <div className="release-hero-layout">
            <div className="release-hero-media">
              <video className="release-video" controls preload="metadata" src={post.videoUrl} />
            </div>
            <div className="release-hero-copy">
              <p className="eyebrow">Release Entry</p>
              <h1>{post.title}</h1>
              <p className="release-hero-intro">A focused listening view for the video, the note behind it, and the words that shaped the release.</p>
              <p className="hero-copy">{post.excerpt}</p>
              <p className="meta">{formatPostDate(post.createdAt)}</p>
            </div>
          </div>
        ) : null}
      </header>

      {post ? (
        <main className="content-grid release-detail-grid">
          <section className="intro-card homepage-panel release-copy-panel">
            <p className="eyebrow">Release Note</p>
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
                  <p className="eyebrow">Lyrics</p>
                  <h2>Words behind the release</h2>
                </div>
                <button className="secondary-button lyrics-toggle" onClick={() => setShowLyrics((current) => !current)} type="button">
                  {showLyrics ? "Hide Lyrics" : "Show Lyrics"}
                </button>
              </div>
              {showLyrics ? <pre className="lyrics-block">{post.lyrics}</pre> : <p className="lyrics-placeholder">Open the lyrics when you want to read along.</p>}
            </section>
          ) : null}
        </main>
      ) : null}
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
    <div className="page-shell narrow-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="hero-header-row auth-header-row">
          <div>
            <p className="eyebrow">Admin Only</p>
            <h1>Login</h1>
          </div>
          <ThemeToggle setTheme={setTheme} theme={theme} />
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
        <Link className="back-link" to="/">
          Back to site
        </Link>
      </form>
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

function AdminDashboard({ setHasAdminSession, theme, setTheme }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyPost);
  const [editingId, setEditingId] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function authToken() {
    return localStorage.getItem(tokenKey);
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken()}`
    };
  }

  async function loadPosts() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${apiBaseUrl}/admin/posts`, {
        headers: authHeaders()
      });
      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem(tokenKey);
        setHasAdminSession(false);
        navigate("/admin/login");
        return;
      }

      setPosts(data.posts || []);
    } catch (apiError) {
      setError("Failed to load admin posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
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
      published: post.published
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    if (!form.videoUrl) {
      setSaving(false);
      setError("Upload a video before saving this release.");
      return;
    }

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

      setForm(emptyPost);
      setEditingId("");
      setSelectedVideoFile(null);
      setUploadError("");
      setSaveMessage("Release saved successfully.");
      await loadPosts();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
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
      await loadPosts();
    } catch (apiError) {
      setError("Delete failed.");
    }
  }

  function handleLogout() {
    localStorage.removeItem(tokenKey);
    setHasAdminSession(false);
    navigate("/admin/login");
  }

  return (
    <div className="page-shell">
      <header className="hero compact-hero">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Manage Posts</h1>
        </div>
        <div className="hero-actions-row">
          <ThemeToggle setTheme={setTheme} theme={theme} />
          <Link className="hero-link secondary-link" to="/">
            View Site
          </Link>
          <button className="secondary-button" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </header>

      <main className="admin-grid">
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
                  {selectedVideoFile ? selectedVideoFile.name : form.videoUrl ? "Video uploaded and ready." : "No video selected yet."}
                </span>
              </div>
              {form.videoUrl ? (
                <div className="video-preview-card">
                  <p className="meta">Preview</p>
                  <video className="post-media" controls preload="metadata" src={form.videoUrl} />
                  <p className="upload-status">Hosted URL ready for this release.</p>
                </div>
              ) : null}
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
            <label className="checkbox-field full-span">
              <input
                checked={form.published}
                onChange={(event) => updateField("published", event.target.checked)}
                type="checkbox"
              />
              <span>Published</span>
            </label>
            {saveMessage ? <p className="success-text full-span">{saveMessage}</p> : null}
            {error ? <p className="error-text full-span">{error}</p> : null}
            <button type="submit">{saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}</button>
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
                <video className="post-media" controls preload="metadata" src={post.videoUrl} />
                <div className="post-body">
                  <p className="meta">
                    {formatPostDate(post.createdAt)} | {post.published ? "Published" : "Draft"}
                  </p>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
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
    </div>
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

export default App;
