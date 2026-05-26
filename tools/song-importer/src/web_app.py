"""Local browser-based UI for the import assistant."""

from __future__ import annotations

import json
import re
import tempfile
import threading
import time
import webbrowser
import uuid
import os
from datetime import datetime, timezone
from dataclasses import replace
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import RequestEntityTooLarge

from src.config import Config
from src.exceptions import SongCatalogError, ValidationError
from src.models import LyricsMergeUpdate, Song
from src.pipeline import run_processing_pipeline, write_processing_outputs
from src.website_integration import (
    apply_merged_catalog,
    build_lyrics_merged_website_catalog,
    build_merged_website_catalog,
    export_live_store_snapshot,
    export_merged_preview,
    load_website_catalog,
    resolve_website_target,
    run_website_catalog_diff,
    run_website_reseed_streaming,
    verify_lyrics_merge_updates_applied,
    website_posts_already_applied,
)


_APPLY_JOBS: dict[str, dict[str, Any]] = {}
_APPLY_JOBS_LOCK = threading.Lock()


def create_app(base_config: Config) -> Flask:
    """Create the Flask app around an existing base config."""
    app = Flask(
        __name__,
        template_folder=str(Path(__file__).resolve().parent.parent / "templates"),
    )
    app.config["BASE_CONFIG"] = base_config
    app.config["MAX_CONTENT_LENGTH"] = _resolve_max_upload_bytes()

    @app.errorhandler(RequestEntityTooLarge)
    def request_entity_too_large(_exc):
        max_mb = app.config["MAX_CONTENT_LENGTH"] // (1024 * 1024)
        return (
            jsonify(
                {
                    "ok": False,
                    "error": (
                        f"Upload is too large for the local importer. "
                        f"Keep the combined files under {max_mb} MB."
                    ),
                }
            ),
            413,
        )

    @app.errorhandler(Exception)
    def unhandled_error(exc):
        if isinstance(exc, SongCatalogError):
            return jsonify({"ok": False, "error": str(exc)}), 400
        app.logger.exception("Unhandled importer error")
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "The importer hit an unexpected local error. Check the terminal running the importer for details.",
                }
            ),
            500,
        )

    @app.get("/")
    def index():
        config = app.config["BASE_CONFIG"]
        return render_template(
            "import_window.html",
            default_song_json=_load_default_song_json(config.input_path),
            default_catalog_path=str(config.catalog_path or ""),
            default_website_root=str(config.website_root or ""),
            default_website_posts=str(config.website_posts_path or ""),
            default_output_dir=str(config.output_dir / "web-ui"),
            demo_mode=config.demo_mode,
            standalone_preview_mode=bool(
                config.catalog_path and not config.website_root and not config.website_posts_path
            ),
            cloudinary_configured=config.cloudinary_configured,
            upload_enabled=config.upload_enabled,
            merge_lyrics_enabled=config.merge_lyrics,
            lyrics_repair_only_enabled=config.lyrics_repair_only,
        )

    @app.post("/api/process")
    def process():
        try:
            payload = _process_web_request(app.config["BASE_CONFIG"], request)
            return jsonify(payload)
        except SongCatalogError as exc:
            return jsonify({"ok": False, "error": str(exc)}), 400

    @app.post("/api/apply")
    def apply():
        try:
            payload = request.get_json(silent=True) or {}
            result = _apply_web_payload(app.config["BASE_CONFIG"], payload)
            return jsonify(result)
        except SongCatalogError as exc:
            return jsonify({"ok": False, "error": str(exc)}), 400

    @app.get("/api/apply/jobs/<job_id>")
    def apply_job(job_id: str):
        job = _get_apply_job(job_id)
        if job is None:
            return jsonify({"ok": False, "error": "Unknown apply job."}), 404
        return jsonify(job)

    return app


def _load_default_song_json(input_path: Path) -> str:
    """Load the configured input JSON for the browser's initial editor value."""
    try:
        if input_path.exists() and input_path.is_file():
            data = json.loads(input_path.read_text(encoding="utf-8"))
            return json.dumps(data, indent=2, ensure_ascii=False)
    except (OSError, json.JSONDecodeError):
        pass

    return json.dumps(
        [
            {
                "title": "Heaven Wakes in Me",
                "lyrics": "Example lyrics here",
                "sunoPrompt": "Cinematic pop with angelic vocals.",
                "notes": "New song for website import.",
                "sourceTag": "suno",
                "collectionSlugs": ["original-personal"],
                "subCategory": "identity",
                "worldLayer": "",
                "themeTags": ["identity", "awakening", "celestial"],
            }
        ],
        indent=2,
    )


def _resolve_max_upload_bytes() -> int:
    """Resolve the local importer upload cap."""
    raw_limit = os.getenv("IMPORTER_MAX_UPLOAD_MB", "").strip()
    if raw_limit:
        try:
            return max(1, int(raw_limit)) * 1024 * 1024
        except ValueError:
            pass
    return 512 * 1024 * 1024


def run_web_app(
    config: Config,
    *,
    host: str = "127.0.0.1",
    port: int = 8765,
    open_browser: bool = True,
) -> int:
    """Run the local web UI and optionally open the browser."""
    app = create_app(config)
    if open_browser:
        url = f"http://{host}:{port}/"
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    app.run(host=host, port=port, debug=False, use_reloader=False)
    return 0


def _process_web_request(base_config: Config, incoming_request) -> dict[str, Any]:
    """Handle one process-preview request from the browser UI."""
    song_json = str(incoming_request.form.get("song_json", "")).strip()
    if not song_json:
        raise ValidationError("Paste song JSON before processing.")

    raw_new_songs = _parse_song_json(song_json)
    output_dir = _resolve_output_dir(
        str(incoming_request.form.get("output_dir", "")).strip(),
        base_config,
    )
    upload_requested = incoming_request.form.get("upload_media") == "true"
    website_root = str(incoming_request.form.get("website_root", "")).strip()
    website_posts = str(incoming_request.form.get("website_posts", "")).strip()
    lyrics_repair_only = incoming_request.form.get("lyrics_repair_only") == "true"
    supersede_overrides = _parse_supersede_overrides(
        incoming_request.form.get("supersede_overrides", "")
    )
    has_uploaded_media = _request_has_uploaded_media(incoming_request)

    if lyrics_repair_only and has_uploaded_media:
        raise ValidationError("Lyrics repair mode does not accept media files.")

    if has_uploaded_media and not upload_requested:
        raise ValidationError(
            "A media file is attached, but Cloudinary upload is disabled. "
            "Enable upload or remove the file before previewing."
        )

    if has_uploaded_media and not base_config.cloudinary_configured:
        raise ValidationError(
            "A media file is attached, but Cloudinary credentials are not configured. "
            "Configure Cloudinary or remove the file before previewing."
        )

    with tempfile.TemporaryDirectory(prefix="song-import-ui-") as temp_dir:
        working_songs = _attach_uploaded_files(
            raw_new_songs,
            incoming_request,
            Path(temp_dir),
        )
        runtime_config = _build_runtime_config(
            base_config,
            output_dir=output_dir,
            website_root=website_root,
            website_posts=website_posts,
            no_upload=not upload_requested,
            merge_lyrics=incoming_request.form.get("merge_lyrics") == "true",
            lyrics_repair_only=lyrics_repair_only,
        )
        outcome = run_processing_pipeline(
            runtime_config,
            raw_new_songs=working_songs,
            base_dir=Path(temp_dir),
            supersede_overrides=supersede_overrides,
        )
        if has_uploaded_media and outcome.import_ready:
            missing_video_urls = [
                result.song.title
                for result in outcome.import_ready
                if result.song._video_path and not result.song.videoUrl
            ]
            if missing_video_urls:
                details = "; ".join(outcome.upload_report.warnings)
                raise ValidationError(
                    "Media upload did not produce a website video URL for: "
                    + ", ".join(missing_video_urls)
                    + (f". {details}" if details else ".")
                )
        website_outputs = write_processing_outputs(outcome)

    return {
        "ok": True,
        "summary": {
            "existingSongs": len(outcome.existing_catalog),
            "processedSongs": len(outcome.results),
            "duplicateCandidates": len(outcome.candidates),
            "blockedImports": len(outcome.blocked),
            "importReadySongs": len(outcome.import_ready),
            "lyricsMergeReadySongs": len(outcome.lyrics_merge_ready),
            "lyricsRepairReadySongs": len(outcome.lyrics_repair_ready),
        },
        "upload": {
            "enabled": outcome.upload_report.enabled,
            "skippedReason": outcome.upload_report.skipped_reason,
            "attemptedFiles": outcome.upload_report.attempted_files,
            "uploadedFiles": outcome.upload_report.uploaded_files,
            "warnings": outcome.upload_report.warnings,
        },
        "results": [_serialize_result(result) for result in outcome.results],
        "lyricsMergeUpdates": [
            {
                "title": update.song.title,
                "slug": update.song.slug,
                "targetTitle": update.target_title,
                "targetSlug": update.target_slug,
                "lyrics": update.song.lyrics,
            }
            for update in outcome.lyrics_merge_updates
        ],
        "lyricsMergeTargetSlugs": [
            update.target_slug for update in outcome.lyrics_merge_updates
        ],
        "websitePostsReady": website_outputs.website_posts_ready,
        "artifacts": {
            "catalogPath": str(outcome.catalog_path),
            "outputDir": str(runtime_config.output_dir),
            "catalogSnapshotPath": str(website_outputs.catalog_snapshot_path or ""),
            "mergedPreviewPath": str(website_outputs.merged_preview_path or ""),
            "websiteTargetPath": str(outcome.website_target.posts_path)
            if outcome.website_target is not None
            else "",
        },
    }


def _apply_web_payload(base_config: Config, payload: dict[str, Any]) -> dict[str, Any]:
    """Apply already-processed website posts to the website catalog."""
    website_posts_ready = payload.get("websitePostsReady")
    lyrics_merge_updates = _deserialize_lyrics_merge_updates(
        payload.get("lyricsMergeUpdates")
    )
    has_new_posts = isinstance(website_posts_ready, list) and bool(website_posts_ready)
    has_lyrics_merges = bool(lyrics_merge_updates)
    if not has_new_posts and not has_lyrics_merges:
        raise ValidationError(
            "No website-ready posts or lyrics merge updates were provided to apply."
        )
    if not has_new_posts:
        website_posts_ready = []

    output_dir = _resolve_output_dir(str(payload.get("outputDir", "")).strip(), base_config)
    website_root = str(payload.get("websiteRoot", "")).strip()
    website_posts = str(payload.get("websitePosts", "")).strip()
    reseed_website = bool(payload.get("reseedWebsite"))

    runtime_config = _build_runtime_config(
        base_config,
        output_dir=output_dir,
        website_root=website_root,
        website_posts=website_posts,
        no_upload=True,
        apply_to_website=True,
        reseed_website=reseed_website,
        merge_lyrics=has_lyrics_merges,
    )
    website_target = resolve_website_target(runtime_config)
    if website_target is None:
        raise ValidationError(
            "Website apply requires a website root or website posts path."
        )

    website_catalog = load_website_catalog(website_target.posts_path)
    already_applied = has_new_posts and website_posts_already_applied(
        website_catalog,
        website_posts_ready,
    )

    merged_catalog = website_catalog
    if has_lyrics_merges:
        merged_catalog = build_lyrics_merged_website_catalog(
            merged_catalog,
            lyrics_merge_updates,
        )

    if has_new_posts and not already_applied:
        merged_catalog = build_merged_website_catalog(merged_catalog, website_posts_ready)

    merged_preview_path = export_merged_preview(merged_catalog, output_dir)

    backup_path = None
    if has_lyrics_merges or not already_applied:
        backup_path = apply_merged_catalog(
            website_catalog,
            merged_catalog,
            website_target,
            output_dir,
        )
        missing_lyrics = verify_lyrics_merge_updates_applied(
            load_website_catalog(website_target.posts_path),
            lyrics_merge_updates,
        )
        if missing_lyrics:
            raise ValidationError(
                "Lyrics merge write completed, but some target posts still do not "
                f"show the requested lyrics: {', '.join(missing_lyrics)}"
            )

    live_store_backup_path = None
    reseed_log_path = None
    reseed_output = ""
    report_lines = []
    if has_lyrics_merges:
        report_lines.append(
            f"Lyrics merges applied to {len(lyrics_merge_updates)} existing post(s)."
        )
    if has_new_posts:
        if already_applied:
            report_lines.append("Website-ready posts were already present in posts.json.")
        else:
            report_lines.append(
                f"Wrote {len(website_posts_ready)} website post(s) into posts.json."
            )
    if reseed_website:
        report_lines.append("Reseed queued for backend/data/posts.json.")

    if reseed_website:
        job_id = uuid.uuid4().hex
        reseed_log_path = output_dir / f"website_reseed.{job_id}.log"
        _register_apply_job(
            job_id,
            {
                "ok": True,
                "jobId": job_id,
                "status": "running",
                "phase": "queued",
                "message": "Reseed started. Polling for progress.",
                "appliedPosts": len(website_posts_ready),
                "alreadyApplied": already_applied,
                "lyricsMergeApplied": has_lyrics_merges,
                "lyricsMergeTargetSlugs": [update.target_slug for update in lyrics_merge_updates],
                "websiteTargetPath": str(website_target.posts_path),
                "backupPath": str(backup_path or ""),
                "liveStoreBackupPath": "",
                "mergedPreviewPath": str(merged_preview_path),
                "reseedWebsite": True,
                "reseedLogPath": str(reseed_log_path),
                "reseedOutput": "",
                "report": {
                    "title": "Apply + reseed running",
                    "status": "running",
                    "summary": report_lines + ["Queued background reseed job."],
                    "artifacts": {
                        "websiteTargetPath": str(website_target.posts_path),
                        "backupPath": str(backup_path or ""),
                        "liveStoreBackupPath": "",
                        "mergedPreviewPath": str(merged_preview_path),
                        "reseedLogPath": str(reseed_log_path),
                    },
                    "reseedOutput": "",
                },
            },
        )

        threading.Thread(
            target=_run_reseed_job,
            args=(
                job_id,
                website_target,
                output_dir,
                report_lines,
                str(backup_path or ""),
                str(merged_preview_path),
                has_lyrics_merges,
                already_applied,
                len(website_posts_ready),
            ),
            daemon=True,
        ).start()

        return _get_apply_job(job_id)

    return {
        "ok": True,
        "appliedPosts": len(website_posts_ready),
        "alreadyApplied": already_applied,
        "lyricsMergeApplied": has_lyrics_merges,
        "lyricsMergeTargetSlugs": [update.target_slug for update in lyrics_merge_updates],
        "websiteTargetPath": str(website_target.posts_path),
        "backupPath": str(backup_path or ""),
        "liveStoreBackupPath": str(live_store_backup_path or ""),
        "mergedPreviewPath": str(merged_preview_path),
        "reseedWebsite": reseed_website,
        "reseedLogPath": str(reseed_log_path or ""),
        "reseedOutput": reseed_output,
        "report": {
            "title": "Apply completed" if not reseed_website else "Apply + reseed completed",
            "status": "success",
            "summary": report_lines,
            "artifacts": {
                "websiteTargetPath": str(website_target.posts_path),
                "backupPath": str(backup_path or ""),
                "liveStoreBackupPath": str(live_store_backup_path or ""),
                "mergedPreviewPath": str(merged_preview_path),
                "reseedLogPath": str(reseed_log_path or ""),
            },
            "reseedOutput": reseed_output,
        },
    }


def _register_apply_job(job_id: str, payload: dict[str, Any]) -> None:
    """Store an apply/reseed job snapshot."""
    with _APPLY_JOBS_LOCK:
        _APPLY_JOBS[job_id] = payload


def _get_apply_job(job_id: str) -> dict[str, Any] | None:
    """Read the latest apply/reseed job snapshot."""
    with _APPLY_JOBS_LOCK:
        job = _APPLY_JOBS.get(job_id)
        if job is None:
            return None

        snapshot = dict(job)
        log_path = str(snapshot.get("reseedLogPath") or "").strip()
        if log_path:
            log_file = Path(log_path)
            if log_file.exists():
                log_text = log_file.read_text(encoding="utf-8")
                snapshot["reseedOutput"] = log_text
                if isinstance(snapshot.get("report"), dict):
                    report = dict(snapshot["report"])
                    report["reseedOutput"] = log_text
                    snapshot["report"] = report
        return snapshot


def _update_apply_job(job_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    """Update an existing job snapshot and return the new state."""
    with _APPLY_JOBS_LOCK:
        job = _APPLY_JOBS.get(job_id)
        if job is None:
            return None
        job.update(updates)
        return dict(job)


def _format_seconds(elapsed_seconds: float) -> str:
    """Format elapsed time for operator-facing progress reports."""
    if elapsed_seconds < 1:
        return f"{elapsed_seconds:.1f}s"
    if elapsed_seconds < 60:
        return f"{elapsed_seconds:.1f}s"
    minutes, seconds = divmod(elapsed_seconds, 60)
    return f"{int(minutes)}m {seconds:.0f}s"


def _run_reseed_job(
    job_id: str,
    website_target,
    output_dir: Path,
    report_lines: list[str],
    backup_path: str,
    merged_preview_path: str,
    has_lyrics_merges: bool,
    already_applied: bool,
    applied_posts_count: int,
) -> None:
    """Run the live reseed in the background and update the job snapshot."""
    log_path = output_dir / f"website_reseed.{job_id}.log"
    live_store_backup_path = ""
    phase_summaries: list[str] = []

    def set_phase(phase: str, summary_line: str) -> None:
        _update_apply_job(
            job_id,
            {
                "ok": True,
                "status": "running",
                "phase": phase,
                "message": summary_line,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "report": {
                    "title": "Apply + reseed running",
                    "status": "running",
                    "summary": report_lines + phase_summaries + [summary_line],
                    "artifacts": {
                        "websiteTargetPath": str(website_target.posts_path),
                        "backupPath": backup_path,
                        "liveStoreBackupPath": live_store_backup_path,
                        "mergedPreviewPath": merged_preview_path,
                        "reseedLogPath": str(log_path),
                    },
                    "reseedOutput": log_path.read_text(encoding="utf-8")
                    if log_path.exists()
                    else "",
                },
            },
        )

    def complete_phase(label: str, started_at: float) -> None:
        phase_summaries.append(f"{label} completed in {_format_seconds(time.monotonic() - started_at)}.")

    try:
        phase_started_at = time.monotonic()
        set_phase(
            "backup",
            "Backing up the current live Mongo store before reseed.",
        )
        live_store_backup_path = str(export_live_store_snapshot(website_target, output_dir))
        complete_phase("Live-store backup", phase_started_at)

        phase_started_at = time.monotonic()
        set_phase(
            "reseed",
            "Running website npm run reseed against backend/data/posts.json.",
        )
        reseed_output = run_website_reseed_streaming(website_target, log_path)
        complete_phase("Website reseed", phase_started_at)

        phase_started_at = time.monotonic()
        set_phase(
            "verify",
            "Verifying live Mongo store matches backend/data/posts.json.",
        )
        verification_output = run_website_catalog_diff(website_target)
        complete_phase("Live-store verification", phase_started_at)
        if not _website_catalog_diff_is_clean(verification_output):
            raise SongCatalogError(
                "Live store verification reported drift after reseed.\n"
                + verification_output
            )
        final_report = {
            "title": "Apply + reseed completed",
            "status": "success",
            "summary": report_lines
            + phase_summaries
            + [
                "Live site reseeded from backend/data/posts.json.",
                "Live store verification matched backend/data/posts.json.",
            ],
            "artifacts": {
                "websiteTargetPath": str(website_target.posts_path),
                "backupPath": backup_path,
                "liveStoreBackupPath": live_store_backup_path,
                "mergedPreviewPath": merged_preview_path,
                "reseedLogPath": str(log_path),
                "verificationOutput": verification_output,
            },
            "reseedOutput": reseed_output,
            "verificationOutput": verification_output,
        }
        _update_apply_job(
            job_id,
            {
                "ok": True,
                "status": "success",
                "phase": "completed",
                "message": "Reseed completed successfully.",
                "appliedPosts": applied_posts_count,
                "alreadyApplied": already_applied,
                "lyricsMergeApplied": has_lyrics_merges,
                "websiteTargetPath": str(website_target.posts_path),
                "backupPath": backup_path,
                "liveStoreBackupPath": live_store_backup_path,
                "mergedPreviewPath": merged_preview_path,
                "reseedWebsite": True,
                "reseedLogPath": str(log_path),
                "reseedOutput": reseed_output,
                "verificationOutput": verification_output,
                "report": final_report,
                "finishedAt": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as exc:
        log_text = ""
        if log_path.exists():
            log_text = log_path.read_text(encoding="utf-8")
        error_message = str(exc)
        final_report = {
            "title": "Apply + reseed failed",
            "status": "error",
            "summary": report_lines + phase_summaries + [error_message],
            "artifacts": {
                "websiteTargetPath": str(website_target.posts_path),
                "backupPath": backup_path,
                "liveStoreBackupPath": live_store_backup_path,
                "mergedPreviewPath": merged_preview_path,
                "reseedLogPath": str(log_path),
                "verificationOutput": "",
            },
            "reseedOutput": log_text or error_message,
        }
        _update_apply_job(
            job_id,
            {
                "ok": False,
                "status": "error",
                "phase": "failed",
                "message": error_message,
                "reseedWebsite": True,
                "reseedLogPath": str(log_path),
                "reseedOutput": log_text or error_message,
                "verificationOutput": "",
                "report": final_report,
                "finishedAt": datetime.now(timezone.utc).isoformat(),
            },
        )


def _website_catalog_diff_is_clean(output: str) -> bool:
    """Return True when the tracked catalog and live store are in sync."""
    checks = [
        r"Live-only posts:\s+0\b",
        r"Tracked-only posts:\s+0\b",
        r"Posts with field drift:\s+0\b",
        r"Collections with field drift:\s+0\b",
        r"Site content sections changed:\s+0\b",
        r"Collection featured slug issues:\s+0\b",
    ]
    return all(re.search(pattern, output) for pattern in checks)


def _parse_song_json(raw_json: str) -> list[dict[str, Any]]:
    """Accept either one song object or a list of song objects from the form."""
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValidationError(
            f"Invalid song JSON: {exc.msg} (line {exc.lineno}, column {exc.colno})"
        ) from exc

    if isinstance(parsed, dict):
        return [parsed]
    if isinstance(parsed, list):
        return parsed
    raise ValidationError("Song JSON must be an object or a list of objects.")


def _attach_uploaded_files(
    songs: list[dict[str, Any]],
    incoming_request,
    temp_dir: Path,
) -> list[dict[str, Any]]:
    """Persist uploaded files and attach their paths to songs."""
    working_songs = [dict(song) for song in songs]
    video_file = incoming_request.files.get("video_file")
    cover_file = incoming_request.files.get("cover_image_file")

    if len(working_songs) != 1 and any(
        file and file.filename for file in [video_file, cover_file]
    ):
        raise ValidationError(
            "The browser uploader currently supports one song object per submission "
            "when files are attached."
        )

    if not working_songs:
        raise ValidationError("At least one song object is required.")

    song = working_songs[0]
    if video_file and video_file.filename:
        video_path = temp_dir / video_file.filename
        video_file.save(video_path)
        song["videoPath"] = str(video_path)

    if cover_file and cover_file.filename:
        cover_path = temp_dir / cover_file.filename
        cover_file.save(cover_path)
        song["coverImagePath"] = str(cover_path)

    return working_songs


def _request_has_uploaded_media(incoming_request) -> bool:
    """Return True when the browser submitted a real media file."""
    return any(
        file and file.filename
        for file in [
            incoming_request.files.get("video_file"),
            incoming_request.files.get("cover_image_file"),
        ]
    )


def _resolve_output_dir(raw_output_dir: str, base_config: Config) -> Path:
    """Resolve the requested output directory or fall back to a web-ui folder."""
    if raw_output_dir:
        return Path(raw_output_dir)
    return base_config.output_dir / "web-ui"


def _build_runtime_config(
    base_config: Config,
    *,
    output_dir: Path,
    website_root: str,
        website_posts: str,
        no_upload: bool,
        apply_to_website: bool = False,
        reseed_website: bool = False,
        merge_lyrics: bool = False,
        lyrics_repair_only: bool = False,
) -> Config:
    """Build a per-request config without mutating the base config."""
    request_has_website_target = bool(website_root or website_posts)
    base_has_website_target = bool(base_config.website_root or base_config.website_posts_path)
    catalog_path = (
        None
        if request_has_website_target or (base_has_website_target and base_config.catalog_path is None)
        else base_config.catalog_path
    )
    return replace(
        base_config,
        catalog_path=catalog_path,
        input_path=base_config.input_path,
        output_dir=output_dir,
        no_upload=no_upload,
        dry_run=False,
        website_root=Path(website_root) if website_root else base_config.website_root,
        website_posts_path=Path(website_posts)
        if website_posts
        else base_config.website_posts_path,
        apply_to_website=apply_to_website,
        reseed_website=reseed_website,
        merge_lyrics=merge_lyrics or lyrics_repair_only,
        lyrics_repair_only=lyrics_repair_only,
    )


def _serialize_result(result) -> dict[str, Any]:
    """Serialize one processing result for the browser."""
    return {
        "song": result.song.to_dict(),
        "matches": [
            {
                "title": match.title,
                "slug": match.slug,
                "family": match.family,
                "status": match.status,
                "score": match.score,
            }
            for match in result.matches
        ],
        "isBlocked": result.is_blocked,
        "blockReason": result.block_reason,
        "suggestedAction": result.suggested_action,
        "bestScore": result.best_score,
        "supersedeTargetSlug": result.supersede_target_slug,
        "supersedeReason": result.supersede_reason,
    }


def _parse_supersede_overrides(raw_value: Any) -> list[dict[str, str]]:
    """Parse browser-provided supersede import overrides safely."""
    text = str(raw_value or "").strip()
    if not text:
        return []

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValidationError("Supersede overrides must be valid JSON.") from exc

    if not isinstance(parsed, list):
        raise ValidationError("Supersede overrides must be a JSON array.")

    overrides: list[dict[str, str]] = []
    for entry in parsed:
        if not isinstance(entry, dict):
            continue

        song_slug = str(entry.get("songSlug", "")).strip()
        target_slug = str(entry.get("targetSlug", "")).strip()
        reason = str(entry.get("reason", "")).strip()

        if not song_slug or not target_slug:
            continue

        overrides.append(
            {
                "songSlug": song_slug,
                "targetSlug": target_slug,
                "reason": reason,
            }
        )

    return overrides


def _deserialize_lyrics_merge_updates(raw_updates) -> list[LyricsMergeUpdate]:
    """Deserialize lyric merge updates from a browser payload."""
    if not isinstance(raw_updates, list):
        return []

    updates: list[LyricsMergeUpdate] = []
    for update in raw_updates:
        if not isinstance(update, dict):
            continue
        title = str(update.get("title", "")).strip()
        slug = str(update.get("slug", "")).strip()
        target_title = str(update.get("targetTitle", "")).strip()
        target_slug = str(update.get("targetSlug", "")).strip()
        lyrics = str(update.get("lyrics", "")).strip()
        if not target_slug or not lyrics:
            continue

        updates.append(
            LyricsMergeUpdate(
                song=Song(
                    title=title,
                    slug=slug or target_slug,
                    lyrics=lyrics,
                ),
                target_title=target_title,
                target_slug=target_slug,
            )
        )

    return updates
