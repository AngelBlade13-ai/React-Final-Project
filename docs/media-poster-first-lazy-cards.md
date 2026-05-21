# Media Poster-First List Surfaces

This branch changes list and card surfaces to render poster images instead of mounting `<video>` elements by default.

## Rule

- `ReleaseMedia` now prefers poster images when `compact` is true and `controls` is false.
- Full video playback remains in places that are explicitly playback surfaces, such as:
  - release pages
  - admin media preview/editing
  - any other usage that passes `controls`

## Performance effect

- Homepage cards stop creating real video elements during initial load.
- Collection and timeline cards stop mounting preview videos while users are still browsing.
- Compact featured cards on browsing surfaces render poster images first.
- Remaining video elements that are not using controls now fall back to `preload="none"` instead of `metadata`.

## Verification checklist

- Homepage featured release and latest-release cards still show media immediately.
- Collection pages still show artwork/posters on cards and featured panels.
- Release pages still render the actual playable video element with controls.
- Admin post edit preview still renders the actual video element with controls.
