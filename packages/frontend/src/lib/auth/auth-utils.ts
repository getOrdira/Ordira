// src/lib/auth/auth-utils.ts
import { User } from '@/types/auth';

/**
 * Token management utilities
 */
export const tokenUtils = {
  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  },

  /**
   * Store authentication tokens
   */
  setTokens(authToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', authToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  },

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  },

  /**
   * Check if token exists
   */
  hasToken(): boolean {
    return !!this.getToken();
  },

  /**
   * Decode JWT token payload (basic decode, not for security validation)
   */
  decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return true;

    try {
      const payload = this.decodeToken(tokenToCheck);
      if (!payload || !payload.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  },

  /**
   * Get token expiration time
   */
  getTokenExpiration(token?: string): Date | null {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return null;

    try {
      const payload = this.decodeToken(tokenToCheck);
      if (!payload || !payload.exp) return null;

      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  },
};

/**
 * User role and permission utilities
 */
export const roleUtils = {
  /**
   * Check if user has specific role
   */
  hasRole(user: User | null, role: string): boolean {
    if (!user) return false;
    return user.occupation === role;
  },

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: User | null, roles: string[]): boolean {
    if (!user) return false;
    return roles.includes(user.occupation);
  },

  /**
   * Check if user has specific permission
   */
  hasPermission(user: User | null, permission: string): boolean {
    if (!user) return false;
    const userPermissions = (user as any).permissions || [];
    return userPermissions.includes(permission) || userPermissions.includes('*');
  },

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(user: User | null, permissions: string[]): boolean {
    if (!user) return false;
    const userPermissions = (user as any).permissions || [];
    return permissions.every(
      permission => userPermissions.includes(permission) || userPermissions.includes('*')
    );
  },

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(user: User | null, permissions: string[]): boolean {
    if (!user) return false;
    const userPermissions = (user as any).permissions || [];
    return permissions.some(
      permission => userPermissions.includes(permission) || userPermissions.includes('*')
    );
  },

  /**
   * Get user role display name
   */
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      'Brand': 'Brand Owner',
      'Creator': 'Content Creator',
      'Manufacturer': 'Manufacturer',
    };
    return roleNames[role] || role;
  },

  /**
   * Check if user is brand owner
   */
  isBrand(user: User | null): boolean {
    return this.hasRole(user, 'Brand');
  },

  /**
   * Check if user is manufacturer
   */
  isManufacturer(user: User | null): boolean {
    return this.hasRole(user, 'Manufacturer');
  },

  /**
   * Check if user is creator
   */
  isCreator(user: User | null): boolean {
    return this.hasRole(user, 'Creator');
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
 * Route protection utilities
 */
export const routeProtection = {
  /**
   * Get redirect path for user type
   */
  getDefaultRedirectPath(user: User | null): string {
    if (!user) return '/auth/login';
    
    switch (user.occupation) {
      case 'Brand':
        return '/dashboard';
      case 'Manufacturer':
        return '/manufacturer/dashboard';
      case 'Creator':
        return '/creator/dashboard';
      default:
        return '/dashboard';
    }
  },

  /**
   * Check if route is accessible for user
   */
  canAccessRoute(user: User | null, route: string): boolean {
    if (!user) return false;

    // Public routes that all authenticated users can access
    const publicRoutes = ['/dashboard', '/profile', '/settings'];
    if (publicRoutes.some(publicRoute => route.startsWith(publicRoute))) {
      return true;
    }

    // Brand-only routes
    const brandRoutes = ['/voting', '/certificates', '/products', '/domains', '/integrations'];
    if (brandRoutes.some(brandRoute => route.startsWith(brandRoute))) {
      return roleUtils.isBrand(user);
    }

    // Manufacturer-only routes
    const manufacturerRoutes = ['/manufacturer', '/orders', '/production'];
    if (manufacturerRoutes.some(mfgRoute => route.startsWith(mfgRoute))) {
      return roleUtils.isManufacturer(user);
    }

    // Default to allowing access
    return true;
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
    const expiration = tokenUtils.getTokenExpiration(token);
    if (!expiration) return 0;
    
    return Math.max(0, expiration.getTime() - Date.now());
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
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    if (timeUntilExpiry <= 0) return 'Expired';
    
    const minutes = Math.floor(timeUntilExpiry / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    
    return `${minutes}m`;
  },
};

/**
 * Error handling utilities
 */
export const authErrorUtils = {
  /**
   * Check if error is authentication related
   */
  isAuthError(error: any): boolean {
    return error?.response?.status === 401 || 
           error?.code === 'INVALID_TOKEN' ||
           error?.code === 'TOKEN_EXPIRED';
  },

  /**
   * Check if error is authorization related
   */
  isAuthorizationError(error: any): boolean {
    return error?.response?.status === 403 ||
           error?.code === 'INSUFFICIENT_PERMISSIONS';
  },

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: any): string {
    if (this.isAuthError(error)) {
      return 'Your session has expired. Please log in again.';
    }
    
    if (this.isAuthorizationError(error)) {
      return 'You do not have permission to access this resource.';
    }
    
    return error?.response?.data?.message || 
           error?.message || 
           'An unexpected error occurred. Please try again.';
  },
};