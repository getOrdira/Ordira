// src/lib/config.ts

import Joi from 'joi';
import { commonSchemas } from './validation/utils';

/**
 * Environment validation schema
 * Mirrors backend validateEnv.ts patterns but for frontend-specific variables
 */
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  
  // API Configuration
  NEXT_PUBLIC_API_URL: Joi.string()
    .uri()
    .default('http://localhost:5000/api')
    .messages({
      'string.uri': 'API URL must be a valid URI'
    }),
  
  NEXT_PUBLIC_APP_URL: Joi.string()
    .uri()
    .default('http://localhost:3000')
    .messages({
      'string.uri': 'App URL must be a valid URI'
    }),
  
  // Web3 Configuration (Base Chain Only)
  NEXT_PUBLIC_CHAIN_ID: Joi.number()
    .integer()
    .valid(8453, 84532) // Base Mainnet, Base Sepolia Testnet
    .default(8453),
  
  NEXT_PUBLIC_RPC_URL: Joi.string()
    .uri()
    .default('https://mainnet.base.org'),
  
  // Contract Addresses
  NEXT_PUBLIC_TOKEN_CONTRACT: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Token contract must be a valid Ethereum address'
    }),
  
  NEXT_PUBLIC_VOTING_FACTORY: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Voting factory must be a valid Ethereum address'
    }),
  
  NEXT_PUBLIC_NFT_FACTORY: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .messages({
      'string.pattern.base': 'NFT factory must be a valid Ethereum address'
    }),
  
  // Analytics and Monitoring
  NEXT_PUBLIC_SENTRY_DSN: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Sentry DSN must be a valid URI'
    }),
  
  NEXT_PUBLIC_GA_TRACKING_ID: Joi.string()
    .pattern(/^G-[A-Z0-9]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Google Analytics tracking ID must be in format G-XXXXXXXXXX'
    }),
  
  // External Service Configuration
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Joi.string()
    .pattern(/^pk_(test_|live_)[a-zA-Z0-9]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Stripe publishable key must start with pk_test_ or pk_live_'
    }),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: Joi.boolean()
    .default(true),
  
  NEXT_PUBLIC_ENABLE_WEB3: Joi.boolean()
    .default(true),
  
  NEXT_PUBLIC_ENABLE_NOTIFICATIONS: Joi.boolean()
    .default(true),
  
  NEXT_PUBLIC_ENABLE_PRODUCT_SELECTION_VOTING: Joi.boolean()
    .default(true),
  
  NEXT_PUBLIC_MAINTENANCE_MODE: Joi.boolean()
    .default(false)
}).unknown(true); // Allow other Next.js environment variables

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false
  });

  if (error) {
    console.error('Environment validation errors:', error.details.map(d => d.message));
    throw new Error('Invalid environment configuration');
  }

  return value;
}

// Validate environment on import
const env = validateEnvironment();

/**
 * Application Configuration
 * Type-safe configuration object with validated environment variables
 */
export interface AppConfig {
  // Environment
  env: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    version: string;
  };
  
  // App Configuration
  app: {
    name: string;
    version: string;
    url: string;
    description: string;
  };
  
  // Web3 Configuration
  web3: {
    enabled: boolean;
    chainId: number;
    rpcUrl: string;
    contracts: {
      token?: string;
      votingFactory?: string;
      nftFactory?: string;
    };
    networks: Record<number, NetworkConfig>;
  };
  
  // Authentication Configuration
  auth: {
    tokenKey: string;
    refreshTokenKey: string;
    sessionTimeout: number; // minutes
    rememberMeDuration: number; // days
  };
  
  // UI Configuration
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
  
  // Feature Flags
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
  
  // External Services
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
  };
  
  // Limits and Constraints
  limits: {
    upload: {
      maxSize: number; // bytes
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
  
  // URLs and Endpoints
  urls: {
    app: string;
    api: string;
    docs: string;
    support: string;
    terms: string;
    privacy: string;
  };
}

/**
 * Network configuration interface
 */
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

/**
 * Create the main configuration object
 */
export const config: AppConfig = {
  // Environment
  env: env.NODE_ENV as 'development' | 'staging' | 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isStaging: env.NODE_ENV === 'staging',
  
  // API Configuration
  api: {
    baseUrl: env.NEXT_PUBLIC_API_URL,
    timeout: 30000, // 30 seconds
    retries: 3,
    version: 'v1'
  },
  
  // App Configuration
  app: {
    name: 'B2B Marketplace',
    version: '1.0.0',
    url: env.NEXT_PUBLIC_APP_URL,
    description: 'B2B Marketplace with Product Selection Voting and NFT Certificates'
  },
  
  // Web3 Configuration
  web3: {
    enabled: env.NEXT_PUBLIC_ENABLE_WEB3,
    chainId: env.NEXT_PUBLIC_CHAIN_ID,
    rpcUrl: env.NEXT_PUBLIC_RPC_URL,
    contracts: {
      token: env.NEXT_PUBLIC_TOKEN_CONTRACT,
      votingFactory: env.NEXT_PUBLIC_VOTING_FACTORY,
      nftFactory: env.NEXT_PUBLIC_NFT_FACTORY
    },
    networks: {
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
    }
  },
  
  // Authentication Configuration
  auth: {
    tokenKey: 'auth_token',
    refreshTokenKey: 'refresh_token',
    sessionTimeout: 480, // 8 hours
    rememberMeDuration: 30 // 30 days
  },
  
  // UI Configuration
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
  
  // Feature Flags
  features: {
    analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    web3: env.NEXT_PUBLIC_ENABLE_WEB3,
    notifications: env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS,
    productSelectionVoting: env.NEXT_PUBLIC_ENABLE_PRODUCT_SELECTION_VOTING,
    maintenanceMode: env.NEXT_PUBLIC_MAINTENANCE_MODE,
    darkMode: true,
    emailGating: true,
    realTimeUpdates: true
  },
  
  // External Services
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
        enabled: env.NODE_ENV === 'production',
        environment: env.NODE_ENV
      }
    }),
    ...(env.NEXT_PUBLIC_GA_TRACKING_ID && {
      analytics: {
        gaTrackingId: env.NEXT_PUBLIC_GA_TRACKING_ID,
        enabled: env.NODE_ENV === 'production'
      }
    })
  },
  
  // Limits and Constraints
  limits: {
    upload: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
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
  
  // URLs and Endpoints
  urls: {
    app: env.NEXT_PUBLIC_APP_URL,
    api: env.NEXT_PUBLIC_API_URL,
    docs: `${env.NEXT_PUBLIC_APP_URL}/docs`,
    support: `${env.NEXT_PUBLIC_APP_URL}/support`,
    terms: `${env.NEXT_PUBLIC_APP_URL}/terms`,
    privacy: `${env.NEXT_PUBLIC_APP_URL}/privacy`
  }
};

/**
 * Application Constants
 * Static values used throughout the application
 */
export const APP_CONSTANTS = {
  // Pages and Routes
  PAGES: {
    DASHBOARD: 'dashboard',
    VOTING: 'voting',
    CERTIFICATES: 'certificates',
    PRODUCTS: 'products',
    DOMAINS: 'domains',
    INTEGRATIONS: 'integrations',
    API_KEYS: 'api-keys',
    DOCUMENTATION: 'documentation',
    ANALYTICS: 'analytics',
    CUSTOMERS: 'customers',
    COLLECTIONS: 'collections',
    SETTINGS: 'settings',
    PROFILE: 'profile'
  } as const,
  
  // User Roles
  USER_ROLES: {
    CUSTOMER: 'customer',
    MANUFACTURER: 'manufacturer',
    BRAND: 'brand'
  } as const,
  
  // Product Selection Voting
  VOTING: {
    MAX_SELECTIONS_PER_VOTER: 10,
    MIN_SELECTIONS_PER_VOTER: 1,
    MAX_PRODUCTS_PER_PROPOSAL: 50,
    MIN_PRODUCTS_PER_PROPOSAL: 2,
    VOTING_SOURCES: ['web', 'mobile', 'api', 'widget'] as const
  } as const,
  
  // Plans
  PLANS: {
    FOUNDATION: 'foundation',
    GROWTH: 'growth',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise'
  } as const,
  
  // Notification Categories
  NOTIFICATION_CATEGORIES: {
    SYSTEM: 'system',
    BILLING: 'billing',
    CERTIFICATE: 'certificate',
    VOTE: 'vote',
    INVITE: 'invite',
    ORDER: 'order',
    SECURITY: 'security',
    PRODUCT_SELECTION: 'product_selection'
  } as const,
  
  // API Keys Permissions
  API_PERMISSIONS: {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    PRODUCTS_READ: 'products:read',
    PRODUCTS_WRITE: 'products:write',
    PRODUCTS_DELETE: 'products:delete',
    ANALYTICS_READ: 'analytics:read',
    CERTIFICATES_READ: 'certificates:read',
    CERTIFICATES_WRITE: 'certificates:write',
    VOTES_READ: 'votes:read',
    VOTES_WRITE: 'votes:write',
    NFTS_READ: 'nfts:read',
    NFTS_WRITE: 'nfts:write'
  } as const,
  
  // Customer Sources
  CUSTOMER_SOURCES: {
    MANUAL: 'manual',
    SHOPIFY: 'shopify',
    WOOCOMMERCE: 'woocommerce',
    CSV_IMPORT: 'csv_import',
    API_IMPORT: 'api_import'
  } as const,
  
  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  } as const,
  
  // Countries (aligned with existing constants)
  COUNTRIES: [
    'United States', 'China', 'Germany', 'India', 'Japan', 'United Kingdom',
    'France', 'Italy', 'Canada', 'Brazil', 'Russia', 'Spain', 'South Korea',
    'Australia', 'Mexico', 'Turkey', 'Indonesia', 'Netherlands', 'Saudi Arabia',
    'Poland', 'Belgium', 'Sweden', 'Ireland', 'Austria', 'Israel', 'Norway',
    'United Arab Emirates', 'Egypt', 'South Africa', 'Finland', 'Chile',
    'Portugal', 'New Zealand', 'Czech Republic', 'Romania', 'Vietnam',
    'Bangladesh', 'Philippines', 'Denmark', 'Singapore', 'Malaysia', 
    'Thailand', 'Argentina', 'Ireland', 'Greece', 'Hungary', 'Ukraine'
  ] as const,
  
  // Industries
  INDUSTRIES: [
    'Textile Manufacturing', 'Food & Beverage Manufacturing', 'Electronics Manufacturing',
    'Automotive Manufacturing', 'Pharmaceutical Manufacturing', 'Chemical Manufacturing',
    'Machinery Manufacturing', 'Metal Fabrication', 'Plastic Manufacturing',
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Education', 'Consulting',
    'Real Estate', 'Construction', 'Transportation', 'Energy', 'Media', 'Other'
  ] as const,
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  } as const
} as const;

/**
 * Environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const baseConfig = {
    isDevelopment: config.isDevelopment,
    isProduction: config.isProduction,
    isStaging: config.isStaging
  };

  if (config.isDevelopment) {
    return {
      ...baseConfig,
      enableLogging: true,
      enableDebugMode: true,
      showErrorDetails: true,
      enableHotReload: true
    };
  }

  if (config.isStaging) {
    return {
      ...baseConfig,
      enableLogging: true,
      enableDebugMode: false,
      showErrorDetails: true,
      enableHotReload: false
    };
  }

  return {
    ...baseConfig,
    enableLogging: false,
    enableDebugMode: false,
    showErrorDetails: false,
    enableHotReload: false
  };
};

/**
 * Type definitions for constants
 */
export type PageKey = (typeof APP_CONSTANTS.PAGES)[keyof typeof APP_CONSTANTS.PAGES];
export type UserRole = (typeof APP_CONSTANTS.USER_ROLES)[keyof typeof APP_CONSTANTS.USER_ROLES];
export type PlanType = (typeof APP_CONSTANTS.PLANS)[keyof typeof APP_CONSTANTS.PLANS];
export type NotificationCategory = (typeof APP_CONSTANTS.NOTIFICATION_CATEGORIES)[keyof typeof APP_CONSTANTS.NOTIFICATION_CATEGORIES];
export type ApiPermission = (typeof APP_CONSTANTS.API_PERMISSIONS)[keyof typeof APP_CONSTANTS.API_PERMISSIONS];
export type CustomerSource = (typeof APP_CONSTANTS.CUSTOMER_SOURCES)[keyof typeof APP_CONSTANTS.CUSTOMER_SOURCES];
export type VotingSource = (typeof APP_CONSTANTS.VOTING.VOTING_SOURCES)[number];
export type Country = (typeof APP_CONSTANTS.COUNTRIES)[number];
export type Industry = (typeof APP_CONSTANTS.INDUSTRIES)[number];

/**
 * Utility functions
 */
export const isFeatureEnabled = (feature: keyof AppConfig['features']): boolean => {
  return config.features[feature];
};

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

export const getCurrentNetwork = (): NetworkConfig | undefined => {
  return getNetworkConfig(config.web3.chainId);
};

export const isTestnet = (chainId?: number): boolean => {
  const network = getNetworkConfig(chainId || config.web3.chainId);
  return network?.testnet ?? false;
};

export default config;