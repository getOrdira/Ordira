// src/services/users/utils/profileFormatter.service.ts

import type { UserProfile } from './types';

interface RawUserRecord {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  preferences?: Record<string, unknown>;
  votingHistory?: unknown[];
  brandInteractions?: unknown[];
}

export class UserProfileFormatterService {
  /**
   * Flatten mongoose user document into front-end friendly profile
   */
  format(user: RawUserRecord): UserProfile {
    const rawId = user._id ?? user.id;
    const normalizedId = typeof rawId === 'string' ? rawId : (rawId as unknown as { toString: () => string })?.toString() ?? '';

    return {
      id: normalizedId,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName ?? ((`${(user.firstName ?? '')} ${(user.lastName ?? '')}`.trim()) || 'Unknown User'),
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePictureUrl: user.profilePictureUrl,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      preferences: user.preferences ?? {},
      votingHistory: user.votingHistory ?? [],
      brandInteractions: user.brandInteractions ?? []
    };
  }
}

export const userProfileFormatterService = new UserProfileFormatterService();
