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
  const posterUrl = getVideoPosterUrl(videoUrl);
  const preferPoster = compact && !controls;

  if (hasVideo(videoUrl) && preferPoster && posterUrl) {
    return <img alt="" className={className} decoding="async" loading="lazy" src={posterUrl} />;
  }

  if (hasVideo(videoUrl)) {
    return (
      <video
        className={className}
        controls={controls}
        muted={muted}
        playsInline
        poster={posterUrl || undefined}
        preload={controls ? "metadata" : "none"}
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
