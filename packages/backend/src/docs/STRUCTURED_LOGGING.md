# Structured Logging Implementation

## 🎯 Overview

This document describes the structured logging system implemented in the B2B backend to replace console statements with machine-readable, searchable logs.

## 🚀 Quick Start

### 1. Run Migration
```bash
npm run logging:setup
```

### 2. Import Logger
```typescript
import { logger } from '../utils/logger';
```

### 3. Replace Console Statements
```typescript
// Before
console.log('User login successful');
console.error('Database error', error);

// After
logger.info('User login successful', { userId: 'user123' });
logger.error('Database error', { operation: 'create_user' }, error);
```

## 📋 Features

### ✅ What's Included

- **Structured JSON Logging** - Machine-readable format
- **Contextual Information** - User, business, request context
- **Performance Tracking** - Built-in timing utilities
- **Error Classification** - Different log levels for different error types
- **Security Event Logging** - Special handling for security events
- **Request/Response Logging** - Automatic HTTP request logging
- **Environment Configuration** - Different settings per environment
- **Migration Script** - Automated console statement replacement

### 🔧 Configuration

Set these environment variables:

```bash
# Log Level (error, warn, info, debug, trace)
LOG_LEVEL=info

# Enable console logging
LOG_CONSOLE=true

# Enable file logging
LOG_FILE=false

# Log format (json/pretty)
LOG_FORMAT=json
```

## 📊 Log Structure

### Standard Log Entry
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "User login successful",
  "event": "auth.login.success",
  "context": {
    "userId": "user123",
    "businessId": "business456",
    "ip": "192.168.1.1",
    "endpoint": "/api/auth/login",
    "method": "POST",
    "requestId": "req-abc123"
  },
  "service": "b2b-backend",
  "version": "1.0.0",
  "environment": "production"
}
```

### Error Log Entry
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "error",
  "message": "Database connection failed",
  "context": {
    "userId": "user123",
    "operation": "create_user",
    "endpoint": "/api/users"
  },
  "error": {
    "name": "MongoError",
    "message": "Connection timeout",
    "stack": "MongoError: Connection timeout\n    at...",
    "code": "ETIMEDOUT"
  },
  "service": "b2b-backend",
  "version": "1.0.0",
  "environment": "production"
}
```

## 🛠️ Usage Examples

### Basic Logging
```typescript
import { logger } from '../utils/logger';

// Basic messages
logger.info('Application started');
logger.warn('Rate limit approaching');
logger.error('Critical error occurred');

// With context
logger.info('User created', {
  userId: 'user123',
  businessId: 'business456',
  email: 'user@example.com'
});
```

### Business Events
```typescript
// Authentication events
logger.logAuthEvent('login_successful', {
  userId: 'user123',
  method: 'email_password',
  ip: '192.168.1.1'
});

// Business events
logger.logBusinessEvent('product_created', {
  businessId: 'business456',
  productId: 'product789',
  category: 'electronics'
});

// API events
logger.logApiEvent('rate_limit_exceeded', {
  userId: 'user123',
  endpoint: '/api/products',
  limit: 100
});

// Security events
logger.logSecurityEvent('suspicious_login_attempt', {
  ip: '192.168.1.1',
  attempts: 5,
  blocked: true
});
```

### Performance Tracking
```typescript
import { PerformanceTimer } from '../utils/logger';

const timer = new PerformanceTimer('database_query', { 
  collection: 'users' 
});

// Perform operation
await databaseOperation();

// Log performance
timer.end(); // Automatically logs performance data
```

### Error Handling
```typescript
import { withErrorLogging } from '../utils/logger';

const createUser = withErrorLogging(async (userData: any) => {
  // User creation logic
  return { id: 'new-user-id' };
}, { operation: 'create_user' });
```

### Request Logging Middleware
```typescript
import { requestLoggingMiddleware } from '../utils/logger';

app.use(requestLoggingMiddleware);
```

## 🔍 Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `error` | Critical errors that need immediate attention | Database connection failures |
| `warn` | Warning conditions that should be monitored | Rate limit exceeded |
| `info` | General information about application flow | User login successful |
| `debug` | Detailed information for debugging | SQL query executed |
| `trace` | Very detailed information for deep debugging | Function entry/exit |

## 🎯 Event Types

### Authentication Events
- `auth.login.success`
- `auth.login.failed`
- `auth.logout`
- `auth.token.expired`
- `auth.permission.denied`

### Business Events
- `business.user.created`
- `business.product.created`
- `business.order.processed`
- `business.payment.completed`

### API Events
- `api.request.received`
- `api.response.sent`
- `api.rate_limit.exceeded`
- `api.validation.failed`

### Security Events
- `security.suspicious_activity`
- `security.brute_force_attempt`
- `security.unauthorized_access`
- `security.data_breach_attempt`

## 📈 Benefits

### 1. **Searchability**
```bash
# Find all login failures
grep '"event":"auth.login.failed"' logs/app.log

# Find errors for specific user
grep '"userId":"user123"' logs/app.log | grep '"level":"error"'
```

### 2. **Monitoring Integration**
- **ELK Stack** - Elasticsearch, Logstash, Kibana
- **Datadog** - Cloud monitoring platform
- **New Relic** - Application performance monitoring
- **Grafana** - Visualization and alerting

### 3. **Debugging**
- **Request Tracing** - Follow requests across services
- **Performance Analysis** - Identify slow operations
- **Error Correlation** - Link errors to specific users/requests

### 4. **Compliance**
- **Audit Trails** - Complete user action history
- **Security Monitoring** - Detect suspicious activities
- **Data Protection** - Sensitive data filtering

## 🚨 Migration Notes

### Before Migration
```typescript
console.log('User login successful');
console.error('Database error', error);
console.warn('Rate limit exceeded');
```

### After Migration
```typescript
logger.info('User login successful', { userId: 'user123' });
logger.error('Database error', { operation: 'create_user' }, error);
logger.warn('Rate limit exceeded', { userId: 'user123', limit: 100 });
```

### Migration Script Features
- ✅ Automatically finds console statements
- ✅ Adds logger imports
- ✅ Preserves existing context
- ✅ Handles different console methods
- ✅ Excludes test files
- ✅ Creates backup before changes

## 🔧 Advanced Configuration

### Custom Log Context
```typescript
interface CustomContext {
  userId?: string;
  businessId?: string;
  operation?: string;
  duration?: number;
  customField?: string;
}

logger.info('Custom operation', {
  userId: 'user123',
  operation: 'custom_operation',
  customField: 'custom_value'
} as CustomContext);
```

### Environment-Specific Settings
```typescript
// Development
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_INCLUDE_STACK=true

// Production
LOG_LEVEL=info
LOG_FORMAT=json
LOG_INCLUDE_STACK=false
LOG_FILE=true
```

## 📚 Integration Examples

### Express Middleware
```typescript
import { requestLoggingMiddleware } from '../utils/logger';

app.use(requestLoggingMiddleware);
```

### Error Handler
```typescript
import { errorHandler } from '../middleware/error.middleware.updated';

app.use(errorHandler);
```

### Database Operations
```typescript
import { logDatabaseOperation } from '../utils/logger';

const result = await logDatabaseOperation('create', 'users', async () => {
  return await User.create(userData);
});
```

## 🎉 Next Steps

1. **Run Migration**: `npm run logging:setup`
2. **Review Changes**: Check migrated files
3. **Test Application**: Ensure logging works correctly
4. **Configure Monitoring**: Set up log aggregation
5. **Create Dashboards**: Build monitoring dashboards
6. **Set Up Alerts**: Configure error notifications

## 📞 Support

For questions or issues with structured logging:
- Check the examples in `src/examples/structured-logging-examples.ts`
- Review the configuration in `src/config/logging.config.ts`
- Run the migration script: `npm run migrate:logging`

