import { formatClock } from "../lib/formatters";
import {
  getEldoriaMeta,
  getFractureverseMeta,
  getPreferredCollectionForPost,
  getPrimaryThemeForPost,
  getThemeConfig
} from "../lib/site";

export default function MiniPlayer({
  collectionName,
  currentIndex,
  currentTrack,
  duration,
  isPlaying,
  nextTrack,
  onClose,
  onNext,
  onPrevious,
  previousTrack,
  onScrub,
  onTogglePlay,
  onVolumeChange,
  progress,
  queueLength,
  siteContent,
  volume
}) {
  if (!currentTrack) {
    return null;
  }

  const primaryTheme = getPrimaryThemeForPost(currentTrack);
  const themeConfig = getThemeConfig(primaryTheme, siteContent);
  const fractureMeta =
    primaryTheme === "fractureverse"
      ? getFractureverseMeta(currentTrack, [currentTrack])
      : null;
  const eldoriaMeta =
    primaryTheme === "eldoria" ? getEldoriaMeta(currentTrack) : null;
  const isEldoria = primaryTheme === "eldoria";
  const isFractureverse = primaryTheme === "fractureverse";
  const preferredCollection = getPreferredCollectionForPost(currentTrack);
  const primaryCollection = collectionName || preferredCollection?.title || "";
  const playerLabel = isEldoria
    ? "Now playing — ballad"
    : isFractureverse
      ? "Now playing"
      : themeConfig.playerLabel || "Now playing";
  const positionLabel =
    queueLength > 1
      ? fractureMeta?.fragmentId
        ? `Song ${currentIndex + 1} of ${queueLength}`
        : eldoriaMeta?.chapterLabel
          ? `${eldoriaMeta.chapterLabel} of ${queueLength}`
          : `${currentIndex + 1} / ${queueLength}`
      : "";
  const secondaryMeta =
    [eldoriaMeta?.chapterLabel || primaryCollection, fractureMeta?.state]
      .filter(Boolean)
      .join(" · ") ||
    currentTrack.excerpt ||
    "";
  const progressRatio = duration > 0 ? Math.min(progress / duration, 1) : 0;
  const progressPercent = `${progressRatio * 100}%`;
  const hasProgress = progressRatio > 0;
  const volumePercent = `${Math.min(Math.max(volume, 0), 1) * 100}%`;
  const chipLabel = fractureMeta
    ? fractureMeta.signalType
    : eldoriaMeta?.entryType || "";
  const displayTitle =
    isEldoria && eldoriaMeta?.subtitle ? eldoriaMeta.subtitle : currentTrack.title;
  const flavorLine = isEldoria ? eldoriaMeta?.playerFlavorLine : "";

  return (
    <div className="mini-player-shell" role="region" aria-label="Now playing">
      <div
        className={`mini-player-card${isEldoria ? " mini-player-card-eldoria" : ""}${isFractureverse ? " mini-player-card-fractureverse" : ""}`}
      >
        <div className="mini-player-identity">
          <div className="mini-player-copy">
            <p className="mini-player-label">{playerLabel}</p>
            <h2>{displayTitle}</h2>
            {primaryCollection ? (
              <p className="mini-player-world">{primaryCollection}</p>
            ) : null}
            {secondaryMeta ? (
              <p className="mini-player-meta">{secondaryMeta}</p>
            ) : null}
            {flavorLine ? <p className="mini-player-flavor">{flavorLine}</p> : null}
          </div>
          {chipLabel ? (
            <span
              className={`mini-player-chip${isEldoria ? " mini-player-chip-eldoria" : ""}`}
            >
              {chipLabel}
            </span>
          ) : null}
        </div>
        <div className="mini-player-center">
          <div className="mini-player-transport">
            <button
              aria-label="Previous song"
              className="mini-player-nav"
              disabled={!previousTrack && progress < 3}
              onClick={onPrevious}
              type="button"
            >
              Prev
            </button>
            <button
              aria-label={isPlaying ? "Pause" : "Play"}
              aria-pressed={isPlaying}
              className="mini-player-button"
              onClick={onTogglePlay}
              type="button"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              aria-label="Next song"
              className="mini-player-nav"
              disabled={!nextTrack}
              onClick={onNext}
              type="button"
            >
              Next
            </button>
            <div className="mini-player-progress-block">
              <div
                className="mini-player-progress-shell"
                style={{ "--mini-progress": progressPercent }}
              >
                <div aria-hidden="true" className="mini-player-progress-track" />
                <div
                  aria-hidden="true"
                  className={`mini-player-progress-fill${hasProgress ? " has-progress" : ""}`}
                />
                <div
                  aria-hidden="true"
                  className={`mini-player-progress-thumb${hasProgress ? " has-progress" : ""}`}
                />
                <input
                  aria-label="Playback position"
                  className="mini-player-progress"
                  max={duration || 0}
                  min="0"
                  onChange={onScrub}
                  step="0.1"
                  type="range"
                  value={Math.min(progress, duration || 0)}
                />
              </div>
              <div className="mini-player-times">
                <span className="mini-player-time">{formatClock(progress)}</span>
                <span className="mini-player-time">{formatClock(duration)}</span>
              </div>
            </div>
            <label className="mini-player-volume">
              <span className="mini-player-volume-icon">Vol</span>
              <input
                aria-label="Volume"
                className="mini-player-volume-slider"
                max="1"
                min="0"
                onChange={onVolumeChange}
                step="0.01"
                style={{ "--mini-volume": volumePercent }}
                type="range"
                value={volume}
              />
            </label>
          </div>
        </div>
        <div className="mini-player-actions">
          {nextTrack ? (
            <div className="mini-player-up-next">
              <p className="mini-player-label">
                {themeConfig.playerUpNextLabel || "Up next"}
              </p>
              <p className="mini-player-next-title">{nextTrack.title}</p>
            </div>
          ) : null}
          <button
            aria-label="Close player"
            className="mini-player-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
