import { CollectionCard } from "../../components/cards";
import { usePublicCollections } from "../../hooks/usePublicApi";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function CollectionsIndexPage() {
  useDocumentTitle("Collections");
  const { collections, isLoading: loading } = usePublicCollections();

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <p className="eyebrow">Collections</p>
        <h1>Curated entry points into the archive.</h1>
        <p className="hero-copy">
          The public collection layer stays focused on the main paths through the catalog while the deeper taxonomy
          remains available behind the scenes.
        </p>
      </header>

      <main className="content-grid">
        <section>
          <div className="section-head">
            <h2>Public Collections</h2>
            <span>{loading ? "Loading..." : `${collections.length} collections`}</span>
          </div>
          {collections.length === 0 && !loading ? (
            <section className="intro-card homepage-panel empty-state-card">
              <p className="eyebrow">No Collections Yet</p>
              <h3>The archive is still taking shape.</h3>
              <p>Collections will appear here as soon as they are added.</p>
            </section>
          ) : (
            <div className="collection-grid collection-index-grid">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} showFeatured />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
