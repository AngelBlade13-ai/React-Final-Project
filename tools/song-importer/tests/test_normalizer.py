from pathlib import Path

from src.normalizer import (
    infer_release_status,
    infer_version_family,
    prepare_song,
    to_slug,
)


def test_to_slug_collapses_possessives() -> None:
    assert to_slug("Hope's Song") == "hopes-song"


def test_infer_version_family_removes_variant_suffix() -> None:
    assert infer_version_family("Princess in Waiting (Extended Version)") == "princess-in-waiting"


def test_infer_release_status_detects_variant_keywords() -> None:
    assert infer_release_status("Heaven Wakes in Me (Acoustic Version)") == "variant"


def test_prepare_song_supports_cover_image_path_alias_and_relative_media_paths() -> None:
    song = prepare_song(
        {
            "title": "Heaven Wakes in Me",
            "coverImagePath": "media/cover.png",
            "videoPath": "media/video.mp4",
        },
        base_dir=Path("input"),
    )

    assert song.slug == "heaven-wakes-in-me"
    assert song.versionFamily == "heaven-wakes-in-me"
    assert song._image_path.endswith("input\\media\\cover.png")
    assert song._video_path.endswith("input\\media\\video.mp4")


def test_prepare_song_preserves_explicit_version_family() -> None:
    song = prepare_song(
        {
            "title": "Princess in Waiting (Extended Version)",
            "versionFamily": "princess-in-waiting",
        }
    )

    assert song.versionFamily == "princess-in-waiting"
