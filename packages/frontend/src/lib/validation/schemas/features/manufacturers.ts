// src/lib/validation/schemas/features/manufacturers.ts
// Frontend validation schemas for manufacturer registration, profile updates, and related flows.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const VALID_INDUSTRIES = [
  'Automotive Manufacturing',
  'Aerospace Manufacturing',
  'Electronics Manufacturing',
  'Medical Device Manufacturing',
  'Pharmaceutical Manufacturing',
  'Chemical Manufacturing',
  'Food & Beverage Manufacturing',
  'Textile Manufacturing',
  'Apparel Manufacturing',
  'Furniture Manufacturing',
  'Toy Manufacturing',
  'Sporting Goods Manufacturing',
  'Plastic Manufacturing',
  'Metal Fabrication',
  'Glass Manufacturing',
  'Ceramic Manufacturing',
  'Rubber Manufacturing',
  'Paper Manufacturing',
  'Packaging Manufacturing',
  'Component Manufacturing',
  'Hardware Manufacturing',
  'Cosmetics Manufacturing',
  'Personal Care Manufacturing',
  'Jewelry Manufacturing',
  'Optical Manufacturing',
  'Musical Instrument Manufacturing',
  'Art & Craft Manufacturing',
  'Industrial Equipment Manufacturing',
  'Construction Materials',
  'Energy Equipment',
  '3D Printing Services',
  'Prototype Manufacturing',
  'Custom Fabrication',
  'Smart Device Manufacturing',
  'IoT Device Manufacturing',
  'Renewable Energy Manufacturing',
  'Contract Manufacturing',
  'Private Label Manufacturing',
  'Assembly Services',
  'Quality Control Services',
  'Testing Services',
  'Logistics Services',
  'Multi-Industry',
  'Other'
];

const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'live.com',
  'msn.com'
];

const SERVICES_ARRAY_LIMIT = 20;
const SERVICE_ITEM_MAX_LENGTH = 100;

const servicesSchema = Joi.array()
  .items(Joi.string().trim().min(2).max(SERVICE_ITEM_MAX_LENGTH))
  .max(SERVICES_ARRAY_LIMIT)
  .custom((services, helpers) => {
    if (!Array.isArray(services)) {
      return helpers.error('any.invalid', { message: 'Services must be provided as an array' });
    }

    const normalized = services.map(service => service.toLowerCase());
    const duplicates = normalized.filter((service, index) => normalized.indexOf(service) !== index);
    if (duplicates.length) {
      return helpers.error('any.invalid', { message: 'Duplicate services are not allowed' });
    }

    return services;
  })
  .messages({
    'any.invalid': '{{#message}}',
    'array.max': `Cannot offer more than ${SERVICES_ARRAY_LIMIT} services`
  });

const certificationsSchema = Joi.array()
  .items(
    Joi.alternatives(
      Joi.string().trim().min(2).max(200),
      Joi.object({
        name: Joi.string().trim().min(2).max(200).required(),
        issuer: Joi.string().trim().max(200).optional(),
        issuedAt: Joi.date().iso().optional(),
        expiryDate: Joi.date().iso().optional()
      })
    )
  )
  .max(50)
  .messages({
    'array.max': 'Cannot provide more than 50 certifications'
  });

const headquartersSchema = Joi.object({
  country: Joi.string().trim().max(100).optional(),
  city: Joi.string().trim().max(100).optional(),
  address: Joi.string().trim().min(10).max(500).optional(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional()
  }).optional()
});

const registrationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Manufacturer name must be at least 2 characters long',
      'string.max': 'Manufacturer name cannot exceed 100 characters',
      'any.required': 'Manufacturer name is required'
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required'
    }),
  password: commonSchemas.password,
  industry: Joi.string().valid(...VALID_INDUSTRIES).optional().messages({
    'any.only': 'Invalid industry selection'
  }),
  contactEmail: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).optional().messages({
    'string.email': 'Invalid contact email format'
  }),
  description: Joi.string().trim().max(2000).optional().messages({
    'string.max': 'Description cannot exceed 2000 characters'
  }),
  servicesOffered: servicesSchema.optional(),
  moq: Joi.number().integer().min(1).optional().messages({
    'number.integer': 'MOQ must be a whole number',
    'number.min': 'MOQ must be at least 1'
  }),
  certifications: certificationsSchema.optional(),
  headquarters: headquartersSchema.optional()
});

const profileUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Manufacturer name must be at least 2 characters long',
    'string.max': 'Manufacturer name cannot exceed 100 characters'
  }),
  description: Joi.string().trim().max(2000).optional().messages({
    'string.max': 'Description cannot exceed 2000 characters'
  }),
  contactEmail: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).optional().messages({
    'string.email': 'Invalid contact email format'
  }),
  industry: Joi.string().valid(...VALID_INDUSTRIES).optional().messages({
    'any.only': 'Invalid industry selection'
  }),
  servicesOffered: servicesSchema.optional(),
  moq: Joi.number().integer().min(1).optional().messages({
    'number.integer': 'MOQ must be a whole number',
    'number.min': 'MOQ must be at least 1'
  }),
  certifications: certificationsSchema.optional(),
  headquarters: headquartersSchema.optional(),
  businessInformation: Joi.object({
    establishedYear: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    employeeCount: Joi.number().integer().min(1).optional()
  }).optional()
});

/**
 * Identify soft validation warnings for manufacturer registration flows.
 */
const detectManufacturerWarnings = (input: { email?: string; description?: string }): string[] => {
  const warnings: string[] = [];

  if (input.email) {
    const domain = input.email.split('@')[1]?.toLowerCase();
    if (domain && PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      warnings.push('Consider using a business email address instead of a personal email');
    }
  }

  if (input.description) {
    const description = input.description.trim();
    if (description.length > 0 && description.length < 50) {
      warnings.push('Description should be at least 50 characters for better visibility');
    }
    const wordCount = description.split(/\s+/).filter(Boolean).length;
    if (wordCount > 0 && wordCount < 20) {
      warnings.push('Description should contain at least 20 words for meaningful content');
    }
  }

  return warnings;
};

/**
 * Manufacturer feature specific Joi schemas mirroring backend validation behaviour.
 */
export const manufacturersFeatureSchemas = {
  registration: registrationSchema,
  profileUpdate: profileUpdateSchema,
  services: servicesSchema,
  certifications: certificationsSchema,
  headquarters: headquartersSchema
} as const;

export const manufacturerValidationHelpers = {
  detectWarnings: detectManufacturerWarnings,
  personalEmailDomains: PERSONAL_EMAIL_DOMAINS
} as const;
