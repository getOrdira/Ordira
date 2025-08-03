// src/services/auth.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Business } from '../models/business.model';
import { User }     from '../models/user.model';
import { sendEmailCode } from './notification.service';
import { generateCode }   from './utils.service';

const JWT_SECRET     = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

/** ─────────────────────────────────────────────────────────────────────────── */
/** Business (Brand Owner) Types & Methods                                    */
/** ─────────────────────────────────────────────────────────────────────────── */

export type RegisterBusinessInput = {
  firstName:    string;
  lastName:     string;
  dateOfBirth:  Date;
  email:        string;
  phone:        string;
  businessName: string;
  regNumber?:   string;
  taxId?:       string;
  address:      string;
  password:     string;
};

export type VerifyBusinessInput = {
  businessId: string;
  emailCode:  string;
  phoneCode:  string;
};

export type LoginBusinessInput = {
  emailOrPhone: string;
  password:     string;
};

/**
 * Registers a new business, sends verification codes via email.
 */
export async function registerBusiness(
  data: RegisterBusinessInput
): Promise<{ businessId: string }> {
  const exists = await Business.findOne({
    $or: [{ email: data.email }, { phone: data.phone }]
  });
  if (exists) {
    throw { statusCode: 409, message: 'Email or phone already in use.' };
  }

  const hashed    = await bcrypt.hash(data.password, 10);
  const emailCode = generateCode();

  const biz = await Business.create({
    ...data,
    password:        hashed,
    emailCode,
    isEmailVerified: false,
  });

  await sendEmailCode(biz.email, emailCode);

  return { businessId: biz._id.toString() };
}

/**
 * Verifies a business’s email (and optionally phone), issues JWT when done.
 */
export async function verifyBusiness(
  input: VerifyBusinessInput
): Promise<{ token: string }> {
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
export async function loginBusiness(
  input: LoginBusinessInput
): Promise<{ token: string }> {
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
/** User (Web2 Customer) Types & Methods                                      */
/** ─────────────────────────────────────────────────────────────────────────── */

export type RegisterUserInput = {
  email:    string;
  password: string;
};

export type VerifyUserInput = {
  email: string;
  code:  string;
};

export type LoginUserInput = {
  email:    string;
  password: string;
};

/**
 * Registers a new customer user, sends a verification email code.
 */
export async function registerUser(
  input: RegisterUserInput
): Promise<void> {
  const { email, password } = input;
  const normalized = email.toLowerCase();
  const exists = await User.findOne({ email: normalized });
  if (exists) {
    throw { statusCode: 409, message: 'Email already in use.' };
  }

  const hashed    = await bcrypt.hash(password, 10);
  const emailCode = generateCode();

  await User.create({
    email:           normalized,
    password:        hashed,
    emailCode,
    isEmailVerified: false
  });

  await sendEmailCode(normalized, emailCode);
}

/**
 * Verifies a user’s email code and issues a JWT.
 */
export async function verifyUser(
  input: VerifyUserInput
): Promise<{ token: string }> {
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
export async function loginUser(
  input: LoginUserInput
): Promise<{ token: string }> {
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

