module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
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
    '!src/index.ts',
    '!src/config/**',
    '!src/types/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json', 'd.ts'],
  testTimeout: 10000,
  verbose: true,
  // Mock environment variables for testing
  setupFiles: ['<rootDir>/src/utils/__tests__/env-setup.ts'],
  // Set environment variables for all tests
  setupFilesAfterEnv: ['<rootDir>/src/utils/__tests__/setup.ts'],
  // Global environment variables
  globals: {
    'process.env.TEST_TYPE': 'unit'
  }
};
