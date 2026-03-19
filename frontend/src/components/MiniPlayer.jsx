import { formatClock } from "../lib/formatters";
import { getEldoriaMeta, getFractureverseMeta, getPrimaryThemeForPost, getThemeConfig } from "../lib/site";

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
  volume
}) {
  if (!currentTrack) {
    return null;
  }

  const primaryTheme = getPrimaryThemeForPost(currentTrack);
  const themeConfig = getThemeConfig(primaryTheme);
  const fractureMeta = primaryTheme === "fractureverse" ? getFractureverseMeta(currentTrack, [currentTrack]) : null;
  const eldoriaMeta = primaryTheme === "eldoria" ? getEldoriaMeta(currentTrack) : null;
  const isEldoria = primaryTheme === "eldoria";
  const primaryCollection = collectionName || currentTrack.collections?.[0]?.title || "";
  const positionLabel =
    queueLength > 1
      ? fractureMeta?.fragmentId
        ? `${fractureMeta.fragmentId} of ${queueLength}`
        : eldoriaMeta?.chapterLabel
          ? `${eldoriaMeta.chapterLabel} of ${queueLength}`
        : `${currentIndex + 1} / ${queueLength}`
      : "";
  const secondaryMeta = [eldoriaMeta?.chapterLabel || primaryCollection, positionLabel || fractureMeta?.state].filter(Boolean).join(" / ") || currentTrack.excerpt || "";
  const progressRatio = duration > 0 ? Math.min(progress / duration, 1) : 0;
  const progressPercent = `${progressRatio * 100}%`;
  const hasProgress = progressRatio > 0;
  const chipLabel = fractureMeta ? fractureMeta.signalType : eldoriaMeta?.entryType || (isEldoria && positionLabel ? positionLabel : "");
  const displayTitle = isEldoria && eldoriaMeta?.subtitle ? eldoriaMeta.subtitle : currentTrack.title;
  const flavorLine = isEldoria ? eldoriaMeta?.playerFlavorLine : "";

  return (
    <div className="mini-player-shell">
      <div className={`mini-player-card${isEldoria ? " mini-player-card-eldoria" : ""}`}>
        <div className="mini-player-identity">
          <div className="mini-player-copy">
            <p className="mini-player-label">{themeConfig.playerLabel || "Now Playing"}</p>
            <h2>{displayTitle}</h2>
            {secondaryMeta ? <p className="mini-player-meta">{secondaryMeta}</p> : null}
            {flavorLine ? <p className="mini-player-flavor">{flavorLine}</p> : null}
          </div>
          {chipLabel ? <span className={`mini-player-chip${isEldoria ? " mini-player-chip-eldoria" : ""}`}>{chipLabel}</span> : null}
        </div>
        <div className="mini-player-center">
          <div className="mini-player-transport">
            <button className="mini-player-nav" disabled={!previousTrack && progress < 3} onClick={onPrevious} type="button">
              Prev
            </button>
            <button className="mini-player-button" onClick={onTogglePlay} type="button">
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button className="mini-player-nav" disabled={!nextTrack} onClick={onNext} type="button">
              Next
            </button>
            <div className="mini-player-progress-block">
              <div
                className={`mini-player-progress-shell${fractureMeta ? " fracture-progress-shell" : ""}${isEldoria ? " eldoria-progress-shell" : ""}`}
                style={{ "--mini-progress": progressPercent }}
              >
                <div aria-hidden="true" className="mini-player-progress-track" />
                <div aria-hidden="true" className={`mini-player-progress-fill${hasProgress ? " has-progress" : ""}`} />
                <div aria-hidden="true" className={`mini-player-progress-thumb${hasProgress ? " has-progress" : ""}`} />
                <input
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
            <label className="mini-player-volume" title="Volume">
              <span className="mini-player-volume-icon">Vol</span>
              <input className="mini-player-volume-slider" max="1" min="0" onChange={onVolumeChange} step="0.01" type="range" value={volume} />
            </label>
          </div>
        </div>
        <div className="mini-player-actions">
          {nextTrack ? (
            <div className="mini-player-up-next">
              <p className="mini-player-label">{themeConfig.playerUpNextLabel || "Up Next"}</p>
              <p className="mini-player-next-title">{nextTrack.title}</p>
            </div>
          ) : null}
          <button className="mini-player-close" onClick={onClose} type="button">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
