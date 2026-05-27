"""Helpers for merging tool output into the website catalog."""

from __future__ import annotations

import json
import os
import queue
import subprocess
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.config import Config
from src.exceptions import InputFileError, ValidationError, WebsiteIntegrationError
from src.models import LyricsMergeUpdate, Song
from src.utils import load_json


DEFAULT_WEBSITE_POSTS_RELATIVE_PATH = Path("backend") / "data" / "posts.local.json"
DEFAULT_RESEED_TIMEOUT_MS = 2 * 60 * 1000
DEFAULT_WEBSITE_STEP_TIMEOUT_MS = 2 * 60 * 1000
_LINE_SENTINEL = object()


@dataclass(frozen=True)
class WebsiteTarget:
    """Resolved paths for interacting with the website codebase."""

    root: Path
    backend_dir: Path
    posts_path: Path


def resolve_website_target(config: Config) -> WebsiteTarget | None:
    """Resolve website paths from config, or return None when unused."""
    wants_website = any(
        [
            config.website_root is not None,
            config.website_posts_path is not None,
            config.apply_to_website,
            config.reseed_website,
        ]
    )
    if not wants_website:
        return None

    if config.website_posts_path is not None:
        posts_path = config.website_posts_path.expanduser().resolve()
    elif config.website_root is not None:
        posts_path = (
            config.website_root.expanduser().resolve() / DEFAULT_WEBSITE_POSTS_RELATIVE_PATH
        )
    else:
        raise ValidationError(
            "Website integration requires --website-root or --website-posts."
        )

    if not posts_path.exists():
        raise InputFileError(
            f"Website catalog not found: {posts_path}. "
            "Expected a website posts.local.json file."
        )
    if not posts_path.is_file():
        raise InputFileError(f"Website catalog path is not a file: {posts_path}")

    backend_dir = _infer_backend_dir(posts_path, config.website_root)
    root = (
        config.website_root.expanduser().resolve()
        if config.website_root is not None
        else backend_dir.parent
    )

    if config.reseed_website and not backend_dir.is_dir():
        raise InputFileError(
            f"Website backend directory not found for reseed: {backend_dir}"
        )

    return WebsiteTarget(root=root, backend_dir=backend_dir, posts_path=posts_path)


def get_effective_catalog_path(config: Config, target: WebsiteTarget | None) -> Path:
    """Pick the catalog path used for duplicate checks."""
    if config.catalog_path is not None:
        return config.catalog_path
    if target is not None:
        return target.posts_path
    return Path("input/existing_catalog.json")


def validate_website_catalog(catalog: Any, source: Path | None = None) -> dict[str, Any]:
    """Validate and return a website-style catalog object."""
    if not isinstance(catalog, dict):
        origin = f" in {source}" if source is not None else ""
        raise ValidationError(
            f"Website catalog{origin} must be an object with a top-level 'posts' list."
        )
    posts = catalog.get("posts")
    if not isinstance(posts, list):
        origin = f" in {source}" if source is not None else ""
        raise ValidationError(
            f"Website catalog{origin} must include a top-level 'posts' list."
        )
    return catalog


def load_website_catalog(posts_path: Path) -> dict[str, Any]:
    """Load and validate a website posts.local.json file."""
    catalog = load_json(posts_path)
    return validate_website_catalog(catalog, posts_path)


def export_catalog_snapshot(
    catalog: Any,
    output_dir: Path,
    filename: str = "existing_catalog.extracted.json",
) -> Path:
    """Write the catalog data actually used for duplicate checks."""
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / filename
    _write_json(destination, catalog)
    return destination


def build_merged_website_catalog(
    website_catalog: dict[str, Any], new_posts: list[dict[str, Any]]
) -> dict[str, Any]:
    """Return a website catalog object with new posts appended safely."""
    catalog = validate_website_catalog(website_catalog)
    existing_posts = [dict(post) for post in catalog["posts"]]
    existing_slugs = {
        str(post.get("slug", "")).strip().lower()
        for post in existing_posts
        if str(post.get("slug", "")).strip()
    }
    existing_ids = {
        str(post.get("id", "")).strip()
        for post in existing_posts
        if str(post.get("id", "")).strip()
    }
    incoming_slugs: set[str] = set()
    incoming_ids: set[str] = set()

    sanitized_new_posts: list[dict[str, Any]] = []

    for index, post in enumerate(new_posts):
        if not isinstance(post, dict):
            raise WebsiteIntegrationError(
                f"Website-ready post at index {index} is not an object."
            )

        slug = str(post.get("slug", "")).strip()
        post_id = str(post.get("id", "")).strip()

        if not slug:
            raise WebsiteIntegrationError(
                f"Website-ready post at index {index} is missing a slug."
            )
        if not post_id:
            raise WebsiteIntegrationError(
                f"Website-ready post '{slug}' is missing an id."
            )

        normalized_slug = slug.lower()
        if normalized_slug in existing_slugs:
            raise WebsiteIntegrationError(
                f"Cannot merge website-ready post '{slug}' because the website catalog "
                "already contains that slug."
            )
        if normalized_slug in incoming_slugs:
            raise WebsiteIntegrationError(
                f"Website-ready posts contain duplicate slug '{slug}'."
            )
        if post_id in existing_ids:
            raise WebsiteIntegrationError(
                f"Cannot merge website-ready post '{slug}' because id '{post_id}' "
                "already exists in the website catalog."
            )
        if post_id in incoming_ids:
            raise WebsiteIntegrationError(
                f"Website-ready posts contain duplicate id '{post_id}'."
            )

        incoming_slugs.add(normalized_slug)
        incoming_ids.add(post_id)
        sanitized_post = dict(post)
        sanitized_post.pop("supersedesSlug", None)
        sanitized_post.pop("supersedesReason", None)
        sanitized_new_posts.append(sanitized_post)

    _apply_supersede_directives(existing_posts, new_posts)

    merged_catalog = _authored_catalog_copy(catalog)
    merged_catalog["posts"] = [*existing_posts, *sanitized_new_posts]
    return merged_catalog


def _apply_supersede_directives(
    existing_posts: list[dict[str, Any]],
    incoming_posts: list[dict[str, Any]],
) -> None:
    """Update existing posts when an incoming import intentionally supersedes them."""
    if not incoming_posts:
        return

    existing_by_slug = {
        str(post.get("slug", "")).strip().lower(): post
        for post in existing_posts
        if str(post.get("slug", "")).strip()
    }
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    for post in incoming_posts:
        incoming_slug = str(post.get("slug", "")).strip()
        supersedes_slug = str(post.get("supersedesSlug", "")).strip()
        supersedes_reason = str(post.get("supersedesReason", "")).strip()

        if not incoming_slug or not supersedes_slug:
            continue

        if incoming_slug.strip().lower() == supersedes_slug.strip().lower():
            raise WebsiteIntegrationError(
                f"Imported post '{incoming_slug}' cannot supersede itself."
            )

        target_post = existing_by_slug.get(supersedes_slug.strip().lower())
        if target_post is None:
            raise WebsiteIntegrationError(
                f"Imported post '{incoming_slug}' tried to supersede missing slug '{supersedes_slug}'."
            )

        target_post["supersededBySlug"] = incoming_slug
        target_post["supersededReason"] = (
            supersedes_reason or f"Superseded by imported version '{incoming_slug}'."
        )
        target_post["supersededAt"] = timestamp


def find_lyrics_merge_updates(
    songs: list[Song],
    website_catalog: Any,
) -> list[LyricsMergeUpdate]:
    """Find songs that can safely fill in missing lyrics on existing posts."""
    if isinstance(website_catalog, list):
        posts = list(website_catalog)
    else:
        catalog = validate_website_catalog(website_catalog)
        posts = list(catalog["posts"])
    slug_index: dict[str, dict[str, Any]] = {}
    title_index: dict[str, list[dict[str, Any]]] = {}

    for post in posts:
        slug = str(post.get("slug", "")).strip().lower()
        title = str(post.get("title", "")).strip().lower()
        if slug:
            slug_index[slug] = post
        if title:
            title_index.setdefault(title, []).append(post)

    updates: list[LyricsMergeUpdate] = []

    for song in songs:
        lyrics = song.lyrics.strip()
        if not lyrics:
            continue

        target_post = slug_index.get(song.slug.strip().lower())
        if target_post is None:
            title_matches = title_index.get(song.title.strip().lower(), [])
            if len(title_matches) == 1:
                target_post = title_matches[0]

        if target_post is None:
            continue

        existing_lyrics = str(target_post.get("lyrics", "")).strip()
        if existing_lyrics:
            continue

        updates.append(
            LyricsMergeUpdate(
                song=song,
                target_slug=str(target_post.get("slug", "")).strip(),
                target_title=str(target_post.get("title", "")).strip(),
            )
        )

    return updates


def build_lyrics_merged_website_catalog(
    website_catalog: dict[str, Any],
    lyrics_updates: list[LyricsMergeUpdate],
) -> dict[str, Any]:
    """Return a website catalog object with lyrics filled into existing posts."""
    catalog = validate_website_catalog(website_catalog)
    existing_posts = [dict(post) for post in catalog["posts"]]
    posts_by_slug = {
        str(post.get("slug", "")).strip().lower(): post
        for post in existing_posts
        if str(post.get("slug", "")).strip()
    }

    for update in lyrics_updates:
        slug = update.target_slug.strip().lower()
        if not slug:
            raise WebsiteIntegrationError(
                f"Lyrics merge target '{update.song.title}' is missing a slug."
            )

        target_post = posts_by_slug.get(slug)
        if target_post is None:
            raise WebsiteIntegrationError(
                f"Could not find website post '{slug}' when applying lyrics merge."
            )

        existing_lyrics = str(target_post.get("lyrics", "")).strip()
        requested_lyrics = update.song.lyrics.strip()
        if existing_lyrics:
            if existing_lyrics == requested_lyrics:
                continue
            raise WebsiteIntegrationError(
                f"Website post '{slug}' already has lyrics and cannot be merged safely."
            )

        target_post["lyrics"] = requested_lyrics

    merged_catalog = _authored_catalog_copy(catalog)
    merged_catalog["posts"] = existing_posts
    return merged_catalog


def export_merged_preview(merged_catalog: dict[str, Any], output_dir: Path) -> Path:
    """Write a full website posts.local.json merge preview."""
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / "website_posts_merged_preview.json"
    _write_json(destination, merged_catalog)
    return destination


def export_lyrics_merge_updates(
    lyrics_updates: list[LyricsMergeUpdate],
    output_dir: Path,
) -> Path:
    """Write the lyrics-only merge update plan."""
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / "lyrics_merge_updates.json"
    _write_json(
        destination,
        [
            {
                "title": update.song.title,
                "slug": update.song.slug,
                "targetTitle": update.target_title,
                "targetSlug": update.target_slug,
                "lyrics": update.song.lyrics,
            }
            for update in lyrics_updates
        ],
    )
    return destination


def verify_lyrics_merge_updates_applied(
    website_catalog: dict[str, Any],
    lyrics_updates: list[LyricsMergeUpdate],
) -> list[str]:
    """Return the target slugs that still do not reflect the requested lyric updates."""
    catalog = validate_website_catalog(website_catalog)
    posts_by_slug = {
        str(post.get("slug", "")).strip().lower(): post
        for post in catalog["posts"]
        if str(post.get("slug", "")).strip()
    }

    missing: list[str] = []
    for update in lyrics_updates:
        slug = update.target_slug.strip().lower()
        target_post = posts_by_slug.get(slug)
        if target_post is None:
            missing.append(update.target_slug)
            continue

        if str(target_post.get("lyrics", "")).strip() != update.song.lyrics.strip():
            missing.append(update.target_slug)

    return missing


def website_posts_already_applied(
    website_catalog: dict[str, Any],
    new_posts: list[dict[str, Any]],
) -> bool:
    """Return True when every incoming post slug is already present in posts.local.json."""
    if not new_posts:
        return False

    catalog = validate_website_catalog(website_catalog)
    existing_slugs = {
        str(post.get("slug", "")).strip().lower()
        for post in catalog["posts"]
        if str(post.get("slug", "")).strip()
    }

    for post in new_posts:
        slug = str(post.get("slug", "")).strip().lower()
        if not slug or slug not in existing_slugs:
            return False

    return True


def apply_merged_catalog(
    original_catalog: dict[str, Any],
    merged_catalog: dict[str, Any],
    target: WebsiteTarget,
    output_dir: Path,
) -> Path:
    """Back up the current website catalog and write the merged version in place."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = output_dir / f"website_posts.backup.{timestamp}.json"
    _write_json(backup_path, original_catalog)
    _write_json(target.posts_path, merged_catalog)
    return backup_path


def export_live_store_snapshot(
    target: WebsiteTarget,
    output_dir: Path,
    timeout_ms: int | None = None,
) -> Path:
    """Back up the current live website store before a reseed changes it."""
    output_dir = output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = output_dir / f"website_live_store.backup.{timestamp}.json"
    node_executable = "node.exe" if os.name == "nt" else "node"
    timeout_ms = _resolve_website_step_timeout_ms(timeout_ms)
    script = """
const fs = require("fs/promises");
const path = require("path");
require("dotenv").config({ quiet: true });
const { closeDatabase, connectToDatabase } = require("./src/lib/mongo");
const { readStore } = require("./src/data/store");

(async () => {
  try {
    await connectToDatabase();
    const store = await readStore();
    await fs.mkdir(path.dirname(process.argv[1]), { recursive: true });
    await fs.writeFile(process.argv[1], `${JSON.stringify(store, null, 2)}\\n`, "utf8");
  } finally {
    await closeDatabase();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
""".strip()

    try:
        result = subprocess.run(
            [node_executable, "-e", script, str(backup_path)],
            cwd=target.backend_dir,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout_ms / 1000,
        )
    except subprocess.TimeoutExpired as exc:
        combined_output = "\n".join(
            part.decode("utf-8", errors="replace").strip()
            if isinstance(part, bytes)
            else str(part or "").strip()
            for part in [exc.stdout, exc.stderr]
            if part
        ).strip()
        raise WebsiteIntegrationError(
            f"Timed out exporting live website backup after {timeout_ms} ms.\n"
            + (combined_output or "No command output was captured.")
        ) from exc

    combined_output = "\n".join(
        part.strip() for part in [result.stdout, result.stderr] if part.strip()
    ).strip()

    if result.returncode != 0:
        raise WebsiteIntegrationError(
            "Failed to export a live website backup before reseed.\n"
            + (combined_output or "No command output was captured.")
        )

    if not backup_path.exists():
        raise WebsiteIntegrationError(
            "The live website backup step completed without producing a backup file."
        )

    return backup_path


def run_website_reseed(target: WebsiteTarget) -> str:
    """Run the website backend reseed command and return combined output."""
    npm_executable = "npm.cmd" if os.name == "nt" else "npm"
    result = subprocess.run(
        [npm_executable, "run", "reseed"],
        cwd=target.backend_dir,
        capture_output=True,
        text=True,
        check=False,
    )

    combined_output = "\n".join(
        part.strip() for part in [result.stdout, result.stderr] if part.strip()
    ).strip()

    if result.returncode != 0:
        raise WebsiteIntegrationError(
            "Website reseed failed.\n"
            + (combined_output or "No command output was captured.")
        )

    return combined_output


def run_website_reseed_streaming(
    target: WebsiteTarget,
    log_path: Path,
    on_line: Callable[[str], None] | None = None,
    timeout_ms: int | None = None,
) -> str:
    """Run reseed while writing stdout/stderr to a log file incrementally."""
    npm_executable = "npm.cmd" if os.name == "nt" else "npm"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    timeout_ms = _resolve_reseed_timeout_ms(timeout_ms)
    deadline = time.monotonic() + (timeout_ms / 1000)

    with log_path.open("w", encoding="utf-8") as log_file:
        process = subprocess.Popen(
            [npm_executable, "run", "reseed"],
            cwd=target.backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        output_lines: list[str] = []
        line_queue: queue.Queue[object] = queue.Queue()
        reader_finished = threading.Event()

        def _read_lines() -> None:
            try:
                assert process.stdout is not None
                for line in process.stdout:
                    line_queue.put(line)
            finally:
                reader_finished.set()
                line_queue.put(_LINE_SENTINEL)

        reader_thread = threading.Thread(target=_read_lines, daemon=True)
        reader_thread.start()

        try:
            while True:
                remaining_seconds = deadline - time.monotonic()
                if remaining_seconds <= 0:
                    _terminate_process(process)
                    raise WebsiteIntegrationError(
                        f"Website reseed timed out after {timeout_ms} ms."
                    )

                try:
                    item = line_queue.get(timeout=min(0.25, remaining_seconds))
                except queue.Empty:
                    if reader_finished.is_set() and process.poll() is not None:
                        break
                    continue

                if item is _LINE_SENTINEL:
                    break

                line = str(item)
                output_lines.append(line)
                log_file.write(line)
                log_file.flush()
                if on_line is not None:
                    on_line(line)
        finally:
            if process.stdout is not None:
                process.stdout.close()
            reader_thread.join(timeout=1)

        returncode = process.wait()

    combined_output = "".join(output_lines).strip()
    if returncode != 0:
        raise WebsiteIntegrationError(
            "Website reseed failed.\n"
            + (combined_output or "No command output was captured.")
        )

    return combined_output


def run_website_catalog_diff(
    target: WebsiteTarget,
    timeout_ms: int | None = None,
) -> str:
    """Run the website live-vs-file diff check and return combined output."""
    npm_executable = "npm.cmd" if os.name == "nt" else "npm"
    timeout_ms = _resolve_website_step_timeout_ms(timeout_ms)
    try:
        result = subprocess.run(
            [npm_executable, "run", "catalog:diff-live"],
            cwd=target.backend_dir,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout_ms / 1000,
        )
    except subprocess.TimeoutExpired as exc:
        combined_output = "\n".join(
            part.decode("utf-8", errors="replace").strip()
            if isinstance(part, bytes)
            else str(part or "").strip()
            for part in [exc.stdout, exc.stderr]
            if part
        ).strip()
        raise WebsiteIntegrationError(
            f"Timed out verifying live website catalog after {timeout_ms} ms.\n"
            + (combined_output or "No command output was captured.")
        ) from exc

    combined_output = "\n".join(
        part.strip() for part in [result.stdout, result.stderr] if part.strip()
    ).strip()

    if result.returncode != 0:
        raise WebsiteIntegrationError(
            "Website live-store verification failed.\n"
            + (combined_output or "No command output was captured.")
        )

    return combined_output


def _resolve_reseed_timeout_ms(timeout_ms: int | None) -> int:
    """Return a bounded reseed timeout in milliseconds."""
    if timeout_ms is not None:
        return max(1, int(timeout_ms))

    raw_timeout = os.getenv("RESEED_TIMEOUT_MS", "").strip()
    if not raw_timeout:
        return DEFAULT_RESEED_TIMEOUT_MS

    try:
        return max(1, int(raw_timeout))
    except ValueError as exc:
        raise WebsiteIntegrationError(
            "RESEED_TIMEOUT_MS must be an integer number of milliseconds."
        ) from exc


def _resolve_website_step_timeout_ms(timeout_ms: int | None) -> int:
    """Return a bounded timeout for website backup and verification subprocesses."""
    if timeout_ms is not None:
        return max(1, int(timeout_ms))

    raw_timeout = os.getenv("WEBSITE_STEP_TIMEOUT_MS", "").strip()
    if not raw_timeout:
        return DEFAULT_WEBSITE_STEP_TIMEOUT_MS

    try:
        return max(1, int(raw_timeout))
    except ValueError as exc:
        raise WebsiteIntegrationError(
            "WEBSITE_STEP_TIMEOUT_MS must be an integer number of milliseconds."
        ) from exc


def _terminate_process(process: subprocess.Popen[str]) -> None:
    """Best-effort terminate a reseed process after timeout."""
    if process.poll() is not None:
        return

    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=10)


def _infer_backend_dir(posts_path: Path, website_root: Path | None) -> Path:
    """Infer the website backend directory from the known posts path."""
    if website_root is not None:
        return website_root.expanduser().resolve() / "backend"

    if posts_path.parent.name == "data" and posts_path.parent.parent.name == "backend":
        return posts_path.parent.parent

    return posts_path.parent


def _authored_catalog_copy(catalog: dict[str, Any]) -> dict[str, Any]:
    """Copy only the top-level keys owned by the authored website catalog."""
    return {
        "posts": catalog.get("posts", []),
        "collections": catalog.get("collections", []),
        "siteContent": catalog.get("siteContent", {}),
    }


def _write_json(path: Path, data: object) -> None:
    """Write JSON with stable formatting and a trailing newline."""
    path.write_text(
        f"{json.dumps(data, indent=2, ensure_ascii=False)}\n",
        encoding="utf-8",
    )
