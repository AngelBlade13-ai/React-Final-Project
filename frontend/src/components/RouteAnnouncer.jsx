import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function RouteAnnouncer() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    window.requestAnimationFrame(() => {
      document.getElementById("public-content")?.focus({ preventScroll: true });
    });
  }, [location.pathname, location.search]);

  return null;
}
