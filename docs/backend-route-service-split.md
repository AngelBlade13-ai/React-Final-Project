## Backend Route Service Split

Branch: `refactor/backend-route-service-split`

### Scope

This branch breaks the monolithic backend app file into route modules plus shared service and validation helpers, while preserving the API behavior introduced by the earlier safety branches.

### What changed

- Reduced `backend/src/app.js` from `1329` lines to `36` lines of app wiring.
- Added dedicated route modules:
  - `backend/src/routes/auth.routes.js`
  - `backend/src/routes/public.routes.js`
  - `backend/src/routes/admin.routes.js`
- Added shared helper modules:
  - `backend/src/services/authUserService.js`
  - `backend/src/services/catalogService.js`
  - `backend/src/services/siteContentService.js`
- Added validation and rate-limiter modules:
  - `backend/src/validators/contentValidators.js`
  - `backend/src/middleware/rateLimiters.js`
- Expanded backend `verify` coverage so the new route/service files are syntax-checked in normal verification runs.

### Why it matters

- Route concerns are now separated by surface: auth, public, and admin.
- Slug, collection, post, and site-content normalization logic now lives in reusable service modules instead of being trapped inside one file.
- Validation messages are centralized, which makes later edits safer and makes route handlers easier to read.
- Future API tests can target smaller route modules and helper services instead of a single giant entrypoint.

### Verification

- `backend`: `npm run verify`
- `frontend`: `npm run verify`

### Remaining follow-up

- This branch is structural; it does not yet add automated API tests.
- The next auth/session branch can now harden session handling without also needing to untangle the whole backend file at the same time.
