// src/controllers/validation/request.schemas.ts
// Request validation schemas for controllers

import Joi from 'joi';

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Email validation
  email: Joi.string().email().required(),
  
  // Phone validation
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20),
  
  // Password validation
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  
  // Business ID validation
  businessId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Manufacturer ID validation
  manufacturerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Brand slug validation
  brandSlug: Joi.string().pattern(/^[a-z0-9\-]+$/).min(3).max(50).required(),
  
  // Wallet address validation
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  
  // URL validation
  url: Joi.string().uri().required(),
  
  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  
  // Date range validation
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  })
};

/**
 * Authentication schemas
 */
export const authSchemas = {
  login: Joi.object({
    emailOrPhone: Joi.string().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false)
  }),
  
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    businessType: Joi.string().valid('business', 'manufacturer').default('business'),
    businessName: Joi.string().min(1).max(100),
    industry: Joi.string().min(1).max(100),
    contactEmail: Joi.string().email()
  }),
  
  verify: Joi.object({
    email: commonSchemas.email,
    verificationCode: Joi.string().length(6).pattern(/^\d+$/).required()
  }),
  
  forgotPassword: Joi.object({
    email: commonSchemas.email
  }),
  
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: commonSchemas.password
  }),
  
  resendVerification: Joi.object({
    email: commonSchemas.email
  })
};

/**
 * Brand schemas
 */
export const brandSchemas = {
  updateProfile: Joi.object({
    profilePictureUrl: Joi.string().uri(),
    description: Joi.string().max(500),
    industry: Joi.string().max(100),
    contactEmail: Joi.string().email(),
    socialUrls: Joi.array().items(Joi.string().uri()).max(10),
    walletAddress: commonSchemas.walletAddress,
    headquarters: Joi.object({
      country: Joi.string().max(100),
      city: Joi.string().max(100),
      address: Joi.string().max(200),
      timezone: Joi.string().max(50)
    }),
    businessInformation: Joi.object({
      establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()),
      employeeCount: Joi.string().max(50),
      annualRevenue: Joi.string().max(50),
      businessLicense: Joi.string().max(100),
      certifications: Joi.array().items(Joi.string().max(100)).max(20)
    }),
    communicationPreferences: Joi.object({
      preferredMethod: Joi.string().valid('email', 'phone', 'sms'),
      responseTime: Joi.string().max(50),
      languages: Joi.array().items(Joi.string().max(10)).max(5)
    }),
    marketingPreferences: Joi.object({
      allowEmails: Joi.boolean().default(true),
      allowSms: Joi.boolean().default(false),
      allowPushNotifications: Joi.boolean().default(true)
    })
  }),
  
  updateSettings: Joi.object({
    customDomain: Joi.string().max(100),
    subdomain: commonSchemas.brandSlug,
    walletAddress: commonSchemas.walletAddress,
    integrations: Joi.object({
      shopify: Joi.object({
        shopDomain: Joi.string().max(100),
        accessToken: Joi.string().max(500)
      }),
      wix: Joi.object({
        siteId: Joi.string().max(100),
        accessToken: Joi.string().max(500)
      }),
      woocommerce: Joi.object({
        storeUrl: Joi.string().uri(),
        consumerKey: Joi.string().max(100),
        consumerSecret: Joi.string().max(100)
      })
    })
  })
};

/**
 * Certificate schemas
 */
export const certificateSchemas = {
  create: Joi.object({
    productId: commonSchemas.objectId,
    recipient: Joi.string().required(),
    contactMethod: Joi.string().valid('email', 'wallet').default('email'),
    certificateData: Joi.object().pattern(Joi.string(), Joi.any())
  }),
  
  transfer: Joi.object({
    certificateId: commonSchemas.objectId,
    newOwner: Joi.string().required(),
    transferReason: Joi.string().max(200)
  }),
  
  batchCreate: Joi.object({
    productId: commonSchemas.objectId,
    recipients: Joi.array().items(Joi.object({
      recipient: Joi.string().required(),
      contactMethod: Joi.string().valid('email', 'wallet').default('email'),
      certificateData: Joi.object().pattern(Joi.string(), Joi.any())
    })).min(1).max(100).required()
  })
};

/**
 * Analytics schemas
 */
export const analyticsSchemas = {
  getAnalytics: Joi.object({
    timeframe: Joi.string().valid('24h', '7d', '30d', '90d', '1y', 'all').default('30d'),
    groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
    metrics: Joi.array().items(Joi.string()).max(20),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    format: Joi.string().valid('csv', 'json', 'pdf').default('json'),
    type: Joi.string().valid('votes', 'transactions', 'certificates', 'products', 'engagement'),
    sortBy: Joi.string().max(50),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  })
};

/**
 * Subscription schemas
 */
export const subscriptionSchemas = {
  changePlan: Joi.object({
    planId: Joi.string().valid('foundation', 'growth', 'premium', 'enterprise').required(),
    billingCycle: Joi.string().valid('monthly', 'yearly').default('monthly')
  }),
  
  updatePaymentMethod: Joi.object({
    paymentMethodId: Joi.string().required()
  })
};

/**
 * Health check schemas
 */
export const healthSchemas = {
  healthCheck: Joi.object({
    detailed: Joi.boolean().default(false),
    checks: Joi.array().items(Joi.string().valid('database', 'redis', 's3', 'external', 'memory', 'disk'))
  })
};
