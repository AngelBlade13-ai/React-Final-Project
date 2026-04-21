import { useEffect, useMemo, useState } from "react";
import ReleaseMedia from "../../components/ReleaseMedia";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatPostDate } from "../../lib/formatters";
import {
  apiBaseUrl,
  emptyPost,
  getReleaseStatus,
  ORIGINAL_PERSONAL_SECTION_CONFIG,
  RELEASE_STATUSES,
  SOURCE_TAG_OPTIONS,
  WORLD_LAYER_OPTIONS
} from "../../lib/site";
import { useAdminContext } from "../../layouts/AdminLayout";

const METADATA_THEME_COPY = {
  fractureverse: {
    label: "Fractureverse",
    intro: "Fragment-oriented fields for timeline IDs, state, perspective, and linked echoes."
  },
  eldoria: {
    label: "Eldoria",
    intro: "Chronicle-oriented fields for chapter identity, lore framing, and emotional annotation."
  }
};

const POST_EDITOR_SECTIONS = [
  {
    id: "essentials",
    label: "Essentials",
    description: "Title, writing, slug, and collection placement."
  },
  {
    id: "media",
    label: "Media",
    description: "Video upload, preview, and publish readiness."
  },
  {
    id: "catalog",
    label: "Catalog",
    description: "Status, versioning, taxonomy, and supersession."
  },
  {
    id: "world",
    label: "World",
    description: "Theme-specific archive metadata for immersive collections."
  },
  {
    id: "publish",
    label: "Publish",
    description: "Visibility, homepage intent, and final review."
  }
];

const LOCAL_DRAFT_STORAGE_KEY = "suno-blog-post-editor-drafts-v2";

function normalizeString(value) {
  return typeof value === "string" ? value : "";
}

function normalizeStringArray(values) {
  return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}

function buildPostSnapshot(source = {}) {
  const archiveMeta = source.archiveMeta || {};

  return {
    title: normalizeString(source.title),
    slug: normalizeString(source.slug),
    slugHistory: normalizeStringArray(source.slugHistory),
    videoUrl: normalizeString(source.videoUrl),
    excerpt: normalizeString(source.excerpt),
    content: normalizeString(source.content),
    lyrics: normalizeString(source.lyrics),
    subCategory: normalizeString(source.subCategory),
    sourceTag: normalizeString(source.sourceTag),
    worldLayer: normalizeString(source.worldLayer),
    themeTags: normalizeStringArray(source.themeTags),
    versionFamily: normalizeString(source.versionFamily),
    isPrimaryVersion: Boolean(source.isPrimaryVersion),
    isArchive: Boolean(source.isArchive),
    isHomepageEligible: Boolean(source.isHomepageEligible),
    isPubliclyVisible: source.isPubliclyVisible !== false,
    supersededBySlug: normalizeString(source.supersededBySlug),
    supersededReason: normalizeString(source.supersededReason),
    supersededAt: normalizeString(source.supersededAt),
    releaseStatus: RELEASE_STATUSES.includes(source.releaseStatus) ? source.releaseStatus : "canon",
    archiveMeta: {
      fragmentId: normalizeString(archiveMeta.fragmentId),
      state: normalizeString(archiveMeta.state),
      perspective: normalizeString(archiveMeta.perspective),
      signalType: normalizeString(archiveMeta.signalType),
      description: normalizeString(archiveMeta.description),
      systemNote: normalizeString(archiveMeta.systemNote),
      linkedSlugs: normalizeStringArray(archiveMeta.linkedSlugs),
      chapterNumber: normalizeString(archiveMeta.chapterNumber),
      entryType: normalizeString(archiveMeta.entryType),
      subtitle: normalizeString(archiveMeta.subtitle),
      openingPassage: normalizeString(archiveMeta.openingPassage),
      coreSituation: normalizeString(archiveMeta.coreSituation),
      coreTension: normalizeString(archiveMeta.coreTension),
      chronicleObservation: normalizeString(archiveMeta.chronicleObservation),
      chronicleContradiction: normalizeString(archiveMeta.chronicleContradiction),
      chronicleConclusion: normalizeString(archiveMeta.chronicleConclusion),
      emotionalState: normalizeString(archiveMeta.emotionalState),
      coreConflict: normalizeString(archiveMeta.coreConflict),
      risk: normalizeString(archiveMeta.risk),
      anchorQuote: normalizeString(archiveMeta.anchorQuote),
      resolution: normalizeString(archiveMeta.resolution),
      entryStatus: normalizeString(archiveMeta.entryStatus),
      playerFlavorLine: normalizeString(archiveMeta.playerFlavorLine)
    },
    createdAt: normalizeString(source.createdAt),
    published: Boolean(source.published),
    collectionSlugs: normalizeStringArray(source.collectionSlugs)
  };
}

function serializePostSnapshot(snapshot) {
  return JSON.stringify(buildPostSnapshot(snapshot));
}

function readDraftRegistry() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_DRAFT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readDraftEntry(key) {
  return readDraftRegistry()[key] || null;
}

function writeDraftRegistry(nextRegistry) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_DRAFT_STORAGE_KEY, JSON.stringify(nextRegistry));
}

function saveDraftEntry(key, entry) {
  const registry = readDraftRegistry();
  registry[key] = entry;
  writeDraftRegistry(registry);
}

function removeDraftEntry(key) {
  const registry = readDraftRegistry();
  if (!registry[key]) {
    return;
  }

  delete registry[key];
  writeDraftRegistry(registry);
}

function formatDraftTimestamp(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

function buildValidationState({ form, posts, editingId, isFractureverseEntry, isEldoriaEntry }) {
  const blocking = [];
  const advisory = [];
  const slug = String(form.slug || "").trim().toLowerCase();
  const title = String(form.title || "").trim();
  const excerpt = String(form.excerpt || "").trim();
  const content = String(form.content || "").trim();
  const duplicateSlug = slug
    ? posts.find((post) => String(post.id || "") !== String(editingId || "") && String(post.slug || "").trim().toLowerCase() === slug)
    : null;
  const supersededBySlug = String(form.supersededBySlug || "").trim();

  if (!title) {
    blocking.push({ section: "essentials", message: "Add a title before saving." });
  }

  if (!excerpt) {
    blocking.push({ section: "essentials", message: "Add an excerpt so cards and previews have summary copy." });
  }

  if (!content) {
    blocking.push({ section: "essentials", message: "Add release content or notes before saving." });
  }

  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    advisory.push({ section: "essentials", message: "Slug should stay URL-safe: lowercase letters, numbers, and hyphens only." });
  }

  if (duplicateSlug) {
    blocking.push({ section: "essentials", message: `Slug is already used by "${duplicateSlug.title}".` });
  }

  if (!form.collectionSlugs.length) {
    advisory.push({ section: "essentials", message: "No collections selected yet, so this release will be harder to surface intentionally." });
  }

  if (form.published && !form.videoUrl) {
    advisory.push({ section: "media", message: "This release is marked published without a hosted video." });
  }

  if (form.isHomepageEligible && getReleaseStatus(form) !== "canon") {
    advisory.push({ section: "catalog", message: "Homepage curation currently favors canon releases, so this flag may not take effect." });
  }

  if (form.isHomepageEligible && form.isPubliclyVisible === false) {
    advisory.push({ section: "publish", message: "A hidden release cannot appear on the homepage even if it is marked eligible." });
  }

  if (form.isPrimaryVersion && !String(form.versionFamily || "").trim()) {
    advisory.push({ section: "catalog", message: "Primary version is more useful when the release also has a version family key." });
  }

  if (supersededBySlug && supersededBySlug === slug) {
    blocking.push({ section: "catalog", message: "A release cannot supersede itself." });
  }

  if (supersededBySlug && !posts.some((post) => post.slug === supersededBySlug && post.id !== editingId)) {
    blocking.push({ section: "catalog", message: "Superseded-by slug does not match another release." });
  }

  if (isFractureverseEntry && !String(form.archiveMeta?.fragmentId || "").trim()) {
    advisory.push({ section: "world", message: "Fractureverse entries read better when they carry a fragment ID." });
  }

  if (isEldoriaEntry && !String(form.archiveMeta?.chapterNumber || "").trim()) {
    advisory.push({ section: "world", message: "Eldoria entries should usually carry a chapter number for world order." });
  }

  return { blocking, advisory };
}

function matchesPostCatalogFilters(post, filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const collectionSlug = String(filters.collectionSlug || "").trim();
  const releaseStatus = String(filters.releaseStatus || "").trim();
  const sourceTag = String(filters.sourceTag || "");
  const worldLayer = String(filters.worldLayer || "");
  const searchableText = [
    post.title,
    post.slug,
    post.excerpt,
    post.content,
    post.versionFamily,
    post.supersededBySlug,
    ...(post.themeTags || []),
    ...((post.collections || []).map((collection) => collection.title))
  ]
    .join(" ")
    .toLowerCase();

  if (search && !searchableText.includes(search)) {
    return false;
  }

  if (collectionSlug && !(post.collectionSlugs || []).includes(collectionSlug)) {
    return false;
  }

  if (releaseStatus && getReleaseStatus(post) !== releaseStatus) {
    return false;
  }

  if (sourceTag && String(post.sourceTag || "") !== sourceTag) {
    return false;
  }

  if (worldLayer && String(post.worldLayer || "") !== worldLayer) {
    return false;
  }

  return true;
}

export default function AdminPostsPage() {
  useDocumentTitle("Admin Posts");
  const {
    adminFetch,
    collections,
    clearVideoSelection,
    editingId,
    form,
    handleDelete,
    handleSubmit,
    handleVideoUpload,
    loadAdminData,
    loading,
    posts,
    replacePostForm,
    resetPostForm,
    saveMessage,
    saving,
    selectedVideoFile,
    setSelectedVideoFile,
    startEdit,
    toggleArchiveMetaLink,
    togglePostCollection,
    updateArchiveMetaField,
    updateField,
    uploadError,
    uploading
  } = useAdminContext();
  const [activeMetadataTheme, setActiveMetadataTheme] = useState("");
  const [activeSection, setActiveSection] = useState("essentials");
  const [storedDraft, setStoredDraft] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCollectionSlug, setCatalogCollectionSlug] = useState("");
  const [catalogReleaseStatus, setCatalogReleaseStatus] = useState("");
  const [catalogSourceTag, setCatalogSourceTag] = useState("");
  const [catalogWorldLayer, setCatalogWorldLayer] = useState("");
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [bulkVisibility, setBulkVisibility] = useState("__keep__");
  const [bulkArchive, setBulkArchive] = useState("__keep__");
  const [bulkHomepageEligibility, setBulkHomepageEligibility] = useState("__keep__");
  const [bulkReleaseStatus, setBulkReleaseStatus] = useState("__keep__");
  const [bulkSourceTag, setBulkSourceTag] = useState("__keep__");
  const [bulkWorldLayer, setBulkWorldLayer] = useState("__keep__");
  const [bulkCollectionOperation, setBulkCollectionOperation] = useState("");
  const [bulkCollectionSlug, setBulkCollectionSlug] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState("");

  const fractureverseCollection = collections.find((collection) => collection.theme === "fractureverse");
  const eldoriaCollection = collections.find((collection) => collection.theme === "eldoria");
  const isFractureverseEntry =
    Boolean(fractureverseCollection) && form.collectionSlugs.includes(fractureverseCollection.slug);
  const isEldoriaEntry = Boolean(eldoriaCollection) && form.collectionSlugs.includes(eldoriaCollection.slug);
  const fractureverseCandidates = useMemo(
    () => posts.filter((post) => post.id !== editingId && post.collectionSlugs?.includes(fractureverseCollection?.slug)),
    [editingId, fractureverseCollection?.slug, posts]
  );
  const supersededCandidates = useMemo(
    () =>
      posts
        .filter((post) => post.id !== editingId)
        .sort((left, right) => String(left.title || "").localeCompare(String(right.title || ""))),
    [editingId, posts]
  );
  const sortedPosts = useMemo(
    () => [...posts].sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || ""))),
    [posts]
  );
  const filteredPosts = useMemo(
    () =>
      sortedPosts.filter((post) =>
        matchesPostCatalogFilters(post, {
          search: catalogSearch,
          collectionSlug: catalogCollectionSlug,
          releaseStatus: catalogReleaseStatus,
          sourceTag: catalogSourceTag,
          worldLayer: catalogWorldLayer
        })
      ),
    [catalogCollectionSlug, catalogReleaseStatus, catalogSearch, catalogSourceTag, catalogWorldLayer, sortedPosts]
  );
  const themedCollections = useMemo(
    () =>
      collections.filter(
        (collection) => collection.theme && form.collectionSlugs.includes(collection.slug)
      ),
    [collections, form.collectionSlugs]
  );
  const metadataThemes = useMemo(
    () =>
      themedCollections.map((collection) => ({
        slug: collection.slug,
        theme: collection.theme,
        title: collection.title,
        label: METADATA_THEME_COPY[collection.theme]?.label || collection.title,
        intro:
          METADATA_THEME_COPY[collection.theme]?.intro ||
          "Theme-specific metadata fields for this collection."
      })),
    [themedCollections]
  );
  const currentMetadataTheme =
    metadataThemes.find((entry) => entry.theme === activeMetadataTheme) || metadataThemes[0] || null;
  const currentSnapshot = useMemo(() => buildPostSnapshot(form), [form]);
  const currentFingerprint = useMemo(() => serializePostSnapshot(currentSnapshot), [currentSnapshot]);
  const baselineSnapshot = useMemo(
    () => buildPostSnapshot(editingId ? posts.find((post) => post.id === editingId) || emptyPost : emptyPost),
    [editingId, posts]
  );
  const baselineFingerprint = useMemo(() => serializePostSnapshot(baselineSnapshot), [baselineSnapshot]);
  const hasPendingVideoSelection = Boolean(selectedVideoFile);
  const isDirty = currentFingerprint !== baselineFingerprint || hasPendingVideoSelection;
  const draftKey = editingId ? `post:${editingId}` : "post:new";
  const storedDraftFingerprint = useMemo(
    () => (storedDraft?.form ? serializePostSnapshot(storedDraft.form) : ""),
    [storedDraft]
  );
  const hasRestorableDraft = Boolean(storedDraft?.form) &&
    (storedDraftFingerprint !== currentFingerprint || (storedDraft?.hadPendingVideoSelection && !selectedVideoFile));
  const validation = useMemo(
    () =>
      buildValidationState({
        form: currentSnapshot,
        posts,
        editingId,
        isFractureverseEntry,
        isEldoriaEntry
      }),
    [currentSnapshot, editingId, isEldoriaEntry, isFractureverseEntry, posts]
  );
  const validationBySection = useMemo(
    () =>
      POST_EDITOR_SECTIONS.reduce((result, section) => {
        result[section.id] = [...validation.blocking, ...validation.advisory].filter((item) => item.section === section.id).length;
        return result;
      }, {}),
    [validation.advisory, validation.blocking]
  );
  const activeSectionMeta = POST_EDITOR_SECTIONS.find((section) => section.id === activeSection) || POST_EDITOR_SECTIONS[0];
  const selectedPostIdSet = useMemo(() => new Set(selectedPostIds), [selectedPostIds]);
  const allFilteredSelected = Boolean(filteredPosts.length) && filteredPosts.every((post) => selectedPostIdSet.has(post.id));

  useEffect(() => {
    if (!metadataThemes.length) {
      setActiveMetadataTheme("");
      return;
    }

    if (!metadataThemes.some((entry) => entry.theme === activeMetadataTheme)) {
      setActiveMetadataTheme(metadataThemes[0].theme);
    }
  }, [activeMetadataTheme, metadataThemes]);

  useEffect(() => {
    setActiveSection("essentials");
  }, [editingId]);

  useEffect(() => {
    setStoredDraft(readDraftEntry(draftKey));
  }, [draftKey]);

  useEffect(() => {
    const draftMatchesCurrent =
      Boolean(storedDraft?.form) && storedDraftFingerprint === currentFingerprint && !storedDraft?.hadPendingVideoSelection;

    if (isDirty || !draftMatchesCurrent) {
      return undefined;
    }

    removeDraftEntry(draftKey);
    setStoredDraft(null);
    return undefined;
  }, [currentFingerprint, draftKey, isDirty, storedDraft?.form, storedDraft?.hadPendingVideoSelection, storedDraftFingerprint]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const nextDraft = {
        savedAt: new Date().toISOString(),
        label: form.title || (editingId ? "Untitled release" : "New release"),
        hadPendingVideoSelection: hasPendingVideoSelection,
        form: currentSnapshot
      };

      saveDraftEntry(draftKey, nextDraft);
      setStoredDraft(nextDraft);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [currentSnapshot, draftKey, editingId, form.title, hasPendingVideoSelection, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const validPostIds = new Set(posts.map((post) => post.id));
    setSelectedPostIds((current) => current.filter((postId) => validPostIds.has(postId)));
  }, [posts]);

  function confirmAbandonChanges(actionLabel) {
    if (!isDirty) {
      return true;
    }

    return window.confirm(`You have unsaved changes in the post editor. Continue and ${actionLabel}?`);
  }

  function handleStartEdit(post) {
    if (post.id === editingId) {
      return;
    }

    if (!confirmAbandonChanges("load another release")) {
      return;
    }

    startEdit(post);
  }

  function handleResetEditor() {
    if (!confirmAbandonChanges(editingId ? "cancel this edit" : "clear the draft form")) {
      return;
    }

    resetPostForm();
  }

  function handleRestoreDraft() {
    if (!storedDraft?.form) {
      return;
    }

    if (isDirty && !window.confirm("Replace the current editor state with the locally autosaved draft?")) {
      return;
    }

    replacePostForm(storedDraft.form);
    setSelectedVideoFile(null);
    setActiveSection("essentials");
  }

  function handleDiscardDraft() {
    if (!storedDraft) {
      return;
    }

    removeDraftEntry(draftKey);
    setStoredDraft(null);
  }

  function togglePostSelection(postId) {
    setSelectedPostIds((current) =>
      current.includes(postId) ? current.filter((entry) => entry !== postId) : [...current, postId]
    );
  }

  function toggleSelectAllFiltered() {
    setSelectedPostIds((current) => {
      const currentSet = new Set(current);

      if (allFilteredSelected) {
        return current.filter((postId) => !filteredPosts.some((post) => post.id === postId));
      }

      filteredPosts.forEach((post) => currentSet.add(post.id));
      return Array.from(currentSet);
    });
  }

  function resetBulkActionForm() {
    setBulkVisibility("__keep__");
    setBulkArchive("__keep__");
    setBulkHomepageEligibility("__keep__");
    setBulkReleaseStatus("__keep__");
    setBulkSourceTag("__keep__");
    setBulkWorldLayer("__keep__");
    setBulkCollectionOperation("");
    setBulkCollectionSlug("");
  }

  async function handleBulkApply(event) {
    event.preventDefault();
    setBulkError("");
    setBulkMessage("");

    if (isDirty) {
      setBulkError("Save or reset the current editor changes before applying bulk catalog updates.");
      return;
    }

    if (!selectedPostIds.length) {
      setBulkError("Select at least one post before applying a bulk action.");
      return;
    }

    if (bulkCollectionOperation && !bulkCollectionSlug) {
      setBulkError("Choose a collection when applying a bulk add/remove collection action.");
      return;
    }

    const updates = {
      isPubliclyVisible: bulkVisibility,
      isArchive: bulkArchive,
      isHomepageEligible: bulkHomepageEligibility,
      releaseStatus: bulkReleaseStatus,
      sourceTag: bulkSourceTag,
      worldLayer: bulkWorldLayer,
      collectionOperation: bulkCollectionOperation,
      collectionSlug: bulkCollectionSlug
    };
    const hasUpdates = Object.values(updates).some((value) => value && value !== "__keep__");

    if (!hasUpdates) {
      setBulkError("Choose at least one catalog change before applying it.");
      return;
    }

    setBulkSubmitting(true);

    try {
      const response = await adminFetch(`${apiBaseUrl}/admin/posts/bulk-update`, {
        method: "POST",
        body: JSON.stringify({
          postIds: selectedPostIds,
          updates
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Bulk update failed.");
      }

      await loadAdminData();
      setSelectedPostIds([]);
      resetBulkActionForm();
      setBulkMessage(
        data.updatedCount
          ? `Updated ${data.updatedCount} selected release${data.updatedCount === 1 ? "" : "s"}.`
          : "Selected releases already matched the requested catalog state."
      );
    } catch (apiError) {
      setBulkError(apiError.message);
    } finally {
      setBulkSubmitting(false);
    }
  }

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">Posts</p>
        <h2>Turn the release editor into a real authoring workspace.</h2>
        <p>
          The editor is now split into deliberate sections, keeps a local draft as you work, and flags the issues that
          matter before you save.
        </p>
      </section>

      <section className="intro-card post-editor-shell-card">
        <div className="post-editor-header">
          <div>
            <p className="eyebrow">Editor v2</p>
            <h2>{editingId ? `Editing ${form.title || "Untitled Release"}` : "Create Post"}</h2>
            <p className="post-editor-header-copy">
              {editingId
                ? "Rework the release without losing your place. Tabs keep the metadata model readable instead of flattening it into one long form."
                : "Build a new release in sections so writing, media, taxonomy, and publishing decisions stay legible."}
            </p>
          </div>
          <div className="editor-status-row">
            <span className={`editor-status-pill${isDirty ? " is-dirty" : ""}`}>{isDirty ? "Unsaved changes" : "No unsaved changes"}</span>
            <span className="editor-status-pill">{editingId ? "Editing existing release" : "New release draft"}</span>
          </div>
        </div>

        <form className="post-editor-layout" onSubmit={handleSubmit}>
          <div className="post-editor-main">
            <div className="post-editor-tab-row" role="tablist" aria-label="Post editor sections">
              {POST_EDITOR_SECTIONS.map((section) => (
                <button
                  aria-selected={section.id === activeSection}
                  className={`post-editor-tab${section.id === activeSection ? " active" : ""}`}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <span>{section.label}</span>
                  <small>{section.description}</small>
                  {validationBySection[section.id] ? <strong>{validationBySection[section.id]} issue{validationBySection[section.id] === 1 ? "" : "s"}</strong> : null}
                </button>
              ))}
            </div>

            <section className="editor-section-card">
              <div className="editor-section-head">
                <div>
                  <p className="eyebrow">{activeSectionMeta.label}</p>
                  <h3>{activeSectionMeta.description}</h3>
                </div>
                {activeSection === "world" && metadataThemes.length ? (
                  <p className="editor-section-aside">
                    Editing metadata for {metadataThemes.length} themed collection{metadataThemes.length === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>

              {activeSection === "essentials" ? (
                <div className="editor-section-body">
                  <div className="admin-form">
                    <label>
                      Title
                      <input onChange={(event) => updateField("title", event.target.value)} required value={form.title} />
                    </label>
                    <label>
                      Slug
                      <input
                        onChange={(event) => updateField("slug", event.target.value)}
                        placeholder="Stable release URL"
                        value={form.slug}
                      />
                      <small className="input-help-text">Leave blank to derive from the title. Manual edits keep redirect history.</small>
                    </label>
                    {form.slugHistory?.length ? (
                      <p className="meta full-span">Redirecting old slugs: {form.slugHistory.join(", ")}</p>
                    ) : null}
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
                  </div>

                  <fieldset className="collection-picker">
                    <legend>Collections</legend>
                    <p className="upload-status">
                      Collection placement determines where this release appears, what world-specific metadata becomes available, and which journeys it can belong to later.
                    </p>
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
                </div>
              ) : null}

              {activeSection === "media" ? (
                <div className="editor-section-body">
                  <div className="upload-panel">
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
                      {form.videoUrl ? (
                        <button className="secondary-button" onClick={clearVideoSelection} type="button">
                          Remove Video
                        </button>
                      ) : null}
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
                </div>
              ) : null}

              {activeSection === "catalog" ? (
                <div className="editor-section-body">
                  <div className="admin-form">
                    <label>
                      Release Status
                      <select onChange={(event) => updateField("releaseStatus", event.target.value)} value={form.releaseStatus}>
                        {RELEASE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Version Family
                      <input
                        onChange={(event) => updateField("versionFamily", event.target.value)}
                        placeholder="Shared key for alternate versions"
                        value={form.versionFamily}
                      />
                    </label>
                    <label>
                      Subcategory
                      <select onChange={(event) => updateField("subCategory", event.target.value)} value={form.subCategory}>
                        <option value="">None / Auto</option>
                        {ORIGINAL_PERSONAL_SECTION_CONFIG.filter((section) => section.key !== "other").map((section) => (
                          <option key={section.key} value={section.key}>
                            {section.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Source Tag
                      <select onChange={(event) => updateField("sourceTag", event.target.value)} value={form.sourceTag}>
                        {SOURCE_TAG_OPTIONS.map((option) => (
                          <option key={option || "none"} value={option}>
                            {option || "None"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      World Layer
                      <select onChange={(event) => updateField("worldLayer", event.target.value)} value={form.worldLayer}>
                        {WORLD_LAYER_OPTIONS.map((option) => (
                          <option key={option || "none"} value={option}>
                            {option || "None"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="checkbox-field catalog-toggle-field">
                      <input
                        checked={form.isPrimaryVersion}
                        onChange={(event) => updateField("isPrimaryVersion", event.target.checked)}
                        type="checkbox"
                      />
                      <span>Primary version for this family</span>
                    </label>
                    <label className="full-span">
                      Theme Tags
                      <input
                        onChange={(event) =>
                          updateField(
                            "themeTags",
                            event.target.value
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="Comma-separated motifs or mood tags"
                        value={(form.themeTags || []).join(", ")}
                      />
                    </label>
                    <label>
                      Superseded By
                      <select onChange={(event) => updateField("supersededBySlug", event.target.value)} value={form.supersededBySlug}>
                        <option value="">Not superseded</option>
                        {supersededCandidates.map((post) => (
                          <option key={post.id} value={post.slug}>
                            {post.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Superseded At
                      <input
                        onChange={(event) => updateField("supersededAt", event.target.value)}
                        placeholder="2026-04-21T19:30:00Z"
                        value={form.supersededAt}
                      />
                    </label>
                    <label className="full-span">
                      Supersession Note
                      <textarea
                        onChange={(event) => updateField("supersededReason", event.target.value)}
                        placeholder="Why this release should route listeners toward a newer or primary version."
                        rows="3"
                        value={form.supersededReason}
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {activeSection === "world" ? (
                <div className="editor-section-body">
                  <fieldset className="collection-picker archive-meta-panel">
                    <legend>World Metadata</legend>
                    <p className="upload-status">
                      Optional archive fields for world-based collections. Choose a world below to edit the metadata that shape how the release reads inside that collection.
                    </p>
                    {metadataThemes.length ? (
                      <>
                        <div className="metadata-theme-switcher">
                          {metadataThemes.map((entry) => (
                            <button
                              className={`metadata-theme-pill${entry.theme === currentMetadataTheme?.theme ? " active" : ""}`}
                              key={entry.theme}
                              onClick={() => setActiveMetadataTheme(entry.theme)}
                              type="button"
                            >
                              <span>{entry.label}</span>
                              <small>{entry.title}</small>
                            </button>
                          ))}
                        </div>
                        {currentMetadataTheme ? (
                          <div className="metadata-theme-panel">
                            <p className="metadata-theme-intro">{currentMetadataTheme.intro}</p>
                            {currentMetadataTheme.theme === "fractureverse" ? (
                              <>
                                <div className="admin-form">
                                  <label>
                                    Fragment ID
                                    <input
                                      onChange={(event) => updateArchiveMetaField("fragmentId", event.target.value)}
                                      placeholder="F-03"
                                      value={form.archiveMeta.fragmentId}
                                    />
                                  </label>
                                  <label>
                                    State
                                    <input
                                      onChange={(event) => updateArchiveMetaField("state", event.target.value)}
                                      placeholder="Collapsed"
                                      value={form.archiveMeta.state}
                                    />
                                  </label>
                                  <label>
                                    Perspective
                                    <input
                                      onChange={(event) => updateArchiveMetaField("perspective", event.target.value)}
                                      placeholder="Angel"
                                      value={form.archiveMeta.perspective}
                                    />
                                  </label>
                                  <label>
                                    Signal Type
                                    <input
                                      onChange={(event) => updateArchiveMetaField("signalType", event.target.value)}
                                      placeholder="Primary"
                                      value={form.archiveMeta.signalType}
                                    />
                                  </label>
                                  <label className="full-span">
                                    World Description
                                    <textarea
                                      onChange={(event) => updateArchiveMetaField("description", event.target.value)}
                                      placeholder="A post-collapse fragment where trust failed..."
                                      rows="3"
                                      value={form.archiveMeta.description}
                                    />
                                  </label>
                                  <label className="full-span">
                                    System Note
                                    <textarea
                                      onChange={(event) => updateArchiveMetaField("systemNote", event.target.value)}
                                      placeholder="Collapse event stabilized through force of will..."
                                      rows="3"
                                      value={form.archiveMeta.systemNote}
                                    />
                                  </label>
                                </div>
                                {fractureverseCandidates.length ? (
                                  <div className="archive-link-picker">
                                    <p className="meta">Linked Fragments</p>
                                    <div className="checkbox-pill-row">
                                      {fractureverseCandidates.map((post) => (
                                        <label className="checkbox-pill" key={post.id}>
                                          <input
                                            checked={form.archiveMeta.linkedSlugs.includes(post.slug)}
                                            onChange={() => toggleArchiveMetaLink(post.slug)}
                                            type="checkbox"
                                          />
                                          <span>{post.title}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </>
                            ) : null}
                            {currentMetadataTheme.theme === "eldoria" ? (
                              <div className="admin-form">
                                <label>
                                  Chapter Number
                                  <input
                                    onChange={(event) => updateArchiveMetaField("chapterNumber", event.target.value)}
                                    placeholder="1"
                                    value={form.archiveMeta.chapterNumber}
                                  />
                                </label>
                                <label>
                                  Entry Type
                                  <input
                                    onChange={(event) => updateArchiveMetaField("entryType", event.target.value)}
                                    placeholder="Origin"
                                    value={form.archiveMeta.entryType}
                                  />
                                </label>
                                <label className="full-span">
                                  Subtitle
                                  <input
                                    onChange={(event) => updateArchiveMetaField("subtitle", event.target.value)}
                                    placeholder="The First Awakening"
                                    value={form.archiveMeta.subtitle}
                                  />
                                </label>
                                <label className="full-span">
                                  Opening Passage
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("openingPassage", event.target.value)}
                                    placeholder="Eldoria does not question her presence. It remembers her."
                                    rows="3"
                                    value={form.archiveMeta.openingPassage}
                                  />
                                </label>
                                <label className="full-span">
                                  Core Situation
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("coreSituation", event.target.value)}
                                    placeholder="A writer awakens inside the world she once created..."
                                    rows="3"
                                    value={form.archiveMeta.coreSituation}
                                  />
                                </label>
                                <label className="full-span">
                                  Core Tension
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("coreTension", event.target.value)}
                                    placeholder="Eldoria accepts her presence, but she remembers writing it."
                                    rows="3"
                                    value={form.archiveMeta.coreTension}
                                  />
                                </label>
                                <label className="full-span">
                                  Chronicle Observation
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("chronicleObservation", event.target.value)}
                                    placeholder="The subject displays no lived memory..."
                                    rows="3"
                                    value={form.archiveMeta.chronicleObservation}
                                  />
                                </label>
                                <label className="full-span">
                                  Chronicle Contradiction
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("chronicleContradiction", event.target.value)}
                                    placeholder="Identity does not align with recorded history."
                                    rows="3"
                                    value={form.archiveMeta.chronicleContradiction}
                                  />
                                </label>
                                <label className="full-span">
                                  Chronicle Conclusion
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("chronicleConclusion", event.target.value)}
                                    placeholder="The world is stable. The subject is not."
                                    rows="2"
                                    value={form.archiveMeta.chronicleConclusion}
                                  />
                                </label>
                                <label>
                                  Emotional State
                                  <input
                                    onChange={(event) => updateArchiveMetaField("emotionalState", event.target.value)}
                                    placeholder="Disorientation -> Impostor Syndrome -> Acceptance Under Pressure"
                                    value={form.archiveMeta.emotionalState}
                                  />
                                </label>
                                <label>
                                  Core Conflict
                                  <input
                                    onChange={(event) => updateArchiveMetaField("coreConflict", event.target.value)}
                                    placeholder="Truth vs Responsibility"
                                    value={form.archiveMeta.coreConflict}
                                  />
                                </label>
                                <label className="full-span">
                                  Risk
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("risk", event.target.value)}
                                    placeholder="If truth is revealed, belief structures collapse."
                                    rows="2"
                                    value={form.archiveMeta.risk}
                                  />
                                </label>
                                <label className="full-span">
                                  Anchor Quote
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("anchorQuote", event.target.value)}
                                    placeholder="I'm caught between two worlds tonight..."
                                    rows="2"
                                    value={form.archiveMeta.anchorQuote}
                                  />
                                </label>
                                <label className="full-span">
                                  Resolution
                                  <textarea
                                    onChange={(event) => updateArchiveMetaField("resolution", event.target.value)}
                                    placeholder="She does not accept the role. She does not reject it. She continues."
                                    rows="3"
                                    value={form.archiveMeta.resolution}
                                  />
                                </label>
                                <label>
                                  Entry Status
                                  <input
                                    onChange={(event) => updateArchiveMetaField("entryStatus", event.target.value)}
                                    placeholder="Unresolved"
                                    value={form.archiveMeta.entryStatus}
                                  />
                                </label>
                                <label>
                                  Player Flavor Line
                                  <input
                                    onChange={(event) => updateArchiveMetaField("playerFlavorLine", event.target.value)}
                                    placeholder="The crown was never meant for her..."
                                    value={form.archiveMeta.playerFlavorLine}
                                  />
                                </label>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="upload-status">
                        Add this release to a themed collection like Fractureverse or Eldoria to unlock the matching metadata fields.
                      </p>
                    )}
                  </fieldset>
                </div>
              ) : null}

              {activeSection === "publish" ? (
                <div className="editor-section-body">
                  <div className="admin-form">
                    <label className="checkbox-field">
                      <input
                        checked={form.published}
                        onChange={(event) => updateField("published", event.target.checked)}
                        type="checkbox"
                      />
                      <span>{form.videoUrl ? "Published" : "Published, even without a video yet"}</span>
                    </label>
                    <label className="checkbox-field">
                      <input
                        checked={form.isPubliclyVisible}
                        onChange={(event) => updateField("isPubliclyVisible", event.target.checked)}
                        type="checkbox"
                      />
                      <span>Publicly visible</span>
                    </label>
                    <label className="checkbox-field">
                      <input
                        checked={form.isHomepageEligible}
                        onChange={(event) => updateField("isHomepageEligible", event.target.checked)}
                        type="checkbox"
                      />
                      <span>Homepage eligible</span>
                    </label>
                    <label className="checkbox-field">
                      <input
                        checked={form.isArchive}
                        onChange={(event) => updateField("isArchive", event.target.checked)}
                        type="checkbox"
                      />
                      <span>Archive entry</span>
                    </label>
                  </div>

                  <div className="editor-review-grid">
                    <article className="editor-review-card">
                      <p className="meta">Route</p>
                      <strong>{form.slug ? `/release/${form.slug}` : "/release/<generated-from-title>"}</strong>
                      <p className="upload-status">Use a manual slug only when you need stable naming beyond the title.</p>
                    </article>
                    <article className="editor-review-card">
                      <p className="meta">Current status</p>
                      <strong>{form.releaseStatus || "canon"}</strong>
                      <p className="upload-status">
                        {form.isPubliclyVisible ? "Visible on public surfaces." : "Hidden from public surfaces."}
                      </p>
                    </article>
                    <article className="editor-review-card">
                      <p className="meta">Collections</p>
                      <strong>{form.collectionSlugs.length ? `${form.collectionSlugs.length} selected` : "None selected"}</strong>
                      <p className="upload-status">Selected collections drive world metadata and curated navigation later.</p>
                    </article>
                    <article className="editor-review-card">
                      <p className="meta">Media readiness</p>
                      <strong>{form.videoUrl ? "Hosted video ready" : "No hosted video yet"}</strong>
                      <p className="upload-status">
                        {selectedVideoFile ? `${selectedVideoFile.name} is staged locally.` : "File selection is not preserved in local drafts."}
                      </p>
                    </article>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="post-editor-sidebar">
            <div className="editor-sidebar-card post-editor-sticky">
              <p className="eyebrow">Save Status</p>
              <h3>{editingId ? "Current release state" : "New release state"}</h3>
              <p className="editor-sidebar-intro">
                Autosave protects your local draft while you work. The final save still happens only when you submit this form.
              </p>

              <div className="editor-status-stack">
                <div className="editor-mini-stat">
                  <span>Mode</span>
                  <strong>{editingId ? "Editing existing" : "Creating new"}</strong>
                </div>
                <div className="editor-mini-stat">
                  <span>Autosaved draft</span>
                  <strong>{storedDraft?.savedAt ? formatDraftTimestamp(storedDraft.savedAt) : "Not yet"}</strong>
                </div>
                <div className="editor-mini-stat">
                  <span>Section</span>
                  <strong>{activeSectionMeta.label}</strong>
                </div>
              </div>

              {storedDraft?.savedAt ? (
                <div className="editor-draft-panel">
                  <p className="meta">Local draft</p>
                  <p className="upload-status">
                    Saved {formatDraftTimestamp(storedDraft.savedAt)}
                    {storedDraft?.hadPendingVideoSelection ? ". File selections are not restorable and must be reattached." : "."}
                  </p>
                  <div className="admin-form-actions">
                    {hasRestorableDraft ? (
                      <button className="secondary-button" onClick={handleRestoreDraft} type="button">
                        Restore Draft
                      </button>
                    ) : null}
                    <button className="secondary-button" onClick={handleDiscardDraft} type="button">
                      Discard Local Draft
                    </button>
                  </div>
                </div>
              ) : null}

              <div className={`editor-validation-panel${validation.blocking.length ? " has-blocking" : ""}`}>
                <div className="editor-validation-head">
                  <div>
                    <p className="meta">Validation</p>
                    <strong>{validation.blocking.length ? "Fix blocking issues before saving" : "Save-ready"}</strong>
                  </div>
                  <span className="editor-validation-count">
                    {validation.blocking.length + validation.advisory.length} note{validation.blocking.length + validation.advisory.length === 1 ? "" : "s"}
                  </span>
                </div>
                {validation.blocking.length ? (
                  <div className="editor-validation-group">
                    <p className="meta">Blocking</p>
                    <div className="editor-issue-list">
                      {validation.blocking.map((item) => (
                        <button
                          className="editor-issue-link"
                          key={`blocking-${item.message}`}
                          onClick={() => setActiveSection(item.section)}
                          type="button"
                        >
                          <strong>{POST_EDITOR_SECTIONS.find((section) => section.id === item.section)?.label}</strong>
                          <span>{item.message}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {validation.advisory.length ? (
                  <div className="editor-validation-group">
                    <p className="meta">Advisory</p>
                    <div className="editor-issue-list">
                      {validation.advisory.map((item) => (
                        <button
                          className="editor-issue-link advisory"
                          key={`advisory-${item.message}`}
                          onClick={() => setActiveSection(item.section)}
                          type="button"
                        >
                          <strong>{POST_EDITOR_SECTIONS.find((section) => section.id === item.section)?.label}</strong>
                          <span>{item.message}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {saveMessage ? <p className="success-text">{saveMessage}</p> : null}

              <div className="admin-form-actions editor-actions-stack">
                <button disabled={saving || uploading || validation.blocking.length > 0} type="submit">
                  {saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}
                </button>
                <button className="secondary-button" onClick={handleResetEditor} type="button">
                  {editingId ? "Cancel Edit" : "Reset Draft"}
                </button>
              </div>
            </div>
          </aside>
        </form>
      </section>

      <section className="intro-card catalog-tools-panel">
        <div className="section-head">
          <div>
            <h2>Catalog Tools</h2>
            <p className="catalog-tools-copy">
              Search, narrow, select, and update multiple releases without manually opening them one by one.
            </p>
          </div>
          <span>{loading ? "Loading..." : `${filteredPosts.length} of ${posts.length} posts shown`}</span>
        </div>

        <div className="admin-form catalog-filter-grid">
          <label className="full-span">
            Search
            <input
              onChange={(event) => setCatalogSearch(event.target.value)}
              placeholder="Title, slug, excerpt, version family, theme tag..."
              value={catalogSearch}
            />
          </label>
          <label>
            Collection
            <select onChange={(event) => setCatalogCollectionSlug(event.target.value)} value={catalogCollectionSlug}>
              <option value="">All collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.slug}>
                  {collection.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Release Status
            <select onChange={(event) => setCatalogReleaseStatus(event.target.value)} value={catalogReleaseStatus}>
              <option value="">All statuses</option>
              {RELEASE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source Tag
            <select onChange={(event) => setCatalogSourceTag(event.target.value)} value={catalogSourceTag}>
              <option value="">All source tags</option>
              {SOURCE_TAG_OPTIONS.filter(Boolean).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            World Layer
            <select onChange={(event) => setCatalogWorldLayer(event.target.value)} value={catalogWorldLayer}>
              <option value="">All world layers</option>
              {WORLD_LAYER_OPTIONS.filter(Boolean).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <form className="catalog-bulk-panel" onSubmit={handleBulkApply}>
          <div className="catalog-selection-row">
            <button className="secondary-button" disabled={!filteredPosts.length} onClick={toggleSelectAllFiltered} type="button">
              {allFilteredSelected ? "Unselect Filtered" : "Select Filtered"}
            </button>
            <span>{selectedPostIds.length} selected</span>
          </div>

          <div className="admin-form catalog-bulk-grid">
            <label>
              Visibility
              <select onChange={(event) => setBulkVisibility(event.target.value)} value={bulkVisibility}>
                <option value="__keep__">No change</option>
                <option value="true">Set public</option>
                <option value="false">Set hidden</option>
              </select>
            </label>
            <label>
              Archive State
              <select onChange={(event) => setBulkArchive(event.target.value)} value={bulkArchive}>
                <option value="__keep__">No change</option>
                <option value="true">Mark archive</option>
                <option value="false">Mark active</option>
              </select>
            </label>
            <label>
              Homepage Eligibility
              <select onChange={(event) => setBulkHomepageEligibility(event.target.value)} value={bulkHomepageEligibility}>
                <option value="__keep__">No change</option>
                <option value="true">Make eligible</option>
                <option value="false">Remove eligibility</option>
              </select>
            </label>
            <label>
              Release Status
              <select onChange={(event) => setBulkReleaseStatus(event.target.value)} value={bulkReleaseStatus}>
                <option value="__keep__">No change</option>
                {RELEASE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source Tag
              <select onChange={(event) => setBulkSourceTag(event.target.value)} value={bulkSourceTag}>
                <option value="__keep__">No change</option>
                <option value="">Clear source tag</option>
                {SOURCE_TAG_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              World Layer
              <select onChange={(event) => setBulkWorldLayer(event.target.value)} value={bulkWorldLayer}>
                <option value="__keep__">No change</option>
                <option value="">Clear world layer</option>
                {WORLD_LAYER_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Collection Action
              <select onChange={(event) => setBulkCollectionOperation(event.target.value)} value={bulkCollectionOperation}>
                <option value="">No change</option>
                <option value="add">Add collection</option>
                <option value="remove">Remove collection</option>
              </select>
            </label>
            <label>
              Collection Target
              <select onChange={(event) => setBulkCollectionSlug(event.target.value)} value={bulkCollectionSlug}>
                <option value="">Choose collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.slug}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="catalog-bulk-footer">
            <div className="catalog-bulk-messages">
              {bulkError ? <p className="error-text">{bulkError}</p> : null}
              {bulkMessage ? <p className="success-text">{bulkMessage}</p> : null}
            </div>
            <div className="admin-form-actions">
              <button disabled={bulkSubmitting || !selectedPostIds.length} type="submit">
                {bulkSubmitting ? "Applying..." : "Apply Bulk Changes"}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  resetBulkActionForm();
                  setBulkError("");
                  setBulkMessage("");
                }}
                type="button"
              >
                Reset Bulk Actions
              </button>
            </div>
          </div>
        </form>
      </section>

      <section>
        <div className="section-head">
          <h2>All Posts</h2>
          <span>{loading ? "Loading..." : `${filteredPosts.length} posts`}</span>
        </div>
        <div className="post-grid">
          {filteredPosts.map((post) => (
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
                <label className="catalog-select-toggle">
                  <input
                    checked={selectedPostIdSet.has(post.id)}
                    onChange={() => togglePostSelection(post.id)}
                    type="checkbox"
                  />
                  <span>Select for bulk actions</span>
                </label>
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
                <p className="meta">
                  {post.isPrimaryVersion ? "Primary version" : "Alternate version"} | {post.isHomepageEligible ? "Homepage eligible" : "Homepage hidden"} |{" "}
                  {post.isArchive ? "Archive" : "Active"}
                </p>
                <p className="meta">Visibility: {post.isPubliclyVisible === false ? "Hidden from public" : "Publicly visible"}</p>
                <p className="meta">Slug: {post.slug}</p>
                {post.slugHistory?.length ? <p className="meta">Redirects: {post.slugHistory.join(", ")}</p> : null}
                <p className="meta">Release status: {post.releaseStatus || "canon"}</p>
                {post.versionFamily ? <p className="meta">Version family: {post.versionFamily}</p> : null}
                {post.subCategory ? <p className="meta">Subcategory: {post.subCategory}</p> : null}
                {post.sourceTag ? <p className="meta">Source tag: {post.sourceTag}</p> : null}
                {post.supersededBySlug ? <p className="meta">Superseded by: {post.supersededBySlug}</p> : null}
                {post.supersededReason ? <p className="meta">Supersession note: {post.supersededReason}</p> : null}
                {post.worldLayer ? <p className="meta">World layer: {post.worldLayer}</p> : null}
                {post.themeTags?.length ? <p className="meta">Theme tags: {post.themeTags.join(", ")}</p> : null}
                {post.archiveMeta?.fragmentId ? (
                  <p className="fracture-system-note">
                    {post.archiveMeta.fragmentId} / {post.archiveMeta.state || "Unclassified"} / {post.archiveMeta.signalType || "Record"}
                  </p>
                ) : post.archiveMeta?.chapterNumber ? (
                  <p className="fracture-system-note">
                    Chapter {post.archiveMeta.chapterNumber} / {post.archiveMeta.entryType || "Chronicle Entry"} / {post.archiveMeta.entryStatus || "Active"}
                  </p>
                ) : null}
                <div className="admin-actions">
                  <button
                    className="secondary-button"
                    disabled={post.id === editingId}
                    onClick={() => handleStartEdit(post)}
                    type="button"
                  >
                    {post.id === editingId ? "Editing" : "Edit"}
                  </button>
                  <button className="danger-button" onClick={() => handleDelete(post.id)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!filteredPosts.length ? <p className="form-helper-text">No posts match the current catalog filters.</p> : null}
      </section>
    </main>
  );
}
