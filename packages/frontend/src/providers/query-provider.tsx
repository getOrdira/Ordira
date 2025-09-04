// src/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { ApiError } from '@/lib/types/common';


export function QueryProvider({ children }: { children: React.ReactNode }) {
    
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: (failureCount, error) => {
              const apiError = error as ApiError;
              if (apiError.statusCode === 404 || apiError.statusCode === 401) {
                return false;
              }
              return failureCount < 3; // Retry up to 2 times (3 total attempts)
            },
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (

    <QueryClientProvider client={queryClient}>
      {children}
      {/* The Devtools are a powerful debugging tool for development. */}
      {/* They will not be included in production builds. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}