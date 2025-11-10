// src/lib/env.ts

import { z } from 'zod';

const booleanFlag = (defaultValue: boolean) =>
  z.preprocess((val) => {
    if (typeof val === 'boolean') {
      return val;
    }
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return defaultValue;
  }, z.boolean());

const envSchema = z.object({
  // Core API configuration
  NEXT_PUBLIC_API_URL: z.string().url().min(1, 'API URL is required'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  
  // Authentication & Security
  NEXT_PUBLIC_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_JWT_SECRET: z.string().optional(), // Only if needed client-side (rare)
  
  // Payment Integration
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  
  // Web3/Blockchain (aligned with your certificate/NFT features)
  NEXT_PUBLIC_WEB3_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_CHAIN_ID: z.string().optional(),
  
  // Analytics & Monitoring
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
  
  // External Services (aligned with backend integrations)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_INTERCOM_APP_ID: z.string().optional(),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_WEB3: booleanFlag(false),
  NEXT_PUBLIC_ENABLE_ANALYTICS: booleanFlag(true),
  NEXT_PUBLIC_ENABLE_NOTIFICATIONS: booleanFlag(true),
  
  // Build-time variables
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  
  // Domain mapping (aligned with your domain functionality)
  NEXT_PUBLIC_DEFAULT_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_CDN_URL: z.string().url().optional(),
});

// Validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  throw new Error('Environment variable validation failed. Check your .env file.');
}

// Create typed environment object
export const env = parsedEnv.data;

// Helper functions for environment checks
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Feature flag helpers
export const features = {
  web3Enabled: env.NEXT_PUBLIC_ENABLE_WEB3,
  analyticsEnabled: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
  notificationsEnabled: env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS,
} as const;

// Validation helpers
export const hasStripe = !!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
export const hasWeb3 = !!env.NEXT_PUBLIC_WEB3_RPC_URL && !!env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const hasAnalytics = !!env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;