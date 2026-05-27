import json
from pathlib import Path

from src.config import Config
from src.pipeline import run_processing_pipeline, write_processing_outputs


def test_run_processing_pipeline_skips_upload_in_dry_run(tmp_path: Path) -> None:
    catalog_path = tmp_path / "existing_catalog.json"
    input_path = tmp_path / "new_songs.json"
    catalog_path.write_text(json.dumps([]), encoding="utf-8")
    input_path.write_text(
        json.dumps([{"title": "Heaven Wakes in Me"}]),
        encoding="utf-8",
    )

    outcome = run_processing_pipeline(
        Config(
            catalog_path=catalog_path,
            input_path=input_path,
            output_dir=tmp_path / "output",
            dry_run=True,
        )
    )

    assert outcome.upload_report.enabled is False
    assert outcome.upload_report.skipped_reason == "Upload skipped in dry-run mode."


def test_write_processing_outputs_exports_extracted_catalog_snapshot(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.local.json"
    posts_path.parent.mkdir(parents=True)
    posts_path.write_text(
        json.dumps(
            {
                "posts": [{"title": "Hope's Song", "slug": "hopes-song"}],
                "collections": [{"slug": "fractureverse"}],
            }
        ),
        encoding="utf-8",
    )
    input_path = tmp_path / "new_songs.json"
    input_path.write_text(
        json.dumps([{"title": "Heaven Wakes in Me"}]),
        encoding="utf-8",
    )
    output_dir = tmp_path / "output"

    outcome = run_processing_pipeline(
        Config(
            input_path=input_path,
            output_dir=output_dir,
            no_upload=True,
            website_root=website_root,
        )
    )
    website_outputs = write_processing_outputs(outcome)

    snapshot = json.loads(website_outputs.catalog_snapshot_path.read_text(encoding="utf-8"))
    assert snapshot == [{"title": "Hope's Song", "slug": "hopes-song"}]


def test_run_processing_pipeline_can_prepare_lyrics_merge_updates(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.local.json"
    posts_path.parent.mkdir(parents=True)
    posts_path.write_text(
        json.dumps(
            {
                "posts": [
                    {
                        "id": "existing-1",
                        "title": "Heaven Wakes in Me",
                        "slug": "heaven-wakes-in-me",
                        "lyrics": "",
                    }
                ],
                "collections": [],
            }
        ),
        encoding="utf-8",
    )
    input_path = tmp_path / "new_songs.json"
    input_path.write_text(
        json.dumps(
            [
                {
                    "title": "Heaven Wakes in Me",
                    "slug": "heaven-wakes-in-me",
                    "lyrics": "Fresh lyrics for the existing post.",
                }
            ]
        ),
        encoding="utf-8",
    )

    outcome = run_processing_pipeline(
        Config(
            input_path=input_path,
            output_dir=tmp_path / "output",
            no_upload=True,
            dry_run=True,
            website_root=website_root,
            merge_lyrics=True,
        )
    )
    website_outputs = write_processing_outputs(outcome)

    assert len(outcome.import_ready) == 0
    assert len(outcome.lyrics_merge_ready) == 1
    assert website_outputs.lyrics_merge_updates[0].target_slug == "heaven-wakes-in-me"
    lyrics_updates_path = tmp_path / "output" / "lyrics_merge_updates.json"
    assert lyrics_updates_path.exists()
    merged_preview = json.loads(
        website_outputs.merged_preview_path.read_text(encoding="utf-8")
    )
    assert merged_preview["posts"][0]["lyrics"] == "Fresh lyrics for the existing post."


def test_run_processing_pipeline_can_run_lyrics_repair_only(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.local.json"
    posts_path.parent.mkdir(parents=True)
    posts_path.write_text(
        json.dumps(
            {
                "posts": [
                    {
                        "id": "existing-1",
                        "title": "Heaven Wakes in Me",
                        "slug": "heaven-wakes-in-me",
                        "lyrics": "",
                    }
                ],
                "collections": [],
            }
        ),
        encoding="utf-8",
    )
    input_path = tmp_path / "repair.json"
    input_path.write_text(
        json.dumps(
            [
                {
                    "title": "Heaven Wakes in Me",
                    "slug": "heaven-wakes-in-me",
                    "lyrics": "Fresh lyrics for the existing post.",
                }
            ]
        ),
        encoding="utf-8",
    )

    outcome = run_processing_pipeline(
        Config(
            input_path=input_path,
            output_dir=tmp_path / "output",
            no_upload=False,
            dry_run=True,
            website_root=website_root,
            lyrics_repair_only=True,
            merge_lyrics=True,
        )
    )
    website_outputs = write_processing_outputs(outcome)

    assert len(outcome.import_ready) == 0
    assert len(outcome.lyrics_repair_ready) == 1
    assert outcome.upload_report.enabled is False
    assert "Lyrics repair mode" in outcome.upload_report.skipped_reason
    assert website_outputs.website_posts_ready == []
    assert website_outputs.lyrics_merge_updates[0].target_slug == "heaven-wakes-in-me"


def test_run_processing_pipeline_allows_intentional_supersede_imports(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.local.json"
    posts_path.parent.mkdir(parents=True)
    posts_path.write_text(
        json.dumps(
            {
                "posts": [
                    {
                        "id": "existing-1",
                        "title": "Together We Rise",
                        "slug": "together-we-rise",
                        "versionFamily": "together-we-rise",
                        "releaseStatus": "canon",
                    }
                ],
                "collections": [],
            }
        ),
        encoding="utf-8",
    )
    input_path = tmp_path / "new_songs.json"
    input_path.write_text(
        json.dumps(
            [
                {
                    "title": "Together We Rise (Suno Pop-Rock Version)",
                    "slug": "together-we-rise-suno-pop-rock-version",
                    "versionFamily": "together-we-rise",
                    "releaseStatus": "canon",
                }
            ]
        ),
        encoding="utf-8",
    )

    outcome = run_processing_pipeline(
        Config(
            input_path=input_path,
            output_dir=tmp_path / "output",
            no_upload=True,
            website_root=website_root,
        ),
        supersede_overrides=[
            {
                "songSlug": "together-we-rise-suno-pop-rock-version",
                "targetSlug": "together-we-rise",
                "reason": "Superseded by imported Suno pop-rock version.",
            }
        ],
    )

    assert len(outcome.import_ready) == 1
    assert outcome.import_ready[0].suggested_action == "supersede-import"
    assert outcome.import_ready[0].supersede_target_slug == "together-we-rise"
