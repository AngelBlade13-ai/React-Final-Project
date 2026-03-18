import { Link } from "react-router-dom";
import ReleaseMedia from "../ReleaseMedia";
import { formatPostDate } from "../../lib/formatters";
import { hasVideo } from "../../lib/site";

export function ReleaseCard({ post, onPlayTrack, layout = "card" }) {
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
              {hasVideo(post.videoUrl) ? "Play in Mini Player" : "Video Pending"}
            </button>
            {layout === "horizontal" ? <span className="result-card-cta">Open release</span> : null}
          </div>
        </div>
      </article>
    </Link>
  );
}

export function TimelineCard({ index, onPlayTrack, post, themeConfig }) {
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
                onPlayTrack(post);
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

export function FractureFragmentCard({ active, highlighted, meta, onFocusFragment, onPlayTrack, post }) {
  return (
    <Link
      className="release-card-link"
      onFocus={() => onFocusFragment(post.slug)}
      onMouseEnter={() => onFocusFragment(post.slug)}
      to={`/release/${post.slug}`}
    >
      <article
        className={`post-card homepage-post-card release-feed-card fracture-fragment-card fracture-${meta.state.toLowerCase()}${
          active ? " active" : ""
        }${highlighted ? " highlighted" : ""}`}
      >
        <div className="release-card-media fracture-fragment-media">
          <ReleaseMedia
            className="post-media"
            compact
            muted
            text={meta.systemNote}
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
                onPlayTrack(post);
              }}
              type="button"
            >
              {hasVideo(post.videoUrl) ? "Play in Mini Player" : "Video Pending"}
            </button>
            <span className="result-card-cta">Open Fragment</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function CollectionCard({ collection, showFeatured = false }) {
  return (
    <Link className="collection-link" to={`/collections/${collection.slug}`}>
      <article className="intro-card homepage-panel collection-card">
        <div className="collection-card-topline">
          <p className="eyebrow">Collection</p>
          <span className="meta-badge subtle-badge">{collection.releaseCount} releases</span>
        </div>
        <h3>{collection.title}</h3>
        <p>{collection.description}</p>
        <div className="collection-meta-row">
          {collection.featuredRelease ? <span className="meta-badge subtle-badge">Featured release ready</span> : null}
          {collection.theme ? <span className="meta-badge subtle-badge">{collection.theme}</span> : null}
          <span className="collection-card-cta">Open shelf</span>
        </div>
        {showFeatured && collection.featuredRelease ? (
          <div className="featured-collection-panel">
            <p className="meta">Featured release</p>
            <strong>{collection.featuredRelease.title}</strong>
            <p>{collection.featuredRelease.excerpt}</p>
          </div>
        ) : null}
      </article>
    </Link>
  );
}
