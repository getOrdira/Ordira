// src/controllers/validation/middleware.schemas.ts
// Middleware validation schemas for controllers

import Joi from 'joi';

/**
 * Middleware validation schemas
 */
export const middlewareSchemas = {
  // Request ID validation
  requestId: Joi.string().pattern(/^req_\d+_[a-z0-9]+$/).required(),
  
  // Authentication token validation
  authToken: Joi.string().pattern(/^Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/).required(),
  
  // Tenant validation
  tenantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // User type validation
  userType: Joi.string().valid('business', 'manufacturer', 'customer').required(),
  
  // Business ID validation
  businessId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Manufacturer ID validation
  manufacturerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Rate limiting validation
  rateLimit: Joi.object({
    limit: Joi.number().integer().min(1).required(),
    windowMs: Joi.number().integer().min(1000).required(),
    remaining: Joi.number().integer().min(0).required(),
    resetTime: Joi.date().iso().required()
  }),
  
  // CORS validation
  cors: Joi.object({
    origin: Joi.string().uri().required(),
    methods: Joi.array().items(Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS')).required(),
    headers: Joi.array().items(Joi.string()).required(),
    credentials: Joi.boolean().required()
  }),
  
  // Security headers validation
  securityHeaders: Joi.object({
    'X-Content-Type-Options': Joi.string().valid('nosniff').required(),
    'X-Frame-Options': Joi.string().valid('DENY', 'SAMEORIGIN').required(),
    'X-XSS-Protection': Joi.string().valid('1; mode=block').required(),
    'Strict-Transport-Security': Joi.string().pattern(/^max-age=\d+; includeSubDomains$/).required(),
    'Content-Security-Policy': Joi.string().required(),
    'Referrer-Policy': Joi.string().valid('strict-origin-when-cross-origin', 'same-origin', 'strict-origin').required()
  }),
  
  // Performance monitoring validation
  performanceMetrics: Joi.object({
    requestId: Joi.string().required(),
    method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS').required(),
    url: Joi.string().uri().required(),
    startTime: Joi.number().integer().required(),
    endTime: Joi.number().integer(),
    duration: Joi.number().integer(),
    memoryUsage: Joi.object({
      rss: Joi.number().required(),
      heapTotal: Joi.number().required(),
      heapUsed: Joi.number().required(),
      external: Joi.number().required(),
      arrayBuffers: Joi.number().required()
    }),
    cacheHit: Joi.boolean(),
    databaseQueries: Joi.number().integer().min(0),
    externalApiCalls: Joi.number().integer().min(0)
  }),
  
  // Validation middleware schemas
  validationMiddleware: Joi.object({
    body: Joi.object().pattern(Joi.string(), Joi.any()),
    query: Joi.object().pattern(Joi.string(), Joi.any()),
    params: Joi.object().pattern(Joi.string(), Joi.any()),
    headers: Joi.object().pattern(Joi.string(), Joi.any())
  }),
  
  // Error handling validation
  errorHandling: Joi.object({
    error: Joi.object({
      name: Joi.string().required(),
      message: Joi.string().required(),
      stack: Joi.string(),
      code: Joi.string(),
      statusCode: Joi.number().integer().min(100).max(599),
      isOperational: Joi.boolean(),
      details: Joi.any()
    }).required(),
    request: Joi.object({
      method: Joi.string().required(),
      url: Joi.string().required(),
      headers: Joi.object().pattern(Joi.string(), Joi.any()).required(),
      body: Joi.object().pattern(Joi.string(), Joi.any()),
      params: Joi.object().pattern(Joi.string(), Joi.any()),
      query: Joi.object().pattern(Joi.string(), Joi.any())
    }).required(),
    timestamp: Joi.string().isoDate().required()
  })
};
