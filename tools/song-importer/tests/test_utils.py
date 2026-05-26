import json

import pytest

from src.exceptions import InputFileError, ValidationError
from src.models import Song
from src.utils import extract_catalog_entries, load_json, validate_new_songs, validate_prepared_songs


def test_load_json_raises_for_missing_file(tmp_path) -> None:
    missing_path = tmp_path / "missing.json"

    with pytest.raises(InputFileError):
        load_json(missing_path)


def test_validate_new_songs_rejects_empty_title() -> None:
    with pytest.raises(ValidationError):
        validate_new_songs([{"title": " "}])


def test_validate_new_songs_rejects_duplicate_titles() -> None:
    with pytest.raises(ValidationError):
        validate_new_songs([{"title": "Hope's Song"}, {"title": "  Hope's   Song  "}])


def test_validate_new_songs_rejects_invalid_media_path(tmp_path) -> None:
    input_path = tmp_path / "new_songs.json"
    input_path.write_text(json.dumps([{"title": "Song A", "videoPath": "missing.mp4"}]), encoding="utf-8")

    with pytest.raises(ValidationError):
        validate_new_songs(json.loads(input_path.read_text(encoding="utf-8")), input_path)


def test_validate_prepared_songs_rejects_duplicate_slugs() -> None:
    songs = [
        Song(title="Don't Look Away", slug="dont-look-away"),
        Song(title="Dont Look Away", slug="dont-look-away"),
    ]

    with pytest.raises(ValidationError):
        validate_prepared_songs(songs)


def test_extract_catalog_entries_accepts_posts_json_shape() -> None:
    catalog = {"posts": [{"slug": "song-a"}, {"slug": "song-b"}]}

    assert extract_catalog_entries(catalog) == catalog["posts"]
