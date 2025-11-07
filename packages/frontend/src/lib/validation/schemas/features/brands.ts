// src/lib/validation/schemas/features/brands.ts
// Frontend validation schemas for brand profile, media, and wallet operations.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const BRAND_FILE_CATEGORIES = ['logo', 'banner', 'general', 'document'] as const;

const BRAND_ALLOWED_MIME_TYPES: Record<(typeof BRAND_FILE_CATEGORIES)[number], string[]> = {
  logo: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  banner: ['image/jpeg', 'image/png', 'image/webp'],
  general: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'],
  document: ['application/pdf', 'image/jpeg', 'image/png']
};

const BRAND_MAX_FILE_SIZES: Record<(typeof BRAND_FILE_CATEGORIES)[number], number> = {
  logo: 2 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  general: 5 * 1024 * 1024
};

const formatFileSize = (bytes: number): string => {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(2)}MB`;
};

const brandFileSchema = Joi.object({
  size: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'Uploaded file size must be a number',
      'number.positive': 'Uploaded file must be larger than 0 bytes',
      'any.required': 'Uploaded file size is required'
    }),
  mimeType: Joi.string().optional(),
  mimetype: Joi.string().optional(),
  type: Joi.string().optional(),
  originalName: Joi.string().optional(),
  originalname: Joi.string().optional(),
  name: Joi.string().optional()
}).unknown(true);

const brandFileUploadSchema: Joi.ObjectSchema<{ file: Record<string, unknown>; category?: string }> = Joi.object({
  file: brandFileSchema.required().messages({
    'any.required': 'A file must be provided for upload'
  }),
  category: Joi.string()
    .valid(...BRAND_FILE_CATEGORIES)
    .default('general')
})
  .custom((value, helpers) => {
    const { file, category } = value;
    const normalizedFile = file as Record<string, unknown>;
    const mimeType = normalizedFile.mimeType ?? normalizedFile.mimetype ?? normalizedFile.type;
    const originalName = normalizedFile.originalName ?? normalizedFile.originalname ?? normalizedFile.name;

    if (!mimeType || typeof mimeType !== 'string') {
      return helpers.error('any.invalid', { message: 'File type is required for validation' });
    }

    if (!originalName || typeof originalName !== 'string') {
      return helpers.error('any.invalid', { message: 'File name is required for validation' });
    }

    const allowedTypes = BRAND_ALLOWED_MIME_TYPES[category as (typeof BRAND_FILE_CATEGORIES)[number]];
    if (!allowedTypes.includes(mimeType)) {
      return helpers.error('any.invalid', {
        message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    const maxSize = BRAND_MAX_FILE_SIZES[category as (typeof BRAND_FILE_CATEGORIES)[number]];
    const fileSize = normalizedFile.size;
    if (typeof fileSize === 'number') {
      if (fileSize > maxSize) {
        return helpers.error('any.invalid', {
          message: `File too large. Maximum size: ${formatFileSize(maxSize)}`
        });
      }
    } else {
      return helpers.error('any.invalid', {
        message: 'File size is required for validation'
      });
    }

    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

const brandWalletValidationSchema = Joi.object({
  address: Joi.string()
    .trim()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid wallet address format',
      'string.empty': 'Wallet address is required',
      'any.required': 'Wallet address is required'
    }),
  requireSignature: Joi.boolean().optional(),
  signature: Joi.string().optional(),
  message: Joi.string().optional(),
  businessId: commonSchemas.optionalMongoId,
  checkOwnership: Joi.boolean().optional()
})
  .custom((value, helpers) => {
    if ((value.requireSignature || value.signature) && (!value.signature || !value.message)) {
      return helpers.error('any.invalid', {
        message: 'Signature and message are required for wallet verification'
      });
    }

    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

/**
 * Brand feature specific Joi schemas mirroring backend validation behaviour.
 */
export const brandsFeatureSchemas = {
  fileUpload: brandFileUploadSchema,
  walletVerification: brandWalletValidationSchema
} as const;
