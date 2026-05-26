from src.normalizer import prepare_song
from src.website_mapper import map_song_to_website_post, normalize_release_status


def test_map_song_to_website_post_generates_required_fields() -> None:
    song = prepare_song(
        {
            "title": "Heaven Wakes in Me",
            "notes": "Canon version for the website import.",
            "sunoPrompt": "Cinematic pop with angelic vocals.",
            "lyrics": "Example lyrics",
            "sourceTag": "suno",
            "collectionSlugs": ["original-personal"],
            "subCategory": "identity",
            "themeTags": ["identity", "awakening"],
            "videoUrl": "https://example.com/video.mp4",
            "audioUrl": "https://example.com/audio.mp3",
            "coverImageUrl": "https://example.com/cover.jpg",
        }
    )

    post = map_song_to_website_post(song)

    assert post["title"] == "Heaven Wakes in Me"
    assert post["slug"] == "heaven-wakes-in-me"
    assert post["videoUrl"] == "https://example.com/video.mp4"
    assert post["excerpt"] == "Canon version for the website import."
    assert "**Prompt / Style Notes**" in post["content"]
    assert "**Audio URL:** https://example.com/audio.mp3" in post["content"]
    assert post["published"] is True
    assert post["isPubliclyVisible"] is True
    assert post["releaseStatus"] == "canon"
    assert isinstance(post["id"], str) and post["id"]


def test_normalize_release_status_maps_tool_only_values_for_website() -> None:
    assert normalize_release_status("variant") == "alternate"
    assert normalize_release_status("demo") == "working"
    assert normalize_release_status("cover") == "alternate"
