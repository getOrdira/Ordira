/**
 * Authentication Helpers Service
 *
 * Provides shared utility functions and helpers used across all authentication services.
 * Includes caching, token utilities, permissions, and common authentication operations.
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import { logger } from '../../../utils/logger';
import { UtilsService } from '../../infrastructure/shared';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service';
import { Business } from '../../../models/core/business.model';
import { User } from '../../../models/core/user.model';
import { Manufacturer } from '../../../models/core/manufacturer.model';

// Import base service and types
import { AuthBaseService } from '../base/authBase.service';
import {
  AccountResolution,
  BusinessVerificationResponse,
  UserVerificationResponse,
  ManufacturerVerificationResponse,
  SecurityContext
} from '../types/authTypes.service';

export class AuthHelpersService extends AuthBaseService {

  // Cache TTL configuration
  protected readonly CACHE_TTL = {
    userLookup: 2 * 60 * 1000,        // 2 minutes for user/business lookups
    tokenValidation: 60 * 1000,       // 1 minute for token validation
    securityEvents: 5 * 60 * 1000,    // 5 minutes for security events
    sessionData: 10 * 60 * 1000,      // 10 minutes for session information
    authAnalytics: 15 * 60 * 1000,    // 15 minutes for analytics data
    emailVerification: 30 * 60 * 1000, // 30 minutes for email verification
    rateLimiting: 60 * 60 * 1000       // 1 hour for rate limiting
  };

  // ===== CACHING UTILITIES =====

  /**
   * Cache user data after successful login
   */
  async cacheUserAfterLogin(userId: string, userData: any): Promise<void> {
    try {
      await enhancedCacheService.cacheUser(userId, userData, {
        keyPrefix: 'ordira',
        ttl: this.CACHE_TTL.userLookup
      });
    } catch (error) {
      logger.warn('Failed to cache user data after login', { userId, error });
    }
  }

  /**
   * Cache manufacturer data after successful login
   */
  async cacheManufacturerAfterLogin(manufacturerId: string, manufacturerData: any): Promise<void> {
    try {
      await enhancedCacheService.cacheManufacturer(manufacturerId, manufacturerData, {
        keyPrefix: 'ordira',
        ttl: this.CACHE_TTL.userLookup
      });
    } catch (error) {
      logger.warn('Failed to cache manufacturer data after login', { manufacturerId, error });
    }
  }

  /**
   * Cache business data after successful login
   */
  async cacheBusinessAfterLogin(businessId: string, businessData: any): Promise<void> {
    try {
      await enhancedCacheService.cacheBusiness(businessId, businessData, {
        keyPrefix: 'ordira',
        ttl: this.CACHE_TTL.userLookup
      });
    } catch (error) {
      logger.warn('Failed to cache business data after login', { businessId, error });
    }
  }

  /**
   * Invalidate account-specific caches
   */
  async invalidateAccountCaches(accountType: 'user' | 'business' | 'manufacturer', accountId: string): Promise<void> {
    try {
      const tags = ['auth_analytics'];

      if (accountType === 'user') {
        tags.push(`user:${accountId}`, 'user_analytics');
      } else if (accountType === 'business') {
        tags.push(`business:${accountId}`, 'business_analytics');
      } else {
        tags.push(`manufacturer:${accountId}`, 'manufacturer_search', 'manufacturer_analytics');
      }

      await enhancedCacheService.invalidateByTags(tags);
    } catch (error) {
      logger.warn('Failed to invalidate account caches', { accountType, accountId, error });
    }
  }

  // ===== TOKEN UTILITIES =====

  /**
   * Hash token for caching (shorter hash for performance)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  /**
   * Hash string for general purposes
   */
  hashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Hash sensitive tokens for secure storage (full hash)
   */
  hashSensitiveToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }


  /**
   * Add token to blacklist
   */
  async blacklistToken(token: string, reason?: string): Promise<void> {
    try {
      const BlacklistedToken = mongoose.model('BlacklistedToken');
      await BlacklistedToken.create({
        token: this.hashToken(token),
        reason: reason || 'Manual blacklist',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    } catch (error) {
      logger.warn('Failed to blacklist token:', error);
    }
  }

  // ===== VERIFICATION RESPONSE GENERATORS =====

  /**
   * Generate business verification response
   */
  generateBusinessVerificationResponse(business: any): BusinessVerificationResponse {
    const businessId = business._id?.toString() || business.id;
    const token = this.generateJWTToken({
      sub: businessId,
      type: 'business',
      email: business.email
    });

    return {
      token,
      businessId,
      email: business.email,
      isEmailVerified: true
    };
  }

  /**
   * Generate user verification response
   */
  generateUserVerificationResponse(user: any): UserVerificationResponse {
    const userId = user._id?.toString() || user.id;
    const token = this.generateJWTToken({
      sub: userId,
      type: 'user',
      email: user.email
    });

    return {
      token,
      userId,
      email: user.email
    };
  }

  /**
   * Generate manufacturer verification response
   */
  generateManufacturerVerificationResponse(manufacturer: any): ManufacturerVerificationResponse {
    const manufacturerId = manufacturer._id?.toString() || manufacturer.id;
    const token = this.generateJWTToken({
      sub: manufacturerId,
      type: 'manufacturer',
      email: manufacturer.email
    });

    return {
      token,
      manufacturerId,
      email: manufacturer.email,
      isEmailVerified: true
    };
  }

  /**
   * Format authentication response
   */
  formatAuthResponse(result: any, securityContext?: SecurityContext): any {
    return {
      token: result.token,
      expiresIn: '7 days',
      user: {
        businessId: result.businessId,
        email: result.email,
        businessName: result.businessName,
        isEmailVerified: result.isEmailVerified,
        plan: result.plan || 'foundation',
        lastLoginAt: new Date()
      },
      security: {
        requiresTwoFactor: result.requiresTwoFactor || false,
        loginLocation: securityContext ? { ip: securityContext.ipAddress } : {}
      }
    };
  }

  // ===== PERMISSION UTILITIES =====

  /**
   * Get user permissions based on account type
   */
  getUserPermissions(account: any, accountType: string): string[] {
    const basePermissions = ['read:profile', 'update:profile'];

    if (accountType === 'business') {
      return [
        ...basePermissions,
        'read:business',
        'update:business',
        'create:certificates',
        'read:analytics',
        'manage:voting'
      ];
    }

    if (accountType === 'manufacturer') {
      return [
        ...basePermissions,
        'read:manufacturer',
        'update:manufacturer',
        'create:products',
        'manage:orders',
        'read:analytics'
      ];
    }

    // Default user permissions
    return [
      ...basePermissions,
      'participate:voting',
      'read:certificates'
    ];
  }

  /**
   * Check if account has specific permission
   */
  hasPermission(account: any, accountType: string, permission: string): boolean {
    const permissions = this.getUserPermissions(account, accountType);
    return permissions.includes(permission);
  }

  // ===== ACCOUNT RESOLUTION UTILITIES =====

  /**
   * Resolve account by email across all account types
   */
  async resolveAccountByEmail(email: string): Promise<AccountResolution | null> {
    const normalizedEmail = UtilsService.normalizeEmail(email);

    try {
      // Check User accounts first
      const user = await User.findOne({ email: normalizedEmail })
        .select('_id email isEmailVerified status preferences')
        .lean();

      if (user) {
        return { accountType: 'user', account: user, model: User };
      }

      // Check Business accounts
      const business = await Business.findOne({ email: normalizedEmail })
        .select('_id email isEmailVerified businessName plan tokenVersion')
        .lean();

      if (business) {
        return { accountType: 'business', account: business, model: Business };
      }

      // Check Manufacturer accounts
      const manufacturer = await Manufacturer.findOne({ email: normalizedEmail })
        .select('_id email isEmailVerified name industry')
        .lean();

      if (manufacturer) {
        return { accountType: 'manufacturer', account: manufacturer, model: Manufacturer };
      }

      return null;

    } catch (error) {
      logger.error('Failed to resolve account by email', {
        email: UtilsService.maskEmail(email),
        error
      });
      return null;
    }
  }

  /**
   * Optimized account lookup with caching
   */
  async getOptimizedAccountByEmail(
    email: string,
    options: {
      useCache?: boolean;
      includePassword?: boolean;
      normalizeEmail?: boolean;
    } = {}
  ): Promise<any> {
    const startTime = Date.now();
    const { useCache = true, includePassword = false, normalizeEmail = true } = options;

    try {
      if (!email?.trim()) {
        throw new Error('Email is required');
      }

      const normalizedEmail = normalizeEmail ? UtilsService.normalizeEmail(email) : email;

      // Try cache first for email lookups (only for non-password requests)
      if (useCache && !includePassword) {
        const cached = await enhancedCacheService.getCachedAnalytics('auth', {
          type: 'email-lookup',
          email: this.hashString(normalizedEmail)
        });
        if (cached) {
          logger.debug('Email lookup cache hit', {
            email: UtilsService.maskEmail(normalizedEmail),
            processingTime: Date.now() - startTime,
            cached: true
          });
          return cached;
        }
      }

      // Database lookup across all account types
      const accountResolution = await this.resolveAccountByEmail(normalizedEmail);

      if (!accountResolution) {
        const processingTime = Date.now() - startTime;
        logger.debug('Email lookup completed - not found', {
          email: UtilsService.maskEmail(normalizedEmail),
          processingTime
        });
        return null;
      }

      const { account, accountType } = accountResolution;
      const accountData = {
        ...account,
        accountType
      };

      // Cache the result for future lookups (only if not including password)
      if (useCache && !includePassword) {
        await enhancedCacheService.cacheAnalytics('auth', {
          type: 'email-lookup',
          email: this.hashString(normalizedEmail)
        }, accountData, {
          ttl: this.CACHE_TTL.userLookup
        });
      }

      const processingTime = Date.now() - startTime;
      logger.debug('Email lookup completed', {
        email: UtilsService.maskEmail(normalizedEmail),
        accountType: accountData.accountType,
        processingTime,
        cached: false
      });

      return accountData;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Email lookup failed', {
        email: UtilsService.maskEmail(email),
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  // ===== SECURITY UTILITIES =====

  /**
   * Log security events with proper masking
   */
  async logSecurityEvent(
    eventType: string,
    identifier: string,
    success: boolean,
    metadata: any = {}
  ): Promise<void> {
    try {
      // Log security event directly
      logger.info('Security event', {
        eventType,
        identifier: UtilsService.maskEmail(identifier),
        success,
        metadata,
        timestamp: new Date()
      });
    } catch (error) {
      logger.warn('Failed to log security event', { eventType, error });
    }
  }

  /**
   * Generate secure API key for services
   */
  generateApiKey(): string {
    return UtilsService.generateSecureToken(32);
  }

  /**
   * Get client IP address from request
   */
  getClientIp(req: any): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  /**
   * Extract security context from request
   */
  extractSecurityContext(req: any): SecurityContext {
    return {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      registrationSource: req.headers['x-registration-source'],
      timestamp: new Date()
    };
  }

  // ===== VALIDATION UTILITIES =====

  /**
   * Validate email format and domain
   */
  validateEmail(email: string): { valid: boolean; reason?: string } {
    if (!email || !UtilsService.isValidEmail(email)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    // Additional domain validation can be added here
    const domain = email.split('@')[1];
    const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];

    if (blockedDomains.includes(domain.toLowerCase())) {
      return { valid: false, reason: 'Temporary email addresses are not allowed' };
    }

    return { valid: true };
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; reason?: string; score: number } {
    let score = 0;
    const requirements = [];

    // Length check
    if (password.length >= 8) {
      score += 25;
    } else {
      requirements.push('at least 8 characters');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 25;
    } else {
      requirements.push('one uppercase letter');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 25;
    } else {
      requirements.push('one lowercase letter');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 25;
    } else {
      requirements.push('one number');
    }

    // Special character bonus
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 10;
    }

    // Length bonus
    if (password.length >= 12) {
      score += 10;
    }

    const valid = score >= 75;
    const reason = requirements.length > 0
      ? `Password must contain ${requirements.join(', ')}`
      : undefined;

    return { valid, reason, score: Math.min(score, 100) };
  }

  // ===== CACHE UTILITIES =====

  /**
   * Get cache TTL configuration
   */
  getCacheTTL(): typeof this.CACHE_TTL {
    return this.CACHE_TTL;
  }

  /**
   * Warm up cache for frequently accessed data
   */
  async warmUpCache(): Promise<void> {
    try {
      // Pre-cache frequently accessed analytics
      logger.info('Cache warm-up initiated');

      // This could include pre-loading common queries, analytics, etc.
      // Implementation depends on specific caching strategy

      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.warn('Cache warm-up failed', { error });
    }
  }

  /**
   * Clear all authentication-related caches
   */
  async clearAuthCaches(): Promise<void> {
    try {
      await enhancedCacheService.invalidateByTags([
        'auth_analytics',
        'user_analytics',
        'business_analytics',
        'manufacturer_analytics',
        'email_verification',
        'password_reset'
      ]);
      logger.info('All auth caches cleared');
    } catch (error) {
      logger.warn('Failed to clear auth caches', { error });
    }
  }
}

// Export singleton instance
export const authHelpersService = new AuthHelpersService();
