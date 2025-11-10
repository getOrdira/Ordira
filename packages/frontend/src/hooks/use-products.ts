// src/hooks/use-products.ts

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { Product, CreateProductRequest, UpdateProductRequest } from '@/lib/typessss/products';
import * as productsApi from '@/lib/apis/products';
import { ApiError } from '@/lib/errors/errors';

interface UseProductsOptions {
  businessId?: string;
  manufacturerId?: string;
  status?: 'draft' | 'proposed' | 'in_production' | 'manufactured';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseProductsReturn {
  // Data
  products: productsApi.Product[];
  product: productsApi.Product | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // Actions
  createProduct: UseMutationResult<productsApi.ProductDetailResponse, ApiError, CreateProductRequest>;
  updateProduct: UseMutationResult<productsApi.ProductDetailResponse, ApiError, { id: string; data: UpdateProductRequest }>;
  deleteProduct: UseMutationResult<{ success: boolean }, ApiError, string>;
  archiveProduct: UseMutationResult<productsApi.ProductDetailResponse, ApiError, string>;
  unarchiveProduct: UseMutationResult<productsApi.ProductDetailResponse, ApiError, string>;
  
  // Refetch functions
  refetch: () => void;
  refetchProduct: (id: string) => void;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const queryClient = useQueryClient();
  
  const {
    businessId,
    manufacturerId,
    status,
    category,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Fetch products list
  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<productsApi.ProductListResponse, ApiError>({
    queryKey: ['products', 'list', { businessId, manufacturerId, status, category, search, page, limit, sortBy, sortOrder }],
    queryFn: () => productsApi.getProducts({
      business: businessId,  
      status,
      category,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create product mutation
  const createProduct = useMutation<productsApi.ProductDetailResponse, ApiError, CreateProductRequest>({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });

  // Update product mutation
  const updateProduct = useMutation<productsApi.ProductDetailResponse, ApiError, { id: string; data: UpdateProductRequest }>({
    mutationFn: ({ id, data }) => productsApi.updateProduct(id, data as any),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
      queryClient.setQueryData(['products', 'detail', (updatedProduct as any)._id], updatedProduct);
    },
  });

  // Delete product mutation
  const deleteProduct = useMutation<{ success: boolean }, ApiError, string>({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });

  // Archive product mutation
  const archiveProduct = useMutation<productsApi.ProductDetailResponse, ApiError, string>({
    mutationFn: (id) => productsApi.updateProduct(id, { status: 'manufactured' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });

  // Unarchive product mutation
  const unarchiveProduct = useMutation<productsApi.ProductDetailResponse, ApiError, string>({
    mutationFn: (id) => productsApi.updateProduct(id, { status: 'proposed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
    },
  });

  // Refetch specific product
  const refetchProduct = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['products', 'detail', id] });
  };

  return {
    products: productsData?.products || [],
    product: null, // Will be set by useProduct hook
    isLoading,
    isError,
    error,
    pagination: {
      page: productsData?.pagination?.page || 1,
      limit: productsData?.pagination?.limit || 20,
      total: productsData?.pagination?.total || 0,
      totalPages: productsData?.pagination?.totalPages || 0,
      hasNext: productsData?.pagination?.hasNext || false,
      hasPrev: productsData?.pagination?.hasPrev || false,
    },
    createProduct,
    updateProduct,
    deleteProduct,
    archiveProduct,
    unarchiveProduct,
    refetch,
    refetchProduct,
  };
}

interface UseProductOptions {
  id: string;
  enabled?: boolean;
}

interface UseProductReturn {
  product: productsApi.ProductDetailResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useProduct({ id, enabled = true }: UseProductOptions): UseProductReturn {
  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<productsApi.ProductDetailResponse, ApiError>({
    queryKey: ['products', 'detail', id],
    queryFn: () => productsApi.getProduct(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    product: product || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseProductCategoriesReturn {
  categories: string[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useProductCategories(): UseProductCategoriesReturn {
  const {
    data: categories,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<productsApi.ProductCategoriesResponse, ApiError>({
    queryKey: ['products', 'categories'],
    queryFn: productsApi.getProductCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    categories: categories?.categories || [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseFeaturedProductsReturn {
  products: productsApi.Product[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useFeaturedProducts(): UseFeaturedProductsReturn {
  const {
    data: featuredData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<productsApi.FeaturedProductsResponse, ApiError>({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.getFeaturedProducts(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    products: (featuredData as any) || [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseProductSearchOptions {
  query: string;
  category?: string;
  enabled?: boolean;
}

interface UseProductSearchReturn {
  products: productsApi.Product[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useProductSearch({ query, category, enabled = true }: UseProductSearchOptions): UseProductSearchReturn {
  const {
    data: searchData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<productsApi.ProductSearchResponse, ApiError>({
    queryKey: ['products', 'search', { query, category }],
    queryFn: () => productsApi.searchProducts({ query, category }),
    enabled: enabled && !!query,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    products: (searchData as any) || [],
    isLoading,
    isError,
    error,
    refetch,
  };
}
