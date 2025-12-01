// src/constants/manufacturerPlans.ts

export const MANUFACTURER_PLAN_DEFINITIONS = {
  starter: {

    // Basic manufacturer features
    brandConnections: 5,
    supplyChainProducts: 10,
    supplyChainEndpoints: 3,
    supplyChainEvents: 100, // per month
    profileViews: 50, // per month
    storage: 1024, // MB (1 GB)
    
    // Profile features
    profilePicture: true,
    basicProfile: true,
    advancedProfile: false,
    customBranding: false,
    
    // Verification features
    basicVerification: true,
    premiumVerification: false,
    priorityReview: false,
    
    // Analytics features
    basicAnalytics: true,
    advancedAnalytics: false,
    customReports: false,
    exportData: false,
    
    // Communication features
    basicMessaging: true,
    advancedMessaging: false,
    videoCalls: false,
    fileSharing: false,
    
    // Search & Discovery
    basicSearch: true,
    advancedSearch: false,
    featuredListing: false,
    priorityPlacement: false,
    searchVisibility: {
      rankingBoost: 0, // No boost for starter plan
      maxSearchResults: 50, // Good visibility - not limited
      searchKeywords: 10, // Reasonable keywords
      profilePromotion: false,
      guaranteedVisibility: true, // Ensure starter plans appear in results
      visibilityWeight: 1.0 // Full visibility weight
    },
    
    // Support
    supportLevel: 'community',
    responseTime: '72h',
    
    // Pricing
    price: '29.99',
    stripePriceId: 'price_1S4lwUAUE6HtX6lz0gCpz9Nf',
    
    // Supply chain rate limits
    supplyChain: {
      eventsPerMinute: 2,
      eventsPerHour: 10,
      eventsPerDay: 50,
      cooldownPeriod: 30, // seconds
      burstAllowance: 5
    },
    
    // Features object for easy checking
    features: {
      hasWeb3: false,
      allowOverage: false,
      maxApiKeys: 1,
      supportLevel: 'community'
    }
  },
  
  professional: {
    // Enhanced manufacturer features
    brandConnections: 25,
    supplyChainProducts: 50,
    supplyChainEndpoints: 10,
    supplyChainEvents: 500, // per month
    profileViews: 200, // per month
    storage: 5120, // MB (5 GB)
    
    // Profile features
    profilePicture: true,
    basicProfile: true,
    advancedProfile: true,
    customBranding: true,
    
    // Verification features
    basicVerification: true,
    premiumVerification: true,
    priorityReview: false,
    
    // Analytics features
    basicAnalytics: true,
    advancedAnalytics: true,
    customReports: false,
    exportData: true,
    
    // Communication features
    basicMessaging: true,
    advancedMessaging: true,
    videoCalls: true,
    fileSharing: true,
    
    // Search & Discovery
    basicSearch: true,
    advancedSearch: true,
    featuredListing: true,
    priorityPlacement: false,
    searchVisibility: {
      rankingBoost: 15, // Moderate boost for professional plan
      maxSearchResults: 75, // Better visibility
      searchKeywords: 20, // More keywords
      profilePromotion: true,
      guaranteedVisibility: true,
      visibilityWeight: 1.2 // Slightly better visibility
    },
    
    // Support
    supportLevel: 'email',
    responseTime: '24h',
    
    // Pricing
    price: '49.99',
    stripePriceId: 'price_1S4lxJAUE6HtX6lz1OM9qHbi',
    
    // Supply chain rate limits
    supplyChain: {
      eventsPerMinute: 5,
      eventsPerHour: 30,
      eventsPerDay: 200,
      cooldownPeriod: 15, // seconds
      burstAllowance: 10
    },
    
    // Features object for easy checking
    features: {
      hasWeb3: true,
      allowOverage: false,
      maxApiKeys: 3,
      supportLevel: 'email'
    }
  },
  
  enterprise: {
    // Premium manufacturer features
    brandConnections: 100,
    supplyChainProducts: 200,
    supplyChainEndpoints: 25,
    supplyChainEvents: 2000, // per month
    profileViews: 1000, // per month
    storage: 20480, // MB (20 GB)
    
    // Profile features
    profilePicture: true,
    basicProfile: true,
    advancedProfile: true,
    customBranding: true,
    
    // Verification features
    basicVerification: true,
    premiumVerification: true,
    priorityReview: true,
    
    // Analytics features
    basicAnalytics: true,
    advancedAnalytics: true,
    customReports: true,
    exportData: true,
    
    // Communication features
    basicMessaging: true,
    advancedMessaging: true,
    videoCalls: true,
    fileSharing: true,
    
    // Search & Discovery
    basicSearch: true,
    advancedSearch: true,
    featuredListing: true,
    priorityPlacement: true,
    searchVisibility: {
      rankingBoost: 25, // High boost for enterprise plan
      maxSearchResults: 100, // Excellent visibility
      searchKeywords: 30, // Many keywords
      profilePromotion: true,
      guaranteedVisibility: true,
      visibilityWeight: 1.5 // Better visibility
    },
    
    // Support
    supportLevel: 'priority',
    responseTime: '4h',
    
    // Pricing
    price: '149.99',
    stripePriceId: 'price_1S4lyCAUE6HtX6lzJryJSYqE',
    
    // Supply chain rate limits
    supplyChain: {
      eventsPerMinute: 10,
      eventsPerHour: 100,
      eventsPerDay: 1000,
      cooldownPeriod: 10, // seconds
      burstAllowance: 25
    },
    
    // Features object for easy checking
    features: {
      hasWeb3: true,
      allowOverage: true,
      maxApiKeys: 10,
      supportLevel: 'priority'
    }
  },
  
  unlimited: {
    // Unlimited manufacturer features
    brandConnections: Infinity,
    supplyChainProducts: Infinity,
    supplyChainEndpoints: Infinity,
    supplyChainEvents: Infinity,
    profileViews: Infinity,
    storage: Infinity, // Unlimited storage
    
    // Profile features
    profilePicture: true,
    basicProfile: true,
    advancedProfile: true,
    customBranding: true,
    
    // Verification features
    basicVerification: true,
    premiumVerification: true,
    priorityReview: true,
    
    // Analytics features
    basicAnalytics: true,
    advancedAnalytics: true,
    customReports: true,
    exportData: true,
    
    // Communication features
    basicMessaging: true,
    advancedMessaging: true,
    videoCalls: true,
    fileSharing: true,
    
    // Search & Discovery
    basicSearch: true,
    advancedSearch: true,
    featuredListing: true,
    priorityPlacement: true,
    searchVisibility: {
      rankingBoost: 35, // Maximum boost for unlimited plan
      maxSearchResults: Infinity, // Unlimited visibility
      searchKeywords: Infinity, // Unlimited keywords
      profilePromotion: true,
      guaranteedVisibility: true,
      visibilityWeight: 2.0 // Best visibility
    },
    
    // Support
    supportLevel: 'dedicated',
    responseTime: '1h',
    
    // Pricing
    price: '499.99',
    stripePriceId: 'price_1S4lytAUE6HtX6lzNVwqnA0X',
    
    // Supply chain rate limits
    supplyChain: {
      eventsPerMinute: 30,
      eventsPerHour: 500,
      eventsPerDay: 5000,
      cooldownPeriod: 5, // seconds
      burstAllowance: 100
    },
    
    // Features object for easy checking
    features: {
      hasWeb3: true,
      allowOverage: true,
      maxApiKeys: Infinity,
      supportLevel: 'dedicated'
    }
  }
} as const;

export type ManufacturerPlanKey = keyof typeof MANUFACTURER_PLAN_DEFINITIONS;

// Helper functions for manufacturer plan management
export function getManufacturerPlanLimits(plan: ManufacturerPlanKey) {
  return MANUFACTURER_PLAN_DEFINITIONS[plan];
}

export function canConnectBrand(plan: ManufacturerPlanKey, currentConnections: number): boolean {
  const limits = MANUFACTURER_PLAN_DEFINITIONS[plan];
  return limits.brandConnections === Infinity || currentConnections < limits.brandConnections;
}

export function canAddSupplyChainProduct(plan: ManufacturerPlanKey, currentProducts: number): boolean {
  const limits = MANUFACTURER_PLAN_DEFINITIONS[plan];
  return limits.supplyChainProducts === Infinity || currentProducts < limits.supplyChainProducts;
}

export function canAddSupplyChainEndpoint(plan: ManufacturerPlanKey, currentEndpoints: number): boolean {
  const limits = MANUFACTURER_PLAN_DEFINITIONS[plan];
  return limits.supplyChainEndpoints === Infinity || currentEndpoints < limits.supplyChainEndpoints;
}

export function canLogSupplyChainEvent(plan: ManufacturerPlanKey, currentEventsThisMonth: number): boolean {
  const limits = MANUFACTURER_PLAN_DEFINITIONS[plan];
  return limits.supplyChainEvents === Infinity || currentEventsThisMonth < limits.supplyChainEvents;
}

export function hasFeature(plan: ManufacturerPlanKey, feature: keyof typeof MANUFACTURER_PLAN_DEFINITIONS.starter): boolean {
  const planDef = MANUFACTURER_PLAN_DEFINITIONS[plan];
  return planDef[feature] === true;
}

export function getPlanUpgradeRecommendations(currentPlan: ManufacturerPlanKey, usage: {
  brandConnections: number;
  supplyChainProducts: number;
  supplyChainEndpoints: number;
  supplyChainEvents: number;
}): string[] {
  const recommendations: string[] = [];
  const currentLimits = MANUFACTURER_PLAN_DEFINITIONS[currentPlan];
  
  // Check brand connections
  if (currentLimits.brandConnections !== Infinity && usage.brandConnections >= currentLimits.brandConnections * 0.8) {
    recommendations.push('Consider upgrading for more brand connections');
  }
  
  // Check supply chain products
  if (currentLimits.supplyChainProducts !== Infinity && usage.supplyChainProducts >= currentLimits.supplyChainProducts * 0.8) {
    recommendations.push('Consider upgrading for more supply chain products');
  }
  
  // Check supply chain endpoints
  if (currentLimits.supplyChainEndpoints !== Infinity && usage.supplyChainEndpoints >= currentLimits.supplyChainEndpoints * 0.8) {
    recommendations.push('Consider upgrading for more supply chain endpoints');
  }
  
  // Check supply chain events
  if (currentLimits.supplyChainEvents !== Infinity && usage.supplyChainEvents >= currentLimits.supplyChainEvents * 0.8) {
    recommendations.push('Consider upgrading for more supply chain events');
  }
  
  return recommendations;
}
