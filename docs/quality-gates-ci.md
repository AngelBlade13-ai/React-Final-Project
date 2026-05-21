## Quality Gates and CI

Branch: `chore/quality-gates-ci`

### Scope

This branch adds the first real quality gate layer for the repo: linting, formatting, unit tests, API smoke tests, Playwright smoke coverage, and CI wiring.

### What changed

- Added a root `package.json` that orchestrates:
  - `lint`
  - `format`
  - `format:check`
  - `test:unit`
  - `test:api`
  - `test:e2e`
  - `verify`
  - `ci`
- Added root toolchain/config files:
  - `eslint.config.js`
  - `.prettierrc.json`
  - `.prettierignore`
  - `playwright.config.js`
- Added GitHub Actions CI at `.github/workflows/ci.yml`
- Added backend test tooling:
  - in-memory Mongo-backed test server bootstrap
  - Node test runner unit tests
  - Supertest API smoke tests
- Added frontend helper coverage with Vitest.
- Added one Playwright smoke test that covers:
  - public homepage load
  - account registration + session restore
  - admin login + session restore

### Why it matters

- The repo now has one command path that exercises the actual PR gate instead of relying on ad hoc local checks.
- API smoke tests run against an isolated in-memory database, so CI does not depend on an external Mongo instance.
- Browser smoke coverage now proves that public and admin entry flows still work together after structural changes.

### Verification

- `npm run lint`
- `npm run format:check`
- `npm run test:unit`
- `npm run test:api`
- `npm run verify`
- `npm run test:e2e`
- `npm run ci`

### Residual note

- The lint gate currently passes with three `react-hooks/exhaustive-deps` warnings in existing admin code. I left them as warnings because forcing that cleanup into this branch would have mixed workflow scaffolding with behavioral React refactors.

### Formatter note

- Prettier is now enforced on the new automation/config/test surface added in this branch. I intentionally did not mass-format the entire application codebase here to avoid turning this branch into a broad whitespace-only rewrite.
