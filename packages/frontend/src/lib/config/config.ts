// src/lib/config/config.ts

import { env, isDevelopment, isProduction, isTest } from './env';

export interface NetworkConfig {
  name: string;
  displayName: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testnet: boolean;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  version: string;
}

export interface AppConfig {
  environment: {
    mode: 'development' | 'production' | 'test';
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
  };
  api: ApiConfig;
  app: {
    name: string;
    version: string;
    url: string;
    description: string;
  };
  web3: {
    enabled: boolean;
    chainId: number;
    rpcUrl: string;
    contracts: {
      primary?: string;
    };
    networks: Record<number, NetworkConfig>;
  };
  auth: {
    tokenKey: string;
    refreshTokenKey: string;
    sessionTimeoutMinutes: number;
    rememberMeDurationDays: number;
  };
  ui: {
    theme: {
      defaultMode: 'light' | 'dark' | 'system';
      colors: {
        primary: string;
        secondary: string;
        accent: string;
        error: string;
        warning: string;
        success: string;
        info: string;
      };
    };
    layout: {
      sidebarWidth: number;
      headerHeight: number;
      footerHeight: number;
    };
    animation: {
      duration: number;
      easing: string;
    };
  };
  features: {
    analytics: boolean;
    web3: boolean;
    notifications: boolean;
    productSelectionVoting: boolean;
    maintenanceMode: boolean;
    darkMode: boolean;
    emailGating: boolean;
    realTimeUpdates: boolean;
  };
  services: {
    stripe?: {
      publishableKey: string;
      enabled: boolean;
    };
    sentry?: {
      dsn: string;
      enabled: boolean;
      environment: string;
    };
    analytics?: {
      gaTrackingId: string;
      enabled: boolean;
    };
    mixpanel?: {
      token: string;
      enabled: boolean;
    };
    intercom?: {
      appId: string;
      enabled: boolean;
    };
  };
  limits: {
    upload: {
      maxSize: number;
      allowedTypes: string[];
    };
    api: {
      rateLimitPerMinute: number;
      rateLimitPerHour: number;
    };
    ui: {
      maxNotifications: number;
      maxRecentItems: number;
      paginationPageSize: number;
    };
  };
  urls: {
    site: string;
    api: string;
    docs: string;
    support: string;
    terms: string;
    privacy: string;
  };
}

const DEFAULT_NETWORKS: Record<number, NetworkConfig> = {
  8453: {
    name: 'base',
    displayName: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    testnet: false
  },
  84532: {
    name: 'base-sepolia',
    displayName: 'Base Sepolia Testnet',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    testnet: true
  }
};

const parseChainId = (value?: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 8453;
};

const resolvedChainId = parseChainId(env.NEXT_PUBLIC_CHAIN_ID);
const selectedNetwork = DEFAULT_NETWORKS[resolvedChainId] ?? DEFAULT_NETWORKS[8453];

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Ordira';
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
const appDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
  'Ordira B2B platform for brands, creators, and manufacturers';

export const config: AppConfig = {
  environment: {
    mode: env.NODE_ENV,
    isDevelopment,
    isProduction,
    isTest
  },
  api: {
    baseUrl: env.NEXT_PUBLIC_API_URL,
    timeout: 30_000,
    retries: 3,
    version: 'v1'
  },
  app: {
    name: appName,
    version: appVersion,
    url: env.NEXT_PUBLIC_SITE_URL,
    description: appDescription
  },
  web3: {
    enabled: env.NEXT_PUBLIC_ENABLE_WEB3,
    chainId: resolvedChainId,
    rpcUrl: env.NEXT_PUBLIC_WEB3_RPC_URL ?? selectedNetwork.rpcUrl,
    contracts: {
      primary: env.NEXT_PUBLIC_CONTRACT_ADDRESS
    },
    networks: DEFAULT_NETWORKS
  },
  auth: {
    tokenKey: 'auth_token',
    refreshTokenKey: 'refresh_token',
    sessionTimeoutMinutes: 8 * 60,
    rememberMeDurationDays: 30
  },
  ui: {
    theme: {
      defaultMode: 'light',
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#2563EB',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#06B6D4'
      }
    },
    layout: {
      sidebarWidth: 280,
      headerHeight: 64,
      footerHeight: 80
    },
    animation: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  features: {
    analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    web3: env.NEXT_PUBLIC_ENABLE_WEB3,
    notifications: env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS,
    productSelectionVoting: true,
    maintenanceMode: false,
    darkMode: true,
    emailGating: true,
    realTimeUpdates: true
  },
  services: {
    ...(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && {
      stripe: {
        publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        enabled: true
      }
    }),
    ...(env.NEXT_PUBLIC_SENTRY_DSN && {
      sentry: {
        dsn: env.NEXT_PUBLIC_SENTRY_DSN,
        enabled: isProduction,
        environment: env.NODE_ENV
      }
    }),
    ...(env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && {
      analytics: {
        gaTrackingId: env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
        enabled: isProduction
      }
    }),
    ...(env.NEXT_PUBLIC_MIXPANEL_TOKEN && {
      mixpanel: {
        token: env.NEXT_PUBLIC_MIXPANEL_TOKEN,
        enabled: true
      }
    }),
    ...(env.NEXT_PUBLIC_INTERCOM_APP_ID && {
      intercom: {
        appId: env.NEXT_PUBLIC_INTERCOM_APP_ID,
        enabled: true
      }
    })
  },
  limits: {
    upload: {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'application/pdf'
      ]
    },
    api: {
      rateLimitPerMinute: 100,
      rateLimitPerHour: 1000
    },
    ui: {
      maxNotifications: 100,
      maxRecentItems: 50,
      paginationPageSize: 20
    }
  },
  urls: {
    site: env.NEXT_PUBLIC_SITE_URL,
    api: env.NEXT_PUBLIC_API_URL,
    docs: `${env.NEXT_PUBLIC_SITE_URL}/docs`,
    support: `${env.NEXT_PUBLIC_SITE_URL}/support`,
    terms: `${env.NEXT_PUBLIC_SITE_URL}/terms`,
    privacy: `${env.NEXT_PUBLIC_SITE_URL}/privacy`
  }
};

export type FeatureFlag = keyof AppConfig['features'];

export const isFeatureEnabled = (flag: FeatureFlag): boolean => config.features[flag];

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = config.api.baseUrl.endsWith('/')
    ? config.api.baseUrl.slice(0, -1)
    : config.api.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export const getNetworkConfig = (chainId: number): NetworkConfig | undefined => {
  return config.web3.networks[chainId];
};

export const getCurrentNetwork = (): NetworkConfig => {
  return (
    getNetworkConfig(config.web3.chainId) ??
    DEFAULT_NETWORKS[config.web3.chainId] ??
    selectedNetwork
  );
};

export const isTestnetNetwork = (chainId?: number): boolean => {
  const network = getNetworkConfig(chainId ?? config.web3.chainId);
  return network?.testnet ?? false;
};

export const getEnvironmentConfig = () => ({
  mode: config.environment.mode,
  isDevelopment,
  isProduction,
  isTest,
  enableLogging: !isProduction,
  showErrorDetails: !isProduction,
  enableHotReload: isDevelopment
});

export default config;

