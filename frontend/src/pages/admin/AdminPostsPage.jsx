import { useEffect, useMemo, useState } from "react";
import ReleaseMedia from "../../components/ReleaseMedia";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { formatPostDate } from "../../lib/formatters";
import { ORIGINAL_PERSONAL_SECTION_CONFIG, RELEASE_STATUSES, SOURCE_TAG_OPTIONS, WORLD_LAYER_OPTIONS } from "../../lib/site";
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

export default function AdminPostsPage() {
  useDocumentTitle("Admin Posts");
  const {
    collections,
    clearVideoSelection,
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
    toggleArchiveMetaLink,
    togglePostCollection,
    updateArchiveMetaField,
    updateField,
    uploadError,
    uploading
  } = useAdminContext();
  const fractureverseCollection = collections.find((collection) => collection.theme === "fractureverse");
  const eldoriaCollection = collections.find((collection) => collection.theme === "eldoria");
  const fractureverseCandidates = posts.filter((post) => post.id !== editingId && post.collectionSlugs?.includes(fractureverseCollection?.slug));
  const isFractureverseEntry =
    Boolean(fractureverseCollection) && form.collectionSlugs.includes(fractureverseCollection.slug);
  const isEldoriaEntry = Boolean(eldoriaCollection) && form.collectionSlugs.includes(eldoriaCollection.slug);
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
  const [activeMetadataTheme, setActiveMetadataTheme] = useState("");

  useEffect(() => {
    if (!metadataThemes.length) {
      setActiveMetadataTheme("");
      return;
    }

    if (!metadataThemes.some((entry) => entry.theme === activeMetadataTheme)) {
      setActiveMetadataTheme(metadataThemes[0].theme);
    }
  }, [activeMetadataTheme, metadataThemes]);

  const currentMetadataTheme =
    metadataThemes.find((entry) => entry.theme === activeMetadataTheme) || metadataThemes[0] || null;

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
              placeholder="Comma-separated tags"
              value={(form.themeTags || []).join(", ")}
            />
          </label>
          <label>
            Version Family
            <input
              onChange={(event) => updateField("versionFamily", event.target.value)}
              placeholder="Shared key for alternate versions"
              value={form.versionFamily}
            />
          </label>
          <label className="checkbox-field">
            <input
              checked={form.isPrimaryVersion}
              onChange={(event) => updateField("isPrimaryVersion", event.target.checked)}
              type="checkbox"
            />
            <span>Primary version</span>
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
              checked={form.isPubliclyVisible}
              onChange={(event) => updateField("isPubliclyVisible", event.target.checked)}
              type="checkbox"
            />
            <span>Publicly visible</span>
          </label>
          <label className="checkbox-field">
            <input
              checked={form.isArchive}
              onChange={(event) => updateField("isArchive", event.target.checked)}
              type="checkbox"
            />
            <span>Archive entry</span>
          </label>
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
          <fieldset className="full-span collection-picker archive-meta-panel">
            <legend>World Metadata</legend>
            <p className="upload-status">
              Optional archive fields for world-based collections. Choose a world below to edit the metadata that shape how the post reads inside that collection.
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
                Add this post to a themed collection like Fractureverse or Eldoria to unlock the matching metadata fields.
              </p>
            )}
          </fieldset>
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
                <p className="meta">
                  {post.isPrimaryVersion ? "Primary version" : "Alternate version"} | {post.isHomepageEligible ? "Homepage eligible" : "Homepage hidden"} |{" "}
                  {post.isArchive ? "Archive" : "Active"}
                </p>
                <p className="meta">Visibility: {post.isPubliclyVisible === false ? "Hidden from public" : "Publicly visible"}</p>
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
