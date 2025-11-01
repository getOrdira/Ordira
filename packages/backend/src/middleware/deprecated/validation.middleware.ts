import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../../utils/logger';
import Joi, { ObjectSchema, ValidationError } from 'joi';
import { Types } from 'mongoose';

/**
 * Extended request interface for validation
 */
export interface ValidatedRequest {
  validatedBody?: any;
  validatedQuery?: any;
  validatedParams?: any;
  validationErrors?: string[];
}

/**
 * Request interface with required validated properties
 */
export interface RequiredValidatedRequest {
  validatedBody: any;
  validatedQuery: any;
  validatedParams: any;
  validationErrors?: string[];
}

/**
 * Type assertion helper for validated request handlers
 */
export function asValidatedHandler<T extends ValidatedRequest>(
  handler: (req: T, res: Response, next: NextFunction) => void | Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    return handler(req as unknown as T, res, next);
  };
}

/**
 * Validation options interface
 */
export interface ValidationOptions {
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  abortEarly?: boolean;
  skipOnError?: boolean;
  transformValues?: boolean;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  stripUnknown: true,
  allowUnknown: false,
  abortEarly: false,
  skipOnError: false,
  transformValues: true
};

/**
 * Custom Joi extensions for common validation patterns
 */
export const customJoi = Joi.extend({
  type: 'mongoId',
  base: Joi.string(),
  messages: {
    'mongoId.base': 'Must be a valid MongoDB ObjectId'
  },
  validate(value: string, helpers: any) {
    if (!Types.ObjectId.isValid(value)) {
      return helpers.error('mongoId.base');
    }
    return value;
  }
}, {
  type: 'email',
  base: Joi.string(),
  messages: {
    'email.business': 'Must be a valid business email address',
    'email.disposable': 'Disposable email addresses are not allowed'
  },
  rules: {
    business: {
      validate(value: string, helpers: any) {
        // List of common disposable email domains
        const disposableDomains = [
          '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
          'mailinator.com', 'yopmail.com', 'temp-mail.org'
        ];
        
        const domain = value.split('@')[1]?.toLowerCase();
        if (disposableDomains.includes(domain)) {
          return helpers.error('email.disposable');
        }
        
        return value;
      }
    }
  }
});

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // MongoDB ObjectId validation
  mongoId: customJoi.mongoId().required(),
  optionalMongoId: customJoi.mongoId().optional(),

  // Email validations
  email: customJoi.string().email().lowercase().required(),
  businessEmail: customJoi.email().business().required(),
  optionalEmail: customJoi.string().email().lowercase().optional(),

  // Password validation with strength requirements
  password: customJoi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  // Phone number validation
  phone: customJoi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Must be a valid phone number in international format'
    }),
  optionalPhone: customJoi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),

  // URL validation
  url: customJoi.string().uri({ scheme: ['http', 'https'] }).required(),
  optionalUrl: customJoi.string().uri({ scheme: ['http', 'https'] }).optional(),

  // Plan validation
  plan: customJoi.string().valid('foundation', 'growth', 'premium', 'enterprise').required(),
  optionalPlan: customJoi.string().valid('foundation', 'growth', 'premium', 'enterprise').optional(),

  // Date validations
  date: customJoi.date().iso().required(),
  futureDate: customJoi.date().iso().min('now').required(),
  pastDate: customJoi.date().iso().max('now').required(),
  dateOfBirth: customJoi.date().iso().max(new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000)).required(), // 13+ years old

  // Text validations
  shortText: customJoi.string().trim().min(1).max(100).required(),
  mediumText: customJoi.string().trim().min(1).max(500).required(),
  longText: customJoi.string().trim().min(1).max(2000).required(),
  optionalLongText: customJoi.string().trim().max(2000).optional(),

  // Business-specific validations
  businessName: customJoi.string().trim().min(2).max(100).required(),
  subdomain: customJoi.string()
    .alphanum()
    .min(3)
    .max(63)
    .lowercase()
    .pattern(/^[a-z0-9]+$/)
    .invalid('www', 'api', 'admin', 'dashboard', 'app', 'mail', 'ftp', 'localhost', 'staging', 'dev')
    .required()
    .messages({
      'string.pattern.base': 'Subdomain must contain only lowercase letters and numbers',
      'any.invalid': 'This subdomain is reserved and cannot be used'
    }),

  // File upload validations
  fileSize: customJoi.number().positive().max(100 * 1024 * 1024).required(), // 100MB max
  fileName: customJoi.string().trim().min(1).max(255).pattern(/^[^<>:"/\\|?*]+$/).required(),

  // Pagination
  page: customJoi.number().integer().min(1).default(1),
  limit: customJoi.number().integer().min(1).max(100).default(20),
  offset: customJoi.number().integer().min(0).default(0),

  // Search and filtering
  searchQuery: customJoi.string().trim().min(1).max(100).optional(),
  sortBy: customJoi.string().trim().max(50).optional(),
  sortOrder: customJoi.string().valid('asc', 'desc').default('desc'),

  // Manufacturer-specific
  industry: customJoi.string().trim().min(2).max(100).optional(),
  moq: customJoi.number().integer().min(1).optional(),
  servicesOffered: customJoi.array().items(customJoi.string().trim().max(100)).max(20).optional(),

  // Invitation status
  invitationStatus: customJoi.string().valid('pending', 'accepted', 'declined', 'cancelled').required(),

  // Color validation (hex colors)
  hexColor: customJoi.string().pattern(/^#([0-9A-F]{3}){1,2}$/i).optional(),

  // Coordinates
  latitude: customJoi.number().min(-90).max(90).optional(),
  longitude: customJoi.number().min(-180).max(180).optional()
};

/**
 * Business domain validation schemas
 */
export const businessSchemas = {
  registerBusiness: customJoi.object({
    firstName: commonSchemas.shortText,
    lastName: commonSchemas.shortText,
    dateOfBirth: commonSchemas.dateOfBirth,
    email: commonSchemas.businessEmail,
    phone: commonSchemas.phone,
    businessName: commonSchemas.businessName,
    regNumber: customJoi.string().trim().max(50).optional(),
    taxId: customJoi.string().trim().max(50).optional(),
    address: commonSchemas.mediumText,
    password: commonSchemas.password
  }),

  loginBusiness: customJoi.object({
    emailOrPhone: customJoi.alternatives().try(
      commonSchemas.email,
      commonSchemas.phone
    ).required(),
    password: customJoi.string().required()
  }),

  verifyBusiness: customJoi.object({
    businessId: commonSchemas.mongoId,
    emailCode: customJoi.string().alphanum().length(6).required(),
    phoneCode: customJoi.string().alphanum().length(6).optional()
  }),

  updateBusiness: customJoi.object({
    firstName: commonSchemas.shortText.optional(),
    lastName: commonSchemas.shortText.optional(),
    businessName: commonSchemas.businessName.optional(),
    phone: commonSchemas.optionalPhone,
    address: commonSchemas.mediumText.optional(),
    regNumber: customJoi.string().trim().max(50).optional(),
    taxId: customJoi.string().trim().max(50).optional()
  })
};

/**
 * Manufacturer domain validation schemas
 */
export const manufacturerSchemas = {
  registerManufacturer: customJoi.object({
    name: commonSchemas.businessName,
    email: commonSchemas.businessEmail,
    password: commonSchemas.password,
    description: commonSchemas.optionalLongText,
    industry: commonSchemas.industry,
    servicesOffered: commonSchemas.servicesOffered,
    moq: commonSchemas.moq,
    contactEmail: commonSchemas.optionalEmail
  }),

  loginManufacturer: customJoi.object({
    email: commonSchemas.email,
    password: customJoi.string().required()
  }),

  updateManufacturer: customJoi.object({
    name: commonSchemas.businessName.optional(),
    description: commonSchemas.optionalLongText,
    industry: commonSchemas.industry,
    servicesOffered: commonSchemas.servicesOffered,
    moq: commonSchemas.moq,
    contactEmail: commonSchemas.optionalEmail,
    profilePictureUrl: commonSchemas.optionalUrl,
    socialUrls: customJoi.array().items(commonSchemas.url).max(10).optional(),
    headquarters: customJoi.object({
      country: commonSchemas.shortText.optional(),
      city: commonSchemas.shortText.optional(),
      address: commonSchemas.mediumText.optional()
    }).optional()
  })
};

/**
 * Brand settings validation schemas
 */
export const brandSchemas = {
  updateBrandSettings: customJoi.object({
    themeColor: commonSchemas.hexColor,
    logoUrl: commonSchemas.optionalUrl,
    bannerImages: customJoi.array().items(commonSchemas.url).max(5).optional(),
    subdomain: commonSchemas.subdomain.optional(),
    customDomain: customJoi.string().domain().optional(),
    certificateWallet: customJoi.string().alphanum().length(42).optional() // Ethereum address
  }),

  inviteManufacturer: customJoi.object({
    manufacturerId: commonSchemas.mongoId,
    message: commonSchemas.optionalLongText
  }),

  respondToInvitation: customJoi.object({
    invitationId: commonSchemas.mongoId,
    status: customJoi.string().valid('accepted', 'declined').required(),
    message: commonSchemas.optionalLongText
  })
};

/**
 * Analytics and reporting schemas
 */
export const analyticsSchemas = {
  getAnalytics: customJoi.object({
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    granularity: customJoi.string().valid('hour', 'day', 'week', 'month').default('day'),
    metrics: customJoi.array().items(
      customJoi.string().valid('votes', 'certificates', 'connections', 'revenue')
    ).min(1).optional()
  })
};

/**
 * Billing and subscription schemas
 */
export const billingSchemas = {
  changePlan: customJoi.object({
    plan: commonSchemas.plan
  }),

  processPayment: customJoi.object({
    amount: customJoi.number().positive().precision(2).required(),
    currency: customJoi.string().valid('USD', 'EUR', 'GBP').default('USD'),
    description: commonSchemas.mediumText.optional()
  })
};

/**
 * Generic query parameter schemas
 */
export const querySchemas = {
  pagination: customJoi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    offset: commonSchemas.offset
  }),

  search: customJoi.object({
    q: commonSchemas.searchQuery,
    sortBy: commonSchemas.sortBy,
    sortOrder: commonSchemas.sortOrder
  }),

  filter: customJoi.object({
    status: customJoi.string().valid('active', 'inactive', 'pending', 'suspended').optional(),
    industry: commonSchemas.industry,
    plan: commonSchemas.optionalPlan,
    verified: customJoi.boolean().optional(),
    dateFrom: commonSchemas.date.optional(),
    dateTo: commonSchemas.date.optional()
  })
};

/**
 * Sanitize input data
 */
function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    return data.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Format validation errors for better readability
 */
function formatValidationErrors(error: ValidationError): { message: string; details: any[] } {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
    type: detail.type
  }));

  const message = `Validation failed: ${details.map(d => d.message).join(', ')}`;
  
  return { message, details };
}

/**
 * Main validation middleware factory
 */
export function validate(
  target: 'body' | 'query' | 'params',
  schema: ObjectSchema,
  options: ValidationOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const dataToValidate = req[target];
      
      if (!dataToValidate && target === 'body') {
        return res.status(400).json({
          error: 'Request body is required',
          code: 'MISSING_BODY'
        });
      }

      // Sanitize input data
      const sanitizedData = opts.transformValues ? sanitizeData(dataToValidate) : dataToValidate;

      // Validate with Joi
      const { error, value } = schema.validate(sanitizedData, {
        stripUnknown: opts.stripUnknown,
        allowUnknown: opts.allowUnknown,
        abortEarly: opts.abortEarly
      });

      if (error) {
        const formattedError = formatValidationErrors(error);
        
        if (opts.skipOnError) {
          req.validationErrors = formattedError.details.map(d => d.message);
          return next();
        }

        return res.status(400).json({
          error: 'Validation failed',
          message: formattedError.message,
          details: formattedError.details,
          code: 'VALIDATION_ERROR'
        });
      }

      // Attach validated data to request
      switch (target) {
        case 'body':
          req.validatedBody = value;
          break;
        case 'query':
          req.validatedQuery = value;
          break;
        case 'params':
          req.validatedParams = value;
          break;
      }

      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return res.status(500).json({
        error: 'Internal validation error',
        code: 'VALIDATION_INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Convenience methods for common validation patterns
 */
export const validateBody = (schema: ObjectSchema, options?: ValidationOptions) => 
  validate('body', schema, options);

export const validateQuery = (schema: ObjectSchema, options?: ValidationOptions) => 
  validate('query', schema, options);

export const validateParams = (schema: ObjectSchema, options?: ValidationOptions) => 
  validate('params', schema, options);

/**
 * Multi-target validation middleware
 */
export function validateMultiple(validations: {
  body?: ObjectSchema;
  query?: ObjectSchema;
  params?: ObjectSchema;
}, options: ValidationOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const errors: string[] = [];

    // Validate each target
    for (const [target, schema] of Object.entries(validations)) {
      if (schema) {
        const middleware = validate(target as 'body' | 'query' | 'params', schema, { 
          ...options, 
          skipOnError: true 
        });
        
        // Create a mock response to capture validation errors
        let validationError: string | null = null;
        const mockRes = {
          status: () => ({ json: (data: any) => { validationError = data.message; } })
        } as unknown as Response;

        middleware(req, mockRes, (err?: any) => {
          if (err || validationError) {
            errors.push(validationError || err.message);
          }
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Multiple validation errors',
        details: errors,
        code: 'MULTI_VALIDATION_ERROR'
      });
    }

    next();
  };
}

/**
 * Conditional validation middleware
 */
export function validateConditional(
  condition: (req: Request) => boolean,
  schema: ObjectSchema,
  target: 'body' | 'query' | 'params' = 'body',
  options?: ValidationOptions
) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (condition(req)) {
      return validate(target, schema, options)(req, res, next);
    }
    next();
  };
}

/**
 * Create custom validation schema builder
 */
export function createCustomSchema() {
  return {
    joi: customJoi,
    common: commonSchemas,
    business: businessSchemas,
    manufacturer: manufacturerSchemas,
    brand: brandSchemas,
    analytics: analyticsSchemas,
    billing: billingSchemas,
    query: querySchemas
  };
}
