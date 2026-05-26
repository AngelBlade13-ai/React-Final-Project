# Song Catalog Import Assistant

Song Catalog Import Assistant is a standalone Python tool that prepares song data for import into a music archive website.

It reads an existing catalog and a batch of new songs from JSON, normalizes titles and slugs, infers version families and release status, flags likely duplicates, optionally uploads media to Cloudinary, and exports website-compatible output files plus review reports.

## Why this project exists

Managing a growing song catalog by hand creates predictable problems:

- inconsistent slugs
- duplicate entries under slightly different titles
- version variants that should stay grouped together
- manual review steps that are easy to miss

This project automates that workflow in a way that is easy to demo for a class and still useful in a real content pipeline.

## What the tool does

- reads `existing_catalog.json` and `new_songs.json`
- validates required input before processing
- normalizes titles and slugs
- infers `versionFamily`
- infers `releaseStatus`
- detects likely duplicates using exact, family, and fuzzy title signals
- blocks likely duplicates from import-ready output
- optionally uploads video and cover image files to Cloudinary
- exports JSON and Markdown review files
- exports a website-ready post payload for direct append into the website `posts.json` workflow
- can launch a local browser window for paste JSON, file upload, preview, website apply, reseed, and verification
- can merge lyrics into existing website posts that have blank lyrics without overwriting existing lyrics
- preserves the website `posts.json` as an authored catalog containing only `posts`, `collections`, and `siteContent`

## Stable output schema

The import-ready JSON is shaped for direct use in the website workflow:

```json
{
  "title": "Heaven Wakes in Me",
  "slug": "heaven-wakes-in-me",
  "lyrics": "full lyrics",
  "sunoPrompt": "style prompt",
  "notes": "canon version",
  "sourceTag": "suno",
  "versionFamily": "heaven-wakes-in-me",
  "releaseStatus": "canon",
  "collectionSlugs": ["original-personal"],
  "subCategory": "identity",
  "worldLayer": "",
  "themeTags": ["identity", "awakening", "celestial"],
  "audioUrl": "",
  "videoUrl": "",
  "coverImageUrl": ""
}
```

## Project structure

```text
song-catalog-import-assistant/
|-- README.md
|-- requirements.txt
|-- .env.example
|-- .gitignore
|-- main.py
|-- pytest.ini
|-- docs/
|   `-- demo-notes.md
|-- input/
|   |-- existing_catalog.json
|   `-- new_songs.json
|-- output/
|   `-- .gitkeep
|-- templates/
|   `-- import_window.html
|-- src/
|   |-- __init__.py
|   |-- config.py
|   |-- duplicate_checker.py
|   |-- exceptions.py
|   |-- exporter.py
|   |-- models.py
|   |-- normalizer.py
|   |-- pipeline.py
|   |-- uploader.py
|   |-- utils.py
|   |-- web_app.py
|   |-- website_integration.py
|   `-- website_mapper.py
`-- tests/
    |-- test_duplicate_checker.py
    |-- test_normalizer.py
    |-- test_utils.py
    |-- test_web_app.py
    |-- test_website_integration.py
    `-- test_website_mapper.py
```

## Installation

Prerequisite: Python 3.10 or newer.

```bash
git clone https://github.com/your-username/song-catalog-import-assistant.git
cd song-catalog-import-assistant

python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt
```

## How to run

Run with the default project input and output folders:

```bash
python main.py
```

Useful options:

```bash
python main.py --no-upload
python main.py --dry-run
python main.py --demo
python main.py --catalog input/existing_catalog.json --input input/new_songs.json --output-dir output
python main.py --website-root "D:\Docs\Active Project\React Final Project" --input input/new_songs.json --output-dir output\website-smoke --no-upload
python main.py --website-root "D:\Docs\Active Project\React Final Project" --input input/new_songs.json --output-dir output\website-smoke --no-upload --apply-to-website --reseed-website
python main.py --web --demo
python main.py --web --website-root "D:\Docs\Active Project\React Final Project"
```

You can also point `--catalog` directly at the website's canonical `posts.json`. The tool accepts either:

- a plain catalog array
- an object with a top-level `posts` array

If `--website-root` or `--website-posts` is provided and `--catalog` is omitted, the tool automatically uses the website's `posts.json` for duplicate checks.

### CLI flags

| Flag | Purpose |
|---|---|
| `--catalog PATH` | Existing website catalog JSON |
| `--input PATH` | New songs JSON |
| `--output-dir PATH` | Destination for generated files |
| `--no-upload` | Force media upload to stay off |
| `--dry-run` | Validate and process without writing files |
| `--demo` | Use bundled sample data, disable upload, write to `output/demo`, and skip website integration |
| `--website-root PATH` | Website repo root; resolves `backend/data/posts.json` automatically |
| `--website-posts PATH` | Direct path to the website `posts.json` |
| `--apply-to-website` | Write the merged catalog back into the website `posts.json` |
| `--reseed-website` | Run the website backend `npm run reseed` after apply |
| `--web` | Launch the local browser-based import window |
| `--merge-lyrics` | Fill blank lyrics on matching existing website posts without overwriting existing lyrics |
| `--lyrics-repair-only` | Backend-only cleanup mode for blank lyric repair; hidden from the browser UI |
| `--host HOST` | Host for the browser app in `--web` mode |
| `--port PORT` | Port for the browser app in `--web` mode |
| `--no-browser` | Do not auto-open the browser in `--web` mode |

## Input requirements

### `input/existing_catalog.json`

Must be either:

- a JSON array of song objects
- a website-style JSON object with a top-level `posts` array

Each catalog entry must contain at least:

- `slug`

Recommended fields for better duplicate detection:

- `title`
- `versionFamily`
- `releaseStatus`

Example:

```json
[
  {
    "title": "Hope's Song",
    "slug": "hopes-song-orchestral-op-version",
    "versionFamily": "hopes-song",
    "releaseStatus": "canon"
  }
]
```

### `input/new_songs.json`

Must be a JSON array of song objects. Required field:

- `title`

Supported optional fields:

- `lyrics`
- `sunoPrompt`
- `notes`
- `sourceTag`
- `releaseStatus`
- `collectionSlugs`
- `subCategory`
- `worldLayer`
- `themeTags`
- `audioUrl`
- `videoUrl`
- `coverImageUrl`
- `videoPath`
- `coverImagePath`

Example:

```json
[
  {
    "title": "Heaven Wakes in Me",
    "lyrics": "Example lyrics here",
    "sunoPrompt": "Nightcore anime pop, angelic transformation anthem",
    "notes": "New song for import",
    "sourceTag": "suno",
    "collectionSlugs": ["original-personal"],
    "subCategory": "identity",
    "worldLayer": "",
    "themeTags": ["identity", "awakening", "celestial"],
    "videoPath": "",
    "coverImagePath": ""
  }
]
```

Media paths are local-only helper fields. They are used for optional upload and are not included in exported website JSON.

## Validation and error handling

The tool fails cleanly with a clear error message when:

- an input file is missing
- JSON is invalid
- a song title is missing or blank
- duplicate titles exist inside the new input file
- a media path does not point to a real file
- optional schema fields use the wrong type
- two different new songs normalize to the same slug

## Duplicate detection rules

Each new song is compared against the existing catalog using these signals:

| Signal | Score |
|---|---|
| exact slug match | `+100` |
| matching version family | `+70` |
| fuzzy title similarity | `0-80` |

Current thresholds:

- score `>= 60`: blocked from import-ready output
- score `>= 40`: included in duplicate review output

## Cloudinary upload behavior

Cloudinary upload is optional by design.

- If Cloudinary environment variables are present, the tool attempts upload for import-ready songs with local media paths.
- If credentials are missing, the tool continues normally and reports that upload was skipped.
- If `--no-upload` is used, upload is skipped even if credentials exist.
- If upload is skipped, `videoUrl` and `coverImageUrl` remain empty unless they were already provided in the input.

Setup:

```bash
copy .env.example .env
```

Fill in:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
WEBSITE_ROOT=D:\Docs\Active Project\React Final Project
# or
# WEBSITE_POSTS_PATH=D:\Docs\Active Project\React Final Project\backend\data\posts.json
```

## Output files

The tool always writes these files to the chosen output directory:

- `normalized_new_songs.json`: all processed songs after normalization
- `import_ready_songs.json`: only songs not blocked by duplicate detection
- `website_posts_ready.json`: import-ready songs mapped to the website post schema
- `duplicate_report.json`: machine-readable duplicate findings
- `import_report.md`: human-readable review report including upload status

When website integration is enabled, it also writes:

- `existing_catalog.extracted.json`: the catalog data actually used for duplicate checks
- `website_posts_merged_preview.json`: a full preview of the website `posts.json` after merging import-ready songs
- `website_posts.backup.<timestamp>.json`: backup of the original website catalog before apply
- `website_live_store.backup.<timestamp>.json`: backup of the live Mongo store before reseed
- `website_reseed.<jobId>.log`: captured website reseed output when browser apply/reseed runs
- `lyrics_merge_updates.json`: lyrics-only merge plan when lyrics merge is enabled

The website `posts.json` output intentionally keeps only authored catalog keys:

- `posts`
- `collections`
- `siteContent`

Operational data such as `users`, `comments`, `email`, and `passwordHash` is not preserved in importer merge output.

## Browser window workflow

If you want a one-command UI instead of manually editing JSON files:

```bash
python main.py --web --website-root "D:\Docs\Active Project\React Final Project"
```

For standalone review without the React website, MongoDB, npm, or Cloudinary:

```bash
python main.py --web --demo
```

Demo mode uses:

- `input/existing_catalog.json`
- `input/new_songs.json`
- `output/demo/web-ui`
- upload disabled
- website apply/reseed disabled until a website target is configured

The local browser window lets you:

1. choose `New Song Import` or `Lyrics Merge`
2. paste one song JSON object or a JSON array
3. attach a video file when importing one song with Cloudinary upload
4. optionally attach a cover image
5. preview duplicate detection, lyrics merge candidates, and website-ready output
6. apply the merged catalog into the website repo
7. reseed the website backend and verify the live store against `posts.json`

The browser flow still uses the same core pipeline as the CLI:

- normalization
- duplicate checking
- optional Cloudinary upload
- blank-lyrics merge for matched existing songs
- website-ready post mapping
- merged `posts.json` preview
- backup + apply + async reseed + live-store verification

## Streamlined website workflow

If you want the shortest safe path into the React website project without touching internal code:

Preview-only workflow:

```bash
python main.py --website-root "D:\Docs\Active Project\React Final Project" --input input/new_songs.json --output-dir output\website-smoke --no-upload
```

Apply directly into the website repo:

```bash
python main.py --website-root "D:\Docs\Active Project\React Final Project" --input input/new_songs.json --output-dir output\website-smoke --no-upload --apply-to-website --reseed-website
```

That workflow now does this automatically:

1. loads the website's current `backend/data/posts.json`
2. uses that catalog for duplicate detection
3. generates website-shaped import entries
4. builds a full merged website catalog preview
5. optionally writes the merged catalog back into the website repo
6. optionally runs the website backend reseed command

The generated `website_posts_ready.json` already includes:

- `id`
- `createdAt`
- `excerpt`
- `content`
- website-safe `releaseStatus` mapping
- default booleans for immediate published import

Mapping behavior:

- `notes` becomes part of generated `content`
- `sunoPrompt` is preserved under `Prompt / Style Notes`
- `audioUrl` and `coverImageUrl` are preserved inside generated `content` because the current website schema does not have first-class fields for them
- `published` defaults to `true` for immediate website visibility after apply
- explicit `versionFamily` input is preserved instead of being re-inferred from the title

## Tests

Run the automated tests with:

```bash
pytest
```

The test suite covers:

- slug normalization
- version family inference
- explicit version family preservation
- release status inference
- duplicate detection basics
- input validation
- duplicate normalized slug detection
- website-ready post mapping
- website merge/apply safety
- authored-only website catalog output
- lyrics merge behavior
- async browser apply/reseed job behavior

## Demo workflow

Standalone instructor demo:

1. Run `python main.py --web --demo`.
2. Open `http://127.0.0.1:8765/` if the browser does not open automatically.
3. Click `Process + Preview`.
4. Show slug normalization, duplicate blocking, import-ready output, and generated files under `output/demo/web-ui`.
5. Explain that apply/reseed is intentionally disabled in standalone mode because no website target is configured.

Full website demo:

1. Run `python main.py --web --website-root "<website-path>"`.
2. Show the two visible workflows: `New Song Import` and `Lyrics Merge`.
3. Paste one song JSON object or a JSON array.
4. Attach a video file if demonstrating Cloudinary upload.
5. Click `Process + Preview`.
6. Show the duplicate decision, lyrics merge candidates, and website-ready payload.
7. Show the merged website preview.
8. Explain that `Save posts.json Only` writes the catalog file, while `Apply To Website` also reseeds and verifies the live database.

## Why this is submission-ready

This project demonstrates:

- a real Python solution to a practical workflow problem
- modular folder structure
- tested behavior
- CLI usability
- defensive input validation
- output that is useful outside the classroom

## Future improvements

- interactive duplicate review mode
- CSV import support
- update-in-place mode for existing songs instead of append-only merge
- batch processing for multiple input files
- richer metadata validation against a formal JSON schema
