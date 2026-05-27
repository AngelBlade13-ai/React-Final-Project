import json
from pathlib import Path

import pytest

from src.config import Config
from src.exceptions import ValidationError, WebsiteIntegrationError
from src.models import LyricsMergeUpdate, Song
from src.website_integration import (
    WebsiteTarget,
    apply_merged_catalog,
    build_lyrics_merged_website_catalog,
    build_merged_website_catalog,
    export_lyrics_merge_updates,
    export_live_store_snapshot,
    get_effective_catalog_path,
    find_lyrics_merge_updates,
    resolve_website_target,
    run_website_reseed,
    validate_website_catalog,
    website_posts_already_applied,
)


def test_resolve_website_target_from_root(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.local.json"
    posts_path.parent.mkdir(parents=True)
    posts_path.write_text(json.dumps({"posts": []}), encoding="utf-8")

    target = resolve_website_target(Config(website_root=website_root))

    assert target is not None
    assert target.posts_path == posts_path.resolve()
    assert target.backend_dir == (website_root / "backend").resolve()


def test_get_effective_catalog_path_prefers_website_when_catalog_not_set(tmp_path: Path) -> None:
    target = WebsiteTarget(
        root=tmp_path / "website",
        backend_dir=tmp_path / "website" / "backend",
        posts_path=tmp_path / "website" / "backend" / "data" / "posts.local.json",
    )

    assert get_effective_catalog_path(Config(), target) == target.posts_path


def test_validate_website_catalog_rejects_non_object() -> None:
    with pytest.raises(ValidationError):
        validate_website_catalog([])


def test_build_merged_website_catalog_appends_new_posts() -> None:
    existing_catalog = {
        "posts": [
            {
                "id": "existing-1",
                "title": "Hope's Song",
                "slug": "hopes-song",
            }
        ],
        "collections": [],
    }
    new_posts = [
        {
            "id": "new-1",
            "title": "Heaven Wakes in Me",
            "slug": "heaven-wakes-in-me",
        }
    ]

    merged = build_merged_website_catalog(existing_catalog, new_posts)

    assert len(merged["posts"]) == 2
    assert merged["posts"][-1]["slug"] == "heaven-wakes-in-me"
    assert merged["collections"] == []


def test_build_merged_website_catalog_keeps_only_authored_top_level_keys() -> None:
    existing_catalog = {
        "posts": [{"id": "existing-1", "slug": "hopes-song"}],
        "collections": [{"slug": "original-personal"}],
        "siteContent": {"home": {"headline": "Archive"}},
        "users": [{"email": "admin@example.com", "passwordHash": "secret"}],
        "comments": [{"body": "private"}],
    }
    new_posts = [{"id": "new-1", "title": "New Song", "slug": "new-song"}]

    merged = build_merged_website_catalog(existing_catalog, new_posts)

    assert set(merged) == {"posts", "collections", "siteContent"}
    assert merged["posts"][-1]["slug"] == "new-song"
    assert "users" not in merged
    assert "comments" not in merged


def test_build_merged_website_catalog_rejects_slug_conflict() -> None:
    existing_catalog = {
        "posts": [
            {
                "id": "existing-1",
                "title": "Hope's Song",
                "slug": "hopes-song",
            }
        ]
    }
    new_posts = [
        {
            "id": "new-1",
            "title": "Hope's Song (Copy)",
            "slug": "hopes-song",
        }
    ]

    with pytest.raises(WebsiteIntegrationError):
        build_merged_website_catalog(existing_catalog, new_posts)


def test_find_lyrics_merge_updates_matches_blank_lyrics_by_slug() -> None:
    website_catalog = {
        "posts": [
            {
                "id": "existing-1",
                "title": "Heaven Wakes in Me",
                "slug": "heaven-wakes-in-me",
                "lyrics": "",
            }
        ]
    }
    updates = find_lyrics_merge_updates(
        [
            Song(
                title="Heaven Wakes in Me",
                slug="heaven-wakes-in-me",
                lyrics="New lyrics",
            )
        ],
        website_catalog,
    )

    assert len(updates) == 1
    assert updates[0].target_slug == "heaven-wakes-in-me"


def test_build_lyrics_merged_website_catalog_fills_blank_lyrics() -> None:
    website_catalog = {
        "posts": [
            {
                "id": "existing-1",
                "title": "Heaven Wakes in Me",
                "slug": "heaven-wakes-in-me",
                "lyrics": "",
            }
        ]
    }
    lyrics_update = LyricsMergeUpdate(
        song=Song(
            title="Heaven Wakes in Me",
            slug="heaven-wakes-in-me",
            lyrics="New lyrics",
        ),
        target_slug="heaven-wakes-in-me",
        target_title="Heaven Wakes in Me",
    )

    merged = build_lyrics_merged_website_catalog(website_catalog, [lyrics_update])

    assert merged["posts"][0]["lyrics"] == "New lyrics"


def test_build_lyrics_merged_website_catalog_keeps_only_authored_top_level_keys() -> None:
    website_catalog = {
        "posts": [
            {
                "id": "existing-1",
                "title": "Heaven Wakes in Me",
                "slug": "heaven-wakes-in-me",
                "lyrics": "",
            }
        ],
        "collections": [],
        "siteContent": {},
        "users": [{"email": "admin@example.com"}],
        "comments": [],
    }
    lyrics_update = LyricsMergeUpdate(
        song=Song(
            title="Heaven Wakes in Me",
            slug="heaven-wakes-in-me",
            lyrics="New lyrics",
        ),
        target_slug="heaven-wakes-in-me",
        target_title="Heaven Wakes in Me",
    )

    merged = build_lyrics_merged_website_catalog(website_catalog, [lyrics_update])

    assert set(merged) == {"posts", "collections", "siteContent"}
    assert merged["posts"][0]["lyrics"] == "New lyrics"


def test_build_lyrics_merged_website_catalog_leaves_matching_lyrics_alone() -> None:
    website_catalog = {
        "posts": [
            {
                "id": "existing-1",
                "title": "Heaven Wakes in Me",
                "slug": "heaven-wakes-in-me",
                "lyrics": "New lyrics",
            }
        ]
    }
    lyrics_update = LyricsMergeUpdate(
        song=Song(
            title="Heaven Wakes in Me",
            slug="heaven-wakes-in-me",
            lyrics="New lyrics",
            sourceTag="suno",
            notes="",
        ),
        target_slug="heaven-wakes-in-me",
        target_title="Heaven Wakes in Me",
    )

    merged = build_lyrics_merged_website_catalog(website_catalog, [lyrics_update])

    assert merged["posts"][0]["lyrics"] == "New lyrics"


def test_export_lyrics_merge_updates_writes_plan(tmp_path: Path) -> None:
    lyrics_update = LyricsMergeUpdate(
        song=Song(
            title="Heaven Wakes in Me",
            slug="heaven-wakes-in-me",
            lyrics="New lyrics",
        ),
        target_slug="heaven-wakes-in-me",
        target_title="Heaven Wakes in Me",
    )

    path = export_lyrics_merge_updates([lyrics_update], tmp_path)

    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload[0]["targetSlug"] == "heaven-wakes-in-me"
    assert payload[0]["lyrics"] == "New lyrics"


def test_website_posts_already_applied_detects_existing_slugs() -> None:
    website_catalog = {
        "posts": [
            {"id": "existing-1", "slug": "hopes-song"},
            {"id": "existing-2", "slug": "heaven-wakes-in-me"},
        ]
    }
    new_posts = [{"id": "new-1", "slug": "heaven-wakes-in-me"}]

    assert website_posts_already_applied(website_catalog, new_posts) is True


def test_apply_merged_catalog_writes_backup_and_target(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.local.json"
    posts_path.parent.mkdir(parents=True)
    original_catalog = {"posts": [{"id": "existing-1", "slug": "hopes-song"}]}
    merged_catalog = {
        "posts": [
            {"id": "existing-1", "slug": "hopes-song"},
            {"id": "new-1", "slug": "heaven-wakes-in-me"},
        ]
    }
    posts_path.write_text(json.dumps(original_catalog), encoding="utf-8")
    target = WebsiteTarget(
        root=website_root,
        backend_dir=website_root / "backend",
        posts_path=posts_path,
    )
    output_dir = tmp_path / "output"

    backup_path = apply_merged_catalog(original_catalog, merged_catalog, target, output_dir)

    assert backup_path.exists()
    assert json.loads(posts_path.read_text(encoding="utf-8")) == merged_catalog
    assert json.loads(backup_path.read_text(encoding="utf-8")) == original_catalog


def test_run_website_reseed_raises_on_command_failure(monkeypatch, tmp_path: Path) -> None:
    target = WebsiteTarget(
        root=tmp_path / "website",
        backend_dir=tmp_path,
        posts_path=tmp_path / "posts.local.json",
    )

    class FakeResult:
        returncode = 1
        stdout = "stdout failure"
        stderr = "stderr failure"

    def fake_run(*args, **kwargs):
        return FakeResult()

    monkeypatch.setattr("src.website_integration.subprocess.run", fake_run)

    with pytest.raises(WebsiteIntegrationError):
        run_website_reseed(target)


def test_export_live_store_snapshot_writes_backup(monkeypatch, tmp_path: Path) -> None:
    target = WebsiteTarget(
        root=tmp_path / "website",
        backend_dir=tmp_path,
        posts_path=tmp_path / "posts.local.json",
    )

    class FakeResult:
        returncode = 0
        stdout = ""
        stderr = ""

    def fake_run(args, **kwargs):
        assert "fs.mkdir(path.dirname(process.argv[1])" in args[2]
        backup_path = Path(args[3])
        backup_path.write_text('{"posts":[]}\n', encoding="utf-8")
        return FakeResult()

    monkeypatch.setattr("src.website_integration.subprocess.run", fake_run)

    backup_path = export_live_store_snapshot(target, tmp_path / "output")

    assert backup_path.exists()
