# Data Sanitization for Secure Logging 🔒

## Overview

This document describes the comprehensive data sanitization system implemented to prevent sensitive data exposure in logs, error messages, and debugging output.

## Problem Solved

**Issue**: Configuration service and other components were logging sensitive keys, secrets, and credentials that could be exposed in log files, error messages, or debugging output.

**Impact**: Potential credential exposure leading to security vulnerabilities.

**Solution**: Comprehensive data sanitization system that automatically masks sensitive data patterns across all logging scenarios.

## Implementation

### Core Components

#### 1. `dataSanitizer.ts` - Sanitization Engine
- **Pattern-based sanitization**: Uses regex patterns to identify and mask sensitive data
- **Field name sanitization**: Automatically masks sensitive field names
- **Recursive object sanitization**: Safely processes nested objects and arrays
- **Environment variable sanitization**: Special handling for env vars

#### 2. Enhanced `logger.ts` - Secure Logging
- **Automatic sanitization**: All log entries are automatically sanitized
- **Safe logging methods**: New methods for explicitly safe logging
- **Request/response sanitization**: Special handling for HTTP data
- **Error sanitization**: Comprehensive error message cleaning

#### 3. Updated `config.service.ts` - Configuration Security
- **Sanitized validation errors**: Environment validation errors are safely logged
- **Configuration status logging**: Safe logging of config status without exposing secrets
- **Service validation**: Secure logging of service availability

### Sensitive Data Patterns Covered

#### Authentication & Security
- API Keys (`api_key`, `apikey`)
- JWT Secrets (`jwt_secret`, `jwtscret`)
- Access Tokens (`access_token`, `accesstoken`)
- Refresh Tokens (`refresh_token`, `refreshtoken`)
- Bearer Tokens (`Bearer <token>`)
- Passwords (`password`, `passwd`, `pwd`)

#### Database & Connections
- MongoDB URIs (`mongodb_uri`, `mongo_uri`)
- Redis URLs (`redis_url`, `redis_uri`)
- Database URLs (`database_url`, `db_url`)
- Connection Strings

#### Payment Processing
- Stripe Secret Keys (`stripe_secret_key`)
- Stripe Webhook Secrets (`stripe_webhook_secret`)
- Payment Keys

#### Blockchain & Crypto
- Private Keys (`private_key`)
- Wallet Addresses (`wallet_address`)
- Deployer Keys (`deployer_key`)

#### External Services
- Shopify Access Tokens (`shopify_access_token`)
- WooCommerce Consumer Keys/Secrets (`woo_consumer_key`, `woo_consumer_secret`)
- Wix API Keys (`wix_api_key`, `wix_refresh_token`)

#### Cloud Services
- AWS Access Key IDs (`aws_access_key_id`)
- AWS Secret Access Keys (`aws_secret_access_key`)
- S3 Bucket Names
- Postmark API Keys (`postmark_api_key`)
- Twilio Tokens (`twilio_token`, `twilio_sid`)
- SMTP Passwords (`smtp_pass`, `smtp_password`)

#### Monitoring
- Sentry DSN (`sentry_dsn`)
- Cloudflare API Tokens (`cloudflare_api_token`)

## Usage Examples

### Basic Sanitization

```typescript
import { sanitizeString, sanitizeObject } from '../utils/dataSanitizer';

// Sanitize strings
const input = 'api_key=sk_1234567890abcdef&user=john';
const sanitized = sanitizeString(input);
// Result: 'api_key=***REDACTED***&user=john'

// Sanitize objects
const data = {
  user: 'john',
  api_key: 'sk_1234567890abcdef',
  config: {
    jwt_secret: 'my-secret-key'
  }
};
const sanitizedData = sanitizeObject(data);
// Result: { user: 'john', api_key: '***REDACTED***', config: { jwt_secret: '***REDACTED***' } }
```

### Safe Logging

```typescript
import { logger, logSafeInfo, logConfigSafe } from '../utils/logger';

// Safe logging with automatic sanitization
logSafeInfo('User authentication', {
  user_id: '12345',
  api_key: 'sk_1234567890abcdef', // Will be automatically sanitized
  timestamp: new Date()
});

// Configuration logging
logConfigSafe('Configuration loaded', {
  environment: 'production',
  jwt_secret: 'my-secret-key', // Will be automatically sanitized
  services: ['database', 'auth']
});
```

### Environment Variable Sanitization

```typescript
import { sanitizeEnvironmentVariables } from '../utils/dataSanitizer';

const env = {
  NODE_ENV: 'production',
  JWT_SECRET: 'my-secret-key',
  MONGODB_URI: 'mongodb://user:pass@localhost:27017',
  API_KEY: 'sk_1234567890abcdef'
};

const sanitizedEnv = sanitizeEnvironmentVariables(env);
// Result: { NODE_ENV: 'production', JWT_SECRET: '***REDACTED***', ... }
```

### Error Sanitization

```typescript
import { sanitizeError } from '../utils/dataSanitizer';

const error = new Error('Connection failed: mongodb://user:password@localhost:27017');
const sanitizedError = sanitizeError(error);
// Result: Error message with sensitive data masked
```

## Security Features

### 1. Pattern Matching
- **Comprehensive regex patterns** for all common sensitive data types
- **Case-insensitive matching** to catch variations
- **Multiple format support** (key=value, JSON, etc.)

### 2. Field Name Protection
- **Sensitive field name detection** prevents accidental exposure
- **Automatic field masking** for known sensitive fields
- **Extensible pattern list** for new sensitive data types

### 3. Recursive Processing
- **Deep object sanitization** handles nested structures
- **Array processing** sanitizes array elements
- **Circular reference protection** prevents infinite loops

### 4. Safe Truncation
- **Length-based truncation** with sanitization
- **Context preservation** while removing sensitive data
- **Truncation indicators** show when data is cut off

## Testing

Comprehensive test suite covers:
- ✅ Pattern matching accuracy
- ✅ Object sanitization
- ✅ Edge cases (null, undefined, circular references)
- ✅ Performance with large objects
- ✅ Security against bypass attempts

Run tests:
```bash
npm test -- dataSanitizer.test.ts
```

## Configuration

### Adding New Sensitive Patterns

```typescript
// In dataSanitizer.ts
export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // Add new patterns
  { 
    pattern: /(new_service_key)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, 
    replacement: '$1=***REDACTED***', 
    description: 'New Service Keys' 
  },
  // ... existing patterns
];
```

### Adding New Sensitive Field Names

```typescript
// In dataSanitizer.ts
export const SENSITIVE_FIELD_NAMES = new Set([
  // Add new field names
  'new_service_key',
  'custom_secret',
  // ... existing field names
]);
```

## Best Practices

### 1. Always Use Safe Logging
```typescript
// ❌ Don't do this
logger.info('User data', { api_key: 'sk_123', password: 'secret' });

// ✅ Do this instead
logSafeInfo('User data', { api_key: 'sk_123', password: 'secret' });
```

### 2. Sanitize Before Logging
```typescript
// ❌ Don't do this
logger.error('Config error', process.env);

// ✅ Do this instead
logConfigSafe('Config error', process.env);
```

### 3. Use Appropriate Log Levels
```typescript
// Use logSafeInfo for general information
logSafeInfo('Service started', config);

// Use logSafeWarn for warnings
logSafeWarn('Service degraded', { error: 'connection_failed' });

// Use logSafeError for errors
logSafeError('Service failed', { error: 'critical_failure' });
```

### 4. Test Sanitization
```typescript
// Always test that sensitive data is properly masked
const testData = { api_key: 'sk_1234567890abcdef' };
const sanitized = sanitizeObject(testData);
expect(sanitized.api_key).toBe('***REDACTED***');
```

## Monitoring & Alerts

### Sensitive Data Detection
```typescript
import { containsSensitiveData, getSensitivePatterns } from '../utils/dataSanitizer';

// Check if data contains sensitive information
if (containsSensitiveData(userInput)) {
  const patterns = getSensitivePatterns(userInput);
  logger.warn('Sensitive data detected in input', { patterns });
}
```

### Audit Logging
```typescript
// Log sanitization events for audit purposes
logger.info('Data sanitization applied', {
  patternsFound: getSensitivePatterns(data),
  sanitizationLevel: 'full'
});
```

## Performance Considerations

- **Efficient regex patterns** minimize processing overhead
- **Early termination** for non-sensitive data
- **Caching** of compiled regex patterns
- **Batch processing** for multiple sanitization operations

## Compliance & Standards

This implementation helps meet:
- **GDPR** requirements for data protection
- **SOC 2** security controls
- **PCI DSS** data security standards
- **HIPAA** privacy requirements (where applicable)

## Future Enhancements

1. **Machine Learning Detection**: AI-powered sensitive data detection
2. **Custom Pattern Learning**: Automatic pattern discovery from logs
3. **Real-time Monitoring**: Live sensitive data detection
4. **Integration Testing**: Automated security testing for logging
5. **Performance Optimization**: Further optimization for high-volume logging

## Support

For questions or issues with data sanitization:
1. Check the test suite for usage examples
2. Review the pattern definitions in `dataSanitizer.ts`
3. Test your data with `containsSensitiveData()` before logging
4. Use the safe logging methods provided in `logger.ts`

---

**Security Note**: This sanitization system is designed to prevent accidental exposure of sensitive data in logs. It should be used in conjunction with other security measures and should not be relied upon as the sole protection mechanism.
