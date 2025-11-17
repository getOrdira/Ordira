# Testing Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install --save-dev mongodb-memory-server@10.1.3 ioredis-mock@8.11.0 aws-sdk-mock@5.8.0
   ```

2. **Create `.env.test` file:**
   ```bash
   cp .env.test.example .env.test
   # Edit .env.test with your test configuration
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

## Test Structure

All tests are organized in `src/_test_/`:

- **`controllers/`** - Controller unit tests
- **`middleware/`** - Middleware unit tests  
- **`models/`** - Model unit tests (schema, indexes, methods)
- **`routes/`** - Route integration tests
- **`services/`** - Service unit tests
- **`factories/`** - Test data factories
- **`utils/`** - Test utilities (app, mongo, redis)

## Example Test Files

- `models/user.model.spec.ts` - Model unit tests
- `services/auth.service.spec.ts` - Service unit tests
- `controllers/auth.controller.spec.ts` - Controller unit tests
- `middleware/auth.middleware.spec.ts` - Middleware unit tests
- `routes/auth.routes.int.spec.ts` - API integration tests

## Key Features

✅ **MongoDB Memory Server** - Isolated in-memory databases per test
✅ **Redis Mock** - In-memory Redis for caching tests
✅ **Test App Factory** - Real Express app with test configuration
✅ **Factory Helpers** - Easy test data generation
✅ **No Placeholders** - All tests use real imports and implementations
✅ **Full Isolation** - Each test file gets fresh DB/Redis

## Coverage Goals

- **Overall**: 80%+
- **Critical Modules**: 90%+
  - Auth service
  - Payment processing
  - Security middleware
  - User management

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Troubleshooting

See `src/_test_/README.md` for detailed troubleshooting and best practices.

