// src/lib/blockchain/providers/web3Provider.tsx
'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient } from '@tanstack/react-query';
import { wagmiConfig, rainbowKitConfig, blockchainFeatureFlags } from '../config/wagmi';
import { supportedChains, defaultChain } from '../config/chains';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

interface Web3ProviderProps {
  children: ReactNode;
  queryClient?: QueryClient; // Optional if you want to pass existing QueryClient
}

interface Web3ContextValue {
  isWeb3Enabled: boolean;
  features: typeof blockchainFeatureFlags;
  supportedChainIds: number[];
  defaultChainId: number;
}

// Create context for Web3 configuration
const Web3Context = React.createContext<Web3ContextValue | null>(null);

// Hook to access Web3 context
export function useWeb3Config() {
  const context = React.useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3Config must be used within Web3Provider');
  }
  return context;
}

// Singleton to prevent multiple Web3 initializations
let isWeb3Initialized = false;
let initializationPromise: Promise<void> | null = null;

// Reset function for development hot reloading
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Reset on hot reload
  if (typeof module !== 'undefined' && (module as any).hot) {
    (module as any).hot.accept(() => {
      isWeb3Initialized = false;
      initializationPromise = null;
    });
  }
}

// Main Web3 Provider component
export function Web3Provider({ children, queryClient }: Web3ProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration issues by ensuring client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render Web3 providers during SSR
  if (!isMounted) {
    return (
      <Web3Context.Provider
        value={{
          isWeb3Enabled: false,
          features: blockchainFeatureFlags,
          supportedChainIds: supportedChains.map(chain => chain.id),
          defaultChainId: defaultChain.id,
        }}
      >
        {children}
      </Web3Context.Provider>
    );
  }

  // Check if Web3 should be enabled and properly configured
  const hasRequiredEnvVars = !!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  const isWeb3Enabled = blockchainFeatureFlags.walletConnection && 
    typeof window !== 'undefined' && 
    hasRequiredEnvVars;

  // If Web3 is disabled, provide context without blockchain providers
  if (!isWeb3Enabled) {
    if (!hasRequiredEnvVars) {
      console.warn('Web3 features disabled: Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable');
    }
    
    return (
      <Web3Context.Provider
        value={{
          isWeb3Enabled: false,
          features: blockchainFeatureFlags,
          supportedChainIds: supportedChains.map(chain => chain.id),
          defaultChainId: defaultChain.id,
        }}
      >
        {children}
      </Web3Context.Provider>
    );
  }

        // Web3 enabled - wrap with blockchain providers
        // Prevent multiple initializations
        if (isWeb3Initialized) {
          return (
            <Web3Context.Provider
              value={{
                isWeb3Enabled: true,
                features: blockchainFeatureFlags,
                supportedChainIds: supportedChains.map(chain => chain.id),
                defaultChainId: defaultChain.id,
              }}
            >
              {children}
            </Web3Context.Provider>
          );
        }

        // Mark as initialized immediately to prevent race conditions
        isWeb3Initialized = true;

  return (
    <Web3Context.Provider
      value={{
        isWeb3Enabled: true,
        features: blockchainFeatureFlags,
        supportedChainIds: supportedChains.map(chain => chain.id),
        defaultChainId: defaultChain.id,
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider
          appInfo={{
            appName: rainbowKitConfig.appName,
            learnMoreUrl: 'https://docs.rainbowkit.com',
          }}
          initialChain={rainbowKitConfig.initialChain}
          theme={rainbowKitConfig.theme as any}
          modalSize={rainbowKitConfig.modalSize}
          showRecentTransactions={rainbowKitConfig.showRecentTransactions}
          coolMode={rainbowKitConfig.coolMode}
        >
          <Web3FeatureProvider>
            {children}
          </Web3FeatureProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </Web3Context.Provider>
  );
}

// Feature-specific provider for additional Web3 functionality
function Web3FeatureProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Initialize Web3 features
    const initializeWeb3Features = async () => {
      try {
        // Check if required environment variables are set
        const requiredEnvVars = [
          'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
          'NEXT_PUBLIC_BASE_RPC_URL',
        ];

        const missingVars = requiredEnvVars.filter(
          varName => !process.env[varName]
        );

        if (missingVars.length > 0) {
          console.warn('Missing Web3 environment variables:', missingVars);
        }

        // Initialize feature-specific configurations
        if (blockchainFeatureFlags.debugMode) {
          console.log('Web3 Provider initialized with features:', blockchainFeatureFlags);
        }

        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize Web3 features:', error);
        if (isMounted) {
          setIsInitialized(true); // Still set to true to prevent blocking
        }
      }
    };

    initializeWeb3Features();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading state during initialization
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

// Error Boundary for Web3 Provider
interface Web3ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class Web3ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  Web3ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Web3ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Web3Provider Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or default error message
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Web3 Initialization Error
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                There was an error initializing the Web3 provider. The app will continue to work with limited functionality.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that combines Web3Provider with Error Boundary
export function Web3ProviderWithErrorBoundary({ 
  children, 
  queryClient 
}: Web3ProviderProps) {
  return (
    <Web3ErrorBoundary>
      <Web3Provider queryClient={queryClient}>
        {children}
      </Web3Provider>
    </Web3ErrorBoundary>
  );
}

// Hook to check if Web3 features are available and enabled
export function useWeb3Available() {
  const config = useWeb3Config();
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if Web3 is available and properly configured
    const checkAvailability = async () => {
      if (!config.isWeb3Enabled) {
        setIsAvailable(false);
        return;
      }

      try {
        // Check if window.ethereum is available (for wallet detection)
        const hasEthereum = typeof window !== 'undefined' && window.ethereum;
        
        // Check if required environment variables are set
        const hasRequiredEnvVars = 
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID &&
          process.env.NEXT_PUBLIC_BASE_RPC_URL;

        setIsAvailable(!!hasEthereum && !!hasRequiredEnvVars);
      } catch (error) {
        console.error('Error checking Web3 availability:', error);
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, [config.isWeb3Enabled]);

  return {
    isAvailable,
    isEnabled: config.isWeb3Enabled,
    features: config.features,
    supportedChains: config.supportedChainIds,
    defaultChain: config.defaultChainId,
  };
}

// Development helper component for Web3 debugging
export function Web3DevTools() {
  const config = useWeb3Config();

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !blockchainFeatureFlags.debugMode) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs max-w-xs">
      <div className="font-semibold mb-1">Web3 Debug Info</div>
      <div>Enabled: {config.isWeb3Enabled ? '✅' : '❌'}</div>
      <div>Default Chain: {config.defaultChainId}</div>
      <div>Features: {Object.entries(config.features).filter(([_, enabled]) => enabled).map(([name]) => name).join(', ')}</div>
    </div>
  );
}

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}