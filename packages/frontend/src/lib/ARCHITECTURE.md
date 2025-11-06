# Frontend Library Architecture

## Overview

The `/lib` folder contains organized modules for different concerns:

- **`/types`** - TypeScript type definitions (compile-time only)
- **`/api`** - API client functions (runtime HTTP calls)
- **`/auth`** - Authentication utilities (session, guards, helpers)
- **`/blockchain`** - Web3/blockchain integration
- **`/validation`** - Validation schemas (Joi, Zod)
- **`/utils`** - General utility functions

---

## `/lib/types` vs `/lib/api`

### `/lib/types` - Type Definitions (Compile-Time)

**Purpose:** Define the **shape/structure** of data

**What it contains:**
- TypeScript interfaces and types
- Data structures (what fields objects have)
- Request/response shapes
- Type-only code (stripped at runtime)

**Example:**
```typescript
// lib/types/auth.ts
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

**Used for:**
- Type checking at compile time
- IntelliSense/autocomplete
- Documentation (what data looks like)
- Ensuring type safety across the app

**Does NOT:**
- ❌ Make HTTP requests
- ❌ Contain runtime code
- ❌ Execute any logic

---

### `/lib/api` - API Client Functions (Runtime)

**Purpose:** Make **actual HTTP requests** to backend routes

**What it contains:**
- Functions that call backend endpoints
- HTTP request logic (axios/fetch)
- Response handling
- Error handling
- Token management

**Example:**
```typescript
// lib/api/auth.ts
import { LoginCredentials } from '@/lib/types/auth'; // Uses types!

export const authApi = {
  loginUser: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Makes actual HTTP POST request
    const response = await api.post('/auth/login/user', credentials);
    return response.data;
  }
}
```

**Used for:**
- ✅ Making HTTP requests to backend
- ✅ Executing API calls
- ✅ Handling responses/errors
- ✅ Managing authentication tokens

---

## How They Work Together

### The Flow:

```
1. Types define the contract
   ↓
2. API functions use types to ensure type safety
   ↓
3. Hooks/components use API functions
   ↓
4. Backend receives typed requests
   ↓
5. Backend returns typed responses
```

### Example Flow:

```typescript
// 1. TYPES define the shape
// lib/types/auth.ts
export interface LoginCredentials {
  email: string;
  password: string;
}

// 2. API uses types
// lib/api/auth.ts
import { LoginCredentials } from '@/lib/types/auth';

export const authApi = {
  loginUser: async (credentials: LoginCredentials) => {
    // TypeScript ensures credentials matches LoginCredentials
    const response = await api.post('/auth/login/user', credentials);
    return response.data;
  }
}

// 3. Hook uses API function
// hooks/use-auth.ts
import { authApi } from '@/lib/api/auth';
import { LoginCredentials } from '@/lib/types/auth';

export function useAuth() {
  const login = async (credentials: LoginCredentials) => {
    // TypeScript ensures we pass correct data
    return await authApi.loginUser(credentials);
  }
}

// 4. Component uses hook
// components/LoginForm.tsx
import { useAuth } from '@/hooks/use-auth';
import { LoginCredentials } from '@/lib/types/auth';

function LoginForm() {
  const { login } = useAuth();
  
  const handleSubmit = (data: LoginCredentials) => {
    login(data); // Type-safe!
  }
}
```

---

## Folder Responsibilities

### `/lib/types`
**Single Source of Truth:** All type definitions
- Re-exports from backend types
- Frontend-specific type extensions
- Shared type definitions

### `/lib/api`
**API Communication Layer:** All HTTP requests
- Calls backend routes
- Uses types for request/response validation
- Handles errors and responses
- Manages authentication headers

### `/lib/auth`
**Authentication Utilities:** Session & security
- Token storage/retrieval
- Session management
- Auth guards/checks
- User state helpers

### `/lib/blockchain`
**Web3 Integration:** Blockchain functionality
- Wallet connections
- Contract interactions
- Certificate minting
- Token operations

### `/lib/validation`
**Data Validation:** Input validation schemas
- Joi/Zod schemas
- Form validation
- Request validation

### `/lib/utils`
**General Utilities:** Helper functions
- Common helpers
- Formatters
- Transformers

---

## Key Differences Summary

| Aspect | `/lib/types` | `/lib/api` |
|--------|---------------|------------|
| **Purpose** | Define data shapes | Make HTTP requests |
| **Runtime** | Stripped out (compile-time only) | Executes at runtime |
| **Contains** | Interfaces, types | Functions, HTTP calls |
| **Used by** | Everything (for type safety) | Hooks, components |
| **Backend** | Tells backend what to expect | Actually calls backend |
| **Example** | `interface User { id: string }` | `getUser(id: string): Promise<User>` |

---

## Best Practices

1. **Types First** - Define types before creating API functions
2. **Import Types in API** - API functions should import and use types
3. **Single Source** - Types come from backend, re-exported in `/lib/types`
4. **Type Safety** - Use types everywhere to catch errors at compile time
5. **API Layer** - Keep all HTTP logic in `/lib/api`, not in components/hooks

---

## Migration Pattern

When migrating to backend types:

1. **Re-export backend types** in `/lib/types/[domain].ts`
2. **Update API functions** to use re-exported types
3. **Keep existing imports** working (`@/lib/types/*`)
4. **Add frontend extensions** only when needed

