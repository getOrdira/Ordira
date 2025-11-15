'use client';

// src/hooks/features/products/useProductsData.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query';

import productsDataApi, {
  type CreateProductInput,
  type ProductExistsQuery,
  type ProductListQuery,
  type ProductOwnerQuery,
  type UpdateProductInput
} from '@/lib/api/features/products/productsData.api';
import type {
  ProductLeanDocument,
  ProductListResult,
  ProductWithRelations
} from '@/lib/types/features/products';
import { ApiError } from '@/lib/errors/errors';
import {
  normalizeObject,
  type FeatureQueryOptions,
  type FeatureMutationOptions
} from '@/hooks/query';

export const productsDataQueryKeys = {
  root: ['products', 'data'] as const,
  item: (productId: string, params?: ProductOwnerQuery) =>
    [...productsDataQueryKeys.root, 'item', productId, normalizeObject(params)] as const,
  list: (filters?: ProductListQuery) =>
    [...productsDataQueryKeys.root, 'list', normalizeObject(filters)] as const,
  ownerList: (params?: ProductOwnerQuery) =>
    [...productsDataQueryKeys.root, 'owner', 'list', normalizeObject(params)] as const,
  ownerCount: (params?: ProductOwnerQuery) =>
    [...productsDataQueryKeys.root, 'owner', 'count', normalizeObject(params)] as const,
  exists: (params: ProductExistsQuery) =>
    [...productsDataQueryKeys.root, 'exists', normalizeObject(params)] as const
};

export const productsDataMutationKeys = {
  create: [...productsDataQueryKeys.root, 'create'] as const,
  update: (productId: string) => [...productsDataQueryKeys.root, 'update', productId] as const,
  delete: (productId: string) => [...productsDataQueryKeys.root, 'delete', productId] as const
};

/**
 * Retrieve a product by identifier.
 */
export const useProduct = (
  productId: string,
  params?: ProductOwnerQuery,
  options?: FeatureQueryOptions<ProductWithRelations>
): UseQueryResult<ProductWithRelations, ApiError> => {
  return useQuery({
    queryKey: productsDataQueryKeys.item(productId, params),
    queryFn: () => productsDataApi.getProduct(productId, params),
    enabled: Boolean(productId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * List products with filters and pagination.
 */
export const useProductsList = (
  filters?: ProductListQuery,
  options?: FeatureQueryOptions<ProductListResult>
): UseQueryResult<ProductListResult, ApiError> => {
  return useQuery({
    queryKey: productsDataQueryKeys.list(filters),
    queryFn: () => productsDataApi.listProducts(filters),
    ...options
  });
};

/**
 * Retrieve products for the authenticated owner (non-paginated).
 */
export const useProductsByOwner = (
  params?: ProductOwnerQuery,
  options?: FeatureQueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsDataQueryKeys.ownerList(params),
    queryFn: () => productsDataApi.listProductsByOwner(params),
    ...options
  });
};

/**
 * Retrieve product count for the authenticated owner.
 */
export const useProductCount = (
  params?: ProductOwnerQuery,
  options?: FeatureQueryOptions<number>
): UseQueryResult<number, ApiError> => {
  return useQuery({
    queryKey: productsDataQueryKeys.ownerCount(params),
    queryFn: () => productsDataApi.getProductCount(params),
    ...options
  });
};

/**
 * Determine if a product exists for an owner.
 */
export const useProductExists = (
  params: ProductExistsQuery,
  options?: FeatureQueryOptions<boolean>
): UseQueryResult<boolean, ApiError> => {
  return useQuery({
    queryKey: productsDataQueryKeys.exists(params),
    queryFn: () => productsDataApi.productExists(params),
    enabled: Boolean(params.productId) && (options?.enabled ?? true),
    ...options
  });
};

type CreateProductVariables = CreateProductInput;

/**
 * Create a new product.
 */
export const useCreateProduct = (
  options?: FeatureMutationOptions<ProductWithRelations, CreateProductVariables>
): UseMutationResult<ProductWithRelations, ApiError, CreateProductVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: productsDataMutationKeys.create,
    mutationFn: (payload) => productsDataApi.createProduct(payload),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: productsDataQueryKeys.root });
      options?.onSuccess?.(data, variables, context);
    },
    ...options
  });
};

type UpdateProductVariables = {
  productId: string;
  payload: UpdateProductInput;
};

/**
 * Update an existing product.
 */
export const useUpdateProduct = (
  options?: FeatureMutationOptions<ProductWithRelations, UpdateProductVariables>
): UseMutationResult<ProductWithRelations, ApiError, UpdateProductVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: productsDataMutationKeys.update(''),
    mutationFn: ({ productId, payload }) => productsDataApi.updateProduct(productId, payload),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: productsDataQueryKeys.item(variables.productId) });
      void queryClient.invalidateQueries({ queryKey: productsDataQueryKeys.root });
      options?.onSuccess?.(data, variables, context);
    },
    ...options
  });
};

type DeleteProductVariables = {
  productId: string;
  params?: ProductOwnerQuery;
};

/**
 * Delete a product.
 */
export const useDeleteProduct = (
  options?: FeatureMutationOptions<boolean, DeleteProductVariables>
): UseMutationResult<boolean, ApiError, DeleteProductVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: productsDataMutationKeys.delete(''),
    mutationFn: ({ productId, params }) => productsDataApi.deleteProduct(productId, params),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: productsDataQueryKeys.item(variables.productId) });
      void queryClient.invalidateQueries({ queryKey: productsDataQueryKeys.root });
      options?.onSuccess?.(data, variables, context);
    },
    ...options
  });
};

/**
 * Main hook that provides access to all product data operations.
 */
export interface UseProductsDataOptions {
  queries?: {
    product?: FeatureQueryOptions<ProductWithRelations>;
    list?: FeatureQueryOptions<ProductListResult>;
    ownerList?: FeatureQueryOptions<ProductLeanDocument[]>;
    ownerCount?: FeatureQueryOptions<number>;
    exists?: FeatureQueryOptions<boolean>;
  };
  mutations?: {
    create?: FeatureMutationOptions<ProductWithRelations, CreateProductVariables>;
    update?: FeatureMutationOptions<ProductWithRelations, UpdateProductVariables>;
    delete?: FeatureMutationOptions<boolean, DeleteProductVariables>;
  };
}

export interface UseProductsDataResult {
  // Queries
  product: (productId: string, params?: ProductOwnerQuery) => UseQueryResult<ProductWithRelations, ApiError>;
  list: (filters?: ProductListQuery) => UseQueryResult<ProductListResult, ApiError>;
  ownerList: (params?: ProductOwnerQuery) => UseQueryResult<ProductLeanDocument[], ApiError>;
  ownerCount: (params?: ProductOwnerQuery) => UseQueryResult<number, ApiError>;
  exists: (params: ProductExistsQuery) => UseQueryResult<boolean, ApiError>;

  // Mutations
  createProduct: UseMutationResult<ProductWithRelations, ApiError, CreateProductVariables, unknown>;
  updateProduct: UseMutationResult<ProductWithRelations, ApiError, UpdateProductVariables, unknown>;
  deleteProduct: UseMutationResult<boolean, ApiError, DeleteProductVariables, unknown>;
}

export const useProductsData = (options: UseProductsDataOptions = {}): UseProductsDataResult => {
  const createProduct = useCreateProduct(options.mutations?.create);
  const updateProduct = useUpdateProduct(options.mutations?.update);
  const deleteProduct = useDeleteProduct(options.mutations?.delete);

  return {
    product: (productId: string, params?: ProductOwnerQuery) =>
      useProduct(productId, params, options.queries?.product),
    list: (filters?: ProductListQuery) => useProductsList(filters, options.queries?.list),
    ownerList: (params?: ProductOwnerQuery) =>
      useProductsByOwner(params, options.queries?.ownerList),
    ownerCount: (params?: ProductOwnerQuery) =>
      useProductCount(params, options.queries?.ownerCount),
    exists: (params: ProductExistsQuery) => useProductExists(params, options.queries?.exists),
    createProduct,
    updateProduct,
    deleteProduct
  };
};
