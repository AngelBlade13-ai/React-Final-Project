import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { formatPostDate } from "../../lib/formatters";
import { getPrimaryThemeForPost, hasVideo } from "../../lib/site";

export default function ReleaseCard({ post, onPlayTrack, layout = "card" }) {
  const primaryTheme = getPrimaryThemeForPost(post);

  return (
    <Link className="release-card-link" to={`/release/${post.slug}`}>
      <article className={`post-card homepage-post-card release-feed-card ${layout === "horizontal" ? "result-card" : ""}`}>
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
        <div className="post-body">
          <p className="meta">{formatPostDate(post.createdAt)}</p>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
          <div className="tag-row compact-tag-row">
            {(post.collections || []).map((collection) => (
              <span className="collection-chip static-chip" key={collection.slug}>
                {collection.title}
              </span>
            ))}
          </div>
          <div className="card-action-row">
            <button
              className="secondary-button mini-player-trigger"
              disabled={!hasVideo(post.videoUrl)}
              onClick={(event) => {
                event.preventDefault();
                onPlayTrack(post);
              }}
              type="button"
            >
              {hasVideo(post.videoUrl) ? (primaryTheme === "eldoria" ? "Play the Ballad" : "Play in Mini Player") : "Video Pending"}
            </button>
            {layout === "horizontal" ? <span className="result-card-cta">Open release</span> : null}
          </div>
        </div>
      </article>
    </Link>
  );
}
