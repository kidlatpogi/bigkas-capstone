import { useNavigate } from 'react-router-dom';
import './BackButton.css';

/**
 * BackButton — reusable back navigation button.
 * Priority: onClick > to > navigate(-1)
 */
function BackButton({
  onClick,
  to,
  label = 'Go back',
  className = '',
  style,
  text = 'Go Back',
  variant = 'circle',
  pillWidth = '12rem',
  pillHeight = '3.5rem',
  expandColor = '#7ecf93',
}) {
  const navigate = useNavigate();

  const handleClick = onClick || (() => (to ? navigate(to) : navigate(-1)));
  const buttonClassName = [
    variant === 'pill' ? 'back-btn-pill' : 'back-btn',
    className,
  ].filter(Boolean).join(' ');

  if (variant === 'pill') {
    const pillStyle = {
      ...style,
      '--back-pill-width': pillWidth,
      '--back-pill-height': pillHeight,
      '--back-pill-expand-color': expandColor,
    };

    return (
      <button
        type="button"
        className={buttonClassName}
        onClick={handleClick}
        aria-label={label}
        style={pillStyle}
      >
        <span className="back-btn-pill__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" height="24" width="24">
            <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z" fill="currentColor" />
            <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z" fill="currentColor" />
          </svg>
        </span>
        <span className="back-btn-pill__text">{text}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={handleClick}
      aria-label={label}
      style={style}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M15 18l-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default BackButton;
