import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { hasVideo } from "../../lib/site";

export default function FractureFragmentCard({
  active,
  dimmed,
  highlighted,
  meta,
  onFocusFragment,
  onPlayTrack,
  playbackContext,
  post,
  primaryInfluenced
}) {
  return (
    <Link
      className="release-card-link"
      onFocus={() => onFocusFragment(post.slug)}
      onMouseEnter={() => onFocusFragment(post.slug)}
      onMouseLeave={() => onFocusFragment("")}
      to={`/release/${post.slug}`}
    >
      <article
        className={`post-card homepage-post-card release-feed-card fracture-fragment-card fracture-${meta.state.toLowerCase()}${
          active ? " active" : ""
        }${highlighted ? " highlighted" : ""}${dimmed ? " dimmed" : ""}${primaryInfluenced ? " primary-influenced" : ""}`}
      >
        <div className="release-card-media fracture-fragment-media">
          <ReleaseMedia
            className="post-media"
            compact
            eyebrow={hasVideo(post.videoUrl) ? "Playback Available" : "Fragment Unrecorded"}
            muted
            text={
              hasVideo(post.videoUrl)
                ? meta.systemNote
                : "Signal trace detected. Playback unavailable. Emotional imprint preserved."
            }
            title={meta.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
        </div>
        <div className="post-body fracture-fragment-body">
          <p className="fracture-fragment-meta">
            {meta.fragmentId} / {meta.state} / {meta.perspective} / {meta.signalType}
          </p>
          <h3>{meta.title}</h3>
          <p>{meta.description}</p>
          <p className="fracture-relation-line">Linked to: {meta.linkedTo.join(", ")}</p>
          <p className="fracture-system-note">{meta.systemNote}</p>
          <div className="card-action-row">
            <button
              className="secondary-button mini-player-trigger"
              disabled={!hasVideo(post.videoUrl)}
              onClick={(event) => {
                event.preventDefault();
                onPlayTrack(post, playbackContext);
              }}
              type="button"
            >
              {hasVideo(post.videoUrl) ? "Begin Playback" : "Signal Unavailable"}
            </button>
            <span className="result-card-cta">Enter Fragment</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
