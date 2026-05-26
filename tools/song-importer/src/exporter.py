"""Output file generation."""

import json
from datetime import datetime
from pathlib import Path
from typing import List

from src.config import Config
from src.models import SongResult, UploadReport
from src.website_mapper import map_songs_to_website_posts


def _write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  Wrote: {path}")


def _write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")
    print(f"  Wrote: {path}")


def export_normalized(results: List[SongResult], output_dir: Path) -> None:
    """Write all normalized songs, including blocked songs."""
    _write_json(output_dir / "normalized_new_songs.json", [result.song.to_dict() for result in results])


def export_import_ready(results: List[SongResult], output_dir: Path) -> None:
    """Write only songs cleared for import."""
    _write_json(
        output_dir / "import_ready_songs.json",
        [result.song.to_dict() for result in results if not result.is_blocked],
    )


def export_website_ready_posts(results: List[SongResult], output_dir: Path) -> None:
    """Write import-ready songs mapped to the website's post schema."""
    import_ready_songs = [result.song for result in results if not result.is_blocked]
    _write_json(
        output_dir / "website_posts_ready.json",
        map_songs_to_website_posts(import_ready_songs),
    )


def export_duplicate_report_json(results: List[SongResult], output_dir: Path) -> None:
    """Write machine-readable duplicate findings."""
    data = []
    for result in results:
        if not result.matches:
            continue

        data.append(
            {
                "title": result.song.title,
                "slug": result.song.slug,
                "versionFamily": result.song.versionFamily,
                "bestScore": result.best_score,
                "isBlocked": result.is_blocked,
                "blockReason": result.block_reason,
                "suggestedAction": result.suggested_action,
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
            }
        )

    _write_json(output_dir / "duplicate_report.json", data)


def export_markdown_report(
    results: List[SongResult],
    output_dir: Path,
    upload_report: UploadReport,
) -> None:
    """Write a human-readable import review report."""
    total = len(results)
    blocked = [result for result in results if result.is_blocked]
    import_ready = [result for result in results if not result.is_blocked]
    candidates = [result for result in results if result.matches]
    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")

    lines = [
        "# Catalog Import Report",
        "",
        f"_Generated: {timestamp}_",
        "",
        f"- Total new songs processed: **{total}**",
        f"- Duplicate candidates: **{len(candidates)}**",
        f"- Blocked imports: **{len(blocked)}**",
        f"- Import-ready songs: **{len(import_ready)}**",
        "",
        "## Upload Summary",
        "",
    ]

    if upload_report.enabled:
        lines.extend(
            [
                f"- Upload attempted files: **{upload_report.attempted_files}**",
                f"- Successfully uploaded files: **{upload_report.uploaded_files}**",
            ]
        )
    else:
        lines.append(f"- Upload status: **skipped** ({upload_report.skipped_reason})")

    if upload_report.warnings:
        lines.append("- Upload warnings:")
        for warning in upload_report.warnings:
            lines.append(f"  - {warning}")
    lines.append("")

    if blocked:
        lines.extend(["## Blocked Imports", ""])
        for result in blocked:
            lines.append(f"- `{result.song.title}` -> {result.block_reason}")
        lines.append("")

    if import_ready:
        lines.extend(["## Import-Ready Songs", ""])
        for result in import_ready:
            lines.append(
                f"- `{result.song.title}` "
                f"(slug: `{result.song.slug}`, "
                f"family: `{result.song.versionFamily}`, "
                f"status: `{result.song.releaseStatus}`)"
            )
        lines.append("")

    if candidates:
        lines.extend(["## Duplicate Candidates", ""])
        for result in candidates:
            lines.extend(
                [
                    f"### {result.song.title}",
                    f"- New slug: `{result.song.slug}`",
                    f"- Version family: `{result.song.versionFamily}`",
                    f"- Best score: **{result.best_score}**",
                    f"- Suggested action: **{result.suggested_action}**",
                    "- Matches:",
                ]
            )
            for match in result.matches:
                lines.append(
                    f"  - `{match.title}` "
                    f"(slug: `{match.slug}`, "
                    f"family: `{match.family}`, "
                    f"status: `{match.status}`, "
                    f"score: {match.score})"
                )
            lines.append("")

    _write_text(output_dir / "import_report.md", "\n".join(lines))


def export_all(
    results: List[SongResult],
    config: Config,
    upload_report: UploadReport,
) -> None:
    """Write all output files to config.output_dir."""
    output_dir = config.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    export_normalized(results, output_dir)
    export_import_ready(results, output_dir)
    export_website_ready_posts(results, output_dir)
    export_duplicate_report_json(results, output_dir)
    export_markdown_report(results, output_dir, upload_report)
