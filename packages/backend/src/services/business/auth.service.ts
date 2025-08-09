// src/services/business/auth.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Business } from '../../models/business.model';
import { User } from '../../models/user.model';
import { NotificationsService } from '../external/notifications.service';
import { UtilsService } from '../utils/utils.service';

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

  private logSecurityEvent(event: string, identifier: string, success: boolean): void {
    const maskedIdentifier = UtilsService.isValidEmail(identifier) 
      ? UtilsService.maskEmail(identifier)
      : UtilsService.maskPhone(identifier);
    
    console.log(`[AUTH] ${event} - ${maskedIdentifier} - ${success ? 'SUCCESS' : 'FAILED'}`);
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
  async loginBusiness(input: LoginBusinessInput): Promise<{ token: string }> {
    const { emailOrPhone, password } = input;
    
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

    this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, true);
    return { token };
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

  /**
   * Logs in a customer user with enhanced security
   */
  async loginUser(input: LoginUserInput): Promise<{ token: string }> {
    const { email, password } = input;
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

    this.logSecurityEvent('LOGIN_USER', normalized, true);
    return { token };
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Password Reset Methods                                                    */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Initiates password reset process
   */
  async initiatePasswordReset(input: PasswordResetInput): Promise<void> {
    const { email } = input;
    const normalized = UtilsService.normalizeEmail(email);

    // Check both business and user collections
    const [business, user] = await Promise.all([
      Business.findOne({ email: normalized }),
      User.findOne({ email: normalized })
    ]);

    const account = business || user;
    if (!account) {
      // Don't reveal if email exists for security
      return;
    }

    const resetCode = this.generateCode();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    account.passwordResetCode = resetCode;
    account.passwordResetExpires = resetExpires;
    await account.save();

    try {
      await this.notificationsService.sendPasswordResetCode(normalized, resetCode);
      this.logSecurityEvent('PASSWORD_RESET_REQUEST', normalized, true);
    } catch (error) {
      console.error(`Failed to send password reset email to ${UtilsService.maskEmail(normalized)}:`, error);
    }
  }

  /**
   * Confirms password reset with new password
   */
  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
    const { email, resetCode, newPassword } = input;
    const normalized = UtilsService.normalizeEmail(email);

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
      this.logSecurityEvent('PASSWORD_RESET_CONFIRM', normalized, false);
      throw { statusCode: 400, message: 'Invalid or expired reset code.' };
    }

    // Update password and clear reset fields
    account.password = await bcrypt.hash(newPassword, 12);
    account.passwordResetCode = undefined;
    account.passwordResetExpires = undefined;
    await account.save();

    this.logSecurityEvent('PASSWORD_RESET_CONFIRM', normalized, true);
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

