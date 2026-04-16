import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearThresholdState, isImmersiveTheme, prefersReducedMotion, setThresholdState, storePendingWorldEntry } from "../lib/worldTransition";

const THRESHOLD_DELAY_MS = 560;

function isModifiedEvent(event) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

export default function WorldThresholdLink({ children, className = "", theme = "", to }) {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const immersive = isImmersiveTheme(theme);

  function handleClick(event) {
    if (!immersive || event.button !== 0 || isModifiedEvent(event)) {
      return;
    }

    event.preventDefault();

    storePendingWorldEntry({
      startedAt: Date.now(),
      slug: String(to || "").replace("/collections/", ""),
      theme
    });

    if (prefersReducedMotion()) {
      navigate(to);
      return;
    }

    setIsTransitioning(true);
    setThresholdState(theme);

    window.setTimeout(() => {
      navigate(to);
      window.setTimeout(() => {
        clearThresholdState();
      }, 140);
    }, THRESHOLD_DELAY_MS);
  }

  return (
    <Link
      className={`${className}${isTransitioning ? " threshold-source-active" : ""}${immersive ? ` threshold-source-${theme}` : ""}`}
      onClick={handleClick}
      to={to}
    >
      {children}
    </Link>
  );
}
