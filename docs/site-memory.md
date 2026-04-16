# Site Memory

## Purpose
- Site name: `Suno Diary`
- Site tagline: `Releases, collections, and notes in one place.`
- Site identity line: `A collection of songs, stories, and moments in motion.`
- Core framing: a soft archive for releases, collections, and the stories that let each song keep breathing.
- Product framing: the site is not a raw feed; it is a small world of connected songs.
- Discovery framing: collections organize releases into verses, moods, and projects; Explore is the utility layer; About frames the artist, the site, and the reason the archive exists.

## Public Information Architecture
- Public top-level collections: `Fractureverse`, `Eldoria`, `Original / Personal`, `Standalone`
- Internal collections remain in the system for organization, filtering, direct URLs, and admin management.
- Public collection navigation and `/collections` use only public-primary collections.
- Explore uses all collections, with primary collections shown first and internal collections under `More Filters`.
- Public collection chips on release cards/pages use only visible public-primary collections.

## Collection Philosophy
- Collections are treated as curated paths, not equal competing shelves.
- Public collection pages are curation surfaces.
- Working versions are hidden from public collection browsing by default.
- Collection display order favors:
  - `canon`
  - `alternate`
  - `working`
- Within non-immersive collections, sorting further favors:
  - `isPrimaryVersion`
  - non-archive entries
  - curated score
  - newer dates
- `Original / Personal` is grouped inside one collection page, not split into top-level public collections.
- `Original / Personal` section labels:
  - `Identity`
  - `Love & Vulnerability`
  - `Princess Motif`
  - `Empowerment`
  - `Community`
  - `Archive / Early Works`
  - `Other`

## Release Classification
- `releaseStatus` values:
  - `canon`
  - `alternate`
  - `working`
- Public presentation uses `releaseStatus` as the main pruning signal.
- Homepage shows only `canon`.
- Public collection pages show `canon` first, `alternate` lower, `working` hidden by default.
- Explore shows `canon` and `alternate` by default, with optional inclusion of `working`.
- Supporting release metadata retained in the model:
  - `versionFamily`
  - `isPrimaryVersion`
  - `isArchive`
  - `isHomepageEligible`

## Homepage Hierarchy
- Hero
  - headline and archive framing
  - primary CTA: `Play Featured Release`
  - secondary CTA: `Jump to Latest Releases`
- Hero note card
  - `What Changed`
  - release count
  - curated path count
- Transition cards
  - `Browse`
  - `Find`
- Identity card
  - site identity explanation
- `Featured Release`
- `Collections`
- `Latest Releases`
- `From Fractureverse`
- `From Eldoria`

## Homepage Curation Rules
- Homepage uses `getHomepageCuratedPosts`.
- Eligible posts must satisfy:
  - `isHomepageEligible === true`
  - `isArchive !== true`
  - `releaseStatus === "canon"`
- Posts are deduplicated by `versionFamily`, with cleaned-title fallback.
- Preferred representative inside a version family:
  - `isPrimaryVersion === true`
  - otherwise newest by `createdAt`
- `Latest Releases` shows a maximum of 15 items after the featured release is removed.
- Homepage also pulls curated subsets:
  - `From Fractureverse`: max 4
  - `From Eldoria`: max 4
- Curated scoring deprioritizes terms:
  - `version`
  - `reimagined`
  - `revision`
  - `mix`
  - `streamlined`
  - `stripped`
  - `expanded`
  - `full english`
  - `donna generation`
  - `alternate`

## Player Behavior
- The mini player theme is derived from the current track’s preferred themed collection.
- Preferred collection resolution:
  - first public-primary collection on the post
  - otherwise first available collection
- Theme config controls:
  - player label
  - up-next label
  - CSS variables for progress, thumb, track, and volume styling
- Queue behavior:
  - release pages and collection pages pass explicit playback context when available
  - Fractureverse queues use fractureverse sequence ordering
  - Eldoria queues use chronicle ordering
  - non-immersive collections use collection display order
- Mini player metadata:
  - Fractureverse: fragment ID and state
  - Eldoria: chapter label and optional player flavor line
  - default: collection title and queue position
- Mini player chip:
  - Fractureverse: signal type
  - Eldoria: entry type or chapter position
- Transport:
  - `Prev`
  - `Play` / `Pause`
  - `Next`
  - scrub bar
  - volume slider
  - `Up Next`
  - `Dismiss`

## Release Page Logic
- Release pages remain listening-first and record-first.
- Written release pages are valid even before a final video upload.
- Standard release copy framing:
  - focused listening view for the video, the note behind it, and the words that shaped the release
- Fractureverse release framing:
  - in-world fragment view
  - playback, record, linked echoes, and larger fracture position
- Eldoria release framing:
  - story-forward view
  - ballad, chronicle position, and verses
- Immersive releases force Midnight Mode / dark mode.

## Style System
- Theme system is collection-driven.
- Built-in theme keys:
  - `default`
  - `eldoria`
  - `soft-archive`
  - `fractureverse`
  - `stage`
  - `signal`
- Each theme defines:
  - world eyebrow
  - featured label/action
  - list label
  - release note label
  - lyrics label
  - world note title/text
  - item singular/plural/action
  - player label and up-next label
  - light/dark palette values for background, surface, surfaceAlt, text, mutedText, border, primary, primaryStrong, secondary
- Collection themes can be customized through stored theme profiles, but built-in theme semantics remain the base layer.
- `Eldoria` and `Fractureverse` are immersive theme kinds.
- Immersive collections force dark mode.

## Visual Language
- Release cards use:
  - media-first layout
  - overlay treatment
  - `Play` / `Video Pending` pill
  - action arrow
  - excerpt
  - public collection chips
- Collection pages and release pages use world headers, status bars, chips, and archive-note panels.
- The site uses repeated “record / fragment / chronicle / archive” language rather than product-dashboard language.
- Collections, releases, and worlds are presented as shelves, records, fragments, ballads, signals, or acts depending on theme.

## Fractureverse
- Theme key: `fractureverse`
- World eyebrow: `World / Fractureverse`
- Core description: a fractured reality where every choice creates a new world, and every version of love carries a different cost.
- World stats:
  - `World Status: Unstable`
  - `Observed Fragments: 5`
  - `Primary Subjects: Angel, Grissom`
  - `Current Condition: Active recursion detected`
- Residual echo line: `Some timelines collapse. Some repeat. Some never stop trying to become real.`
- Primary collection flow is sequence-first.
- Fractureverse featured slug: `shattered-trust-reimagined`
- Fractureverse order:
  - `the-one-you-used-to-be-reimagined`
  - `still-breathing-in-a-dying-world-reimagined`
  - `shattered-trust-reimagined`
  - `you-were-better-before-you-saved-the-world-reimagined`
  - `we-were-never-meant-to-survive-reimagined-duet`
- Fractureverse collection page structure:
  - timeline analysis panel
  - observed sequence strip
  - primary fragment card
  - connection diagram / link layer
  - fragment grid
  - residual echo card
- Fractureverse release pages show:
  - fragment/state/perspective/signal
  - linked fragments
  - previous/next fragment
  - system-note language

## Eldoria
- Theme key: `eldoria`
- Collection language:
  - `First Chronicle Entry`
  - `Enter Chronicle`
  - `Chronicle`
  - `Chronicle Entry`
  - `Verses`
  - `Ballad` / `Ballads`
- World behavior:
  - immersive
  - dark-mode locked
  - map-first on collection page
- Eldoria collection page language includes:
  - `The world remembers its queen.`
  - `The royal archive remains below as a written record, but the map above is now the truest way into the world.`
- Eldoria release pages include:
  - identity line
  - subtitle
  - opening passage
  - chapter/type/season status bar
  - `The chronicle never mistook her for a stranger.`
  - `This page is kept as part of the wider chronicle, not as a standalone upload.`
- Eldoria player language:
  - `Now Playing - A Ballad`
  - `Next Ballad`

## Eldoria Map And Chronicle Navigation
- Eldoria collection page includes `The Realm Of Eldoria`.
- Map statement: geography and chronology now share the same surface.
- The map is interactive:
  - zoom in
  - zoom out
  - reset
  - pan/drag
- Map entries are chapter-based.
- Current chapter layout:
  - `1` Threshold Field / Arrival Point / fracture-field / origin
  - `2` Aeloria Echo Grove / Memory Bleed / aeloria-echo-zone / echo
  - `3` Eldoria Capital / Throne / Stability / eldoria-capital / ascension
  - `4` Eastern Warfront / Consequence / manifestation
- Map pathing:
  - `1 -> 2`
  - `2 -> 3`
  - `3 -> 4`
- Map entry affordances:
  - roman numeral chapter markers
  - hover/focus tooltip
  - `Enter Chronicle` or `Sealed`
- Entering a node triggers a transition before navigation.
- Eldoria transition screen copy: `The world remembers you.`

## Icon And Symbol Direction
- Eldoria uses a sigil system rather than generic UI icons.
- `EldoriaSigil` structure:
  - concentric rings
  - upper and lower arcs
  - script ring
  - orbit dots
  - glowing core
- Eldoria map nodes use symbolic motifs by chapter/region:
  - fracture motif
  - echo motif
  - capital motif
  - warfront motif
- Eldoria map also uses:
  - roman numerals
  - story paths
  - power paths
  - echo path
  - coast, contour, river, road, and aura layers
- Fractureverse uses text and data-signature motifs instead of symbolic emblems:
  - fragment IDs
  - state labels
  - perspective labels
  - signal type
  - connection lines
  - sequence nodes

## Navigation Systems
- Global public nav:
  - `Home`
  - `Collections`
  - `Explore`
  - `About`
  - `Account` / `Join`
- Explore is described as the utility layer of the site.
- Release pages expose:
  - back to home
  - browse collections
  - back to collection / return to sequence / return to chronicle
- Collection pages are the main browsing surface.
- Release pages are the detailed record surface.

## Recurring Product Constraints
- Do not treat the site like a raw chronological dump.
- Keep written release records first-class even when video is pending.
- Preserve collection context around playback and navigation.
- Use world-specific language where a theme exists.
- Keep immersive worlds in forced dark mode.
- Keep public collection surfaces curated.
- Keep internal organization available without making every internal category a top-level public path.
- Direct-only canon can exist without homepage emphasis.
