/**
 * Password Reset Service
 *
 * Handles password reset functionality for all user types (businesses, users, manufacturers).
 * Provides secure token-based password reset with proper validation and security logging.
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { UtilsService } from '../../infrastructure/shared';
import { notificationsService } from '../../notifications/notifications.service';
import { Business } from '../../../models/core/business.model';
import { User } from '../../../models/core/user.model';
import { Manufacturer } from '../../../models/core/manufacturer.model';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service';

// Import base service and types
import { AuthBaseService } from '../base/authBase.service';
import {
  PasswordResetInput,
  PasswordResetConfirmInput,
  SecurityContext,
  AccountResolution,
  AUTH_CONSTANTS
} from '../types/authTypes.service';

export class PasswordResetService extends AuthBaseService {
  private notificationsService = notificationsService;

  // Password reset token expiry (15 minutes)
  private readonly PASSWORD_RESET_TOKEN_EXPIRY = 15 * 60 * 1000;

  // ===== PASSWORD RESET INITIATION =====

  /**
   * Initiate password reset for any account type
   */
  async initiatePasswordReset(input: PasswordResetInput): Promise<void> {
    const email = input.email?.trim();
    if (!email) {
      return; // Silent fail to prevent user enumeration
    }

    const normalizedEmail = UtilsService.normalizeEmail(email);

    try {
      // Resolve account by email across all account types
      const accountResolution = await this.resolveAccountByEmail(normalizedEmail);

      if (!accountResolution) {
        // Log failed attempt but don't throw error (prevent user enumeration)
        await this.logSecurityEvent('PASSWORD_RESET_REQUEST', normalizedEmail, false, {
          reason: 'ACCOUNT_NOT_FOUND',
          securityContext: input.securityContext
        });
        return;
      }

      const { accountType, model, account } = accountResolution;

      // Generate secure reset token and code
      const resetToken = UtilsService.generateSecureToken(48);
      const hashedToken = this.hashSensitiveToken(resetToken);
      const resetCode = UtilsService.generateNumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);
      const expiresAt = new Date(Date.now() + this.PASSWORD_RESET_TOKEN_EXPIRY);

      // Prepare update object
      const update: any = {
        passwordResetToken: hashedToken,
        passwordResetCode: resetCode,
        passwordResetExpires: expiresAt,
        passwordResetAttempts: 0,
        lastPasswordResetAttempt: new Date()
      };

      // Update account with reset token
      await model.findByIdAndUpdate(account._id, update);

      // Send password reset email (async, don't block the flow)
      try {
        await this.notificationsService.sendPasswordResetLink(normalizedEmail, resetToken, '15 minutes');
      } catch (notificationError: any) {
        logger.warn('Failed to send password reset email', {
          email: UtilsService.maskEmail(normalizedEmail),
          accountType,
          error: notificationError?.message || notificationError
        });
      }

      // Invalidate relevant caches
      await this.invalidateAccountCaches(accountType, account._id.toString());

      // Log successful initiation
      await this.logSecurityEvent('PASSWORD_RESET_REQUEST', normalizedEmail, true, {
        accountType,
        securityContext: input.securityContext
      });

      logger.info('Password reset initiated successfully', {
        email: UtilsService.maskEmail(normalizedEmail),
        accountType
      });

    } catch (error: any) {
      logger.error('Failed to initiate password reset', {
        email: UtilsService.maskEmail(normalizedEmail),
        error: error?.message || error
      });

      // Log the error but still don't throw to prevent user enumeration
      await this.logSecurityEvent('PASSWORD_RESET_REQUEST', normalizedEmail, false, {
        reason: 'INTERNAL_ERROR',
        securityContext: input.securityContext
      });
    }
  }

  // ===== PASSWORD RESET CONFIRMATION =====

  /**
   * Confirm password reset with token and new password
   */
  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
    const { token, newPassword, confirmPassword, securityContext } = input;

    try {
      // Validate input
      this.validatePasswordResetInput(token, newPassword, confirmPassword);

      // Hash token and resolve account
      const hashedToken = this.hashSensitiveToken(token);
      const accountResolution = await this.resolveAccountByResetToken(hashedToken);

      if (!accountResolution) {
        await this.logSecurityEvent('PASSWORD_RESET_CONFIRM', 'unknown', false, {
          reason: 'INVALID_OR_EXPIRED_TOKEN',
          securityContext
        });
        throw { statusCode: 400, message: 'Invalid or expired reset token.' };
      }

      const { account, accountType, model } = accountResolution;

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

      // Prepare update object
      const update: any = {
        password: passwordHash,
        passwordResetToken: undefined,
        passwordResetCode: undefined,
        passwordResetExpires: undefined,
        passwordResetAttempts: 0,
        lastPasswordResetAttempt: undefined
      };

      // Add account-type specific updates
      if (accountType !== 'manufacturer') {
        update.lastPasswordChangeAt = new Date();
        update.tokenVersion = (account.tokenVersion || 0) + 1; // Invalidate existing tokens
      }

      // Update account with new password
      await model.findByIdAndUpdate(account._id, update, { new: false });

      // Invalidate all caches for this account
      await this.invalidateAccountCaches(accountType, account._id.toString());

      // Log successful password reset
      await this.logSecurityEvent('PASSWORD_RESET_CONFIRM', account.email, true, {
        accountType,
        securityContext
      });

      logger.info('Password reset completed successfully', {
        email: UtilsService.maskEmail(account.email),
        accountType,
        accountId: account._id.toString()
      });

    } catch (error: any) {
      logger.error('Password reset confirmation failed', {
        error: error?.message || error,
        hasToken: !!token
      });
      throw error;
    }
  }

  // ===== CONVENIENCE METHODS =====

  /**
   * Alias for initiatePasswordReset (for backward compatibility)
   */
  async requestPasswordReset(input: PasswordResetInput): Promise<void> {
    await this.initiatePasswordReset(input);
  }

  /**
   * Alias for confirmPasswordReset (for backward compatibility)
   */
  async resetPassword(input: PasswordResetConfirmInput): Promise<void> {
    await this.confirmPasswordReset(input);
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Resolve account by reset token across all account types
   */
  private async resolveAccountByResetToken(tokenHash: string): Promise<AccountResolution | null> {
    const now = new Date();

    try {
      // Check User accounts
      const user = await User.findOne({
        passwordResetToken: tokenHash,
        passwordResetExpires: { $gt: now }
      })
        .select('_id email tokenVersion')
        .lean();

      if (user) {
        return { accountType: 'user', account: user, model: User };
      }

      // Check Business accounts
      const business = await Business.findOne({
        passwordResetToken: tokenHash,
        passwordResetExpires: { $gt: now }
      })
        .select('_id email tokenVersion')
        .lean();

      if (business) {
        return { accountType: 'business', account: business, model: Business };
      }

      // Check Manufacturer accounts
      const manufacturer = await Manufacturer.findOne({
        passwordResetToken: tokenHash,
        passwordResetExpires: { $gt: now }
      })
        .select('_id email')
        .lean();

      if (manufacturer) {
        return { accountType: 'manufacturer', account: manufacturer, model: Manufacturer };
      }

      return null;

    } catch (error) {
      logger.error('Failed to resolve account by reset token', { error });
      return null;
    }
  }

  /**
   * Hash sensitive tokens for secure storage
   */
  hashSensitiveToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate password reset input parameters
   */
  private validatePasswordResetInput(token: string, newPassword: string, confirmPassword?: string): void {
    // Token validation
    if (!token?.trim()) {
      throw { statusCode: 400, message: 'Reset token is required.' };
    }

    // Password validation
    if (!newPassword || newPassword.length < AUTH_CONSTANTS.PASSWORD_MIN_LENGTH) {
      throw {
        statusCode: 400,
        message: `Password must be at least ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} characters long.`
      };
    }

    // Password confirmation validation (if provided)
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      throw { statusCode: 400, message: 'Passwords do not match.' };
    }

    // Additional password strength validation
    this.validatePasswordStrength(newPassword);
  }

  /**
   * Validate password strength requirements
   */
  private validatePasswordStrength(password: string): void {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      throw {
        statusCode: 400,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.'
      };
    }

    // Optional: Require special characters for enhanced security
    if (password.length >= 12 && !hasSpecialChar) {
      logger.warn('Password lacks special characters for enhanced security');
    }
  }

  /**
   * Invalidate account-specific caches
   */
  async invalidateAccountCaches(accountType: string, accountId: string): Promise<void> {
    try {
      const tags = [
        `${accountType}:${accountId}`,
        `${accountType}_analytics`,
        'auth_analytics',
        'password_reset'
      ];

      await enhancedCacheService.invalidateByTags(tags);
    } catch (error) {
      logger.warn('Failed to invalidate account caches', { accountType, accountId, error });
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if password reset is available for email
   */
  async isPasswordResetAvailable(email: string): Promise<{
    available: boolean;
    accountType?: string;
    lastAttempt?: Date;
  }> {
    try {
      const normalizedEmail = UtilsService.normalizeEmail(email);
      const accountResolution = await this.resolveAccountByEmail(normalizedEmail);

      if (!accountResolution) {
        return { available: false };
      }

      const { account, accountType } = accountResolution;

      return {
        available: true,
        accountType,
        lastAttempt: account.lastPasswordResetAttempt
      };

    } catch (error) {
      logger.warn('Failed to check password reset availability', { email: UtilsService.maskEmail(email), error });
      return { available: false };
    }
  }

  /**
   * Get password reset statistics
   */
  async getPasswordResetStats(options: {
    days?: number;
    accountType?: 'user' | 'business' | 'manufacturer';
  } = {}): Promise<{
    totalRequests: number;
    successfulResets: number;
    failedAttempts: number;
    averageTimeToReset: number;
  }> {
    try {
      const { days = 7, accountType } = options;
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

      // This would typically query security events or analytics
      // For now, return mock data structure
      return {
        totalRequests: 0,
        successfulResets: 0,
        failedAttempts: 0,
        averageTimeToReset: 0
      };

    } catch (error) {
      logger.error('Failed to get password reset statistics', { error });
      return {
        totalRequests: 0,
        successfulResets: 0,
        failedAttempts: 0,
        averageTimeToReset: 0
      };
    }
  }
}

// Export singleton instance
export const passwordResetService = new PasswordResetService();
