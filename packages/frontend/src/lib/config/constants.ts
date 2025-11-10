// src/lib/config/constants.ts

export const APP_CONSTANTS = {
  PAGES: {
    DASHBOARD: 'dashboard',
    VOTING: 'voting',
    CERTIFICATES: 'certificates',
    PRODUCTS: 'products',
    DOMAINS: 'domains',
    INTEGRATIONS: 'integrations',
    ANALYTICS: 'analytics',
    CONNECTIONS: 'connections',
    SUPPLY_CHAIN: 'supply-chain',
    SETTINGS: 'settings',
    PROFILE: 'profile'
  } as const,

  USER_ROLES: {
    CUSTOMER: 'customer',
    MANUFACTURER: 'manufacturer',
    BRAND: 'brand',
    CREATOR: 'creator'
  } as const,

  PLANS: {
    FOUNDATION: 'foundation',
    GROWTH: 'growth',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise'
  } as const,

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

  CUSTOMER_SOURCES: {
    MANUAL: 'manual',
    SHOPIFY: 'shopify',
    WOOCOMMERCE: 'woocommerce',
    CSV_IMPORT: 'csv_import',
    API_IMPORT: 'api_import'
  } as const,

  VOTING: {
    MAX_SELECTIONS_PER_VOTER: 10,
    MIN_SELECTIONS_PER_VOTER: 1,
    MAX_PRODUCTS_PER_PROPOSAL: 50,
    MIN_PRODUCTS_PER_PROPOSAL: 2,
    VOTING_SOURCES: ['web', 'mobile', 'api', 'widget'] as const
  } as const,

  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    ALLOWED_DOCUMENT_TYPES: [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  } as const,

  COUNTRIES: [
    'United States', 'China', 'Germany', 'India', 'Japan', 'United Kingdom',
    'France', 'Italy', 'Canada', 'Brazil', 'Russia', 'Spain', 'South Korea',
    'Australia', 'Mexico', 'Turkey', 'Indonesia', 'Netherlands', 'Saudi Arabia',
    'Poland', 'Belgium', 'Sweden', 'Ireland', 'Austria', 'Israel', 'Norway',
    'United Arab Emirates', 'Egypt', 'South Africa', 'Finland', 'Chile',
    'Portugal', 'New Zealand', 'Czech Republic', 'Romania', 'Vietnam',
    'Bangladesh', 'Philippines', 'Denmark', 'Singapore', 'Malaysia',
    'Thailand', 'Argentina', 'Greece', 'Hungary', 'Ukraine'
  ] as const,

  INDUSTRIES: [
    'Textile Manufacturing', 'Food & Beverage Manufacturing', 'Electronics Manufacturing',
    'Automotive Manufacturing', 'Pharmaceutical Manufacturing', 'Chemical Manufacturing',
    'Machinery Manufacturing', 'Metal Fabrication', 'Plastic Manufacturing',
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Education', 'Consulting',
    'Real Estate', 'Construction', 'Transportation', 'Energy', 'Media', 'Other'
  ] as const
} as const;

export type PageKey = (typeof APP_CONSTANTS.PAGES)[keyof typeof APP_CONSTANTS.PAGES];
export type UserRoleConstant = (typeof APP_CONSTANTS.USER_ROLES)[keyof typeof APP_CONSTANTS.USER_ROLES];
export type PlanType = (typeof APP_CONSTANTS.PLANS)[keyof typeof APP_CONSTANTS.PLANS];
export type NotificationCategory = (typeof APP_CONSTANTS.NOTIFICATION_CATEGORIES)[keyof typeof APP_CONSTANTS.NOTIFICATION_CATEGORIES];
export type ApiPermission = (typeof APP_CONSTANTS.API_PERMISSIONS)[keyof typeof APP_CONSTANTS.API_PERMISSIONS];
export type CustomerSource = (typeof APP_CONSTANTS.CUSTOMER_SOURCES)[keyof typeof APP_CONSTANTS.CUSTOMER_SOURCES];
export type VotingSource = (typeof APP_CONSTANTS.VOTING.VOTING_SOURCES)[number];
export type Country = (typeof APP_CONSTANTS.COUNTRIES)[number];
export type Industry = (typeof APP_CONSTANTS.INDUSTRIES)[number];


