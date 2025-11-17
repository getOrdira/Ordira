// src/controllers/features/apiKey/apiKeyManagement.controller.ts
// Controller exposing API key management operations

import { Response } from 'express';
import { ApiKeyBaseController, ApiKeyBaseRequest } from './apiKeyBase.controller';

interface GetApiKeyDetailsRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
    businessId?: string;
  };
}

interface TestApiKeyRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
    businessId?: string;
  };
}

interface RotateApiKeyRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
    businessId?: string;
  };
  validatedBody?: {
    rotatedBy?: string;
  };
}

interface BulkUpdateRequest extends ApiKeyBaseRequest {
  validatedBody?: {
    action: 'revoke' | 'activate' | 'deactivate';
    keyIds: string[];
    reason?: string;
    updatedBy?: string;
  };
}

interface GetSecurityRecommendationsRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
    businessId?: string;
  };
}

interface ExportApiKeysRequest extends ApiKeyBaseRequest {
  validatedQuery?: {
    keyIds?: string[];
    includeUsageStats?: boolean;
    includeAuditLog?: boolean;
    format?: 'json' | 'csv';
  };
}

interface GetAuditLogRequest extends ApiKeyBaseRequest {
  validatedQuery?: {
    keyId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  };
}

interface ListApiKeysWithUsageRequest extends ApiKeyBaseRequest {
  validatedQuery?: {
    page?: number;
    limit?: number;
  };
}

/**
 * ApiKeyManagementController maps HTTP requests to the API key management service.
 */
export class ApiKeyManagementController extends ApiKeyBaseController {
  /**
   * Get detailed API key information including security status.
   * GET /api/api-keys/:keyId/details
   */
  async getApiKeyDetails(req: GetApiKeyDetailsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET_DETAILS');

      const businessId = this.requireBusinessId(req);
      const keyId = this.requireKeyId(req);

      const details = await this.apiKeyManagementService.getApiKeyDetails(keyId, businessId);

      this.logAction(req, 'API_KEY_GET_DETAILS_SUCCESS', {
        businessId,
        keyId
      });

      return details;
    }, res, 'API key details retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * List API keys with usage information.
   * GET /api/api-keys/with-usage
   */
  async listApiKeysWithUsage(req: ListApiKeysWithUsageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_LIST_WITH_USAGE');

      const businessId = this.requireBusinessId(req);
      const keys = await this.apiKeyManagementService.listApiKeysWithUsage(businessId);

      this.logAction(req, 'API_KEY_LIST_WITH_USAGE_SUCCESS', {
        businessId,
        count: keys.length
      });

      return {
        keys,
        total: keys.length
      };
    }, res, 'API keys with usage retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Test API key functionality and security.
   * POST /api/api-keys/:keyId/test
   */
  async testApiKey(req: TestApiKeyRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_TEST');

      const businessId = this.requireBusinessId(req);
      const keyId = this.requireKeyId(req);

      const testResult = await this.apiKeyManagementService.testApiKey(keyId, businessId);

      this.logAction(req, 'API_KEY_TEST_SUCCESS', {
        businessId,
        keyId,
        overall: testResult.overall
      });

      return testResult;
    }, res, 'API key test completed successfully', this.getRequestMeta(req));
  }

  /**
   * Rotate an API key (generate new secret).
   * POST /api/api-keys/:keyId/rotate
   */
  async rotateApiKey(req: RotateApiKeyRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_ROTATE');

      const businessId = this.requireBusinessId(req);
      const keyId = this.requireKeyId(req);

      const options = {
        rotatedBy: req.userId
      };

      const result = await this.apiKeyManagementService.rotateApiKey(keyId, businessId, options);

      this.logAction(req, 'API_KEY_ROTATE_SUCCESS', {
        businessId,
        keyId
      });

      return result;
    }, res, 'API key rotated successfully', this.getRequestMeta(req));
  }

  /**
   * Perform bulk operations on multiple API keys.
   * POST /api/api-keys/bulk-update
   */
  async bulkUpdateApiKeys(req: BulkUpdateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_BULK_UPDATE');

      const businessId = this.requireBusinessId(req);
      const action = req.validatedBody?.action ?? (req.body as any)?.action;
      const keyIds = req.validatedBody?.keyIds ?? (req.body as any)?.keyIds ?? this.parseStringArray((req.body as any)?.keyIds);

      if (!action || !['revoke', 'activate', 'deactivate'].includes(action)) {
        throw { statusCode: 400, message: 'Invalid action. Must be revoke, activate, or deactivate' };
      }

      if (!keyIds || !Array.isArray(keyIds) || keyIds.length === 0) {
        throw { statusCode: 400, message: 'keyIds array is required and must not be empty' };
      }

      const options = {
        reason: req.validatedBody?.reason ?? (req.body as any)?.reason,
        updatedBy: req.userId
      };

      const result = await this.apiKeyManagementService.bulkUpdateApiKeys(
        businessId,
        action,
        keyIds,
        options
      );

      this.logAction(req, 'API_KEY_BULK_UPDATE_SUCCESS', {
        businessId,
        action,
        total: result.summary.total,
        success: result.summary.success,
        failed: result.summary.failed
      });

      return result;
    }, res, 'Bulk update completed successfully', this.getRequestMeta(req));
  }

  /**
   * Get API key security recommendations.
   * GET /api/api-keys/:keyId/security-recommendations
   */
  async getSecurityRecommendations(req: GetSecurityRecommendationsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET_SECURITY_RECOMMENDATIONS');

      const businessId = this.requireBusinessId(req);
      const keyId = this.requireKeyId(req);

      const recommendations = await this.apiKeyManagementService.getSecurityRecommendations(keyId, businessId);

      this.logAction(req, 'API_KEY_GET_SECURITY_RECOMMENDATIONS_SUCCESS', {
        businessId,
        keyId,
        count: recommendations.length
      });

      return {
        keyId,
        recommendations
      };
    }, res, 'Security recommendations retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get API key audit log.
   * GET /api/api-keys/audit-log
   */
  async getApiKeyAuditLog(req: GetAuditLogRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET_AUDIT_LOG');

      const businessId = this.requireBusinessId(req);
      const pagination = this.getPaginationParams(req, { defaultLimit: 20, maxLimit: 100 });

      const filters: any = {};
      if (req.validatedQuery?.keyId || (req.query as any)?.keyId) {
        filters.keyId = this.parseString(req.validatedQuery?.keyId ?? (req.query as any)?.keyId);
      }
      if (req.validatedQuery?.action || (req.query as any)?.action) {
        filters.action = this.parseString(req.validatedQuery?.action ?? (req.query as any)?.action);
      }
      if (req.validatedQuery?.startDate || (req.query as any)?.startDate) {
        filters.startDate = this.parseDate(req.validatedQuery?.startDate ?? (req.query as any)?.startDate);
      }
      if (req.validatedQuery?.endDate || (req.query as any)?.endDate) {
        filters.endDate = this.parseDate(req.validatedQuery?.endDate ?? (req.query as any)?.endDate);
      }

      const auditLog = await this.apiKeyManagementService.getApiKeyAuditLog(
        businessId,
        filters,
        { page: pagination.page, limit: pagination.limit }
      );

      this.logAction(req, 'API_KEY_GET_AUDIT_LOG_SUCCESS', {
        businessId,
        total: auditLog.total
      });

      return {
        ...auditLog,
        pagination: this.createPaginationMeta(pagination.page, pagination.limit, auditLog.total)
      };
    }, res, 'Audit log retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Export API keys in various formats.
   * GET /api/api-keys/export
   */
  async exportApiKeys(req: ExportApiKeysRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_EXPORT');

      const businessId = this.requireBusinessId(req);
      const keyIds = this.parseStringArray(
        req.validatedQuery?.keyIds ?? (req.query as any)?.keyIds
      );
      const includeUsageStats = this.parseBoolean(
        req.validatedQuery?.includeUsageStats ?? (req.query as any)?.includeUsageStats,
        false
      );
      const includeAuditLog = this.parseBoolean(
        req.validatedQuery?.includeAuditLog ?? (req.query as any)?.includeAuditLog,
        false
      );
      const format = (req.validatedQuery?.format ?? (req.query as any)?.format ?? 'json') as 'json' | 'csv';

      const result = await this.apiKeyManagementService.exportApiKeys(businessId, {
        keyIds,
        includeUsageStats,
        includeAuditLog,
        format
      });

      const keyCount = typeof result === 'string' ? 0 : result.totalKeys;

      this.logAction(req, 'API_KEY_EXPORT_SUCCESS', {
        businessId,
        format,
        keyCount
      });

      // If CSV format, set appropriate content type
      if (format === 'csv' && typeof result === 'string') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="api-keys-${businessId}-${new Date().toISOString()}.csv"`);
        return result;
      }

      return result;
    }, res, 'API keys exported successfully', this.getRequestMeta(req));
  }
}

export const apiKeyManagementController = new ApiKeyManagementController();

