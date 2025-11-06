import Joi from 'joi';

import { commonSchemas } from './schemas/commonSchemas';

export { commonSchemas } from './schemas/commonSchemas';

export const paginationSchema = Joi.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  offset: commonSchemas.offset
});

export const searchSchema = Joi.object({
  q: commonSchemas.searchQuery,
  sortBy: commonSchemas.sortBy,
  sortOrder: commonSchemas.sortOrder
});

export const dateRangeSchema = Joi.object({
  startDate: commonSchemas.optionalDate,
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  timezone: Joi.string()
    .max(50)
    .default('UTC')
    .optional()
});

export const filterSchema = paginationSchema
  .concat(searchSchema)
  .concat(dateRangeSchema)
  .keys({
    status: Joi.string()
      .valid('active', 'inactive', 'pending', 'suspended', 'deleted')
      .optional(),
    verified: Joi.boolean().optional()
  });

export const createValidationError = (field: string, message: string, code?: string) => ({
  field,
  message,
  code: code || 'VALIDATION_ERROR'
});

export const formatJoiError = (error: Joi.ValidationError) => {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
    type: detail.type
  }));

  return {
    message: `Validation failed: ${details.map(d => d.message).join(', ')}`,
    details,
    code: 'VALIDATION_ERROR'
  };
};

export const validateData = <T>(schema: Joi.ObjectSchema<T>, data: unknown) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    return {
      success: false,
      error: formatJoiError(error),
      data: null
    };
  }

  return {
    success: true,
    error: null,
    data: value as T
  };
};

