// src/services/apiKey/validation/apiKeyValidation.service.ts
// Validation service for API key operations

import { createAppError } from '../../../middleware/core/error.middleware';
import { ApiKey } from '../../../models/security/apiKey.model';
import { logger } from '../../../utils/logger';

export class ApiKeyValidationService {
  ensureBusinessId(businessId: string | undefined | null): string {
    const trimmed = (businessId || '').trim();
    if (!trimmed) {
      throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
    }
    return trimmed;
  }

  async hasPermission(keyId: string, permission: string): Promise<boolean> {
    try {
      const doc = await ApiKey.findOne({ keyId, revoked: false });
      if (!doc || !doc.permissions) return false;
      return doc.permissions.includes(permission);
    } catch (error: any) {
      logger.error('Check permission error:', error);
      return false;
    }
  }

  async hasScope(keyId: string, scope: string): Promise<boolean> {
    try {
      const doc = await ApiKey.findOne({ keyId, revoked: false });
      if (!doc || !doc.scopes) return false;
      return doc.scopes.includes(scope);
    } catch (error: any) {
      logger.error('Check scope error:', error);
      return false;
    }
  }

  async checkKeyPermission(keyId: string, permission: string): Promise<boolean> {
    try {
      const apiKey = await ApiKey.findOne({ keyId, revoked: false }).select('permissions');
      if (!apiKey || !apiKey.permissions) return false;
      
      // Check exact permission or wildcard permissions
      return apiKey.permissions.includes(permission) || 
             apiKey.permissions.includes('admin') || 
             apiKey.permissions.includes('*');
    } catch (error: any) {
      logger.error('Check key permission error:', error);
      return false;
    }
  }
}

export const apiKeyValidationService = new ApiKeyValidationService();

