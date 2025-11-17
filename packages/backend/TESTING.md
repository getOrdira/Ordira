# Comprehensive Testing Guide for Ordira Backend

## Overview

This document provides a comprehensive guide to testing the Ordira backend application. We have implemented multiple layers of testing to ensure reliability, security, and maintainability.

## Testing Architecture

### 1. Unit Tests
- **Location**: `src/**/__tests__/**/*.test.ts`
- **Purpose**: Test individual functions, methods, and classes in isolation
- **Coverage**: Services, utilities, middleware, and business logic
- **Framework**: Jest with TypeScript support

### 2. Integration Tests
- **Location**: `src/__tests__/integration/**/*.test.ts`
- **Purpose**: Test API endpoints and database interactions
- **Coverage**: Full request/response cycles, database operations
- **Framework**: Jest with Supertest for HTTP testing

### 3. End-to-End Tests
- **Location**: `test-backend-comprehensive.ps1`
- **Purpose**: Test complete user workflows against live/staging environment
- **Coverage**: Full application functionality, performance, security
- **Framework**: PowerShell with REST API calls

## Test Categories

### Authentication Tests
- User registration (business, manufacturer, user)
- Login/logout flows
- Password reset functionality
- JWT token management
- Rate limiting
- Security validations

### Data Sanitization Tests
- Sensitive data masking
- Log sanitization
- Error message sanitization
- Request/response sanitization
- Environment variable sanitization

### API Endpoint Tests
- CRUD operations
- Validation
- Error handling
- Response formatting
- Status codes

### Security Tests
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Input validation

### Performance Tests
- Response time validation
- Memory usage monitoring
- Database query optimization
- Concurrent request handling

## Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:auth
npm run test:sanitization

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e
```

### PowerShell Test Runner

```powershell
# Run all test suites
.\run-tests.ps1 -TestType all

# Run specific test type
.\run-tests.ps1 -TestType unit
.\run-tests.ps1 -TestType integration
.\run-tests.ps1 -TestType auth
.\run-tests.ps1 -TestType sanitization
.\run-tests.ps1 -TestType e2e

# Run with coverage
.\run-tests.ps1 -TestType all -Coverage

# Run with verbose output
.\run-tests.ps1 -TestType all -Verbose

# Run in watch mode
.\run-tests.ps1 -TestType unit -Watch
```

### Comprehensive E2E Testing

```powershell
# Basic comprehensive test
.\test-backend-comprehensive.ps1

# Test with custom parameters
.\test-backend-comprehensive.ps1 -BaseUrl "https://your-api.com" -TestEmail "test@example.com" -Verbose

# Skip rate limit tests (faster execution)
.\test-backend-comprehensive.ps1 -SkipRateLimitTests
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/__tests__/**',
    '!src/index.ts',
    '!src/config/**',
    '!src/types/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/utils/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true
};
```

### Test Environment Setup
- **Database**: MongoDB test instance
- **Environment Variables**: Test-specific configuration
- **Mocking**: External services and dependencies
- **Cleanup**: Automatic test data cleanup

## Test Utilities

### Test Helpers (`src/utils/__tests__/testHelpers.ts`)

#### Mock Creators
```typescript
// Create mock request/response
const req = createMockRequest({ method: 'POST', body: { test: 'data' } });
const res = createMockResponse();
const next = createMockNext();

// Create authenticated request
const authReq = createAuthenticatedRequest('business', 'user123');
```

#### Test Data Creators
```typescript
// Create test data
const businessData = createTestBusiness({ email: 'test@business.com' });
const manufacturerData = createTestManufacturer({ name: 'Test MFG' });
const userData = createTestUser({ firstName: 'Test' });

// Create data in database
const business = await createTestBusinessInDB();
const manufacturer = await createTestManufacturerInDB();
const user = await createTestUserInDB();
```

#### Assertion Helpers
```typescript
// Response assertions
expectSuccessResponse(res, 200);
expectErrorResponse(res, 400, 'Validation error');
expectValidationError(res, 'email');

// Authentication assertions
expectAuthenticatedRequest(req, 'business', 'user123');
expectUnauthenticatedRequest(req);
```

## Writing Tests

### Unit Test Example
```typescript
describe('DataSanitizer', () => {
  describe('sanitizeString', () => {
    it('should sanitize API keys', () => {
      const input = 'api_key=sk_1234567890abcdef';
      const result = sanitizeString(input);
      expect(result).toContain('***REDACTED***');
    });
  });
});
```

### Integration Test Example
```typescript
describe('Authentication Integration', () => {
  it('should register and login business', async () => {
    // Register
    const registerResponse = await request(app)
      .post('/api/auth/register/business')
      .send(businessData)
      .expect(201);

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login/business')
      .send(loginData)
      .expect(200);

    expect(loginResponse.body.token).toBeDefined();
  });
});
```

### E2E Test Example
```powershell
# Test business registration flow
$businessData = @{
    email = "testbusiness@example.com"
    password = "TestPass123!"
    businessName = "Test Business"
    industry = "Technology"
}

$response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/register/business" -Method POST -Body ($businessData | ConvertTo-Json) -ContentType "application/json"
Write-TestResult -TestName "Business Registration" -Passed $true -Message "Business registered successfully"
```

## Test Data Management

### Database Cleanup
- Automatic cleanup after each test
- Isolated test data
- No test interference

### Mock Data
- Consistent test data
- Realistic scenarios
- Edge case coverage

### Environment Isolation
- Test-specific environment variables
- Mocked external services
- Isolated test database

## Coverage Requirements

### Minimum Coverage Targets
- **Unit Tests**: 80% code coverage
- **Integration Tests**: 90% API endpoint coverage
- **E2E Tests**: 100% critical user flows

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Continuous Integration

### GitHub Actions Integration
```yaml
name: Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:all
      - run: npm run test:coverage
```

## Debugging Tests

### Common Issues
1. **Database Connection**: Ensure test database is running
2. **Environment Variables**: Check test environment setup
3. **Async Operations**: Use proper async/await patterns
4. **Mocking**: Verify mock implementations

### Debug Commands
```bash
# Run specific test file
npm test -- --testPathPattern=auth.service.test.ts

# Run with debug output
npm test -- --verbose

# Run single test
npm test -- --testNamePattern="should register business"
```

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Test Data
- Use factory functions for test data
- Clean up test data after each test
- Use realistic test scenarios

### Assertions
- Use specific assertions
- Test both success and failure cases
- Verify side effects

### Performance
- Keep tests fast and isolated
- Use mocks for external dependencies
- Avoid unnecessary database operations

## Monitoring and Reporting

### Test Results
- Detailed test reports
- Coverage metrics
- Performance benchmarks
- Security scan results

### Continuous Monitoring
- Automated test execution
- Regression detection
- Performance monitoring
- Security vulnerability scanning

## Troubleshooting

### Common Problems
1. **Test Timeouts**: Increase timeout in jest.config.js
2. **Database Issues**: Check MongoDB connection
3. **Environment Variables**: Verify test environment setup
4. **Mock Failures**: Check mock implementations

### Getting Help
- Check test logs for detailed error messages
- Review test setup and configuration
- Verify dependencies and versions
- Consult this documentation

---

## Quick Reference

### Essential Commands
```bash
npm run test:all          # Run all tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:coverage     # Run with coverage report
npm run test:watch        # Run in watch mode
```

### PowerShell Commands
```powershell
.\run-tests.ps1 -TestType all -Coverage -Verbose
.\test-backend-comprehensive.ps1 -Verbose
```

### Test Files
- `src/utils/__tests__/setup.ts` - Test setup
- `src/utils/__tests__/testHelpers.ts` - Test utilities
- `src/utils/__tests__/dataSanitizer.test.ts` - Data sanitization tests
- `src/middleware/__tests__/unifiedAuth.middleware.test.ts` - Auth middleware tests
- `src/services/__tests__/auth.service.test.ts` - Auth service tests
- `src/__tests__/integration/auth.integration.test.ts` - Auth integration tests
- `test-backend-comprehensive.ps1` - Comprehensive E2E tests
- `run-tests.ps1` - Test runner script
