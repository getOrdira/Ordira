/**
 * Authentication Service Aggregator
 *
 * Unified interface for all authentication operations across the application.
 * This service consolidates business, user, and manufacturer authentication
 * while providing backward compatibility with the original monolithic service.
 */

import { logger } from '../../utils/logger';

// Import all modular services
import { businessAuthService } from './business/businessAuth.service';
import { userAuthService } from './user/userAuth.service';
import { manufacturerAuthService } from './manufacturer/manufacturerAuth.service';
import { passwordResetService } from './shared/passwordReset.service';
import { authHelpersService } from './shared/authHelpers.service';
import { authAnalyticsService } from './shared/authAnalytics.service';
import { securityEventsService } from './security/securityEvents.service';
import { authCacheService } from './base/authCache.service';

// Import types
import {
  RegisterBusinessInput,
  VerifyBusinessInput,
  LoginBusinessInput,
  BusinessAuthResponse,
  BusinessVerificationResponse,
  RegisterUserInput,
  VerifyUserInput,
  LoginUserInput,
  UserAuthResponse,
  UserVerificationResponse,
  RegisterManufacturerInput,
  VerifyManufacturerInput,
  LoginManufacturerInput,
  ManufacturerAuthResponse,
  ManufacturerVerificationResponse,
  PasswordResetInput,
  PasswordResetConfirmInput,
  RegistrationResponse,
  AuthAnalytics,
  SecurityContext
} from './types/authTypes.service';

export class AuthService {

  // ===== BUSINESS AUTHENTICATION =====

  /**
   * Register a new business account
   */
  async registerBusiness(input: RegisterBusinessInput): Promise<RegistrationResponse> {
    try {
      return await businessAuthService.registerBusiness(input);
    } catch (error) {
      logger.error('Business registration failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Verify business email with verification code
   */
  async verifyBusiness(input: VerifyBusinessInput & { securityContext?: SecurityContext }): Promise<BusinessVerificationResponse> {
    try {
      return await businessAuthService.verifyBusiness(input);
    } catch (error) {
      logger.error('Business verification failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Authenticate business user and generate tokens
   */
  async loginBusiness(input: LoginBusinessInput): Promise<BusinessAuthResponse> {
    try {
      return await businessAuthService.loginBusiness(input);
    } catch (error) {
      logger.error('Business login failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Resend business email verification code
   */
  async resendBusinessVerification(businessId: string): Promise<void> {
    try {
      return await businessAuthService.resendBusinessVerification(businessId);
    } catch (error) {
      logger.error('Resend business verification failed in aggregator', { error });
      throw error;
    }
  }

  // ===== USER AUTHENTICATION =====

  /**
   * Register a new user account
   */
  async registerUser(input: RegisterUserInput): Promise<RegistrationResponse> {
    try {
      return await userAuthService.registerUser(input);
    } catch (error) {
      logger.error('User registration failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Verify user email with verification code
   */
  async verifyUser(input: VerifyUserInput & { securityContext?: SecurityContext }): Promise<UserVerificationResponse> {
    try {
      return await userAuthService.verifyUser(input);
    } catch (error) {
      logger.error('User verification failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Authenticate user and generate tokens
   */
  async loginUser(input: LoginUserInput): Promise<UserAuthResponse> {
    try {
      return await userAuthService.loginUser(input);
    } catch (error) {
      logger.error('User login failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Resend user email verification code
   */
  async resendUserVerification(email: string): Promise<void> {
    try {
      return await userAuthService.resendUserVerification(email);
    } catch (error) {
      logger.error('Resend user verification failed in aggregator', { error });
      throw error;
    }
  }

  // ===== MANUFACTURER AUTHENTICATION =====

  /**
   * Register a new manufacturer account
   */
  async registerManufacturer(input: RegisterManufacturerInput): Promise<RegistrationResponse> {
    try {
      return await manufacturerAuthService.registerManufacturer(input);
    } catch (error) {
      logger.error('Manufacturer registration failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Verify manufacturer email with verification code
   */
  async verifyManufacturer(input: VerifyManufacturerInput & { securityContext?: SecurityContext }): Promise<ManufacturerVerificationResponse> {
    try {
      return await manufacturerAuthService.verifyManufacturer(input);
    } catch (error) {
      logger.error('Manufacturer verification failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Authenticate manufacturer and generate tokens
   */
  async loginManufacturer(input: LoginManufacturerInput): Promise<ManufacturerAuthResponse> {
    try {
      return await manufacturerAuthService.loginManufacturer(input);
    } catch (error) {
      logger.error('Manufacturer login failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Resend manufacturer email verification code
   */
  async resendManufacturerVerification(manufacturerId: string): Promise<void> {
    try {
      return await manufacturerAuthService.resendManufacturerVerification(manufacturerId);
    } catch (error) {
      logger.error('Resend manufacturer verification failed in aggregator', { error });
      throw error;
    }
  }

  // ===== MANUFACTURER SPECIFIC FEATURES =====

  /**
   * Search manufacturers with filtering and pagination
   */
  async searchManufacturers(options: {
    query?: string;
    industry?: string;
    location?: string;
    services?: string[];
    minOrderQuantity?: number;
    maxOrderQuantity?: number;
    page?: number;
    limit?: number;
    sortBy?: 'relevance' | 'rating' | 'experience' | 'location';
    useCache?: boolean;
  } = {}) {
    try {
      return await manufacturerAuthService.searchManufacturers(options);
    } catch (error) {
      logger.error('Manufacturer search failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Get manufacturer analytics and insights
   */
  async getManufacturerAnalytics(manufacturerId: string, options: {
    includePerformance?: boolean;
    includeEngagement?: boolean;
    days?: number;
    useCache?: boolean;
  } = {}) {
    try {
      return await manufacturerAuthService.getManufacturerAnalytics(manufacturerId);
    } catch (error) {
      logger.error('Manufacturer analytics failed in aggregator', { error });
      throw error;
    }
  }

  // ===== PASSWORD RESET =====

  /**
   * Initiate password reset for any account type
   */
  async initiatePasswordReset(input: PasswordResetInput): Promise<void> {
    try {
      return await passwordResetService.initiatePasswordReset(input);
    } catch (error) {
      logger.error('Password reset initiation failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Confirm password reset with token and new password
   */
  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
    try {
      return await passwordResetService.confirmPasswordReset(input);
    } catch (error) {
      logger.error('Password reset confirmation failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Alias for initiatePasswordReset (backward compatibility)
   */
  async requestPasswordReset(input: PasswordResetInput): Promise<void> {
    return await this.initiatePasswordReset(input);
  }

  /**
   * Alias for confirmPasswordReset (backward compatibility)
   */
  async resetPassword(input: PasswordResetConfirmInput): Promise<void> {
    return await this.confirmPasswordReset(input);
  }

  // ===== TOKEN VALIDATION =====

  /**
   * Verify JWT token and optionally include user data
   */
  async verifyToken(token: string, options: {
    useCache?: boolean;
    includeUserData?: boolean;
  } = {}): Promise<{
    sub: string;
    type?: string;
    email?: string;
    userData?: any;
  }> {
    try {
      // Use the base service's token verification
      return await authHelpersService.verifyToken(token, options);
    } catch (error) {
      logger.error('Token verification failed in aggregator', { error });
      throw error;
    }
  }

  // ===== ACCOUNT LOOKUP =====

  /**
   * Get account by ID with caching support
   */
  async getOptimizedAccountById(
    userId: string,
    options: {
      useCache?: boolean;
      includePassword?: boolean;
      accountType?: 'user' | 'business' | 'manufacturer' | 'both';
    } = {}
  ): Promise<any> {
    try {
      return await authCacheService.getOptimizedAccountById(userId, options);
    } catch (error) {
      logger.error('Account lookup by ID failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Get account by email with caching support
   */
  async getOptimizedAccountByEmail(
    email: string,
    options: {
      useCache?: boolean;
      includePassword?: boolean;
      normalizeEmail?: boolean;
    } = {}
  ): Promise<any> {
    try {
      return await authCacheService.getOptimizedAccountByEmail(email, options);
    } catch (error) {
      logger.error('Account lookup by email failed in aggregator', { error });
      throw error;
    }
  }

  // ===== ANALYTICS =====

  /**
   * Get comprehensive authentication analytics
   */
  async getAuthAnalytics(options: {
    days?: number;
    includePerformance?: boolean;
    useCache?: boolean;
  } = {}): Promise<AuthAnalytics> {
    try {
      return await authAnalyticsService.getAuthAnalytics(options);
    } catch (error) {
      logger.error('Auth analytics failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Get analytics for specific account type
   */
  async getAccountTypeAnalytics(
    accountType: 'user' | 'business' | 'manufacturer',
    options: { days?: number; useCache?: boolean } = {}
  ) {
    try {
      return await authAnalyticsService.getAccountTypeAnalytics(accountType, options);
    } catch (error) {
      logger.error('Account type analytics failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Generate authentication report
   */
  async generateAuthReport(options: {
    startDate: Date;
    endDate: Date;
    includeDetails?: boolean;
    accountType?: 'user' | 'business' | 'manufacturer';
  }) {
    try {
      return await authAnalyticsService.generateAuthReport(options);
    } catch (error) {
      logger.error('Auth report generation failed in aggregator', { error });
      throw error;
    }
  }

  // ===== SECURITY EVENTS =====

  /**
   * Log a security event
   */
  async logSecurityEvent(
    eventType: string,
    identifier: string,
    success: boolean,
    metadata: any = {}
  ): Promise<void> {
    try {
      return await securityEventsService.logSecurityEvent(eventType, identifier, success, metadata);
    } catch (error) {
      logger.error('Security event logging failed in aggregator', { error });
      // Don't throw for security logging failures
    }
  }

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(options: {
    page?: number;
    limit?: number;
    eventType?: string;
  }) {
    try {
      return await securityEventsService.getSecurityEvents({
        page: options.page || 1,
        limit: options.limit || 10,
        eventType: options.eventType
      });
    } catch (error) {
      logger.error('Security events retrieval failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(options: {
    days?: number;
    accountType?: string;
    eventType?: string;
  } = {}) {
    try {
      return await securityEventsService.getSecurityStats(options);
    } catch (error) {
      logger.error('Security stats failed in aggregator', { error });
      throw error;
    }
  }

  // ===== CACHE MANAGEMENT =====

  /**
   * Clear auth cache for specific user
   */
  async clearAuthCache(userId: string, accountType: 'user' | 'business' | 'manufacturer' = 'user'): Promise<void> {
    try {
      return await authCacheService.clearAuthCache(userId, accountType);
    } catch (error) {
      logger.error('Cache clearing failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Clear all authentication caches
   */
  async clearAllAuthCaches(): Promise<void> {
    try {
      return await authCacheService.clearAllAuthCaches();
    } catch (error) {
      logger.error('All cache clearing failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(options: {
    preloadUsers?: boolean;
    preloadBusinesses?: boolean;
    preloadManufacturers?: boolean;
    preloadAnalytics?: boolean;
  } = {}): Promise<void> {
    try {
      return await authCacheService.warmUpCache(options);
    } catch (error) {
      logger.error('Cache warm-up failed in aggregator', { error });
      throw error;
    }
  }

  // ===== HEALTH MONITORING =====

  /**
   * Get authentication service health status
   */
  async getAuthHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      cache: any;
      security: any;
      analytics: any;
    };
    performance: {
      averageAuthTime: number;
      cacheHitRate: number;
    };
    recommendations: string[];
  }> {
    try {
      const [cacheHealth, securityHealth, analyticsHealth] = await Promise.all([
        authCacheService.getCacheHealth().catch(() => ({ status: 'unhealthy', issues: ['Cache service unavailable'] })),
        securityEventsService.getSecurityHealth().catch(() => ({ status: 'unhealthy', recommendations: ['Security service unavailable'] })),
        authAnalyticsService.getAuthHealth().catch(() => ({ status: 'unhealthy', recommendations: ['Analytics service unavailable'] }))
      ]);

      // Determine overall health status
      const services = [cacheHealth.status, securityHealth.status, analyticsHealth.status];
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (services.includes('unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (services.includes('degraded')) {
        overallStatus = 'degraded';
      }

      const recommendations = [
        ...(cacheHealth.issues || []),
        ...(securityHealth.recommendations || []),
        ...((analyticsHealth as any).recommendations || [])
      ];

      return {
        status: overallStatus,
        services: {
          cache: cacheHealth,
          security: securityHealth,
          analytics: analyticsHealth
        },
        performance: {
          averageAuthTime: (analyticsHealth as any).averageAuthTime || 0,
          cacheHitRate: (cacheHealth as any).hitRate || 0
        },
        recommendations
      };

    } catch (error) {
      logger.error('Auth health check failed in aggregator', { error });
      return {
        status: 'unhealthy',
        services: {
          cache: { status: 'unhealthy' },
          security: { status: 'unhealthy' },
          analytics: { status: 'unhealthy' }
        },
        performance: {
          averageAuthTime: -1,
          cacheHitRate: 0
        },
        recommendations: ['Authentication service aggregator failed']
      };
    }
  }

  /**
   * Format authentication response
   */
  formatAuthResponse(result: any, securityContext?: SecurityContext): any {
    return authHelpersService.formatAuthResponse(result, securityContext);
  }
  getUserPermissions(account: any, accountType: string): string[] {
    return authHelpersService.getUserPermissions(account, accountType);
  }

  /**
   * Check if account has specific permission
   */
  hasPermission(account: any, accountType: string, permission: string): boolean {
    return authHelpersService.hasPermission(account, accountType, permission);
  }

  /**
   * Validate email format and domain
   */
  validateEmail(email: string): { valid: boolean; reason?: string } {
    return authHelpersService.validateEmail(email);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; reason?: string; score: number } {
    return authHelpersService.validatePasswordStrength(password);
  }

  /**
   * Extract security context from request
   */
  extractSecurityContext(req: any): SecurityContext {
    return authHelpersService.extractSecurityContext(req);
  }

  /**
   * Get client IP address from request
   */
  getClientIp(req: any): string {
    return authHelpersService.getClientIp(req);
  }

  // ===== BUSINESS-SPECIFIC METHODS =====

  /**
   * Get business by ID with caching
   */
  async getBusinessById(businessId: string, options: { useCache?: boolean } = {}): Promise<any> {
    try {
      return await businessAuthService.getBusinessById(businessId, options);
    } catch (error) {
      logger.error('Get business by ID failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Check business plan limits
   */
  async checkBusinessPlanLimits(businessId: string, action: string): Promise<boolean> {
    try {
      return await businessAuthService.checkBusinessPlanLimits(businessId, action);
    } catch (error) {
      logger.error('Business plan limits check failed in aggregator', { error });
      return false;
    }
  }

  // ===== USER-SPECIFIC METHODS =====

  /**
   * Get user by ID with caching
   */
  async getUserById(userId: string, options: { useCache?: boolean } = {}): Promise<any> {
    try {
      return await userAuthService.getUserById(userId, options);
    } catch (error) {
      logger.error('Get user by ID failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Check email gating access for business
   */
  async checkEmailGatingAccess(email: string, businessId: string): Promise<{
    allowed: boolean;
    reason?: string;
    details?: any;
  }> {
    try {
      return await userAuthService.checkEmailGatingAccess(email, businessId);
    } catch (error) {
      logger.error('Email gating access check failed in aggregator', { error });
      return { allowed: false, reason: 'Service unavailable' };
    }
  }

  // ===== MANUFACTURER-SPECIFIC METHODS =====

  /**
   * Get manufacturer by ID with caching
   */
  async getManufacturerById(manufacturerId: string, options: { useCache?: boolean } = {}): Promise<any> {
    try {
      return await manufacturerAuthService.getManufacturerById(manufacturerId, options);
    } catch (error) {
      logger.error('Get manufacturer by ID failed in aggregator', { error });
      throw error;
    }
  }

  /**
   * Calculate manufacturer profile score
   */
  calculateManufacturerProfileScore(manufacturer: any): number {
    return manufacturerAuthService.calculateProfileScore(manufacturer);
  }
}

// Export singleton instance for backward compatibility
export const authService = new AuthService();

// Export individual services for direct access if needed
export {
  businessAuthService,
  userAuthService,
  manufacturerAuthService,
  passwordResetService,
  authHelpersService,
  authAnalyticsService,
  securityEventsService,
  authCacheService
};

// Export all types for external use
export * from './types/authTypes.service';

// Default export for easy importing
export default authService;