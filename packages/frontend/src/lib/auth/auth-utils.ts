// lib/auth/auth-utils.ts - NEW FILE
import { AnyUser } from '@/lib/types/user';

/**
 * Role-based utilities - Creators and Brands have SAME functionalities
 */
export const roleUtils = {
  /**
   * Check if user has specific role
   */
  hasRole(user: AnyUser | null, role: string): boolean {
    if (!user) return false;
    return user.role === role;
  },

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: AnyUser | null, roles: string[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  },

  /**
   * Check if user has permission
   */
  hasPermission(user: AnyUser | null, permission: string): boolean {
    if (!user) return false;
    const userPermissions = (user as any).permissions || [];
    return userPermissions.includes(permission) || userPermissions.includes('*');
  },

  /**
   * Get user role display name
   */
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      'brand': 'Brand Owner',
      'creator': 'Content Creator',
      'manufacturer': 'Manufacturer',
    };
    return roleNames[role] || role;
  },

  /**
   * Check if user is brand owner (INCLUDES Creators)
   */
  isBrand(user: AnyUser | null): boolean {
    return this.hasAnyRole(user, ['brand', 'creator']); // ✅ Creators included
  },

  /**
   * Check if user is manufacturer
   */
  isManufacturer(user: AnyUser | null): boolean {
    return this.hasRole(user, 'manufacturer');
  },

  /**
   * Check if user is creator
   */
  isCreator(user: AnyUser | null): boolean {
    return this.hasRole(user, 'creator');
  },

  /**
   * Check if user is brand-like (Brand OR Creator) - NEW helper
   */
  isBrandLike(user: AnyUser | null): boolean {
    return this.hasAnyRole(user, ['brand', 'creator']);
  },
};

/**
 * Route protection utilities - FIXED to treat Creators same as Brands
 */
export const routeProtection = {
  /**
   * Get redirect path for user type - FIXED: Creators go to same dashboard as Brands
   */
  getDefaultRedirectPath(user: AnyUser | null): string {
    if (!user) return '/auth/login';
    
    switch (user.role) {
      case 'brand':
      case 'creator': // ✅ Creators get same dashboard as brands
        return '/dashboard';
      case 'manufacturer':
        return '/manufacturer/dashboard';
      default:
        return '/dashboard';
    }
  },

  /**
   * Check if route is accessible for user - FIXED: Creators have same access as Brands
   */
  canAccessRoute(user: AnyUser | null, route: string): boolean {
    if (!user) return false;

    // Public routes that all authenticated users can access
    const publicRoutes = ['/dashboard', '/profile', '/settings'];
    if (publicRoutes.some(publicRoute => route.startsWith(publicRoute))) {
      return true;
    }

    // Brand-like routes (Brand AND Creator access)
    const brandRoutes = ['/voting', '/certificates', '/products', '/domains', '/integrations'];
    if (brandRoutes.some(brandRoute => route.startsWith(brandRoute))) {
      return roleUtils.isBrandLike(user); // ✅ Includes both Brand and Creator
    }

    // Manufacturer-only routes
    const manufacturerRoutes = ['/manufacturer', '/orders', '/production'];
    if (manufacturerRoutes.some(mfgRoute => route.startsWith(mfgRoute))) {
      return roleUtils.isManufacturer(user);
    }


    // Default to allowing access
    return true;
  },

  /**
   * Get user type for API calls - NEW helper
   */
  getUserType(user: AnyUser | null): 'brand' | 'manufacturer' | null {
    if (!user) return null;
    
    // Both Brand and Creator users use 'brand' API endpoints
    if (roleUtils.isBrandLike(user)) return 'brand';
    if (roleUtils.isManufacturer(user)) return 'manufacturer';
    
    return null;
  },

  /**
   * Get appropriate auth API methods based on user type
   */
  getAuthMethods(userType: 'brand' | 'creator' | 'manufacturer') {
    switch (userType) {
      case 'brand':
      case 'creator': // ✅ Both use business auth methods
        return {
          register: 'registerBusiness',
          login: 'loginBusiness', 
          verify: 'verifyBusiness'
        };
      case 'manufacturer':
        return {
          register: 'registerManufacturer',
          login: 'loginManufacturer',
          verify: 'verifyManufacturer'
        };
      default:
        return {
          register: 'registerUser',
          login: 'loginUser',
          verify: 'verifyUser'
        };
    }
  },
};

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