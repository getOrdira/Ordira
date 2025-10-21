/**
 * Manufacturer Authentication Service
 *
 * Handles all authentication operations specific to manufacturer users including
 * registration, verification, login, and account management for manufacturer accounts.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../../../utils/logger';
import { UtilsService } from '../../utils/utils.service';
import { notificationsService } from '../../notifications/notifications.service';
import { Manufacturer } from '../../../models/manufacturer.model';
import { enhancedCacheService } from '../../external/enhanced-cache.service';

// Import base service and types
import { AuthBaseService } from '../base/authBase.service';
import {
  RegisterManufacturerInput,
  VerifyManufacturerInput,
  LoginManufacturerInput,
  ManufacturerAuthResponse,
  ManufacturerVerificationResponse,
  RegistrationResponse,
  SecurityContext,
  AUTH_CONSTANTS
} from '../types/authTypes.service';

export class ManufacturerAuthService extends AuthBaseService {
  private notificationsService = notificationsService;

  // ===== MANUFACTURER REGISTRATION =====

  /**
   * Register a new manufacturer account with comprehensive validation
   */
  async registerManufacturer(input: RegisterManufacturerInput): Promise<RegistrationResponse> {
    const startTime = Date.now();
    const {
      securityContext,
      location,
      minimumOrderQuantity,
      ...manufacturerData
    } = input;

    const normalizedEmail = UtilsService.normalizeEmail(manufacturerData.email);

    try {
      // Check for existing manufacturer
      const existingManufacturer = await Manufacturer.findOne({ email: normalizedEmail }).lean();
      if (existingManufacturer) {
        throw { statusCode: 409, message: 'Email is already registered for a manufacturer account.' };
      }

      // Hash password and generate verification code
      const passwordHash = await bcrypt.hash(manufacturerData.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
      const verificationCode = UtilsService.generateNumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);

      // Create manufacturer account with location data
      const manufacturer = new Manufacturer({
        ...manufacturerData,
        email: normalizedEmail,
        password: passwordHash,
        moq: minimumOrderQuantity,
        headquarters: {
          country: location?.country,
          city: location?.city,
          address: location?.address,
          coordinates: location?.coordinates ? {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude
          } : undefined
        },
        isActive: true,
        isEmailVerified: false,
        verificationToken: verificationCode
      });

      await manufacturer.save();

      // Invalidate manufacturer caches
      await enhancedCacheService.invalidateByTags([
        'manufacturer_search',
        'manufacturer_analytics'
      ]);

      // Send verification email (async, don't block registration)
      try {
        await this.notificationsService.sendEmailVerificationCode(normalizedEmail, verificationCode, '10 minutes');
      } catch (notificationError: any) {
        logger.warn('Failed to send manufacturer verification email', {
          email: UtilsService.maskEmail(normalizedEmail),
          error: notificationError?.message || notificationError
        });
      }

      // Send welcome email (async)
      this.notificationsService.sendWelcomeEmail(
        normalizedEmail,
        manufacturerData.name,
        '/manufacturer/login'
      ).catch(notificationError => {
        logger.warn('Failed to send manufacturer welcome email', {
          email: UtilsService.maskEmail(normalizedEmail),
          error: notificationError instanceof Error ? notificationError.message : notificationError
        });
      });

      // Log security event
      await this.logSecurityEvent('REGISTER_MANUFACTURER', normalizedEmail, true, {
        manufacturerId: manufacturer._id.toString(),
        securityContext
      });

      const processingTime = Date.now() - startTime;
      logger.info('Manufacturer registered successfully', {
        manufacturerId: manufacturer._id,
        processingTime
      });

      return {
        manufacturerId: manufacturer._id.toString(),
        email: normalizedEmail,
        verificationCode,
        verificationRequired: true
      };

    } catch (error: any) {
      // Log failed registration
      await this.logSecurityEvent('REGISTER_MANUFACTURER', normalizedEmail, false, {
        reason: error?.message || 'unknown_error',
        securityContext
      });

      logger.error('Manufacturer registration failed', {
        email: UtilsService.maskEmail(normalizedEmail),
        error: error?.message || error
      });

      throw error;
    }
  }

  // ===== MANUFACTURER VERIFICATION =====

  /**
   * Verify manufacturer email with verification code
   */
  async verifyManufacturer(input: VerifyManufacturerInput & { securityContext?: SecurityContext }): Promise<ManufacturerVerificationResponse> {
    const startTime = Date.now();
    const { email, verificationCode, securityContext } = input;
    const normalizedEmail = UtilsService.normalizeEmail(email);

    try {
      // Find manufacturer with verification code
      const manufacturer = await Manufacturer.findOne({
        email: normalizedEmail,
        verificationToken: verificationCode
      }).lean();

      if (!manufacturer) {
        await this.logSecurityEvent('VERIFY_MANUFACTURER', normalizedEmail, false, {
          reason: 'Invalid verification code',
          securityContext
        });
        throw { statusCode: 400, message: 'Invalid verification code.' };
      }

      // Check if already verified
      if (manufacturer.isEmailVerified) {
        return this.generateManufacturerVerificationResponse(manufacturer);
      }

      // Update manufacturer to verified status
      const updatedManufacturer = await Manufacturer.findByIdAndUpdate(
        manufacturer._id,
        {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          verificationToken: undefined,
          isActive: true
        },
        { new: true }
      ).lean();

      if (!updatedManufacturer) {
        throw { statusCode: 500, message: 'Failed to verify manufacturer account.' };
      }

      // Invalidate caches
      await enhancedCacheService.invalidateByTags([
        `manufacturer:${manufacturer._id.toString()}`,
        'manufacturer_analytics'
      ]);

      // Log successful verification
      await this.logSecurityEvent('VERIFY_MANUFACTURER', normalizedEmail, true, {
        manufacturerId: manufacturer._id.toString(),
        securityContext
      });

      const processingTime = Date.now() - startTime;
      logger.info('Manufacturer verified successfully', {
        manufacturerId: manufacturer._id,
        processingTime
      });

      return this.generateManufacturerVerificationResponse(updatedManufacturer);

    } catch (error: any) {
      await this.logSecurityEvent('VERIFY_MANUFACTURER', normalizedEmail, false, {
        reason: error?.message || 'unknown_error',
        securityContext
      });

      logger.error('Manufacturer verification failed', {
        email: UtilsService.maskEmail(normalizedEmail),
        error: error?.message || error
      });

      throw error;
    }
  }

  // ===== MANUFACTURER LOGIN =====

  /**
   * Authenticate manufacturer user and generate tokens
   */
  async loginManufacturer(input: LoginManufacturerInput & { securityContext?: SecurityContext }): Promise<ManufacturerAuthResponse> {
    const startTime = Date.now();
    const { email, password, rememberMe, securityContext } = input;
    const normalizedEmail = UtilsService.normalizeEmail(email);

    try {
      // Find manufacturer by email
      const manufacturer = await Manufacturer.findOne({ email: normalizedEmail })
        .select('+password')
        .lean();

      if (!manufacturer) {
        await this.logSecurityEvent('LOGIN_MANUFACTURER', normalizedEmail, false, {
          reason: 'Manufacturer not found',
          securityContext
        });
        throw { statusCode: 404, message: 'Invalid credentials.' };
      }

      // Check if email is verified
      if (!manufacturer.isEmailVerified) {
        await this.logSecurityEvent('LOGIN_MANUFACTURER', normalizedEmail, false, {
          reason: 'Email not verified',
          securityContext
        });
        throw { statusCode: 403, message: 'Email not verified.' };
      }

      // Check if account is active
      if (!manufacturer.isActive) {
        await this.logSecurityEvent('LOGIN_MANUFACTURER', normalizedEmail, false, {
          reason: 'Account deactivated',
          securityContext
        });
        throw { statusCode: 401, message: 'Account is deactivated.' };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, manufacturer.password);
      if (!passwordValid) {
        await this.logSecurityEvent('LOGIN_MANUFACTURER', normalizedEmail, false, {
          reason: 'Invalid password',
          securityContext
        });
        throw { statusCode: 401, message: 'Invalid credentials.' };
      }

      // Update last login and increment login count asynchronously
      Manufacturer.findByIdAndUpdate(manufacturer._id, {
        lastLoginAt: new Date(),
        $inc: { loginCount: 1 }
      }).exec().catch(error => {
        logger.warn('Failed to update manufacturer last login time', {
          manufacturerId: manufacturer._id,
          error
        });
      });

      // Generate access token
      const token = this.generateJWTToken({
        sub: manufacturer._id.toString(),
        type: 'manufacturer',
        email: manufacturer.email
      });

      // Generate remember token if requested
      let rememberToken;
      if (rememberMe) {
        rememberToken = this.generateRememberToken({
          sub: manufacturer._id.toString(),
          type: 'manufacturer_remember',
          email: manufacturer.email
        });
      }

      // Cache manufacturer data and log success asynchronously
      Promise.all([
        this.logSecurityEvent('LOGIN_MANUFACTURER', normalizedEmail, true, {
          manufacturerId: manufacturer._id,
          securityContext
        }),
        this.cacheManufacturerAfterLogin(manufacturer._id.toString(), {
          ...manufacturer,
          accountType: 'manufacturer',
          lastLoginAt: new Date()
        })
      ]).catch(error => {
        logger.warn('Post-login operations failed', { error });
      });

      const processingTime = Date.now() - startTime;
      logger.info('Manufacturer login completed successfully', {
        manufacturerId: manufacturer._id,
        processingTime,
        hasRememberToken: !!rememberToken
      });

      // Don't return password in response
      const { password: _, ...manufacturerResult } = manufacturer;

      return {
        token,
        manufacturerId: manufacturer._id.toString(),
        email: manufacturer.email,
        name: manufacturer.name,
        isEmailVerified: manufacturer.isEmailVerified,
        rememberToken,
        manufacturer: manufacturerResult
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Manufacturer login failed', {
        email: UtilsService.maskEmail(normalizedEmail),
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  // ===== VERIFICATION MANAGEMENT =====

  /**
   * Resend email verification code for manufacturer
   */
  async resendManufacturerVerification(manufacturerId: string): Promise<void> {
    try {
      // Find manufacturer account
      const manufacturer = await Manufacturer.findById(manufacturerId)
        .select('+verificationToken')
        .lean();

      if (!manufacturer) {
        throw { statusCode: 404, message: 'Manufacturer not found.' };
      }

      if (manufacturer.isEmailVerified) {
        throw { statusCode: 400, message: 'Manufacturer email is already verified.' };
      }

      // Generate new verification code
      const verificationCode = UtilsService.generateNumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);

      // Update manufacturer with new code
      await Manufacturer.findByIdAndUpdate(manufacturerId, {
        verificationToken: verificationCode,
        emailVerifiedAt: undefined
      });

      const normalizedEmail = UtilsService.normalizeEmail(manufacturer.email);

      // Send verification email
      try {
        await this.notificationsService.sendEmailVerificationCode(normalizedEmail, verificationCode, '10 minutes');
      } catch (notificationError: any) {
        logger.warn('Failed to resend manufacturer verification email', {
          email: UtilsService.maskEmail(normalizedEmail),
          error: notificationError?.message || notificationError
        });
      }

      // Log resend event
      await this.logSecurityEvent('RESEND_VERIFY_MANUFACTURER', normalizedEmail, true, {
        manufacturerId
      });

      logger.info('Manufacturer verification email resent', {
        manufacturerId,
        email: UtilsService.maskEmail(normalizedEmail)
      });

    } catch (error: any) {
      logger.error('Failed to resend manufacturer verification', {
        manufacturerId,
        error: error?.message || error
      });
      throw error;
    }
  }

  // ===== MANUFACTURER-SPECIFIC UTILITIES =====

  /**
   * Get manufacturer by ID with caching
   */
  async getManufacturerById(manufacturerId: string, options: { useCache?: boolean } = {}): Promise<any> {
    return this.getOptimizedAccountById(manufacturerId, {
      ...options,
      accountType: 'manufacturer'
    });
  }

  /**
   * Validate manufacturer-specific requirements
   */
  private validateManufacturerData(data: RegisterManufacturerInput): void {
    // Manufacturer name validation
    if (!data.name || data.name.trim().length < 2) {
      throw { statusCode: 400, message: 'Manufacturer name must be at least 2 characters long' };
    }

    // Industry validation (if provided)
    if (data.industry && data.industry.trim().length < 2) {
      throw { statusCode: 400, message: 'Industry must be at least 2 characters long' };
    }

    // MOQ validation (if provided)
    if (data.minimumOrderQuantity !== undefined && data.minimumOrderQuantity < 1) {
      throw { statusCode: 400, message: 'Minimum order quantity must be at least 1' };
    }

    // Services validation (if provided)
    if (data.servicesOffered && data.servicesOffered.length === 0) {
      throw { statusCode: 400, message: 'At least one service must be offered' };
    }

    // Contact email validation (if provided)
    if (data.contactEmail && !UtilsService.isValidEmail(data.contactEmail)) {
      throw { statusCode: 400, message: 'Contact email must be a valid email address' };
    }
  }

  /**
   * Calculate manufacturer profile completeness score
   */
  calculateProfileScore(manufacturer: any): number {
    let score = 0;

    // Basic information
    if (manufacturer.name) score += 10;
    if (manufacturer.description && manufacturer.description.length > 50) score += 15;
    if (manufacturer.industry) score += 10;
    if (manufacturer.contactEmail) score += 5;

    // Services and capabilities
    if (manufacturer.servicesOffered && manufacturer.servicesOffered.length > 0) score += 20;
    if (manufacturer.moq !== undefined) score += 10;

    // Location information
    if (manufacturer.headquarters?.country) score += 10;
    if (manufacturer.headquarters?.city) score += 5;
    if (manufacturer.headquarters?.address) score += 5;

    // Verification and credentials
    if (manufacturer.isEmailVerified) score += 5;
    if (manufacturer.website) score += 5;

    // Additional features (can be extended)
    if (manufacturer.certifications && manufacturer.certifications.length > 0) score += 10;

    return Math.min(score, 100); // Cap at 100%
  }

  /**
   * Update manufacturer profile with score recalculation
   */
  async updateManufacturerProfile(manufacturerId: string, updates: any): Promise<any> {
    try {
      // Get current manufacturer data
      const currentManufacturer = await this.getManufacturerById(manufacturerId, { useCache: false });
      if (!currentManufacturer) {
        throw { statusCode: 404, message: 'Manufacturer not found' };
      }

      // Calculate new profile score
      const updatedData = {
        ...updates,
        profileScore: this.calculateProfileScore({ ...currentManufacturer, ...updates }),
        updatedAt: new Date()
      };

      // Update manufacturer
      const manufacturer = await Manufacturer.findByIdAndUpdate(
        manufacturerId,
        { $set: updatedData },
        { new: true, runValidators: true }
      )
      .select('-password')
      .lean();

      if (!manufacturer) {
        throw { statusCode: 404, message: 'Manufacturer not found' };
      }

      // Invalidate caches
      await this.invalidateAccountCaches('manufacturer', manufacturerId);

      logger.info('Manufacturer profile updated successfully', {
        manufacturerId,
        newScore: updatedData.profileScore
      });

      return manufacturer;

    } catch (error: any) {
      logger.error('Failed to update manufacturer profile', {
        manufacturerId,
        error: error?.message || error
      });
      throw error;
    }
  }

  /**
   * Search manufacturers with filters
   */
  async searchManufacturers(filters: {
    industry?: string;
    location?: string;
    moq?: { min?: number; max?: number };
    services?: string[];
    verified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ manufacturers: any[]; total: number }> {
    try {
      const {
        industry,
        location,
        moq,
        services,
        verified = true,
        limit = 20,
        offset = 0
      } = filters;

      // Build query
      const query: any = {
        isActive: true
      };

      if (verified) {
        query.isEmailVerified = true;
      }

      if (industry) {
        query.industry = new RegExp(industry, 'i');
      }

      if (location) {
        query.$or = [
          { 'headquarters.country': new RegExp(location, 'i') },
          { 'headquarters.city': new RegExp(location, 'i') }
        ];
      }

      if (moq) {
        if (moq.min !== undefined) query.moq = { $gte: moq.min };
        if (moq.max !== undefined) query.moq = { ...query.moq, $lte: moq.max };
      }

      if (services && services.length > 0) {
        query.servicesOffered = { $in: services };
      }

      // Execute search with pagination
      const [manufacturers, total] = await Promise.all([
        Manufacturer.find(query)
          .select('name email industry description servicesOffered moq headquarters profileScore isVerified')
          .sort({ profileScore: -1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        Manufacturer.countDocuments(query)
      ]);

      return { manufacturers, total };

    } catch (error: any) {
      logger.error('Manufacturer search failed', {
        filters,
        error: error?.message || error
      });
      throw error;
    }
  }

  /**
   * Get manufacturer analytics
   */
  async getManufacturerAnalytics(manufacturerId: string): Promise<any> {
    try {
      const manufacturer = await this.getManufacturerById(manufacturerId, { useCache: true });

      if (!manufacturer) {
        throw { statusCode: 404, message: 'Manufacturer not found' };
      }

      // Basic analytics (can be extended with real data)
      return {
        profileViews: manufacturer.profileViews || 0,
        connectionRequests: manufacturer.connectionRequests || 0,
        activeConnections: manufacturer.activeConnections || 0,
        productInquiries: manufacturer.productInquiries || 0,
        profileCompleteness: manufacturer.profileScore || 0,
        industryRanking: manufacturer.industryRanking || 0,
        lastLoginAt: manufacturer.lastLoginAt,
        memberSince: manufacturer.createdAt
      };

    } catch (error: any) {
      logger.error('Failed to get manufacturer analytics', {
        manufacturerId,
        error: error?.message || error
      });
      throw error;
    }
  }
}

// Export singleton instance
export const manufacturerAuthService = new ManufacturerAuthService();