import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { getEldoriaMeta, hasVideo } from "../../lib/site";

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

  return (
    <Link className="release-card-link" to={`/release/${post.slug}`} {...linkProps}>
      <article
        className={`post-card homepage-post-card release-feed-card timeline-card${isEldoria ? " eldoria-chronicle-card" : ""}${
          entryState ? ` eldoria-entry-${entryState.key}` : ""
        }`}
      >
        <div className="release-card-media timeline-card-media">
          <ReleaseMedia
            className="post-media"
            compact
            muted
            text={
              isEldoria
                ? "This chapter has entered the chronicle as writing first. Its visual telling can be added later."
                : "This fragment has been published as writing first. The video can arrive later."
            }
            title={post.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
        </div>
        <div className="post-body timeline-card-body">
          <p className="meta">
            {isEldoria
              ? eldoriaMeta?.identityLine || eldoriaMeta?.chapterLabel || `Chapter ${String(index + 1).padStart(2, "0")}`
              : `${themeConfig.itemName} #${String(index + 1).padStart(2, "0")}`}
          </p>
          {entryState ? <p className="eldoria-entry-state">{entryState.label}</p> : null}
          <h3>{displayTitle}</h3>
          <p>{previewCopy}</p>
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
              {hasVideo(post.videoUrl)
                ? themeConfig.itemName === "Ballad"
                  ? "Listen to Ballad"
                  : "Play in Mini Player"
                : "Video Pending"}
            </button>
            <span className="result-card-cta">{themeConfig.itemAction}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
