import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { getPlaybackStateCopy } from "../../lib/site";

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
  const releasePath = `/release/${post.slug}`;
  const playbackCopy = getPlaybackStateCopy(post, "fractureverse");

  return (
    <article
      className={`release-card-link post-card homepage-post-card release-feed-card fracture-fragment-card fracture-${meta.state.toLowerCase()}${
        active ? " active" : ""
      }${highlighted ? " highlighted" : ""}${dimmed ? " dimmed" : ""}${primaryInfluenced ? " primary-influenced" : ""}`}
      onFocus={() => onFocusFragment(post.slug)}
      onMouseEnter={() => onFocusFragment(post.slug)}
      onMouseLeave={() => onFocusFragment("")}
    >
      <Link className="release-card-surface" to={releasePath}>
        <div className="release-card-media fracture-fragment-media">
          <ReleaseMedia
            className="post-media"
            compact
            eyebrow={playbackCopy.mediaEyebrow}
            muted
            text={playbackCopy.playable ? meta.systemNote : playbackCopy.mediaText}
            title={meta.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
        </div>
      </Link>
      <div className="post-body fracture-fragment-body">
        <p className="fracture-fragment-meta">
          {meta.fragmentId} / {meta.state} / {meta.perspective} / {meta.signalType}
        </p>
        <h3>
          <Link className="card-title-link" to={releasePath}>
            {meta.title}
          </Link>
        </h3>
        <p>{meta.description}</p>
        <p className="fracture-relation-line">Linked to: {meta.linkedTo.join(", ")}</p>
        <p className="fracture-system-note">{meta.systemNote}</p>
        <div className="card-action-row">
          <button
            className="secondary-button mini-player-trigger"
            disabled={!playbackCopy.playable}
            onClick={() => onPlayTrack(post, playbackContext)}
            type="button"
          >
            {playbackCopy.actionLabel}
          </button>
          <Link className="result-card-cta" to={releasePath}>
            Enter Fragment
          </Link>
        </div>
      </div>
    </article>
  );
}
