/**
 * Base Authentication Service
 *
 * Core authentication utilities and helper methods shared across all user types.
 * Includes JWT token management, password utilities, account resolution,
 * security context creation, and caching helpers.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { logger } from '../../../utils/logger';
import { UtilsService } from '../../utils/utils.service';
import { Business } from '../../../models/business.model';
import { User } from '../../../models/user.model';
import { Manufacturer } from '../../../models/manufacturer.model';
import { enhancedCacheService } from '../../external/enhanced-cache.service';

// Import types
import {
  SecurityContext,
  AccountResolution,
  TokenPayload,
  AuthOptions,
  CacheTTLConfig,
  BusinessVerificationResponse,
  UserVerificationResponse,
  ManufacturerVerificationResponse,
  AUTH_CONSTANTS
} from '../types/authTypes.service';

export class AuthBaseService {
  // JWT Configuration
  protected readonly JWT_SECRET = process.env.JWT_SECRET!;
  protected readonly JWT_EXPIRES_IN = AUTH_CONSTANTS.JWT_EXPIRES_IN;

  // Cache TTL configurations - aggressive for auth since it's called frequently
  protected readonly CACHE_TTL: CacheTTLConfig = {
    userLookup: 2 * 60 * 1000,        // 2 minutes for user/business lookups
    tokenValidation: 60 * 1000,       // 1 minute for token validation
    securityEvents: 5 * 60 * 1000,    // 5 minutes for security events
    sessionData: 10 * 60 * 1000,      // 10 minutes for session information
    authAnalytics: 5 * 60 * 1000,     // 5 minutes for auth analytics
    emailVerification: 30 * 1000,     // 30 seconds for email checks
    rateLimiting: 60 * 1000           // 1 minute for rate limit data
  };

  // ===== JWT TOKEN UTILITIES =====

  /**
   * Generate JWT token for authenticated user
   */
  generateJWTToken(payload: {
    sub: string;
    type: 'business' | 'user' | 'manufacturer';
    email: string;
  }): string {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
  }

  /**
   * Generate remember me token
   */
  generateRememberToken(payload: {
    sub: string;
    type: 'business_remember' | 'user_remember' | 'manufacturer_remember';
    email: string;
  }): string {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: AUTH_CONSTANTS.REMEMBER_TOKEN_EXPIRES_IN });
  }

  /**
   * Verify JWT token with comprehensive validation
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
    const startTime = Date.now();
    const { useCache = true, includeUserData = false } = options;

    try {
      if (!token?.trim()) {
        throw { statusCode: 401, message: 'Token is required' };
      }

      // Try cache first
      if (useCache) {
        const cached = await enhancedCacheService.getCachedAnalytics('auth', {
          type: 'token-verification',
          token: this.hashToken(token)  // Hash token for security
        });
        if (cached) {
          logger.debug('Token verification cache hit', {
            processingTime: Date.now() - startTime,
            cached: true
          });
          return cached;
        }
      }

      // Verify token with JWT
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;

      if (!decoded.sub) {
        throw { statusCode: 401, message: 'Invalid token format' };
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw { statusCode: 401, message: 'Token has been revoked' };
      }

      let result: any = {
        sub: decoded.sub,
        type: decoded.type,
        email: decoded.email
      };

      // Include user data if requested
      if (includeUserData) {
        const userData = await this.getOptimizedAccountById(decoded.sub, { useCache: true });
        result.userData = userData;
      }

      // Cache the verification result
      if (useCache) {
        await enhancedCacheService.cacheAnalytics('auth', {
          type: 'token-verification',
          token: this.hashToken(token)
        }, result, {
          keyPrefix: 'ordira',
          ttl: this.CACHE_TTL.tokenValidation
        });
      }

      const processingTime = Date.now() - startTime;
      logger.debug('Token verification completed', {
        userId: decoded.sub,
        tokenType: decoded.type,
        processingTime,
        cached: false
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Token verification failed - invalid token', { processingTime });
        throw { statusCode: 401, message: 'Invalid token' };
      }
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Token verification failed - expired token', { processingTime });
        throw { statusCode: 401, message: 'Token expired' };
      }

      logger.error('Token verification error', {
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // Quick implementation - in production use Redis or dedicated storage
      const BlacklistedToken = mongoose.model('BlacklistedToken');
      const blacklisted = await BlacklistedToken.findOne({ token }).lean();
      return !!blacklisted;
    } catch (error) {
      logger.warn('Failed to check token blacklist:', error);
      return false;
    }
  }

  // ===== ACCOUNT RESOLUTION UTILITIES =====

  /**
   * Resolve account by email across all user types
   */
  async resolveAccountByEmail(email: string): Promise<AccountResolution | null> {
    const user = await User.findOne({ email })
      .select('_id email tokenVersion')
      .lean();
    if (user) {
      return { accountType: 'user', account: user, model: User };
    }

    const business = await Business.findOne({ email })
      .select('_id email tokenVersion')
      .lean();
    if (business) {
      return { accountType: 'business', account: business, model: Business };
    }

    const manufacturer = await Manufacturer.findOne({ email })
      .select('_id email')
      .lean();
    if (manufacturer) {
      return { accountType: 'manufacturer', account: manufacturer, model: Manufacturer };
    }

    return null;
  }


  /**
   * Get optimized account by ID with caching
   */
  async getOptimizedAccountById(
    userId: string,
    options: AuthOptions = {}
  ): Promise<any> {
    const startTime = Date.now();
    const { useCache = true, includePassword = false, accountType = 'both' } = options;

    try {
      if (!userId?.trim()) {
        throw new Error('User ID is required');
      }

      // Try cache first (only for non-password requests)
      if (useCache && !includePassword) {
        const cached = await enhancedCacheService.getCachedUser(userId, {
          keyPrefix: 'ordira',
        });
        if (cached) {
          logger.debug('Account lookup cache hit', {
            userId,
            processingTime: Date.now() - startTime,
            cached: true
          });
          return cached;
        }
      }

      // Determine which collections to search
      const queries: Array<Promise<{ record: any; type: 'business' | 'user' | 'manufacturer' } | null>> = [];

      if (accountType === 'both' || accountType === 'business') {
        const businessSelect = includePassword
          ? '+password +emailCode +passwordResetCode +passwordResetExpires'
          : '-password -emailCode -passwordResetCode -passwordResetExpires';
        queries.push(
          Business.findById(userId)
            .select(businessSelect)
            .lean()
            .then(business => (business ? { record: business, type: 'business' } : null))
        );
      }

      if (accountType === 'both' || accountType === 'user') {
        const userSelect = includePassword
          ? '+password +emailCode +passwordResetCode +passwordResetExpires'
          : '-password -emailCode -passwordResetCode -passwordResetExpires';
        queries.push(
          User.findById(userId)
            .select(userSelect)
            .lean()
            .then(user => (user ? { record: user, type: 'user' } : null))
        );
      }

      if (accountType === 'both' || accountType === 'manufacturer') {
        const manufacturerSelect = includePassword
          ? '+password +emailCode +passwordResetCode +passwordResetExpires'
          : '-password -emailCode -passwordResetCode -passwordResetExpires';
        queries.push(
          Manufacturer.findById(userId)
            .select(manufacturerSelect)
            .lean()
            .then(manufacturer => (manufacturer ? { record: manufacturer, type: 'manufacturer' } : null))
        );
      }

      // Execute queries in parallel
      const results = await Promise.all(queries);
      const match = results.find(result => result !== null);

      if (!match) {
        const processingTime = Date.now() - startTime;
        logger.debug('Account not found', { userId, processingTime });
        return null;
      }

      const { record: account, type: resolvedType } = match;
      const accountId = typeof account?._id?.toString === 'function' ? account._id.toString() : (account.id ?? userId);

      const accountData = {
        ...account,
        accountType: resolvedType,
        permissions: this.getUserPermissions(account, resolvedType),
        lastFetched: new Date()
      };

      // Cache non-password data
      if (useCache && !includePassword) {
        const cacheOptions = {
          keyPrefix: 'ordira',
          ttl: this.CACHE_TTL.userLookup
        };

        if (resolvedType === 'business') {
          await enhancedCacheService.cacheBusiness(accountId, accountData, cacheOptions);
        } else if (resolvedType === 'manufacturer') {
          await enhancedCacheService.cacheManufacturer(accountId, accountData, cacheOptions);
        } else {
          await enhancedCacheService.cacheUser(accountId, accountData, cacheOptions);
        }
      }

      const processingTime = Date.now() - startTime;
      logger.debug('Account lookup completed', {
        userId: accountId,
        accountType: accountData.accountType,
        processingTime,
        cached: false
      });

      return accountData;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get optimized account by ID', {
        userId,
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  // ===== RESPONSE GENERATION UTILITIES =====

  /**
   * Generate business verification response with token
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
   * Generate user verification response with token
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
   * Generate manufacturer verification response with token
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

  // ===== SECURITY UTILITIES =====

  /**
   * Create security context from request
   */
  createSecurityContext(req: any, additionalData: any = {}): SecurityContext {
    return {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date(),
      ...additionalData
    };
  }

  /**
   * Extract client IP address from request
   */
  getClientIp(req: any): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown'
    ).split(',')[0].trim();
  }

  /**
   * Get location from IP address (placeholder implementation)
   */
  async getLocationFromIp(ip: string): Promise<{ country?: string; city?: string }> {
    try {
      return {
        country: 'Unknown',
        city: 'Unknown'
      };
    } catch (error) {
      return {};
    }
  }

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
        'manage:products',
        'read:orders'
      ];
    }

    return [
      ...basePermissions,
      'participate:voting',
      'read:certificates'
    ];
  }

  // ===== FORMATTING UTILITIES =====

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
        loginLocation: securityContext ? this.getLocationFromIp(securityContext.ipAddress) : {}
      }
    };
  }

  // ===== CACHE MANAGEMENT =====

  /**
   * Invalidate account-specific caches
   */
  async invalidateAccountCaches(accountType: 'user' | 'business' | 'manufacturer', accountId: string): Promise<void> {
    const tags = ['auth_analytics'];

    if (accountType === 'user') {
      tags.push(`user:${accountId}`, 'user_analytics');
    } else if (accountType === 'business') {
      tags.push(`business:${accountId}`, 'business_analytics');
    } else {
      tags.push(`manufacturer:${accountId}`, 'manufacturer_search', 'manufacturer_analytics');
    }

    await enhancedCacheService.invalidateByTags(tags);
  }

  /**
   * Cache user data after login
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
   * Cache manufacturer data after login
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

  // ===== SECURITY EVENT LOGGING =====

  /**
   * Log security events for audit trail
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
      logger.warn('Failed to log security event', { eventType, identifier, error });
    }
  }

  // ===== HASH UTILITIES =====

  /**
   * Hash token for secure storage/caching
   */
  hashToken(token: string): string {
    return require('crypto').createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  /**
   * Hash string for general purposes
   */
  hashString(str: string): string {
    return require('crypto').createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Hash sensitive tokens (full hash)
   */
  hashSensitiveToken(token: string): string {
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate verification code
   */
  generateCode(): string {
    return UtilsService.generateAlphanumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);
  }

  /**
   * Generate secure reset token
   */
  generateSecureResetToken(): string {
    return UtilsService.generateSecureToken(32);
  }
}

// Export singleton instance
export const authBaseService = new AuthBaseService();


