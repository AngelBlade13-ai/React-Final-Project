export function formatPostDate(createdAt) {
  if (!createdAt) return "Unscheduled";
  return new Date(createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export function normalizeTitle(title) {
  return (title || "").replace(/["']/g, "").trim().toLowerCase();
}

export function formatClock(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}
