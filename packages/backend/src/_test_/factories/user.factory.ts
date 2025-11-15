/**
 * User Factory
 * 
 * Creates test user data with sensible defaults.
 * Supports customization through overrides.
 */

import { Types } from 'mongoose';
import type { TestUserData } from '@ordira/shared/types/features/';

/**
 * Creates a test user with default values
 * 
 * @param overrides Optional properties to override defaults
 * @returns TestUserData
 */
export function createTestUser(overrides: Partial<TestUserData> = {}): TestUserData {
  const timestamp = new Date();
  
  return {
    email: `test-user-${Date.now()}@example.com`,
    password: 'TestPass123!', // Meets password requirements
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    isEmailVerified: true,
    isActive: true,
    businessId: new Types.ObjectId().toString(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

/**
 * Creates multiple test users
 * 
 * @param count Number of users to create
 * @param baseOverrides Base overrides applied to all users
 * @returns TestUserData[]
 */
export function createTestUsers(
  count: number,
  baseOverrides: Partial<TestUserData> = {}
): TestUserData[] {
  return Array.from({ length: count }, (_, index) =>
    createTestUser({
      ...baseOverrides,
      email: `test-user-${index + 1}@example.com`,
    })
  );
}

/**
 * Creates a test user with unverified email
 * 
 * @param overrides Optional properties to override defaults
 * @returns TestUserData
 */
export function createUnverifiedTestUser(
  overrides: Partial<TestUserData> = {}
): TestUserData {
  return createTestUser({
    isEmailVerified: false,
    ...overrides,
  });
}

/**
 * Creates a test user with inactive account
 * 
 * @param overrides Optional properties to override defaults
 * @returns TestUserData
 */
export function createInactiveTestUser(
  overrides: Partial<TestUserData> = {}
): TestUserData {
  return createTestUser({
    isActive: false,
    ...overrides,
  });
}
