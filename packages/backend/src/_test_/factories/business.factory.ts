/**
 * Business Factory
 * 
 * Creates test business data with sensible defaults.
 * Supports customization through overrides.
 */

import { Types } from 'mongoose';

export interface TestBusinessData {
  email: string;
  password: string;
  businessName: string;
  industry?: string;
  contactEmail?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isEmailVerified?: boolean;
  isActive?: boolean;
  subscriptionPlan?: string;
  businessId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Creates a test business with default values
 * 
 * @param overrides Optional properties to override defaults
 * @returns TestBusinessData
 */
export function createTestBusiness(
  overrides: Partial<TestBusinessData> = {}
): TestBusinessData {
  const timestamp = new Date();
  const businessId = new Types.ObjectId().toString();
  
  return {
    email: `test-business-${Date.now()}@example.com`,
    password: 'TestPass123!',
    businessName: `Test Business ${Date.now()}`,
    industry: 'Technology',
    contactEmail: `contact-${Date.now()}@example.com`,
    phone: '+1234567890',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US',
    },
    isEmailVerified: true,
    isActive: true,
    subscriptionPlan: 'basic',
    businessId,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

/**
 * Creates multiple test businesses
 * 
 * @param count Number of businesses to create
 * @param baseOverrides Base overrides applied to all businesses
 * @returns TestBusinessData[]
 */
export function createTestBusinesses(
  count: number,
  baseOverrides: Partial<TestBusinessData> = {}
): TestBusinessData[] {
  return Array.from({ length: count }, (_, index) =>
    createTestBusiness({
      ...baseOverrides,
      email: `test-business-${index + 1}@example.com`,
      businessName: `Test Business ${index + 1}`,
    })
  );
}

/**
 * Creates a test business with premium plan
 * 
 * @param overrides Optional properties to override defaults
 * @returns TestBusinessData
 */
export function createPremiumTestBusiness(
  overrides: Partial<TestBusinessData> = {}
): TestBusinessData {
  return createTestBusiness({
    subscriptionPlan: 'premium',
    ...overrides,
  });
}

/**
 * Creates a test business with enterprise plan
 * 
 * @param overrides Optional properties to override defaults
 * @returns TestBusinessData
 */
export function createEnterpriseTestBusiness(
  overrides: Partial<TestBusinessData> = {}
): TestBusinessData {
  return createTestBusiness({
    subscriptionPlan: 'enterprise',
    ...overrides,
  });
}

