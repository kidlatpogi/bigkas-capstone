/**
 * Validation utility functions
 */

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate required field
 * @param {string} value 
 * @param {string} fieldName 
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateRequired(value, fieldName = 'Field') {
  const isValid = value !== null && value !== undefined && value.toString().trim() !== '';
  return {
    isValid,
    error: isValid ? undefined : `${fieldName} is required`,
  };
}

/**
 * Validate minimum length
 * @param {string} value 
 * @param {number} minLength 
 * @param {string} fieldName 
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateMinLength(value, minLength, fieldName = 'Field') {
  const isValid = value && value.length >= minLength;
  return {
    isValid,
    error: isValid ? undefined : `${fieldName} must be at least ${minLength} characters`,
  };
}
