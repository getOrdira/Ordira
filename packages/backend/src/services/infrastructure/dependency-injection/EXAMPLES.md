# Service Migration Examples

## What Needs to Change

When migrating services to tsyringe, you need to update:

1. **Service Class**: Add `@injectable()` decorator and inject dependencies via constructor
2. **Dependencies**: Replace direct imports with constructor injection
3. **Registration**: Register the service in DI container (module or appBootstrap)
4. **Consumers**: Update code that uses the service to resolve from container

## Example: AuthBaseService Migration

### BEFORE (Current Implementation)

```typescript
// ❌ Direct imports - tight coupling
import { UtilsService } from '../../infrastructure/shared';
import { enhancedCacheService } from '../../external/enhanced-cache.service';

export class AuthBaseService {
  // Directly uses imported services
  async someMethod() {
    const code = UtilsService.generateCode();
    await enhancedCacheService.cacheUser(...);
  }
}

// ❌ Singleton export - hard to test/mock
export const authBaseService = new AuthBaseService();
```

**Problems:**
- Tight coupling to specific implementations
- Hard to test (can't easily mock dependencies)
- Direct imports create hidden dependencies
- Singleton makes it hard to replace in tests

### AFTER (With tsyringe)

```typescript
// ✅ Import tsyringe decorators
import { injectable, inject } from 'tsyringe';
import { SERVICE_TOKENS } from '../../infrastructure/dependency-injection';

// ✅ Add @injectable decorator
@injectable()
export class AuthBaseService {
  // ✅ Inject dependencies through constructor
  constructor(
    @inject(SERVICE_TOKENS.UTILS_SERVICE) private utilsService: UtilsService,
    @inject(SERVICE_TOKENS.CACHE_SERVICE) private cacheService: any // or proper type
  ) {}

  // ✅ Use injected dependencies
  async someMethod() {
    const code = this.utilsService.generateCode();
    await this.cacheService.cacheUser(...);
  }
}

// ✅ Remove singleton export (or keep for backward compatibility during migration)
// export const authBaseService = new AuthBaseService(); // Remove this
```

**Benefits:**
- ✅ Loose coupling - dependencies are injected
- ✅ Easy to test - can inject mocks
- ✅ Explicit dependencies - constructor shows what's needed
- ✅ Flexible - can swap implementations

### Registration

Register the service in a module or appBootstrap:

```typescript
// In auth.module.ts or appBootstrap
import { container } from 'tsyringe';
import { SERVICE_TOKENS } from '../dependency-injection';
import { AuthBaseService } from '../../../auth/base/authBase.service';

// Register as singleton
container.registerSingleton(SERVICE_TOKENS.AUTH_BASE_SERVICE, AuthBaseService);
```

### Usage

```typescript
// ✅ Resolve from container
import { container } from 'tsyringe';
import { SERVICE_TOKENS } from '../dependency-injection';

const authBaseService = container.resolve<AuthBaseService>(SERVICE_TOKENS.AUTH_BASE_SERVICE);
```

## Step-by-Step Migration Guide

### Step 1: Add Service Token

Add to `serviceTokens.ts`:

```typescript
export const SERVICE_TOKENS = {
  // ... existing tokens
  AUTH_BASE_SERVICE: Symbol.for('AuthBaseService'),
  ENHANCED_CACHE_SERVICE: Symbol.for('EnhancedCacheService'),
  // ...
} as const;
```

### Step 2: Update Service Class

1. Add `@injectable()` decorator
2. Add constructor with `@inject()` parameters
3. Replace direct service usage with `this.serviceName`
4. Remove singleton export (or keep temporarily for backward compatibility)

### Step 3: Register Service

Either in a module:

```typescript
// auth.module.ts
register(container: DependencyContainer): void {
  container.registerSingleton(SERVICE_TOKENS.AUTH_BASE_SERVICE, AuthBaseService);
}
```

Or in appBootstrap:

```typescript
Container.registerSingleton(SERVICE_TOKENS.AUTH_BASE_SERVICE, AuthBaseService);
```

### Step 4: Update Consumers

Find all places that import/use the service:

```typescript
// ❌ Before
import { authBaseService } from './auth/base/authBase.service';
authBaseService.someMethod();

// ✅ After
import { container } from 'tsyringe';
import { SERVICE_TOKENS } from '../dependency-injection';
const authBaseService = container.resolve<AuthBaseService>(SERVICE_TOKENS.AUTH_BASE_SERVICE);
authBaseService.someMethod();
```

## Migration Strategy

### Option 1: Gradual Migration (Recommended)

1. Add `@injectable()` and constructor injection
2. Keep singleton export for backward compatibility
3. Register in DI container
4. Gradually update consumers to use DI
5. Remove singleton export once all consumers migrated

### Option 2: Complete Migration

1. Migrate service fully
2. Update all consumers at once
3. Remove singleton export

## Common Patterns

### Injecting Multiple Dependencies

```typescript
@injectable()
export class MyService {
  constructor(
    @inject(SERVICE_TOKENS.DATABASE_SERVICE) private db: DatabaseService,
    @inject(SERVICE_TOKENS.CACHE_SERVICE) private cache: CacheService,
    @inject(SERVICE_TOKENS.LOGGER) private logger: Logger
  ) {}
}
```

### Optional Dependencies

```typescript
import { inject, injectable, optional } from 'tsyringe';

@injectable()
export class MyService {
  constructor(
    @inject(SERVICE_TOKENS.REQUIRED_SERVICE) private required: RequiredService,
    @optional() @inject(SERVICE_TOKENS.OPTIONAL_SERVICE) private optional?: OptionalService
  ) {}
}
```

### Service Extending Another Service

```typescript
@injectable()
export class UserAuthService extends AuthBaseService {
  constructor(
    @inject(SERVICE_TOKENS.UTILS_SERVICE) utilsService: UtilsService,
    @inject(SERVICE_TOKENS.CACHE_SERVICE) cacheService: any
  ) {
    // Pass dependencies to parent
    super(utilsService, cacheService);
  }
}
```

## Testing Benefits

With DI, testing becomes much easier:

```typescript
// In tests
import { container } from 'tsyringe';

// Mock dependencies
const mockCache = { cacheUser: jest.fn() };
container.registerInstance(SERVICE_TOKENS.CACHE_SERVICE, mockCache);

// Resolve service (will use mocked dependencies)
const authService = container.resolve<AuthBaseService>(SERVICE_TOKENS.AUTH_BASE_SERVICE);

// Test
await authService.someMethod();
expect(mockCache.cacheUser).toHaveBeenCalled();
```

