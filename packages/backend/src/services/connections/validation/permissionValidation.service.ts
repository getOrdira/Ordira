// src/services/connections/validation/permissionValidation.service.ts

import { Types } from 'mongoose';
import Joi from 'joi';
import { permissionsService, ConnectionFeature } from '../features/permissions.service';

export interface PermissionValidationResult {
  isValid: boolean;
  errors?: string[];
}

const FEATURE_SCHEMA = Joi.string().valid(
  'analytics',
  'supplyChain',
  'productData',
  'messaging',
  'fileSharing',
  'recommendations'
);

/**
 * Validation utilities for connection permission requests.
 */
export class PermissionValidationService {
  /**
   * Validate that a permission request payload is well-formed and allowed by plan limits.
   */
  async validateFeatureRequest(data: {
    brandId: string;
    manufacturerId: string;
    feature: ConnectionFeature;
  }): Promise<PermissionValidationResult> {
    const schema = Joi.object({
      brandId: Joi.string().required(),
      manufacturerId: Joi.string().required(),
      feature: FEATURE_SCHEMA.required()
    });

    const { error } = schema.validate(data);
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    if (!Types.ObjectId.isValid(data.brandId)) {
      return {
        isValid: false,
        errors: ['Invalid brand identifier']
      };
    }

    if (!Types.ObjectId.isValid(data.manufacturerId)) {
      return {
        isValid: false,
        errors: ['Invalid manufacturer identifier']
      };
    }

    const allowed = await permissionsService.canUseFeature(
      data.brandId,
      data.manufacturerId,
      data.feature
    );

    if (!allowed) {
      const explanation = await permissionsService.explainFeatureAccess(
        data.brandId,
        data.manufacturerId,
        data.feature
      );

      return {
        isValid: false,
        errors: [explanation.reason]
      };
    }

    return { isValid: true };
  }

  /**
   * Validate a batch of features (e.g., when updating preferences).
   */
  validateFeatureList(features: ConnectionFeature[]): PermissionValidationResult {
    const schema = Joi.array().items(FEATURE_SCHEMA).max(10);
    const { error } = schema.validate(features);

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };
  }

  /**
   * Inspect a feature toggle payload such as `{ analytics: true }`.
   */
  validateFeatureTogglePayload(payload: Partial<Record<ConnectionFeature, boolean>>): PermissionValidationResult {
    const schema = Joi.object(
      (['analytics', 'supplyChain', 'productData', 'messaging', 'fileSharing', 'recommendations'] as ConnectionFeature[])
        .reduce<Record<string, Joi.BooleanSchema>>((acc, feature) => {
          acc[feature] = Joi.boolean();
          return acc;
        }, {})
    ).min(1);

    const { error } = schema.validate(payload);

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };
  }
}

export const permissionValidationService = new PermissionValidationService();
