import { Link } from "react-router-dom";

export default function CollectionCard({ collection, showFeatured = false }) {
  const isEldoria = collection.theme === "eldoria";

  return (
    <Link className="collection-link" to={`/collections/${collection.slug}`}>
      <article className={`intro-card homepage-panel collection-card${isEldoria ? " eldoria-collection-card" : ""}`}>
        <div className="collection-card-topline">
          <p className="eyebrow">{isEldoria ? "World" : "Collection"}</p>
          <span className="meta-badge subtle-badge">{collection.releaseCount} releases</span>
        </div>
        <h3>{collection.title}</h3>
        <p>{collection.description}</p>
        <div className="collection-meta-row">
          {collection.featuredRelease ? <span className="meta-badge subtle-badge">{isEldoria ? "Featured ballad ready" : "Featured release ready"}</span> : null}
          {collection.theme ? <span className="meta-badge subtle-badge">{collection.theme}</span> : null}
          <span className="collection-card-cta">{isEldoria ? "Open chronicle" : "Open shelf"}</span>
        </div>
        {showFeatured && collection.featuredRelease ? (
          <div className="featured-collection-panel">
            <p className="meta">{isEldoria ? "Featured ballad" : "Featured release"}</p>
            <strong>{collection.featuredRelease.title}</strong>
            <p>{collection.featuredRelease.excerpt}</p>
          </div>
        ) : null}
      </article>
    </Link>
  );
}
