"""Shared processing pipeline for CLI and web flows."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from src.config import Config
from src.duplicate_checker import check_duplicates
from src.exceptions import SongCatalogError
from src.exporter import export_all
from src.models import SongResult, UploadReport
from src.normalizer import prepare_song
from src.uploader import upload_media
from src.utils import (
    extract_catalog_entries,
    load_json,
    validate_catalog,
    validate_new_songs,
    validate_prepared_songs,
)
from src.website_integration import (
    WebsiteTarget,
    apply_merged_catalog,
    build_lyrics_merged_website_catalog,
    build_merged_website_catalog,
    export_catalog_snapshot,
    export_lyrics_merge_updates,
    export_live_store_snapshot,
    export_merged_preview,
    get_effective_catalog_path,
    load_website_catalog,
    find_lyrics_merge_updates,
    resolve_website_target,
    run_website_reseed,
    validate_website_catalog,
)
from src.website_mapper import map_songs_to_website_posts


@dataclass
class ProcessOutcome:
    """Full result of a processing pass."""

    config: Config
    website_target: WebsiteTarget | None
    catalog_path: Path
    existing_catalog_raw: Any
    existing_catalog: list[dict]
    raw_new_songs: list[dict]
    prepared_songs: list
    results: list
    import_ready: list
    lyrics_merge_ready: list
    lyrics_merge_updates: list
    lyrics_repair_ready: list
    blocked: list
    candidates: list
    upload_report: Any


@dataclass
class WebsiteOutputOutcome:
    """Website-oriented artifacts built from a processing pass."""

    website_posts_ready: list[dict]
    lyrics_merge_updates: list[Any] = field(default_factory=list)
    catalog_snapshot_path: Path | None = None
    merged_catalog: dict[str, Any] | None = None
    merged_preview_path: Path | None = None
    backup_path: Path | None = None
    live_store_backup_path: Path | None = None
    reseed_log_path: Path | None = None
    reseed_output: str = ""


def apply_supersede_import_overrides(
    results: list[SongResult],
    overrides: list[dict[str, str]] | None = None,
) -> None:
    """Convert selected duplicate-review results into intentional superseding imports."""
    if not overrides:
        return

    override_map = {
        str(entry.get("songSlug", "")).strip().lower(): {
            "targetSlug": str(entry.get("targetSlug", "")).strip(),
            "reason": str(entry.get("reason", "")).strip(),
        }
        for entry in overrides
        if str(entry.get("songSlug", "")).strip() and str(entry.get("targetSlug", "")).strip()
    }

    if not override_map:
        return

    for result in results:
        song_slug = result.song.slug.strip().lower()
        override = override_map.get(song_slug)

        if override is None:
            continue

        target_slug = override["targetSlug"]
        target_match = next(
            (
                match
                for match in result.matches
                if match.slug.strip().lower() == target_slug.strip().lower()
            ),
            None,
        )
        if target_match is None:
            continue

        reason = (
            override["reason"]
            or f"Superseded by imported version '{result.song.title}'."
        )
        result.is_blocked = False
        result.block_reason = (
            f"Intentional superseding import approved for {target_match.title}."
        )
        result.suggested_action = "supersede-import"
        result.supersede_target_slug = target_match.slug
        result.supersede_reason = reason
        result.song._supersede_target_slug = target_match.slug
        result.song._supersede_reason = reason


def run_processing_pipeline(
    config: Config,
    raw_new_songs: list[dict] | None = None,
    *,
    base_dir: Path | None = None,
    supersede_overrides: list[dict[str, str]] | None = None,
) -> ProcessOutcome:
    """Run the shared normalization, duplicate-check, and upload flow."""
    if config.reseed_website and not config.apply_to_website:
        raise SongCatalogError("--reseed-website requires --apply-to-website.")

    website_target = resolve_website_target(config)
    catalog_path = get_effective_catalog_path(config, website_target)
    existing_catalog_raw = load_json(catalog_path)
    validate_catalog(existing_catalog_raw)
    existing_catalog = extract_catalog_entries(existing_catalog_raw)

    if raw_new_songs is None:
        raw_new_songs = load_json(config.input_path)
        validate_new_songs(raw_new_songs, config.input_path)
        normalization_base_dir = config.input_path.parent
    else:
        validate_new_songs(raw_new_songs, base_dir)
        normalization_base_dir = base_dir

    prepared_songs = [
        prepare_song(song, base_dir=normalization_base_dir) for song in raw_new_songs
    ]
    validate_prepared_songs(prepared_songs)

    lyrics_merge_updates = []
    lyrics_repair_ready: list = []
    if config.lyrics_repair_only:
        lyrics_merge_updates = find_lyrics_merge_updates(prepared_songs, existing_catalog)
        lyrics_merge_slugs = {
            update.song.slug.strip().lower() for update in lyrics_merge_updates
        }
        lyrics_merge_titles = {
            update.song.title.strip().lower() for update in lyrics_merge_updates
        }
        results = []
        for song in prepared_songs:
            if (
                song.slug.strip().lower() in lyrics_merge_slugs
                or song.title.strip().lower() in lyrics_merge_titles
            ):
                results.append(
                    SongResult(
                        song=song,
                        suggested_action="repair-lyrics",
                    )
                )
            else:
                results.append(
                    SongResult(
                        song=song,
                        is_blocked=True,
                        block_reason=(
                            "No matching existing website song with blank lyrics was found."
                        ),
                        suggested_action="repair-lyrics",
                    )
                )
        import_ready = []
        lyrics_merge_ready = []
        lyrics_repair_ready = [result for result in results if not result.is_blocked]
        blocked = [result for result in results if result.is_blocked]
        candidates = []
    else:
        results = check_duplicates(prepared_songs, existing_catalog, config)
        apply_supersede_import_overrides(results, supersede_overrides)
        if config.merge_lyrics:
            lyrics_merge_updates = find_lyrics_merge_updates(prepared_songs, existing_catalog)
            lyrics_merge_by_slug = {
                update.song.slug.strip().lower(): update for update in lyrics_merge_updates
            }

            for result in results:
                if result.song.slug.strip().lower() in lyrics_merge_by_slug:
                    result.is_blocked = False
                    result.block_reason = "Lyrics missing in existing post; safe to merge."
                    result.suggested_action = "merge-lyrics"

        import_ready = [
            result
            for result in results
            if result.suggested_action in {"import", "supersede-import"}
        ]
        lyrics_merge_ready = [
            result for result in results if result.suggested_action == "merge-lyrics"
        ]
        lyrics_repair_ready = []
        blocked = [result for result in results if result.is_blocked]
        candidates = [result for result in results if result.matches]

    if config.dry_run:
        upload_report = UploadReport(
            enabled=False,
            skipped_reason=(
                "Lyrics repair mode does not upload media."
                if config.lyrics_repair_only
                else "Upload skipped in dry-run mode."
            ),
        )
    else:
        upload_report = (
            UploadReport(
                enabled=False,
                skipped_reason="Lyrics repair mode does not upload media.",
            )
            if config.lyrics_repair_only
            else upload_media([result.song for result in import_ready], config)
        )

    return ProcessOutcome(
        config=config,
        website_target=website_target,
        catalog_path=catalog_path,
        existing_catalog_raw=existing_catalog_raw,
        existing_catalog=existing_catalog,
        raw_new_songs=raw_new_songs,
        prepared_songs=prepared_songs,
        results=results,
        import_ready=import_ready,
        lyrics_merge_ready=lyrics_merge_ready,
        lyrics_merge_updates=lyrics_merge_updates,
        lyrics_repair_ready=lyrics_repair_ready,
        blocked=blocked,
        candidates=candidates,
        upload_report=upload_report,
    )


def write_processing_outputs(outcome: ProcessOutcome) -> WebsiteOutputOutcome:
    """Write the standard output files and any website merge artifacts."""
    output_dir = outcome.config.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    export_all(outcome.results, outcome.config, outcome.upload_report)

    website_outputs = WebsiteOutputOutcome(
        website_posts_ready=map_songs_to_website_posts(
            [result.song for result in outcome.import_ready]
        )
    )

    if outcome.config.merge_lyrics or outcome.config.lyrics_repair_only:
        website_outputs.lyrics_merge_updates = outcome.lyrics_merge_updates
        export_lyrics_merge_updates(outcome.lyrics_merge_updates, output_dir)

    if outcome.website_target is None:
        return website_outputs

    website_outputs.catalog_snapshot_path = export_catalog_snapshot(
        outcome.existing_catalog,
        output_dir,
    )

    website_catalog = (
        validate_website_catalog(outcome.existing_catalog_raw, outcome.catalog_path)
        if outcome.catalog_path.resolve() == outcome.website_target.posts_path.resolve()
        else load_website_catalog(outcome.website_target.posts_path)
    )
    if (
        outcome.config.merge_lyrics or outcome.config.lyrics_repair_only
    ) and website_outputs.lyrics_merge_updates:
        website_catalog = build_lyrics_merged_website_catalog(
            website_catalog,
            website_outputs.lyrics_merge_updates,
        )
    website_outputs.merged_catalog = (
        website_catalog
        if outcome.config.lyrics_repair_only
        else build_merged_website_catalog(
            website_catalog,
            website_outputs.website_posts_ready,
        )
    )
    website_outputs.merged_preview_path = export_merged_preview(
        website_outputs.merged_catalog,
        output_dir,
    )

    if outcome.config.apply_to_website:
        website_outputs.backup_path = apply_merged_catalog(
            website_catalog,
            website_outputs.merged_catalog,
            outcome.website_target,
            output_dir,
        )

        if outcome.config.reseed_website:
            website_outputs.live_store_backup_path = export_live_store_snapshot(
                outcome.website_target,
                output_dir,
            )
            website_outputs.reseed_output = run_website_reseed(outcome.website_target)
            website_outputs.reseed_log_path = output_dir / "website_reseed.log"
            website_outputs.reseed_log_path.write_text(
                f"{website_outputs.reseed_output}\n",
                encoding="utf-8",
            )

    return website_outputs
