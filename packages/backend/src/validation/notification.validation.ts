// src/validation/notification.validation.ts
import Joi from 'joi';

/**
 * Schema for notification route parameters
 */
export const notificationParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Notification ID must be a valid MongoDB ObjectId',
      'any.required': 'Notification ID is required'
    })
});

/**
 * Schema for listing notifications with query parameters
 */
export const listNotificationsQuerySchema = Joi.object({
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
    .valid('unread', 'read', 'archived', 'deleted')
    .optional()
    .messages({
      'any.only': 'Status must be one of: unread, read, archived, deleted'
    }),

  type: Joi.string()
    .valid(
      'invitation', 'order', 'payment', 'certificate', 'system',
      'security', 'verification', 'collaboration', 'marketing',
      'reminder', 'update', 'announcement'
    )
    .optional()
    .messages({
      'any.only': 'Type must be a valid notification type'
    }),

  priority: Joi.string()
    .valid('low', 'normal', 'high', 'urgent')
    .optional()
    .messages({
      'any.only': 'Priority must be one of: low, normal, high, urgent'
    }),

  category: Joi.string()
    .valid('business', 'technical', 'billing', 'marketing', 'security')
    .optional()
    .messages({
      'any.only': 'Category must be one of: business, technical, billing, marketing, security'
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
    .valid('createdAt', 'updatedAt', 'priority', 'type', 'status')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: createdAt, updatedAt, priority, type, status'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    }),

  includeRead: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Include read must be a boolean value'
    }),

  includeArchived: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Include archived must be a boolean value'
    })
});

/**
 * Schema for notification settings
 */
export const notificationSettingsSchema = Joi.object({
  email: Joi.object({
    enabled: Joi.boolean().default(true),
    frequency: Joi.string()
      .valid('immediate', 'hourly', 'daily', 'weekly')
      .default('immediate')
      .messages({
        'any.only': 'Email frequency must be one of: immediate, hourly, daily, weekly'
      }),
    
    types: Joi.array()
      .items(Joi.string().valid(
        'invitation', 'order', 'payment', 'certificate', 'system',
        'security', 'verification', 'collaboration', 'marketing',
        'reminder', 'update', 'announcement'
      ))
      .max(20)
      .default([
        'invitation', 'order', 'payment', 'certificate', 'security'
      ])
      .messages({
        'array.max': 'Cannot enable more than 20 email notification types'
      })
  }).optional(),

  push: Joi.object({
    enabled: Joi.boolean().default(true),
    
    types: Joi.array()
      .items(Joi.string().valid(
        'invitation', 'order', 'payment', 'certificate', 'system',
        'security', 'verification', 'collaboration', 'marketing',
        'reminder', 'update', 'announcement'
      ))
      .max(20)
      .default([
        'invitation', 'order', 'payment', 'certificate', 'security', 'urgent'
      ])
      .messages({
        'array.max': 'Cannot enable more than 20 push notification types'
      }),

    quietHours: Joi.object({
      enabled: Joi.boolean().default(false),
      startTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .default('22:00')
        .messages({
          'string.pattern.base': 'Start time must be in HH:MM format (24-hour)'
        }),
      endTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .default('08:00')
        .messages({
          'string.pattern.base': 'End time must be in HH:MM format (24-hour)'
        }),
      timezone: Joi.string()
        .max(50)
        .default('UTC')
        .messages({
          'string.max': 'Timezone cannot exceed 50 characters'
        })
    }).optional()
  }).optional(),

  sms: Joi.object({
    enabled: Joi.boolean().default(false),
    
    types: Joi.array()
      .items(Joi.string().valid(
        'security', 'urgent', 'payment', 'verification'
      ))
      .max(10)
      .default(['security', 'urgent'])
      .messages({
        'array.max': 'Cannot enable more than 10 SMS notification types'
      })
  }).optional(),

  inApp: Joi.object({
    enabled: Joi.boolean().default(true),
    
    autoMarkAsRead: Joi.boolean().default(false),
    
    retentionDays: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(30)
      .messages({
        'number.integer': 'Retention days must be an integer',
        'number.min': 'Retention must be at least 1 day',
        'number.max': 'Retention cannot exceed 365 days'
      })
  }).optional(),

  preferences: Joi.object({
    language: Joi.string()
      .valid('en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko')
      .default('en')
      .messages({
        'any.only': 'Language must be a supported language code'
      }),
    
    timezone: Joi.string()
      .max(50)
      .default('UTC')
      .messages({
        'string.max': 'Timezone cannot exceed 50 characters'
      }),
    
    groupSimilar: Joi.boolean().default(true),
    
    maxPerDay: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50)
      .messages({
        'number.integer': 'Max per day must be an integer',
        'number.min': 'Must allow at least 1 notification per day',
        'number.max': 'Cannot exceed 100 notifications per day'
      })
  }).optional()
});

/**
 * Schema for bulk notification actions
 */
export const bulkNotificationActionSchema = Joi.object({
  notificationIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one notification ID must be provided',
      'array.max': 'Cannot process more than 100 notifications at once',
      'string.pattern.base': 'Each notification ID must be a valid MongoDB ObjectId',
      'any.required': 'Notification IDs array is required'
    }),

  action: Joi.string()
    .valid('read', 'unread', 'archive', 'delete', 'mark_important')
    .required()
    .messages({
      'any.only': 'Action must be one of: read, unread, archive, delete, mark_important',
      'any.required': 'Action is required'
    })
});

/**
 * All notification validation schemas
 */
export const notificationValidationSchemas = {
  params: notificationParamsSchema,
  listQuery: listNotificationsQuerySchema,
  settings: notificationSettingsSchema,
  bulkAction: bulkNotificationActionSchema
};