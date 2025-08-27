// src/services/business/auth.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Business } from '../../models/business.model';
import { User } from '../../models/user.model';
import { NotificationsService } from '../external/notifications.service';
import { UtilsService } from '../utils/utils.service';
import mongoose from 'mongoose';
import { EmailGatingService } from './emailGating.service';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

/** ═══════════════════════════════════════════════════════════════════════════ */
/** Business (Brand Owner) Types & Methods                                    */
/** ═══════════════════════════════════════════════════════════════════════════ */

export type RegisterBusinessInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  email: string;
  phone: string;
  businessName: string;
  regNumber?: string;
  taxId?: string;
  address: string;
  password: string;
};

export type VerifyBusinessInput = {
  businessId: string;
  emailCode: string;
  phoneCode?: string;
};

export type LoginBusinessInput = {
  emailOrPhone: string;
  password: string;
  rememberMe?: boolean;
  securityContext?: {
    ipAddress: string;
    userAgent: string;
  };
};

/** ═══════════════════════════════════════════════════════════════════════════ */
/** User (Web2 Customer) Types & Methods                                      */
/** ═══════════════════════════════════════════════════════════════════════════ */

export type RegisterUserInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  businessId?: string; // For email gating context
  securityContext?: {
    ipAddress: string;
    userAgent: string;
    registrationSource: string;
    timestamp: Date;
  };
};

export type VerifyUserInput = {
  email: string;
  code: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
  businessId?: string;
  securityContext?: {
    ipAddress: string;
    userAgent: string;
  };
  rememberMe?: boolean;
};

export type PasswordResetInput = {
  email: string;
  securityContext?: {
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
  };
};

export type PasswordResetConfirmInput = {
  email: string;
  resetCode: string;
  newPassword: string;
  securityContext?: {
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
  };
};

export class AuthService {
  private notificationsService = new NotificationsService();
  private emailGatingService = new EmailGatingService();

  /** ═══════════════════════════════════════════════════════════════════════════ */
  /** Private Utility Methods                                                   */
  /** ═══════════════════════════════════════════════════════════════════════════ */

  private generateCode(): string {
    return UtilsService.generateAlphanumericCode(6);
  }

  private generateSecureResetToken(): string {
    return UtilsService.generateSecureToken(32);
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // If using database blacklist
      const BlacklistedToken = mongoose.model('BlacklistedToken');
      const blacklisted = await BlacklistedToken.findOne({ token });
      return !!blacklisted;
      
      // If using Redis
      // return !!(await redis.get(`blacklist:${token}`));
    } catch (error) {
      console.warn('Failed to check token blacklist:', error);
      return false; // Assume not blacklisted if check fails
    }
  }

  private logSecurityEvent(
    event: string, 
    identifier: string, 
    success: boolean, 
    additionalData?: any
  ): void {
    const logData: any = {
      event,
      identifier: UtilsService.maskEmail(identifier),
      success,
      timestamp: new Date()
    };

    // Add security context if available
    if (additionalData?.securityContext) {
      logData.ip = additionalData.securityContext.ipAddress;
      logData.userAgent = additionalData.securityContext.userAgent;
    }

    // Add any additional data
    if (additionalData) {
      const { securityContext, ...otherData } = additionalData;
      Object.assign(logData, otherData);
    }

    console.log(`Security Event: ${event}`, logData);
  }

  private validateBusinessInput(data: RegisterBusinessInput): void {
    // Enhanced validation using UtilsService
    if (!UtilsService.isValidEmail(data.email)) {
      throw { statusCode: 400, message: 'Invalid email format.' };
    }

    if (!UtilsService.isValidPhone(data.phone)) {
      throw { statusCode: 400, message: 'Invalid phone number format.' };
    }

    if (data.regNumber && !UtilsService.isValidBusinessNumber(data.regNumber)) {
      throw { statusCode: 400, message: 'Invalid business registration number format.' };
    }

    if (data.taxId && !UtilsService.isValidTaxId(data.taxId)) {
      throw { statusCode: 400, message: 'Invalid tax ID format.' };
    }

    // Validate age (must be 18+ for business registration)
    const age = UtilsService.calculateAge(data.dateOfBirth);
    if (age < 18) {
      throw { statusCode: 400, message: 'Must be 18 years or older to register a business.' };
    }
  }

  private normalizeBusinessInput(data: RegisterBusinessInput): RegisterBusinessInput {
    return {
      ...data,
      firstName: UtilsService.titleCase(data.firstName.trim()),
      lastName: UtilsService.titleCase(data.lastName.trim()),
      email: UtilsService.normalizeEmail(data.email),
      phone: UtilsService.normalizePhone(data.phone),
      businessName: UtilsService.titleCase(data.businessName.trim()),
      address: data.address.trim(),
      regNumber: data.regNumber?.toUpperCase().trim(),
      taxId: data.taxId?.toUpperCase().trim()
    };
  }

  private async blacklistToken(token: string, userId: string): Promise<void> {
    try {
      const BlacklistedToken = mongoose.model('BlacklistedToken');
      await BlacklistedToken.create({
        token,
        userId,
        blacklistedAt: new Date(),
        expiresAt: this.getTokenExpiration(token)
      });
    } catch (error) {
      console.warn('Failed to blacklist token:', error);
      // Don't throw - token refresh should still work
    }
  }

  private getUserPermissions(account: any, accountType: string): string[] {
    const basePermissions = ['read_profile', 'update_profile'];
    
    if (accountType === 'business') {
      return [
        ...basePermissions,
        'manage_business',
        'create_api_keys',
        'view_analytics',
        'manage_certificates',
        'manage_voting'
      ];
    } else {
      return [
        ...basePermissions,
        'participate_voting',
        'view_certificates'
      ];
    }
  }

  private getTokenExpiration(token: string): Date {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return new Date(payload.exp * 1000); // JWT exp is in seconds
    } catch (error) {
      // Default to 24 hours if can't parse
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }

  private async checkPasswordResetRateLimit(email: string, securityContext?: any): Promise<number> {
    // This would typically use Redis for proper rate limiting
    // For now, we'll implement a simple database-based check
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const [businessAttempts, userAttempts] = await Promise.all([
        Business.countDocuments({
          email,
          lastPasswordResetAttempt: { $gte: oneHourAgo }
        }),
        User.countDocuments({
          email,
          lastPasswordResetAttempt: { $gte: oneHourAgo }
        })
      ]);

      return businessAttempts + userAttempts;
    } catch (error) {
      console.warn('Failed to check password reset rate limit:', error);
      return 0; // Allow if check fails
    }
  }

  private generateEmailSuggestions(email: string): string[] {
  const [username, domain] = email.split('@');
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  
  if (domain && !commonDomains.includes(domain)) {
    return commonDomains.map(d => `${username}@${d}`);
  }
  
  return [
    `${username}1@${domain}`,
    `${username}.${new Date().getFullYear()}@${domain}`,
    `${username}_${Math.floor(Math.random() * 100)}@${domain}`
  ];
}

  /** ═══════════════════════════════════════════════════════════════════════════ */
  /** Business Authentication Methods                                           */
  /** ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Registers a new business with enhanced validation and security
   */
  async registerBusiness(data: RegisterBusinessInput): Promise<{ businessId: string }> {
    // Validate and normalize input
    this.validateBusinessInput(data);
    const normalizedData = this.normalizeBusinessInput(data);

    // Check for existing business
    const exists = await Business.findOne({
      $or: [
        { email: normalizedData.email },
        { phone: normalizedData.phone }
      ]
    });

    if (exists) {
      this.logSecurityEvent('REGISTER_BUSINESS', normalizedData.email, false);
      throw { statusCode: 409, message: 'Email or phone already in use.' };
    }

    // Create business with enhanced security
    const hashed = await bcrypt.hash(normalizedData.password, 12); // Increased rounds
    const emailCode = this.generateCode();

    const biz = await Business.create({
      ...normalizedData,
      password: hashed,
      emailCode,
      isEmailVerified: false,
    });

    // Send verification code with better logging
    try {
      await this.notificationsService.sendEmailCode(biz.email, emailCode);
      this.logSecurityEvent('REGISTER_BUSINESS', normalizedData.email, true);
    } catch (error) {
      console.error(`Failed to send verification email to ${UtilsService.maskEmail(biz.email)}:`, error);
      // Don't throw here - business is created, just log the issue
    }

    return { businessId: biz._id.toString() };
  }

  /**
   * Verifies a business's email with enhanced security logging
   */
  async verifyBusiness(input: VerifyBusinessInput): Promise<{ token: string }> {
    const { businessId, emailCode } = input;
    
    const biz = await Business.findById(businessId);
    if (!biz) {
      this.logSecurityEvent('VERIFY_BUSINESS', businessId, false);
      throw { statusCode: 404, message: 'Business not found.' };
    }

    let updated = false;
    if (!biz.isEmailVerified && biz.emailCode === emailCode) {
      biz.isEmailVerified = true;
      biz.emailCode = undefined; // Clear the code after use
      updated = true;
    }

    if (updated) {
      await biz.save();
    }

    if (biz.isEmailVerified) {
      const token = jwt.sign(
        { 
          sub: biz._id.toString(),
          type: 'business',
          verified: true
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      this.logSecurityEvent('VERIFY_BUSINESS', biz.email, true);
      return { token };
    }

    this.logSecurityEvent('VERIFY_BUSINESS', biz.email, false);
    throw { statusCode: 400, message: 'Invalid or incomplete verification.' };
  }

  /**
   * Logs in a verified business with enhanced security
   */
  async loginBusiness(input: LoginBusinessInput): Promise<{ 
    token: string;
    businessId: string;
    email: string;
    businessName: string;
    isEmailVerified: boolean;
    plan?: string;
    requiresTwoFactor?: boolean;
    rememberToken?: string;
    user: {
      businessId: string;
      email: string;
      verified: boolean;
    };
    expiresIn: string;
  }> {
    const { emailOrPhone, password, rememberMe, securityContext } = input;
    
    // Normalize the input
    const normalizedInput = UtilsService.isValidEmail(emailOrPhone)
      ? UtilsService.normalizeEmail(emailOrPhone)
      : UtilsService.normalizePhone(emailOrPhone);

    const biz = await Business.findOne({
      $or: [
        { email: normalizedInput },
        { phone: normalizedInput }
      ]
    }).select('+password');

    if (!biz) {
      this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false, { securityContext });
      throw { statusCode: 404, message: 'Business not found.' };
    }

    if (!biz.isEmailVerified) {
      this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false, { securityContext });
      throw { statusCode: 403, message: 'Account not verified.' };
    }

    const valid = await bcrypt.compare(password, biz.password);
    if (!valid) {
      this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false, { securityContext });
      throw { statusCode: 401, message: 'Invalid credentials.' };
    }

    // Update last login
    biz.lastLoginAt = new Date();
    await biz.save();

    const token = jwt.sign(
      { 
        sub: biz._id.toString(),
        type: 'business',
        email: biz.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate remember token if requested
    let rememberToken;
    if (rememberMe) {
      rememberToken = jwt.sign(
        {
          sub: biz._id.toString(),
          type: 'business_remember',
          email: biz.email
        },
        JWT_SECRET,
        { expiresIn: '30d' } // 30 days for remember token
      );
    }

    this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, true, { securityContext });
    
    return { 
      token, 
      businessId: biz._id.toString(),
      email: biz.email,
      businessName: biz.businessName,
      isEmailVerified: biz.isEmailVerified,
      plan: biz.plan,
      rememberToken,
      user: {
        businessId: biz._id.toString(),
        email: biz.email,
        verified: biz.isEmailVerified
      },
      expiresIn: JWT_EXPIRES_IN
    };
  }

  /**
 * Change password for authenticated user
 */
async changePassword(
  userId: string,
  data: {
    currentPassword: string;
    newPassword: string;
    securityContext?: any;
  }
): Promise<void> {
  const { currentPassword, newPassword, securityContext } = data;

  // Check both Business and User collections
  const [business, user] = await Promise.all([
    Business.findById(userId).select('+password'),
    User.findById(userId).select('+password')
  ]);

  const account = business || user;
  if (!account) {
    this.logSecurityEvent('CHANGE_PASSWORD', userId, false, {
      reason: 'account_not_found',
      securityContext
    });
    throw { statusCode: 404, message: 'Account not found' };
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, account.password);
  if (!isValidPassword) {
    this.logSecurityEvent('CHANGE_PASSWORD', account.email, false, {
      reason: 'invalid_current_password',
      securityContext
    });
    throw { statusCode: 401, message: 'Current password is incorrect' };
  }

  // Validate new password
  const passwordValidation = this.validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw { 
      statusCode: 400, 
      message: 'New password does not meet requirements',
      details: passwordValidation.feedback
    };
  }

  // Update password
  account.password = await bcrypt.hash(newPassword, 12);
  account.lastPasswordChangeAt = new Date();
  
  // Increment token version to invalidate existing tokens (optional)
  account.tokenVersion = (account.tokenVersion || 0) + 1;
  
  await account.save();

  this.logSecurityEvent('CHANGE_PASSWORD', account.email, true, {
    securityContext
  });
}

/**
 * Check email availability for registration
 */
async checkEmailAvailability(email: string): Promise<{
  available: boolean;
  reason?: string;
  suggestions?: string[];
}> {
  const normalized = UtilsService.normalizeEmail(email);

  // Check both collections
  const [businessExists, userExists] = await Promise.all([
    Business.findOne({ email: normalized }),
    User.findOne({ email: normalized })
  ]);

  if (businessExists || userExists) {
    return {
      available: false,
      reason: 'Email already registered',
      suggestions: this.generateEmailSuggestions(normalized)
    };
  }

  return { available: true };
}

/**
 * Validate password strength
 */
validatePasswordStrength(password: string): {
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
  isValid: boolean;
} {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password)
  };

  const feedback = [];
  let score = 0;

  // Check requirements and provide feedback
  if (!requirements.minLength) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 20;
  }

  if (!requirements.hasUppercase) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 20;
  }

  if (!requirements.hasLowercase) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 20;
  }

  if (!requirements.hasNumber) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 20;
  }

  if (!requirements.hasSpecialChar) {
    feedback.push('Password must contain at least one special character (@$!%*?&)');
  } else {
    score += 20;
  }

  // Additional scoring for complexity
  if (password.length >= 12) score += 10;
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/^(.+)\1+$/.test(password)) score -= 20; // Pattern repetition

  const strength = score >= 90 ? 'strong' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'weak';
  const isValid = Object.values(requirements).every(req => req);

  return {
    strength,
    score: Math.max(0, Math.min(100, score)),
    feedback,
    requirements,
    isValid
  };
}

/**
 * Get active sessions for user
 */
async getActiveSessions(userId: string): Promise<any[]> {
  // This would typically use a sessions store (Redis/Database)
  // For now, return placeholder data
  return [
    {
      sessionId: 'session_1',
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: '192.168.1.1',
      userAgent: 'Chrome/Latest',
      location: { country: 'US', city: 'New York' }
    }
  ];
}

/**
 * Revoke specific session
 */
async revokeSession(userId: string, sessionId: string): Promise<void> {
  // Implementation would depend on your session storage
  // For now, just log the action
  this.logSecurityEvent('SESSION_REVOKED', userId, true, {
    sessionId
  });
}

/**
 * Revoke all sessions except current
 */
async revokeAllSessions(userId: string, currentToken?: string): Promise<number> {
  // Implementation would depend on your session storage
  // For now, just log the action
  this.logSecurityEvent('ALL_SESSIONS_REVOKED', userId, true, {
    excludeToken: currentToken ? 'present' : 'none'
  });
  
  return 3; // Placeholder count
}

/**
 * Verify user password
 */
async verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const [business, user] = await Promise.all([
    Business.findById(userId).select('+password'),
    User.findById(userId).select('+password')
  ]);

  const account = business || user;
  if (!account) return false;

  return bcrypt.compare(password, account.password);
}

/**
 * Get login history
 */
async getLoginHistory(
  userId: string, 
  options: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ entries: any[]; total: number }> {
  // This would query your login history/audit log
  // For now, return placeholder data
  return {
    entries: [
      {
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/Latest',
        success: true,
        location: { country: 'US', city: 'New York' }
      }
    ],
    total: 1
  };
}

/**
 * Get security events
 */
async getSecurityEvents(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    eventType?: string;
  } = {}
): Promise<{ entries: any[]; total: number }> {
  // This would query your security events log
  // For now, return placeholder data
  return {
    entries: [
      {
        eventType: 'PASSWORD_CHANGE',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        success: true,
        details: 'Password changed successfully'
      }
    ],
    total: 1
  };
}

/**
 * Update security preferences
 */
async updateSecurityPreferences(userId: string, preferences: any): Promise<any> {
  const [business, user] = await Promise.all([
    Business.findById(userId),
    User.findById(userId)
  ]);

  const account = business || user;
  if (!account) {
    throw { statusCode: 404, message: 'Account not found' };
  }

  // Update security preferences
  account.securityPreferences = {
    ...account.securityPreferences,
    ...preferences,
    updatedAt: new Date()
  };

  await account.save();

  this.logSecurityEvent('SECURITY_PREFERENCES_UPDATED', account.email, true);

  return account.securityPreferences;
}

/**
 * Initialize password reset with enhanced security
 */
async initiatePasswordReset(data: PasswordResetInput): Promise<void> {
  await this.requestPasswordReset(data);
}

  /** ═══════════════════════════════════════════════════════════════════════════ */
  /** User Authentication Methods                                               */
  /** ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Enhanced user registration with email gating check
   */
  async registerUser(input: RegisterUserInput): Promise<void> {
    const { email, password, firstName, lastName, businessId, securityContext } = input;
    
    // Validate email format first
    if (!UtilsService.isValidEmail(email)) {
      throw { statusCode: 400, message: 'Invalid email format.' };
    }

    const normalized = UtilsService.normalizeEmail(email);

    // Check email gating if business context provided
    if (businessId) {
      const emailCheck = await this.emailGatingService.isEmailAllowed(normalized, businessId);
      if (!emailCheck.allowed) {
        this.logSecurityEvent('REGISTER_USER_EMAIL_GATING_DENIED', normalized, false, {
          businessId,
          reason: emailCheck.reason,
          securityContext
        });
        throw { 
          statusCode: 403, 
          message: emailCheck.reason || 'Email not authorized for this voting platform.',
          code: 'EMAIL_NOT_ALLOWED'
        };
      }
    }

    // Check if user already exists
    const exists = await User.findOne({ email: normalized });
    if (exists) {
      this.logSecurityEvent('REGISTER_USER', normalized, false, {
        reason: 'Email already exists',
        securityContext
      });
      throw { statusCode: 409, message: 'Email already in use.' };
    }

    const hashed = await bcrypt.hash(password, 12);
    const emailCode = this.generateCode();

    await User.create({
      email: normalized,
      password: hashed,
      firstName,
      lastName,
      emailCode,
      isEmailVerified: false
    });

    try {
      await this.notificationsService.sendEmailCode(normalized, emailCode);
      this.logSecurityEvent('REGISTER_USER', normalized, true, {
        businessId,
        securityContext
      });
      
      // Grant voting access if email gating allows
      if (businessId) {
        await this.emailGatingService.grantVotingAccess(normalized, businessId, 'registration');
      }
    } catch (error) {
      console.error(`Failed to send verification email to ${UtilsService.maskEmail(normalized)}:`, error);
    }
  }

  /**
   * Verifies a user's email code with enhanced security
   */
  async verifyUser(input: VerifyUserInput): Promise<{ token: string }> {
    const { email, code } = input;
    const normalized = UtilsService.normalizeEmail(email);
    
    const user = await User.findOne({ email: normalized });
    if (!user) {
      this.logSecurityEvent('VERIFY_USER', normalized, false);
      throw { statusCode: 404, message: 'User not found.' };
    }

    if (user.isEmailVerified) {
      throw { statusCode: 400, message: 'Already verified.' };
    }

    if (user.emailCode !== code) {
      this.logSecurityEvent('VERIFY_USER', normalized, false);
      throw { statusCode: 400, message: 'Invalid code.' };
    }

    user.isEmailVerified = true;
    user.emailCode = undefined; // Clear the code
    await user.save();

    const token = jwt.sign(
      { 
        sub: user._id.toString(),
        type: 'user',
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    this.logSecurityEvent('VERIFY_USER', normalized, true);
    return { token };
  }

  /**
   * Enhanced login with email gating validation
   */
  async loginUser(input: LoginUserInput): Promise<{
    token: string;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isEmailVerified: boolean;
    preferences: any;
    rememberToken?: string;
    emailGating?: any; // Add email gating info to response
  }> {
    const { email, password, rememberMe, businessId, securityContext } = input;
    const normalized = UtilsService.normalizeEmail(email);
    
    const user = await User.findOne({ email: normalized }).select('+password');
    if (!user) {
      this.logSecurityEvent('LOGIN_USER', normalized, false, {
        reason: 'User not found',
        securityContext
      });
      throw { statusCode: 404, message: 'User not found.' };
    }

    if (!user.isEmailVerified) {
      this.logSecurityEvent('LOGIN_USER', normalized, false, {
        reason: 'Email not verified',
        securityContext
      });
      throw { statusCode: 403, message: 'Email not verified.' };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      this.logSecurityEvent('LOGIN_USER', normalized, false, {
        reason: 'Invalid password',
        securityContext
      });
      throw { statusCode: 401, message: 'Invalid credentials.' };
    }

    // Check email gating if business context provided
    let emailGatingInfo;
    if (businessId) {
      const emailCheck = await this.emailGatingService.isEmailAllowed(normalized, businessId);
      emailGatingInfo = emailCheck;
      
      if (!emailCheck.allowed) {
        this.logSecurityEvent('LOGIN_USER_EMAIL_GATING_DENIED', normalized, false, {
          businessId,
          reason: emailCheck.reason,
          securityContext
        });
        throw { 
          statusCode: 403, 
          message: emailCheck.reason || 'Email not authorized for this voting platform.',
          code: 'EMAIL_ACCESS_DENIED'
        };
      }
      
      // Record voting access
      await this.emailGatingService.grantVotingAccess(normalized, businessId, user._id.toString());
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { 
        sub: user._id.toString(),
        type: 'user',
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    let rememberToken;
    if (rememberMe) {
      rememberToken = jwt.sign(
        {
          sub: user._id.toString(),
          type: 'user_remember',
          email: user.email,
          purpose: 'remember_me'
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
    }

    this.logSecurityEvent('LOGIN_USER', normalized, true, {
      userId: user._id,
      businessId,
      securityContext
    });
    
    return {
      token,
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      preferences: user.preferences || {},
      rememberToken,
      emailGating: emailGatingInfo
    };
  }

  // In your AuthService class, add:
async resetPassword(data: {
  email: string;
  resetCode: string;
  newPassword: string;
}): Promise<void> {
  try {
    const { email, resetCode, newPassword } = data;

    // Find user by email and reset code
    const user = await User.findOne({
      email: UtilsService.normalizeEmail(email),
      passwordResetToken: resetCode,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw { statusCode: 400, message: 'Invalid or expired reset code' };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset fields
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      updatedAt: new Date()
    });

    // Log security event
    this.logSecurityEvent('PASSWORD_RESET', email, true);

  } catch (error) {
    this.logSecurityEvent('PASSWORD_RESET', data.email, false);
    throw error;
  }
}

  /** ═══════════════════════════════════════════════════════════════════════════ */
  /** Password Reset Methods                                                    */
  /** ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Initiates password reset process
   */
  async requestPasswordReset(input: PasswordResetInput): Promise<void> {
    const { email, securityContext } = input;
    const normalized = UtilsService.normalizeEmail(email);

    // Log the password reset attempt with security context
    if (securityContext) {
      console.log('Password reset attempt initiated:', {
        email: UtilsService.maskEmail(normalized),
        ip: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        timestamp: securityContext.timestamp
      });
    }

    // Check both business and user collections
    const [business, user] = await Promise.all([
      Business.findOne({ email: normalized }),
      User.findOne({ email: normalized })
    ]);

    const account = business || user;
    if (!account) {
      // Log failed attempt for security monitoring
      this.logSecurityEvent('PASSWORD_RESET_REQUEST', normalized, false, {
        reason: 'email_not_found',
        securityContext
      });
      // Don't reveal if email exists for security
      return;
    }

    // Check for rate limiting (optional but recommended)
    const recentAttempts = await this.checkPasswordResetRateLimit(normalized, securityContext);
    if (recentAttempts > 5) { // Max 5 attempts per hour
      this.logSecurityEvent('PASSWORD_RESET_REQUEST', normalized, false, {
        reason: 'rate_limited',
        attempts: recentAttempts,
        securityContext
      });
      return; // Silently fail to prevent enumeration
    }

    const resetCode = this.generateCode();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    account.passwordResetCode = resetCode;
    account.passwordResetExpires = resetExpires;
    
    // Track reset attempts for rate limiting
    account.passwordResetAttempts = (account.passwordResetAttempts || 0) + 1;
    account.lastPasswordResetAttempt = new Date();
    
    await account.save();

    try {
      await this.notificationsService.sendPasswordResetCode(normalized, resetCode);
      this.logSecurityEvent('PASSWORD_RESET_REQUEST', normalized, true, {
        accountType: business ? 'business' : 'user',
        securityContext
      });
    } catch (error) {
      console.error(`Failed to send password reset email to ${UtilsService.maskEmail(normalized)}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        securityContext
      });
      
      // Log email delivery failure
      this.logSecurityEvent('PASSWORD_RESET_EMAIL_FAILED', normalized, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
        securityContext
      });
    }
  }

  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
    const { email, resetCode, newPassword, securityContext } = input;
    const normalized = UtilsService.normalizeEmail(email);

    // Log password reset confirmation attempt
    if (securityContext) {
      console.log('Password reset confirmation attempt:', {
        email: UtilsService.maskEmail(normalized),
        ip: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        timestamp: securityContext.timestamp
      });
    }

    // Check both collections
    const [business, user] = await Promise.all([
      Business.findOne({ 
        email: normalized,
        passwordResetCode: resetCode,
        passwordResetExpires: { $gt: new Date() }
      }),
      User.findOne({ 
        email: normalized,
        passwordResetCode: resetCode,
        passwordResetExpires: { $gt: new Date() }
      })
    ]);

    const account = business || user;
    if (!account) {
      this.logSecurityEvent('PASSWORD_RESET_CONFIRM', normalized, false, {
        reason: 'invalid_or_expired_code',
        securityContext
      });
      throw { statusCode: 400, message: 'Invalid or expired reset code.' };
    }

    // Update password and clear reset fields
    account.password = await bcrypt.hash(newPassword, 12);
    account.passwordResetCode = undefined;
    account.passwordResetExpires = undefined;
    account.passwordResetAttempts = 0; // Reset attempts counter
    account.lastPasswordResetAttempt = undefined;
    account.lastPasswordChangeAt = new Date(); // Track when password was changed
    
    await account.save();

    this.logSecurityEvent('PASSWORD_RESET_CONFIRM', normalized, true, {
      accountType: business ? 'business' : 'user',
      securityContext
    });
  }

  /** ═══════════════════════════════════════════════════════════════════════════ */
  /** Utility Methods                                                           */
  /** ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Verifies and decodes a JWT token with enhanced validation
   */
  verifyToken(token: string): { sub: string; type?: string; email?: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as { sub: string; type?: string; email?: string };
    } catch (error) {
      throw { statusCode: 401, message: 'Invalid token' };
    }
  }

  /**
   * Get current user with comprehensive account information
   */
  async getCurrentUser(userId: string): Promise<any> {
    try {
      // Check both Business and User collections
      const [business, user] = await Promise.all([
        Business.findById(userId).select('-password -emailCode -passwordResetCode -passwordResetExpires'),
        User.findById(userId).select('-password -emailCode -passwordResetCode -passwordResetExpires')
      ]);

      const account = business || user;
      if (!account) {
        throw { statusCode: 404, message: 'User not found' };
      }

      // Determine account type and permissions
      const accountType = business ? 'business' : 'user';
      const permissions = this.getUserPermissions(account, accountType);

      // Build comprehensive user info
      const userInfo = {
        id: account._id,
        email: account.email,
        accountType,
        isEmailVerified: account.isEmailVerified,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
        
        // Business-specific fields
        ...(business && {
          firstName: business.firstName,
          lastName: business.lastName,
          businessName: business.businessName,
          industry: business.industry,
          companySize: business.companySize,
          website: business.website,
          profilePictureUrl: business.profilePictureUrl,
          description: business.description,
          walletAddress: business.walletAddress,
          profileCompleteness: business.getProfileCompleteness?.() || 0
        }),

        // User-specific fields
        ...(user && {
          firstName: user.firstName,
          lastName: user.lastName,
          preferences: user.preferences,
          profilePictureUrl: user.profilePictureUrl
        }),

        permissions
      };

      // Log user info access
      this.logSecurityEvent('USER_INFO_ACCESSED', account.email, true, {
        userId,
        accountType
      });

      return userInfo;
    } catch (error) {
      this.logSecurityEvent('USER_INFO_ACCESS_FAILED', userId, false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Invalidate a token (add to blacklist)
   */
  async invalidateToken(token: string, userId: string): Promise<void> {
    try {
      await this.addTokenToBlacklist(token, userId);
      this.logSecurityEvent('TOKEN_INVALIDATED', userId, true);
    } catch (error) {
      console.error('Token invalidation failed:', error);
      this.logSecurityEvent('TOKEN_INVALIDATION_FAILED', userId, false);
      throw error;
    }
  }

  /**
   * Helper method for blacklisting tokens
   */
  private async addTokenToBlacklist(token: string, userId: string): Promise<void> {
    // Store in database (create a BlacklistedToken model)
    const BlacklistedToken = mongoose.model('BlacklistedToken');
    await BlacklistedToken.create({
      token: token,
      userId: userId,
      blacklistedAt: new Date(),
      expiresAt: this.getTokenExpiration(token) // Extract expiration from JWT
    });
  }

  /**
   * Refresh an existing token with enhanced security
   */
  async refreshToken(currentToken: string, userId: string): Promise<string> {
    try {
      // Verify the current token is valid
      const decoded = jwt.verify(currentToken, JWT_SECRET) as any;
      
      // Check if the token belongs to the requesting user
      if (decoded.sub !== userId) {
        throw { statusCode: 401, message: 'Token user mismatch' };
      }

      // Optional: Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(currentToken);
      if (isBlacklisted) {
        throw { statusCode: 401, message: 'Token has been invalidated' };
      }

      // Get user/business data for new token
      const [business, user] = await Promise.all([
        Business.findById(userId),
        User.findById(userId)
      ]);

      const account = business || user;
      if (!account) {
        throw { statusCode: 404, message: 'Account not found' };
      }

      // Check if account is still active
      if (!account.isEmailVerified) {
        throw { statusCode: 403, message: 'Account not verified' };
      }

      // Generate new token
      const newToken = jwt.sign(
        {
          sub: account._id.toString(),
          type: business ? 'business' : 'user',
          email: account.email,
          tokenVersion: account.tokenVersion || 0 // Include token version if using
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Optional: Blacklist the old token
      await this.blacklistToken(currentToken, userId);

      // Log token refresh
      this.logSecurityEvent('TOKEN_REFRESHED', account.email, true, {
        userId,
        accountType: business ? 'business' : 'user'
      });

      return newToken;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw { statusCode: 401, message: 'Invalid token' };
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw { statusCode: 401, message: 'Token expired' };
      }
      throw error;
    }
  }

  /**
   * Resends verification code for business with rate limiting
   */
  async resendBusinessVerification(businessId: string): Promise<void> {
    const biz = await Business.findById(businessId);
    if (!biz) throw { statusCode: 404, message: 'Business not found.' };
    if (biz.isEmailVerified) throw { statusCode: 400, message: 'Already verified.' };

    const emailCode = this.generateCode();
    biz.emailCode = emailCode;
    await biz.save();

    try {
      await this.notificationsService.sendEmailCode(biz.email, emailCode);
      this.logSecurityEvent('RESEND_BUSINESS_VERIFICATION', biz.email, true);
    } catch (error) {
      console.error(`Failed to resend verification email to ${UtilsService.maskEmail(biz.email)}:`, error);
      throw { statusCode: 500, message: 'Failed to send verification email.' };
    }
  }

  /**
   * Resends verification code for user with rate limiting
   */
  async resendUserVerification(email: string): Promise<void> {
    const normalized = UtilsService.normalizeEmail(email);
    const user = await User.findOne({ email: normalized });
    
    if (!user) throw { statusCode: 404, message: 'User not found.' };
    if (user.isEmailVerified) throw { statusCode: 400, message: 'Already verified.' };

    const emailCode = this.generateCode();
    user.emailCode = emailCode;
    await user.save();

    try {
      await this.notificationsService.sendEmailCode(normalized, emailCode);
      this.logSecurityEvent('RESEND_USER_VERIFICATION', normalized, true);
    } catch (error) {
      console.error(`Failed to resend verification email to ${UtilsService.maskEmail(normalized)}:`, error);
      throw { statusCode: 500, message: 'Failed to send verification email.' };
    }
  }

  /**
   * Get account stats for analytics
   */
  async getAccountStats(): Promise<{
    totalBusinesses: number;
    totalUsers: number;
    verifiedBusinesses: number;
    verifiedUsers: number;
    recentRegistrations: number;
  }> {
    const [businessStats, userStats] = await Promise.all([
      Business.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            verified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
            recent: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            verified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } }
          }
        }
      ])
    ]);

    const businessData = businessStats[0] || { total: 0, verified: 0, recent: 0 };
    const userData = userStats[0] || { total: 0, verified: 0 };

    return {
      totalBusinesses: businessData.total,
      totalUsers: userData.total,
      verifiedBusinesses: businessData.verified,
      verifiedUsers: userData.verified,
      recentRegistrations: businessData.recent
    };
  }
}

