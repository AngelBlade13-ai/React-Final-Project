import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    window.requestAnimationFrame(() => {
      document.getElementById("public-content")?.focus({ preventScroll: true });
      const pageTitle = document.title || "Page updated";
      setAnnouncement(pageTitle);
    });
  }, [location.pathname]);

  return (
    <p aria-live="polite" className="route-announcer">
      {announcement}
    </p>
  );
}
