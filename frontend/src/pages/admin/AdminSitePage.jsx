import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useAdminContext } from "../../layouts/AdminLayout";

export default function AdminSitePage() {
  useDocumentTitle("Admin Site");
  const {
    handleSiteSettingsSubmit,
    handleThemeProfileDelete,
    handleThemeProfileSave,
    editingThemeKey,
    posts,
    resetThemeProfileForm,
    savingSiteSettings,
    siteSettingsForm,
    siteSettingsMessage,
    startThemeProfileEdit,
    themeProfileForm,
    updateSiteSettingsForm,
    updateThemeProfileField,
    updateThemeProfilePalette
  } = useAdminContext();

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">Site Settings</p>
        <h2>Edit the branding and homepage copy without touching code.</h2>
        <p>
          This is the beginning of a broader site-editor system. It covers the public header identity and the major
          homepage sections that were still hardcoded before.
        </p>
      </section>

      <section className="intro-card">
        <h2>Branding</h2>
        <form className="admin-form" onSubmit={handleSiteSettingsSubmit}>
          <label>
            Site Name
            <input
              onChange={(event) => updateSiteSettingsForm("branding", "siteName", event.target.value)}
              required
              value={siteSettingsForm.branding.siteName}
            />
          </label>
          <label className="full-span">
            Site Tagline
            <input
              onChange={(event) => updateSiteSettingsForm("branding", "siteTagline", event.target.value)}
              required
              value={siteSettingsForm.branding.siteTagline}
            />
          </label>

          <label>
            Home Hero Eyebrow
            <input
              onChange={(event) => updateSiteSettingsForm("home", "heroEyebrow", event.target.value)}
              value={siteSettingsForm.home.heroEyebrow}
            />
          </label>
          <label>
            Featured Homepage Release
            <select
              onChange={(event) => updateSiteSettingsForm("home", "featuredReleaseSlug", event.target.value)}
              value={siteSettingsForm.home.featuredReleaseSlug || ""}
            >
              <option value="">Auto / top curated release</option>
              {posts
                .filter((post) => post.published)
                .map((post) => (
                  <option key={post.id} value={post.slug}>
                    {post.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Featured Button Label
            <input
              onChange={(event) => updateSiteSettingsForm("home", "featuredCtaLabel", event.target.value)}
              value={siteSettingsForm.home.featuredCtaLabel}
            />
          </label>
          <label>
            Jump Button Label
            <input
              onChange={(event) => updateSiteSettingsForm("home", "jumpCtaLabel", event.target.value)}
              value={siteSettingsForm.home.jumpCtaLabel}
            />
          </label>
          <label className="full-span">
            Home Hero Title
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "heroTitle", event.target.value)}
              required
              rows="3"
              value={siteSettingsForm.home.heroTitle}
            />
          </label>
          <label className="full-span">
            Home Hero Text
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "heroText", event.target.value)}
              required
              rows="4"
              value={siteSettingsForm.home.heroText}
            />
          </label>

          <label>
            Note Eyebrow
            <input
              onChange={(event) => updateSiteSettingsForm("home", "noteEyebrow", event.target.value)}
              value={siteSettingsForm.home.noteEyebrow}
            />
          </label>
          <label className="full-span">
            Note Title
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "noteTitle", event.target.value)}
              required
              rows="2"
              value={siteSettingsForm.home.noteTitle}
            />
          </label>
          <label className="full-span">
            Note Text
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "noteText", event.target.value)}
              required
              rows="4"
              value={siteSettingsForm.home.noteText}
            />
          </label>

          <label>
            Browse Eyebrow
            <input
              onChange={(event) => updateSiteSettingsForm("home", "browseEyebrow", event.target.value)}
              value={siteSettingsForm.home.browseEyebrow}
            />
          </label>
          <label className="full-span">
            Browse Title
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "browseTitle", event.target.value)}
              required
              rows="2"
              value={siteSettingsForm.home.browseTitle}
            />
          </label>
          <label className="full-span">
            Browse Text
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "browseText", event.target.value)}
              required
              rows="3"
              value={siteSettingsForm.home.browseText}
            />
          </label>
          <label>
            Browse Link Label
            <input
              onChange={(event) => updateSiteSettingsForm("home", "browseLinkLabel", event.target.value)}
              value={siteSettingsForm.home.browseLinkLabel}
            />
          </label>

          <label>
            Explore Eyebrow
            <input
              onChange={(event) => updateSiteSettingsForm("home", "exploreEyebrow", event.target.value)}
              value={siteSettingsForm.home.exploreEyebrow}
            />
          </label>
          <label className="full-span">
            Explore Title
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "exploreTitle", event.target.value)}
              required
              rows="2"
              value={siteSettingsForm.home.exploreTitle}
            />
          </label>
          <label className="full-span">
            Explore Text
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "exploreText", event.target.value)}
              required
              rows="3"
              value={siteSettingsForm.home.exploreText}
            />
          </label>
          <label>
            Explore Link Label
            <input
              onChange={(event) => updateSiteSettingsForm("home", "exploreLinkLabel", event.target.value)}
              value={siteSettingsForm.home.exploreLinkLabel}
            />
          </label>

          <label>
            Identity Eyebrow
            <input
              onChange={(event) => updateSiteSettingsForm("home", "identityEyebrow", event.target.value)}
              value={siteSettingsForm.home.identityEyebrow}
            />
          </label>
          <label className="full-span">
            Identity Title
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "identityTitle", event.target.value)}
              required
              rows="2"
              value={siteSettingsForm.home.identityTitle}
            />
          </label>
          <label className="full-span">
            Identity Text
            <textarea
              onChange={(event) => updateSiteSettingsForm("home", "identityText", event.target.value)}
              required
              rows="4"
              value={siteSettingsForm.home.identityText}
            />
          </label>
          <label className="full-span">
            Identity Line
            <input
              onChange={(event) => updateSiteSettingsForm("home", "identityLine", event.target.value)}
              value={siteSettingsForm.home.identityLine}
            />
          </label>

          <div className="full-span admin-form-actions">
            <button type="submit">{savingSiteSettings ? "Saving..." : "Save Site Settings"}</button>
          </div>
          {siteSettingsMessage ? <p className="success-text full-span">{siteSettingsMessage}</p> : null}
        </form>
      </section>

      <section className="intro-card">
        <h2>{editingThemeKey ? "Edit Theme Profile" : "Create Theme Profile"}</h2>
        <div className="admin-form">
          <label>
            Theme Key
            <input
              onChange={(event) => updateThemeProfileField("key", event.target.value)}
              placeholder="soft-archive"
              value={themeProfileForm.key}
            />
          </label>
          <label>
            Theme Label
            <input onChange={(event) => updateThemeProfileField("label", event.target.value)} value={themeProfileForm.label} />
          </label>
          <label>
            Theme Type
            <select onChange={(event) => updateThemeProfileField("kind", event.target.value)} value={themeProfileForm.kind}>
              <option value="standard">Standard</option>
              <option value="immersive">Immersive</option>
            </select>
          </label>
          <label>
            World Eyebrow
            <input onChange={(event) => updateThemeProfileField("worldEyebrow", event.target.value)} value={themeProfileForm.worldEyebrow} />
          </label>
          <label>
            Featured Label
            <input onChange={(event) => updateThemeProfileField("featuredLabel", event.target.value)} value={themeProfileForm.featuredLabel} />
          </label>
          <label>
            Featured Action
            <input onChange={(event) => updateThemeProfileField("featuredAction", event.target.value)} value={themeProfileForm.featuredAction} />
          </label>
          <label>
            List Label
            <input onChange={(event) => updateThemeProfileField("listLabel", event.target.value)} value={themeProfileForm.listLabel} />
          </label>
          <label>
            World Note Title
            <input onChange={(event) => updateThemeProfileField("worldNoteTitle", event.target.value)} value={themeProfileForm.worldNoteTitle} />
          </label>
          <label className="full-span">
            World Note Text
            <textarea onChange={(event) => updateThemeProfileField("worldNoteText", event.target.value)} rows="3" value={themeProfileForm.worldNoteText} />
          </label>
          <label>
            Item Name
            <input onChange={(event) => updateThemeProfileField("itemName", event.target.value)} value={themeProfileForm.itemName} />
          </label>
          <label>
            Item Plural
            <input onChange={(event) => updateThemeProfileField("itemPlural", event.target.value)} value={themeProfileForm.itemPlural} />
          </label>
          <label>
            Item Action
            <input onChange={(event) => updateThemeProfileField("itemAction", event.target.value)} value={themeProfileForm.itemAction} />
          </label>
          <label>
            Player Label
            <input onChange={(event) => updateThemeProfileField("playerLabel", event.target.value)} value={themeProfileForm.playerLabel} />
          </label>
          <label>
            Player Up Next Label
            <input onChange={(event) => updateThemeProfileField("playerUpNextLabel", event.target.value)} value={themeProfileForm.playerUpNextLabel} />
          </label>

          <p className="full-span eyebrow">Light Palette</p>
          <label>
            Background
            <input onChange={(event) => updateThemeProfilePalette("light", "background", event.target.value)} value={themeProfileForm.palette.light.background} />
          </label>
          <label>
            Surface
            <input onChange={(event) => updateThemeProfilePalette("light", "surface", event.target.value)} value={themeProfileForm.palette.light.surface} />
          </label>
          <label>
            Surface Alt
            <input onChange={(event) => updateThemeProfilePalette("light", "surfaceAlt", event.target.value)} value={themeProfileForm.palette.light.surfaceAlt} />
          </label>
          <label>
            Text
            <input onChange={(event) => updateThemeProfilePalette("light", "text", event.target.value)} value={themeProfileForm.palette.light.text} />
          </label>
          <label>
            Muted Text
            <input onChange={(event) => updateThemeProfilePalette("light", "mutedText", event.target.value)} value={themeProfileForm.palette.light.mutedText} />
          </label>
          <label>
            Border
            <input onChange={(event) => updateThemeProfilePalette("light", "border", event.target.value)} value={themeProfileForm.palette.light.border} />
          </label>
          <label>
            Primary
            <input onChange={(event) => updateThemeProfilePalette("light", "primary", event.target.value)} value={themeProfileForm.palette.light.primary} />
          </label>
          <label>
            Primary Strong
            <input onChange={(event) => updateThemeProfilePalette("light", "primaryStrong", event.target.value)} value={themeProfileForm.palette.light.primaryStrong} />
          </label>
          <label>
            Secondary
            <input onChange={(event) => updateThemeProfilePalette("light", "secondary", event.target.value)} value={themeProfileForm.palette.light.secondary} />
          </label>

          <p className="full-span eyebrow">Dark Palette</p>
          <label>
            Background
            <input onChange={(event) => updateThemeProfilePalette("dark", "background", event.target.value)} value={themeProfileForm.palette.dark.background} />
          </label>
          <label>
            Surface
            <input onChange={(event) => updateThemeProfilePalette("dark", "surface", event.target.value)} value={themeProfileForm.palette.dark.surface} />
          </label>
          <label>
            Surface Alt
            <input onChange={(event) => updateThemeProfilePalette("dark", "surfaceAlt", event.target.value)} value={themeProfileForm.palette.dark.surfaceAlt} />
          </label>
          <label>
            Text
            <input onChange={(event) => updateThemeProfilePalette("dark", "text", event.target.value)} value={themeProfileForm.palette.dark.text} />
          </label>
          <label>
            Muted Text
            <input onChange={(event) => updateThemeProfilePalette("dark", "mutedText", event.target.value)} value={themeProfileForm.palette.dark.mutedText} />
          </label>
          <label>
            Border
            <input onChange={(event) => updateThemeProfilePalette("dark", "border", event.target.value)} value={themeProfileForm.palette.dark.border} />
          </label>
          <label>
            Primary
            <input onChange={(event) => updateThemeProfilePalette("dark", "primary", event.target.value)} value={themeProfileForm.palette.dark.primary} />
          </label>
          <label>
            Primary Strong
            <input onChange={(event) => updateThemeProfilePalette("dark", "primaryStrong", event.target.value)} value={themeProfileForm.palette.dark.primaryStrong} />
          </label>
          <label>
            Secondary
            <input onChange={(event) => updateThemeProfilePalette("dark", "secondary", event.target.value)} value={themeProfileForm.palette.dark.secondary} />
          </label>

          <div className="full-span admin-form-actions">
            <button onClick={handleThemeProfileSave} type="button">
              {editingThemeKey ? "Update Theme Profile" : "Add Theme Profile"}
            </button>
            {editingThemeKey ? (
              <button className="secondary-button" onClick={resetThemeProfileForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Theme Profiles</h2>
          <span>{`${siteSettingsForm.collectionThemes?.length || 0} themes`}</span>
        </div>
        <div className="collection-grid">
          {(siteSettingsForm.collectionThemes || []).map((themeProfile) => (
            <article className="intro-card homepage-panel collection-card" key={themeProfile.key}>
              <p className="eyebrow">{themeProfile.kind === "immersive" ? "Immersive Theme" : "Theme Profile"}</p>
              <h3>{themeProfile.label}</h3>
              <p>Key: {themeProfile.key}</p>
              <p className="meta">
                Light primary {themeProfile.palette?.light?.primary || "n/a"} / Dark primary {themeProfile.palette?.dark?.primary || "n/a"}
              </p>
              <div className="admin-actions">
                <button className="secondary-button" onClick={() => startThemeProfileEdit(themeProfile)} type="button">
                  Edit
                </button>
                <button className="danger-button" onClick={() => handleThemeProfileDelete(themeProfile.key)} type="button">
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
