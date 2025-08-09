// src/validation/domainMapping.validation.ts
import Joi from 'joi';

/**
 * Schema for adding a new custom domain
 */
export const addDomainSchema = Joi.object({
  domain: Joi.string()
    .domain()
    .custom((value, helpers) => {
      // Ensure it's not a subdomain of common services
      const blockedDomains = [
        'localhost',
        'myshopify.com',
        'herokuapp.com',
        'netlify.app',
        'vercel.app',
        'github.io',
        'gitlab.io',
        'firebase.app',
        'web.app',
        'appspot.com'
      ];
      
      const lowerDomain = value.toLowerCase();
      const isBlocked = blockedDomains.some(blocked => 
        lowerDomain.includes(blocked)
      );
      
      if (isBlocked) {
        return helpers.error('domain.blocked');
      }
      
      // Ensure it's not an IP address
      const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      if (ipRegex.test(value)) {
        return helpers.error('domain.ipNotAllowed');
      }
      
      // Ensure it has a valid TLD
      const parts = value.split('.');
      if (parts.length < 2 || parts[parts.length - 1].length < 2) {
        return helpers.error('domain.invalidTld');
      }
      
      return value.toLowerCase();
    })
    .required()
    .messages({
      'string.domain': 'Must be a valid domain name',
      'domain.blocked': 'This domain type is not allowed for custom mapping',
      'domain.ipNotAllowed': 'IP addresses are not allowed, use a domain name',
      'domain.invalidTld': 'Domain must have a valid top-level domain',
      'any.required': 'Domain is required'
    }),

  // Optional subdomain prefix
  subdomain: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
    .min(1)
    .max(63)
    .optional()
    .messages({
      'string.pattern.base': 'Subdomain can only contain lowercase letters, numbers, and hyphens',
      'string.min': 'Subdomain must be at least 1 character',
      'string.max': 'Subdomain cannot exceed 63 characters'
    }),

  // SSL certificate preferences
  enableSsl: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'enableSsl must be a boolean value'
    }),

  // Force HTTPS redirect
  forceHttps: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'forceHttps must be a boolean value'
    })
});

/**
 * Schema for domain route parameters
 */
export const domainParamsSchema = Joi.object({
  domain: Joi.string()
    .domain()
    .required()
    .messages({
      'string.domain': 'Must be a valid domain name',
      'any.required': 'Domain parameter is required'
    })
});

/**
 * Schema for listing domains with query parameters
 */
export const listDomainsQuerySchema = Joi.object({
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
    .max(50)
    .default(10)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    }),

  status: Joi.string()
    .valid('pending', 'verified', 'failed', 'active', 'inactive')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, verified, failed, active, inactive'
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),

  sortBy: Joi.string()
    .valid('domain', 'createdAt', 'status', 'lastVerified')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: domain, createdAt, status, lastVerified'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    })
});

/**
 * Schema for domain verification settings
 */
export const domainVerificationSchema = Joi.object({
  method: Joi.string()
    .valid('dns', 'file', 'meta')
    .default('dns')
    .messages({
      'any.only': 'Verification method must be one of: dns, file, meta'
    }),

  // For DNS verification
  recordType: Joi.string()
    .valid('TXT', 'CNAME')
    .when('method', {
      is: 'dns',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'DNS record type must be either TXT or CNAME',
      'any.required': 'Record type is required for DNS verification'
    }),

  // Auto-retry verification
  autoRetry: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'autoRetry must be a boolean value'
    })
});

/**
 * Schema for updating domain configuration
 */
export const updateDomainConfigSchema = Joi.object({
  enableSsl: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'enableSsl must be a boolean value'
    }),

  forceHttps: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'forceHttps must be a boolean value'
    }),

  isPrimary: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isPrimary must be a boolean value'
    }),

  // Custom headers for the domain
  customHeaders: Joi.object()
    .pattern(
      Joi.string().max(100),
      Joi.string().max(500)
    )
    .max(20)
    .optional()
    .messages({
      'object.max': 'Cannot have more than 20 custom headers'
    }),

  // Redirect configuration
  redirectTo: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Redirect URL must be a valid URI'
    }),

  redirectType: Joi.string()
    .valid('301', '302', '307', '308')
    .when('redirectTo', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Redirect type must be one of: 301, 302, 307, 308',
      'any.required': 'Redirect type is required when redirect URL is specified'
    })
});

/**
 * All domain mapping validation schemas
 */
export const domainMappingValidationSchemas = {
  addDomain: addDomainSchema,
  params: domainParamsSchema,
  listQuery: listDomainsQuerySchema,
  verification: domainVerificationSchema,
  updateConfig: updateDomainConfigSchema
};