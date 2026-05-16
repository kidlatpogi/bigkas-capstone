import { Eye, EyeOff } from 'lucide-react';

function PasswordToggle({ isVisible, onToggle, label = 'password', disabled = false }) {
  const Icon = isVisible ? EyeOff : Eye;

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
      <Icon aria-hidden="true" size={18} strokeWidth={2.4} />
    </button>
  );
}

export default PasswordToggle;
