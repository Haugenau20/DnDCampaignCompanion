/**
 * Password validation result with detailed feedback
 */
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
  }
  
  /**
   * Validates a password against security requirements
   * @param password The password to validate
   * @returns Validation result with error messages if invalid
   */
  export const validatePassword = (password: string): PasswordValidationResult => {
    const errors: string[] = [];
    
    // Check minimum length (8 characters recommended, 6 is Firebase minimum)
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    // Check maximum length
    if (password.length > 100) {
      errors.push('Password must be less than 100 characters long');
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    // Check for number
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    // Check for special character
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };