// src/utils/__tests__/setup.ts
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordira-test';
  
  // For unit tests, we don't need database connections
  // Integration tests will handle their own database setup
});

// Global test teardown
afterAll(async () => {
  // Unit tests don't need database cleanup
});

// Clean up after each test
afterEach(async () => {
  // Unit tests don't need database cleanup
});

// Set timeout for tests
jest.setTimeout(10000);

// Mock console methods in test environment
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
