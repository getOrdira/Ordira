# Product Service Migration Guide

## Original Service Analysis

### Original `product.service.ts` (618 lines)

The original service contained all functionality in a single class with the following methods:

#### Original Methods & New Locations

| Original Method | Lines | New Location | New Method |
|----------------|-------|--------------|------------|
| `createProduct()` | 59-108 | `core/productData.service.ts` | `createProduct()` |
| `getProducts()` | 113-178 | `core/productData.service.ts` | `getProducts()` |
| `getProduct()` | 183-215 | `core/productData.service.ts` | `getProduct()` |
| `updateProduct()` | 220-263 | `core/productData.service.ts` | `updateProduct()` |
| `deleteProduct()` | 268-299 | `core/productData.service.ts` | `deleteProduct()` |
| `searchProducts()` | 304-324 | `features/search.service.ts` | `searchProducts()` |
| `getProductAnalytics()` | 329-422 | `core/productAccount.service.ts` | `getProductAnalytics()` |
| `validateMediaOwnership()` | 427-437 | `core/productAccount.service.ts` | `validateMediaOwnership()` |
| `buildCacheKey()` | 442-451 | `utils/helpers.ts` | `buildCacheKey()` |
| `invalidateProductCaches()` | 456-468 | `utils/cache.ts` | `invalidateProductCaches()` |
| `getProductsWithAggregation()` | 473-517 | `features/aggregation.service.ts` | `getProductsWithRelations()` |
| `getProductWithAggregation()` | 522-547 | `features/aggregation.service.ts` | `getProductWithRelations()` |
| `getManufacturerProductsWithStats()` | 552-592 | `features/aggregation.service.ts` | `getManufacturerProductsWithStats()` |
| `cacheProduct()` | 597-603 | `utils/cache.ts` | `cacheProduct()` |
| `getCachedProduct()` | 608-613 | `utils/cache.ts` | `getCachedProduct()` |

## Complete Function Mapping

### ✅ Core Data Operations → `core/productData.service.ts`

```typescript
// OLD
const service = new ProductService();
await service.createProduct(data, businessId);
await service.getProduct(productId, businessId);
await service.getProducts(filters);
await service.updateProduct(productId, updates, businessId);
await service.deleteProduct(productId, businessId);

// NEW - Modular
import { productDataService } from '@/services/products';
await productDataService.createProduct(data, businessId);
await productDataService.getProduct(productId, businessId);
await productDataService.getProducts(filters);
await productDataService.updateProduct(productId, updates, businessId);
await productDataService.deleteProduct(productId, businessId);

// NEW - Added functionality
await productDataService.getProductsByOwner(businessId, 'active');
await productDataService.getProductCount(businessId);
await productDataService.productExists(productId, businessId);
```

### ✅ Analytics & Stats → `core/productAccount.service.ts`

```typescript
// OLD
await service.getProductAnalytics(businessId, manufacturerId, dateRange);
await service.validateMediaOwnership(mediaIds, ownerId);

// NEW - Modular
import { productAccountService } from '@/services/products';
await productAccountService.getProductAnalytics({ businessId, manufacturerId, dateRange });
await productAccountService.validateMediaOwnership(mediaIds, ownerId);

// NEW - Added functionality
await productAccountService.getProductCategories(businessId);
await productAccountService.getProductStats(businessId);
await productAccountService.getRecentProducts(businessId, 10);
await productAccountService.getPopularProducts(businessId, 10);
await productAccountService.getTopVotedProducts(businessId, 10);
await productAccountService.incrementViewCount(productId);
await productAccountService.incrementVoteCount(productId);
await productAccountService.incrementCertificateCount(productId);
await productAccountService.isProductOwner(productId, businessId);
await productAccountService.bulkUpdateStatus(productIds, 'active', businessId);
```

### ✅ Search Operations → `features/search.service.ts`

```typescript
// OLD
await service.searchProducts({ query, businessId, category, limit });

// NEW - Modular
import { productSearchService } from '@/services/products';
await productSearchService.searchProducts({ query, businessId, category, limit });

// NEW - Added functionality
await productSearchService.searchByCategory(category, businessId, 20);
await productSearchService.searchByTags(['organic', 'sustainable'], businessId);
await productSearchService.searchByPriceRange(10, 100, businessId);
await productSearchService.getSimilarProducts(productId, 10);
await productSearchService.autocomplete('prem', businessId, 10);
```

### ✅ Analytics & Insights → `features/analytics.service.ts`

```typescript
// NEW - Enhanced analytics
import { productAnalyticsService } from '@/services/products';

await productAnalyticsService.getAnalytics({ businessId, dateRange });
await productAnalyticsService.getCategoryAnalytics(businessId);
await productAnalyticsService.getEngagementMetrics(businessId);
await productAnalyticsService.getTrendingProducts(businessId, 7, 10);
await productAnalyticsService.getPerformanceInsights(businessId);
await productAnalyticsService.getMonthlyTrends(businessId, 6);
```

### ✅ Aggregation Operations → `features/aggregation.service.ts`

```typescript
// OLD
await service.getProductsWithAggregation(filters);
await service.getProductWithAggregation(productId, businessId);
await service.getManufacturerProductsWithStats(manufacturerId);

// NEW - Modular
import { productAggregationService } from '@/services/products';
await productAggregationService.getProductsWithRelations(filters);
await productAggregationService.getProductWithRelations(productId, businessId);
await productAggregationService.getManufacturerProductsWithStats(manufacturerId);

// NEW - Added functionality
await productAggregationService.getProductsWithMedia(filters);
await productAggregationService.getProductsByCategory(businessId);
```

### ✅ Validation → `validation/productValidation.service.ts`

```typescript
// NEW - Comprehensive validation
import { productValidationService } from '@/services/products';

const result = await productValidationService.validateCreateProduct(data, businessId);
if (!result.valid) {
  console.error(result.errors);
}

const updateResult = productValidationService.validateUpdateProduct(updates);
const idResult = productValidationService.validateProductId(productId);
const categoryResult = productValidationService.validateCategory(category);
const priceResult = productValidationService.validatePriceRange(10, 100);
const searchResult = productValidationService.validateSearchQuery(query);
const bulkResult = productValidationService.validateBulkOperation(productIds);

// Sanitize data
const sanitized = productValidationService.sanitizeProductData(data);
```

### ✅ Caching → `utils/cache.ts`

```typescript
// OLD (private methods)
// service.cacheProduct()
// service.getCachedProduct()

// NEW - Public API
import { productCacheService } from '@/services/products';

await productCacheService.cacheProduct(productId, product, { ttl: 300 });
const cached = await productCacheService.getCachedProduct(productId);
await productCacheService.cacheProductListing(filters, products);
const cachedList = await productCacheService.getCachedProductListing(filters);
await productCacheService.cacheAnalytics({ businessId }, analytics);
const cachedAnalytics = await productCacheService.getCachedAnalytics({ businessId });
await productCacheService.invalidateProductCaches(businessId);
await productCacheService.invalidateProduct(productId, businessId);
```

### ✅ Utilities → `utils/helpers.ts`

```typescript
// OLD (private methods)
// service.buildCacheKey()
// service.invalidateProductCaches()

// NEW - Public utilities
import { 
  CacheKeys,
  buildCacheKey,
  isValidObjectId,
  validateString,
  buildProductQuery,
  buildSortOptions,
  calculatePagination,
  formatProduct,
  validateOwner,
  getOwnerId
} from '@/services/products';

// Cache keys
const key = CacheKeys.product(productId, businessId);
const listKey = CacheKeys.productListing(filters);

// Validation
const isValid = isValidObjectId(productId);
const strResult = validateString(title, 'Title', 2);

// Query building
const query = buildProductQuery(filters);
const sort = buildSortOptions(filters);
const { page, limit } = calculatePagination(filters);

// Formatting
const formatted = formatProduct(product);

// Owner utilities
validateOwner(businessId, manufacturerId);
const ownerId = getOwnerId(businessId, manufacturerId);
```

## Controller Migration Example

### Before (Old Service)

```typescript
// product.controller.ts
import { ProductService } from '../services/business/product.service';

const productService = new ProductService();

export const createProduct = async (req: UnifiedAuthRequest, res: Response) => {
  const product = await productService.createProduct(
    req.validatedBody,
    req.businessId
  );
  res.json({ success: true, product });
};

export const getProducts = async (req: UnifiedAuthRequest, res: Response) => {
  const results = await productService.getProducts({
    businessId: req.businessId,
    ...req.query
  });
  res.json({ success: true, ...results });
};
```

### After (Modular Services)

```typescript
// product.controller.ts
import { 
  productDataService,
  productValidationService,
  ProductError 
} from '@/services/products';

export const createProduct = async (req: UnifiedAuthRequest, res: Response) => {
  // Validate input
  const validation = await productValidationService.validateCreateProduct(
    req.validatedBody,
    req.businessId
  );
  
  if (!validation.valid) {
    throw new ProductError(validation.errors.join(', '), 400, 'VALIDATION_ERROR');
  }

  // Sanitize data
  const sanitized = productValidationService.sanitizeProductData(req.validatedBody);

  // Create product
  const product = await productDataService.createProduct(
    sanitized,
    req.businessId
  );
  
  res.json({ success: true, product });
};

export const getProducts = async (req: UnifiedAuthRequest, res: Response) => {
  const results = await productDataService.getProducts({
    businessId: req.businessId,
    ...req.query
  });
  
  res.json({ success: true, ...results });
};
```

### After (Using Service Aggregate)

```typescript
// product.controller.ts
import { productsServices } from '@/services/products';

const { core, validation } = productsServices;

export const createProduct = async (req: UnifiedAuthRequest, res: Response) => {
  // Validate
  const validationResult = await validation.productValidation.validateCreateProduct(
    req.validatedBody,
    req.businessId
  );
  
  if (!validationResult.valid) {
    return res.status(400).json({ 
      success: false, 
      errors: validationResult.errors 
    });
  }

  // Create
  const product = await core.data.createProduct(
    req.validatedBody,
    req.businessId
  );
  
  res.json({ success: true, product });
};
```

## New Features Added

### 1. Enhanced Validation
- Pre-creation validation with detailed error messages
- Field-level validation (title, price, SKU, tags, etc.)
- Bulk operation validation
- Data sanitization

### 2. Advanced Analytics
- Category-wise analytics
- Engagement metrics
- Trending products
- Performance insights with AI-generated recommendations
- Monthly trends

### 3. Enhanced Search
- Search by category
- Search by tags
- Search by price range
- Similar product recommendations
- Autocomplete suggestions

### 4. Account Operations
- Product categories listing
- Product stats summary
- Recent products
- Popular products (by views)
- Top voted products
- View/vote/certificate tracking
- Ownership verification
- Bulk status updates

### 5. Caching Layer
- Product-level caching
- Listing cache
- Analytics cache
- Automatic cache invalidation
- TTL management

## Breaking Changes

### ⚠️ None - Fully Backward Compatible

The legacy `ProductService` class is maintained and delegates to modular services:

```typescript
import { productService } from '@/services/products';

// All old methods still work
await productService.createProduct(data, businessId);
await productService.getProducts(filters);
await productService.getProductAnalytics(businessId);
```

## Migration Strategy

### Phase 1: Parallel Usage (Current)
- Both old and new services available
- New code uses modular services
- Old code continues to work

### Phase 2: Gradual Migration
- Update controllers one by one
- Update services that depend on products
- Add tests for modular services

### Phase 3: Deprecation
- Mark old service as deprecated
- Add warnings in documentation
- Set deprecation timeline

### Phase 4: Removal
- Remove old `business/product.service.ts`
- Remove legacy wrapper
- Update all documentation

## Testing

```typescript
// Unit testing individual services
import { productDataService } from '@/services/products';

jest.mock('@/models/product.model');

describe('ProductDataService', () => {
  it('should create a product', async () => {
    const data = { title: 'Test Product', price: 99.99 };
    const product = await productDataService.createProduct(data, 'businessId');
    expect(product).toBeDefined();
    expect(product.title).toBe('Test Product');
  });
});
```

## Performance Improvements

1. **Caching**: Built-in multi-layer caching
2. **Pagination**: Hybrid pagination strategy
3. **Aggregation**: Optimized MongoDB aggregations
4. **Query Building**: Efficient query construction
5. **Lean Queries**: Use `.lean()` for read operations

## Questions?

- Check `README.md` for comprehensive documentation
- Review type definitions in `utils/types.ts`
- See usage examples in each service file
- Contact the team for migration support

