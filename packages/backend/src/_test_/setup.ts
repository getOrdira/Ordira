/**
 * Test Setup File
 * 
 * This file runs after Jest environment is set up.
 * It initializes global test configuration and mocks.
 */

import mongoose from 'mongoose';

// Suppress console output during tests (optional - uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Set default test timeout
jest.setTimeout(30000);

// Global test configuration
beforeAll(async () => {
  // Ensure test environment is set
  process.env.NODE_ENV = 'test';
  
  // Disable external service calls
  process.env.DISABLE_EXTERNAL_SERVICES = 'true';
  process.env.DISABLE_EMAIL_SENDING = 'true';
  process.env.DISABLE_SMS_SENDING = 'true';
  
  // Mock external services if needed
  jest.mock('@sentry/node');
});

afterAll(async () => {
  // Close any open connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear all mocks between tests
  jest.clearAllMocks();
});

