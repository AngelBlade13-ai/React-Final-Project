"""Hosted web entry point for the Song Catalog Import Assistant.

This is meant for a separate Render Python web service used as an instructor
demo. It runs the importer in standalone preview mode, so it can normalize,
deduplicate, optionally upload media to Cloudinary, and produce website-ready
JSON without editing the deployed website repository.
"""

from __future__ import annotations

import os
from pathlib import Path

from src.config import Config
from src.web_app import run_web_app


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name, "").strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


def main() -> None:
    importer_root = Path(__file__).resolve().parent
    demo_mode = _env_bool("IMPORTER_DEMO_MODE", False)
    no_upload = _env_bool("IMPORTER_NO_UPLOAD", demo_mode)

    config = Config(
        catalog_path=importer_root
        / os.getenv("IMPORTER_CATALOG_PATH", "input/existing_catalog.json"),
        input_path=importer_root
        / os.getenv("IMPORTER_INPUT_PATH", "input/new_songs.json"),
        output_dir=importer_root / os.getenv("IMPORTER_OUTPUT_DIR", "output/hosted"),
        no_upload=no_upload,
        website_root=None,
        website_posts_path=None,
        apply_to_website=False,
        reseed_website=False,
        demo_mode=demo_mode,
    )

    run_web_app(
        config,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8765")),
        open_browser=False,
    )


if __name__ == "__main__":
    main()
