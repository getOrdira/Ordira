// src/hooks/query/index.ts
// Central export for all query utilities

export {
  normalizeObject,
  createRootKey,
  createQueryKey,
  createQueryKeyWithParams,
  type QueryKey,
  type QueryKeyFactory
} from './keys';

export {
  createFeatureQuery,
  createStaticFeatureQuery,
  createDynamicFeatureQuery,
  type FeatureQueryOptions,
  type CreateFeatureQueryConfig
} from './createFeatureQuery';

export {
  createFeatureMutation,
  createDynamicFeatureMutation,
  type FeatureMutationOptions,
  type CreateFeatureMutationConfig,
  type InvalidationConfig
} from './createFeatureMutation';

