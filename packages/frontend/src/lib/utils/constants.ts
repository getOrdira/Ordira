// src/lib/utils/constants.ts
export const PAGES = {
    DASHBOARD: 'dashboard',
    VOTING: 'voting',
    CERTIFICATES: 'certificates',
    PRODUCTS: 'products',
    DOMAINS: 'domains',
    INTEGRATIONS: 'integrations',
    API_KEYS: 'api-keys',
    DOCUMENTATION: 'documentation',
  } as const;
  
  export type PageKey = (typeof PAGES)[keyof typeof PAGES];
  
  export const COUNTRIES = [
    'United States',
    'China',
    'Germany',
    'India',
    'Japan',
    'United Kingdom',
    'France',
    'Italy',
    'Canada',
    'Brazil',
    'Russia',
    'Spain',
    'South Korea',
    'Australia',
    'Mexico',
    'Turkey',
    'Indonesia',
    'Netherlands',
    'Saudi Arabia',
    'Poland',
    // ... add more countries as needed
  ];
  
  export const OCCUPATIONS = ['Brand', 'Creator', 'Manufacturer'];
  