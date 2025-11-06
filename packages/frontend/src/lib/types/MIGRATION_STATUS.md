# Frontend Types Migration - Status & Next Steps

## ✅ Completed

### 1. TypeScript Configuration
- ✅ Added `@backend/*` path mapping in `tsconfig.json`
- ✅ Allows importing types directly from backend services

### 2. Folder Structure Created
- ✅ Created modular structure matching backend:
  ```
  lib/types/
  ├── core/              # Shared core types
  ├── features/          # Feature domains (matches backend services)
  └── integrations/      # Integration types
  ```

### 3. Example Files Created
- ✅ `features/auth/authTypes.ts` - Complete with re-exports and extensions
- ✅ `features/users/userTypes.ts` - Complete with re-exports and extensions

---

## 📋 Current Status

### Folder Structure ✅
All domain folders created:
- `features/auth/` ✅
- `features/users/` ✅
- `features/products/` ✅
- `features/supplyChain/` ✅
- `features/votes/` ✅
- `features/subscriptions/` ✅
- `features/certificates/` ✅
- `features/notifications/` ✅
- `features/brands/` ✅
- `features/manufacturers/` ✅
- `features/media/` ✅
- `features/connections/` ✅
- `features/domains/` ✅
- `features/usage/` ✅
- `features/tenants/` ✅
- `features/analytics/` ✅
- `integrations/ecommerce/` ✅

### Files Status
- ✅ `features/auth/authTypes.ts` - **DONE**
- ✅ `features/users/userTypes.ts` - **DONE**
- ⏳ `features/products/productTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/supplyChain/supplyChainTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/votes/voteTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/subscriptions/subscriptionTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/certificates/certificateTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/notifications/*.ts` - **NEEDS CONTENT**
- ⏳ `features/brands/brandTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/manufacturers/manufacturerTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/media/mediaTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/connections/connectionTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/domains/domainTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/usage/usageTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/tenants/tenantTypes.ts` - **NEEDS CONTENT**
- ⏳ `features/analytics/analyticsTypes.ts` - **NEEDS CONTENT**
- ⏳ `integrations/ecommerce/ecommerceTypes.ts` - **NEEDS CONTENT**
- ⏳ `core/common.ts` - **NEEDS CONTENT**
- ⏳ `core/errors.ts` - **NEEDS CONTENT**

---

## 🎯 Next Steps

### Phase 1: Populate Core Types
1. **`core/common.ts`**
   - Re-export `ApiResponse`, `PaginatedResponse` from old location
   - Keep frontend-specific response types
   - Add re-exports from backend if needed

2. **`core/errors.ts`**
   - Re-export error types from old location
   - Add backend error types if available

3. **`core/index.ts`**
   - Barrel export: `export * from './common'; export * from './errors';`

### Phase 2: Populate Feature Types (Priority Order)

**High Priority (Most Used):**
1. **`features/products/productTypes.ts`**
   - Re-export from `@backend/services/products/utils/types`
   - Add frontend extensions (ProductStatus, ProductCategory, etc.)

2. **`features/supplyChain/supplyChainTypes.ts`**
   - Re-export from `@backend/services/supplyChain/utils/types`
   - Add frontend extensions

3. **`features/votes/voteTypes.ts`**
   - Re-export from `@backend/services/votes/utils/types`
   - Add frontend extensions

4. **`features/subscriptions/subscriptionTypes.ts`**
   - Re-export from `@backend/services/subscriptions/utils/types`
   - Add frontend extensions

**Medium Priority:**
5. **`features/certificates/certificateTypes.ts`**
   - Aggregate types from `@backend/services/certificates/core/*`
   - Aggregate types from `@backend/services/certificates/features/*`

6. **`features/notifications/`**
   - Re-export from `@backend/services/notifications/types/*`
   - Multiple files (category, event, recipient, etc.)

7. **`features/brands/brandTypes.ts`**
   - Aggregate from `@backend/services/brands/core/*` and `features/*`

8. **`features/manufacturers/manufacturerTypes.ts`**
   - Aggregate from `@backend/services/manufacturers/core/*` and `features/*`

**Lower Priority:**
9. `features/media/mediaTypes.ts`
10. `features/connections/connectionTypes.ts`
11. `features/domains/domainTypes.ts`
12. `features/usage/usageTypes.ts`
13. `features/tenants/tenantTypes.ts`
14. `features/analytics/analyticsTypes.ts`
15. `integrations/ecommerce/ecommerceTypes.ts`

### Phase 3: Create Index Files
For each domain folder, create `index.ts`:
```typescript
// features/products/index.ts
export * from './productTypes';
```

### Phase 4: Update Root Index
Update `lib/types/index.ts`:
```typescript
export * from './core';
export * from './features';
export * from './integrations';
```

### Phase 5: Update Imports
1. Update all imports from `@/lib/types/[old-file]` to `@/lib/types/features/[domain]/[domain]Types`
2. Update API files to use new type paths
3. Update hooks to use new type paths
4. Update components to use new type paths

### Phase 6: Cleanup
1. Remove old flat type files from `lib/types/` (after migration complete)
2. Verify all imports work
3. Run TypeScript check to ensure no errors

---

## 📝 Template for Each Domain Type File

```typescript
/**
 * [Domain] Types
 * 
 * Re-exports backend [domain] types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses (if needed)
import type {
  Type1,
  Type2,
} from '@backend/services/[domain]/utils/types'; // or appropriate path

// Re-export all backend types
export type {
  Type1,
  Type2,
  // ... all types
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Add frontend-only types when needed

export interface FrontendExtension {
  // Frontend-specific fields
}
```

---

## 🔍 Backend Type Locations Reference

| Domain | Backend Types Location |
|--------|------------------------|
| auth | `services/auth/types/authTypes.service.ts` |
| users | `services/users/utils/types.ts` |
| products | `services/products/utils/types.ts` |
| supplyChain | `services/supplyChain/utils/types.ts` |
| votes | `services/votes/utils/types.ts` |
| subscriptions | `services/subscriptions/utils/types.ts` |
| media | `services/media/utils/types.ts` |
| usage | `services/usage/utils/types.ts` |
| tenants | `services/tenants/utils/types.ts` |
| analytics | `services/analytics/utils/types.ts` |
| notifications | `services/notifications/types/*.ts` (multiple files) |
| certificates | `services/certificates/core/*.ts` + `features/*.ts` |
| brands | `services/brands/core/*.ts` + `features/*.ts` |
| manufacturers | `services/manufacturers/core/*.ts` + `features/*.ts` |
| connections | Aggregate from services |
| domains | `services/domains/core/*.ts` + `features/*.ts` |
| ecommerce | `services/integrations/ecommerce/core/types.ts` |

---

## ✅ Success Criteria

1. All type files populated with backend re-exports
2. All index.ts files created
3. All imports updated to new paths
4. TypeScript compilation passes
5. No breaking changes to existing code
6. Old type files removed

---

## 🚀 Quick Start

To populate a type file:
1. Find backend types location (see reference table above)
2. Copy template
3. Add all backend types to re-export
4. Add frontend extensions if needed
5. Create/update index.ts
6. Test imports work

