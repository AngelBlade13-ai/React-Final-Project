"""Duplicate detection for normalized songs."""

from difflib import SequenceMatcher
from typing import List

from src.config import Config
from src.models import DuplicateMatch, Song, SongResult


def _fuzzy_ratio(a: str, b: str) -> float:
    """Return a 0-1 similarity ratio between two titles."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _score_against_existing(
    new_song: Song,
    existing: dict,
    config: Config,
) -> DuplicateMatch | None:
    """Return a scored match for one existing catalog entry, if relevant."""
    score = 0

    existing_slug = existing.get("slug", "")
    existing_family = existing.get("versionFamily", "")
    existing_title = existing.get("title", "")
    existing_status = existing.get("releaseStatus", "")

    if new_song.slug == existing_slug:
        score += config.score_exact_slug

    if new_song.versionFamily and new_song.versionFamily == existing_family:
        score += config.score_family_match

    if score < config.score_exact_slug:
        ratio = _fuzzy_ratio(new_song.title, existing_title)
        if ratio >= config.score_fuzzy_title_cutoff:
            score += int(ratio * config.score_fuzzy_title_max)

    if score < config.duplicate_candidate_threshold:
        return None

    return DuplicateMatch(
        title=existing_title,
        slug=existing_slug,
        family=existing_family,
        status=existing_status,
        score=score,
    )


def check_duplicates(
    new_songs: List[Song],
    existing_catalog: List[dict],
    config: Config | None = None,
) -> List[SongResult]:
    """Check each new song against the existing catalog."""
    if config is None:
        config = Config()

    results: List[SongResult] = []

    for song in new_songs:
        matches: List[DuplicateMatch] = []

        for existing in existing_catalog:
            match = _score_against_existing(song, existing, config)
            if match is not None:
                matches.append(match)

        matches.sort(key=lambda match: match.score, reverse=True)

        best_score = matches[0].score if matches else 0
        is_blocked = best_score >= config.duplicate_block_threshold

        if is_blocked:
            suggested_action = "review-duplicate"
            block_reason = "Likely duplicate or family collision"
        elif matches:
            suggested_action = "review-recommended"
            block_reason = "Possible duplicate; review suggested"
        else:
            suggested_action = "import"
            block_reason = ""

        results.append(
            SongResult(
                song=song,
                matches=matches,
                is_blocked=is_blocked,
                block_reason=block_reason,
                suggested_action=suggested_action,
            )
        )

    return results
