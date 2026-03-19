import ReleaseMedia from "../../components/ReleaseMedia";
import { formatPostDate } from "../../lib/formatters";
import { useAdminContext } from "../../layouts/AdminLayout";

export default function AdminPostsPage() {
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
    toggleArchiveMetaLink,
    togglePostCollection,
    updateArchiveMetaField,
    updateField,
    uploadError,
    uploading
  } = useAdminContext();
  const fractureverseCollection = collections.find((collection) => collection.theme === "fractureverse");
  const fractureverseCandidates = posts.filter((post) => post.id !== editingId && post.collectionSlugs?.includes(fractureverseCollection?.slug));
  const isFractureverseEntry =
    Boolean(fractureverseCollection) && form.collectionSlugs.includes(fractureverseCollection.slug);

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
          <fieldset className="full-span collection-picker archive-meta-panel">
            <legend>World Metadata</legend>
            <p className="upload-status">
              Optional archive fields for world-based collections. They matter most for Fractureverse, but they stay lean and can be left blank.
            </p>
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
            {isFractureverseEntry && fractureverseCandidates.length ? (
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
                {post.archiveMeta?.fragmentId ? (
                  <p className="fracture-system-note">
                    {post.archiveMeta.fragmentId} / {post.archiveMeta.state || "Unclassified"} / {post.archiveMeta.signalType || "Record"}
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
