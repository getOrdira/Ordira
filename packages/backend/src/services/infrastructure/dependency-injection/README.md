# Enhanced Dependency Injection Container

## Overview

This is an enhanced DI container with modern features for 2025 best practices:

- ✅ Constructor parameter injection
- ✅ Service lifecycle hooks (onInit, onDestroy)
- ✅ Scoped services (singleton, transient, request-scoped)
- ✅ Circular dependency detection
- ✅ Type-safe service resolution
- ✅ Decorator support (@Injectable, @Inject)

## Usage

### Basic Registration

```typescript
import { container, SERVICE_TOKENS } from './dependency-injection';

// Register a service
container.register(
  SERVICE_TOKENS.USER_SERVICE,
  UserService,
  {
    scope: 'singleton',
    dependencies: [SERVICE_TOKENS.DATABASE_SERVICE]
  }
);

// Resolve a service
const userService = container.resolve<UserService>(SERVICE_TOKENS.USER_SERVICE);
```

### Using Decorators

```typescript
import { Injectable, Inject } from './dependency-injection';
import { SERVICE_TOKENS } from './dependency-injection';

@Injectable({
  token: SERVICE_TOKENS.USER_SERVICE,
  scope: 'singleton'
})
export class UserService {
  constructor(
    @Inject(SERVICE_TOKENS.DATABASE_SERVICE) private db: DatabaseService,
    @Inject(SERVICE_TOKENS.CACHE_SERVICE) private cache: CacheService
  ) {}
}
```

### Service Scopes

#### Singleton (default)
```typescript
container.register(SERVICE_TOKENS.USER_SERVICE, UserService, {
  scope: 'singleton' // One instance for the entire application
});
```

#### Transient
```typescript
container.register(SERVICE_TOKENS.USER_SERVICE, UserService, {
  scope: 'transient' // New instance on every resolve
});
```

#### Request-Scoped
```typescript
container.register(SERVICE_TOKENS.USER_SERVICE, UserService, {
  scope: 'request' // One instance per request
});

// Resolve with request ID
const userService = container.resolve<UserService>(
  SERVICE_TOKENS.USER_SERVICE,
  requestId
);

// Clear request scope after request completes
container.clearRequestScope(requestId);
```

### Lifecycle Hooks

```typescript
container.register(SERVICE_TOKENS.USER_SERVICE, UserService, {
  scope: 'singleton',
  lifecycle: {
    onInit: async (instance) => {
      await instance.initialize();
    },
    onDestroy: async (instance) => {
      await instance.cleanup();
    }
  }
});
```

### Type-Safe Service Registry

```typescript
import { ServiceRegistry, resolveService } from './dependency-injection';

// Register
ServiceRegistry.register(SERVICE_TOKENS.USER_SERVICE, UserService, {
  dependencies: [SERVICE_TOKENS.DATABASE_SERVICE]
});

// Resolve
const userService = resolveService<UserService>(SERVICE_TOKENS.USER_SERVICE);
```

## Migration from Legacy Container

### Before (Legacy)
```typescript
container.registerInstance(SERVICE_TOKENS.USER_SERVICE, new UserService());
```

### After (Enhanced)
```typescript
// Option 1: Register with dependencies
container.register(
  SERVICE_TOKENS.USER_SERVICE,
  UserService,
  {
    dependencies: [SERVICE_TOKENS.DATABASE_SERVICE]
  }
);

// Option 2: Use decorators
@Injectable({ token: SERVICE_TOKENS.USER_SERVICE })
export class UserService {
  constructor(
    @Inject(SERVICE_TOKENS.DATABASE_SERVICE) private db: DatabaseService
  ) {}
}
```

## Features

### Circular Dependency Detection

The container automatically detects circular dependencies:

```typescript
// Service A depends on Service B
container.register('ServiceA', ServiceA, {
  dependencies: ['ServiceB']
});

// Service B depends on Service A (circular!)
container.register('ServiceB', ServiceB, {
  dependencies: ['ServiceA']
});

// This will throw: "Circular dependency detected: ServiceA -> ServiceB -> ServiceA"
container.resolve('ServiceA');
```

### Child Containers

Create isolated child containers for testing:

```typescript
const childContainer = container.createChild();
// Child inherits all registrations but can override them
```

## Best Practices

1. **Use Type-Safe Tokens**: Always use `SERVICE_TOKENS` constants
2. **Declare Dependencies**: Explicitly list dependencies for better error messages
3. **Use Scopes Appropriately**: 
   - Singleton for stateless services
   - Transient for stateful services
   - Request-scoped for request-specific data
4. **Lifecycle Hooks**: Use onInit/onDestroy for cleanup and initialization
5. **Avoid Circular Dependencies**: Design services with clear dependency hierarchies

