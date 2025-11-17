// src/controllers/features/apiKey/apiKeyData.controller.ts
// Controller exposing API key data operations

import { Response } from 'express';
import { ApiKeyBaseController, ApiKeyBaseRequest } from './apiKeyBase.controller';
import type { CreateApiKeyOptions, RevokeOptions } from '../../../services/apiKey/utils/types';

interface CreateApiKeyRequest extends ApiKeyBaseRequest {
  validatedBody?: CreateApiKeyOptions & {
    businessId?: string;
  };
}

interface GetApiKeyRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
    businessId?: string;
  };
}

interface UpdateApiKeyRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
    businessId?: string;
  };
  validatedBody?: {
    name?: string;
    permissions?: string[];
    expiresAt?: string | Date;
    rateLimits?: {
      requestsPerMinute: number;
      requestsPerDay: number;
    };
    allowedOrigins?: string[];
    description?: string;
    isActive?: boolean;
  };
}

interface RevokeApiKeyRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
    businessId?: string;
  };
  validatedBody?: RevokeOptions;
}

/**
 * ApiKeyDataController maps HTTP requests to the API key data service.
 */
export class ApiKeyDataController extends ApiKeyBaseController {
  /**
   * Create a new API key for a business.
   * POST /api/api-keys
   */
  async createApiKey(req: CreateApiKeyRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_CREATE');

      const businessId = this.requireBusinessId(req);
      
      const options: CreateApiKeyOptions = {
        name: req.validatedBody?.name ?? (req.body as any)?.name,
        permissions: req.validatedBody?.permissions ?? (req.body as any)?.permissions,
        expiresAt: req.validatedBody?.expiresAt 
          ? (req.validatedBody.expiresAt instanceof Date 
              ? req.validatedBody.expiresAt 
              : this.parseDate(req.validatedBody.expiresAt))
          : this.parseDate((req.body as any)?.expiresAt),
        rateLimits: req.validatedBody?.rateLimits ?? (req.body as any)?.rateLimits,
        allowedOrigins: req.validatedBody?.allowedOrigins ?? (req.body as any)?.allowedOrigins,
        description: req.validatedBody?.description ?? (req.body as any)?.description,
        planLevel: req.validatedBody?.planLevel ?? (req.body as any)?.planLevel,
        createdBy: req.userId
      };

      const result = await this.apiKeyDataService.createApiKey(businessId, options);

      this.logAction(req, 'API_KEY_CREATE_SUCCESS', {
        businessId,
        keyId: result.keyId,
        name: result.name
      });

      return result;
    }, res, 'API key created successfully', this.getRequestMeta(req));
  }

  /**
   * List all API keys for a business.
   * GET /api/api-keys
   */
  async listApiKeys(req: ApiKeyBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_LIST');

      const businessId = this.requireBusinessId(req);
      const keys = await this.apiKeyDataService.listApiKeys(businessId);

      this.logAction(req, 'API_KEY_LIST_SUCCESS', {
        businessId,
        count: keys.length
      });

      return {
        keys,
        total: keys.length
      };
    }, res, 'API keys retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get a specific API key by ID.
   * GET /api/api-keys/:keyId
   */
  async getApiKey(req: GetApiKeyRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET');

      const businessId = this.requireBusinessId(req);
      const keyId = this.requireKeyId(req);

      const apiKey = await this.apiKeyDataService.getApiKey(keyId, businessId);

      if (!apiKey) {
        throw { statusCode: 404, message: 'API key not found' };
      }

      this.logAction(req, 'API_KEY_GET_SUCCESS', {
        businessId,
        keyId
      });

      return apiKey;
    }, res, 'API key retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get basic API key information.
   * GET /api/api-keys/:keyId/info
   */
  async getApiKeyInfo(req: GetApiKeyRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET_INFO');

      const businessId = this.requireBusinessId(req);
      const keyId = this.requireKeyId(req);

      const info = await this.apiKeyDataService.getApiKeyInfo(keyId, businessId);

      this.logAction(req, 'API_KEY_GET_INFO_SUCCESS', {
        businessId,
        keyId
      });

      return info;
    }, res, 'API key information retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Update an API key.
   * PATCH /api/api-keys/:keyId
   */
  async updateApiKey(req: UpdateApiKeyRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_UPDATE');

      const businessId = this.requireBusinessId(req);
      const keyId = this.requireKeyId(req);

      const updates: any = {};
      if (req.validatedBody?.name !== undefined || (req.body as any)?.name !== undefined) {
        updates.name = req.validatedBody?.name ?? (req.body as any)?.name;
      }
      if (req.validatedBody?.permissions !== undefined || (req.body as any)?.permissions !== undefined) {
        updates.permissions = req.validatedBody?.permissions ?? (req.body as any)?.permissions;
      }
      if (req.validatedBody?.expiresAt !== undefined || (req.body as any)?.expiresAt !== undefined) {
        const expiresAt = req.validatedBody?.expiresAt ?? (req.body as any)?.expiresAt;
        updates.expiresAt = expiresAt instanceof Date 
          ? expiresAt 
          : this.parseDate(expiresAt);
      }
      if (req.validatedBody?.rateLimits !== undefined || (req.body as any)?.rateLimits !== undefined) {
        updates.rateLimits = req.validatedBody?.rateLimits ?? (req.body as any)?.rateLimits;
      }
      if (req.validatedBody?.allowedOrigins !== undefined || (req.body as any)?.allowedOrigins !== undefined) {
        updates.allowedOrigins = req.validatedBody?.allowedOrigins ?? (req.body as any)?.allowedOrigins;
      }
      if (req.validatedBody?.description !== undefined || (req.body as any)?.description !== undefined) {
        updates.description = req.validatedBody?.description ?? (req.body as any)?.description;
      }
      if (req.validatedBody?.isActive !== undefined || (req.body as any)?.isActive !== undefined) {
        updates.isActive = req.validatedBody?.isActive ?? this.parseBoolean((req.body as any)?.isActive);
      }

      const updated = await this.apiKeyDataService.updateApiKey(keyId, businessId, updates);

      this.logAction(req, 'API_KEY_UPDATE_SUCCESS', {
        businessId,
        keyId
      });

      return updated;
    }, res, 'API key updated successfully', this.getRequestMeta(req));
  }

  /**
   * Revoke an API key.
   * POST /api/api-keys/:keyId/revoke
   */
  async revokeApiKey(req: RevokeApiKeyRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_REVOKE');

      const businessId = this.requireBusinessId(req);
      const keyId = this.requireKeyId(req);

      const options: RevokeOptions = {
        revokedBy: req.userId,
        reason: req.validatedBody?.reason ?? (req.body as any)?.reason
      };

      const revoked = await this.apiKeyDataService.revokeApiKey(keyId, businessId, options);

      this.logAction(req, 'API_KEY_REVOKE_SUCCESS', {
        businessId,
        keyId
      });

      return revoked;
    }, res, 'API key revoked successfully', this.getRequestMeta(req));
  }

  /**
   * Revoke all API keys for a business.
   * POST /api/api-keys/revoke-all
   */
  async revokeAllApiKeys(req: ApiKeyBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_REVOKE_ALL');

      const businessId = this.requireBusinessId(req);
      const result = await this.apiKeyDataService.revokeAllApiKeys(businessId);

      this.logAction(req, 'API_KEY_REVOKE_ALL_SUCCESS', {
        businessId,
        revokedCount: result.revokedCount
      });

      return result;
    }, res, 'All API keys revoked successfully', this.getRequestMeta(req));
  }

  /**
   * Get the count of active API keys for a business.
   * GET /api/api-keys/count
   */
  async getKeyCount(req: ApiKeyBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET_COUNT');

      const businessId = this.requireBusinessId(req);
      const count = await this.apiKeyDataService.getKeyCount(businessId);

      this.logAction(req, 'API_KEY_GET_COUNT_SUCCESS', {
        businessId,
        count
      });

      return {
        businessId,
        count
      };
    }, res, 'API key count retrieved successfully', this.getRequestMeta(req));
  }
}

export const apiKeyDataController = new ApiKeyDataController();

