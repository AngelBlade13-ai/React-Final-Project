# Demo Notes

## Suggested demo flow

1. Explain the problem: importing songs by hand causes slug mistakes, duplicate entries, and inconsistent version grouping.
2. Run `python main.py --web --website-root "<website-path>"`.
3. Paste one song JSON object into the window.
4. Attach a video file.
5. Click `Process + Preview`.
6. Show the duplicate decision, `website_posts_ready.json`, and the merged website preview.
7. Explain that blocked songs still appear in the review view but not in the import-ready output.
8. Click `Apply To Website` or explain that `Apply + Reseed Website` completes the handoff without editing the website repo manually.

## Demo talking points

- The tool is standalone Python, not part of the website app.
- The tool now accepts the website repo path directly instead of needing manual internal edits.
- The tool can also open a local browser window so the workflow feels like an app instead of a command-only pipeline.
- The output schema matches the website workflow directly.
- The tool emits both append-ready post objects and a full merged `posts.json` preview.
- Duplicate detection uses slug, version family, and fuzzy title similarity.
- Cloudinary upload is optional, so the project still demos cleanly without credentials.
- Tests cover the main edge cases that could break a real import batch.
