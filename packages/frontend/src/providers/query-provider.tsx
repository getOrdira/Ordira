// src/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { useState } from 'react';
import { ApiError } from '@/lib/errors/errors';

const shouldRetryRequest = (failureCount: number, error: unknown): boolean => {
  const maybeApiError =
    typeof error === 'object' && error !== null ? (error as Partial<ApiError>) : undefined;
  const statusCode =
    typeof maybeApiError?.statusCode === 'number' ? maybeApiError.statusCode : undefined;

  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
    return false;
  }

  return failureCount < 2;
};


interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const isDev = process.env.NODE_ENV !== 'production';
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: shouldRetryRequest,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: shouldRetryRequest,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children as any}
      {/* The Devtools are a powerful debugging tool for development. */}
      {/* They will not be included in production builds. */}
      {isDev ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}