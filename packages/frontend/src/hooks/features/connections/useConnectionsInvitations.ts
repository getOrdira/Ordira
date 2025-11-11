'use client';

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import connectionsInvitationsApi from '@/lib/api/features/connections/connectionsInvitations.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeParams = <T extends object>(params?: T) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

type InvitationSummary = Awaited<ReturnType<typeof connectionsInvitationsApi.getInvitation>>;
type InvitationList = Awaited<ReturnType<typeof connectionsInvitationsApi.listBrandInvitations>>;
type ConnectionStats = Awaited<
  ReturnType<typeof connectionsInvitationsApi.getBrandConnectionStats>
>;
type ManufacturerConnectionStats = Awaited<
  ReturnType<typeof connectionsInvitationsApi.getManufacturerConnectionStats>
>;
type SendInvitationPayload = Parameters<typeof connectionsInvitationsApi.sendInvitation>[0];
type SendInvitationResponse = Awaited<
  ReturnType<typeof connectionsInvitationsApi.sendInvitation>
>;
type BulkInvitationPayload = Parameters<typeof connectionsInvitationsApi.bulkInvite>[0];
type BulkInvitationResponse = Awaited<ReturnType<typeof connectionsInvitationsApi.bulkInvite>>;
type InvitationResponsePayload = Parameters<typeof connectionsInvitationsApi.respondInvitation>[0];
type ConnectionStatusParams = Parameters<typeof connectionsInvitationsApi.checkConnectionStatus>[0];
type InvitationActivityParams = Parameters<typeof connectionsInvitationsApi.getRecentActivity>[0];
type ConnectionActivity = Awaited<
  ReturnType<typeof connectionsInvitationsApi.getRecentActivity>
>;

export const connectionsInvitationsQueryKeys = {
  root: ['connections', 'invitations'] as const,
  invitation: (inviteId: string) =>
    [...connectionsInvitationsQueryKeys.root, 'invitation', inviteId] as const,
  brandAll: () => [...connectionsInvitationsQueryKeys.root, 'brand', 'all'] as const,
  brandPending: () => [...connectionsInvitationsQueryKeys.root, 'brand', 'pending'] as const,
  brandStats: () => [...connectionsInvitationsQueryKeys.root, 'brand', 'stats'] as const,
  connectedManufacturers: () =>
    [...connectionsInvitationsQueryKeys.root, 'brand', 'connected-manufacturers'] as const,
  manufacturerAll: () => [...connectionsInvitationsQueryKeys.root, 'manufacturer', 'all'] as const,
  manufacturerPending: () =>
    [...connectionsInvitationsQueryKeys.root, 'manufacturer', 'pending'] as const,
  manufacturerStats: () =>
    [...connectionsInvitationsQueryKeys.root, 'manufacturer', 'stats'] as const,
  connectedBrands: () =>
    [...connectionsInvitationsQueryKeys.root, 'manufacturer', 'connected-brands'] as const,
  status: (brandId: string, manufacturerId: string) =>
    [...connectionsInvitationsQueryKeys.root, 'status', brandId, manufacturerId] as const,
  activity: (params?: InvitationActivityParams) =>
    [...connectionsInvitationsQueryKeys.root, 'activity', normalizeParams(params)] as const
};

export const connectionsInvitationsMutationKeys = {
  send: [...connectionsInvitationsQueryKeys.root, 'send'] as const,
  bulk: [...connectionsInvitationsQueryKeys.root, 'bulk'] as const,
  respond: [...connectionsInvitationsQueryKeys.root, 'respond'] as const,
  cancel: [...connectionsInvitationsQueryKeys.root, 'cancel'] as const,
  removeConnection: [...connectionsInvitationsQueryKeys.root, 'remove-connection'] as const
};

export const useConnectionInvitation = (
  inviteId: string,
  options?: QueryOptions<InvitationSummary>
): UseQueryResult<InvitationSummary, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.invitation(inviteId),
    queryFn: () => connectionsInvitationsApi.getInvitation(inviteId),
    enabled: Boolean(inviteId) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandInvitations = (
  options?: QueryOptions<InvitationList>
): UseQueryResult<InvitationList, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.brandAll(),
    queryFn: () => connectionsInvitationsApi.listBrandInvitations(),
    ...options
  });
};

export const usePendingBrandInvitations = (
  options?: QueryOptions<InvitationList>
): UseQueryResult<InvitationList, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.brandPending(),
    queryFn: () => connectionsInvitationsApi.listPendingBrandInvitations(),
    ...options
  });
};

export const useBrandConnectionStats = (
  options?: QueryOptions<ConnectionStats>
): UseQueryResult<ConnectionStats, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.brandStats(),
    queryFn: () => connectionsInvitationsApi.getBrandConnectionStats(),
    ...options
  });
};

export const useConnectedManufacturers = (
  options?: QueryOptions<string[]>
): UseQueryResult<string[], ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.connectedManufacturers(),
    queryFn: () => connectionsInvitationsApi.getConnectedManufacturers(),
    ...options
  });
};

export const useManufacturerInvitations = (
  options?: QueryOptions<InvitationList>
): UseQueryResult<InvitationList, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.manufacturerAll(),
    queryFn: () => connectionsInvitationsApi.listManufacturerInvitations(),
    ...options
  });
};

export const usePendingManufacturerInvitations = (
  options?: QueryOptions<InvitationList>
): UseQueryResult<InvitationList, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.manufacturerPending(),
    queryFn: () => connectionsInvitationsApi.listPendingManufacturerInvitations(),
    ...options
  });
};

export const useManufacturerConnectionStats = (
  options?: QueryOptions<ManufacturerConnectionStats>
): UseQueryResult<ManufacturerConnectionStats, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.manufacturerStats(),
    queryFn: () => connectionsInvitationsApi.getManufacturerConnectionStats(),
    ...options
  });
};

export const useConnectedBrands = (
  options?: QueryOptions<string[]>
): UseQueryResult<string[], ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.connectedBrands(),
    queryFn: () => connectionsInvitationsApi.getConnectedBrands(),
    ...options
  });
};

export const useConnectionStatus = (
  params: ConnectionStatusParams,
  options?: QueryOptions<boolean>
): UseQueryResult<boolean, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.status(params.brandId, params.manufacturerId),
    queryFn: () => connectionsInvitationsApi.checkConnectionStatus(params),
    enabled:
      Boolean(params?.brandId) && Boolean(params?.manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useConnectionsRecentActivity = (
  params?: InvitationActivityParams,
  options?: QueryOptions<ConnectionActivity>
): UseQueryResult<ConnectionActivity, ApiError> => {
  return useQuery({
    queryKey: connectionsInvitationsQueryKeys.activity(params),
    queryFn: () => connectionsInvitationsApi.getRecentActivity(params),
    ...options
  });
};

export const useSendConnectionInvitation = (
  options?: MutationConfig<SendInvitationResponse, SendInvitationPayload>
): UseMutationResult<SendInvitationResponse, ApiError, SendInvitationPayload, unknown> => {
  return useMutation({
    mutationKey: connectionsInvitationsMutationKeys.send,
    mutationFn: connectionsInvitationsApi.sendInvitation,
    ...options
  });
};

export const useBulkConnectionInvites = (
  options?: MutationConfig<BulkInvitationResponse, BulkInvitationPayload>
): UseMutationResult<BulkInvitationResponse, ApiError, BulkInvitationPayload, unknown> => {
  return useMutation({
    mutationKey: connectionsInvitationsMutationKeys.bulk,
    mutationFn: connectionsInvitationsApi.bulkInvite,
    ...options
  });
};

export const useRespondToConnectionInvitation = (
  options?: MutationConfig<InvitationSummary, InvitationResponsePayload>
): UseMutationResult<InvitationSummary, ApiError, InvitationResponsePayload, unknown> => {
  return useMutation({
    mutationKey: connectionsInvitationsMutationKeys.respond,
    mutationFn: connectionsInvitationsApi.respondInvitation,
    ...options
  });
};

export const useCancelConnectionInvitation = (
  options?: MutationConfig<boolean, string>
): UseMutationResult<boolean, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: connectionsInvitationsMutationKeys.cancel,
    mutationFn: connectionsInvitationsApi.cancelInvitation,
    ...options
  });
};

export const useRemoveConnection = (
  options?: MutationConfig<boolean, string>
): UseMutationResult<boolean, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: connectionsInvitationsMutationKeys.removeConnection,
    mutationFn: connectionsInvitationsApi.removeConnection,
    ...options
  });
};
