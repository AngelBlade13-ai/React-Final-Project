#!/usr/bin/env python3
"""
Lightweight content audit for the archive dataset.

This script is intentionally beginner-friendly:
- standard library only
- small, named helper functions
- supports text, markdown, and JSON output

Run from the repo root:
    python tools/content_audit.py
    python tools/content_audit.py --format markdown
    python tools/content_audit.py --write docs/content-audit.md
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DATA_PATH = Path("backend/data/posts.json")
STATUS_ORDER = ("canon", "alternate", "working")


@dataclass
class Issue:
    key: str
    label: str
    description: str
    count: int
    samples: list[dict[str, str]]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit archive content quality from the local JSON dataset.")
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Path to the archive JSON file. Defaults to backend/data/posts.json.",
    )
    parser.add_argument(
        "--format",
        choices=("text", "markdown", "json"),
        default="text",
        help="Output format. Defaults to text.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=5,
        help="How many sample items to include per issue. Defaults to 5.",
    )
    parser.add_argument(
        "--write",
        type=Path,
        default=None,
        help="Optional file path to save the rendered report.",
    )
    return parser.parse_args()


def load_payload(path: Path) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8")
    payload = json.loads(raw)

    if not isinstance(payload, dict):
        raise ValueError("Expected the JSON file to contain a top-level object.")

    return payload


def release_status(post: dict[str, Any]) -> str:
    status = str(post.get("releaseStatus", "")).strip().lower()
    return status if status in STATUS_ORDER else "canon"


def has_video(post: dict[str, Any]) -> bool:
    return bool(str(post.get("videoUrl", "")).strip())


def has_lyrics(post: dict[str, Any]) -> bool:
    return bool(str(post.get("lyrics", "")).strip())


def is_public(post: dict[str, Any]) -> bool:
    return bool(post.get("published")) and post.get("isPubliclyVisible", True) is not False


def primary_theme(post: dict[str, Any], collections_by_slug: dict[str, dict[str, Any]]) -> str:
    for slug in post.get("collectionSlugs", []) or []:
        collection = collections_by_slug.get(str(slug).strip())
        if collection and collection.get("theme"):
            return str(collection["theme"]).strip()
    return "unthemed"


def has_required_theme_metadata(post: dict[str, Any], theme_key: str) -> bool:
    archive_meta = post.get("archiveMeta") or {}

    if theme_key == "fractureverse":
        return bool(str(archive_meta.get("fragmentId", "")).strip() and str(archive_meta.get("state", "")).strip())

    if theme_key == "eldoria":
        return bool(str(archive_meta.get("chapterNumber", "")).strip() and str(archive_meta.get("entryType", "")).strip())

    return True


def sample_post(post: dict[str, Any], note: str = "") -> dict[str, str]:
    return {
        "title": str(post.get("title", "Untitled")).strip(),
        "slug": str(post.get("slug", "")).strip(),
        "note": note,
    }


def sample_collection(collection: dict[str, Any], note: str = "") -> dict[str, str]:
    return {
        "title": str(collection.get("title", "Untitled collection")).strip(),
        "slug": str(collection.get("slug", "")).strip(),
        "note": note,
    }


def build_issues(payload: dict[str, Any], limit: int) -> list[Issue]:
    posts = list(payload.get("posts", []) or [])
    collections = list(payload.get("collections", []) or [])
    posts_by_slug = {str(post.get("slug", "")).strip(): post for post in posts}
    collections_by_slug = {str(collection.get("slug", "")).strip(): collection for collection in collections}
    public_primary = [collection for collection in collections if collection.get("isPublicPrimary")]

    published_without_video = [
        sample_post(post, "Published without a video source.")
        for post in posts
        if post.get("published") and not has_video(post)
    ]
    published_without_lyrics = [
        sample_post(post, "Published without lyrics.")
        for post in posts
        if post.get("published") and not has_lyrics(post)
    ]
    posts_without_collections = [
        sample_post(post, "Not assigned to any collection.")
        for post in posts
        if not (post.get("collectionSlugs") or [])
    ]
    homepage_conflicts = [
        sample_post(post, f'Homepage eligible but status is "{release_status(post)}".')
        for post in posts
        if post.get("isHomepageEligible") and release_status(post) != "canon"
    ]
    invalid_fracture_links = []
    eldoria_metadata_gaps = []

    for post in posts:
        theme_key = primary_theme(post, collections_by_slug)

        if theme_key == "fractureverse":
            missing = [slug for slug in (post.get("archiveMeta") or {}).get("linkedSlugs", []) if str(slug).strip() not in posts_by_slug]
            if missing:
                invalid_fracture_links.append(sample_post(post, f'Broken linkedSlugs: {", ".join(missing)}'))

        if theme_key == "eldoria" and not has_required_theme_metadata(post, "eldoria"):
            eldoria_metadata_gaps.append(sample_post(post, "Missing chapter number or entry type."))

    public_without_featured = [
        sample_collection(collection, "Public-primary collection has no featured release.")
        for collection in public_primary
        if not str(collection.get("featuredReleaseSlug", "")).strip()
    ]
    broken_featured = [
        sample_collection(
            collection,
            f'Featured slug "{collection.get("featuredReleaseSlug", "")}" no longer resolves.',
        )
        for collection in collections
        if str(collection.get("featuredReleaseSlug", "")).strip()
        and str(collection.get("featuredReleaseSlug", "")).strip() not in posts_by_slug
    ]

    issues = [
        Issue(
            key="broken_featured_release",
            label="Collections with broken featured releases",
            description="Featured release slugs should always resolve to a real post.",
            count=len(broken_featured),
            samples=broken_featured[:limit],
        ),
        Issue(
            key="invalid_fracture_links",
            label="Fractureverse entries with broken linked fragments",
            description="linkedSlugs should point to valid release slugs.",
            count=len(invalid_fracture_links),
            samples=invalid_fracture_links[:limit],
        ),
        Issue(
            key="published_without_video",
            label="Published releases missing video",
            description="These releases are live but still have no video source.",
            count=len(published_without_video),
            samples=published_without_video[:limit],
        ),
        Issue(
            key="posts_without_collections",
            label="Releases without collections",
            description="Unassigned releases are harder to curate and discover.",
            count=len(posts_without_collections),
            samples=posts_without_collections[:limit],
        ),
        Issue(
            key="eldoria_metadata_gaps",
            label="Eldoria releases missing chronicle metadata",
            description="Chapter number and entry type are still missing.",
            count=len(eldoria_metadata_gaps),
            samples=eldoria_metadata_gaps[:limit],
        ),
        Issue(
            key="public_without_featured",
            label="Public-primary collections without featured releases",
            description="Top-level collections usually read best when they have a lead release.",
            count=len(public_without_featured),
            samples=public_without_featured[:limit],
        ),
        Issue(
            key="homepage_conflicts",
            label="Homepage eligibility conflicts",
            description="Homepage eligibility is set on non-canon releases.",
            count=len(homepage_conflicts),
            samples=homepage_conflicts[:limit],
        ),
        Issue(
            key="published_without_lyrics",
            label="Published releases missing lyrics",
            description="Optional, but still a useful enrichment opportunity.",
            count=len(published_without_lyrics),
            samples=published_without_lyrics[:limit],
        ),
    ]

    return [issue for issue in issues if issue.count > 0]


def build_report(payload: dict[str, Any], source_path: Path, limit: int) -> dict[str, Any]:
    posts = list(payload.get("posts", []) or [])
    collections = list(payload.get("collections", []) or [])
    users = list(payload.get("users", []) or [])
    comments = list(payload.get("comments", []) or [])
    collections_by_slug = {str(collection.get("slug", "")).strip(): collection for collection in collections}
    published_posts = [post for post in posts if post.get("published")]
    public_posts = [post for post in posts if is_public(post)]
    immersive_posts = [
        post
        for post in posts
        if primary_theme(post, collections_by_slug) in {"fractureverse", "eldoria"}
    ]
    immersive_ready = [
        post
        for post in immersive_posts
        if has_required_theme_metadata(post, primary_theme(post, collections_by_slug))
    ]
    public_primary = [collection for collection in collections if collection.get("isPublicPrimary")]
    featured_ready = [
        collection
        for collection in public_primary
        if str(collection.get("featuredReleaseSlug", "")).strip()
        and any(post.get("slug") == collection.get("featuredReleaseSlug") and is_public(post) for post in posts)
    ]

    status_counts = Counter(release_status(post) for post in posts)
    theme_counts = Counter(primary_theme(post, collections_by_slug) for post in posts)
    readiness = {
        "video_coverage": {
            "ready": sum(1 for post in published_posts if has_video(post)),
            "total": len(published_posts),
        },
        "lyric_coverage": {
            "ready": sum(1 for post in published_posts if has_lyrics(post)),
            "total": len(published_posts),
        },
        "world_metadata_coverage": {
            "ready": len(immersive_ready),
            "total": len(immersive_posts),
        },
        "featured_coverage": {
            "ready": len(featured_ready),
            "total": len(public_primary),
        },
    }

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": str(source_path),
        "summary": {
            "total_posts": len(posts),
            "published_posts": len(published_posts),
            "public_posts": len(public_posts),
            "total_collections": len(collections),
            "public_primary_collections": len(public_primary),
            "total_comments": len(comments),
            "total_users": len(users),
        },
        "release_status_breakdown": {status: status_counts.get(status, 0) for status in STATUS_ORDER},
        "theme_breakdown": dict(sorted(theme_counts.items())),
        "readiness": readiness,
        "issues": [
            {
                "key": issue.key,
                "label": issue.label,
                "description": issue.description,
                "count": issue.count,
                "samples": issue.samples,
            }
            for issue in build_issues(payload, limit)
        ],
    }
    return report


def percent(ready: int, total: int) -> str:
    if total <= 0:
        return "100%"
    return f"{round((ready / total) * 100)}%"


def render_text(report: dict[str, Any]) -> str:
    lines = [
        "Archive Content Audit",
        "=" * 20,
        f"Generated: {report['generated_at']}",
        f"Source: {report['source']}",
        "",
        "Summary",
        "-" * 7,
    ]

    for key, value in report["summary"].items():
        lines.append(f"{key.replace('_', ' ').title()}: {value}")

    lines.extend(["", "Release Status"])
    lines.append("-" * 14)
    for status, count in report["release_status_breakdown"].items():
        lines.append(f"{status.title()}: {count}")

    lines.extend(["", "Readiness"])
    lines.append("-" * 9)
    for key, entry in report["readiness"].items():
        lines.append(
            f"{key.replace('_', ' ').title()}: {entry['ready']}/{entry['total']} ({percent(entry['ready'], entry['total'])})"
        )

    lines.extend(["", "Issues"])
    lines.append("-" * 6)
    if not report["issues"]:
        lines.append("No major issues detected.")
    else:
        for issue in report["issues"]:
            lines.append(f"{issue['label']}: {issue['count']}")
            lines.append(f"  {issue['description']}")
            for sample in issue["samples"]:
                lines.append(f"  - {sample['title']} [{sample['slug']}]")
                if sample["note"]:
                    lines.append(f"    {sample['note']}")
            lines.append("")

    return "\n".join(lines).strip() + "\n"


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Archive Content Audit",
        "",
        f"- Generated: `{report['generated_at']}`",
        f"- Source: `{report['source']}`",
        "",
        "## Summary",
    ]

    for key, value in report["summary"].items():
        lines.append(f"- {key.replace('_', ' ').title()}: **{value}**")

    lines.extend(["", "## Release Status"])
    for status, count in report["release_status_breakdown"].items():
        lines.append(f"- {status.title()}: **{count}**")

    lines.extend(["", "## Readiness"])
    for key, entry in report["readiness"].items():
        lines.append(
            f"- {key.replace('_', ' ').title()}: **{entry['ready']}/{entry['total']}** ({percent(entry['ready'], entry['total'])})"
        )

    lines.extend(["", "## Issues"])
    if not report["issues"]:
        lines.append("- No major issues detected.")
    else:
        for issue in report["issues"]:
            lines.extend(
                [
                    f"### {issue['label']}",
                    "",
                    f"- Count: **{issue['count']}**",
                    f"- Note: {issue['description']}",
                    "",
                ]
            )
            for sample in issue["samples"]:
                note = f" - {sample['note']}" if sample["note"] else ""
                lines.append(f"- `{sample['slug']}` {sample['title']}{note}")
            lines.append("")

    return "\n".join(lines).strip() + "\n"


def render_output(report: dict[str, Any], output_format: str) -> str:
    if output_format == "json":
        return json.dumps(report, indent=2) + "\n"

    if output_format == "markdown":
        return render_markdown(report)

    return render_text(report)


def main() -> int:
    args = parse_args()
    payload = load_payload(args.data)
    report = build_report(payload, args.data, args.limit)
    rendered = render_output(report, args.format)

    if args.write:
        args.write.parent.mkdir(parents=True, exist_ok=True)
        args.write.write_text(rendered, encoding="utf-8")

    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
