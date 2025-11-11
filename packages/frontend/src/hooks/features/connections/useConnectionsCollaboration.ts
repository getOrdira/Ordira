'use client';

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import connectionsCollaborationApi from '@/lib/api/features/connections/connectionsCollaboration.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeParams = <T extends object>(params?: T) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

type CollaborationParams = Parameters<typeof connectionsCollaborationApi.getOverview>[0];
type CatalogParams = Parameters<typeof connectionsCollaborationApi.getSharedProductCatalog>[0];
type SuggestionsParams = Parameters<typeof connectionsCollaborationApi.suggestNextSteps>[0];

type CollaborationOverview = Awaited<ReturnType<typeof connectionsCollaborationApi.getOverview>>;
type SharedCatalog = Awaited<ReturnType<typeof connectionsCollaborationApi.getSharedProductCatalog>>;
type SuggestionsResponse = Awaited<ReturnType<typeof connectionsCollaborationApi.suggestNextSteps>>;

export const connectionsCollaborationQueryKeys = {
  root: ['connections', 'collaboration'] as const,
  overview: (params?: CollaborationParams) =>
    [...connectionsCollaborationQueryKeys.root, 'overview', normalizeParams(params)] as const,
  catalog: (params?: CatalogParams) =>
    [...connectionsCollaborationQueryKeys.root, 'catalog', normalizeParams(params)] as const,
  suggestions: (params?: SuggestionsParams) =>
    [...connectionsCollaborationQueryKeys.root, 'suggestions', normalizeParams(params)] as const
};

export const useCollaborationOverview = (
  params?: CollaborationParams,
  options?: QueryOptions<CollaborationOverview>
): UseQueryResult<CollaborationOverview, ApiError> => {
  return useQuery({
    queryKey: connectionsCollaborationQueryKeys.overview(params),
    queryFn: () => connectionsCollaborationApi.getOverview(params),
    ...options
  });
};

export const useSharedCollaborationCatalog = (
  params?: CatalogParams,
  options?: QueryOptions<SharedCatalog>
): UseQueryResult<SharedCatalog, ApiError> => {
  return useQuery({
    queryKey: connectionsCollaborationQueryKeys.catalog(params),
    queryFn: () => connectionsCollaborationApi.getSharedProductCatalog(params),
    ...options
  });
};

export const useCollaborationSuggestions = (
  params?: SuggestionsParams,
  options?: QueryOptions<SuggestionsResponse>
): UseQueryResult<SuggestionsResponse, ApiError> => {
  return useQuery({
    queryKey: connectionsCollaborationQueryKeys.suggestions(params),
    queryFn: () => connectionsCollaborationApi.suggestNextSteps(params),
    ...options
  });
};
