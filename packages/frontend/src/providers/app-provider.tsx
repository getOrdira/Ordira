'use client';

import React from 'react';
import { AuthProvider } from './auth-provider';
import { QueryProvider } from './query-provider';
import { Web3ProviderWithErrorBoundary } from '@/lib/blockchain/providers/web3Provider';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <Web3ProviderWithErrorBoundary>
        <AuthProvider>{children}</AuthProvider>
      </Web3ProviderWithErrorBoundary>
    </QueryProvider>
  );
}