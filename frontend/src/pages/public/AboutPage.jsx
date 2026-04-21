import { useAboutContent } from "../../hooks/usePublicApi";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function AboutPage() {
  useDocumentTitle("About");
  const { about, isLoading: loading } = useAboutContent();

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <p className="eyebrow">{about.heroEyebrow}</p>
        <h1>{loading ? "Loading about page..." : about.heroTitle}</h1>
        <p className="hero-copy">{about.heroText}</p>
      </header>

      <main className="content-grid about-grid">
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
