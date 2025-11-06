# Frontend Types Architecture

## Simplified Structure (Matches Backend Patterns)

### Backend Analysis

**Most domains:** Single types file
- `auth/types/authTypes.service.ts` → **1 file**
- `users/utils/types.ts` → **1 file**
- `products/utils/types.ts` → **1 file**
- `supplyChain/utils/types.ts` → **1 file**
- `votes/utils/types.ts` → **1 file**
- `subscriptions/utils/types.ts` → **1 file**

**Notifications:** Multiple files (exception)
- `notifications/types/` → **11 files** (category, event, recipient, etc.)

---

## Proposed Frontend Structure

### Simple Structure: Single File Per Domain

```
frontend/src/lib/types/
├── core/
│   ├── common.ts              # Shared: ApiResponse, PaginatedResponse
│   ├── errors.ts              # Error types
│   └── index.ts
│
├── features/
│   ├── auth/
│   │   ├── authTypes.ts       # Re-export from @backend/services/auth/types/authTypes.service
│   │   └── index.ts
│   │
│   ├── users/
│   │   ├── userTypes.ts       # Re-export from @backend/services/users/utils/types
│   │   └── index.ts
│   │
│   ├── products/
│   │   ├── productTypes.ts    # Re-export from @backend/services/products/utils/types
│   │   └── index.ts
│   │
│   ├── supplyChain/
│   │   ├── supplyChainTypes.ts # Re-export from @backend/services/supplyChain/utils/types
│   │   └── index.ts
│   │
│   ├── votes/
│   │   ├── voteTypes.ts       # Re-export from @backend/services/votes/utils/types
│   │   └── index.ts
│   │
│   ├── subscriptions/
│   │   ├── subscriptionTypes.ts # Re-export from @backend/services/subscriptions/utils/types
│   │   └── index.ts
│   │
│   ├── certificates/
│   │   ├── certificateTypes.ts # Types from certificate core/features services
│   │   └── index.ts
│   │
│   ├── notifications/          # Multiple files (matches backend)
│   │   ├── types/
│   │   │   ├── notificationCategory.ts
│   │   │   ├── notificationEvent.ts
│   │   │   ├── notificationRecipient.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── brands/
│   ├── manufacturers/
│   ├── media/
│   ├── connections/
│   ├── domains/
│   ├── usage/
│   ├── tenants/
│   └── analytics/
│
├── integrations/
│   └── ecommerce/
│       ├── ecommerceTypes.ts   # Re-export from @backend/services/integrations/ecommerce/core/types
│       └── index.ts
│
└── index.ts                     # Root barrel export
```

---

## File Naming Convention

### Match Backend File Names

| Backend | Frontend | Pattern |
|---------|----------|---------|
| `auth/types/authTypes.service.ts` | `features/auth/authTypes.ts` | Remove `.service`, keep name |
| `users/utils/types.ts` | `features/users/userTypes.ts` | Add domain prefix |
| `products/utils/types.ts` | `features/products/productTypes.ts` | Add domain prefix |
| `notifications/types/*.ts` | `features/notifications/types/*.ts` | Keep same structure |

---

## Example Implementation

### `features/auth/authTypes.ts`
```typescript
/**
 * Authentication Types
 * Re-exports backend auth types with frontend extensions
 */

// Import for extends
import type {
  RegisterUserInput,
  RegisterBusinessInput,
  LoginUserInput,
  // ... all types
} from '@backend/services/auth/types/authTypes.service';

// Re-export all backend types
export type {
  RegisterUserInput,
  RegisterBusinessInput,
  LoginUserInput,
  // ... all types
};

// Frontend extensions
export interface LoginCredentials extends LoginUserInput {
  rememberMe?: boolean;
  deviceFingerprint?: string;
}
```

### `features/users/userTypes.ts`
```typescript
/**
 * User Types
 * Re-exports backend user types with frontend extensions
 */

export type {
  UserPreferences,
  CreateUserData,
  UpdateUserData,
  UserProfile,
  UserAnalytics
} from '@backend/services/users/utils/types';

// Frontend extensions
export type UserRole = 'customer' | 'manufacturer' | 'brand';
```

### `features/notifications/types/notificationCategory.ts`
```typescript
/**
 * Notification Category Types
 * Re-exports from backend notifications/types
 */

export type {
  NotificationCategory
} from '@backend/services/notifications/types/notificationCategory';
```

---

## Benefits of Simplified Structure

1. **Simpler** - One file per domain (except notifications)
2. **Matches Backend** - Mirrors backend structure
3. **Easier Navigation** - Clear file naming
4. **Less Overhead** - No unnecessary nesting
5. **Scalable** - Can split into multiple files later if needed

---

## When to Use Multiple Files

Only use multiple files when:
- Backend has multiple type files (like notifications)
- Domain is very large (1000+ lines)
- Clear separation of concerns (e.g., core vs features)

Otherwise: **One file per domain**

---

## Migration Path

1. Create `features/[domain]/[domain]Types.ts` for each domain
2. Re-export backend types
3. Add frontend extensions
4. Update imports gradually
5. Remove old flat structure

