import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useAdminContext } from "../../layouts/AdminLayout";

export default function AdminCollectionsPage() {
  useDocumentTitle("Admin Collections");
  const {
    collectionForm,
    collectionMessage,
    collections,
    siteSettingsForm,
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
              <option value="">Default / Unassigned</option>
              {(siteSettingsForm.collectionThemes || []).map((themeProfile) => (
                <option key={themeProfile.key} value={themeProfile.key}>
                  {themeProfile.label}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-field">
            <input
              checked={Boolean(collectionForm.isPublicPrimary)}
              onChange={(event) => updateCollectionForm("isPublicPrimary", event.target.checked)}
              type="checkbox"
            />
            <span>Show as top-level public collection</span>
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
              <p className="meta">{collection.isPublicPrimary ? "Public primary collection" : "Internal/archive collection"}</p>
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
