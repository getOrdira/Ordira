// src/lib/api/features/index.ts
// Features API barrel export

import { analyticsApi } from './analytics';
import { brandsApi } from './brands';
import { blockchainApi } from './blockchain';
import { certificatesApi } from './certificates';
import { subscriptionsApi } from './subscriptions';
import { usersApi } from './users';
import { productsApi } from './products';
import { securityApi } from './security';
import { nftApi } from './nft';

export * from './brands';
export * from './blockchain';
export * from './certificates';
export * from './security';
export * from './nft';
export * from './subscriptions';
export * from './users';
export * as analyticsFeatures from './analytics';
export * as productsFeatures from './products';

export { brandsApi } from './brands';
export { analyticsApi } from './analytics';
export { blockchainApi } from './blockchain';
export { certificatesApi } from './certificates';
export { productsApi } from './products';
export { securityApi } from './security';
export { nftApi } from './nft';
export { subscriptionsApi } from './subscriptions';
export { usersApi } from './users';

export const featuresApi = {
  brands: brandsApi,
  analytics: analyticsApi,
  blockchain: blockchainApi,
  certificates: certificatesApi,
  products: productsApi,
  security: securityApi,
  nfts: nftApi,
  subscriptions: subscriptionsApi,
  users: usersApi,
};

