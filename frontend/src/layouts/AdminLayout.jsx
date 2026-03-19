import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { apiBaseUrl, emptyAbout, emptyCollection, emptyPost, tokenKey } from "../lib/site";

export function ProtectedRoute({ children }) {
  const token = localStorage.getItem(tokenKey);

  if (!token) {
    return <Navigate replace to="/admin/login" />;
  }

  return children;
}

export function useAdminContext() {
  return useOutletContext();
}

export default function AdminLayout({ setHasAdminSession, theme, setTheme }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [form, setForm] = useState({
    ...emptyPost,
    archiveMeta: { ...emptyPost.archiveMeta }
  });
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
    } catch {
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

  function updateArchiveMetaField(key, value) {
    setForm((current) => ({
      ...current,
      archiveMeta: {
        ...(current.archiveMeta || emptyPost.archiveMeta),
        [key]: value
      }
    }));
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

  function toggleArchiveMetaLink(slug) {
    setForm((current) => {
      const linkedSlugs = current.archiveMeta?.linkedSlugs || [];

      return {
        ...current,
        archiveMeta: {
          ...(current.archiveMeta || emptyPost.archiveMeta),
          linkedSlugs: linkedSlugs.includes(slug) ? linkedSlugs.filter((entry) => entry !== slug) : [...linkedSlugs, slug]
        }
      };
    });
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
      archiveMeta: {
        ...emptyPost.archiveMeta,
        ...(post.archiveMeta || {})
      },
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
    setForm({
      ...emptyPost,
      archiveMeta: { ...emptyPost.archiveMeta }
    });
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

  function clearVideoSelection() {
    setSelectedVideoFile(null);
    setUploadError("");
    setSaveMessage("");
    updateField("videoUrl", "");
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
    } catch {
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
    } catch {
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
          updateArchiveMetaField,
          updateCollectionForm,
          updateAboutForm,
          togglePostCollection,
          toggleArchiveMetaLink,
          setSelectedVideoFile,
          handleVideoUpload,
          clearVideoSelection,
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
