// src/lib/validation/schemas/features/media.ts
// Frontend validation schemas for shared media uploads and security checks.

import Joi from 'joi';

const SUSPICIOUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.dll', '.so'];
const TRUSTED_IMAGE_HOSTS = ['amazonaws.com', 'cloudinary.com', 'imgix.com', 'googleapis.com', 'github.com', 'linkedin.com'];

const mimeExtensionMap: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/mpeg': ['.mpeg', '.mpg'],
  'video/quicktime': ['.mov'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/json': ['.json']
};

const uploadedFileSchema = Joi.object({
  size: Joi.number().positive().required().messages({
    'number.positive': 'File must be larger than 0 bytes',
    'any.required': 'File size is required'
  }),
  mimeType: Joi.string().trim().lowercase().required(),
  originalName: Joi.string().trim().min(1).required().messages({
    'string.min': 'File name must contain at least one character'
  })
}).unknown(true);

const mediaUploadOptionsSchema = Joi.object({
  allowedTypes: Joi.array().items(Joi.string().trim().lowercase()).optional(),
  maxFileSize: Joi.number().integer().positive().optional()
});

const mediaFileUploadSchema = Joi.object({
  file: uploadedFileSchema.required(),
  options: mediaUploadOptionsSchema.optional()
})
  .custom((value, helpers) => {
    const { file, options } = value;
    const { size, mimeType, originalName } = file as { size: number; mimeType: string; originalName: string };

    if (options?.allowedTypes && !options.allowedTypes.includes(mimeType)) {
      return helpers.error('any.invalid', {
        message: `File type ${mimeType} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
      });
    }

    if (options?.maxFileSize && size > options.maxFileSize) {
      return helpers.error('any.invalid', {
        message: `File size ${(size / (1024 * 1024)).toFixed(2)}MB exceeds limit of ${(options.maxFileSize / (1024 * 1024)).toFixed(2)}MB`
      });
    }

    if (size <= 0) {
      return helpers.error('any.invalid', { message: 'File appears to be empty' });
    }

    if (!originalName) {
      return helpers.error('any.invalid', { message: 'File must have a valid filename' });
    }

    const lowerCaseName = originalName.toLowerCase();
    if (SUSPICIOUS_EXTENSIONS.some(ext => lowerCaseName.endsWith(ext))) {
      return helpers.error('any.invalid', {
        message: 'File type is not allowed for security reasons'
      });
    }

    const parts = lowerCaseName.split('.');
    if (parts.length > 2) {
      const lastTwo = parts.slice(-2);
      if (SUSPICIOUS_EXTENSIONS.some(ext => lastTwo.some(part => ext.includes(part)))) {
        return helpers.error('any.invalid', { message: 'Suspicious file extension detected' });
      }
    }

    const expectedExtensions = mimeExtensionMap[mimeType];
    if (expectedExtensions && !expectedExtensions.some(ext => lowerCaseName.endsWith(ext))) {
      const warnings = Array.isArray(value._warnings) ? value._warnings : [];
      warnings.push(`MIME type ${mimeType} usually matches extensions ${expectedExtensions.join(', ')}`);
      value._warnings = warnings;
    }

    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

const mediaBatchUploadSchema = Joi.object({
  files: Joi.array().items(uploadedFileSchema).min(1).max(50).required().messages({
    'array.min': 'At least one file must be provided for batch upload',
    'array.max': 'Too many files. Maximum 50 files allowed per batch upload'
  })
});

const profilePictureUrlSchema = Joi.string()
  .trim()
  .uri({ scheme: ['http', 'https'] })
  .required()
  .custom((value, helpers) => {
    try {
      new URL(value);
    } catch {
      return helpers.error('any.invalid', { message: 'Invalid URL format' });
    }

    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

/**
 * Media feature specific Joi schemas mirroring backend validation behaviour.
 */
export const mediaFeatureSchemas = {
  fileUpload: mediaFileUploadSchema,
  batchUpload: mediaBatchUploadSchema,
  profilePictureUrl: profilePictureUrlSchema
} as const;
