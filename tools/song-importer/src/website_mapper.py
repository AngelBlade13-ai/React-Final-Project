"""Mapping helpers for exporting website-ready post entries."""

from datetime import datetime, timezone
from textwrap import shorten
from uuid import uuid4

from src.models import Song


def map_song_to_website_post(song: Song) -> dict:
    """Convert one normalized song into a website-ready post object."""
    return {
        "id": str(uuid4()),
        "title": song.title,
        "slug": song.slug,
        "videoUrl": song.videoUrl,
        "excerpt": build_excerpt(song),
        "content": build_content(song),
        "lyrics": song.lyrics,
        "archiveMeta": None,
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "published": True,
        "collectionSlugs": song.collectionSlugs,
        "isPrimaryVersion": False,
        "isArchive": False,
        "isHomepageEligible": False,
        "versionFamily": song.versionFamily,
        "releaseStatus": normalize_release_status(song.releaseStatus),
        "subCategory": song.subCategory,
        "sourceTag": song.sourceTag,
        "worldLayer": song.worldLayer,
        "themeTags": song.themeTags,
        "isPubliclyVisible": True,
        "supersededBySlug": "",
        "supersededReason": "",
        "supersededAt": "",
        "supersedesSlug": song._supersede_target_slug,
        "supersedesReason": song._supersede_reason,
    }


def map_songs_to_website_posts(songs: list[Song]) -> list[dict]:
    """Convert many normalized songs into website-ready post objects."""
    return [map_song_to_website_post(song) for song in songs]


def build_excerpt(song: Song, max_length: int = 160) -> str:
    """Build a required website excerpt from the best available song metadata."""
    candidates = [
        first_sentence(song.notes),
        ", ".join(song.themeTags[:4]) if song.themeTags else "",
        humanize_token(song.subCategory),
        humanize_token(song.versionFamily),
        f"Imported song entry for {song.title}",
    ]

    excerpt = next((candidate for candidate in candidates if candidate), "")
    return shorten(excerpt.replace("\n", " "), width=max_length, placeholder="...")


def build_content(song: Song) -> str:
    """Build required website content while preserving useful tool metadata."""
    sections: list[str] = ["Imported by Song Catalog Import Assistant."]

    if song.notes:
        sections.append(f"**Notes:** {song.notes.strip()}")

    if song.sunoPrompt:
        sections.append(f"**Prompt / Style Notes**\n\n{song.sunoPrompt.strip()}")

    if song.audioUrl:
        sections.append(f"**Audio URL:** {song.audioUrl.strip()}")

    if song.coverImageUrl:
        sections.append(f"**Cover Image URL:** {song.coverImageUrl.strip()}")

    metadata_lines = [
        f"**Version Family:** {song.versionFamily}" if song.versionFamily else "",
        f"**Release Status:** {normalize_release_status(song.releaseStatus)}",
        f"**Collections:** {', '.join(song.collectionSlugs)}" if song.collectionSlugs else "",
        f"**Subcategory:** {song.subCategory}" if song.subCategory else "",
        f"**World Layer:** {song.worldLayer}" if song.worldLayer else "",
        f"**Theme Tags:** {', '.join(song.themeTags)}" if song.themeTags else "",
        f"**Source Tag:** {song.sourceTag}" if song.sourceTag else "",
    ]
    metadata = "\n".join(line for line in metadata_lines if line)
    if metadata:
        sections.append(metadata)

    return "\n\n".join(section for section in sections if section).strip()


def normalize_release_status(status: str) -> str:
    """Map tool release statuses to the website's accepted status values."""
    normalized = (status or "").strip().lower()
    if normalized in {"canon", "alternate", "working"}:
        return normalized
    if normalized in {"variant", "remix", "cover", "live"}:
        return "alternate"
    if normalized == "demo":
        return "working"
    return "canon"


def first_sentence(text: str) -> str:
    """Extract the first usable sentence-like chunk from text."""
    cleaned = " ".join(text.strip().split())
    if not cleaned:
        return ""
    for separator in (". ", "! ", "? ", "\n"):
        if separator in cleaned:
            return cleaned.split(separator, maxsplit=1)[0].strip(" .!?")
    return cleaned


def humanize_token(value: str) -> str:
    """Turn a slug-like token into a more readable phrase."""
    return value.replace("-", " ").strip()
