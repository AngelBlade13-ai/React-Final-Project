"""Data models for the Song Catalog Import Assistant."""

from dataclasses import dataclass, field
from typing import Any, Dict, List


SONG_FIELDS = [
    "title",
    "slug",
    "lyrics",
    "sunoPrompt",
    "notes",
    "sourceTag",
    "versionFamily",
    "releaseStatus",
    "collectionSlugs",
    "subCategory",
    "worldLayer",
    "themeTags",
    "audioUrl",
    "videoUrl",
    "coverImageUrl",
]


@dataclass
class Song:
    """Represents one normalized song entry in the website schema."""

    title: str
    slug: str
    lyrics: str = ""
    sunoPrompt: str = ""
    notes: str = ""
    sourceTag: str = "suno"
    versionFamily: str = ""
    releaseStatus: str = "canon"
    collectionSlugs: List[str] = field(default_factory=list)
    subCategory: str = ""
    worldLayer: str = ""
    themeTags: List[str] = field(default_factory=list)
    audioUrl: str = ""
    videoUrl: str = ""
    coverImageUrl: str = ""

    # Internal media paths used during processing only.
    _video_path: str = field(default="", repr=False)
    _image_path: str = field(default="", repr=False)
    _supersede_target_slug: str = field(default="", repr=False)
    _supersede_reason: str = field(default="", repr=False)

    def to_dict(self) -> Dict[str, Any]:
        """Return a dict in the stable website-compatible output schema."""
        return {
            "title": self.title,
            "slug": self.slug,
            "lyrics": self.lyrics,
            "sunoPrompt": self.sunoPrompt,
            "notes": self.notes,
            "sourceTag": self.sourceTag,
            "versionFamily": self.versionFamily,
            "releaseStatus": self.releaseStatus,
            "collectionSlugs": self.collectionSlugs,
            "subCategory": self.subCategory,
            "worldLayer": self.worldLayer,
            "themeTags": self.themeTags,
            "audioUrl": self.audioUrl,
            "videoUrl": self.videoUrl,
            "coverImageUrl": self.coverImageUrl,
        }


@dataclass
class DuplicateMatch:
    """A scored match between a new song and an existing catalog entry."""

    title: str
    slug: str
    family: str
    status: str
    score: int


@dataclass
class SongResult:
    """Processing result for one new song."""

    song: Song
    matches: List[DuplicateMatch] = field(default_factory=list)
    is_blocked: bool = False
    block_reason: str = ""
    suggested_action: str = "import"
    supersede_target_slug: str = ""
    supersede_reason: str = ""

    @property
    def best_score(self) -> int:
        return max((match.score for match in self.matches), default=0)


@dataclass
class LyricsMergeUpdate:
    """A safe lyrics-only update for an existing website post."""

    song: Song
    target_slug: str
    target_title: str


@dataclass
class UploadReport:
    """Summary of optional media uploads for the current run."""

    enabled: bool = False
    skipped_reason: str = ""
    attempted_files: int = 0
    uploaded_files: int = 0
    warnings: List[str] = field(default_factory=list)
