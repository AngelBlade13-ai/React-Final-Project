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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(themeKey, theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicHome theme={theme} setTheme={setTheme} />} />
        <Route path="/posts/:slug" element={<PublicReleasePage theme={theme} setTheme={setTheme} />} />
        <Route path="/admin/login" element={<AdminLogin theme={theme} setTheme={setTheme} />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard theme={theme} setTheme={setTheme} />
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

function PublicHome({ theme, setTheme }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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
              <a className="hero-link" href="#recent-posts">
                Read Recent Posts
              </a>
              <Link className="hero-link secondary-link" to="/admin/login">
                Admin Login
              </Link>
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
        </section>

        <section id="recent-posts">
          <div className="section-head">
            <h2>Latest Entries</h2>
            <span>{loading ? "Loading..." : `${posts.length} posts`}</span>
          </div>

          <div className="post-grid">
            {posts.map((post) => (
              <article className="post-card homepage-post-card" key={post.id}>
                <video className="post-media" controls preload="metadata" src={post.videoUrl} />
                <div className="post-body">
                  <p className="meta">{formatPostDate(post.createdAt)}</p>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <Link className="card-link" to={`/posts/${post.slug}`}>
                    Read Entry
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function PublicReleasePage({ theme, setTheme }) {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <Link className="back-link" to="/">
            Back to home
          </Link>
          <ThemeToggle setTheme={setTheme} theme={theme} />
        </div>
        {loading ? <h1>Loading release...</h1> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {post ? (
          <div className="release-hero-copy">
            <p className="eyebrow">Release Entry</p>
            <h1>{post.title}</h1>
            <p className="hero-copy">{post.excerpt}</p>
            <p className="meta">{formatPostDate(post.createdAt)}</p>
          </div>
        ) : null}
      </header>

      {post ? (
        <main className="content-grid">
          <section className="intro-card homepage-panel">
            <video className="release-video" controls preload="metadata" src={post.videoUrl} />
          </section>

          <section className="intro-card homepage-panel">
            <p className="eyebrow">Release Note</p>
            <div className="release-prose">
              {post.content.split("\n").filter(Boolean).map((paragraph, index) => (
                <p key={`${post.id}-content-${index}`}>{paragraph}</p>
              ))}
            </div>
          </section>

          {post.lyrics ? (
            <section className="intro-card homepage-panel">
              <p className="eyebrow">Lyrics</p>
              <pre className="lyrics-block">{post.lyrics}</pre>
            </section>
          ) : null}
        </main>
      ) : null}
    </div>
  );
}

function AdminLogin({ theme, setTheme }) {
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

function AdminDashboard({ theme, setTheme }) {
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

export default App;
