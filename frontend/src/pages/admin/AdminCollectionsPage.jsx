import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useAdminContext } from "../../layouts/AdminLayout";

function matchesCollectionFilters(collection, filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const theme = String(filters.theme || "").trim();
  const visibility = String(filters.visibility || "").trim();
  const searchableText = [collection.title, collection.slug, collection.description, collection.featuredReleaseSlug].join(" ").toLowerCase();

  if (search && !searchableText.includes(search)) {
    return false;
  }

  if (theme && String(collection.theme || "") !== theme) {
    return false;
  }

  if (visibility === "public" && !collection.isPublicPrimary) {
    return false;
  }

  if (visibility === "internal" && collection.isPublicPrimary) {
    return false;
  }

  return true;
}

export default function AdminCollectionsPage() {
  useDocumentTitle("Admin Collections");
  const [searchParams] = useSearchParams();
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
  const [collectionSearch, setCollectionSearch] = useState(
    () => searchParams.get("slug") || searchParams.get("q") || ""
  );
  const [collectionThemeFilter, setCollectionThemeFilter] = useState("");
  const [collectionVisibilityFilter, setCollectionVisibilityFilter] = useState("");
  const activeCollection = editingCollectionId ? collections.find((collection) => collection.id === editingCollectionId) || null : null;
  const featuredCollectionSlug = activeCollection?.slug || collectionForm.slug;
  const featuredReleaseCandidates = posts.filter((post) => (post.collectionSlugs || []).includes(featuredCollectionSlug));
  const hasInvalidFeaturedSelection =
    collectionForm.featuredReleaseSlug &&
    !featuredReleaseCandidates.some((post) => post.slug === collectionForm.featuredReleaseSlug);
  const filteredCollections = useMemo(
    () =>
      collections
        .filter((collection) =>
          matchesCollectionFilters(collection, {
            search: collectionSearch,
            theme: collectionThemeFilter,
            visibility: collectionVisibilityFilter
          })
        )
        .sort((left, right) => String(left.title || "").localeCompare(String(right.title || ""))),
    [collectionSearch, collectionThemeFilter, collectionVisibilityFilter, collections]
  );

  useEffect(() => {
    setCollectionSearch(searchParams.get("slug") || searchParams.get("q") || "");
  }, [searchParams]);

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
            Slug
            <input
              onChange={(event) => updateCollectionForm("slug", event.target.value)}
              placeholder="Stable collection URL"
              value={collectionForm.slug}
            />
            <small className="input-help-text">Changing the slug preserves redirects from earlier collection URLs.</small>
          </label>
          {collectionForm.slugHistory?.length ? (
            <p className="meta full-span">Redirecting old slugs: {collectionForm.slugHistory.join(", ")}</p>
          ) : null}
          <label>
            Featured Release
            <select
              disabled={!featuredReleaseCandidates.length && !hasInvalidFeaturedSelection}
              onChange={(event) => updateCollectionForm("featuredReleaseSlug", event.target.value)}
              value={collectionForm.featuredReleaseSlug}
            >
              <option value="">None</option>
              {hasInvalidFeaturedSelection ? (
                <option value={collectionForm.featuredReleaseSlug}>{`Current selection no longer belongs to this collection (${collectionForm.featuredReleaseSlug})`}</option>
              ) : null}
              {featuredReleaseCandidates.map((post) => (
                <option key={post.id} value={post.slug}>
                  {post.title}
                </option>
              ))}
            </select>
          </label>
          <p className="meta full-span">
            {featuredReleaseCandidates.length
              ? `${featuredReleaseCandidates.length} release${featuredReleaseCandidates.length === 1 ? "" : "s"} currently belong to this collection.`
              : "Add releases to this collection in Posts before choosing a featured release."}
          </p>
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

      <section className="intro-card catalog-tools-panel">
        <div className="section-head">
          <div>
            <h2>Collection Catalog</h2>
            <p className="catalog-tools-copy">
              Narrow collection views by search, theme, and public/internal status so cleanup work stays manageable as the archive grows.
            </p>
          </div>
          <span>{loading ? "Loading..." : `${filteredCollections.length} of ${collections.length} collections shown`}</span>
        </div>
        <div className="admin-form catalog-filter-grid">
          <label className="full-span">
            Search
            <input
              onChange={(event) => setCollectionSearch(event.target.value)}
              placeholder="Title, slug, description, featured release..."
              value={collectionSearch}
            />
          </label>
          <label>
            Theme
            <select onChange={(event) => setCollectionThemeFilter(event.target.value)} value={collectionThemeFilter}>
              <option value="">All themes</option>
              {(siteSettingsForm.collectionThemes || []).map((themeProfile) => (
                <option key={themeProfile.key} value={themeProfile.key}>
                  {themeProfile.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Visibility
            <select onChange={(event) => setCollectionVisibilityFilter(event.target.value)} value={collectionVisibilityFilter}>
              <option value="">All collections</option>
              <option value="public">Public primary only</option>
              <option value="internal">Internal/archive only</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Collections</h2>
          <span>{loading ? "Loading..." : `${filteredCollections.length} collections`}</span>
        </div>
        <div className="collection-grid">
          {filteredCollections.map((collection) => (
            <article className="intro-card homepage-panel collection-card" key={collection.id}>
              <p className="eyebrow">Collection</p>
              <h3>{collection.title}</h3>
              <p>{collection.description}</p>
              <p className="meta">Slug: {collection.slug}</p>
              {collection.slugHistory?.length ? <p className="meta">Redirects: {collection.slugHistory.join(", ")}</p> : null}
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
        {!filteredCollections.length ? <p className="form-helper-text">No collections match the current catalog filters.</p> : null}
      </section>
    </main>
  );
}
