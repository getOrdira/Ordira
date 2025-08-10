// src/validation/manufacturer.validation.ts
import Joi from 'joi';

/**
 * Schema for manufacturer registration
 */
export const registerManufacturerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Manufacturer name must be at least 2 characters',
      'string.max': 'Manufacturer name cannot exceed 100 characters',
      'any.required': 'Manufacturer name is required'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .custom((value, helpers) => {
      // Business email validation for manufacturers
      const personalDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
        'aol.com', 'icloud.com', 'live.com', 'msn.com'
      ];
      
      const domain = value.split('@')[1]?.toLowerCase();
      
      if (personalDomains.includes(domain)) {
        helpers.state.path.push('personalEmailWarning');
      }
      
      return value;
    })
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  industry: Joi.string()
    .valid(
      // Primary Manufacturing
      'Textile Manufacturing', 'Food & Beverage Manufacturing', 'Electronics Manufacturing',
      'Automotive Manufacturing', 'Pharmaceutical Manufacturing', 'Chemical Manufacturing',
      'Machinery Manufacturing', 'Metal Fabrication', 'Plastic Manufacturing',
      'Furniture Manufacturing', 'Apparel Manufacturing', 'Footwear Manufacturing',
      
      // Secondary Manufacturing
      'Packaging Manufacturing', 'Component Manufacturing', 'Hardware Manufacturing',
      'Cosmetics Manufacturing', 'Personal Care Manufacturing', 'Jewelry Manufacturing',
      'Optical Manufacturing', 'Musical Instrument Manufacturing', 'Art & Craft Manufacturing',
      'Industrial Equipment Manufacturing', 'Construction Materials', 'Energy Equipment',
      
      // Technology & Innovation
      '3D Printing Services', 'Prototype Manufacturing', 'Custom Fabrication',
      'Smart Device Manufacturing', 'IoT Device Manufacturing', 'Renewable Energy Manufacturing',
      
      // Services
      'Contract Manufacturing', 'Private Label Manufacturing', 'Assembly Services',
      'Quality Control Services', 'Testing Services', 'Logistics Services',
      
      // Other
      'Multi-Industry', 'Other'
    )
    .optional()
    .messages({
      'any.only': 'Please select a valid industry from the manufacturing categories'
    }),

  servicesOffered: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot offer more than 20 services',
      'string.max': 'Each service description cannot exceed 100 characters'
    }),

  minimumOrderQuantity: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'Minimum order quantity must be an integer',
      'number.min': 'Minimum order quantity must be at least 1'
    }),

  contactEmail: Joi.string()
    .email()
    .lowercase()
    .optional()
    .messages({
      'string.email': 'Contact email must be a valid email address'
    }),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Must be a valid phone number in international format'
    }),

  website: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Website must be a valid URL'
    }),

  location: Joi.object({
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    address: Joi.string().trim().max(500).optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).optional()
  }).optional()
});

/**
 * Schema for manufacturer login
 */
export const loginManufacturerSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

/**
 * Schema for manufacturer verification
 */
export const manufacturerVerificationSchema = Joi.object({
  verificationCode: Joi.string()
    .alphanum()
    .length(6)
    .required()
    .messages({
      'string.alphanum': 'Verification code must be alphanumeric',
      'string.length': 'Verification code must be exactly 6 characters',
      'any.required': 'Verification code is required'
    }),

  // For password reset
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .optional()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  // For verification documents
  documents: Joi.array()
    .items(Joi.object({
      type: Joi.string().valid('business_license', 'tax_certificate', 'insurance', 'iso_certification', 'other').required(),
      url: Joi.string().uri().required(),
      description: Joi.string().trim().max(500).optional()
    }))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot upload more than 10 verification documents'
    })
});

/**
 * Schema for updating manufacturer profile
 */
export const updateManufacturerProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Manufacturer name must be at least 2 characters',
      'string.max': 'Manufacturer name cannot exceed 100 characters'
    }),

  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  industry: Joi.string()
    .valid(
      'Textile Manufacturing', 'Food & Beverage Manufacturing', 'Electronics Manufacturing',
      'Automotive Manufacturing', 'Pharmaceutical Manufacturing', 'Chemical Manufacturing',
      'Machinery Manufacturing', 'Metal Fabrication', 'Plastic Manufacturing',
      'Other'
    )
    .optional(),

  servicesOffered: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(20)
    .optional(),

  minimumOrderQuantity: Joi.number()
    .integer()
    .min(1)
    .optional(),

  contactEmail: Joi.string()
    .email()
    .lowercase()
    .optional(),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),

  website: Joi.string()
    .uri()
    .optional(),

  socialUrls: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 social media URLs'
    }),

  capabilities: Joi.object({
    productCategories: Joi.array().items(Joi.string().max(100)).max(50).optional(),
    certifications: Joi.array().items(Joi.string().max(200)).max(20).optional(),
    qualityStandards: Joi.array().items(Joi.string().max(100)).max(15).optional(),
    equipmentTypes: Joi.array().items(Joi.string().max(150)).max(30).optional()
  }).optional(),

  location: Joi.object({
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    address: Joi.string().trim().max(500).optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).optional()
  }).optional()
});

/**
 * Schema for listing brands query parameters
 */
export const listBrandsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  status: Joi.string()
    .valid('active', 'inactive', 'pending', 'connected', 'disconnected')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, pending, connected, disconnected'
    }),

  industry: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Industry filter cannot exceed 100 characters'
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),

  startDate: Joi.date()
    .optional(),

  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.greater': 'End date must be after start date'
    }),

  sortBy: Joi.string()
    .valid('name', 'createdAt', 'updatedAt', 'status', 'industry', 'lastActivity')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: name, createdAt, updatedAt, status, industry, lastActivity'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    }),

  verified: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Verified must be a boolean value'
    }),

  hasActiveOrders: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Has active orders must be a boolean value'
    })
});

/**
 * Schema for brand route parameters
 */
export const brandParamsSchema = Joi.object({
  brandId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Brand ID must be a valid MongoDB ObjectId',
      'any.required': 'Brand ID is required'
    })
});

/**
 * Schema for manufacturer status updates
 */
export const manufacturerStatusSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'inactive', 'suspended', 'pending_verification')
    .required()
    .messages({
      'any.only': 'Status must be one of: active, inactive, suspended, pending_verification',
      'any.required': 'Status is required'
    }),

  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

/**
 * Schema for collaboration status updates
 */
export const collaborationStatusSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'paused', 'terminated', 'under_review')
    .required()
    .messages({
      'any.only': 'Collaboration status must be one of: active, paused, terminated, under_review',
      'any.required': 'Collaboration status is required'
    }),

  reason: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 1000 characters'
    }),

  effectiveDate: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Effective date cannot be in the past'
    })
});

/**
 * Schema for product creation/updates
 */
export const manufacturerProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 200 characters',
      'any.required': 'Product name is required'
    }),

  description: Joi.string()
    .trim()
    .max(5000)
    .optional()
    .messages({
      'string.max': 'Product description cannot exceed 5000 characters'
    }),

  category: Joi.string()
    .trim()
    .max(100)
    .required()
    .messages({
      'string.max': 'Category cannot exceed 100 characters',
      'any.required': 'Product category is required'
    }),

  sku: Joi.string()
    .trim()
    .alphanum()
    .max(50)
    .optional()
    .messages({
      'string.alphanum': 'SKU must be alphanumeric',
      'string.max': 'SKU cannot exceed 50 characters'
    }),

  price: Joi.object({
    amount: Joi.number().min(0).required(),
    currency: Joi.string().length(3).uppercase().default('USD').optional()
  }).optional(),

  minimumOrderQuantity: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.integer': 'Minimum order quantity must be an integer',
      'number.min': 'Minimum order quantity must be at least 1',
      'any.required': 'Minimum order quantity is required'
    }),

  leadTimeInDays: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.integer': 'Lead time must be an integer',
      'number.min': 'Lead time must be at least 1 day',
      'number.max': 'Lead time cannot exceed 365 days'
    }),

  specifications: Joi.object()
    .pattern(Joi.string(), Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()))
    .optional(),

  images: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 product images',
      'string.uri': 'Each image must be a valid URL'
    }),

  certifications: Joi.array()
    .items(Joi.string().max(200))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 certifications',
      'string.max': 'Each certification cannot exceed 200 characters'
    }),

  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
});

/**
 * All manufacturer validation schemas
 */
export const manufacturerValidationSchemas = {
  register: registerManufacturerSchema,
  login: loginManufacturerSchema,
  verification: manufacturerVerificationSchema,
  updateProfile: updateManufacturerProfileSchema,
  listBrandsQuery: listBrandsQuerySchema,
  brandParams: brandParamsSchema,
  status: manufacturerStatusSchema,
  collaborationStatus: collaborationStatusSchema,
  product: manufacturerProductSchema
};