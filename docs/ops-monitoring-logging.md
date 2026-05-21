## chore/ops-monitoring-logging

This branch closes the operational visibility gap from the audit with actual runtime tooling, not just notes.

### What changed

- Added structured backend logging with configurable log level support.
- Added request IDs and automatic request completion logs with slow-request highlighting.
- Expanded `/api/health` into a real runtime snapshot with uptime, database status, and logging configuration.
- Added persisted admin audit logs plus `GET /api/admin/audit-logs`.
- Recorded admin activity for:
  - admin logins
  - post create, update, delete, and bulk update actions
  - collection create, update, and delete actions
  - site content updates
  - comment moderation
  - video uploads
- Added `npm run backup:ops` to export a JSON operational snapshot, including users, comments, site content, and admin audit logs.
- Extended Admin Insights to surface runtime status and the recent audit trail.
- Added API coverage for health snapshots and audit-log persistence.

### Outcome

- Every request now carries `x-request-id`, making logs and failures traceable.
- Admin changes are no longer silent; they produce a visible operational trail.
- Runtime status can be checked without guessing whether logging or database connectivity is healthy.
- Local operational backups are easier to take before risky work.

### Verification

- `npm run lint`
- `npm run test:api`
- `npm run verify`
- `npm run verify` in `frontend`
