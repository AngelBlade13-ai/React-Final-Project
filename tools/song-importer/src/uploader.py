"""Optional Cloudinary media upload support."""

from pathlib import Path
from typing import List

from src.config import Config
from src.models import Song, UploadReport


def upload_media(songs: List[Song], config: Config) -> UploadReport:
    """Upload video and cover images when Cloudinary is configured."""
    report = UploadReport(enabled=False)

    if not songs:
        report.skipped_reason = "No import-ready songs required media upload."
        print("  Upload skipped: no import-ready songs.")
        return report

    if config.no_upload:
        report.skipped_reason = "Upload disabled by --no-upload."
        print("  Upload skipped: --no-upload flag is set.")
        return report

    if not config.cloudinary_configured:
        report.skipped_reason = "Cloudinary credentials not configured."
        print(
            "  Upload skipped: Cloudinary credentials not configured. "
            "Output files will still be generated."
        )
        return report

    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError:
        report.skipped_reason = "cloudinary package not installed."
        print("  Upload skipped: install the 'cloudinary' package to enable uploads.")
        return report

    report.enabled = True
    cloudinary.config(
        cloud_name=config.cloudinary_cloud_name,
        api_key=config.cloudinary_api_key,
        api_secret=config.cloudinary_api_secret,
    )

    for song in songs:
        _upload_video(song, report)
        _upload_image(song, report)

    return report


def _upload_video(song: Song, report: UploadReport) -> None:
    """Upload one video file and update song.videoUrl on success."""
    import cloudinary.uploader

    path = song._video_path
    if not path:
        return

    report.attempted_files += 1
    file_path = Path(path)
    if not file_path.is_file():
        warning = f"Video file not found for '{song.title}': {path}"
        report.warnings.append(warning)
        print(f"  Warning: {warning}")
        return

    print(f"  Uploading video for '{song.title}'...")
    try:
        result = cloudinary.uploader.upload(
            str(file_path),
            resource_type="video",
            public_id=f"songs/{song.slug}",
            overwrite=True,
        )
        song.videoUrl = result.get("secure_url", "")
        report.uploaded_files += 1
        print(f"  Uploaded video: {song.videoUrl}")
    except Exception as exc:  # noqa: BLE001
        warning = f"Video upload failed for '{song.title}': {exc}"
        report.warnings.append(warning)
        print(f"  Warning: {warning}")


def _upload_image(song: Song, report: UploadReport) -> None:
    """Upload one cover image and update song.coverImageUrl on success."""
    import cloudinary.uploader

    path = song._image_path
    if not path:
        return

    report.attempted_files += 1
    file_path = Path(path)
    if not file_path.is_file():
        warning = f"Cover image file not found for '{song.title}': {path}"
        report.warnings.append(warning)
        print(f"  Warning: {warning}")
        return

    print(f"  Uploading cover image for '{song.title}'...")
    try:
        result = cloudinary.uploader.upload(
            str(file_path),
            resource_type="image",
            public_id=f"songs/{song.slug}-cover",
            overwrite=True,
        )
        song.coverImageUrl = result.get("secure_url", "")
        report.uploaded_files += 1
        print(f"  Uploaded cover image: {song.coverImageUrl}")
    except Exception as exc:  # noqa: BLE001
        warning = f"Cover image upload failed for '{song.title}': {exc}"
        report.warnings.append(warning)
        print(f"  Warning: {warning}")
