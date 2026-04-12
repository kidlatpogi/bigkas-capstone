/**
 * PasswordToggle — Reusable password visibility toggle button
 * Uses Show/Hide text instead of eye icons (matching Login design)
 * 
 * NOTE: Eye icons have been intentionally removed in favor of
 * clear, accessible "Show"/"Hide" text buttons for better UX
 * across Login and Create Account pages
 */
function PasswordToggle({ isVisible, onToggle, label = 'password', disabled = false }) {
  return (
    <button
      type="button"
      className="pw-toggle-btn"
      aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
      onClick={onToggle}
      tabIndex={0}
      disabled={disabled}
    >
      {isVisible ? 'Hide' : 'Show'}
    </button>
  );
}

export default PasswordToggle;
