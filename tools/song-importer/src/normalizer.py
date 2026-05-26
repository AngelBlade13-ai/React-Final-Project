"""Normalization logic for titles, slugs, families, and release status."""

import re
from pathlib import Path
from typing import Any, Dict

from slugify import slugify

from src.models import Song


def to_slug(text: str) -> str:
    """Convert text to a URL-safe slug while collapsing possessives cleanly."""
    text = re.sub(r"'s\b", "s", text)
    text = re.sub(r"'", "", text)
    return slugify(text)


def normalize_title(title: str) -> str:
    """Strip leading and trailing whitespace and collapse internal spacing."""
    return " ".join(title.strip().split())


_VERSION_SUFFIX_RE = re.compile(
    r"\s*\("
    r"[^)]*?\b"
    r"(?:"
    r"orchestral|extended|remix|remixed|cover|covered|demo|wip|"
    r"live|acoustic|instrumental|piano|guitar|"
    r"original|official|alternate|alt|"
    r"op|ed|opening|ending|"
    r"version|edit|mix"
    r")"
    r"[^)]*?\)\s*",
    re.IGNORECASE,
)


def infer_version_family(title: str) -> str:
    """Infer the base version family slug from a song title."""
    base = _VERSION_SUFFIX_RE.sub("", title).strip()
    if not base:
        base = title
    return to_slug(base)


_STATUS_RULES = [
    (["demo", "wip", "work in progress", "rough"], "demo"),
    (["remix", "remixed"], "remix"),
    (["cover", "covered"], "cover"),
    (["live", "concert", "performance"], "live"),
    (
        [
            "extended",
            "orchestral",
            "instrumental",
            "acoustic",
            "piano",
            "guitar",
            "alternate",
            "alt",
            "variant",
            "op version",
            "ed version",
        ],
        "variant",
    ),
]


def infer_release_status(title: str, notes: str = "") -> str:
    """Infer release status from title and notes keywords."""
    haystack = f"{title} {notes}".lower()
    for keywords, status in _STATUS_RULES:
        if any(keyword in haystack for keyword in keywords):
            return status
    return "canon"


def _coerce_string_list(value: Any) -> list[str]:
    """Return a safe list of strings for schema list fields."""
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _resolve_media_path(raw_path: str, base_dir: Path | None) -> str:
    """Resolve a media path relative to the input file directory when needed."""
    if not raw_path:
        return ""
    path = Path(raw_path)
    if not path.is_absolute() and base_dir is not None:
        path = base_dir / path
    return str(path)


def prepare_song(raw: Dict[str, Any], base_dir: Path | None = None) -> Song:
    """Build a normalized Song from raw input data."""
    title = normalize_title(str(raw.get("title", "")))
    notes = str(raw.get("notes", ""))
    cover_image_path = raw.get("coverImagePath", raw.get("imagePath", ""))
    explicit_version_family = str(raw.get("versionFamily", "")).strip()
    explicit_slug = str(raw.get("slug", "")).strip()

    return Song(
        title=title,
        slug=to_slug(explicit_slug) if explicit_slug else to_slug(title),
        lyrics=str(raw.get("lyrics", "")),
        sunoPrompt=str(raw.get("sunoPrompt", "")),
        notes=notes,
        sourceTag=str(raw.get("sourceTag", "suno")),
        versionFamily=to_slug(explicit_version_family)
        if explicit_version_family
        else infer_version_family(title),
        releaseStatus=str(raw.get("releaseStatus") or infer_release_status(title, notes)),
        collectionSlugs=_coerce_string_list(raw.get("collectionSlugs", [])),
        subCategory=str(raw.get("subCategory", "")),
        worldLayer=str(raw.get("worldLayer", "")),
        themeTags=_coerce_string_list(raw.get("themeTags", [])),
        audioUrl=str(raw.get("audioUrl", "")),
        videoUrl=str(raw.get("videoUrl", "")),
        coverImageUrl=str(raw.get("coverImageUrl", "")),
        _video_path=_resolve_media_path(str(raw.get("videoPath", "")), base_dir),
        _image_path=_resolve_media_path(str(cover_image_path), base_dir),
    )
