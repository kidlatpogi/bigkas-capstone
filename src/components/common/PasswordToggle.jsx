function PasswordToggle({ isVisible, onToggle, label = 'password', disabled = false }) {
  return (
    <button
      type="button"
      className="pw-toggle-btn"
      aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
      title={isVisible ? `Hide ${label}` : `Show ${label}`}
      onClick={onToggle}
      tabIndex={0}
      disabled={disabled}
    >
      {isVisible ? 'Hide' : 'Show'}
    </button>
  );
}

export default PasswordToggle;
