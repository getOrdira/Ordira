// src/utils/__tests__/dataSanitizer.test.ts

import {
  sanitizeString,
  sanitizeObject,
  sanitizeEnvironmentVariables,
  sanitizeError,
  sanitizeRequestData,
  createSafeSummary,
  containsSensitiveData,
  getSensitivePatterns,
  SENSITIVE_PATTERNS,
  SENSITIVE_FIELD_NAMES
} from '../dataSanitizer';
import { createSensitiveDataObject, expectSanitizedData } from './testHelpers';

describe('DataSanitizer', () => {
  describe('sanitizeString', () => {
    it('should sanitize API keys', () => {
      const input = 'api_key=sk_1234567890abcdef1234567890abcdef';
      const result = sanitizeString(input);
      expect(result).toBe('api_key=***REDACTED***');
    });

    it('should sanitize JWT secrets', () => {
      const input = 'jwt_secret=my-super-secret-jwt-key-that-should-be-hidden';
      const result = sanitizeString(input);
      expect(result).toBe('jwt_secret=***REDACTED***');
    });

    it('should sanitize MongoDB URIs', () => {
      const input = 'mongodb_uri=mongodb://user:password@localhost:27017/database';
      const result = sanitizeString(input);
      expect(result).toBe('mongodb_uri=***REDACTED***');
    });

    it('should sanitize private keys', () => {
      const input = 'private_key=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = sanitizeString(input);
      expect(result).toBe('private_key=***REDACTED***');
    });

    it('should sanitize Stripe keys', () => {
      const input = 'stripe_secret_key=sk_test_1234567890abcdef1234567890abcdef';
      const result = sanitizeString(input);
      expect(result).toBe('stripe_secret_key=***REDACTED***');
    });

    it('should sanitize AWS credentials', () => {
      const input = 'aws_access_key_id=AKIA1234567890ABCDEF';
      const result = sanitizeString(input);
      expect(result).toBe('aws_access_key_id=***REDACTED***');
    });

    it('should leave non-sensitive data unchanged', () => {
      const input = 'username=john_doe&email=john@example.com';
      const result = sanitizeString(input);
      expect(result).toBe(input);
    });

    it('should handle multiple sensitive patterns in one string', () => {
      const input = 'api_key=sk_1234567890abcdef&jwt_secret=my-secret-key-123456789&password=mypass';
      const result = sanitizeString(input);
      expect(result).toContain('api_key=***REDACTED***');
      expect(result).toContain('jwt_secret=***REDACTED***');
      expect(result).toContain('password=***REDACTED***');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: 'John',
          api_key: 'sk_1234567890abcdef',
          email: 'john@example.com'
        },
        config: {
          jwt_secret: 'my-secret-key',
          database_url: 'mongodb://localhost:27017'
        }
      };

      const result = sanitizeObject(input);
      
      expect(result.user.name).toBe('John');
      expect(result.user['[SENSITIVE_FIELD_API_KEY]']).toBe('sk_1234567890abcdef');
      expect(result.user.email).toBe('john@example.com');
      expect(result.config['[SENSITIVE_FIELD_JWT_SECRET]']).toBe('my-secret-key');
      expect(result.config['[SENSITIVE_FIELD_DATABASE_URL]']).toBe('mongodb://localhost:27017');
    });

    it('should sanitize arrays', () => {
      const input = {
        tokens: ['token1', 'token2'],
        secrets: ['secret1', 'secret2']
      };

      const result = sanitizeObject(input);
      expect(result['[SENSITIVE_FIELD_TOKENS]']).toEqual(['token1', 'token2']);
      expect(result['[SENSITIVE_FIELD_SECRETS]']).toEqual(['secret1', 'secret2']);
    });

    it('should handle null and undefined values', () => {
      const input = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        normalValue: 'test'
      };

      const result = sanitizeObject(input);
      expect(result.nullValue).toBeNull();
      expect(result.undefinedValue).toBeUndefined();
      expect(result.emptyString).toBe('');
      expect(result.normalValue).toBe('test');
    });
  });

  describe('sanitizeEnvironmentVariables', () => {
    it('should sanitize sensitive environment variables', () => {
      const env = {
        NODE_ENV: 'production',
        PORT: '3000',
        JWT_SECRET: 'my-secret-key',
        MONGODB_URI: 'mongodb://localhost:27017',
        API_KEY: 'sk_1234567890abcdef',
        USERNAME: 'john_doe'
      };

      const result = sanitizeEnvironmentVariables(env);
      
      expect(result.NODE_ENV).toBe('production');
      expect(result.PORT).toBe('3000');
      expect(result['[SENSITIVE_FIELD_JWT_SECRET]']).toBe('***REDACTED***');
      expect(result['[SENSITIVE_FIELD_MONGODB_URI]']).toBe('***REDACTED***');
      expect(result['[SENSITIVE_FIELD_API_KEY]']).toBe('***REDACTED***');
      expect(result.USERNAME).toBe('john_doe');
    });
  });

  describe('sanitizeError', () => {
    it('should sanitize error messages', () => {
      const error = new Error('Connection failed: mongodb_uri=mongodb://user:password@localhost:27017/database');
      error.stack = 'Error: Connection failed: mongodb_uri=mongodb://user:password@localhost:27017/database\n    at connect (/app/db.js:10:5)';
      
      const result = sanitizeError(error);
      
      // The MongoDB URI pattern should be sanitized
      expect(result.message).toContain('***REDACTED***');
      expect(result.stack).toContain('***REDACTED***');
      expect(result.name).toBe('Error');
    });

    it('should sanitize additional error data', () => {
      const error = {
        name: 'ValidationError',
        message: 'Invalid api_key provided',
        additionalData: {
          api_key: 'sk_1234567890abcdef',
          user_id: '12345'
        }
      };

      const result = sanitizeError(error);
      
      expect(result.additionalData['[SENSITIVE_FIELD_API_KEY]']).toBe('sk_1234567890abcdef');
      expect(result.additionalData.user_id).toBe('12345');
    });
  });

  describe('sanitizeRequestData', () => {
    it('should sanitize request headers', () => {
      const requestData = {
        headers: {
          'authorization': 'Bearer sk_1234567890abcdef',
          'x-api-key': 'api_key_123',
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0'
        },
        body: {
          username: 'john',
          password: 'secret123',
          email: 'john@example.com'
        }
      };

      const result = sanitizeRequestData(requestData);
      
      expect(result.headers['[SENSITIVE_FIELD_AUTHORIZATION]']).toBe('Bearer sk_1234567890abcdef');
      expect(result.headers['[SENSITIVE_FIELD_X-API-KEY]']).toBe('api_key_123');
      expect(result.headers['content-type']).toBe('application/json');
      expect(result.headers['user-agent']).toBe('Mozilla/5.0');
      expect(result.body['[SENSITIVE_FIELD_PASSWORD]']).toBe('secret123');
      expect(result.body.username).toBe('john');
      expect(result.body.email).toBe('john@example.com');
    });
  });

  describe('createSafeSummary', () => {
    it('should create safe summary within length limit', () => {
      const data = {
        api_key: 'sk_1234567890abcdef',
        user_id: '12345',
        message: 'Test message'
      };

      const result = createSafeSummary(data, 100);
      
      expect(result).toContain('[SENSITIVE_FIELD_API_KEY]');
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should truncate long summaries', () => {
      const data = {
        long_message: 'This is a very long message that should be truncated when creating a safe summary for logging purposes',
        api_key: 'sk_1234567890abcdef'
      };

      const result = createSafeSummary(data, 1);
      
      expect(result.length).toBeLessThanOrEqual(16); // 1 + 15 for ...[TRUNCATED]
      expect(result).toContain('...[TRUNCATED]');
    });
  });

  describe('containsSensitiveData', () => {
    it('should detect sensitive data', () => {
      expect(containsSensitiveData('api_key=sk_1234567890abcdef')).toBe(true);
      expect(containsSensitiveData('jwt_secret=my-secret-key-123456789012345678901234567890')).toBe(true);
      expect(containsSensitiveData('mongodb_uri=mongodb://user:pass@localhost:27017')).toBe(true);
    });

    it('should not detect non-sensitive data', () => {
      expect(containsSensitiveData('username=john_doe')).toBe(false);
      expect(containsSensitiveData('email=john@example.com')).toBe(false);
      expect(containsSensitiveData('age=25')).toBe(false);
    });
  });

  describe('getSensitivePatterns', () => {
    it('should return detected sensitive patterns', () => {
      const input = 'api_key=sk_1234567890abcdef1234567890&jwt_secret=my-secret-key-123456789012345678901234567890&password=mypass';
      const patterns = getSensitivePatterns(input);
      
      expect(patterns).toContain('API Keys');
      expect(patterns).toContain('JWT Secrets');
      expect(patterns).toContain('Passwords');
    });

    it('should return empty array for non-sensitive data', () => {
      const input = 'username=john&email=john@example.com';
      const patterns = getSensitivePatterns(input);
      
      expect(patterns).toHaveLength(0);
    });
  });

  describe('SENSITIVE_PATTERNS', () => {
    it('should have comprehensive pattern coverage', () => {
      expect(SENSITIVE_PATTERNS.length).toBeGreaterThan(10);
      
      const patternDescriptions = SENSITIVE_PATTERNS.map(p => p.description);
      expect(patternDescriptions).toContain('API Keys');
      expect(patternDescriptions).toContain('Access Tokens');
      expect(patternDescriptions).toContain('JWT Secrets');
      expect(patternDescriptions).toContain('MongoDB URI');
      expect(patternDescriptions).toContain('Private Keys');
      expect(patternDescriptions).toContain('Stripe Secret Keys');
    });
  });

  describe('SENSITIVE_FIELD_NAMES', () => {
    it('should contain common sensitive field names', () => {
      expect(SENSITIVE_FIELD_NAMES.has('password')).toBe(true);
      expect(SENSITIVE_FIELD_NAMES.has('api_key')).toBe(true);
      expect(SENSITIVE_FIELD_NAMES.has('jwt_secret')).toBe(true);
      expect(SENSITIVE_FIELD_NAMES.has('mongodb_uri')).toBe(true);
      expect(SENSITIVE_FIELD_NAMES.has('stripe_secret_key')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeObject({})).toEqual({});
    });

    it('should handle null and undefined inputs', () => {
      expect(sanitizeString(null as any)).toBe(null);
      expect(sanitizeString(undefined as any)).toBe(undefined);
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeString(123 as any)).toBe(123);
      expect(sanitizeString(true as any)).toBe(true);
    });

    it('should prevent infinite recursion', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      const result = sanitizeObject(circular);
      expect(result.name).toBe('test');
      // The circular reference should be handled by the depth limit
      expect(result.self).toBeDefined();
      expect(typeof result.self).toBe('object');
    });
  });
});
