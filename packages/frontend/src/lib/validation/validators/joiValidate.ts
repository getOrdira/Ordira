// src/lib/validation/validators/joiValidate.ts
// Lightweight Joi validation helpers aligned with backend validation middleware.

import type Joi from 'joi';

import { ValidationError } from '@/lib/errors';

import { formatJoiError } from '../utils';

export interface JoiValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ReturnType<typeof formatJoiError>;
}

export interface JoiValidationOptions extends Joi.ValidationOptions {}

const DEFAULT_OPTIONS: Joi.ValidationOptions = {
  abortEarly: false,
  stripUnknown: true,
  convert: true
};

export const mergeValidationOptions = (options?: JoiValidationOptions): Joi.ValidationOptions => ({
  ...DEFAULT_OPTIONS,
  ...options
});

export const validateWithSchema = <T>(
  schema: Joi.ObjectSchema<T>,
  data: unknown,
  options?: JoiValidationOptions
): JoiValidationResult<T> => {
  const mergedOptions = mergeValidationOptions(options);
  const { error, value } = schema.validate(data, mergedOptions);

  if (error) {
    return {
      success: false,
      error: formatJoiError(error)
    };
  }

  return {
    success: true,
    data: value as T
  };
};

export const assertWithSchema = <T>(
  schema: Joi.ObjectSchema<T>,
  data: unknown,
  options?: JoiValidationOptions
): T => {
  const mergedOptions = mergeValidationOptions(options);
  const { error, value } = schema.validate(data, mergedOptions);

  if (error) {
    const formatted = formatJoiError(error);
    const field = formatted.details?.[0]?.field ?? 'input';
    throw new ValidationError(formatted.message, field, formatted);
  }

  return value as T;
};

export const createSchemaValidator = <T>(
  schema: Joi.ObjectSchema<T>,
  options?: JoiValidationOptions
) => (data: unknown) => assertWithSchema(schema, data, options);

