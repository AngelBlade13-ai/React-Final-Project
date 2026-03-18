import { useEffect, useState } from "react";
import { apiBaseUrl, emptyAbout } from "../../lib/site";

export default function AboutPage() {
  const [about, setAbout] = useState(emptyAbout);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAbout() {
      try {
        const response = await fetch(`${apiBaseUrl}/about`);
        const data = await response.json();
        setAbout({ ...emptyAbout, ...(data.about || {}) });
      } catch (error) {
        console.error("Failed to load about content", error);
      } finally {
        setLoading(false);
      }
    }

    loadAbout();
  }, []);

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
