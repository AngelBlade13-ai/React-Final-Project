import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { hasVideo } from "../../lib/site";

export default function TimelineCard({ index, onPlayTrack, playbackContext, post, themeConfig }) {
  return (
    <Link className="release-card-link" to={`/release/${post.slug}`}>
      <article className="post-card homepage-post-card release-feed-card timeline-card">
        <div className="release-card-media timeline-card-media">
          <ReleaseMedia
            className="post-media"
            compact
            muted
            text="This fragment has been published as writing first. The video can arrive later."
            title={post.title}
            videoUrl={post.videoUrl}
          />
          <div className="release-card-overlay" />
        </div>
        <div className="post-body timeline-card-body">
          <p className="meta">
            {themeConfig.itemName} #{String(index + 1).padStart(2, "0")}
          </p>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
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
              {hasVideo(post.videoUrl) ? "Play in Mini Player" : "Video Pending"}
            </button>
            <span className="result-card-cta">{themeConfig.itemAction}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
