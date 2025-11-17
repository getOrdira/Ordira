# Utils Folder Reorganization Plan

## Executive Summary

The current `/src/utils/` folder contains important utility functions that serve different purposes and should be organized into a modular architecture that aligns with the existing `/services/infrastructure/` pattern. This plan proposes a clean separation of concerns and improved maintainability.

## Current State Analysis

### Files in `/src/utils/`

1. **logger.ts** (361 lines)
   - Structured logging infrastructure
   - Request/response logging
   - Performance tracking
   - **Category**: Infrastructure - Observability/Logging

2. **dataSanitizer.ts** (301 lines)
   - Sensitive data sanitization for logs
   - Security-focused utility
   - **Category**: Infrastructure - Security

3. **typeGuards.ts** (336 lines)
   - Type checking utilities
   - Type-safe accessors for Express Request
   - **Category**: Shared Type Utilities

4. **errorResponse.util.ts** (259 lines)
   - Standardized error response formatting
   - HTTP response utilities
   - **Category**: HTTP/API Layer

5. **responseUtils.ts** (387 lines)
   - API response formatting
   - Express Response helpers
   - **Category**: HTTP/API Layer

6. **errorUtils.service.ts** (73 lines)
   - Error extraction and handling
   - Safe error logging
   - **Category**: Infrastructure - Error Handling

7. **routeHelpers.ts** (45 lines)
   - Express route handler utilities
   - Type-safe route wrappers
   - **Category**: HTTP/API Layer

8. **type-helpers.ts** (121 lines)
   - Type-safe request property accessors
   - Duplicates some typeGuards functionality
   - **Category**: Shared Type Utilities (can be merged)

### Usage Patterns

- **logger.ts**: Used extensively across services, models, middleware (~100+ imports)
- **dataSanitizer.ts**: Used by logger.ts and security services
- **typeGuards.ts**: Used in controllers and routes for type safety
- **errorResponse.util.ts**: Used in controllers for standardized responses
- **responseUtils.ts**: Used in controllers (duplicates some errorResponse functionality)
- **errorUtils.service.ts**: Used in error handlers and middleware
- **routeHelpers.ts**: Used in route definitions
- **type-helpers.ts**: Used alongside typeGuards (redundancy)

### Issues Identified

1. **Mixed Concerns**: Infrastructure utilities mixed with HTTP/API utilities
2. **Duplication**: `errorResponse.util.ts` and `responseUtils.ts` have overlapping functionality
3. **Inconsistent Naming**: Mix of `.util.ts`, `.service.ts`, and `.ts` extensions
4. **Poor Organization**: All files at root level, no categorization
5. **Misaligned Architecture**: Not following the modular `/services/infrastructure/` pattern
6. **Type Utility Redundancy**: `type-helpers.ts` duplicates `typeGuards.ts` functionality

## Proposed Architecture

### Option 1: Move to `/services/infrastructure/` (Recommended)

Align with existing modular architecture pattern:

```
services/infrastructure/
├── logging/
│   ├── core/
│   │   └── logger.service.ts           (from utils/logger.ts)
│   ├── features/
│   │   └── performanceTracking.service.ts
│   ├── utils/
│   │   └── dataSanitizer.util.ts       (from utils/dataSanitizer.ts)
│   └── index.ts
├── errorHandling/
│   ├── core/
│   │   └── errorHandler.service.ts
│   ├── features/
│   │   └── errorExtractor.service.ts   (from utils/errorUtils.service.ts)
│   ├── utils/
│   │   ├── errorResponse.util.ts       (from utils/errorResponse.util.ts)
│   │   └── errorTypes.ts
│   └── index.ts
├── http/
│   ├── core/
│   │   └── response.service.ts
│   ├── features/
│   │   └── routeHelpers.service.ts     (from utils/routeHelpers.ts)
│   ├── utils/
│   │   └── responseUtils.util.ts      (from utils/responseUtils.ts - merged)
│   └── index.ts
└── types/
    ├── core/
    │   └── typeGuards.service.ts       (from utils/typeGuards.ts + type-helpers.ts)
    └── index.ts
```

### Option 2: Create `/src/infrastructure/`

Keep infrastructure separate from services:

```
src/
├── infrastructure/
│   ├── logging/
│   │   ├── logger.ts
│   │   ├── dataSanitizer.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── errorHandling.ts
│   │   ├── errorResponse.ts
│   │   └── index.ts
│   ├── http/
│   │   ├── responseUtils.ts
│   │   ├── routeHelpers.ts
│   │   └── index.ts
│   └── types/
│       ├── typeGuards.ts
│       └── index.ts
└── utils/ (empty or removed)
```

### Option 3: Hybrid Approach (Balance)

Move infrastructure pieces to `/services/infrastructure/`, keep HTTP utilities in `/src/http/`:

```
services/infrastructure/
├── logging/
│   └── ... (logger, dataSanitizer)
├── errorHandling/
│   └── ... (errorUtils, errorResponse)
└── types/
    └── ... (typeGuards, type-helpers)

src/
└── http/
    ├── responseUtils.ts
    ├── routeHelpers.ts
    └── index.ts
```

## Recommended Solution: Option 1

Move utilities to `/services/infrastructure/` following the existing modular pattern:

### Benefits:
1. ✅ **Consistency**: Aligns with existing `/services/infrastructure/` architecture
2. ✅ **Organization**: Clear separation by infrastructure concern
3. ✅ **Maintainability**: Easier to find and update related utilities
4. ✅ **Scalability**: Easy to add new infrastructure modules
5. ✅ **Dependency Injection**: Can be registered in DI container like other services

### Structure:

```
services/infrastructure/
├── logging/
│   ├── core/
│   │   └── logger.service.ts              (from utils/logger.ts)
│   ├── utils/
│   │   └── dataSanitizer.util.ts          (from utils/dataSanitizer.ts)
│   └── index.ts
├── errors/
│   ├── core/
│   │   └── errorExtractor.service.ts       (from utils/errorUtils.service.ts)
│   ├── features/
│   │   └── errorResponse.service.ts        (from utils/errorResponse.util.ts)
│   └── index.ts
├── http/
│   ├── core/
│   │   └── response.service.ts             (from utils/responseUtils.ts - refactored)
│   ├── features/
│   │   └── routeHelpers.service.ts         (from utils/routeHelpers.ts)
│   └── index.ts
└── types/
    ├── core/
    │   └── typeGuards.service.ts           (from utils/typeGuards.ts + type-helpers.ts - merged)
    └── index.ts
```

## Migration Strategy

### Phase 1: Create New Structure (30 min)
1. Create new folder structure under `/services/infrastructure/`
2. Create index.ts files for each module

### Phase 2: Move and Refactor Files (2 hours)
1. **Logging Module**:
   - Move `logger.ts` → `logging/core/logger.service.ts`
   - Move `dataSanitizer.ts` → `logging/utils/dataSanitizer.util.ts`
   - Update exports in `logging/index.ts`

2. **Errors Module**:
   - Move `errorUtils.service.ts` → `errors/core/errorExtractor.service.ts`
   - Move `errorResponse.util.ts` → `errors/features/errorResponse.service.ts`
   - Update exports in `errors/index.ts`

3. **HTTP Module**:
   - Move `responseUtils.ts` → `http/core/response.service.ts`
   - Refactor to remove duplication with errorResponse
   - Move `routeHelpers.ts` → `http/features/routeHelpers.service.ts`
   - Update exports in `http/index.ts`

4. **Types Module**:
   - Move `typeGuards.ts` → `types/core/typeGuards.service.ts`
   - Merge `type-helpers.ts` into `typeGuards.service.ts`
   - Update exports in `types/index.ts`

### Phase 3: Update Imports (3-4 hours)
1. Update all imports across codebase:
   - `utils/logger` → `services/infrastructure/logging`
   - `utils/dataSanitizer` → `services/infrastructure/logging`
   - `utils/errorUtils` → `services/infrastructure/errors`
   - `utils/errorResponse` → `services/infrastructure/errors`
   - `utils/responseUtils` → `services/infrastructure/http`
   - `utils/routeHelpers` → `services/infrastructure/http`
   - `utils/typeGuards` → `services/infrastructure/types`
   - `utils/type-helpers` → `services/infrastructure/types` (merged)

2. Run find-and-replace across codebase:
   ```bash
   # Example patterns
   from '../../utils/logger'
   from '../../../utils/logger'
   from '../../../../utils/logger'
   ```

### Phase 4: Update Infrastructure Index (15 min)
1. Update `/services/infrastructure/index.ts` to export new modules:
   ```typescript
   export * from './logging';
   export * from './errors';
   export * from './http';
   export * from './types';
   ```

### Phase 5: Update DI Container (30 min)
1. Register new services in `di-container.service.ts` if needed
2. Update service tokens if applicable

### Phase 6: Testing & Validation (1 hour)
1. Run TypeScript compilation check
2. Run linter
3. Test critical paths:
   - Logging in requests
   - Error handling
   - API responses
   - Route handlers
4. Fix any broken imports

### Phase 7: Cleanup (15 min)
1. Remove old `/src/utils/` folder (or keep empty for backward compatibility)
2. Update documentation
3. Update progress.md

## File Consolidation Opportunities

### Merge `responseUtils.ts` and `errorResponse.util.ts`

Both files handle HTTP responses. Consolidate into a single `response.service.ts`:

**Keep from responseUtils.ts:**
- `ApiResponse`, `SuccessResponse`, `ErrorResponse` interfaces
- `sendSuccess`, `sendError`, `sendPaginated` functions
- `ResponseHelper` class

**Keep from errorResponse.util.ts:**
- `StandardErrorResponse`, `StandardSuccessResponse` interfaces
- `ErrorCodes` enum
- `sanitizeErrorDetails` function
- Helper functions (`createValidationError`, `createAuthError`, etc.)

**Merge Strategy:**
- Use unified response interfaces
- Combine error code enums
- Provide both simple functions and class-based approach
- Consolidate sanitization logic

### Merge `typeGuards.ts` and `type-helpers.ts`

Both files provide type checking utilities. Consolidate into single `typeGuards.service.ts`:

**Keep all from typeGuards.ts** (comprehensive)
**Integrate from type-helpers.ts:**
- `getRequestProps` function (if not redundant)
- `getValidatedBody`, `getValidatedQuery`, `getValidatedParams` (useful additions)

## Backward Compatibility

To ease migration, we can create re-export shims in `/src/utils/`:

```typescript
// src/utils/index.ts (temporary, for backward compatibility)
export { logger } from '../services/infrastructure/logging';
export * from '../services/infrastructure/logging/utils/dataSanitizer';
export * from '../services/infrastructure/errors';
export * from '../services/infrastructure/http';
export * from '../services/infrastructure/types';
```

This allows gradual migration while maintaining existing imports.

## Estimated Effort

- **Phase 1**: 30 minutes
- **Phase 2**: 2 hours
- **Phase 3**: 3-4 hours
- **Phase 4**: 15 minutes
- **Phase 5**: 30 minutes
- **Phase 6**: 1 hour
- **Phase 7**: 15 minutes

**Total**: ~7-8 hours

## Risk Assessment

**Low Risk:**
- ✅ Well-defined file boundaries
- ✅ Clear import paths
- ✅ TypeScript will catch import errors
- ✅ Can use backward compatibility shims

**Mitigation:**
- Create re-export shims for gradual migration
- Run TypeScript checks after each phase
- Test critical paths after Phase 3
- Keep git history for easy rollback

## Next Steps

1. ✅ Review and approve this plan
2. ⏳ Execute Phase 1-2 (create structure, move files)
3. ⏳ Execute Phase 3 (update imports - automated search/replace)
4. ⏳ Execute Phase 4-5 (update exports, DI container)
5. ⏳ Execute Phase 6 (testing)
6. ⏳ Execute Phase 7 (cleanup)

## Alternative: Minimal Move (If Time Constrained)

If full migration is not feasible immediately:

1. Move logger + dataSanitizer to `/services/infrastructure/logging/` (most critical)
2. Keep HTTP utilities in `/src/utils/` but organize into subfolders:
   - `utils/http/` - responseUtils, routeHelpers, errorResponse
   - `utils/types/` - typeGuards, type-helpers
   - `utils/errors/` - errorUtils
3. Move rest later in follow-up

This provides immediate organization benefit with minimal effort.

