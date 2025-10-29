// src/controllers/validation/response.schemas.ts
// Response validation schemas for controllers

import Joi from 'joi';

/**
 * Common response schemas
 */
export const commonResponseSchemas = {
  // Standard API response
  apiResponse: Joi.object({
    success: Joi.boolean().required(),
    data: Joi.any(),
    message: Joi.string(),
    meta: Joi.object({
      requestId: Joi.string(),
      processingTime: Joi.number(),
      cacheHit: Joi.boolean(),
      version: Joi.string(),
      timestamp: Joi.string().isoDate()
    }),
    timestamp: Joi.string().isoDate().required()
  }),
  
  // Paginated response
  paginatedResponse: Joi.object({
    success: Joi.boolean().required(),
    data: Joi.array().required(),
    pagination: Joi.object({
      page: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).required(),
      total: Joi.number().integer().min(0).required(),
      totalPages: Joi.number().integer().min(0).required(),
      hasNext: Joi.boolean().required(),
      hasPrev: Joi.boolean().required()
    }).required(),
    message: Joi.string(),
    meta: Joi.object({
      requestId: Joi.string(),
      processingTime: Joi.number(),
      cacheHit: Joi.boolean(),
      version: Joi.string(),
      timestamp: Joi.string().isoDate()
    }),
    timestamp: Joi.string().isoDate().required()
  }),
  
  // Error response
  errorResponse: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.object({
      code: Joi.string().required(),
      message: Joi.string().required(),
      details: Joi.any()
    }).required(),
    timestamp: Joi.string().isoDate().required()
  })
};

/**
 * Authentication response schemas
 */
export const authResponseSchemas = {
  loginResponse: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.object({
      user: Joi.object({
        id: Joi.string().required(),
        email: Joi.string().email().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        userType: Joi.string().valid('business', 'manufacturer', 'customer').required(),
        businessId: Joi.string(),
        manufacturerId: Joi.string(),
        isVerified: Joi.boolean().required(),
        createdAt: Joi.string().isoDate().required(),
        updatedAt: Joi.string().isoDate().required()
      }).required(),
      token: Joi.string().required(),
      refreshToken: Joi.string().required(),
      expiresIn: Joi.number().required()
    }).required(),
    message: Joi.string(),
    timestamp: Joi.string().isoDate().required()
  }),
  
  registerResponse: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.object({
      user: Joi.object({
        id: Joi.string().required(),
        email: Joi.string().email().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        userType: Joi.string().valid('business', 'manufacturer', 'customer').required(),
        isVerified: Joi.boolean().required(),
        createdAt: Joi.string().isoDate().required()
      }).required(),
      message: Joi.string().required(),
      verificationRequired: Joi.boolean().required()
    }).required(),
    message: Joi.string(),
    timestamp: Joi.string().isoDate().required()
  }),
  
  profileResponse: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.object({
      user: Joi.object({
        id: Joi.string().required(),
        email: Joi.string().email().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        userType: Joi.string().valid('business', 'manufacturer', 'customer').required(),
        businessId: Joi.string(),
        manufacturerId: Joi.string(),
        isVerified: Joi.boolean().required(),
        profilePictureUrl: Joi.string().uri(),
        createdAt: Joi.string().isoDate().required(),
        updatedAt: Joi.string().isoDate().required()
      }).required()
    }).required(),
    message: Joi.string(),
    timestamp: Joi.string().isoDate().required()
  })
};

/**
 * Brand response schemas
 */
export const brandResponseSchemas = {
  brandProfileResponse: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.object({
      id: Joi.string().required(),
      businessId: Joi.string().required(),
      profilePictureUrl: Joi.string().uri(),
      description: Joi.string(),
      industry: Joi.string(),
      contactEmail: Joi.string().email(),
      socialUrls: Joi.array().items(Joi.string().uri()),
      walletAddress: Joi.string(),
      headquarters: Joi.object({
        country: Joi.string(),
        city: Joi.string(),
        address: Joi.string(),
        timezone: Joi.string()
      }),
      businessInformation: Joi.object({
        establishedYear: Joi.number().integer(),
        employeeCount: Joi.string(),
        annualRevenue: Joi.string(),
        businessLicense: Joi.string(),
        certifications: Joi.array().items(Joi.string())
      }),
      communicationPreferences: Joi.object({
        preferredMethod: Joi.string(),
        responseTime: Joi.string(),
        languages: Joi.array().items(Joi.string())
      }),
      marketingPreferences: Joi.object({
        allowEmails: Joi.boolean(),
        allowSms: Joi.boolean(),
        allowPushNotifications: Joi.boolean()
      }),
      createdAt: Joi.string().isoDate().required(),
      updatedAt: Joi.string().isoDate().required()
    }).required(),
    message: Joi.string(),
    timestamp: Joi.string().isoDate().required()
  })
};

/**
 * Certificate response schemas
 */
export const certificateResponseSchemas = {
  certificateResponse: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.object({
      id: Joi.string().required(),
      productId: Joi.string().required(),
      businessId: Joi.string().required(),
      recipient: Joi.string().required(),
      contactMethod: Joi.string().valid('email', 'wallet').required(),
      certificateData: Joi.object().pattern(Joi.string(), Joi.any()),
      tokenId: Joi.string(),
      transactionHash: Joi.string(),
      status: Joi.string().valid('pending', 'minted', 'transferred', 'cancelled').required(),
      createdAt: Joi.string().isoDate().required(),
      updatedAt: Joi.string().isoDate().required()
    }).required(),
    message: Joi.string(),
    timestamp: Joi.string().isoDate().required()
  }),
  
  batchCertificateResponse: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.object({
      certificates: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        recipient: Joi.string().required(),
        status: Joi.string().valid('pending', 'minted', 'transferred', 'cancelled').required()
      })).required(),
      statistics: Joi.object({
        total: Joi.number().integer().required(),
        successful: Joi.number().integer().required(),
        failed: Joi.number().integer().required(),
        pending: Joi.number().integer().required()
      }).required()
    }).required(),
    message: Joi.string(),
    timestamp: Joi.string().isoDate().required()
  })
};

/**
 * Analytics response schemas
 */
export const analyticsResponseSchemas = {
  analyticsResponse: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.object({
      timeframe: Joi.string().required(),
      metrics: Joi.object().pattern(Joi.string(), Joi.number()).required(),
      trends: Joi.array().items(Joi.object({
        date: Joi.string().isoDate().required(),
        value: Joi.number().required(),
        label: Joi.string()
      })).required(),
      summary: Joi.object({
        total: Joi.number().required(),
        change: Joi.number().required(),
        changePercent: Joi.number().required(),
        period: Joi.string().required()
      }).required()
    }).required(),
    message: Joi.string(),
    timestamp: Joi.string().isoDate().required()
  })
};

/**
 * Health check response schemas
 */
export const healthResponseSchemas = {
  healthCheckResponse: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.object({
      status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
      timestamp: Joi.string().isoDate().required(),
      uptime: Joi.number().required(),
      version: Joi.string().required(),
      environment: Joi.string().required(),
      checks: Joi.object({
        database: Joi.object({
          status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
          message: Joi.string(),
          responseTime: Joi.number(),
          details: Joi.any()
        }).required(),
        redis: Joi.object({
          status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
          message: Joi.string(),
          responseTime: Joi.number(),
          details: Joi.any()
        }).required(),
        s3: Joi.object({
          status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
          message: Joi.string(),
          responseTime: Joi.number(),
          details: Joi.any()
        }).required(),
        external: Joi.object({
          status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
          message: Joi.string(),
          responseTime: Joi.number(),
          details: Joi.any()
        }).required(),
        memory: Joi.object({
          status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
          message: Joi.string(),
          details: Joi.any()
        }).required(),
        disk: Joi.object({
          status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
          message: Joi.string(),
          details: Joi.any()
        }).required()
      }).required(),
      metrics: Joi.object({
        responseTime: Joi.number().required(),
        memoryUsage: Joi.object({
          rss: Joi.number().required(),
          heapTotal: Joi.number().required(),
          heapUsed: Joi.number().required(),
          external: Joi.number().required(),
          arrayBuffers: Joi.number().required()
        }).required(),
        cpuUsage: Joi.number().required()
      })
    }).required(),
    message: Joi.string(),
    timestamp: Joi.string().isoDate().required()
  })
};
