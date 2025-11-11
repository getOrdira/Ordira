'use client';

// src/hooks/features/media/useMediaSearch.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import mediaSearchApi, {
  type MediaSearchQueryOptions
} from '@/lib/api/features/media/mediaSearch.api';
import type { MediaSearchResult } from '@/lib/types/features/media';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type SearchMediaVariables = {
  query: string;
  options?: MediaSearchQueryOptions;
};

type SearchByTagsVariables = {
  tags: string[] | string;
  options?: Omit<MediaSearchQueryOptions, 'page'>;
};

export const mediaSearchMutationKeys = {
  text: ['media', 'search', 'text'] as const,
  tags: ['media', 'search', 'tags'] as const
};

export const useMediaSearch = (
  options?: MutationConfig<MediaSearchResult, SearchMediaVariables>
): UseMutationResult<MediaSearchResult, ApiError, SearchMediaVariables, unknown> => {
  return useMutation({
    mutationKey: mediaSearchMutationKeys.text,
    mutationFn: ({ query, options: searchOptions }) =>
      mediaSearchApi.searchMedia(query, searchOptions),
    ...options
  });
};

export const useMediaSearchByTags = (
  options?: MutationConfig<MediaSearchResult, SearchByTagsVariables>
): UseMutationResult<MediaSearchResult, ApiError, SearchByTagsVariables, unknown> => {
  return useMutation({
    mutationKey: mediaSearchMutationKeys.tags,
    mutationFn: ({ tags, options: searchOptions }) =>
      mediaSearchApi.searchByTags(tags, searchOptions),
    ...options
  });
};
