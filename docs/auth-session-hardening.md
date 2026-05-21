## Auth Session Hardening

Branch: `feat/auth-session-hardening`

### Scope

This branch moves the site away from trusting local-storage tokens for active sessions. Admin and public user auth now use cookie-backed sessions, and the admin shell validates the real server session before rendering.

### What changed

- Added cookie-backed session helpers in `backend/src/services/sessionCookieService.js`.
- Backend now:
  - parses cookies with `cookie-parser`
  - allows credentialed CORS requests
  - reads auth tokens from httpOnly cookies as well as bearer headers
  - clears invalid session cookies when token verification fails
  - sets admin and user session cookies on successful login/update flows
  - exposes `GET /api/admin/session` for real admin-shell validation
  - exposes `POST /api/admin/logout` and `POST /api/auth/logout`
- Frontend now:
  - checks `GET /api/admin/session` on app boot instead of trusting a stored admin token
  - checks `GET /api/auth/me` via credentials-included requests for user session restore
  - uses credentialed requests for admin actions, account actions, and comment mutations
  - removes the old local-storage admin/user token dependency from active session flow
  - blocks admin route rendering until the server-side session check finishes

### Why it matters

- An expired or invalid admin token no longer opens the admin shell just because a string still exists in storage.
- Refreshing the page restores real sessions from cookies instead of depending on stale local state.
- Admin and public user sessions are now managed by the server, which is materially safer than raw browser-managed bearer token state.

### Verification

- `backend`: `npm run verify`
- `frontend`: `npm run verify`

### Runtime note

- I also attempted a short backend startup smoke (`node src/server.js` with a timeout), but it did not reach a ready log line within the timeout window, so startup/runtime validation is only partial on this branch.
