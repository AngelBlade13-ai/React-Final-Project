# UI Roadmap Progress

Updated: 2026-04-22

## Goal

Refine the site and importer from a rich shared texture system into a clearer hierarchy system with distinct visual modes:

- editorial public
- utility/discovery
- immersive world
- operational admin
- guided importer workstation

## Planned Phases

1. Design-system reset
2. Public shell and navigation
3. Admin mode pass
4. World/release restraint pass
5. Importer productization

## Completed So Far

- Removed the extra worktree and unified work in `D:\Docs\Active Project\React Final Project`
- Re-ran a deep UI/CSS audit across the website and importer
- Defined the new roadmap direction and sequencing
- Shifted the default site palette from pink/lilac-romantic toward a more neutral archival/editorial base in `frontend/src/styles/theme-tokens.css`
- Added layered frontend override files:
  - `frontend/src/styles/ui-system.css`
  - `frontend/src/styles/public-shell.css`
  - `frontend/src/styles/admin-mode.css`
- Updated the global style entry point in `frontend/src/styles.css`
- Restructured the public header in `frontend/src/layouts/PublicLayout.jsx`
- Redesigned the theme toggle in `frontend/src/components/ThemeToggle.jsx`
- Started the collections atlas pass by separating world thresholds from other collections in `frontend/src/pages/public/CollectionsIndexPage.jsx`
- Expanded the collections atlas pass with a dedicated atlas note card and clearer world-vs-shelf framing in `frontend/src/pages/public/CollectionsIndexPage.jsx`
- Expanded the Explore pass with stronger utility framing and filter guidance copy in `frontend/src/pages/public/ExplorePage.jsx`
- Started the admin mode pass by adding a distinct admin shell treatment in `frontend/src/layouts/AdminLayout.jsx` and `frontend/src/pages/admin/AdminLogin.jsx`
- Started the importer workstation pass by restructuring `D:\Projects\PythonProject\templates\import_window.html` into clearer stages with advanced settings tucked behind a details panel
- Verified:
  - `frontend/npm run verify`
  - importer `pytest` in `D:\Projects\PythonProject` (`31 passed`)

## In Progress

- Phase 2: public shell pass for homepage and Explore hierarchy
- Phase 3: broader admin density and editor hierarchy pass
- Phase 5: deeper importer workstation/productization pass

## Still To Do

- Homepage role-contrast pass
- Explore discoverability polish
- Full collections atlas treatment
- Admin posts/editor hierarchy pass
- Admin insights/dashboard hierarchy pass
- Release/world restraint pass
- Mini-player visual weight reduction
- Importer step-by-step workflow refinement beyond the first structural pass

## Handoff Note

If work stops before the roadmap is complete, update this file with:

- what changed
- what files were touched
- what verification ran
- what remains unfinished
