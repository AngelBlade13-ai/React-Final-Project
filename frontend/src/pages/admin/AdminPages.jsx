import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle";
import ReleaseMedia from "../../components/ReleaseMedia";
import { formatPostDate } from "../../lib/formatters";
import { apiBaseUrl, tokenKey } from "../../lib/site";
import { useAdminContext } from "../../layouts/AdminLayout";

export function AdminLogin({ setHasAdminSession, theme, setTheme }) {
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

export function AdminPostsPage() {
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
              <p className="upload-status">Publishing without a video will show a built-in "video pending" state until you add one.</p>
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

export function AdminCollectionsPage() {
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

export function AdminAboutPage() {
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
