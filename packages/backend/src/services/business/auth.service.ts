// src/services/business/auth.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Business } from '../../models/business.model';
import { User } from '../../models/user.model';
import { NotificationsService } from '../external/notifications.service';

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
  phoneCode: string;
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

export class AuthService {
  private notificationsService = new NotificationsService();

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Business Authentication Methods                                           */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Registers a new business, sends verification codes via email.
   */
  async registerBusiness(data: RegisterBusinessInput): Promise<{ businessId: string }> {
    const exists = await Business.findOne({
      $or: [{ email: data.email }, { phone: data.phone }]
    });
    if (exists) {
      throw { statusCode: 409, message: 'Email or phone already in use.' };
    }

    const hashed = await bcrypt.hash(data.password, 10);
    const emailCode = this.generateCode();

    const biz = await Business.create({
      ...data,
      password: hashed,
      emailCode,
      isEmailVerified: false,
    });

    await this.notificationsService.sendEmailCode(biz.email, emailCode);

    return { businessId: biz._id.toString() };
  }

  /**
   * Verifies a business's email (and optionally phone), issues JWT when done.
   */
  async verifyBusiness(input: VerifyBusinessInput): Promise<{ token: string }> {
    const { businessId, emailCode /*, phoneCode*/ } = input;
    const biz = await Business.findById(businessId);
    if (!biz) throw { statusCode: 404, message: 'Business not found.' };

    let updated = false;
    if (!biz.isEmailVerified && biz.emailCode === emailCode) {
      biz.isEmailVerified = true;
      updated = true;
    }
    // If you want phone too, add phoneCode logic here

    if (updated) {
      await biz.save();
    }

    if (biz.isEmailVerified) {
      const token = jwt.sign(
        { sub: biz._id.toString() },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      return { token };
    }

    throw { statusCode: 400, message: 'Invalid or incomplete verification.' };
  }

  /**
   * Logs in a verified business and returns a JWT.
   */
  async loginBusiness(input: LoginBusinessInput): Promise<{ token: string }> {
    const { emailOrPhone, password } = input;
    const biz = await Business.findOne({
      $or: [
        { email: emailOrPhone.toLowerCase() },
        { phone: emailOrPhone }
      ]
    });
    if (!biz) {
      throw { statusCode: 404, message: 'Business not found.' };
    }
    if (!biz.isEmailVerified /* || !biz.isPhoneVerified */) {
      throw { statusCode: 403, message: 'Account not verified.' };
    }

    const valid = await bcrypt.compare(password, biz.password);
    if (!valid) {
      throw { statusCode: 401, message: 'Invalid credentials.' };
    }

    const token = jwt.sign(
      { sub: biz._id.toString() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return { token };
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** User Authentication Methods                                               */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Registers a new customer user, sends a verification email code.
   */
  async registerUser(input: RegisterUserInput): Promise<void> {
    const { email, password } = input;
    const normalized = email.toLowerCase();
    const exists = await User.findOne({ email: normalized });
    if (exists) {
      throw { statusCode: 409, message: 'Email already in use.' };
    }

    const hashed = await bcrypt.hash(password, 10);
    const emailCode = this.generateCode();

    await User.create({
      email: normalized,
      password: hashed,
      emailCode,
      isEmailVerified: false
    });

    await this.notificationsService.sendEmailCode(normalized, emailCode);
  }

  /**
   * Verifies a user's email code and issues a JWT.
   */
  async verifyUser(input: VerifyUserInput): Promise<{ token: string }> {
    const { email, code } = input;
    const normalized = email.toLowerCase();
    const user = await User.findOne({ email: normalized });
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }
    if (user.isEmailVerified) {
      throw { statusCode: 400, message: 'Already verified.' };
    }
    if (user.emailCode !== code) {
      throw { statusCode: 400, message: 'Invalid code.' };
    }

    user.isEmailVerified = true;
    await user.save();

    const token = jwt.sign(
      { sub: user._id.toString() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return { token };
  }

  /**
   * Logs in a customer user and returns a JWT.
   */
  async loginUser(input: LoginUserInput): Promise<{ token: string }> {
    const { email, password } = input;
    const normalized = email.toLowerCase();
    const user = await User.findOne({ email: normalized });
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }
    if (!user.isEmailVerified) {
      throw { statusCode: 403, message: 'Email not verified.' };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw { statusCode: 401, message: 'Invalid credentials.' };
    }

    const token = jwt.sign(
      { sub: user._id.toString() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return { token };
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Utility Methods                                                           */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Verifies and decodes a JWT token
   */
  verifyToken(token: string): { sub: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as { sub: string };
    } catch (error) {
      throw { statusCode: 401, message: 'Invalid token' };
    }
  }

  /**
   * Resends verification code for business
   */
  async resendBusinessVerification(businessId: string): Promise<void> {
    const biz = await Business.findById(businessId);
    if (!biz) throw { statusCode: 404, message: 'Business not found.' };
    if (biz.isEmailVerified) throw { statusCode: 400, message: 'Already verified.' };

    const emailCode = this.generateCode();
    biz.emailCode = emailCode;
    await biz.save();

    await this.notificationsService.sendEmailCode(biz.email, emailCode);
  }

  /**
   * Resends verification code for user
   */
  async resendUserVerification(email: string): Promise<void> {
    const normalized = email.toLowerCase();
    const user = await User.findOne({ email: normalized });
    if (!user) throw { statusCode: 404, message: 'User not found.' };
    if (user.isEmailVerified) throw { statusCode: 400, message: 'Already verified.' };

    const emailCode = this.generateCode();
    user.emailCode = emailCode;
    await user.save();

    await this.notificationsService.sendEmailCode(normalized, emailCode);
  }
}

