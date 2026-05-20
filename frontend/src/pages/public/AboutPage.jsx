import {
  PublicErrorState,
  PublicLoadingState
} from "../../components/PublicDataState";
import { useAboutContent } from "../../hooks/usePublicApi";
import usePageMetadata from "../../hooks/usePageMetadata";

export default function AboutPage() {
  const { about, error, isLoading: loading, retry } = useAboutContent();
  usePageMetadata({
    description:
      about.heroText ||
      about.siteText ||
      "Learn about the artist and the archive behind the songs.",
    title: "About"
  });

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <p className="eyebrow">{about.heroEyebrow}</p>
        <h1>{loading ? "Loading about page..." : about.heroTitle}</h1>
        <p className="hero-copy">{about.heroText}</p>
      </header>

      <main className="content-grid about-grid">
        {error ? (
          <PublicErrorState
            message={error.message}
            onRetry={retry}
            title="About content could not load"
          />
        ) : loading ? (
          <PublicLoadingState
            message="The artist and archive notes are being loaded."
            title="Loading about page"
          />
        ) : null}

        <section className="intro-card homepage-panel">
          <p className="eyebrow">{about.artistEyebrow}</p>
          <h2>{about.artistTitle}</h2>
          <p>{about.artistText}</p>
        </section>

        <section className="intro-card homepage-panel">
          <p className="eyebrow">{about.siteEyebrow}</p>
          <h2>{about.siteTitle}</h2>
          <p>{about.siteText}</p>
        </section>

        <section className="intro-card homepage-panel about-quote-card">
          <p className="eyebrow">{about.quoteEyebrow}</p>
          <h2>{about.quoteTitle}</h2>
          <p className="identity-line">{about.quoteText}</p>
        </section>
      </main>
    </>
  );
}
