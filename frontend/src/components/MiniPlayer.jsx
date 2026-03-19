import { formatClock } from "../lib/formatters";
import { getFractureverseMeta, getPrimaryThemeForPost } from "../lib/site";

export default function MiniPlayer({ currentTrack, duration, isPlaying, onClose, onScrub, onTogglePlay, progress }) {
  if (!currentTrack) {
    return null;
  }

  const primaryTheme = getPrimaryThemeForPost(currentTrack);
  const fractureMeta = primaryTheme === "fractureverse" ? getFractureverseMeta(currentTrack, [currentTrack]) : null;
  const primaryCollection = currentTrack.collections?.[0]?.title || "";
  const secondaryMeta = fractureMeta
    ? `${fractureMeta.fragmentId} / ${fractureMeta.state}`
    : primaryCollection || currentTrack.excerpt || "";

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
            <button className="mini-player-button" onClick={onTogglePlay} type="button">
              {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="mini-player-progress-block">
              <input
                className="mini-player-progress"
                max={duration || 0}
                min="0"
                onChange={onScrub}
                step="0.1"
                type="range"
                value={Math.min(progress, duration || 0)}
              />
              <div className="mini-player-times">
                <span className="mini-player-time">{formatClock(progress)}</span>
                <span className="mini-player-time">{formatClock(duration)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mini-player-actions">
          <button className="mini-player-close" onClick={onClose} type="button">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
