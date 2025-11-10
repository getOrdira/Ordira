// lib/auth/auth-utils.ts

export * from './policy/roles';
export * from './policy/routes';

/**
 * Authentication validation utilities
 */
export const authValidation = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   */
  isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate business email (no disposable emails)
   */
  isValidBusinessEmail(email: string): boolean {
    if (!this.isValidEmail(email)) return false;
    
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'temp-mail.org',
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    return !disposableDomains.includes(domain);
  },

  /**
   * Validate phone number format
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  },

  /**
   * Validate website URL
   */
  isValidWebsite(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  },
};

/**
 * Session management utilities
 */
export const sessionUtils = {
  /**
   * Calculate time until token expires
   */
  getTimeUntilExpiry(token?: string): number {
    if (!token) return 0;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiration = new Date(payload.exp * 1000);
      return Math.max(0, expiration.getTime() - Date.now());
    } catch {
      return 0;
    }
  },

  /**
   * Check if token will expire soon (within specified minutes)
   */
  willExpireSoon(token?: string, minutesThreshold: number = 5): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    return timeUntilExpiry > 0 && timeUntilExpiry < (minutesThreshold * 60 * 1000);
  },

  /**
   * Format time remaining until expiry
   */
  formatTimeUntilExpiry(token?: string): string {
    const timeUntil = this.getTimeUntilExpiry(token);
    if (timeUntil <= 0) return 'Expired';
    
    const minutes = Math.floor(timeUntil / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
    return 'Less than a minute remaining';
  },
};

/**
 * Type guards for authentication data - FIXED to handle Creator as Brand
 */
export const isRegisterBusinessData = (data: any): boolean => {
  return data && (data.businessName || data.businessAddress) && 
         (data.occupation === 'brand' || data.occupation === 'creator'); // ✅ Both use business registration
};

export const isRegisterManufacturerData = (data: any): boolean => {
  return data && data.industry && data.occupation === 'manufacturer';
};

export const isRegisterUserData = (data: any): boolean => {
  return data && data.email && !isRegisterBusinessData(data) && !isRegisterManufacturerData(data);
};