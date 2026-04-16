import WorldThresholdLink from "../WorldThresholdLink";

export default function CollectionCard({ collection, showFeatured = false }) {
  const isEldoria = collection.theme === "eldoria";
  const isFractureverse = collection.theme === "fractureverse";
  const isWorld = isEldoria || isFractureverse;
  const isLibrary = collection.slug === "original-personal";
  const categoryLabel = isWorld ? "World" : isLibrary ? "Library" : "Collection";
  const ctaLabel = isWorld ? "Enter world" : isLibrary ? "Open library" : "Open collection";

  return (
    <WorldThresholdLink className="collection-link" theme={collection.theme} to={`/collections/${collection.slug}`}>
      <article
        className={`intro-card homepage-panel collection-card${isEldoria ? " eldoria-collection-card" : ""}${
          isFractureverse ? " fractureverse-collection-card" : ""
        }${isLibrary ? " library-collection-card" : ""}`}
      >
        <div className="collection-card-topline">
          <p className="eyebrow">{categoryLabel}</p>
          <span className="meta-badge subtle-badge">{collection.releaseCount} releases</span>
        </div>
        <h3>{collection.title}</h3>
        <p>{collection.description}</p>
        <div className="collection-meta-row">
          {collection.featuredRelease ? <span className="meta-badge subtle-badge">{isEldoria ? "Featured ballad ready" : "Featured release ready"}</span> : null}
          {collection.theme ? <span className="meta-badge subtle-badge">{collection.theme}</span> : null}
          <span className="collection-card-cta">{ctaLabel}</span>
        </div>
        {showFeatured && collection.featuredRelease ? (
          <div className="featured-collection-panel">
            <p className="meta">{isEldoria ? "Featured ballad" : "Featured release"}</p>
            <strong>{collection.featuredRelease.title}</strong>
            <p>{collection.featuredRelease.excerpt}</p>
          </div>
        ) : null}
      </article>
    </WorldThresholdLink>
  );
}
