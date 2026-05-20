import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { formatPostDate } from "../../lib/formatters";
import {
  getPlaybackStateCopy,
  getPrimaryThemeForPost,
  getVisibleCollectionsForPost
} from "../../lib/site";

export default function ReleaseCard({ emphasis = false, post, onPlayTrack, layout = "card" }) {
  const primaryTheme = getPrimaryThemeForPost(post);
  const playbackCopy = getPlaybackStateCopy(post, primaryTheme);
  const visibleCollections = getVisibleCollectionsForPost(post);
  const emphasisClass = emphasis ? " release-feed-card-emphasis" : "";
  const releasePath = `/release/${post.slug}`;

  return (
    <article className={`release-card-link post-card homepage-post-card release-feed-card${emphasisClass} ${layout === "horizontal" ? "result-card" : ""}`}>
      <Link className="release-card-surface" to={releasePath}>
        <div className="release-card-media">
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
          <div className="play-pill">{playbackCopy.pillLabel}</div>
          <div className="release-card-arrow">
            {playbackCopy.playable ? "Play ->" : "Open ->"}
          </div>
        </div>
      </Link>
      <div className="post-body">
        <p className="meta">{formatPostDate(post.createdAt)}</p>
        <h3>
          <Link className="card-title-link" to={releasePath}>
            {post.title}
          </Link>
        </h3>
        <p>{post.excerpt}</p>
        <div className="tag-row compact-tag-row">
          {visibleCollections.map((collection) => (
            <span className="collection-chip static-chip" key={collection.slug}>
              {collection.title}
            </span>
          ))}
        </div>
        <div className="card-action-row">
          <button
            className="secondary-button mini-player-trigger"
            disabled={!playbackCopy.playable}
            onClick={() => onPlayTrack(post)}
            type="button"
          >
            {playbackCopy.compactActionLabel}
          </button>
          {layout === "horizontal" ? (
            <Link className="result-card-cta" to={releasePath}>
              Open release
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
