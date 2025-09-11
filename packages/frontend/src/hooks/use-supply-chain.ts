// src/hooks/use-supply-chain.ts

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { 
  SupplyChainEvent, 
  SupplyChainEventListResponse, 
  SupplyChainEventDetailResponse,
  CreateSupplyChainEventRequest,
  UpdateSupplyChainEventRequest,
  SupplyChainAnalyticsResponse
} from '@/lib/types/supply-chain';
import * as supplyChainApi from '@/lib/api/supply-chain';
import { ApiError } from '@/lib/errors';

interface UseSupplyChainEventsOptions {
  businessId?: string;
  manufacturerId?: string;
  productId?: string;
  eventType?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseSupplyChainEventsReturn {
  // Data
  events: SupplyChainEvent[];
  event: SupplyChainEvent | null;
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
  
  // Analytics
  analytics: {
    totalEvents: number;
    completedEvents: number;
    pendingEvents: number;
    failedEvents: number;
    averageProcessingTime: number;
  };
  
  // Actions
  createEvent: UseMutationResult<SupplyChainEvent, ApiError, CreateSupplyChainEventRequest>;
  updateEvent: UseMutationResult<SupplyChainEvent, ApiError, { id: string; data: UpdateSupplyChainEventRequest }>;
  deleteEvent: UseMutationResult<{ success: boolean }, ApiError, string>;
  processEvent: UseMutationResult<SupplyChainEvent, ApiError, string>;
  retryEvent: UseMutationResult<SupplyChainEvent, ApiError, string>;
  
  // Refetch functions
  refetch: () => void;
  refetchEvent: (id: string) => void;
}

export function useSupplyChainEvents(options: UseSupplyChainEventsOptions = {}): UseSupplyChainEventsReturn {
  const queryClient = useQueryClient();
  
  const {
    businessId,
    manufacturerId,
    productId,
    eventType,
    status,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Fetch supply chain events list
  const {
    data: eventsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupplyChainEventListResponse, ApiError>({
    queryKey: ['supply-chain', 'events', 'list', { businessId, manufacturerId, productId, eventType, status, dateFrom, dateTo, page, limit, sortBy, sortOrder }],
    queryFn: () => supplyChainApi.getSupplyChainEvents({
      business: businessId,
      manufacturer: manufacturerId,
      product: productId,
      eventType,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create event mutation
  const createEvent = useMutation<SupplyChainEvent, ApiError, CreateSupplyChainEventRequest>({
    mutationFn: supplyChainApi.createSupplyChainEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'events', 'list'] });
    },
  });

  // Update event mutation
  const updateEvent = useMutation<SupplyChainEvent, ApiError, { id: string; data: UpdateSupplyChainEventRequest }>({
    mutationFn: ({ id, data }) => supplyChainApi.updateSupplyChainEvent(id, data),
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'events', 'list'] });
      queryClient.setQueryData(['supply-chain', 'events', 'detail', updatedEvent._id], updatedEvent);
    },
  });

  // Delete event mutation
  const deleteEvent = useMutation<{ success: boolean }, ApiError, string>({
    mutationFn: supplyChainApi.deleteSupplyChainEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'events', 'list'] });
    },
  });

  // Process event mutation
  const processEvent = useMutation<SupplyChainEvent, ApiError, string>({
    mutationFn: supplyChainApi.processSupplyChainEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'events', 'list'] });
    },
  });

  // Retry event mutation
  const retryEvent = useMutation<SupplyChainEvent, ApiError, string>({
    mutationFn: supplyChainApi.retrySupplyChainEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain', 'events', 'list'] });
    },
  });

  // Refetch specific event
  const refetchEvent = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['supply-chain', 'events', 'detail', id] });
  };

  return {
    events: eventsData?.events || [],
    event: null, // Will be set by useSupplyChainEvent hook
    isLoading,
    isError,
    error,
    pagination: {
      page: eventsData?.pagination?.page || 1,
      limit: eventsData?.limit || 20,
      total: eventsData?.pagination?.total || 0,
      totalPages: eventsData?.pagination?.totalPages || 0,
      hasNext: eventsData?.pagination?.hasNext || false,
      hasPrev: eventsData?.pagination?.hasPrev || false,
    },
    analytics: {
      totalEvents: eventsData?.analytics?.totalEvents || 0,
      completedEvents: eventsData?.analytics?.completedEvents || 0,
      pendingEvents: eventsData?.analytics?.pendingEvents || 0,
      failedEvents: eventsData?.analytics?.failedEvents || 0,
      averageProcessingTime: eventsData?.analytics?.averageProcessingTime || 0,
    },
    createEvent,
    updateEvent,
    deleteEvent,
    processEvent,
    retryEvent,
    refetch,
    refetchEvent,
  };
}

interface UseSupplyChainEventOptions {
  id: string;
  enabled?: boolean;
}

interface UseSupplyChainEventReturn {
  event: SupplyChainEvent | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useSupplyChainEvent({ id, enabled = true }: UseSupplyChainEventOptions): UseSupplyChainEventReturn {
  const {
    data: eventData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupplyChainEventDetailResponse, ApiError>({
    queryKey: ['supply-chain', 'events', 'detail', id],
    queryFn: () => supplyChainApi.getSupplyChainEvent(id),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    event: eventData?.event || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseSupplyChainAnalyticsReturn {
  analytics: SupplyChainAnalyticsResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useSupplyChainAnalytics(options: {
  businessId?: string;
  manufacturerId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): UseSupplyChainAnalyticsReturn {
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SupplyChainAnalyticsResponse, ApiError>({
    queryKey: ['supply-chain', 'analytics', options],
    queryFn: () => supplyChainApi.getSupplyChainAnalytics(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    analytics: analyticsData || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseQRCodeScanReturn {
  scanQRCode: UseMutationResult<any, ApiError, { qrCodeData: string; productId?: string }>;
  isLoading: boolean;
  error: ApiError | null;
}

export function useQRCodeScan(): UseQRCodeScanReturn {
  const {
    mutate: scanQRCode,
    isLoading,
    error,
  } = useMutation({
    mutationFn: ({ qrCodeData, productId }) => supplyChainApi.scanQRCode(qrCodeData, productId),
  });

  return {
    scanQRCode,
    isLoading,
    error,
  };
}
