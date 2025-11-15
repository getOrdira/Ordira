/**
 * User Profile Formatter Service Unit Tests
 * 
 * Tests user profile formatting from database documents to frontend-friendly format.
 */

import { UserProfileFormatterService } from '../../../services/users/utils/profileFormatter.service';

describe('UserProfileFormatterService', () => {
  let profileFormatterService: UserProfileFormatterService;

  beforeEach(() => {
    profileFormatterService = new UserProfileFormatterService();
  });

  describe('format', () => {
    it('should format user document with _id to profile', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01'),
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
        },
        votingHistory: [],
        brandInteractions: [],
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.id).toBe('507f1f77bcf86cd799439011');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.fullName).toBe('John Doe');
      expect(result.phoneNumber).toBe('+1234567890');
      expect(result.profilePictureUrl).toBe('https://example.com/avatar.jpg');
      expect(result.isActive).toBe(true);
      expect(result.isEmailVerified).toBe(true);
      expect(result.emailVerifiedAt).toEqual(new Date('2024-01-01'));
      expect(result.lastLoginAt).toEqual(new Date('2024-01-15'));
      expect(result.createdAt).toEqual(new Date('2024-01-01'));
      expect(result.preferences).toEqual({
        emailNotifications: true,
        smsNotifications: false,
      });
      expect(result.votingHistory).toEqual([]);
      expect(result.brandInteractions).toEqual([]);
    });

    it('should format user document with id field to profile', () => {
      const userDocument = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should convert ObjectId to string', () => {
      const mockObjectId = {
        toString: jest.fn().mockReturnValue('507f1f77bcf86cd799439011'),
      };
      const userDocument = {
        _id: mockObjectId,
        email: 'test@example.com',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(mockObjectId.toString).toHaveBeenCalled();
      expect(result.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should generate fullName from firstName and lastName when fullName is missing', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.fullName).toBe('John Doe');
    });

    it('should handle missing firstName when generating fullName', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        lastName: 'Doe',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.fullName).toBe('Doe');
    });

    it('should handle missing lastName when generating fullName', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.fullName).toBe('John');
    });

    it('should use Unknown User when firstName and lastName are both missing', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.fullName).toBe('Unknown User');
    });

    it('should use provided fullName when available', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'Johnny Doe',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.fullName).toBe('Johnny Doe');
    });

    it('should provide default empty object for preferences when missing', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.preferences).toEqual({});
    });

    it('should provide default empty array for votingHistory when missing', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.votingHistory).toEqual([]);
    });

    it('should provide default empty array for brandInteractions when missing', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.brandInteractions).toEqual([]);
    });

    it('should handle optional fields when they are undefined', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
        phoneNumber: undefined,
        profilePictureUrl: undefined,
        emailVerifiedAt: undefined,
        lastLoginAt: undefined,
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.phoneNumber).toBeUndefined();
      expect(result.profilePictureUrl).toBeUndefined();
      expect(result.emailVerifiedAt).toBeUndefined();
      expect(result.lastLoginAt).toBeUndefined();
    });

    it('should handle empty string id gracefully', () => {
      const userDocument = {
        _id: { toString: jest.fn().mockReturnValue('') },
        email: 'test@example.com',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.id).toBe('');
    });

    it('should trim whitespace in generated fullName', () => {
      const userDocument = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: '  John  ',
        lastName: '  Doe  ',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date('2024-01-01'),
      };

      const result = profileFormatterService.format(userDocument);

      expect(result.fullName).toBe('John Doe');
    });
  });
});

