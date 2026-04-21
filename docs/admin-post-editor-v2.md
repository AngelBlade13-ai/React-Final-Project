## Admin Post Editor V2

Branch: `feat/admin-post-editor-v2`

### What changed

- Reworked `frontend/src/pages/admin/AdminPostsPage.jsx` into a tabbed editor with five focused sections:
  - `Essentials`
  - `Media`
  - `Catalog`
  - `World`
  - `Publish`
- Added a right-hand save/status rail with:
  - dirty-state visibility
  - blocking vs advisory validation summary
  - local draft status
  - save/reset actions
- Added local draft autosave in the browser using `localStorage`
  - drafts are keyed by current post id or `post:new`
  - users can restore or discard a local draft
  - staged file selections are explicitly called out as non-restorable
- Added unsaved-change protection for:
  - browser/tab close
  - switching from one release edit session to another
  - resetting/canceling the current editor state
- Added cleaner catalog controls for:
  - `releaseStatus`
  - `versionFamily`
  - `subCategory`
  - `sourceTag`
  - `worldLayer`
  - `themeTags`
  - `supersededBySlug`
  - `supersededReason`
  - `supersededAt`
- Added `replacePostForm` to `frontend/src/layouts/AdminLayout.jsx` so whole-form restoration can happen safely without reconstructing nested state field by field.

### Why it matters

- The post model has outgrown a single flat form.
- Editors now get structure, recoverability, and clearer feedback before saving.
- This reduces accidental loss during long authoring sessions and makes richer metadata practical to maintain.

### Verification

- `frontend`: `npm run verify`
- `backend`: `npm run verify`

### Notes

- Local drafts intentionally do not try to preserve raw file inputs. Uploaded URLs persist; selected local files must be reattached after a restore.
