"""Central runtime configuration."""

import os
from dataclasses import dataclass, field
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


def _optional_env_path(name: str) -> Path | None:
    """Return a Path from an environment variable when set."""
    value = os.getenv(name, "").strip()
    return Path(value) if value else None


@dataclass
class Config:
    """Runtime configuration built from CLI args and environment variables."""

    catalog_path: Path | None = None
    input_path: Path = Path("input/new_songs.json")
    output_dir: Path = Path("output")
    no_upload: bool = False
    dry_run: bool = False
    website_root: Path | None = field(default_factory=lambda: _optional_env_path("WEBSITE_ROOT"))
    website_posts_path: Path | None = field(
        default_factory=lambda: _optional_env_path("WEBSITE_POSTS_PATH")
    )
    apply_to_website: bool = False
    reseed_website: bool = False
    merge_lyrics: bool = False
    lyrics_repair_only: bool = False
    demo_mode: bool = False

    cloudinary_cloud_name: str = field(
        default_factory=lambda: os.getenv("CLOUDINARY_CLOUD_NAME", "")
    )
    cloudinary_api_key: str = field(
        default_factory=lambda: os.getenv("CLOUDINARY_API_KEY", "")
    )
    cloudinary_api_secret: str = field(
        default_factory=lambda: os.getenv("CLOUDINARY_API_SECRET", "")
    )

    duplicate_block_threshold: int = 60
    duplicate_candidate_threshold: int = 40

    score_exact_slug: int = 100
    score_family_match: int = 70
    score_fuzzy_title_max: int = 80
    score_fuzzy_title_cutoff: float = 0.6

    @property
    def cloudinary_configured(self) -> bool:
        """Return True when all required Cloudinary variables are present."""
        return all(
            [
                self.cloudinary_cloud_name,
                self.cloudinary_api_key,
                self.cloudinary_api_secret,
            ]
        )

    @property
    def upload_enabled(self) -> bool:
        """Return True when uploads are allowed and credentials exist."""
        return not self.no_upload and self.cloudinary_configured
