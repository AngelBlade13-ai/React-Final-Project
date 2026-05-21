export default function PublicCollapsibleSection({
  children,
  defaultOpen = false,
  summary,
  className = ""
}) {
  return (
    <details
      className={`public-collapsible-section${className ? ` ${className}` : ""}`}
      open={defaultOpen || undefined}
    >
      <summary>{summary}</summary>
      <div className="public-collapsible-body">{children}</div>
    </details>
  );
}
