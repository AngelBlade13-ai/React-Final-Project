import { formatClock } from "../lib/formatters";
import { getFractureverseMeta, getPrimaryThemeForPost } from "../lib/site";

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
  const fractureMeta = primaryTheme === "fractureverse" ? getFractureverseMeta(currentTrack, [currentTrack]) : null;
  const primaryCollection = collectionName || currentTrack.collections?.[0]?.title || "";
  const positionLabel =
    queueLength > 1
      ? fractureMeta?.fragmentId
        ? `${fractureMeta.fragmentId} of ${queueLength}`
        : `${currentIndex + 1} / ${queueLength}`
      : "";
  const secondaryMeta = [primaryCollection, positionLabel || fractureMeta?.state].filter(Boolean).join(" • ") || currentTrack.excerpt || "";
  const progressRatio = duration > 0 ? Math.min(progress / duration, 1) : 0;
  const progressPercent = `${progressRatio * 100}%`;
  const hasProgress = progressRatio > 0;

  return (
    <div className="mini-player-shell">
      <div className="mini-player-card">
        <div className="mini-player-identity">
          <div className="mini-player-copy">
            <p className="mini-player-label">Now Playing</p>
            <h2>{currentTrack.title}</h2>
            {secondaryMeta ? <p className="mini-player-meta">{secondaryMeta}</p> : null}
          </div>
          {fractureMeta ? <span className="mini-player-chip">{fractureMeta.signalType}</span> : null}
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
                className={`mini-player-progress-shell${fractureMeta ? " fracture-progress-shell" : ""}`}
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
              <p className="mini-player-label">Up Next</p>
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
