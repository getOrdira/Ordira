// src/lib/api/features/products/index.ts
// Products API barrel export

import productsAccountApi from './productsAccount.api';
import productsAggregationApi from './productsAggregation.api';
import productsAnalyticsApi from './productsAnalytics.api';
import productsDataApi from './productsData.api';
import productsSearchApi from './productsSearch.api';
import productsValidationApi from './productsValidation.api';

export * from './productsAccount.api';
export * from './productsAggregation.api';
export * from './productsAnalytics.api';
export * from './productsData.api';
export * from './productsSearch.api';
export * from './productsValidation.api';

export {
  productsAccountApi,
  productsAggregationApi,
  productsAnalyticsApi,
  productsDataApi,
  productsSearchApi,
  productsValidationApi
};

export const productsApi = {
  account: productsAccountApi,
  aggregation: productsAggregationApi,
  analytics: productsAnalyticsApi,
  data: productsDataApi,
  search: productsSearchApi,
  validation: productsValidationApi
};

export default productsApi;

