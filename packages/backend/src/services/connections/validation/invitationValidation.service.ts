// src/services/connections/validation/invitationValidation.service.ts

import Joi from 'joi';
import { Types } from 'mongoose';

export interface InvitationValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface TermsValidationResult {
  isValid: boolean;
  errors?: string[];
}

/**
 * Invitation Validation Service
 * Validates invitation data and business rules
 */
export class InvitationValidationService {
  /**
   * Validate invitation creation data
   */
  validateCreateInvitation(data: {
    brandId: string;
    manufacturerId: string;
    invitationType?: string;
    message?: string;
    terms?: any;
  }): InvitationValidationResult {
    const schema = Joi.object({
      brandId: Joi.string().required().custom((value, helpers) => {
        if (!Types.ObjectId.isValid(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'ObjectId validation'),
      manufacturerId: Joi.string().required().custom((value, helpers) => {
        if (!Types.ObjectId.isValid(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'ObjectId validation'),
      invitationType: Joi.string().valid('collaboration', 'manufacturing', 'partnership', 'custom').optional(),
      message: Joi.string().max(1000).optional(),
      terms: Joi.object({
        proposedCommission: Joi.number().min(0).max(100).optional(),
        minimumOrderQuantity: Joi.number().min(1).optional(),
        deliveryTimeframe: Joi.string().max(100).optional(),
        specialRequirements: Joi.array().items(Joi.string().max(200)).optional()
      }).optional()
    });

    const { error } = schema.validate(data);

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    // Additional business rule: brand and manufacturer cannot be the same
    if (data.brandId === data.manufacturerId) {
      return {
        isValid: false,
        errors: ['Brand and manufacturer cannot be the same']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate invitation response
   */
  validateInvitationResponse(data: {
    inviteId: string;
    accept: boolean;
    manufacturerId: string;
    message?: string;
    counterOffer?: any;
  }): InvitationValidationResult {
    const schema = Joi.object({
      inviteId: Joi.string().required().custom((value, helpers) => {
        if (!Types.ObjectId.isValid(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'ObjectId validation'),
      accept: Joi.boolean().required(),
      manufacturerId: Joi.string().required().custom((value, helpers) => {
        if (!Types.ObjectId.isValid(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'ObjectId validation'),
      message: Joi.string().max(1000).optional(),
      counterOffer: Joi.object({
        commission: Joi.number().min(0).max(100).optional(),
        minimumOrderQuantity: Joi.number().min(1).optional(),
        deliveryTimeframe: Joi.string().max(100).optional(),
        additionalTerms: Joi.string().max(500).optional()
      }).optional()
    });

    const { error } = schema.validate(data);

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };
  }

  /**
   * Validate terms data
   */
  validateTerms(terms: {
    proposedCommission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    specialRequirements?: string[];
  }): TermsValidationResult {
    const schema = Joi.object({
      proposedCommission: Joi.number().min(0).max(100).optional(),
      minimumOrderQuantity: Joi.number().min(1).optional(),
      deliveryTimeframe: Joi.string().max(100).optional(),
      specialRequirements: Joi.array().items(Joi.string().max(200)).max(10).optional()
    });

    const { error } = schema.validate(terms);

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };
  }

  /**
   * Validate counter offer
   */
  validateCounterOffer(counterOffer: {
    commission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    additionalTerms?: string;
  }): InvitationValidationResult {
    const schema = Joi.object({
      commission: Joi.number().min(0).max(100).optional(),
      minimumOrderQuantity: Joi.number().min(1).optional(),
      deliveryTimeframe: Joi.string().max(100).optional(),
      additionalTerms: Joi.string().max(500).optional()
    });

    const { error } = schema.validate(counterOffer);

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    // At least one field should be provided
    const hasAtLeastOneField = Object.values(counterOffer).some(value => value !== undefined && value !== null);
    if (!hasAtLeastOneField) {
      return {
        isValid: false,
        errors: ['Counter offer must contain at least one field']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate bulk invitation request
   */
  validateBulkInvitation(data: {
    brandId: string;
    manufacturerIds: string[];
    invitationType?: string;
    message?: string;
  }): InvitationValidationResult {
    const schema = Joi.object({
      brandId: Joi.string().required().custom((value, helpers) => {
        if (!Types.ObjectId.isValid(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'ObjectId validation'),
      manufacturerIds: Joi.array().items(
        Joi.string().custom((value, helpers) => {
          if (!Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
          }
          return value;
        }, 'ObjectId validation')
      ).min(1).max(50).required(),
      invitationType: Joi.string().valid('collaboration', 'manufacturing', 'partnership', 'custom').optional(),
      message: Joi.string().max(1000).optional()
    });

    const { error } = schema.validate(data);

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    // Check for duplicate manufacturer IDs
    const uniqueIds = new Set(data.manufacturerIds);
    if (uniqueIds.size !== data.manufacturerIds.length) {
      return {
        isValid: false,
        errors: ['Manufacturer IDs must be unique']
      };
    }

    // Ensure brand is not in the manufacturer list
    if (data.manufacturerIds.includes(data.brandId)) {
      return {
        isValid: false,
        errors: ['Brand cannot invite itself']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate invitation filters
   */
  validateInvitationFilters(filters: {
    status?: string;
    invitationType?: string;
    limit?: number;
  }): InvitationValidationResult {
    const schema = Joi.object({
      status: Joi.string().valid('pending', 'accepted', 'declined', 'expired', 'cancelled', 'disconnected').optional(),
      invitationType: Joi.string().valid('collaboration', 'manufacturing', 'partnership', 'custom').optional(),
      limit: Joi.number().min(1).max(100).optional()
    });

    const { error } = schema.validate(filters);

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };
  }

  /**
   * Validate expiration date
   */
  validateExpirationDate(expiresAt: Date): InvitationValidationResult {
    const now = new Date();
    const minExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
    const maxExpiration = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    if (expiresAt <= now) {
      return {
        isValid: false,
        errors: ['Expiration date must be in the future']
      };
    }

    if (expiresAt < minExpiration) {
      return {
        isValid: false,
        errors: ['Expiration date must be at least 1 day from now']
      };
    }

    if (expiresAt > maxExpiration) {
      return {
        isValid: false,
        errors: ['Expiration date cannot be more than 90 days from now']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate ObjectId format
   */
  isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }
}

// Export singleton instance
export const invitationValidationService = new InvitationValidationService();
