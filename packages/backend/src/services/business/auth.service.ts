// src/services/business/auth.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Business } from '../../models/business.model';
import { User } from '../../models/user.model';
import { NotificationsService } from '../external/notifications.service';
import { UtilsService } from '../utils/utils.service';
import mongoose from 'mongoose'

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

/** ─────────────────────────────────────────────────────────────────────────── */
/** Business (Brand Owner) Types & Methods                                    */
/** ─────────────────────────────────────────────────────────────────────────── */

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
};

/** ─────────────────────────────────────────────────────────────────────────── */
/** User (Web2 Customer) Types & Methods                                      */
/** ─────────────────────────────────────────────────────────────────────────── */

export type RegisterUserInput = {
  email: string;
  password: string;
};

export type VerifyUserInput = {
  email: string;
  code: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
};

export type PasswordResetInput = {
  email: string;
};

export type PasswordResetConfirmInput = {
  email: string;
  resetCode: string;
  newPassword: string;
};

export class AuthService {
  private notificationsService = new NotificationsService();

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Private Utility Methods                                                   */
  /** ─────────────────────────────────────────────────────────────────────────── */

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

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Business Authentication Methods                                           */
  /** ─────────────────────────────────────────────────────────────────────────── */

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
  async loginBusiness(input: LoginBusinessInput & { rememberMe?: boolean }): Promise<{ 
  token: string;
  businessId: string;
  email: string;
  businessName: string;
  isEmailVerified: boolean;
  plan?: string;
  requiresTwoFactor?: boolean;
  rememberToken?: string;
  emailOrPhone: string;
  user: {
    businessId: string;
    email: string;
    verified: boolean;
  };
  expiresIn: string;
}> {
  const { emailOrPhone, password, rememberMe } = input;
  
  // Normalize the input
  const normalizedInput = UtilsService.isValidEmail(emailOrPhone)
    ? UtilsService.normalizeEmail(emailOrPhone)
    : UtilsService.normalizePhone(emailOrPhone);

  const biz = await Business.findOne({
    $or: [
      { email: normalizedInput },
      { phone: normalizedInput }
    ]
  });

  if (!biz) {
    this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false);
    throw { statusCode: 404, message: 'Business not found.' };
  }

  if (!biz.isEmailVerified) {
    this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false);
    throw { statusCode: 403, message: 'Account not verified.' };
  }

  const valid = await bcrypt.compare(password, biz.password);
  if (!valid) {
    this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false);
    throw { statusCode: 401, message: 'Invalid credentials.' };
  }

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

  this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, true);
  
  return { 
    token, 
    businessId: biz._id.toString(),
    rememberToken 
  };
}

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** User Authentication Methods                                               */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Registers a new customer user with enhanced validation
   */
  async registerUser(input: RegisterUserInput): Promise<void> {
    const { email, password } = input;
    
    // Validate and normalize email
    if (!UtilsService.isValidEmail(email)) {
      throw { statusCode: 400, message: 'Invalid email format.' };
    }

    const normalized = UtilsService.normalizeEmail(email);
    const exists = await User.findOne({ email: normalized });
    
    if (exists) {
      this.logSecurityEvent('REGISTER_USER', normalized, false);
      throw { statusCode: 409, message: 'Email already in use.' };
    }

    const hashed = await bcrypt.hash(password, 12);
    const emailCode = this.generateCode();

    await User.create({
      email: normalized,
      password: hashed,
      emailCode,
      isEmailVerified: false
    });

    try {
      await this.notificationsService.sendEmailCode(normalized, emailCode);
      this.logSecurityEvent('REGISTER_USER', normalized, true);
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
   * Logs in a customer user with enhanced security
   */
  async loginUser(input: LoginUserInput & { 
  securityContext?: any;
  rememberMe?: boolean;  // ← Explicitly allow rememberMe
}): Promise<{
  token: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  preferences: any;
  rememberToken?: string;
}> {
    const { email, password, rememberMe } = input;
    const normalized = UtilsService.normalizeEmail(email);
    
    const user = await User.findOne({ email: normalized });
    if (!user) {
      this.logSecurityEvent('LOGIN_USER', normalized, false);
      throw { statusCode: 404, message: 'User not found.' };
    }

    if (!user.isEmailVerified) {
      this.logSecurityEvent('LOGIN_USER', normalized, false);
      throw { statusCode: 403, message: 'Email not verified.' };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      this.logSecurityEvent('LOGIN_USER', normalized, false);
      throw { statusCode: 401, message: 'Invalid credentials.' };
    }

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

    this.logSecurityEvent('LOGIN_USER', normalized, true);
    return {
    token,
    userId: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isEmailVerified: user.isEmailVerified,
    preferences: user.preferences || {},
    rememberToken,
  };
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Password Reset Methods                                                    */
  /** ─────────────────────────────────────────────────────────────────────────── */

  

   /**
   * Initiates password reset process
   */

   async requestPasswordReset(input: PasswordResetInput & { securityContext?: any }): Promise<void> {
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






  /**
   * Initiates password reset process
   */
  async initiatePasswordReset(
  input: PasswordResetInput & { securityContext?: any }
): Promise<void> {
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

async confirmPasswordReset(
  input: PasswordResetConfirmInput & { securityContext?: any }
): Promise<void> {
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

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Utility Methods                                                           */
  /** ─────────────────────────────────────────────────────────────────────────── */

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

  // In your AuthService class
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

// Helper method for blacklisting tokens
private async addTokenToBlacklist(token: string, userId: string): Promise<void> {
  // You can implement this in several ways:
  
  // Option 1: Store in database (create a BlacklistedToken model)
  const BlacklistedToken = mongoose.model('BlacklistedToken');
  await BlacklistedToken.create({
    token: token,
    userId: userId,
    blacklistedAt: new Date(),
    expiresAt: this.getTokenExpiration(token) // Extract expiration from JWT
  });
  
  // Option 2: Store in Redis (if you're using Redis)
  // await redis.setex(`blacklist:${token}`, tokenTtl, userId);
}

// Helper to extract token expiration
private getTokenExpiration(token: string): Date {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return new Date(payload.exp * 1000); // JWT exp is in seconds
  } catch (error) {
    // Default to 24 hours if can't parse
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}

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

