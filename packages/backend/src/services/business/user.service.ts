/**
 * Optimized User Service
 *
 * Optimized version of the user service using:
 * - Query optimization service for efficient user lookups
 * - Enhanced caching for frequently accessed user data
 * - Batch operations for bulk user operations
 * - Performance monitoring and logging
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';
import { User } from '../../models/user.model';
import { queryOptimizationService } from '../external/query-optimization.service';
import { enhancedCacheService } from '../external/enhanced-cache.service';
import { UtilsService } from '../utils/utils.service';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    marketingEmails?: boolean;
  };
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  profilePictureUrl?: string;
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    marketingEmails?: boolean;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface UserSearchParams {
  query?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  preferences: any;
  votingHistory?: any[];
  brandInteractions?: any[];
}

export interface UserAnalytics {
  totalUsers: number;
  verifiedUsers: number;
  activeUsers: number;
  recentSignups: number;
  verificationRate: number;
  avgLoginFrequency: number;
  usersByPreferences: Record<string, number>;
  usersByLocation: Record<string, number>;
}

/**
 * Optimized user service with caching and query optimization
 */
export class OptimizedUserService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly LONG_CACHE_TTL = 3600; // 1 hour
  private readonly SHORT_CACHE_TTL = 60; // 1 minute

  /**
   * Register a new user with optimized validation
   */
  async registerUser(userData: CreateUserData): Promise<any> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateRegistrationData(userData);

      // Check if email already exists (with caching for recent checks)
      const existingUser = await this.getUserByEmail(userData.email, true);
      if (existingUser) {
        throw { statusCode: 409, message: 'Email already exists' };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user
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

      // Invalidate user caches (for user counts etc.)
      await this.invalidateUserCaches();

      const duration = Date.now() - startTime;
      logger.info(`User registered successfully in ${duration}ms`, {
        userId: savedUser._id,
        email: userData.email,
        duration
      });

      // Return user without password
      const { password, emailVerificationToken, ...userResult } = savedUser.toObject();
      return userResult;

    } catch (error) {
      logger.error('Failed to register user:', error);
      throw error;
    }
  }

  /**
   * Login user with optimized checks and caching
   */
  async loginUser(email: string, password: string): Promise<any> {
    const startTime = Date.now();

    try {
      // Get user (try cache first for recent logins)
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw { statusCode: 401, message: 'Invalid credentials' };
      }

      if (!user.isActive) {
        throw { statusCode: 401, message: 'Account is deactivated' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw { statusCode: 401, message: 'Invalid credentials' };
      }

      // Update last login
      await User.findByIdAndUpdate(user._id, {
        lastLoginAt: new Date(),
        $inc: { loginCount: 1 }
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          type: 'user'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Cache user data for faster subsequent requests
      await enhancedCacheService.cacheUser(user._id.toString(), user, {
        ttl: this.CACHE_TTL
      });

      const duration = Date.now() - startTime;
      logger.info(`User login successful in ${duration}ms`, {
        userId: user._id,
        email,
        duration
      });

      // Return user without password
      const { password: _, emailVerificationToken, ...userResult } = user.toObject();
      return {
        token,
        user: userResult
      };

    } catch (error) {
      logger.error('Failed to login user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with caching
   */
  async getUserById(userId: string, useCache: boolean = true): Promise<UserProfile | null> {
    if (useCache) {
      // Try cache first
      const cached = await enhancedCacheService.getCachedUser(userId);
      if (cached) {
        return this.formatUserProfile(cached);
      }
    }

    // Use optimized user lookup
    const user = await queryOptimizationService.optimizedUserLookup(userId, User);

    if (!user) {
      return null;
    }

    // Cache the result
    if (useCache) {
      await enhancedCacheService.cacheUser(userId, user, {
        ttl: this.CACHE_TTL
      });
    }

    return this.formatUserProfile(user);
  }

  /**
   * Get user by email with optional caching
   */
  async getUserByEmail(email: string, skipCache: boolean = false): Promise<any> {
    if (!skipCache) {
      // Try cache first (using email as key)
      const cached = await enhancedCacheService.getCachedUser(`email:${email}`);
      if (cached) {
        return cached;
      }
    }

    const user = await User.findOne({ email }).lean();

    if (!user) {
      return null;
    }

    // Cache the result (with email key for login optimization)
    if (!skipCache) {
      await enhancedCacheService.cacheUser(`email:${email}`, user, {
        ttl: this.CACHE_TTL
      });
    }

    return user;
  }

  /**
   * Update user profile with cache invalidation
   */
  async updateUserProfile(userId: string, updates: UpdateUserData): Promise<UserProfile> {
    const startTime = Date.now();

    try {
      // Update fullName if first or last name changed
      if (updates.firstName || updates.lastName) {
        const currentUser = await User.findById(userId).select('firstName lastName').lean();
        if (currentUser) {
          const firstName = updates.firstName || currentUser.firstName;
          const lastName = updates.lastName || currentUser.lastName;
          (updates as any).fullName = `${firstName} ${lastName}`.trim();
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
      .select('-password -emailVerificationToken')
      .lean();

      if (!user) {
        throw { statusCode: 404, message: 'User not found' };
      }

      // Invalidate user caches
      await this.invalidateUserCaches(userId);

      const duration = Date.now() - startTime;
      logger.info(`User profile updated successfully in ${duration}ms`, {
        userId,
        duration
      });

      return this.formatUserProfile(user);

    } catch (error) {
      logger.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Search users with optimization and caching
   */
  async searchUsers(params: UserSearchParams): Promise<{
    users: UserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    const startTime = Date.now();

    try {
      // Build search criteria
      const searchCriteria: any = {};

      if (params.query) {
        searchCriteria.$text = { $search: params.query };
      }

      if (params.isActive !== undefined) {
        searchCriteria.isActive = params.isActive;
      }

      if (params.isEmailVerified !== undefined) {
        searchCriteria.isEmailVerified = params.isEmailVerified;
      }

      // Build sort criteria
      const sortCriteria: any = {};
      if (params.query) {
        sortCriteria.score = { $meta: 'textScore' };
      } else {
        const sortField = params.sortBy || 'createdAt';
        sortCriteria[sortField] = params.sortOrder === 'asc' ? 1 : -1;
      }

      const limit = params.limit || 20;
      const offset = params.offset || 0;

      // Execute optimized query
      const [users, total] = await Promise.all([
        User.find(searchCriteria)
          .select('firstName lastName fullName email profilePictureUrl isActive isEmailVerified lastLoginAt createdAt')
          .sort(sortCriteria)
          .limit(limit)
          .skip(offset)
          .lean(),
        User.countDocuments(searchCriteria)
      ]);

      const duration = Date.now() - startTime;
      logger.info(`User search completed in ${duration}ms`, {
        query: params.query,
        resultsCount: users.length,
        totalCount: total,
        duration
      });

      return {
        users: users.map(user => this.formatUserProfile(user)),
        total,
        hasMore: offset + users.length < total
      };

    } catch (error) {
      logger.error('Failed to search users:', error);
      throw error;
    }
  }

  /**
   * Batch get users by IDs with optimization
   */
  async batchGetUsers(userIds: string[]): Promise<UserProfile[]> {
    const startTime = Date.now();

    try {
      // Use optimized batch lookup
      const users = await queryOptimizationService.batchUserLookup(userIds, User);

      const duration = Date.now() - startTime;
      logger.info(`Batch user lookup completed in ${duration}ms`, {
        requestedCount: userIds.length,
        foundCount: users.length,
        duration
      });

      return users.map(user => this.formatUserProfile(user));

    } catch (error) {
      logger.error('Failed to batch get users:', error);
      throw error;
    }
  }

  /**
   * Get user analytics with caching
   */
  async getUserAnalytics(timeRange?: { start: Date; end: Date }): Promise<UserAnalytics> {
    // Try cache first
    const cached = await enhancedCacheService.getCachedAnalytics('user', { timeRange }, {
      ttl: this.CACHE_TTL
    });

    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const matchStage: any = {};
      if (timeRange) {
        matchStage.createdAt = {
          $gte: timeRange.start,
          $lte: timeRange.end
        };
      }

      const [basicStats, preferencesStats, recentSignups] = await Promise.all([
        this.getUserBasicStats(matchStage),
        this.getUserPreferencesStats(matchStage),
        this.getRecentSignupsCount(7) // Last 7 days
      ]);

      const userAnalytics: UserAnalytics = {
        totalUsers: basicStats.total,
        verifiedUsers: basicStats.verified,
        activeUsers: basicStats.active,
        recentSignups,
        verificationRate: basicStats.total > 0 ? (basicStats.verified / basicStats.total) * 100 : 0,
        avgLoginFrequency: basicStats.avgLoginFrequency,
        usersByPreferences: preferencesStats,
        usersByLocation: await this.getUserLocationStats(matchStage)
      };

      // Cache the result
      await enhancedCacheService.cacheAnalytics('user', { timeRange }, userAnalytics, {
        ttl: this.CACHE_TTL
      });

      const duration = Date.now() - startTime;
      logger.info(`User analytics generated in ${duration}ms`, {
        duration,
        totalUsers: userAnalytics.totalUsers
      });

      return userAnalytics;

    } catch (error) {
      logger.error('Failed to generate user analytics:', error);
      throw error;
    }
  }

  /**
   * Verify user email
   */
  async verifyUserEmail(userId: string, verificationToken: string): Promise<void> {
    const startTime = Date.now();

    try {
      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          emailVerificationToken: verificationToken,
          isEmailVerified: false
        },
        {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          $unset: { emailVerificationToken: 1 }
        },
        { new: true }
      );

      if (!user) {
        throw { statusCode: 400, message: 'Invalid verification token' };
      }

      // Invalidate user caches
      await this.invalidateUserCaches(userId);

      const duration = Date.now() - startTime;
      logger.info(`User email verified successfully in ${duration}ms`, {
        userId,
        duration
      });

    } catch (error) {
      logger.error('Failed to verify user email:', error);
      throw error;
    }
  }

  /**
   * Delete user with cache invalidation
   */
  async deleteUser(userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await User.deleteOne({ _id: userId });

      if (result.deletedCount === 0) {
        throw { statusCode: 404, message: 'User not found' };
      }

      // Invalidate all related caches
      await this.invalidateUserCaches(userId);

      const duration = Date.now() - startTime;
      logger.info(`User deleted successfully in ${duration}ms`, {
        userId,
        duration
      });

    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateRegistrationData(data: CreateUserData): void {
    if (!UtilsService.isValidEmail(data.email)) {
      throw { statusCode: 400, message: 'Invalid email format' };
    }

    if (!data.firstName || data.firstName.trim().length < 2) {
      throw { statusCode: 400, message: 'First name must be at least 2 characters long' };
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      throw { statusCode: 400, message: 'Last name must be at least 2 characters long' };
    }

    if (!data.password || data.password.length < 8) {
      throw { statusCode: 400, message: 'Password must be at least 8 characters long' };
    }

    if (data.phoneNumber && !UtilsService.isValidPhoneNumber(data.phoneNumber)) {
      throw { statusCode: 400, message: 'Invalid phone number format' };
    }
  }

  private formatUserProfile(user: any): UserProfile {
    return {
      id: user._id?.toString() || user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePictureUrl: user.profilePictureUrl,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      preferences: user.preferences || {},
      votingHistory: user.votingHistory || [],
      brandInteractions: user.brandInteractions || []
    };
  }

  private async getUserBasicStats(matchStage: any): Promise<any> {
    const results = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          avgLoginFrequency: { $avg: { $ifNull: ['$loginCount', 0] } }
        }
      }
    ]);

    return results[0] || { total: 0, verified: 0, active: 0, avgLoginFrequency: 0 };
  }

  private async getUserPreferencesStats(matchStage: any): Promise<Record<string, number>> {
    const results = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          emailNotifications: { $sum: { $cond: ['$preferences.emailNotifications', 1, 0] } },
          smsNotifications: { $sum: { $cond: ['$preferences.smsNotifications', 1, 0] } },
          marketingEmails: { $sum: { $cond: ['$preferences.marketingEmails', 1, 0] } }
        }
      }
    ]);

    const data = results[0] || { emailNotifications: 0, smsNotifications: 0, marketingEmails: 0 };
    return {
      emailNotifications: data.emailNotifications,
      smsNotifications: data.smsNotifications,
      marketingEmails: data.marketingEmails
    };
  }

  private async getUserLocationStats(matchStage: any): Promise<Record<string, number>> {
    const results = await User.aggregate([
      { $match: matchStage },
      { $group: { _id: '$address.country', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getRecentSignupsCount(days: number): Promise<number> {
    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await User.countDocuments({
      createdAt: { $gte: dateThreshold }
    });
  }

  private async invalidateUserCaches(userId?: string): Promise<void> {
    const tags = ['user_analytics'];

    if (userId) {
      tags.push(`user:${userId}`);
      // Also invalidate email-based cache if we have the user data
      const user = await User.findById(userId).select('email').lean();
      if (user) {
        await enhancedCacheService.invalidateByTags([`email:${user.email}`]);
      }
    }

    await enhancedCacheService.invalidateByTags(tags);
  }
}

export const optimizedUserService = new OptimizedUserService();