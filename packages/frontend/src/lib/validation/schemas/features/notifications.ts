// src/lib/validation/schemas/features/notifications.ts
// Frontend validation schemas for notification filters and channel preferences.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const notificationFiltersSchema = Joi.object({
  businessId: commonSchemas.optionalMongoId,
  manufacturerId: commonSchemas.optionalMongoId,
  type: Joi.string().trim().optional(),
  category: Joi.string().trim().optional(),
  priority: Joi.string().trim().optional(),
  read: Joi.boolean().optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  offset: Joi.number().integer().min(0).optional()
}).custom((value, helpers) => {
  if (value.dateFrom && value.dateTo) {
    if (new Date(value.dateFrom) > new Date(value.dateTo)) {
      return helpers.error('any.invalid', { message: 'dateFrom must be before dateTo' });
    }
  }

  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

const channelPreferencesSchema = Joi.object({
  email: Joi.boolean().optional(),
  webhook: Joi.boolean().optional(),
  inApp: Joi.boolean().optional()
}).messages({
  'object.base': 'Channel preferences must be an object'
});

/**
 * Notification feature specific Joi schemas mirroring backend validation behaviour.
 */
export const notificationsFeatureSchemas = {
  filters: notificationFiltersSchema,
  channelPreferences: channelPreferencesSchema
} as const;
