// src/hooks/use-supply-chain.ts

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { 
  SupplyChainEvent, 
  SupplyChainContract,
  SupplyChainEndpoint,
  SupplyChainProduct,
  SupplyChainLocation,
  TrackingData,
  RateLimitInfo,
  CreateSupplyChainEventRequest,
  UpdateSupplyChainEventRequest,
  QRCodeScanRequest,
  BatchQRCodeRequest,
  CreateLocationRequest,
  ContractDeploymentRequest,
  CreateEndpointRequest,
  RegisterProductRequest
} from '@/lib/typessss/supply-chain';
import { supplyChainApi } from '../lib/apis/supply-chain';
import { ApiError } from '@/lib/errors';

// ===== CONTRACT MANAGEMENT HOOKS =====

interface UseSupplyChainContractReturn {
  contract: SupplyChainContract | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
  deployContract: UseMutationResult<{ contractAddress: string; txHash: string; blockNumber: number; gasUsed: string; deploymentCost: string }, ApiError, ContractDeploymentRequest>;
}

export function useSupplyChainContract(): UseSupplyChainContractReturn {
  const queryClient = useQueryClient();

  const {
    data: contract,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupplyChainContract, ApiError>({
    queryKey: ['supply-chain', 'contract'],
    queryFn: supplyChainApi.getContract,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const deployContract = useMutation<{ contractAddress: string; txHash: string; blockNumber: number; gasUsed: string; deploymentCost: string }, ApiError, ContractDeploymentRequest>({
    mutationFn: supplyChainApi.deployContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'contract'] });
    },
  });

  return {
    contract: contract || null,
    isLoading,
    isError,
    error,
    refetch,
    deployContract,
  };
}

// ===== ENDPOINT MANAGEMENT HOOKS =====

interface UseSupplyChainEndpointsReturn {
  endpoints: SupplyChainEndpoint[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
  createEndpoint: UseMutationResult<SupplyChainEndpoint, ApiError, CreateEndpointRequest>;
}

export function useSupplyChainEndpoints(): UseSupplyChainEndpointsReturn {
  const queryClient = useQueryClient();

  const {
    data: endpoints = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupplyChainEndpoint[], ApiError>({
    queryKey: ['supply-chain', 'endpoints'],
    queryFn: supplyChainApi.getEndpoints,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const createEndpoint = useMutation<SupplyChainEndpoint, ApiError, CreateEndpointRequest>({
    mutationFn: supplyChainApi.createEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'endpoints'] });
    },
  });

  return {
    endpoints,
    isLoading,
    isError,
    error,
    refetch,
    createEndpoint,
  };
}

// ===== PRODUCT MANAGEMENT HOOKS =====

interface UseSupplyChainProductsOptions {
  page?: number;
  limit?: number;
  productId?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
}

interface UseSupplyChainProductsReturn {
  products: SupplyChainProduct[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
  registerProduct: UseMutationResult<SupplyChainProduct, ApiError, RegisterProductRequest>;
}

export function useSupplyChainProducts(options: UseSupplyChainProductsOptions = {}): UseSupplyChainProductsReturn {
  const queryClient = useQueryClient();

  const {
    data: products = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupplyChainProduct[], ApiError>({
    queryKey: ['supply-chain', 'products', options],
    queryFn: () => supplyChainApi.getProducts(options),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const registerProduct = useMutation<SupplyChainProduct, ApiError, RegisterProductRequest>({
    mutationFn: supplyChainApi.registerProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'products'] });
    },
  });

  return {
    products,
    isLoading,
    isError,
    error,
    refetch,
    registerProduct,
  };
}

// ===== EVENT MANAGEMENT HOOKS =====

interface UseSupplyChainEventsOptions {
  productId: string;
  page?: number;
  limit?: number;
  eventType?: string;
  startDate?: string;
  endDate?: string;
}

interface UseSupplyChainEventsReturn {
  events: SupplyChainEvent[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
  logEvent: UseMutationResult<SupplyChainEvent, ApiError, CreateSupplyChainEventRequest>;
}

export function useSupplyChainEvents({ productId, ...options }: UseSupplyChainEventsOptions): UseSupplyChainEventsReturn {
  const queryClient = useQueryClient();

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupplyChainEvent[], ApiError>({
    queryKey: ['supply-chain', 'events', productId, options],
    queryFn: () => supplyChainApi.getProductEvents(productId, options),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const logEvent = useMutation<SupplyChainEvent, ApiError, CreateSupplyChainEventRequest>({
    mutationFn: (data) => supplyChainApi.logEvent(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'events', productId] });
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'tracking', productId] });
    },
  });

  return {
    events,
    isLoading,
    isError,
    error,
    refetch,
    logEvent,
  };
}

// ===== TRACKING HOOKS =====

interface UseSupplyChainTrackingReturn {
  trackingData: TrackingData | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useSupplyChainTracking(productId: string): UseSupplyChainTrackingReturn {
  const {
    data: trackingData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TrackingData, ApiError>({
    queryKey: ['supply-chain', 'tracking', productId],
    queryFn: () => supplyChainApi.getTrackingData(productId),
    enabled: !!productId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    trackingData: trackingData || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ===== QR CODE HOOKS =====

interface UseQRCodeScanReturn {
  scanQRCode: UseMutationResult<{
    success: boolean;
    event: SupplyChainEvent;
    product: { id: string; name: string; qrCodeGenerated: boolean };
    rateLimits: any;
  }, ApiError, QRCodeScanRequest>;
  isLoading: boolean;
  error: ApiError | null;
}

export function useQRCodeScan(): UseQRCodeScanReturn {
  const scanQRCode = useMutation<{
    success: boolean;
    event: SupplyChainEvent;
    product: { id: string; name: string; qrCodeGenerated: boolean };
    rateLimits: any;
  }, ApiError, QRCodeScanRequest>({
    mutationFn: supplyChainApi.scanQRCode,
  });

  return {
    scanQRCode,
    isLoading: scanQRCode.isPending,
    error: scanQRCode.error as ApiError | null,
  };
}

interface UseBatchQRCodeReturn {
  generateBatchQrCodes: UseMutationResult<{
    batch: {
      id: string;
      name: string;
      description: string;
      productCount: number;
      status: string;
      createdAt: Date;
    };
    qrCode: {
      data: string;
      imageUrl: string;
      batchId: string;
      isActive: boolean;
      generatedAt: Date;
    };
    products: Array<{
      id: string;
      title: string;
      category: string;
      price: number;
      batchQrLinked: boolean;
    }>;
    batchMetadata: any;
    rateLimits: any;
  }, ApiError, BatchQRCodeRequest>;
  isLoading: boolean;
  error: ApiError | null;
}

export function useBatchQRCode(): UseBatchQRCodeReturn {
  const generateBatchQrCodes = useMutation<{
    batch: {
      id: string;
      name: string;
      description: string;
      productCount: number;
      status: string;
      createdAt: Date;
    };
    qrCode: {
      data: string;
      imageUrl: string;
      batchId: string;
      isActive: boolean;
      generatedAt: Date;
    };
    products: Array<{
      id: string;
      title: string;
      category: string;
      price: number;
      batchQrLinked: boolean;
    }>;
    batchMetadata: any;
    rateLimits: any;
  }, ApiError, BatchQRCodeRequest>({
    mutationFn: supplyChainApi.generateBatchQrCodes,
  });

  return {
    generateBatchQrCodes,
    isLoading: generateBatchQrCodes.isPending,
    error: generateBatchQrCodes.error as ApiError | null,
  };
}

// ===== LOCATION MANAGEMENT HOOKS =====

interface UseSupplyChainLocationsOptions {
  eventType?: string;
  locationType?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

interface UseSupplyChainLocationsReturn {
  locations: SupplyChainLocation[];
  count: number;
  filters: any;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
  createLocation: UseMutationResult<SupplyChainLocation, ApiError, CreateLocationRequest>;
  updateLocation: UseMutationResult<SupplyChainLocation, ApiError, { id: string; data: Partial<SupplyChainLocation> }>;
  deleteLocation: UseMutationResult<{ success: boolean; message: string }, ApiError, string>;
}

export function useSupplyChainLocations(options: UseSupplyChainLocationsOptions = {}): UseSupplyChainLocationsReturn {
  const queryClient = useQueryClient();

  const {
    data: locationsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{
    data: SupplyChainLocation[];
    count: number;
    filters: any;
  }, ApiError>({
    queryKey: ['supply-chain', 'locations', options],
    queryFn: () => supplyChainApi.getLocations(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const createLocation = useMutation<SupplyChainLocation, ApiError, CreateLocationRequest>({
    mutationFn: supplyChainApi.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'locations'] });
    },
  });

  const updateLocation = useMutation<SupplyChainLocation, ApiError, { id: string; data: Partial<SupplyChainLocation> }>({
    mutationFn: ({ id, data }) => supplyChainApi.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'locations'] });
    },
  });

  const deleteLocation = useMutation<{ success: boolean; message: string }, ApiError, string>({
    mutationFn: supplyChainApi.deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'locations'] });
    },
  });

  return {
    locations: locationsData?.data || [],
    count: locationsData?.count || 0,
    filters: locationsData?.filters || {},
    isLoading,
    isError,
    error,
    refetch,
    createLocation,
    updateLocation,
    deleteLocation,
  };
}

interface UseSupplyChainLocationReturn {
  location: SupplyChainLocation | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useSupplyChainLocation(id: string): UseSupplyChainLocationReturn {
  const {
    data: location,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupplyChainLocation, ApiError>({
    queryKey: ['supply-chain', 'locations', id],
    queryFn: () => supplyChainApi.getLocation(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    location: location || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseNearbyLocationsOptions {
  lat: string;
  lng: string;
  radius?: string;
  page?: number;
  limit?: number;
}

interface UseNearbyLocationsReturn {
  locations: SupplyChainLocation[];
  count: number;
  searchParams: {
    coordinates: { lat: number; lng: number };
    radiusKm: number;
  };
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useNearbyLocations(options: UseNearbyLocationsOptions): UseNearbyLocationsReturn {
  const {
    data: nearbyData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{
    data: SupplyChainLocation[];
    count: number;
    searchParams: {
      coordinates: { lat: number; lng: number };
      radiusKm: number;
    };
  }, ApiError>({
    queryKey: ['supply-chain', 'locations', 'nearby', options],
    queryFn: () => supplyChainApi.getNearbyLocations(options),
    enabled: !!(options.lat && options.lng),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    locations: nearbyData?.data || [],
    count: nearbyData?.count || 0,
    searchParams: nearbyData?.searchParams || { coordinates: { lat: 0, lng: 0 }, radiusKm: 0 },
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseLocationStatsReturn {
  stats: {
    summary: {
      total: number;
      active: number;
      inactive: number;
      totalEvents: number;
    };
    byType: Record<string, { count: number; events: number; active: number }>;
    generatedAt: Date;
  } | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useLocationStats(): UseLocationStatsReturn {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{
    summary: {
      total: number;
      active: number;
      inactive: number;
      totalEvents: number;
    };
    byType: Record<string, { count: number; events: number; active: number }>;
    generatedAt: Date;
  }, ApiError>({
    queryKey: ['supply-chain', 'locations', 'stats'],
    queryFn: supplyChainApi.getLocationStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    stats: stats || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ===== RATE LIMITS HOOK =====

interface UseRateLimitInfoReturn {
  rateLimitInfo: RateLimitInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useRateLimitInfo(): UseRateLimitInfoReturn {
  const {
    data: rateLimitInfo,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<RateLimitInfo, ApiError>({
    queryKey: ['supply-chain', 'rate-limits'],
    queryFn: supplyChainApi.getRateLimitInfo,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    rateLimitInfo: rateLimitInfo || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}