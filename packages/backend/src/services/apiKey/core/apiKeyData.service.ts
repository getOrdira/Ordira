// src/services/apiKey/core/apiKeyData.service.ts
// Core data operations for API keys

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { createAppError } from '../../../middleware/core/error.middleware';
import { ApiKey } from '../../../models/security/apiKey.model';
import { logger } from '../../../utils/logger';
import type {
  CreateApiKeyOptions,
  RevokeOptions,
  ApiKeyCreationResult
} from '../utils/types';
import { apiKeyValidationService } from '../validation/apiKeyValidation.service';

export class ApiKeyDataService {
  constructor(
    private readonly validation = apiKeyValidationService
  ) {}

  async createApiKey(businessId: string, options?: CreateApiKeyOptions): Promise<ApiKeyCreationResult> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      
      const keyId = crypto.randomBytes(8).toString('hex');
      const secret = crypto.randomBytes(32).toString('hex');
      const toHash = `${keyId}.${secret}`;
      const hashed = await bcrypt.hash(toHash, 10);

      const doc = await ApiKey.create({
        business: validatedBusinessId,
        keyId,
        hashedSecret: hashed,
        name: options?.name || 'Default API Key',
        permissions: options?.permissions || ['read'],
        expiresAt: options?.expiresAt,
        rateLimits: options?.rateLimits,
        allowedOrigins: options?.allowedOrigins,
        description: options?.description,
        planLevel: options?.planLevel,
        createdBy: options?.createdBy,
        createdAt: new Date()
      });

      // Return the one-and-only time we can show the raw key:
      return { 
        keyId, 
        secret, 
        key: `${keyId}.${secret}`, // Full key for immediate use
        id: doc._id.toString(), 
        name: doc.name,
        permissions: doc.permissions,
        createdAt: doc.createdAt 
      };
    } catch (error: any) {
      logger.error('Create API key error:', error);
      throw createAppError(`Failed to create API key: ${error.message}`, 500, 'CREATE_API_KEY_FAILED');
    }
  }

  async getApiKey(keyId: string, businessId: string) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const doc = await ApiKey.findOne({ 
        business: validatedBusinessId, 
        keyId, 
        revoked: false 
      });
      
      if (!doc) {
        return null;
      }
      return doc;
    } catch (error: any) {
      logger.error('Get API key error:', error);
      throw createAppError(`Failed to get API key: ${error.message}`, 500, 'GET_API_KEY_FAILED');
    }
  }

  async getApiKeyInfo(keyId: string, businessId: string) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const doc = await ApiKey.findOne({ 
        business: validatedBusinessId, 
        keyId, 
        revoked: false 
      }).select('keyId createdAt revoked').lean();
      
      if (!doc) {
        throw createAppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }
      return doc;
    } catch (error: any) {
      logger.error('Get API key info error:', error);
      if (error.code === 'API_KEY_NOT_FOUND') throw error;
      throw createAppError(`Failed to get API key info: ${error.message}`, 500, 'GET_API_KEY_INFO_FAILED');
    }
  }

  async listApiKeys(businessId: string) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      return ApiKey.find({ business: validatedBusinessId, revoked: false })
        .select('keyId name createdAt revoked expiresAt')
        .lean();
    } catch (error: any) {
      logger.error('List API keys error:', error);
      throw createAppError(`Failed to list API keys: ${error.message}`, 500, 'LIST_API_KEYS_FAILED');
    }
  }

  async updateApiKey(keyId: string, businessId: string, updates: any) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const doc = await ApiKey.findOneAndUpdate(
        { business: validatedBusinessId, keyId, revoked: false },
        { 
          ...updates,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!doc) {
        throw createAppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }
      return doc;
    } catch (error: any) {
      logger.error('Update API key error:', error);
      if (error.code === 'API_KEY_NOT_FOUND') throw error;
      throw createAppError(`Failed to update API key: ${error.message}`, 500, 'UPDATE_API_KEY_FAILED');
    }
  }

  async revokeApiKey(keyId: string, businessId: string, options?: RevokeOptions) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const doc = await ApiKey.findOneAndUpdate(
        { business: validatedBusinessId, keyId, revoked: false },
        { 
          revoked: true,
          revokedAt: new Date(),
          revokedBy: options?.revokedBy,
          reason: options?.reason
        },
        { new: true }
      );
      
      if (!doc) {
        throw createAppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }
      return doc;
    } catch (error: any) {
      logger.error('Revoke API key error:', error);
      if (error.code === 'API_KEY_NOT_FOUND') throw error;
      throw createAppError(`Failed to revoke API key: ${error.message}`, 500, 'REVOKE_API_KEY_FAILED');
    }
  }

  async verifyApiKey(provided: string) {
    try {
      // provided format: "keyId.secret"
      const [keyId, secret] = provided.split('.');
      if (!keyId || !secret) return null;

      const doc = await ApiKey.findOne({ keyId, revoked: false });
      if (!doc) return null;

      const ok = await bcrypt.compare(provided, doc.hashedSecret);
      return ok ? doc : null;
    } catch (error: any) {
      logger.error('Verify API key error:', error);
      return null;
    }
  }

  async revokeAllApiKeys(businessId: string) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const result = await ApiKey.updateMany(
        { business: validatedBusinessId, revoked: false },
        { revoked: true }
      );
      return { revokedCount: result.modifiedCount };
    } catch (error: any) {
      logger.error('Revoke all API keys error:', error);
      throw createAppError(`Failed to revoke all API keys: ${error.message}`, 500, 'REVOKE_ALL_API_KEYS_FAILED');
    }
  }

  async getKeyCount(businessId: string): Promise<number> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const count = await ApiKey.countDocuments({ 
        business: validatedBusinessId, 
        revoked: false 
      });
      return count;
    } catch (error: any) {
      logger.error('Get key count error:', error);
      throw createAppError(`Failed to get key count: ${error.message}`, 500, 'GET_KEY_COUNT_FAILED');
    }
  }
}

export const apiKeyDataService = new ApiKeyDataService();

