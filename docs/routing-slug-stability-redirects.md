# Routing Slug Stability And Redirects

This branch makes slugs stable for posts and collections instead of silently regenerating them from title edits.

## Behavior

- Editing a title no longer changes the slug by default.
- Admin editors now expose the slug field for posts and collections.
- When a slug is changed intentionally, the previous slug is stored in `slugHistory`.
- Public release and collection routes resolve old slugs through `slugHistory` and return the canonical current slug in `redirectSlug`.
- The public release and collection pages replace the browser URL with the canonical slug when the API reports a redirect.

## Integrity rules

- New slugs are rejected if another entry already uses that slug or has reserved it in `slugHistory`.
- Post slug changes now update these canonical references:
  - comment `postSlug`
  - collection `featuredReleaseSlug`
  - homepage `featuredReleaseSlug`
  - post `archiveMeta.linkedSlugs`
  - post `supersededBySlug`
- Collection slug changes still rewrite `post.collectionSlugs`, and now also retain collection slug history for redirects.

## Verification checklist

- Edit a post title without changing its slug and confirm the public URL stays the same.
- Change a post slug and confirm:
  - `/release/<old-slug>` resolves and redirects to the new slug
  - comments still appear
  - homepage/collection featured links still point at the post
  - linked Fractureverse references still resolve
- Change a collection slug and confirm:
  - `/collections/<old-slug>` resolves and redirects to the new slug
  - posts still appear inside that collection
  - collection links throughout the site use the new slug
