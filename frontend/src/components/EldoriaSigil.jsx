export default function EldoriaSigil({ awake = false, className = "", compact = false }) {
  return (
    <div
      aria-hidden="true"
      className={`eldoria-sigil-shell${compact ? " eldoria-sigil-shell-compact" : ""}${awake ? " eldoria-sigil-shell-awake" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <svg className="eldoria-sigil-svg" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="eldoria-sigil-core-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5e6b8" stopOpacity="1" />
            <stop offset="45%" stopColor="#e0c88a" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#e0c88a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="eldoria-sigil-backdrop">
          <circle className="eldoria-sigil-ring eldoria-sigil-ring-faint" cx="100" cy="100" r="82" />
          <path
            className="eldoria-sigil-arc eldoria-sigil-arc-wide"
            d="M42 74 A64 64 0 0 1 158 74"
            fill="none"
          />
          <path
            className="eldoria-sigil-arc eldoria-sigil-arc-lower"
            d="M56 136 A56 56 0 0 0 144 136"
            fill="none"
          />
        </g>
        <g className="eldoria-sigil-outer-system">
          <circle className="eldoria-sigil-ring eldoria-sigil-ring-outer-svg" cx="100" cy="100" r="70" />
          <circle className="eldoria-sigil-ring eldoria-sigil-ring-mid-svg" cx="100" cy="100" r="46" />
          <path className="eldoria-sigil-ring eldoria-sigil-script" d="M100 18 A82 82 0 1 1 99.9 18" fill="none" />
        </g>
        <g className="eldoria-sigil-orbit-system">
          <circle className="eldoria-sigil-orbit eldoria-sigil-orbit-1" cx="100" cy="30" r="4" />
          <circle className="eldoria-sigil-orbit eldoria-sigil-orbit-2" cx="164" cy="100" r="3.5" />
          <circle className="eldoria-sigil-orbit eldoria-sigil-orbit-3" cx="64" cy="150" r="3" />
        </g>
        <g className="eldoria-sigil-core-system">
          <circle className="eldoria-sigil-core-glow" cx="100" cy="100" r="34" fill="url(#eldoria-sigil-core-gradient)" />
          <circle className="eldoria-sigil-core-dot" cx="100" cy="100" r="7" />
        </g>
      </svg>
    </div>
  );
}
