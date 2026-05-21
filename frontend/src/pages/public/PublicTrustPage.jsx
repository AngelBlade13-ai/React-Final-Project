import { Link } from "react-router-dom";
import usePageMetadata from "../../hooks/usePageMetadata";

export default function PublicTrustPage() {
  usePageMetadata({
    description:
      "How this archive handles accounts, comments, and your data.",
    title: "Community & Privacy"
  });

  return (
    <>
      <header className="hero homepage-hero section-hero">
        <p className="eyebrow">Trust</p>
        <h1>Community and privacy</h1>
        <p className="hero-copy">
          This is a personal music site with optional accounts and comments. The
          notes below explain what is stored and how to participate respectfully.
        </p>
      </header>

      <main className="content-grid about-grid">
        <section className="intro-card homepage-panel about-story-card">
          <p className="eyebrow">Privacy</p>
          <h2>What the site stores</h2>
          <p>
            If you create an account, the site keeps your display name, email,
            password hash, saved songs, recent listens, and reactions. Comments
            store the text you write and tie them to your account.
          </p>
          <p>
            Session cookies keep you signed in. The site does not sell your data
            or use third-party ad trackers.
          </p>
        </section>

        <section className="intro-card homepage-panel about-story-card">
          <p className="eyebrow">Community</p>
          <h2>Commenting guidelines</h2>
          <p>Be kind. Speak about the music, the feeling, or the story.</p>
          <p>
            Do not harass others, post spam, or share private information. The
            artist may hide or remove comments that break these guidelines.
          </p>
          <p>
            To report a comment, contact the site owner through the channel
            listed on the About page.
          </p>
        </section>

        <section className="intro-card homepage-panel about-story-card">
          <p className="eyebrow">Your choices</p>
          <h2>Accounts and deletion</h2>
          <p>
            You can update your display name or password from your account page.
            To remove your account or comments, contact the site owner.
          </p>
          <div className="hero-links-row">
            <Link className="hero-link" to="/account">
              Your account
            </Link>
            <Link className="hero-link secondary-link" to="/about">
              About the archive
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
