// src/lib/api/features/index.ts
// Features API barrel export

import { analyticsApi } from './analytics';
import { brandsApi } from './brands';
import { blockchainApi } from './blockchain';
import { certificatesApi } from './certificates';

export * from './brands';
export * from './analytics';
export * from './blockchain';
export * from './certificates';

export { brandsApi } from './brands';
export { analyticsApi } from './analytics';
export { blockchainApi } from './blockchain';
export { certificatesApi } from './certificates';

export const featuresApi = {
  brands: brandsApi,
  analytics: analyticsApi,
  blockchain: blockchainApi,
  certificates: certificatesApi,
};

