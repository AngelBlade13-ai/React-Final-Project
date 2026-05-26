"""CLI entry point for the Song Catalog Import Assistant."""

import argparse
import sys
from pathlib import Path

from src.config import Config
from src.exceptions import SongCatalogError
from src.pipeline import run_processing_pipeline, write_processing_outputs
from src.web_app import run_web_app


def build_parser() -> argparse.ArgumentParser:
    """Create the command-line parser."""
    parser = argparse.ArgumentParser(
        prog="song-catalog-import-assistant",
        description="Normalize, deduplicate, and export songs for website import.",
    )
    parser.add_argument(
        "--catalog",
        metavar="PATH",
        help=(
            "Path to existing catalog JSON. When omitted, --website-root or "
            "--website-posts becomes the source automatically."
        ),
    )
    parser.add_argument(
        "--input",
        default="input/new_songs.json",
        metavar="PATH",
        help="Path to new songs JSON.",
    )
    parser.add_argument(
        "--output-dir",
        default="output",
        metavar="PATH",
        help="Directory for generated output files.",
    )
    parser.add_argument(
        "--no-upload",
        action="store_true",
        help="Skip Cloudinary upload even when credentials are configured.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and process data without writing output files.",
    )
    parser.add_argument(
        "--website-root",
        metavar="PATH",
        help=(
            "Path to the website repo root. The tool will use "
            "backend/data/posts.json automatically."
        ),
    )
    parser.add_argument(
        "--website-posts",
        metavar="PATH",
        help="Path to the website's backend/data/posts.json file.",
    )
    parser.add_argument(
        "--apply-to-website",
        action="store_true",
        help=(
            "Write the merged preview back into the website posts.json file after "
            "generating output."
        ),
    )
    parser.add_argument(
        "--reseed-website",
        action="store_true",
        help="Run the website backend reseed command after applying the merged catalog.",
    )
    parser.add_argument(
        "--web",
        action="store_true",
        help="Open the local browser-based import window instead of the text CLI flow.",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help=(
            "Run with bundled sample catalog/input data, upload disabled, and no "
            "website integration. Useful for standalone review."
        ),
    )
    parser.add_argument(
        "--merge-lyrics",
        action="store_true",
        help="Treat matching songs as lyrics-only updates when the website entry is missing lyrics.",
    )
    parser.add_argument(
        "--lyrics-repair-only",
        action="store_true",
        help=(
            "Skip new-song import flow and only repair missing lyrics on existing "
            "website songs."
        ),
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        metavar="HOST",
        help="Host for the local web app when --web is used.",
    )
    parser.add_argument(
        "--port",
        default=8765,
        type=int,
        metavar="PORT",
        help="Port for the local web app when --web is used.",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not auto-open the browser window in --web mode.",
    )
    return parser


def run(config: Config) -> int:
    """Execute the import preparation pipeline."""
    outcome = run_processing_pipeline(config)
    total_steps = 7 if outcome.website_target is not None and not config.dry_run else 6

    print("Song Catalog Import Assistant")
    print("=" * 30)

    print(f"[1/{total_steps}] Loading existing catalog: {outcome.catalog_path}")
    print(f"      Loaded {len(outcome.existing_catalog)} existing songs.")

    print(f"[2/{total_steps}] Loading new songs: {config.input_path}")
    print(f"      Loaded {len(outcome.raw_new_songs)} new songs.")

    print(f"[3/{total_steps}] Normalizing songs")
    for song in outcome.prepared_songs:
        print(f"      {song.title} -> {song.slug}")

    if config.lyrics_repair_only:
        print(f"[4/{total_steps}] Checking lyrics repair targets")
    else:
        print(f"[4/{total_steps}] Checking for duplicates")
    for result in outcome.results:
        if result.is_blocked:
            print(f"      BLOCKED {result.song.title} (score: {result.best_score})")
        elif result.matches:
            print(f"      REVIEW  {result.song.title} (score: {result.best_score})")
        else:
            print(f"      CLEAR   {result.song.title}")

    print(
        f"[5/{total_steps}] {'Media upload' if not config.lyrics_repair_only else 'Lyrics repair pass'}"
    )
    upload_report = outcome.upload_report

    if config.dry_run:
        print(
            f"[6/{total_steps}] Dry run complete; no output files or website files were written."
        )
    else:
        print(f"[6/{total_steps}] Writing output files to: {config.output_dir}")
        website_outputs = write_processing_outputs(outcome)

        if outcome.website_target is not None:
            print(f"[7/{total_steps}] Preparing website merge artifacts")
            print(f"      Catalog snapshot: {website_outputs.catalog_snapshot_path}")
            print(f"      Merge preview:    {website_outputs.merged_preview_path}")
            print(
                "      Website target:   "
                f"{outcome.website_target.posts_path} "
                f"(+{len(website_outputs.website_posts_ready)} new posts)"
            )

            if config.apply_to_website:
                print(f"      Applied merged catalog to: {outcome.website_target.posts_path}")
                print(f"      Backup written to:         {website_outputs.backup_path}")

                if config.reseed_website:
                    print(
                        "      Website reseed completed. Log: "
                        f"{website_outputs.reseed_log_path}"
                    )
                    if website_outputs.live_store_backup_path is not None:
                        print(
                            "      Live store backup:      "
                            f"{website_outputs.live_store_backup_path}"
                        )

    print("\nSummary")
    print("-" * 30)
    print(f"Processed songs:       {len(outcome.results)}")
    print(f"Duplicate candidates:  {len(outcome.candidates)}")
    print(f"Blocked imports:       {len(outcome.blocked)}")
    print(f"Import-ready songs:    {len(outcome.import_ready)}")
    if config.merge_lyrics:
        print(f"Lyrics merges:         {len(outcome.lyrics_merge_ready)}")
    if config.lyrics_repair_only:
        print(f"Lyrics repairs:        {len(outcome.lyrics_repair_ready)}")

    if upload_report.enabled:
        print(f"Uploaded media files:  {upload_report.uploaded_files}")
    elif upload_report.skipped_reason:
        print(f"Upload status:         skipped ({upload_report.skipped_reason})")

    if not config.dry_run:
        print("Website handoff file:  website_posts_ready.json")
        if outcome.website_target is not None:
            print("Website merge preview: website_posts_merged_preview.json")
            if config.apply_to_website:
                print("Website apply status:  applied to posts.json")
                if config.reseed_website:
                    print("Website reseed status: completed")
                    if website_outputs.live_store_backup_path is not None:
                        print("Live store backup:     written before reseed")

    return 0


def main() -> None:
    """Parse CLI args and exit with the pipeline status code."""
    parser = build_parser()
    args = parser.parse_args()
    default_config = Config()

    catalog_path = Path(args.catalog) if args.catalog else None
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    no_upload = args.no_upload
    website_root = Path(args.website_root) if args.website_root else default_config.website_root
    website_posts_path = (
        Path(args.website_posts) if args.website_posts else default_config.website_posts_path
    )

    if args.demo:
        catalog_path = Path("input/existing_catalog.json")
        input_path = Path("input/new_songs.json")
        output_dir = Path("output/demo")
        no_upload = True
        website_root = None
        website_posts_path = None

    config = Config(
        catalog_path=catalog_path,
        input_path=input_path,
        output_dir=output_dir,
        no_upload=no_upload,
        dry_run=args.dry_run,
        website_root=website_root,
        website_posts_path=website_posts_path,
        apply_to_website=False if args.demo else args.apply_to_website,
        reseed_website=False if args.demo else args.reseed_website,
        merge_lyrics=args.merge_lyrics or args.lyrics_repair_only,
        lyrics_repair_only=args.lyrics_repair_only,
        demo_mode=args.demo,
    )

    try:
        if args.web:
            status = run_web_app(
                config,
                host=args.host,
                port=args.port,
                open_browser=not args.no_browser,
            )
        else:
            status = run(config)
    except SongCatalogError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        status = 1

    sys.exit(status)


if __name__ == "__main__":
    main()
