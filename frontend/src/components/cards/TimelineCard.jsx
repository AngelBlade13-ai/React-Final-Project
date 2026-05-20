import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { getEldoriaMeta, getPlaybackStateCopy, hasVideo } from "../../lib/site";

function getEldoriaEntryState(post, eldoriaMeta) {
  const status = String(eldoriaMeta?.entryStatus || "").toLowerCase();

  if (status.includes("sealed") || status.includes("hidden")) {
    return {
      key: "hidden",
      label: "Sealed"
    };
  }

  if (!hasVideo(post.videoUrl)) {
    return {
      key: "unwritten",
      label: "Yet To Be Recorded"
    };
  }

  return {
    key: "active",
    label: "Active Entry"
  };
}

export default function TimelineCard({ index, onEnterChronicle, onPlayTrack, playbackContext, post, themeConfig }) {
  const isEldoria = themeConfig.itemName === "Ballad";
  const playbackCopy = getPlaybackStateCopy(
    post,
    isEldoria ? "eldoria" : ""
  );
  const eldoriaMeta = isEldoria ? getEldoriaMeta(post) : null;
  const displayTitle =
    isEldoria && eldoriaMeta?.subtitle && !post.title.toLowerCase().includes(eldoriaMeta.subtitle.toLowerCase())
      ? `${post.title} (${eldoriaMeta.subtitle})`
      : post.title;
  const previewCopy = isEldoria ? eldoriaMeta?.openingPassage || post.excerpt : post.excerpt;
  const entryState = isEldoria ? getEldoriaEntryState(post, eldoriaMeta) : null;
  const linkProps =
    isEldoria && onEnterChronicle
      ? {
          onClick: (event) => {
            event.preventDefault();
            onEnterChronicle(post.slug);
          }
        }
      : {};
  const releasePath = `/release/${post.slug}`;

  return (
    <article
      className={`release-card-link post-card homepage-post-card release-feed-card timeline-card${isEldoria ? " eldoria-chronicle-card" : ""}${
        entryState ? ` eldoria-entry-${entryState.key}` : ""
      }`}
    >
      <Link className="release-card-surface" to={releasePath} {...linkProps}>
        <div className="release-card-media timeline-card-media">
          <ReleaseMedia
            className="post-media"
            compact
            eyebrow={playbackCopy.mediaEyebrow}
            muted
            text={playbackCopy.mediaText}
            title={post.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
        </div>
      </Link>
      <div className="post-body timeline-card-body">
        <p className="meta">
          {isEldoria
            ? eldoriaMeta?.identityLine || eldoriaMeta?.chapterLabel || `Chapter ${String(index + 1).padStart(2, "0")}`
            : `${themeConfig.itemName} #${String(index + 1).padStart(2, "0")}`}
        </p>
        {entryState ? <p className="eldoria-entry-state">{entryState.label}</p> : null}
        <h3>
          <Link className="card-title-link" to={releasePath} {...linkProps}>
            {displayTitle}
          </Link>
        </h3>
        <p>{previewCopy}</p>
        <div className="card-action-row">
          <button
            className="secondary-button mini-player-trigger"
            disabled={!playbackCopy.playable}
            onClick={() => onPlayTrack(post, playbackContext)}
            type="button"
          >
            {playbackCopy.actionLabel}
          </button>
          <Link className="result-card-cta" to={releasePath} {...linkProps}>
            {themeConfig.itemAction}
          </Link>
        </div>
      </div>
    </article>
  );
}
