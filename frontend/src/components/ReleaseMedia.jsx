import { getVideoPosterUrl, hasVideo } from "../lib/site";

export default function ReleaseMedia({
  videoUrl,
  className = "",
  eyebrow = "Video Pending",
  title = "Video Coming Soon",
  text = "This release is already live. Add the video whenever it is ready.",
  compact = false,
  controls = false,
  muted = false
}) {
  if (hasVideo(videoUrl)) {
    return (
      <video
        className={className}
        controls={controls}
        muted={muted}
        playsInline
        poster={getVideoPosterUrl(videoUrl) || undefined}
        preload="metadata"
        src={videoUrl}
      />
    );
  }

  return (
    <div className={`media-placeholder ${compact ? "media-placeholder-compact" : ""} ${className}`.trim()}>
      <div className="media-placeholder-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
