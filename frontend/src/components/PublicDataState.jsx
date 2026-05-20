import { Link } from "react-router-dom";

export function PublicErrorState({
  actionLabel = "Try again",
  eyebrow = "Connection",
  homeLabel = "Back to home",
  message = "The archive could not be reached.",
  onRetry,
  secondaryHref = "",
  secondaryLabel = "",
  title = "Archive temporarily unavailable"
}) {
  return (
    <section className="intro-card homepage-panel public-state-card" role="alert">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <p>{message}</p>
      <div className="public-state-actions">
        {onRetry ? (
          <button className="secondary-button" onClick={onRetry} type="button">
            {actionLabel}
          </button>
        ) : null}
        {secondaryHref && secondaryLabel ? (
          <Link className="hero-link secondary-link" to={secondaryHref}>
            {secondaryLabel}
          </Link>
        ) : null}
        <Link className="hero-link" to="/">
          {homeLabel}
        </Link>
      </div>
    </section>
  );
}

export function PublicLoadingState({
  message = "The archive is opening.",
  title = "Loading archive"
}) {
  return (
    <section
      aria-live="polite"
      className="intro-card homepage-panel public-state-card"
    >
      <p className="eyebrow">Loading</p>
      <h3>{title}</h3>
      <p>{message}</p>
      <div aria-hidden="true" className="public-loading-bar" />
    </section>
  );
}
