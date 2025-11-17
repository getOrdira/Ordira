// src/services/apiKey/features/apiKeyManagement.service.ts
// Advanced management features for API keys

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { createAppError } from '../../../middleware/core/error.middleware';
import { ApiKey } from '../../../models/security/apiKey.model';
import { logger } from '../../../utils/logger';
import { apiKeyDataService } from '../core/apiKeyData.service';
import { apiKeyUsageService } from './apiKeyUsage.service';
import type {
  ApiKeyDetails,
  ApiKeyTestResult,
  BulkUpdateResult,
  AuditLogFilters,
  AuditLogResult,
  ExportApiKeysOptions,
  ExportResult,
  SecurityRecommendation
} from '../utils/types';
import {
  generateTestRecommendations,
  convertToCSV
} from '../utils/exportHelpers';

export class ApiKeyManagementService {
  constructor(
    private readonly dataService = apiKeyDataService,
    private readonly usageService = apiKeyUsageService
  ) {}

  async rotateApiKey(keyId: string, businessId: string, options: any) {
    try {
      // Generate new secret while keeping same keyId
      const secret = crypto.randomBytes(32).toString('hex');
      const toHash = `${keyId}.${secret}`;
      const hashed = await bcrypt.hash(toHash, 10);

      const doc = await ApiKey.findOneAndUpdate(
        { business: businessId, keyId, revoked: false },
        { 
          hashedSecret: hashed,
          rotatedAt: new Date(),
          rotatedBy: options.rotatedBy
        },
        { new: true }
      );

      if (!doc) {
        throw createAppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      return {
        keyId,
        key: `${keyId}.${secret}`, // Full key for one-time display
        rotatedAt: doc.rotatedAt
      };
    } catch (error: any) {
      logger.error('Rotate API key error:', error);
      if (error.code === 'API_KEY_NOT_FOUND') throw error;
      throw createAppError(`Failed to rotate API key: ${error.message}`, 500, 'ROTATE_API_KEY_FAILED');
    }
  }

  async getApiKeyDetails(keyId: string, businessId: string): Promise<ApiKeyDetails> {
    try {
      const apiKey = await ApiKey.findOne({ 
        business: businessId, 
        keyId, 
        revoked: false 
      }).lean();
      
      if (!apiKey) {
        throw createAppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      // Add computed security information
      return {
        ...apiKey,
        isExpired: apiKey.expiresAt ? apiKey.expiresAt < new Date() : false,
        isActiveAndValid: !apiKey.revoked && 
                         (apiKey.isActive !== false) && 
                         (!apiKey.expiresAt || apiKey.expiresAt > new Date()),
        daysUntilExpiry: apiKey.expiresAt ? 
          Math.ceil((apiKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
      };
    } catch (error: any) {
      logger.error('Get API key details error:', error);
      if (error.code === 'API_KEY_NOT_FOUND') throw error;
      throw createAppError(`Failed to get API key details: ${error.message}`, 500, 'GET_API_KEY_DETAILS_FAILED');
    }
  }

  async listApiKeysWithUsage(businessId: string) {
    try {
      return ApiKey.find({ business: businessId, revoked: false })
        .select('keyId name createdAt revoked expiresAt permissions rateLimits description')
        .lean();
    } catch (error: any) {
      logger.error('List API keys with usage error:', error);
      throw createAppError(`Failed to list API keys with usage: ${error.message}`, 500, 'LIST_API_KEYS_WITH_USAGE_FAILED');
    }
  }

  async testApiKey(keyId: string, businessId: string): Promise<ApiKeyTestResult> {
    try {
      const apiKey = await this.dataService.getApiKey(keyId, businessId);
      if (!apiKey) {
        throw createAppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      const tests = {
        existence: { passed: true, message: 'API key exists' },
        active: { 
          passed: apiKey.isActive !== false, 
          message: apiKey.isActive !== false ? 'API key is active' : 'API key is inactive' 
        },
        notRevoked: { 
          passed: !apiKey.revoked, 
          message: !apiKey.revoked ? 'API key is not revoked' : 'API key has been revoked' 
        },
        notExpired: {
          passed: !apiKey.expiresAt || apiKey.expiresAt > new Date(),
          message: !apiKey.expiresAt ? 'API key does not expire' : 
                   apiKey.expiresAt > new Date() ? 'API key is not expired' : 'API key has expired'
        },
        hasPermissions: {
          passed: apiKey.permissions && apiKey.permissions.length > 0,
          message: `API key has ${apiKey.permissions?.length || 0} permission(s)`
        }
      };

      const allPassed = Object.values(tests).every(test => test.passed);
      
      return {
        overall: allPassed ? 'passed' : 'failed',
        tests,
        recommendations: generateTestRecommendations(tests)
      };
    } catch (error: any) {
      logger.error('Test API key error:', error);
      if (error.code === 'API_KEY_NOT_FOUND') throw error;
      throw createAppError(`Failed to test API key: ${error.message}`, 500, 'TEST_API_KEY_FAILED');
    }
  }

  async bulkUpdateApiKeys(
    businessId: string, 
    action: 'revoke' | 'activate' | 'deactivate', 
    keyIds: string[], 
    options: { reason?: string; updatedBy?: string } = {}
  ): Promise<BulkUpdateResult> {
    try {
      const results: BulkUpdateResult = {
        successful: [],
        failed: [],
        summary: { total: keyIds.length, success: 0, failed: 0 }
      };

      for (const keyId of keyIds) {
        try {
          let result;
          
          switch (action) {
            case 'revoke':
              result = await this.dataService.revokeApiKey(keyId, businessId, {
                revokedBy: options.updatedBy,
                reason: options.reason || 'Bulk revocation'
              });
              break;
            
            case 'activate':
              result = await this.dataService.updateApiKey(keyId, businessId, {
                isActive: true,
                updatedBy: options.updatedBy
              });
              break;
            
            case 'deactivate':
              result = await this.dataService.updateApiKey(keyId, businessId, {
                isActive: false,
                updatedBy: options.updatedBy
              });
              break;
          }

          results.successful.push({ keyId, action: action, result });
          results.summary.success++;
          
        } catch (error: any) {
          results.failed.push({   
            keyId, 
            error: error.message || 'Unknown error' 
          });
          results.summary.failed++;
        }
      }

      return results;
    } catch (error: any) {
      logger.error('Bulk update API keys error:', error);
      throw createAppError(`Failed to bulk update API keys: ${error.message}`, 500, 'BULK_UPDATE_API_KEYS_FAILED');
    }
  }

  async getApiKeyAuditLog(
    businessId: string, 
    filters: AuditLogFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<AuditLogResult> {
    try {
      // This is a placeholder implementation
      // You would implement this based on your actual audit logging system
      
      const { page = 1, limit = 20 } = pagination;
      
      // Example query structure - adapt to your audit log model
      const query: any = { business: businessId };
      if (filters.keyId) query.keyId = filters.keyId;
      if (filters.action) query.action = filters.action;
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      // Return placeholder data structure
      return {
        entries: [], // Would contain actual audit log entries
        total: 0,
        page,
        limit,
        hasMore: false
      };
    } catch (error: any) {
      logger.error('Get API key audit log error:', error);
      throw createAppError(`Failed to get API key audit log: ${error.message}`, 500, 'GET_API_KEY_AUDIT_LOG_FAILED');
    }
  }

  async exportApiKeys(
    businessId: string, 
    options: ExportApiKeysOptions = {}
  ): Promise<ExportResult | string> {
    try {
      const { 
        keyIds, 
        includeUsageStats = false, 
        includeAuditLog = false,
        format = 'json' 
      } = options;

      // Get API keys to export
      const query: any = { business: businessId, revoked: false };
      if (keyIds && keyIds.length > 0) {
        query.keyId = { $in: keyIds };
      }

      const apiKeys = await ApiKey.find(query).lean();
      
      const exportData: ExportResult = {
        exportedAt: new Date().toISOString(),
        businessId,
        totalKeys: apiKeys.length,
        keys: []
      };

      for (const apiKey of apiKeys) {
        const keyData: any = {
          keyId: apiKey.keyId,
          name: apiKey.name,
          description: apiKey.description,
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt,
          rateLimits: apiKey.rateLimits,
          allowedOrigins: apiKey.allowedOrigins,
          planLevel: apiKey.planLevel,
          revoked: apiKey.revoked
        };

        // Include usage stats if requested
        if (includeUsageStats) {
          keyData.usageStats = await this.usageService.getKeyUsageStats(apiKey.keyId, 'all');   
        }

        // Include audit log if requested
        if (includeAuditLog) {
          keyData.auditLog = await this.getApiKeyAuditLog(businessId, { 
            keyId: apiKey.keyId 
          }, { limit: 100 });
        }

        exportData.keys.push(keyData);
      }

      if (format === 'csv') {
        return convertToCSV(exportData.keys);
      }

      return exportData;
    } catch (error: any) {
      logger.error('Export API keys error:', error);
      throw createAppError(`Failed to export API keys: ${error.message}`, 500, 'EXPORT_API_KEYS_FAILED');
    }
  }

  async getSecurityRecommendations(keyId: string, businessId: string): Promise<SecurityRecommendation[]> {
    try {
      const apiKey = await this.dataService.getApiKey(keyId, businessId);
      if (!apiKey) return [];

      const recommendations: SecurityRecommendation[] = [];

      // Check for security issues
      if (!apiKey.expiresAt) {
        recommendations.push({
          type: 'security',
          priority: 'medium',
          message: 'Consider setting an expiration date for this API key'
        });
      }

      if (apiKey.permissions?.includes('admin')) {
        recommendations.push({
          type: 'security', 
          priority: 'high',
          message: 'Admin permissions detected - ensure this level of access is necessary'
        });
      }

      if (!apiKey.allowedOrigins || apiKey.allowedOrigins.length === 0) {
        recommendations.push({
          type: 'security',
          priority: 'medium', 
          message: 'Consider restricting API key usage to specific origins'
        });
      }

      if (apiKey.rateLimits?.requestsPerMinute && apiKey.rateLimits.requestsPerMinute > 1000) {
        recommendations.push({
          type: 'performance',
          priority: 'low',
          message: 'High rate limits detected - monitor for potential abuse'
        });
      }

      return recommendations;
    } catch (error: any) {
      logger.error('Get security recommendations error:', error);
      return [];
    }
  }
}

export const apiKeyManagementService = new ApiKeyManagementService();

