// src/services/users/utils/types.ts

export interface UserPreferences {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
}

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  preferences?: UserPreferences;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  profilePictureUrl?: string;
  preferences?: UserPreferences;
  address?: UserAddress;
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
  preferences: UserPreferences | Record<string, unknown>;
  votingHistory?: unknown[];
  brandInteractions?: unknown[];
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
