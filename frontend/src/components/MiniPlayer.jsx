import { formatClock } from "../lib/formatters";

export default function MiniPlayer({ currentTrack, duration, isPlaying, onClose, onScrub, onTogglePlay, progress }) {
  if (!currentTrack) {
    return null;
  }

  return (
    <div className="mini-player-shell">
      <div className="mini-player-card">
        <div className="mini-player-copy">
          <p className="eyebrow">Now Playing</p>
          <h2>{currentTrack.title}</h2>
        </div>
        <div className="mini-player-controls">
          <button className="mini-player-button" onClick={onTogglePlay} type="button">
            {isPlaying ? "Pause" : "Play"}
          </button>
          <input
            className="mini-player-progress"
            max={duration || 0}
            min="0"
            onChange={onScrub}
            step="0.1"
            type="range"
            value={Math.min(progress, duration || 0)}
          />
          <span className="mini-player-time">
            {formatClock(progress)} / {formatClock(duration)}
          </span>
          <button className="mini-player-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
