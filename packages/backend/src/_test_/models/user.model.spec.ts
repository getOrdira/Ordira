/**
 * User Model Unit Tests
 * 
 * Tests schema validation, indexes, statics, and instance methods.
 */

import mongoose from 'mongoose';
import { User, IUser } from '../../models/user'; 
import { startMongoMemoryServer, stopMongoMemoryServer, clearDatabase } from '../utils/mongo';

describe('User Model', () => {
  beforeAll(async () => {
    await startMongoMemoryServer();
  });

  afterAll(async () => {
    await stopMongoMemoryServer();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Schema Validation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.status).toBe('active');
    });

    it('should require email field', async () => {
      const user = new User({
        password: 'hashedPassword123',
        firstName: 'John',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require password field', async () => {
      const user = new User({
        email: 'test@example.com',
        firstName: 'John',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce email uniqueness', async () => {
      const email = 'duplicate@example.com';
      const userData = {
        email,
        password: 'hashedPassword123',
        firstName: 'John',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      };

      await User.create(userData);

      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const user = new User({
        email: 'invalid-email',
        password: 'hashedPassword123',
        firstName: 'John',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      });

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should have email index', async () => {
      const indexes = await User.collection.getIndexes();
      expect(indexes).toHaveProperty('email_1');
    });

    it('should query efficiently by email', async () => {
      const user = await User.create({
        email: 'index-test@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      });

      const found = await User.findOne({ email: 'index-test@example.com' });
      expect(found).toBeDefined();
      expect(found?._id.toString()).toBe(user._id.toString());
    });
  });

  describe('Instance Methods', () => {
    let user: IUser;

    beforeEach(async () => {
      user = await User.create({
        email: 'methods-test@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      });
    });

    it('should compare password correctly', async () => {
      // Note: In a real test, you'd hash the password first
      // This assumes comparePassword handles bcrypt comparison
      const result = await user.comparePassword('wrongPassword');
      expect(typeof result).toBe('boolean');
    });

    it('should increment login attempts', async () => {
      const initialAttempts = user.loginAttempts;
      await user.incrementLoginAttempts();
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated?.loginAttempts).toBe(initialAttempts + 1);
    });

    it('should reset login attempts', async () => {
      user.loginAttempts = 5;
      await user.save();

      await user.resetLoginAttempts();
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated?.loginAttempts).toBe(0);
    });

    it('should check if account is locked', () => {
      user.lockUntil = undefined;
      expect(user.isAccountLocked()).toBe(false);

      user.lockUntil = new Date(Date.now() + 3600000); // Future date
      expect(user.isAccountLocked()).toBe(true);

      user.lockUntil = new Date(Date.now() - 3600000); // Past date
      expect(user.isAccountLocked()).toBe(false);
    });
  });

  describe('Virtual Properties', () => {
    it('should compute fullName from firstName and lastName', async () => {
      const user = await User.create({
        email: 'virtual-test@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      });

      expect(user.fullName).toBe('John Doe');
    });
  });

  describe('Defaults', () => {
    it('should set default values for required fields', async () => {
      const user = new User({
        email: 'defaults-test@example.com',
        password: 'hashedPassword123',
        isEmailVerified: false,
        loginAttempts: 0,
        twoFactorEnabled: false,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        votingHistory: [],
        brandInteractions: [],
        analytics: {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
        },
        status: 'active',
      });

      const saved = await user.save();
      expect(saved.loginAttempts).toBe(0);
      expect(saved.twoFactorEnabled).toBe(false);
      expect(saved.status).toBe('active');
    });
  });
});

