## Operations Runbook

### Runtime visibility

- `GET /api/health`
  - returns `status`, `timestamp`, `environment`, `uptimeSeconds`
  - returns `database.connected` and `database.name`
  - returns logging state:
    - `level`
    - `requestLogging`
    - `adminAuditLogging`
    - `slowRequestThresholdMs`
    - `monitoringWebhookConfigured`
- Every backend response now includes `x-request-id`.
- Request logs are emitted in structured JSON so a single request can be traced from client error to server log line.

### Admin audit trail

- Recent admin actions are stored in the `adminAuditLogs` Mongo collection.
- Recent entries are available through `GET /api/admin/audit-logs?limit=20`.
- Admin Insights now exposes the latest audit events without leaving the dashboard.

### Logging configuration

Optional backend environment variables:

- `LOG_LEVEL`
  - defaults to `info`
- `ENABLE_REQUEST_LOGGING`
  - defaults to `true` outside tests
- `ENABLE_ADMIN_AUDIT_LOGGING`
  - defaults to `true`
- `SLOW_REQUEST_THRESHOLD_MS`
  - defaults to `1200`
- `MONITORING_WEBHOOK_URL`
  - when set, unhandled backend errors are forwarded to the webhook in addition to local logs

### Backups

Preferred backup layers:

1. Database-native backup for full restore safety
   - example: `mongodump --uri "$MONGODB_URI/$MONGODB_DB_NAME" --out ./mongo-backups`
2. App-level JSON snapshot for quick inspection and local checkpoints
   - `cd backend`
   - `npm run backup:ops -- --label=before-release`

The JSON snapshot includes:

- posts
- collections
- users
- comments
- site content
- admin audit logs

The snapshot is operational data. Keep it private and out of git.

### Restore expectations

- For full operational restores, prefer `mongorestore`.
- `npm run reseed` is not a full restore path.
  - it restores authored catalog data only
  - it does not restore live users, comments, or admin audit logs
- `npm run catalog:sync-live` reconciles tracked catalog files with live authored content
  - it does not replace a database restore

### Versioning notes

- Any schema-affecting operational change should land with:
  - a branch-local doc
  - verification notes
  - explicit rollback expectations when the change is risky
- Audit logging additions in this roadmap introduced the `adminAuditLogs` collection and new runtime logging environment variables.
- Future migration-style changes should follow the same pattern used elsewhere in the roadmap:
  - scoped branch
  - verification
  - operational note in `docs/`
