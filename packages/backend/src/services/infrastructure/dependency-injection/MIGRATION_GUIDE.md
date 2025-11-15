# Dependency Injection Migration Guide

## Overview

We've migrated from a custom DI container to **tsyringe**, a mature, type-safe dependency injection library for TypeScript. This provides better compile-time safety, decorator support, and industry-standard patterns.

## What Changed

### 1. Container Migration
- **Before**: Custom `DIContainer` class
- **After**: tsyringe's `container` with enhanced wrapper

### 2. Service Tokens
- **Before**: String-based tokens (`'ConfigService'`)
- **After**: Symbol-based tokens (`Symbol.for('ConfigService')`) for compile-time safety

### 3. Service Registration
- **Before**: Manual registration in `appBootstrap`
- **After**: Module-based registration with dependency ordering

## Using the New DI System

### Basic Service Registration

```typescript
import { injectable, inject, container } from 'tsyringe';
import { SERVICE_TOKENS } from './dependency-injection';

@injectable()
export class UserService {
  constructor(
    @inject(SERVICE_TOKENS.DATABASE_SERVICE) private db: DatabaseService,
    @inject(SERVICE_TOKENS.CACHE_SERVICE) private cache: CacheService
  ) {}
}

// Register as singleton
container.registerSingleton(SERVICE_TOKENS.USER_SERVICE, UserService);

// Resolve
const userService = container.resolve<UserService>(SERVICE_TOKENS.USER_SERVICE);
```

### Using Service Modules

Services can be registered through modules for better organization:

```typescript
// In a service module
export class UserServiceModule extends BaseServiceModule {
  readonly name = 'UserServiceModule';
  readonly dependencies = ['DatabaseModule', 'CacheModule'];

  register(container: DependencyContainer): void {
    container.registerSingleton(SERVICE_TOKENS.USER_SERVICE, UserService);
  }
}
```

### Symbol-Based Tokens

All service tokens are now symbols for compile-time safety:

```typescript
export const SERVICE_TOKENS = {
  USER_SERVICE: Symbol.for('UserService'),
  DATABASE_SERVICE: Symbol.for('DatabaseService'),
  // ...
} as const;
```

## Migration Steps for Existing Services

### Step 1: Add @injectable Decorator

```typescript
// Before
export class AuthService {
  constructor(private db: DatabaseService) {}
}

// After
import { injectable, inject } from 'tsyringe';
import { SERVICE_TOKENS } from '../dependency-injection';

@injectable()
export class AuthService {
  constructor(
    @inject(SERVICE_TOKENS.DATABASE_SERVICE) private db: DatabaseService
  ) {}
}
```

### Step 2: Update Service Registration

```typescript
// Before
container.registerInstance(SERVICE_TOKENS.AUTH_SERVICE, authService);

// After (if using @injectable)
container.registerSingleton(SERVICE_TOKENS.AUTH_SERVICE, AuthService);

// Or keep as instance if service is already instantiated
Container.registerInstance(SERVICE_TOKENS.AUTH_SERVICE, authService);
```

### Step 3: Update Service Resolution

```typescript
// Before
const authService = container.resolve<AuthService>(SERVICE_TOKENS.AUTH_SERVICE);

// After (same, but now type-safe with symbols)
const authService = container.resolve<AuthService>(SERVICE_TOKENS.AUTH_SERVICE);
```

## Module-Based Registration

### Creating a Service Module

```typescript
import { BaseServiceModule } from '../dependency-injection/modules';
import { DependencyContainer } from 'tsyringe';
import { SERVICE_TOKENS } from '../dependency-injection';

export class MyServiceModule extends BaseServiceModule {
  readonly name = 'MyServiceModule';
  readonly dependencies = ['ConfigModule'];

  register(container: DependencyContainer): void {
    container.registerSingleton(SERVICE_TOKENS.MY_SERVICE, MyService);
  }

  async initialize(container: DependencyContainer): Promise<void> {
    // Optional: Initialize services after registration
  }
}
```

### Registering Modules

Modules are automatically registered in `appBootstrap`:

```typescript
serviceModuleRegistry.registerAll([
  new InfrastructureServiceModule(),
  new AuthServiceModule(),
  new BusinessServiceModule(),
  // ...
]);
```

## Benefits

1. **Compile-Time Safety**: Symbol-based tokens prevent typos
2. **Type Safety**: Full TypeScript support with generics
3. **Decorator Support**: Clean, declarative service definitions
4. **Lazy Loading**: Services are instantiated on first use
5. **Better Testability**: Easy to mock and replace services
6. **Industry Standard**: tsyringe is widely used and maintained

## Backward Compatibility

The migration maintains backward compatibility:
- Existing `registerInstance` calls still work
- Services can be migrated incrementally
- Old and new patterns can coexist

## Next Steps

1. Gradually migrate services to use `@injectable` decorator
2. Move service registration to appropriate modules
3. Update tests to use tsyringe's container mocking
4. Remove old custom DI container code (once all services migrated)

