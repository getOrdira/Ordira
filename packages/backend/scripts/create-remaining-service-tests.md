# Service Test Generation Guide

## Pattern Summary
All service test files follow this exact structure:
1. Import the service class
2. Mock dependencies (services, models, logger)
3. Test each public method with:
   - Success scenarios
   - Error scenarios
   - Edge cases
   - Input validation

## Files Created So Far

### Users (8 files) ✅
- userValidation.service.spec.ts
- userAuth.service.spec.ts
- userData.service.spec.ts
- userProfile.service.spec.ts
- userSearch.service.spec.ts
- userAnalytics.service.spec.ts
- userCache.service.spec.ts
- profileFormatter.service.spec.ts

### Manufacturers (2 files) ✅
- manufacturerData.service.spec.ts
- manufacturerValidation.service.spec.ts

## Remaining Files to Create

### Manufacturers (10 remaining)
1. manufacturerProfile.service.spec.ts
2. manufacturerAccount.service.spec.ts
3. manufacturerSearch.service.spec.ts
4. manufacturerAnalytics.service.spec.ts
5. manufacturerMedia.service.spec.ts
6. manufacturerVerification.service.spec.ts
7. manufacturerSupplyChain.service.spec.ts
8. manufacturerHelpers.service.spec.ts
9. scoreCalculator.service.spec.ts
10. comparisonEngine.service.spec.ts

### Brands (15 files)
1. brandAccount.service.spec.ts
2. brandProfile.service.spec.ts
3. brandSettings.service.spec.ts
4. brandAnalytics.service.spec.ts
5. brandCustomerAccess.service.spec.ts
6. brandDiscovery.service.spec.ts
7. brandIntegrations.service.spec.ts
8. brandVerification.service.spec.ts
9. brandWallet.service.spec.ts
10. brandHelpers.service.spec.ts
11. completenessCalculator.service.spec.ts
12. recommendationEngine.service.spec.ts
13. brandValidation.service.spec.ts
14. domainValidation.service.spec.ts
15. planValidation.service.spec.ts

## Quick Reference Template

See `packages/backend/src/_test_/services/users/userValidation.service.spec.ts` for validation services pattern.

See `packages/backend/src/_test_/services/users/userData.service.spec.ts` for data services pattern.

See `packages/backend/src/_test_/services/manufacturers/manufacturerData.service.spec.ts` for manufacturer/brand pattern.

