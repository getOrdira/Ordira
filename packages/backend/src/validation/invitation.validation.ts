// src/validation/invitation.validation.ts
import Joi from 'joi';

/**
 * Schema for sending invitation to manufacturer
 */
export const sendInviteSchema = Joi.object({
  manufacturerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Manufacturer ID must be a valid MongoDB ObjectId',
      'any.required': 'Manufacturer ID is required'
    }),

  message: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Invitation message cannot exceed 1000 characters'
    }),

  invitationType: Joi.string()
    .valid('collaboration', 'manufacturing', 'partnership', 'custom')
    .default('collaboration')
    .messages({
      'any.only': 'Invitation type must be one of: collaboration, manufacturing, partnership, custom'
    }),

  terms: Joi.object({
    proposedCommission: Joi.number()
      .min(0)
      .max(100)
      .optional()
      .messages({
        'number.min': 'Commission must be at least 0%',
        'number.max': 'Commission cannot exceed 100%'
      }),

    minimumOrderQuantity: Joi.number()
      .integer()
      .min(1)
      .optional()
      .messages({
        'number.integer': 'Minimum order quantity must be an integer',
        'number.min': 'Minimum order quantity must be at least 1'
      }),

    deliveryTimeframe: Joi.string()
      .trim()
      .max(200)
      .optional()
      .messages({
        'string.max': 'Delivery timeframe cannot exceed 200 characters'
      }),

    specialRequirements: Joi.array()
      .items(Joi.string().trim().max(500))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 10 special requirements',
        'string.max': 'Each requirement cannot exceed 500 characters'
      })
  }).optional(),

  expiresInDays: Joi.number()
    .integer()
    .min(1)
    .max(90)
    .default(30)
    .messages({
      'number.integer': 'Expiration days must be an integer',
      'number.min': 'Invitation must be valid for at least 1 day',
      'number.max': 'Invitation cannot be valid for more than 90 days'
    })
});

/**
 * Schema for bulk invitations
 */
export const bulkInviteSchema = Joi.object({
  manufacturerIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(50) // Limit bulk operations
    .required()
    .messages({
      'array.min': 'At least one manufacturer ID must be provided',
      'array.max': 'Cannot send more than 50 invitations at once',
      'string.pattern.base': 'Each manufacturer ID must be a valid MongoDB ObjectId',
      'any.required': 'Manufacturer IDs array is required'
    }),

  message: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Invitation message cannot exceed 1000 characters'
    }),

  invitationType: Joi.string()
    .valid('collaboration', 'manufacturing', 'partnership', 'custom')
    .default('collaboration')
    .messages({
      'any.only': 'Invitation type must be one of: collaboration, manufacturing, partnership, custom'
    }),

  expiresInDays: Joi.number()
    .integer()
    .min(1)
    .max(90)
    .default(30)
    .messages({
      'number.integer': 'Expiration days must be an integer',
      'number.min': 'Invitation must be valid for at least 1 day',
      'number.max': 'Invitation cannot be valid for more than 90 days'
    })
});

/**
 * Schema for responding to invitation
 */
export const respondToInviteSchema = Joi.object({
  accept: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'Accept must be a boolean value',
      'any.required': 'Accept decision is required'
    }),

  responseMessage: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Response message cannot exceed 1000 characters'
    }),

  counterOffer: Joi.object({
    commission: Joi.number()
      .min(0)
      .max(100)
      .optional()
      .messages({
        'number.min': 'Commission must be at least 0%',
        'number.max': 'Commission cannot exceed 100%'
      }),

    minimumOrderQuantity: Joi.number()
      .integer()
      .min(1)
      .optional()
      .messages({
        'number.integer': 'Minimum order quantity must be an integer',
        'number.min': 'Minimum order quantity must be at least 1'
      }),

    deliveryTimeframe: Joi.string()
      .trim()
      .max(200)
      .optional()
      .messages({
        'string.max': 'Delivery timeframe cannot exceed 200 characters'
      }),

    additionalTerms: Joi.string()
      .trim()
      .max(1000)
      .optional()
      .messages({
        'string.max': 'Additional terms cannot exceed 1000 characters'
      })
  })
  .when('accept', {
    is: false,
    then: Joi.optional(),
    otherwise: Joi.optional()
  })
});

/**
 * Schema for invitation route parameters
 */
export const inviteParamsSchema = Joi.object({
  inviteId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invitation ID must be a valid MongoDB ObjectId',
      'any.required': 'Invitation ID is required'
    })
});

/**
 * Schema for listing invitations with query parameters
 */
export const listInvitesQuerySchema = Joi.object({
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
    .valid('pending', 'accepted', 'declined', 'expired', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, accepted, declined, expired, cancelled'
    }),

  invitationType: Joi.string()
    .valid('collaboration', 'manufacturing', 'partnership', 'custom')
    .optional()
    .messages({
      'any.only': 'Invitation type must be one of: collaboration, manufacturing, partnership, custom'
    }),

  startDate: Joi.date()
    .optional(),

  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.greater': 'End date must be after start date'
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),

  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'expiresAt', 'status', 'invitationType')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: createdAt, updatedAt, expiresAt, status, invitationType'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    })
});

/**
 * All invitation validation schemas
 */
export const invitationValidationSchemas = {
  sendInvite: sendInviteSchema,
  bulkInvite: bulkInviteSchema,
  respond: respondToInviteSchema,
  params: inviteParamsSchema,
  listQuery: listInvitesQuerySchema
};