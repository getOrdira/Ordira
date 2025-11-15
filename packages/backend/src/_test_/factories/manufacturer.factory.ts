/**
 * Manufacturer Factory
 * 
 * Creates test manufacturer data with sensible defaults.
 * Supports customization through overrides.
 */

import { Types } from 'mongoose';
import type { TestManufacturerData } from '@ordira/shared/types/features/';

/**
 * Creates a test manufacturer with default values
 * 
 * @param overrides Optional properties to override defaults
 * @returns TestManufacturerData
 */
export function createTestManufacturer(
  overrides: Partial<TestManufacturerData> = {}
): TestManufacturerData {
  const timestamp = new Date();
  const manufacturerId = new Types.ObjectId().toString();
  
  return {
    email: `test-manufacturer-${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: `Test Manufacturer ${Date.now()}`,
    industry: 'Manufacturing',
    description: 'A test manufacturer for testing purposes',
    contactEmail: `contact-${Date.now()}@example.com`,
    servicesOffered: ['Production', 'Assembly', 'Packaging'],
    moq: 100,
    isVerified: true,
    isActive: true,
    manufacturerId,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

/**
 * Creates multiple test manufacturers
 * 
 * @param count Number of manufacturers to create
 * @param baseOverrides Base overrides applied to all manufacturers
 * @returns TestManufacturerData[]
 */
export function createTestManufacturers(
  count: number,
  baseOverrides: Partial<TestManufacturerData> = {}
): TestManufacturerData[] {
  return Array.from({ length: count }, (_, index) =>
    createTestManufacturer({
      ...baseOverrides,
      email: `test-manufacturer-${index + 1}@example.com`,
      name: `Test Manufacturer ${index + 1}`,
    })
  );
}

/**
 * Creates a test manufacturer that is not verified
 * 
 * @param overrides Optional properties to override defaults
 * @returns TestManufacturerData
 */
export function createUnverifiedTestManufacturer(
  overrides: Partial<TestManufacturerData> = {}
): TestManufacturerData {
  return createTestManufacturer({
    isVerified: false,
    ...overrides,
  });
}
