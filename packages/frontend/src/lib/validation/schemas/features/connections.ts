// src/lib/validation/schemas/features/connections.ts
// Frontend validation schemas for invitations and connection permissions.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const CONNECTION_FEATURES = [
  'analytics',
  'supplyChain',
  'productData',
  'messaging',
  'fileSharing',
  'recommendations'
] as const;

const invitationTermsSchema = Joi.object({
  proposedCommission: Joi.number().min(0).max(100).optional(),
  minimumOrderQuantity: Joi.number().min(1).optional(),
  deliveryTimeframe: Joi.string().trim().max(100).optional(),
  specialRequirements: Joi.array().items(Joi.string().trim().max(200)).optional()
});

const invitationSchema: Joi.ObjectSchema<{
  brandId: string;
  manufacturerId: string;
  invitationType?: string;
  message?: string;
  terms?: {
    proposedCommission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    specialRequirements?: string[];
  };
}> = Joi.object({
  brandId: commonSchemas.mongoId
    .required()
    .messages({
      'any.required': 'brandId is required',
      'string.empty': 'brandId is required'
    }),
  manufacturerId: commonSchemas.mongoId
    .required()
    .messages({
      'any.required': 'manufacturerId is required',
      'string.empty': 'manufacturerId is required'
    }),
  invitationType: Joi.string()
    .valid('collaboration', 'manufacturing', 'partnership', 'custom')
    .optional()
    .messages({
      'any.only': 'invitationType must be one of: collaboration, manufacturing, partnership, custom'
    }),
  message: Joi.string().trim().max(1000).optional(),
  terms: invitationTermsSchema.optional()
})
  .custom((value, helpers) => {
    if (value.brandId === value.manufacturerId) {
      return helpers.error('any.invalid', {
        message: 'Brand and manufacturer cannot be the same'
      });
    }

    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

const featureRequestSchema: Joi.ObjectSchema<{ brandId: string; manufacturerId: string; feature: string }> = Joi.object({
  brandId: commonSchemas.mongoId
    .required()
    .messages({
      'any.required': 'brandId is required',
      'string.empty': 'brandId is required'
    }),
  manufacturerId: commonSchemas.mongoId
    .required()
    .messages({
      'any.required': 'manufacturerId is required',
      'string.empty': 'manufacturerId is required'
    }),
  feature: Joi.string()
    .valid(...CONNECTION_FEATURES)
    .required()
    .messages({
      'any.only': `feature must be one of: ${CONNECTION_FEATURES.join(', ')}`,
      'any.required': 'feature is required'
    })
});

const featureListSchema = Joi.array()
  .items(Joi.string().valid(...CONNECTION_FEATURES))
  .max(10)
  .messages({
    'any.only': `Each feature must be one of: ${CONNECTION_FEATURES.join(', ')}`
  });

const featureToggleSchema = Joi.object(
  CONNECTION_FEATURES.reduce<Record<string, Joi.BooleanSchema>>((acc, feature) => {
    acc[feature] = Joi.boolean();
    return acc;
  }, {})
).min(1);

/**
 * Connection feature specific Joi schemas mirroring backend validation behaviour.
 */
export const connectionsFeatureSchemas = {
  invitation: invitationSchema,
  featureRequest: featureRequestSchema,
  featureList: featureListSchema,
  featureToggle: featureToggleSchema
} as const;
