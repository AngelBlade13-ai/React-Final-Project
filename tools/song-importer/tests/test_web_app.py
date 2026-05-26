import io
import json
import time
from pathlib import Path

from src.config import Config
from src.web_app import create_app


def test_process_endpoint_returns_preview_payload(tmp_path: Path) -> None:
    catalog_path = tmp_path / "existing_catalog.json"
    catalog_path.write_text(json.dumps([{"title": "Hope's Song", "slug": "hopes-song"}]), encoding="utf-8")
    output_dir = tmp_path / "output"
    app = create_app(
        Config(
            catalog_path=catalog_path,
            output_dir=output_dir,
            no_upload=True,
        )
    )
    client = app.test_client()

    response = client.post(
        "/api/process",
        data={
            "song_json": json.dumps(
                {
                    "title": "Heaven Wakes in Me",
                    "notes": "New import.",
                    "collectionSlugs": ["original-personal"],
                }
            ),
            "output_dir": str(output_dir),
            "upload_media": "false",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["summary"]["existingSongs"] == 1
    assert payload["summary"]["processedSongs"] == 1
    assert payload["summary"]["importReadySongs"] == 1
    assert payload["websitePostsReady"][0]["slug"] == "heaven-wakes-in-me"
    assert payload["websitePostsReady"][0]["published"] is True


def test_index_prefills_configured_input_json(tmp_path: Path) -> None:
    catalog_path = tmp_path / "existing_catalog.json"
    catalog_path.write_text(json.dumps([]), encoding="utf-8")
    input_path = tmp_path / "new_songs.json"
    input_path.write_text(
        json.dumps([{"title": "Demo Batch Song"}, {"title": "Second Demo Song"}]),
        encoding="utf-8",
    )
    app = create_app(
        Config(
            catalog_path=catalog_path,
            input_path=input_path,
            output_dir=tmp_path / "output",
            no_upload=True,
        )
    )

    response = app.test_client().get("/")

    assert response.status_code == 200
    assert b"Demo Batch Song" in response.data
    assert b"Second Demo Song" in response.data


def test_index_only_labels_demo_mode_when_explicit(tmp_path: Path) -> None:
    catalog_path = tmp_path / "existing_catalog.json"
    catalog_path.write_text(json.dumps([]), encoding="utf-8")
    input_path = tmp_path / "new_songs.json"
    input_path.write_text(json.dumps([{"title": "Demo Batch Song"}]), encoding="utf-8")

    standalone_app = create_app(
        Config(
            catalog_path=catalog_path,
            input_path=input_path,
            output_dir=tmp_path / "output",
            no_upload=True,
        )
    )
    standalone_response = standalone_app.test_client().get("/")

    assert standalone_response.status_code == 200
    assert b"Standalone demo mode is active" not in standalone_response.data
    assert b"Standalone preview mode is active" in standalone_response.data

    demo_app = create_app(
        Config(
            catalog_path=catalog_path,
            input_path=input_path,
            output_dir=tmp_path / "output",
            no_upload=True,
            demo_mode=True,
        )
    )
    demo_response = demo_app.test_client().get("/")

    assert demo_response.status_code == 200
    assert b"Standalone demo mode is active" in demo_response.data


def test_process_endpoint_accepts_bulk_song_arrays(tmp_path: Path) -> None:
    catalog_path = tmp_path / "existing_catalog.json"
    catalog_path.write_text(json.dumps([]), encoding="utf-8")
    output_dir = tmp_path / "output"
    app = create_app(
        Config(
            catalog_path=catalog_path,
            output_dir=output_dir,
            no_upload=True,
        )
    )
    client = app.test_client()

    response = client.post(
        "/api/process",
        data={
            "song_json": json.dumps(
                [
                    {"title": "Heaven Wakes in Me"},
                    {"title": "Moonlit Archive"},
                ]
            ),
            "output_dir": str(output_dir),
            "upload_media": "false",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["summary"]["processedSongs"] == 2
    assert len(payload["websitePostsReady"]) == 2


def test_process_endpoint_rejects_uploaded_files_when_upload_is_disabled(tmp_path: Path) -> None:
    catalog_path = tmp_path / "existing_catalog.json"
    catalog_path.write_text(json.dumps([]), encoding="utf-8")
    output_dir = tmp_path / "output"
    app = create_app(
        Config(
            catalog_path=catalog_path,
            output_dir=output_dir,
            no_upload=True,
        )
    )
    client = app.test_client()

    response = client.post(
        "/api/process",
        data={
            "song_json": json.dumps({"title": "Heaven Wakes in Me"}),
            "output_dir": str(output_dir),
            "upload_media": "false",
            "video_file": (io.BytesIO(b"video-bytes"), "song.mp4"),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["ok"] is False
    assert "Cloudinary upload is disabled" in payload["error"]


def test_process_endpoint_rejects_uploaded_files_without_cloudinary_config(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.delenv("CLOUDINARY_CLOUD_NAME", raising=False)
    monkeypatch.delenv("CLOUDINARY_API_KEY", raising=False)
    monkeypatch.delenv("CLOUDINARY_API_SECRET", raising=False)
    catalog_path = tmp_path / "existing_catalog.json"
    catalog_path.write_text(json.dumps([]), encoding="utf-8")
    output_dir = tmp_path / "output"
    app = create_app(
        Config(
            catalog_path=catalog_path,
            output_dir=output_dir,
            no_upload=False,
            cloudinary_cloud_name="",
            cloudinary_api_key="",
            cloudinary_api_secret="",
        )
    )
    client = app.test_client()

    response = client.post(
        "/api/process",
        data={
            "song_json": json.dumps({"title": "Heaven Wakes in Me"}),
            "output_dir": str(output_dir),
            "upload_media": "true",
            "video_file": (io.BytesIO(b"video-bytes"), "song.mp4"),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["ok"] is False
    assert "Cloudinary credentials are not configured" in payload["error"]


def test_process_endpoint_flags_lyrics_merge_updates(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.json"
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
    output_dir = tmp_path / "output"
    app = create_app(
        Config(
            output_dir=output_dir,
            website_root=website_root,
            no_upload=True,
            merge_lyrics=True,
        )
    )
    client = app.test_client()

    response = client.post(
        "/api/process",
        data={
            "song_json": json.dumps(
                {
                    "title": "Heaven Wakes in Me",
                    "slug": "heaven-wakes-in-me",
                    "lyrics": "Fresh lyrics",
                }
            ),
            "output_dir": str(output_dir),
            "website_root": str(website_root),
            "upload_media": "false",
            "merge_lyrics": "true",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["summary"]["lyricsMergeReadySongs"] == 1
    assert payload["lyricsMergeUpdates"][0]["targetSlug"] == "heaven-wakes-in-me"


def test_process_endpoint_supports_lyrics_repair_only(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.json"
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
    output_dir = tmp_path / "output"
    app = create_app(
        Config(
            output_dir=output_dir,
            website_root=website_root,
            no_upload=True,
            lyrics_repair_only=True,
            merge_lyrics=True,
        )
    )
    client = app.test_client()

    response = client.post(
        "/api/process",
        data={
            "song_json": json.dumps(
                {
                    "title": "Heaven Wakes in Me",
                    "slug": "heaven-wakes-in-me",
                    "lyrics": "Fresh lyrics",
                }
            ),
            "output_dir": str(output_dir),
            "website_root": str(website_root),
            "upload_media": "true",
            "lyrics_repair_only": "true",
            "merge_lyrics": "true",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["summary"]["lyricsRepairReadySongs"] == 1
    assert payload["upload"]["enabled"] is False
    assert payload["lyricsMergeUpdates"][0]["targetSlug"] == "heaven-wakes-in-me"


def test_process_endpoint_allows_supersede_override_for_blocked_duplicates(
    tmp_path: Path,
) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.json"
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
    output_dir = tmp_path / "output"
    app = create_app(
        Config(
            output_dir=output_dir,
            website_root=website_root,
            no_upload=True,
        )
    )
    client = app.test_client()

    response = client.post(
        "/api/process",
        data={
            "song_json": json.dumps(
                {
                    "title": "Together We Rise (Suno Pop-Rock Version)",
                    "slug": "together-we-rise-suno-pop-rock-version",
                    "versionFamily": "together-we-rise",
                    "releaseStatus": "canon",
                }
            ),
            "output_dir": str(output_dir),
            "website_root": str(website_root),
            "upload_media": "false",
            "supersede_overrides": json.dumps(
                [
                    {
                        "songSlug": "together-we-rise-suno-pop-rock-version",
                        "targetSlug": "together-we-rise",
                        "reason": "Superseded by imported Suno pop-rock version.",
                    }
                ]
            ),
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["summary"]["importReadySongs"] == 1
    assert payload["results"][0]["suggestedAction"] == "supersede-import"
    assert payload["results"][0]["supersedeTargetSlug"] == "together-we-rise"


def test_apply_endpoint_writes_to_website_posts(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.json"
    posts_path.parent.mkdir(parents=True)
    posts_path.write_text(json.dumps({"posts": [], "collections": []}), encoding="utf-8")
    output_dir = tmp_path / "output"
    app = create_app(Config(output_dir=output_dir))
    client = app.test_client()

    response = client.post(
        "/api/apply",
        json={
            "websiteRoot": str(website_root),
            "outputDir": str(output_dir),
            "websitePostsReady": [
                {
                    "id": "new-1",
                    "title": "Heaven Wakes in Me",
                    "slug": "heaven-wakes-in-me",
                    "videoUrl": "",
                    "excerpt": "New import.",
                    "content": "Imported.",
                    "lyrics": "",
                    "archiveMeta": None,
                    "createdAt": "2026-04-22T00:00:00Z",
                    "published": True,
                    "collectionSlugs": [],
                    "isPrimaryVersion": False,
                    "isArchive": False,
                    "isHomepageEligible": False,
                    "versionFamily": "heaven-wakes-in-me",
                    "releaseStatus": "canon",
                    "subCategory": "",
                    "sourceTag": "suno",
                    "worldLayer": "",
                    "themeTags": [],
                    "isPubliclyVisible": True,
                    "supersededBySlug": "",
                    "supersededReason": "",
                    "supersededAt": "",
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    merged_catalog = json.loads(posts_path.read_text(encoding="utf-8"))
    assert merged_catalog["posts"][0]["slug"] == "heaven-wakes-in-me"


def test_apply_endpoint_can_reseed_when_posts_are_already_applied(monkeypatch, tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.json"
    posts_path.parent.mkdir(parents=True)
    posts_path.write_text(
        json.dumps(
            {
                "posts": [{"id": "new-1", "slug": "heaven-wakes-in-me"}],
                "collections": [],
            }
        ),
        encoding="utf-8",
    )
    output_dir = tmp_path / "output"
    app = create_app(Config(output_dir=output_dir))
    client = app.test_client()

    live_backup_path = output_dir / "website_live_store.backup.test.json"

    monkeypatch.setattr(
        "src.web_app.export_live_store_snapshot",
        lambda target, output_dir: live_backup_path,
    )
    monkeypatch.setattr(
        "src.web_app.run_website_reseed_streaming",
        lambda target, log_path, on_line=None: log_path.write_text("reseed ok\n", encoding="utf-8")
        or "reseed ok",
    )
    monkeypatch.setattr(
        "src.web_app.run_website_catalog_diff",
        lambda target: "Live-only posts: 0\nTracked-only posts: 0\nPosts with field drift: 0\nCollections with field drift: 0\nSite content sections changed: 0\nCollection featured slug issues: 0",
    )

    response = client.post(
        "/api/apply",
        json={
            "websiteRoot": str(website_root),
            "outputDir": str(output_dir),
            "reseedWebsite": True,
            "websitePostsReady": [
                {
                    "id": "new-1",
                    "title": "Heaven Wakes in Me",
                    "slug": "heaven-wakes-in-me",
                    "videoUrl": "",
                    "excerpt": "New import.",
                    "content": "Imported.",
                    "lyrics": "",
                    "archiveMeta": None,
                    "createdAt": "2026-04-22T00:00:00Z",
                    "published": True,
                    "collectionSlugs": [],
                    "isPrimaryVersion": False,
                    "isArchive": False,
                    "isHomepageEligible": False,
                    "versionFamily": "heaven-wakes-in-me",
                    "releaseStatus": "canon",
                    "subCategory": "",
                    "sourceTag": "suno",
                    "worldLayer": "",
                    "themeTags": [],
                    "isPubliclyVisible": True,
                    "supersededBySlug": "",
                    "supersededReason": "",
                    "supersededAt": "",
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["status"] == "running"
    assert payload["alreadyApplied"] is True
    assert payload["reseedWebsite"] is True
    assert payload["jobId"]

    job_payload = None
    for _ in range(20):
        job_response = client.get(f"/api/apply/jobs/{payload['jobId']}")
        assert job_response.status_code == 200
        job_payload = job_response.get_json()
        if job_payload["status"] != "running":
            break
        time.sleep(0.05)

    assert job_payload is not None
    assert job_payload["status"] == "success"
    assert job_payload["report"]["status"] == "success"
    assert job_payload["report"]["summary"]
    assert job_payload["verificationOutput"]


def test_apply_endpoint_can_fill_missing_lyrics(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.json"
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
    output_dir = tmp_path / "output"
    app = create_app(Config(output_dir=output_dir))
    client = app.test_client()

    response = client.post(
        "/api/apply",
        json={
            "websiteRoot": str(website_root),
            "outputDir": str(output_dir),
            "lyricsMergeUpdates": [
                {
                    "title": "Heaven Wakes in Me",
                    "slug": "heaven-wakes-in-me",
                    "targetTitle": "Heaven Wakes in Me",
                    "targetSlug": "heaven-wakes-in-me",
                    "lyrics": "Fresh lyrics",
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["lyricsMergeApplied"] is True
    merged_catalog = json.loads(posts_path.read_text(encoding="utf-8"))
    assert merged_catalog["posts"][0]["lyrics"] == "Fresh lyrics"


def test_apply_endpoint_marks_superseded_target_when_requested(tmp_path: Path) -> None:
    website_root = tmp_path / "website"
    posts_path = website_root / "backend" / "data" / "posts.json"
    posts_path.parent.mkdir(parents=True)
    posts_path.write_text(
        json.dumps(
            {
                "posts": [
                    {
                        "id": "existing-1",
                        "title": "Together We Rise",
                        "slug": "together-we-rise",
                        "supersededBySlug": "",
                        "supersededReason": "",
                        "supersededAt": "",
                    }
                ],
                "collections": [],
            }
        ),
        encoding="utf-8",
    )
    output_dir = tmp_path / "output"
    app = create_app(Config(output_dir=output_dir))
    client = app.test_client()

    response = client.post(
        "/api/apply",
        json={
            "websiteRoot": str(website_root),
            "outputDir": str(output_dir),
            "websitePostsReady": [
                {
                    "id": "new-1",
                    "title": "Together We Rise (Suno Pop-Rock Version)",
                    "slug": "together-we-rise-suno-pop-rock-version",
                    "videoUrl": "",
                    "excerpt": "New import.",
                    "content": "Imported.",
                    "lyrics": "",
                    "archiveMeta": None,
                    "createdAt": "2026-04-22T00:00:00Z",
                    "published": True,
                    "collectionSlugs": [],
                    "isPrimaryVersion": False,
                    "isArchive": False,
                    "isHomepageEligible": False,
                    "versionFamily": "together-we-rise",
                    "releaseStatus": "canon",
                    "subCategory": "",
                    "sourceTag": "suno",
                    "worldLayer": "",
                    "themeTags": [],
                    "isPubliclyVisible": True,
                    "supersededBySlug": "",
                    "supersededReason": "",
                    "supersededAt": "",
                    "supersedesSlug": "together-we-rise",
                    "supersedesReason": "Superseded by imported Suno pop-rock version.",
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    merged_catalog = json.loads(posts_path.read_text(encoding="utf-8"))
    target_post = next(
        post for post in merged_catalog["posts"] if post["slug"] == "together-we-rise"
    )
    assert (
        target_post["supersededBySlug"]
        == "together-we-rise-suno-pop-rock-version"
    )
    assert (
        target_post["supersededReason"]
        == "Superseded by imported Suno pop-rock version."
    )
