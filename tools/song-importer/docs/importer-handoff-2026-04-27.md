# Importer Tool Handoff

Generated: 2026-04-27

Use this file to continue importer work in another chat. The importer project is at:

```text
D:\Projects\PythonProject
```

The website project it integrates with is at:

```text
D:\Docs\Active Project\React Final Project
```

## Quick Context To Paste Into A New Chat

We are working on a standalone Python song importer at `D:\Projects\PythonProject`, branch `feat/website-automation`. It integrates with the React website at `D:\Docs\Active Project\React Final Project`, using the website catalog at `backend/data/posts.local.json`.

The importer has a Flask browser UI launched with:

```powershell
cd D:\Projects\PythonProject
.\.venv\Scripts\python.exe main.py --web --website-root "D:\Docs\Active Project\React Final Project"
```

The importer supports:

- new song import with JSON paste
- optional Cloudinary video upload
- duplicate detection against the website catalog
- website-ready post mapping
- applying merged output into the website `posts.local.json`
- reseeding the website Mongo database after apply
- lyrics merge into existing posts with blank lyrics
- async apply/reseed jobs with a popup report and progress polling

Important recent fixes:

- Website reseed hang was fixed on the website side by closing Mongo in `backend/scripts/reseed-from-posts-file.js`.
- Importer reseed hang was fixed by closing Mongo in the importer's live-store backup Node snippet.
- Importer backup paths were fixed to resolve output directories before launching the website subprocess.
- Importer apply/reseed now reports phases: backup, reseed, verify.
- Stale UI job polling now clears invalid old job IDs instead of polling forever.
- Reseed and verification now have 2-minute timeouts.
- A full importer-side smoke test showed approximate timings: backup 2.86s, reseed 5.67s, diff 2.93s.
- The browser UI was reworked into a two-mode workstation: `New Song Import` and `Lyrics Merge`.
- `Lyrics Repair Only` remains a backend CLI/API path, but it is no longer shown in the browser UI because it was redundant with lyrics merge for normal use.
- Importer merge output now strips non-authored top-level keys and keeps only `posts`, `collections`, and `siteContent`.
- Regression tests cover authored-only merge output using `users`, `comments`, `email`, and `passwordHash` as intentionally rejected keys.

The website recently split operational data away from `posts.local.json`. The website `posts.local.json` should now contain only:

- `posts`
- `collections`
- `siteContent`

It should not contain:

- `users`
- `comments`
- `email`
- `passwordHash`

The importer should keep respecting that authored-catalog-only shape when applying or previewing website merges.

## Current Git State

At the time this handoff was written, the importer working tree was dirty:

```text
## feat/website-automation
 M README.md
 M main.py
 M src/config.py
 M src/models.py
 M src/normalizer.py
 M src/pipeline.py
 M src/utils.py
 M src/web_app.py
 M src/website_integration.py
 M templates/import_window.html
 M tests/test_pipeline.py
 M tests/test_web_app.py
 M tests/test_website_integration.py
```

Do not revert these casually. They contain the active importer automation work.

## Main Files

CLI entry:

```text
main.py
```

Runtime config:

```text
src/config.py
```

Shared processing flow:

```text
src/pipeline.py
```

Browser app:

```text
src/web_app.py
```

Browser template:

```text
templates/import_window.html
```

Website merge/reseed helpers:

```text
src/website_integration.py
```

Website post mapper:

```text
src/website_mapper.py
```

Data model:

```text
src/models.py
```

## Launch Commands

Browser UI:

```powershell
cd D:\Projects\PythonProject
.\.venv\Scripts\python.exe main.py --web --website-root "D:\Docs\Active Project\React Final Project"
```

Browser UI without auto-opening a tab:

```powershell
.\.venv\Scripts\python.exe main.py --web --website-root "D:\Docs\Active Project\React Final Project" --no-browser
```

Standalone demo UI for instructor review without the React website:

```powershell
.\.venv\Scripts\python.exe main.py --web --demo
```

Standalone demo CLI:

```powershell
.\.venv\Scripts\python.exe main.py --demo
```

CLI preview without upload:

```powershell
.\.venv\Scripts\python.exe main.py --website-root "D:\Docs\Active Project\React Final Project" --input input\new_songs.json --output-dir output\website-smoke --no-upload
```

CLI apply and reseed:

```powershell
.\.venv\Scripts\python.exe main.py --website-root "D:\Docs\Active Project\React Final Project" --input input\new_songs.json --output-dir output\website-smoke --apply-to-website --reseed-website
```

Run tests:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Last known test result after the reseed fixes:

```text
44 passed
```

## Environment Variables

The importer reads `.env` through `python-dotenv` if available.

Relevant variables:

```env
WEBSITE_ROOT=D:\Docs\Active Project\React Final Project
WEBSITE_POSTS_PATH=D:\Docs\Active Project\React Final Project\backend\data\posts.local.json
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEED_TIMEOUT_MS=120000
WEBSITE_STEP_TIMEOUT_MS=120000
```

`WEBSITE_ROOT` is usually enough. `WEBSITE_POSTS_PATH` is optional if the normal website structure is used.

## Current Browser Workflow

The browser UI has two visible modes:

- New Song Import
- Lyrics Merge

Normal import flow:

1. Paste one song JSON object, or an array for batch mode.
2. Attach a video file if importing one song and upload is desired.
3. Keep `Upload media to Cloudinary before preview` enabled when media should be uploaded.
4. Click `Process + Preview`.
5. Review duplicate results and website-ready preview.
6. Click `Apply To Website`.
7. The tool writes `backend/data/posts.local.json`, backs up live Mongo store, runs website `npm run reseed`, then verifies live DB vs file.

Standalone demo flow:

1. Run `.\.venv\Scripts\python.exe main.py --web --demo`.
2. Click `Process + Preview` with the bundled sample JSON.
3. Review duplicate blocking, import-ready output, and generated files under `output\demo\web-ui`.
4. Apply/reseed buttons stay disabled because no website target is configured.
5. This mode does not need the React website, MongoDB, npm, Cloudinary, or private credentials.

Lyrics merge flow:

1. Choose `Lyrics Merge`.
2. Paste objects with at least matching `title` or `slug` and `lyrics`.
3. Click `Process + Preview`.
4. If matching website posts have blank lyrics, the tool prepares lyrics merge updates.
5. Review the lyrics merge candidates and merged preview.
6. Click `Apply To Website`.

## Important Behavioral Rules

New song import:

- Duplicate detection blocks likely duplicate or same-family entries.
- Import-ready songs are mapped to website post objects.
- `published` defaults to `true`.
- `isPubliclyVisible` defaults to `true`.
- Media upload happens during preview, before apply.
- If a local media file is attached but upload is disabled, the web app raises a validation error.
- If a media file is attached and Cloudinary credentials are missing, the web app raises a validation error.

Lyrics merge:

- Only fills lyrics when the matching website post has blank lyrics.
- Matching is by slug first, then exact title if title is unique.
- Existing nonblank lyrics are not overwritten.
- If the same lyrics are already present, the merge is effectively a no-op.
- In the browser, lyrics merge is the only visible lyrics cleanup workflow.

Backend-only lyrics repair:

- `--lyrics-repair-only` still exists for CLI/API compatibility.
- It is hidden from the browser UI because it is a stricter subset of lyrics merge.
- Do not present it as a normal demo workflow unless there is a specific reason to show backend-only behavior.

Apply behavior:

- `Save posts.local.json Only` writes the website catalog file but does not reseed Mongo.
- `Apply To Website` writes the catalog file and reseeds live Mongo.
- New posts already present in `posts.local.json` are treated as already applied so reseed can still proceed.
- The UI popup should show a running report, then update to success or error.

## Reseed Job Details

Relevant functions:

```text
src/web_app.py::_run_reseed_job
src/website_integration.py::export_live_store_snapshot
src/website_integration.py::run_website_reseed_streaming
src/website_integration.py::run_website_catalog_diff
```

The job phases are:

1. `backup`: export current live Mongo store to output.
2. `reseed`: run `npm run reseed` inside website `backend`.
3. `verify`: run `npm run catalog:diff-live` inside website `backend`.

Expected local timing:

```text
backup: about 3s
reseed: about 6s
diff: about 3s
```

If the UI appears stuck:

- Restart the importer Flask process after code changes.
- Clear old browser job IDs if needed. The localStorage key is:

```text
song-import-assistant-active-job-id
```

- Check generated reseed logs under the configured output directory, usually:

```text
output\web-ui
```

## Website Coupling

The importer assumes the website uses:

```text
D:\Docs\Active Project\React Final Project\backend\data\posts.local.json
```

The website reseed command is:

```powershell
cd "D:\Docs\Active Project\React Final Project\backend"
npm run reseed
```

The website diff command is:

```powershell
npm run catalog:diff-live
```

The website side was changed so `posts.local.json` is authored content only. That matters because importer previews and applies should preserve only the existing top-level authored catalog keys, not operational data.

## Output Files

Typical output directory:

```text
output\web-ui
```

Generated files include:

- `normalized_new_songs.json`
- `import_ready_songs.json`
- `website_posts_ready.json`
- `duplicate_report.json`
- `import_report.md`
- `existing_catalog.extracted.json`
- `website_posts_merged_preview.json`
- `website_posts.backup.<timestamp>.json`
- `website_live_store.backup.<timestamp>.json`
- `website_reseed.<jobId>.log`
- `lyrics_merge_updates.json`

## Known Caveats

- File picker uploads only support one song object at a time.
- JSON arrays are supported for bulk processing when no files are attached.
- The tool currently treats duplicate/family collisions conservatively.
- Browser lyrics merge only updates blank lyrics; it will not replace existing lyrics.
- The web UI is now a polished two-mode workstation, but it can still be refined further around final verification summaries and demo polish.
- The current branch has uncommitted changes and should be reviewed before committing.

## Good Next Work

1. Commit the importer changes once the current flow is stable.
2. Improve the browser UI around Cloudinary upload state and completed reseed verification.
3. Add a visible final database verification summary after reseed.
4. Consider a bulk media mapping mode if batch import with attached files becomes important.
5. Decide later whether to remove backend-only `--lyrics-repair-only` entirely or keep it as an escape hatch.
