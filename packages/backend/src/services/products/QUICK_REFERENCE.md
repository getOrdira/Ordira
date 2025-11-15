# Products Module - Quick Reference

## 🎯 Import Patterns

### Individual Services
```typescript
import { 
  productDataService,      // CRUD operations
  productAccountService,   // Stats & ownership
  productSearchService,    // Search & filtering
  productAnalyticsService, // Analytics & insights
  productValidationService // Validation
} from '@/services/products';
```

### Service Aggregate
```typescript
import { productsServices } from '@/services/products';

const { core, features, validation } = productsServices;
// core.data, core.account
// features.search, features.analytics, features.aggregation
// validation.productValidation
```

### Backward Compatible
```typescript
import { productService } from '@/services/products';
// Works exactly like the old monolithic service
```

## 📋 Common Operations

### Create Product
```typescript
// Validate first
const validation = await productValidationService.validateCreateProduct(data, businessId);
if (!validation.valid) throw new Error(validation.errors.join(', '));

// Sanitize
const sanitized = productValidationService.sanitizeProductData(data);

// Create
const product = await productDataService.createProduct(sanitized, businessId);
```

### Get Product
```typescript
const product = await productDataService.getProduct(productId, businessId);
```

### List Products
```typescript
const results = await productDataService.getProducts({
  businessId,
  category: 'electronics',
  status: 'active',
  limit: 20,
  offset: 0,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

### Search Products
```typescript
const results = await productSearchService.searchProducts({
  query: 'premium widget',
  businessId,
  category: 'electronics',
  limit: 20
});
```

### Get Analytics
```typescript
const analytics = await productAccountService.getProductAnalytics({
  businessId,
  dateRange: {
    start: new Date('2025-01-01'),
    end: new Date('2025-12-31')
  }
});
```

### Get Insights
```typescript
const insights = await productAnalyticsService.getPerformanceInsights(businessId);
// Returns: overview, engagement, topPerformers, categoryBreakdown, insights
```

## 🗂️ Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTS MODULE                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔵 CORE SERVICES                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ProductDataService                                              │
│  ├─ createProduct()        Create new products                  │
│  ├─ getProduct()           Get single product                   │
│  ├─ getProducts()          List with pagination                 │
│  ├─ updateProduct()        Update product                       │
│  ├─ deleteProduct()        Delete product                       │
│  ├─ getProductsByOwner()   Filter by owner                      │
│  ├─ getProductCount()      Count products                       │
│  └─ productExists()        Check existence                      │
│                                                                  │
│  ProductAccountService                                           │
│  ├─ getProductAnalytics()  Comprehensive analytics              │
│  ├─ getProductCategories() List categories                      │
│  ├─ getProductStats()      Stats summary                        │
│  ├─ validateMediaOwnership() Media validation                   │
│  ├─ getRecentProducts()    Recent products                      │
│  ├─ getPopularProducts()   Most viewed                          │
│  ├─ getTopVotedProducts()  Highest voted                        │
│  ├─ incrementViewCount()   Track views                          │
│  ├─ incrementVoteCount()   Track votes                          │
│  ├─ incrementCertificateCount() Track certificates              │
│  ├─ isProductOwner()       Ownership check                      │
│  └─ bulkUpdateStatus()     Bulk operations                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🟢 FEATURE SERVICES                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ProductSearchService                                            │
│  ├─ searchProducts()       Full-text search                     │
│  ├─ searchByCategory()     Category search                      │
│  ├─ searchByTags()         Tag search                           │
│  ├─ searchByPriceRange()   Price filtering                      │
│  ├─ getSimilarProducts()   Recommendations                      │
│  └─ autocomplete()         Search suggestions                   │
│                                                                  │
│  ProductAnalyticsService                                         │
│  ├─ getAnalytics()         Comprehensive analytics              │
│  ├─ getCategoryAnalytics() Category breakdown                   │
│  ├─ getEngagementMetrics() Engagement stats                     │
│  ├─ getTrendingProducts()  Trending items                       │
│  ├─ getPerformanceInsights() AI insights                        │
│  └─ getMonthlyTrends()     Time-series data                     │
│                                                                  │
│  ProductAggregationService                                       │
│  ├─ getProductsWithRelations() Products with joins              │
│  ├─ getProductWithRelations() Single with relations             │
│  ├─ getManufacturerProductsWithStats() Manufacturer stats       │
│  ├─ getProductsWithMedia() Products with media                  │
│  └─ getProductsByCategory() Grouped by category                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🟡 UTILITY SERVICES                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ProductCacheService                                             │
│  ├─ cacheProduct()         Cache single product                 │
│  ├─ getCachedProduct()     Get cached product                   │
│  ├─ cacheProductListing()  Cache listing                        │
│  ├─ getCachedProductListing() Get cached listing                │
│  ├─ cacheAnalytics()       Cache analytics                      │
│  ├─ getCachedAnalytics()   Get cached analytics                 │
│  ├─ invalidateProductCaches() Invalidate by tags                │
│  └─ invalidateProduct()    Invalidate specific                  │
│                                                                  │
│  Helper Functions                                                │
│  ├─ CacheKeys.*            Cache key generators                 │
│  ├─ buildCacheKey()        Key builder                          │
│  ├─ isValidObjectId()      ID validation                        │
│  ├─ validateString()       String validation                    │
│  ├─ buildProductQuery()    Query builder                        │
│  ├─ buildSortOptions()     Sort builder                         │
│  └─ ... 10+ more helpers                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔴 VALIDATION SERVICE                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ProductValidationService                                        │
│  ├─ validateCreateProduct() Pre-creation validation             │
│  ├─ validateUpdateProduct() Update validation                   │
│  ├─ validateProductId()    ID validation                        │
│  ├─ validateCategory()     Category validation                  │
│  ├─ validatePriceRange()   Price validation                     │
│  ├─ validateSearchQuery()  Search validation                    │
│  ├─ validateBulkOperation() Bulk validation                     │
│  └─ sanitizeProductData()  Data sanitization                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Migration Paths

### ✅ Option 1: Direct Service (Recommended)
```typescript
// Old
const service = new ProductService();
const product = await service.getProduct(id, businessId);

// New
import { productDataService } from '@/services/products';
const product = await productDataService.getProduct(id, businessId);
```

### ✅ Option 2: Service Aggregate
```typescript
import { productsServices } from '@/services/products';
const product = await productsServices.core.data.getProduct(id, businessId);
```

### ✅ Option 3: Backward Compatible
```typescript
import { productService } from '@/services/products';
const product = await productService.getProduct(id, businessId);
```

## 📦 Type Definitions

### CreateProductData
```typescript
{
  title: string;                    // Required
  description?: string;
  media?: string[];                 // Media IDs
  category?: string;
  status?: 'draft' | 'active' | 'archived';
  sku?: string;
  price?: number;
  tags?: string[];
  specifications?: Record<string, string>;
  manufacturingDetails?: {
    materials?: string[];
    dimensions?: string;
    weight?: string;
    origin?: string;
  };
}
```

### ProductFilters
```typescript
{
  query?: string;              // Full-text search
  businessId?: string;
  manufacturerId?: string;
  category?: string;
  status?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;              // Default: 20
  offset?: number;             // Default: 0
  sortBy?: string;             // Default: 'createdAt'
  sortOrder?: 'asc' | 'desc';  // Default: 'desc'
}
```

### ProductListResult
```typescript
{
  products: any[];
  total?: number;
  hasMore: boolean;
  queryTime: number;
  pagination?: any;
  optimizationType?: string;
  cached?: boolean;
}
```

## 🎨 Usage Patterns

### Pattern 1: CRUD Operations
```typescript
import { productDataService } from '@/services/products';

// Create
const product = await productDataService.createProduct(data, businessId);

// Read
const product = await productDataService.getProduct(productId, businessId);
const products = await productDataService.getProducts(filters);

// Update
const updated = await productDataService.updateProduct(productId, updates, businessId);

// Delete
await productDataService.deleteProduct(productId, businessId);
```

### Pattern 2: Search & Filter
```typescript
import { productSearchService } from '@/services/products';

// Full-text search
const results = await productSearchService.searchProducts({
  query: 'organic cotton',
  category: 'apparel',
  limit: 20
});

// Filter by tags
const tagged = await productSearchService.searchByTags(['organic', 'sustainable']);

// Price range
const priced = await productSearchService.searchByPriceRange(10, 50);

// Similar products
const similar = await productSearchService.getSimilarProducts(productId);
```

### Pattern 3: Analytics & Insights
```typescript
import { productAnalyticsService, productAccountService } from '@/services/products';

// Basic analytics
const analytics = await productAccountService.getProductAnalytics({ businessId });

// Advanced insights
const insights = await productAnalyticsService.getPerformanceInsights(businessId);

// Trending products
const trending = await productAnalyticsService.getTrendingProducts(businessId, 7);

// Category breakdown
const categories = await productAnalyticsService.getCategoryAnalytics(businessId);
```

### Pattern 4: Validation Flow
```typescript
import { 
  productValidationService, 
  productDataService 
} from '@/services/products';

// Validate
const validation = await productValidationService.validateCreateProduct(
  data, 
  businessId
);

if (!validation.valid) {
  throw new Error(validation.errors.join(', '));
}

// Sanitize
const sanitized = productValidationService.sanitizeProductData(data);

// Create
const product = await productDataService.createProduct(sanitized, businessId);
```

## 🚨 Error Handling

```typescript
import { ProductError } from '@/services/products';

try {
  const product = await productDataService.getProduct(id, businessId);
} catch (error) {
  if (error instanceof ProductError) {
    console.error(`Error ${error.code}: ${error.message}`);
    // error.statusCode available for HTTP response
  }
}
```

## 📚 Documentation

- **README.md** - Full documentation with examples
- **MIGRATION_GUIDE.md** - Detailed migration instructions
- **ANALYSIS.md** - Complete analysis and comparison
- **QUICK_REFERENCE.md** - This file

## 🔗 Related Services

- **Media Service** - For product media handling
- **Certificate Service** - For product certificates
- **Vote Service** - For product voting
- **Analytics Service** - For business analytics

## 💡 Tips

1. **Always validate** before creating/updating
2. **Use caching** for frequently accessed data
3. **Leverage search** for better user experience
4. **Monitor analytics** for insights
5. **Test incrementally** when migrating

## ⚡ Performance

- **Caching**: 5-10 min TTL on products/listings
- **Pagination**: Hybrid strategy (auto-optimized)
- **Queries**: Lean queries with projections
- **Aggregation**: Optimized pipelines

## 🎯 Best Practices

1. Import only what you need
2. Use TypeScript types
3. Handle errors properly
4. Validate user input
5. Cache when appropriate
6. Monitor performance
7. Write tests

---

**Need Help?** Check the full documentation in README.md or MIGRATION_GUIDE.md

