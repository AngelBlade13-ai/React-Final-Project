from src.config import Config
from src.duplicate_checker import check_duplicates
from src.normalizer import prepare_song


def test_exact_slug_match_blocks_import() -> None:
    new_song = prepare_song({"title": "Hope's Song (Orchestral OP Version)"})
    existing_catalog = [
        {
            "title": "Hope's Song",
            "slug": "hopes-song-orchestral-op-version",
            "versionFamily": "hopes-song",
            "releaseStatus": "canon",
        }
    ]

    result = check_duplicates([new_song], existing_catalog, Config())[0]

    assert result.is_blocked is True
    assert result.best_score >= 100
    assert result.suggested_action == "review-duplicate"


def test_family_match_without_exact_slug_is_still_a_candidate() -> None:
    new_song = prepare_song({"title": "Princess in Waiting (Extended Version)"})
    existing_catalog = [
        {
            "title": "Princess in Waiting",
            "slug": "princess-in-waiting-original-version",
            "versionFamily": "princess-in-waiting",
            "releaseStatus": "canon",
        }
    ]

    result = check_duplicates([new_song], existing_catalog, Config())[0]

    assert result.is_blocked is True
    assert result.matches[0].family == "princess-in-waiting"


def test_unrelated_song_stays_import_ready() -> None:
    new_song = prepare_song({"title": "Heaven Wakes in Me"})
    existing_catalog = [
        {
            "title": "Hope's Song",
            "slug": "hopes-song",
            "versionFamily": "hopes-song",
            "releaseStatus": "canon",
        }
    ]

    result = check_duplicates([new_song], existing_catalog, Config())[0]

    assert result.is_blocked is False
    assert result.matches == []
    assert result.suggested_action == "import"
