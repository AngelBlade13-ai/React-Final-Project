export default function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={!isDark}
      className="theme-toggle"
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle-mark">
        {isDark ? "☀" : "☾"}
      </span>
      <span className="theme-toggle-copy">
        <span className="theme-toggle-kicker">Theme</span>
        <span className="theme-toggle-label">
          {isDark ? "Light Room" : "Night Room"}
        </span>
      </span>
    </button>
  );
}
