import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { formatPostDate } from "../../lib/formatters";
import { getPrimaryThemeForPost, getVisibleCollectionsForPost, hasVideo } from "../../lib/site";

export default function ReleaseCard({ emphasis = false, post, onPlayTrack, layout = "card" }) {
  const primaryTheme = getPrimaryThemeForPost(post);
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
            muted
            text="This release is live now. The video can be attached later."
            title={post.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
          <div className="play-pill">{hasVideo(post.videoUrl) ? "Play" : "Video Pending"}</div>
          <div className="release-card-arrow">{hasVideo(post.videoUrl) ? "Play ->" : "Open ->"}</div>
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
            disabled={!hasVideo(post.videoUrl)}
            onClick={() => onPlayTrack(post)}
            type="button"
          >
            {hasVideo(post.videoUrl) ? (primaryTheme === "eldoria" ? "Play the Ballad" : "Play in Mini Player") : "Video Pending"}
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
