import React from 'react';
import './Button.css';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  isLoading = false,
  icon: Icon,
  iconPosition = 'right',
  ...props
}) => {
  const baseClass = 'bigkas-btn';
  const variantClass = `${baseClass}--${variant}`;
  const loadingClass = isLoading ? 'is-loading' : '';
  
  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${loadingClass} ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="btn-loader"></span>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="btn-icon btn-icon--left" />}
          <span className="btn-content">{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="btn-icon btn-icon--right" />}
        </>
      )}
    </button>
  );
};

export default Button;
