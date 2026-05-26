import { useCallback, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
  useOutletContext
} from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { withMutationIntent } from "../lib/api";
import {
  apiBaseUrl,
  DEFAULT_COLLECTION_THEME_PROFILES,
  emptyAbout,
  emptyCollection,
  emptyPost,
  emptySiteSettings,
  emptyThemeProfile,
  importerBaseUrl
} from "../lib/site";

export function ProtectedRoute({
  children,
  hasAdminSession,
  isAdminSessionReady
}) {
  if (!isAdminSessionReady) {
    return (
      <div className="page-shell admin-loading-shell">
        <section className="intro-card homepage-panel route-loading-card">
          <p className="eyebrow">Admin Session</p>
          <h2>Checking access.</h2>
          <p>
            Validating the current admin session before loading the dashboard.
          </p>
          <div aria-hidden="true" className="admin-loading-bars">
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
    );
  }

  if (!hasAdminSession) {
    return <Navigate replace to="/login" />;
  }

  return children;
}

export function useAdminContext() {
  return useOutletContext();
}

export default function AdminLayout({ onAdminLogout, theme, setTheme }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [form, setForm] = useState({
    ...emptyPost,
    archiveMeta: { ...emptyPost.archiveMeta }
  });
  const [collectionForm, setCollectionForm] = useState(emptyCollection);
  const [aboutForm, setAboutForm] = useState(emptyAbout);
  const [siteSettingsForm, setSiteSettingsForm] = useState(emptySiteSettings);
  const [themeProfileForm, setThemeProfileForm] = useState(emptyThemeProfile);
  const [editingId, setEditingId] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState("");
  const [editingThemeKey, setEditingThemeKey] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [collectionMessage, setCollectionMessage] = useState("");
  const [aboutMessage, setAboutMessage] = useState("");
  const [siteSettingsMessage, setSiteSettingsMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [savingSiteSettings, setSavingSiteSettings] = useState(false);
  const [importerLaunching, setImporterLaunching] = useState(false);
  const publishedPostCount = posts.filter((post) => post.published).length;
  const publicCollectionCount = collections.filter(
    (collection) => collection.isPublicPrimary
  ).length;

  const handleSessionExpired = useCallback(async () => {
    await Promise.resolve(onAdminLogout?.());
    navigate("/login");
  }, [navigate, onAdminLogout]);

  const adminFetch = useCallback(
    async (url, options = {}) => {
      const headers = { ...(options.headers || {}) };
      const hasBody = Object.prototype.hasOwnProperty.call(options, "body");
      const isFormData =
        typeof FormData !== "undefined" && options.body instanceof FormData;

      if (hasBody && !isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(
          String(options.method || "GET").toUpperCase()
        )
      ) {
        Object.assign(headers, withMutationIntent(headers));
      }

      const response = await fetch(url, {
        credentials: "include",
        cache: options.cache || "no-store",
        ...options,
        headers
      });

      if (response.status === 401 || response.status === 403) {
        await handleSessionExpired();
      }

      return response;
    },
    [handleSessionExpired]
  );

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const loadPosts = adminFetch(`${apiBaseUrl}/admin/posts`)
        .then((response) => response.json())
        .then((data) => {
          setPosts(data.posts || []);
          return data;
        });
      const loadCollections = adminFetch(`${apiBaseUrl}/admin/collections`)
        .then((response) => response.json())
        .then((data) => {
          setCollections(data.collections || []);
          return data;
        });
      const loadSiteContent = adminFetch(`${apiBaseUrl}/admin/site-content`)
        .then((response) => response.json())
        .then((data) => {
          setAboutForm({
            ...emptyAbout,
            ...(data.siteContent?.about || {})
          });
          setSiteSettingsForm({
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
              : emptySiteSettings.collectionThemes,
            guidedPaths: Array.isArray(data.siteContent?.guidedPaths)
              ? data.siteContent.guidedPaths
              : emptySiteSettings.guidedPaths
          });
          return data;
        });

      const results = await Promise.allSettled([
        loadPosts,
        loadCollections,
        loadSiteContent
      ]);

      if (results.some((result) => result.status === "rejected")) {
        setError("Some admin data failed to load. Refresh or switch sections.");
      }
    } catch {
      setError("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function replacePostForm(nextForm) {
    setForm({
      ...emptyPost,
      ...nextForm,
      archiveMeta: {
        ...emptyPost.archiveMeta,
        ...(nextForm?.archiveMeta || {})
      }
    });
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

  function updateSiteSettingsForm(section, key, value) {
    setSiteSettingsForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value
      }
    }));
  }

  function updateSiteSettingsRoot(key, value) {
    setSiteSettingsForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateThemeProfileField(key, value) {
    setThemeProfileForm((current) => ({ ...current, [key]: value }));
  }

  function updateThemeProfilePalette(mode, key, value) {
    setThemeProfileForm((current) => ({
      ...current,
      palette: {
        ...current.palette,
        [mode]: {
          ...current.palette[mode],
          [key]: value
        }
      }
    }));
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
          linkedSlugs: linkedSlugs.includes(slug)
            ? linkedSlugs.filter((entry) => entry !== slug)
            : [...linkedSlugs, slug]
        }
      };
    });
  }

  function startEdit(post) {
    setEditingId(post.id);
    setSelectedVideoFile(null);
    setUploadError("");
    setSaveMessage("");
    replacePostForm({
      title: post.title,
      slug: post.slug || "",
      slugHistory: Array.isArray(post.slugHistory) ? post.slugHistory : [],
      videoUrl: post.videoUrl,
      excerpt: post.excerpt,
      content: post.content,
      lyrics: post.lyrics,
      subCategory: post.subCategory || "",
      sourceTag: post.sourceTag || "",
      worldLayer: post.worldLayer || "",
      themeTags: Array.isArray(post.themeTags) ? post.themeTags : [],
      versionFamily: post.versionFamily || "",
      isPrimaryVersion: Boolean(post.isPrimaryVersion),
      isArchive: Boolean(post.isArchive),
      isHomepageEligible: Boolean(post.isHomepageEligible),
      isPubliclyVisible: post.isPubliclyVisible !== false,
      supersededBySlug: post.supersededBySlug || "",
      supersededReason: post.supersededReason || "",
      supersededAt: post.supersededAt || "",
      releaseStatus: post.releaseStatus || "canon",
      archiveMeta: post.archiveMeta || {},
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
      slug: collection.slug || "",
      slugHistory: Array.isArray(collection.slugHistory)
        ? collection.slugHistory
        : [],
      description: collection.description,
      featuredReleaseSlug: collection.featuredReleaseSlug || "",
      theme: collection.theme || "",
      themeTags: Array.isArray(collection.themeTags)
        ? collection.themeTags
        : [],
      worldLayers: Array.isArray(collection.worldLayers)
        ? collection.worldLayers
        : [],
      isPublicPrimary: Boolean(collection.isPublicPrimary)
    });
  }

  function resetPostForm() {
    replacePostForm(emptyPost);
    setEditingId("");
    setSelectedVideoFile(null);
    setUploadError("");
    setSaveMessage("");
  }

  function resetCollectionForm() {
    setCollectionForm(emptyCollection);
    setEditingCollectionId("");
  }

  function resetThemeProfileForm() {
    setThemeProfileForm(emptyThemeProfile);
    setEditingThemeKey("");
  }

  function startThemeProfileEdit(themeProfile) {
    setEditingThemeKey(themeProfile.key);
    setThemeProfileForm({
      ...emptyThemeProfile,
      ...themeProfile,
      palette: {
        light: {
          ...emptyThemeProfile.palette.light,
          ...(themeProfile.palette?.light || {})
        },
        dark: {
          ...emptyThemeProfile.palette.dark,
          ...(themeProfile.palette?.dark || {})
        }
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleThemeProfileSave() {
    if (!themeProfileForm.key || !themeProfileForm.label) {
      setError("Theme key and label are required.");
      return;
    }

    setError("");
    setSiteSettingsMessage("");

    setSiteSettingsForm((current) => {
      const nextThemes = [...(current.collectionThemes || [])];
      const existingIndex = nextThemes.findIndex(
        (entry) =>
          entry.key === editingThemeKey || entry.key === themeProfileForm.key
      );

      if (existingIndex >= 0) {
        nextThemes[existingIndex] = themeProfileForm;
      } else {
        nextThemes.push(themeProfileForm);
      }

      return {
        ...current,
        collectionThemes: nextThemes
      };
    });

    setSiteSettingsMessage(
      "Theme profile staged. Save site settings to publish it."
    );
    resetThemeProfileForm();
  }

  function handleThemeProfileDelete(themeKey) {
    const themeToDelete = (siteSettingsForm.collectionThemes || []).find(
      (entry) => entry.key === themeKey
    );
    const isBuiltInTheme = DEFAULT_COLLECTION_THEME_PROFILES.some(
      (entry) => entry.key === themeKey
    );

    if (themeToDelete?.kind === "immersive" || isBuiltInTheme) {
      setError("Built-in theme profiles cannot be deleted.");
      return;
    }

    const confirmed = window.confirm("Delete this theme profile?");
    if (!confirmed) {
      return;
    }

    setSiteSettingsForm((current) => ({
      ...current,
      collectionThemes: (current.collectionThemes || []).filter(
        (entry) => entry.key !== themeKey
      )
    }));

    if (editingThemeKey === themeKey) {
      resetThemeProfileForm();
    }

    setSiteSettingsMessage(
      "Theme profile removed. Save site settings to publish the change."
    );
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

      const response = await adminFetch(`${apiBaseUrl}/uploads`, {
        method: "POST",
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
      const response = await adminFetch(
        editingId
          ? `${apiBaseUrl}/admin/posts/${editingId}`
          : `${apiBaseUrl}/admin/posts`,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(form)
        }
      );
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
      const response = await adminFetch(
        editingCollectionId
          ? `${apiBaseUrl}/admin/collections/${editingCollectionId}`
          : `${apiBaseUrl}/admin/collections`,
        {
          method: editingCollectionId ? "PUT" : "POST",
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
      const response = await adminFetch(
        `${apiBaseUrl}/admin/site-content/about`,
        {
          method: "PUT",
          body: JSON.stringify(aboutForm)
        }
      );
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

  async function saveSiteSettingsDraft(nextSiteSettings = siteSettingsForm) {
    setSavingSiteSettings(true);
    setSiteSettingsMessage("");
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/admin/site-content/site`,
        {
          method: "PUT",
          body: JSON.stringify(nextSiteSettings)
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Save failed.");
      }

      const normalizedSiteSettings = {
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
          : emptySiteSettings.collectionThemes,
        guidedPaths: Array.isArray(data.siteContent?.guidedPaths)
          ? data.siteContent.guidedPaths
          : emptySiteSettings.guidedPaths
      };

      setSiteSettingsForm(normalizedSiteSettings);
      setSiteSettingsMessage("Site settings saved successfully.");
      return normalizedSiteSettings;
    } catch (apiError) {
      setError(apiError.message);
      return false;
    } finally {
      setSavingSiteSettings(false);
    }
  }

  async function handleSiteSettingsSubmit(event) {
    event.preventDefault();
    await saveSiteSettingsDraft();
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;

    try {
      const response = await adminFetch(`${apiBaseUrl}/admin/posts/${id}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed.");
      }

      await loadAdminData();
    } catch (apiError) {
      setError(apiError.message || "Delete failed.");
    }
  }

  async function handleCollectionDelete(id) {
    const confirmed = window.confirm("Delete this collection?");
    if (!confirmed) return;

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/admin/collections/${id}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Collection delete failed.");
      }

      await loadAdminData();
    } catch (apiError) {
      setError(apiError.message || "Collection delete failed.");
    }
  }

  async function handleLogout() {
    await Promise.resolve(onAdminLogout?.());
    navigate("/login");
  }

  async function handleOpenImporter() {
    const importerWindow = window.open("about:blank", "song-importer");

    try {
      setImporterLaunching(true);
      setError("");
      const response = await adminFetch(`${apiBaseUrl}/admin/importer/launch`, {
        method: "POST"
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to launch the importer.");
      }

      const url = data.importer?.url || importerBaseUrl;
      if (importerWindow) {
        importerWindow.location.href = url;
      } else {
        window.open(url, "_blank", "noreferrer");
      }
    } catch (apiError) {
      if (importerWindow) {
        importerWindow.close();
      }
      setError(apiError.message || "Failed to launch the importer.");
    } finally {
      setImporterLaunching(false);
    }
  }

  return (
    <div className="page-shell admin-shell">
      <header className="hero compact-hero admin-hero">
        <div className="admin-hero-copy">
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Manage Site Content</h1>
          <p className="admin-hero-note">
            Posts, collections, and about content in one workspace.
          </p>
        </div>
        <div className="hero-actions-row admin-hero-actions">
          <ThemeToggle setTheme={setTheme} theme={theme} />
          <button
            className="hero-link"
            disabled={importerLaunching}
            onClick={handleOpenImporter}
            title="Launch the local importer and open it in a new tab"
            type="button"
          >
            {importerLaunching ? "Opening Importer" : "Open Importer"}
          </button>
          <Link className="hero-link secondary-link" to="/">
            View Site
          </Link>
          <button
            className="secondary-button"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="admin-subnav" aria-label="Admin sections">
        <NavLink className="admin-subnav-link" to="/admin/insights">
          Insights
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/posts">
          Posts
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/comments">
          Comments
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/users">
          Users
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/collections">
          Collections
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/paths">
          Paths
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/ai-runtime">
          AI Runtime
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/system">
          System
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/about">
          About
        </NavLink>
        <NavLink className="admin-subnav-link" to="/admin/site">
          Site
        </NavLink>
      </nav>

      <section
        className="admin-status-strip"
        aria-label="Admin workspace status"
      >
        <div>
          <span className="eyebrow">Catalog</span>
          <strong>
            {loading ? "Loading" : `${publishedPostCount} published`}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Collections</span>
          <strong>
            {loading ? "Loading" : `${publicCollectionCount} public primary`}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Session</span>
          <strong>Protected</strong>
        </div>
      </section>

      {loading ? (
        <section className="admin-data-loading" aria-live="polite">
          <div>
            <p className="eyebrow">Loading Admin Data</p>
            <strong>Connecting to the content store.</strong>
            <span>Sections will fill in as their data arrives.</span>
          </div>
          <div aria-hidden="true" className="admin-loading-bars">
            <span />
            <span />
            <span />
          </div>
        </section>
      ) : null}

      {error ? <p className="error-text admin-error-banner">{error}</p> : null}

      <Outlet
        context={{
          posts,
          collections,
          aboutForm,
          siteSettingsForm,
          themeProfileForm,
          collectionForm,
          editingThemeKey,
          editingCollectionId,
          editingId,
          form,
          loading,
          saveMessage,
          collectionMessage,
          aboutMessage,
          siteSettingsMessage,
          saving,
          savingAbout,
          savingSiteSettings,
          savingCollection,
          uploading,
          uploadError,
          selectedVideoFile,
          adminFetch,
          loadAdminData,
          updateField,
          replacePostForm,
          updateArchiveMetaField,
          updateCollectionForm,
          updateAboutForm,
          updateSiteSettingsForm,
          updateSiteSettingsRoot,
          updateThemeProfileField,
          updateThemeProfilePalette,
          togglePostCollection,
          toggleArchiveMetaLink,
          setSelectedVideoFile,
          handleVideoUpload,
          clearVideoSelection,
          handleSubmit,
          handleCollectionSubmit,
          handleAboutSubmit,
          handleSiteSettingsSubmit,
          saveSiteSettingsDraft,
          handleDelete,
          handleCollectionDelete,
          startEdit,
          startCollectionEdit,
          resetPostForm,
          resetCollectionForm,
          resetThemeProfileForm,
          startThemeProfileEdit,
          handleThemeProfileSave,
          handleThemeProfileDelete
        }}
      />
    </div>
  );
}
