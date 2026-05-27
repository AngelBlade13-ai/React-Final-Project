"""File I/O and validation helpers."""

import json
from pathlib import Path
from typing import Any

from src.exceptions import InputFileError, ValidationError
from src.models import Song


def load_json(path: Path) -> Any:
    """Load and parse a JSON file."""
    if not path.exists():
        raise InputFileError(f"Input file not found: {path}")
    if not path.is_file():
        raise InputFileError(f"Input path is not a file: {path}")

    try:
        text = path.read_text(encoding="utf-8")
    except PermissionError as exc:
        raise InputFileError(f"Permission denied when reading: {path}") from exc

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValidationError(
            f"Invalid JSON in {path}: {exc.msg} (line {exc.lineno}, column {exc.colno})"
        ) from exc


def validate_catalog(catalog: Any) -> None:
    """Validate the existing catalog structure."""
    catalog_entries = extract_catalog_entries(catalog)

    seen_slugs: dict[str, int] = {}
    errors: list[str] = []

    for index, entry in enumerate(catalog_entries):
        if not isinstance(entry, dict):
            errors.append(f"Index {index}: entry is not an object.")
            continue

        slug = entry.get("slug", "")
        if not isinstance(slug, str) or not slug.strip():
            errors.append(f"Index {index}: missing required string field 'slug'.")
            continue

        normalized_slug = slug.strip().lower()
        if normalized_slug in seen_slugs:
            errors.append(
                f"Index {index}: duplicate slug '{slug}' also appears at index "
                f"{seen_slugs[normalized_slug]}."
            )
        else:
            seen_slugs[normalized_slug] = index

    if errors:
        raise ValidationError("existing catalog validation failed:\n- " + "\n- ".join(errors))


def extract_catalog_entries(catalog: Any) -> list[dict]:
    """Accept either a raw catalog array or a website posts.local.json object."""
    if isinstance(catalog, list):
        return catalog
    if isinstance(catalog, dict) and isinstance(catalog.get("posts"), list):
        return catalog["posts"]
    raise ValidationError(
        "existing catalog JSON must be either a list of song objects or an object with a top-level 'posts' list."
    )


def validate_new_songs(songs: Any, input_path: Path | None = None) -> None:
    """Validate the new songs JSON structure and required data."""
    if not isinstance(songs, list):
        raise ValidationError("new songs JSON must contain a list of song objects.")
    if not songs:
        raise ValidationError("new songs JSON is empty; there are no songs to process.")

    base_dir = input_path.parent if input_path is not None else Path.cwd()
    seen_titles: dict[str, int] = {}
    errors: list[str] = []

    for index, song in enumerate(songs):
        if not isinstance(song, dict):
            errors.append(f"Index {index}: entry is not an object.")
            continue

        title = song.get("title", "")
        if not isinstance(title, str) or not " ".join(title.split()):
            errors.append(f"Index {index}: 'title' is missing or empty.")
            continue

        normalized_title = " ".join(title.split()).lower()
        if normalized_title in seen_titles:
            errors.append(
                f"Index {index}: duplicate title '{title}' also appears at index "
                f"{seen_titles[normalized_title]}."
            )
        else:
            seen_titles[normalized_title] = index

        _validate_string_field(song, index, "lyrics", errors)
        _validate_string_field(song, index, "slug", errors)
        _validate_string_field(song, index, "sunoPrompt", errors)
        _validate_string_field(song, index, "notes", errors)
        _validate_string_field(song, index, "sourceTag", errors)
        _validate_string_field(song, index, "subCategory", errors)
        _validate_string_field(song, index, "worldLayer", errors)
        _validate_string_field(song, index, "audioUrl", errors)
        _validate_string_field(song, index, "videoUrl", errors)
        _validate_string_field(song, index, "coverImageUrl", errors)
        _validate_string_field(song, index, "releaseStatus", errors)
        _validate_string_list_field(song, index, "collectionSlugs", errors)
        _validate_string_list_field(song, index, "themeTags", errors)

        for field_name in ("videoPath", "imagePath", "coverImagePath"):
            raw_path = song.get(field_name, "")
            if raw_path in ("", None):
                continue
            if not isinstance(raw_path, str):
                errors.append(f"Index {index}: '{field_name}' must be a string path.")
                continue

            resolved_path = Path(raw_path)
            if not resolved_path.is_absolute():
                resolved_path = base_dir / resolved_path
            if not resolved_path.is_file():
                errors.append(
                    f"Index {index}: {field_name} does not point to a file -> {resolved_path}"
                )

    if errors:
        raise ValidationError("new songs validation failed:\n- " + "\n- ".join(errors))


def validate_prepared_songs(songs: list[Song]) -> None:
    """Validate normalized songs for internal consistency."""
    seen_slugs: dict[str, str] = {}
    errors: list[str] = []

    for song in songs:
        if not song.slug:
            errors.append(f"Song '{song.title}' produced an empty slug.")
            continue

        existing_title = seen_slugs.get(song.slug)
        if existing_title is not None:
            errors.append(
                f"Songs '{existing_title}' and '{song.title}' normalize to the same slug "
                f"'{song.slug}'."
            )
        else:
            seen_slugs[song.slug] = song.title

    if errors:
        raise ValidationError("prepared song validation failed:\n- " + "\n- ".join(errors))


def _validate_string_field(
    song: dict[str, Any],
    index: int,
    field_name: str,
    errors: list[str],
) -> None:
    """Validate an optional string field when present."""
    value = song.get(field_name)
    if value is not None and not isinstance(value, str):
        errors.append(f"Index {index}: '{field_name}' must be a string.")


def _validate_string_list_field(
    song: dict[str, Any],
    index: int,
    field_name: str,
    errors: list[str],
) -> None:
    """Validate an optional list[str] field when present."""
    value = song.get(field_name)
    if value is None:
        return
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        errors.append(f"Index {index}: '{field_name}' must be a list of strings.")
