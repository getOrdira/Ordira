import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/_test_/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    '!src/**/_test_/**',
    '!src/index.ts',
    '!src/config/**',
    '!src/types/**',
    '!src/utils/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000, // 30 seconds for integration tests
  verbose: true,
  // Run tests in parallel but isolate database connections
  maxWorkers: '50%',
  // Setup files run before each test file
  setupFiles: ['<rootDir>/src/utils/__tests__/env-setup.ts'],
  // Setup files run after Jest environment setup
  setupFilesAfterEnv: ['<rootDir>/src/_test_/setup.ts'],
  // Global teardown runs once after all tests
  globalTeardown: '<rootDir>/src/_test_/teardown.ts',
  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        // Use relaxed TypeScript config for tests
        strict: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Clear mocks between tests
  clearMocks: true,
  // Reset modules between tests to avoid state pollution
  resetMocks: true,
  // Restore mocks to original implementation after each test
  restoreMocks: false,
  // Don't reset modules between tests (needed for DI container)
  resetModules: false,
};

export default config;

