// src/utils/__tests__/env-setup.ts
// Environment setup for Jest tests

// Set test environment variables
// Note: NODE_ENV must be one of: development, staging, production (config validation)
// Use 'development' for tests but set TEST_TYPE to indicate it's a test
process.env.NODE_ENV = 'development';
process.env.TEST_TYPE = 'unit'; // Default to unit tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/ordira-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.REDIS_TLS = 'true'; // Required for redis-secure.config.ts
process.env.REDIS_CA_CERT = 'test-ca-cert'; // Required for redis-secure.config.ts
process.env.REDIS_PASSWORD = 'test-redis-password'; // Required for redis-secure.config.ts

// AWS S3 test configuration
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';

// Other required environment variables
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.BASE_DOMAIN = 'localhost';
process.env.BASE_RPC_URL = 'https://test-rpc-url.com';
process.env.PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
process.env.TOKEN_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890abcdef';
process.env.POSTMARK_API_KEY = 'test-postmark-key';

// Disable external service calls during testing
process.env.DISABLE_EXTERNAL_SERVICES = 'true';
process.env.DISABLE_EMAIL_SENDING = 'true';
process.env.DISABLE_SMS_SENDING = 'true';

// Test-specific settings
process.env.DEBUG_LOGS = 'false';
process.env.TRACE_LOGS = 'false';
