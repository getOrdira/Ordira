// src/services/users/features/auth.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../../../utils/logger';
import { User } from '../../../models/user.model';
import { UtilsService } from '../../utils/utils.service';
import { userDataService } from '../core/userData.service';
import { userCacheService } from '../utils/cache.service';
import { userValidationService } from '../validation/userValidation.service';
import type { CreateUserData } from '../utils/types';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export class UserAuthService {
  private readonly saltRounds = 12;

  async registerUser(userData: CreateUserData): Promise<any> {
    const startTime = Date.now();

    const validation = userValidationService.validateRegistrationData({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: userData.password,
      phoneNumber: userData.phoneNumber
    });

    if (!validation.valid) {
      throw { statusCode: 400, message: validation.errors?.join(', ') ?? 'Invalid registration data' };
    }

    const existingUser = await userDataService.getUserByEmail(userData.email, { skipCache: true });
    if (existingUser) {
      throw { statusCode: 409, message: 'Email already exists' };
    }

    const hashedPassword = await bcrypt.hash(userData.password, this.saltRounds);

    const userCreateData = {
      ...userData,
      password: hashedPassword,
      fullName: `${userData.firstName} ${userData.lastName}`.trim(),
      isActive: true,
      isEmailVerified: false,
      emailVerificationToken: UtilsService.generateToken(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const user = new User(userCreateData);
    const savedUser = await user.save();

    await userCacheService.invalidateUserCaches();

    const duration = Date.now() - startTime;
    logger.info(`User registered successfully in ${duration}ms`, {
      userId: savedUser._id,
      email: userData.email,
      duration
    });

    const { password, emailVerificationToken, ...userResult } = savedUser.toObject();
    return userResult;
  }

  async loginUser(email: string, password: string): Promise<{ token: string; user: any }> {
    const startTime = Date.now();

    const user = await userDataService.getUserByEmail(email);
    if (!user) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    if (!user.isActive) {
      throw { statusCode: 401, message: 'Account is deactivated' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    await User.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      $inc: { loginCount: 1 }
    });

    const token = jwt.sign({
      userId: user._id,
      email: user.email,
      type: 'user'
    }, JWT_SECRET, { expiresIn: '7d' });

    await Promise.all([
      userCacheService.cacheUser(String(user._id), user),
      userCacheService.cacheUser(`email:${email}`, user)
    ]);

    const duration = Date.now() - startTime;
    logger.info(`User login successful in ${duration}ms`, {
      userId: user._id,
      email,
      duration
    });

    const { password: _password, emailVerificationToken, ...userResult } = user;

    return {
      token,
      user: userResult
    };
  }

  async verifyUserEmail(userId: string, verificationToken: string): Promise<void> {
    const startTime = Date.now();

    const user = await User.findOneAndUpdate({
      _id: userId,
      emailVerificationToken: verificationToken,
      isEmailVerified: false
    }, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      $unset: { emailVerificationToken: 1 }
    }, { new: true });

    if (!user) {
      throw { statusCode: 400, message: 'Invalid verification token' };
    }

    await userCacheService.invalidateUserCaches(userId);

    const duration = Date.now() - startTime;
    logger.info(`User email verified successfully in ${duration}ms`, {
      userId,
      duration
    });
  }
}

export const userAuthService = new UserAuthService();
