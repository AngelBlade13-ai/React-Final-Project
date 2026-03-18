import { useAdminContext } from "../../layouts/AdminLayout";

export default function AdminAboutPage() {
  const { aboutForm, aboutMessage, handleAboutSubmit, savingAbout, updateAboutForm } = useAdminContext();

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">About</p>
        <h2>Keep the artist and site voice aligned with the rest of the archive.</h2>
        <p>
          The About page explains the person, the music, and the reason the site exists. This editor should feel like a
          narrative surface, not just a text dump.
        </p>
      </section>

      <section className="intro-card">
        <h2>Edit About Page</h2>
        <form className="admin-form" onSubmit={handleAboutSubmit}>
          <label>
            Hero Eyebrow
            <input onChange={(event) => updateAboutForm("heroEyebrow", event.target.value)} value={aboutForm.heroEyebrow} />
          </label>
          <label className="full-span">
            Hero Title
            <textarea onChange={(event) => updateAboutForm("heroTitle", event.target.value)} required rows="3" value={aboutForm.heroTitle} />
          </label>
          <label className="full-span">
            Hero Text
            <textarea onChange={(event) => updateAboutForm("heroText", event.target.value)} required rows="4" value={aboutForm.heroText} />
          </label>
          <label>
            Artist Section Eyebrow
            <input onChange={(event) => updateAboutForm("artistEyebrow", event.target.value)} value={aboutForm.artistEyebrow} />
          </label>
          <label className="full-span">
            Artist Section Title
            <textarea onChange={(event) => updateAboutForm("artistTitle", event.target.value)} required rows="3" value={aboutForm.artistTitle} />
          </label>
          <label className="full-span">
            Artist Section Text
            <textarea onChange={(event) => updateAboutForm("artistText", event.target.value)} required rows="5" value={aboutForm.artistText} />
          </label>
          <label>
            Site Section Eyebrow
            <input onChange={(event) => updateAboutForm("siteEyebrow", event.target.value)} value={aboutForm.siteEyebrow} />
          </label>
          <label className="full-span">
            Site Section Title
            <textarea onChange={(event) => updateAboutForm("siteTitle", event.target.value)} required rows="3" value={aboutForm.siteTitle} />
          </label>
          <label className="full-span">
            Site Section Text
            <textarea onChange={(event) => updateAboutForm("siteText", event.target.value)} required rows="5" value={aboutForm.siteText} />
          </label>
          <label>
            Quote Eyebrow
            <input onChange={(event) => updateAboutForm("quoteEyebrow", event.target.value)} value={aboutForm.quoteEyebrow} />
          </label>
          <label className="full-span">
            Quote Title
            <textarea onChange={(event) => updateAboutForm("quoteTitle", event.target.value)} required rows="2" value={aboutForm.quoteTitle} />
          </label>
          <label className="full-span">
            Quote Text
            <textarea onChange={(event) => updateAboutForm("quoteText", event.target.value)} required rows="4" value={aboutForm.quoteText} />
          </label>
          <div className="full-span admin-form-actions">
            <button type="submit">{savingAbout ? "Saving..." : "Save About Page"}</button>
          </div>
          {aboutMessage ? <p className="success-text full-span">{aboutMessage}</p> : null}
        </form>
      </section>
    </main>
  );
}
