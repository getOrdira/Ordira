// src/controllers/apiKey.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { getServices } from '../services/container.service';
import { isApiKeyObject, safeString } from '../utils/typeGuards';

// Enhanced request interfaces
interface ApiKeyRequest extends Request, UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  params: {
    keyId?: string;
  };
  body: {
    name?: string;
    permissions?: string[];
    expiresAt?: Date;
    rateLimits?: {
      requestsPerMinute: number;
      requestsPerDay: number;
    };
    allowedOrigins?: string[];
    description?: string;
  };
}

// Services are now injected via container

/**
 * POST /api/brand/api-keys
 * Create a new API key for the authenticated brand with enhanced configuration
 */
export async function createKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Check plan-based API key limits
    const currentKeys = await apiKeyService.getKeyCount(businessId);
    const planLimits = apiKeyService.getApiKeyLimits(userPlan);

    if (currentKeys >= planLimits.maxKeys) {
      res.status(403).json({
        error: 'API key limit reached for your plan',
        currentKeys,
        maxKeys: planLimits.maxKeys,
        plan: userPlan,
        code: 'API_KEY_LIMIT_REACHED'
      });
      return;
    }

    // Validate and process request data with explicit typing
    const {
      name = 'Default API Key',
      permissions = ['read'] as string[], // ← Add explicit type
      expiresAt,
      rateLimits,
      allowedOrigins,
      description
    } = req.validatedBody || req.body;

    // Validate permissions against plan with explicit typing
    const allowedPermissions: string[] = apiKeyService.getPlanPermissions(userPlan);
    const invalidPermissions: string[] = permissions.filter((p: string) => !allowedPermissions.includes(p));

    if (invalidPermissions.length > 0) {
      res.status(400).json({
        error: 'Invalid permissions for your plan',
        invalidPermissions,
        allowedPermissions,
        code: 'INVALID_PERMISSIONS'
      });
      return;
    }

    // Set plan-based rate limits if not provided
    const finalRateLimits = rateLimits || planLimits.defaultRateLimits;

    // Create API key with enhanced options
    const result = await apiKeyService.createApiKey(businessId, {
      name,
      permissions,
      expiresAt,
      rateLimits: finalRateLimits,
      allowedOrigins,
      description,
      planLevel: userPlan,
      createdBy: businessId
    });

    // Track API key creation for analytics
    trackManufacturerAction('create_api_key');

    // Log API key creation for security audit
    logger.info('API Key created: ${result.keyId} for business: ${businessId}');

    // Return success response with usage information
    res.status(201).json({
      ...result,
      usage: {
        currentKeys: currentKeys + 1,
        maxKeys: planLimits.maxKeys,
        remainingKeys: planLimits.maxKeys - currentKeys - 1
      },
      planInfo: {
        currentPlan: userPlan,
        permissions: allowedPermissions,
        rateLimits: finalRateLimits
      }
    });
  } catch (error) {
    logger.error('API key creation error:', error);
    next(error);
  }
}

/**
 * GET /api/brand/api-keys/:keyId
 * Get detailed information about a specific API key
 */
export async function getKeyDetails(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { keyId } = req.params;

    if (!keyId) {
      res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      });
      return;
    }

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Get API key details
    const apiKey = await apiKeyService.getApiKey(keyId, businessId);
    if (!apiKey) {
      res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
      return;
    }

    // Get usage statistics
    const usage = await apiKeyService.getKeyUsageStats(keyId, '30d');

    // Prepare response with security information
    const response = {
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
      usage: {
        totalRequests: usage.totalRequests,
        last30Days: usage.totalRequests,
        lastUsed: usage.lastUsed,
        topEndpoints: usage.topEndpoints?.slice(0, 5) || []
      },
      security: {
        isExpired: apiKey.expiresAt ? apiKey.expiresAt < new Date() : false,
        daysUntilExpiry: apiKey.expiresAt ? 
          Math.ceil((apiKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        rateLimitHits: usage.rateLimitHits || 0,
        lastRotated: apiKey.rotatedAt
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Get API key details error:', error);
    next(error);
  }
}

/**
 * POST /api/brand/api-keys/:keyId/test
 * Test API key functionality
 */
export async function testKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { keyId } = req.params;

    if (!keyId) {
      res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      });
      return;
    }

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Verify key exists and belongs to business
    const apiKey = await apiKeyService.getApiKey(keyId, businessId);
    if (!apiKey) {
      res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
      return;
    }

    // Perform basic tests
    const testResults = apiKeyService.performApiKeyTests(apiKey);

    // Calculate overall test result
    const failedTests = Object.values(testResults.tests).filter((test: any) => test.status === 'failed').length;
    const warningTests = Object.values(testResults.tests).filter((test: any) => test.status === 'warning').length;

    const overallStatus = failedTests > 0 ? 'failed' : warningTests > 0 ? 'warning' : 'passed';

    res.json({
      ...testResults,
      overall: {
        status: overallStatus,
        message: failedTests > 0 ? 
                 `${failedTests} test(s) failed` : 
                 warningTests > 0 ? 
                 `${warningTests} warning(s) found` : 
                 'All tests passed'
      }
    });
  } catch (error) {
    logger.error('API key test error:', error);
    next(error);
  }
}

/**
 * POST /api/brand/api-keys/bulk
 * Perform bulk operations on multiple API keys
 */
export async function bulkUpdateKeys(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { action, keyIds, reason } = req.validatedBody || req.body;

    if (!action || !keyIds || !Array.isArray(keyIds) || keyIds.length === 0) {
      res.status(400).json({
        error: 'Action and keyIds array are required',
        code: 'MISSING_BULK_DATA'
      });
      return;
    }

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    const results: {
      action: string;
      processed: number;
      successful: number;
      failed: number;
      errors: Array<{ keyId: string; error: string }>;
      results: any[];
    } = {
      action,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      results: []
    };

    // Process each key
    for (const keyId of keyIds) {
      results.processed++;
      
      try {
        let result;
        
        switch (action) {
          case 'revoke':
            result = await apiKeyService.revokeApiKey(keyId, businessId, {
              revokedBy: businessId,
              reason: reason || 'Bulk revocation'
            });
            break;
          
          case 'activate':
            result = await apiKeyService.updateApiKey(keyId, businessId, {
              isActive: true,
              updatedBy: businessId
            });
            break;
          
          case 'deactivate':
            result = await apiKeyService.updateApiKey(keyId, businessId, {
              isActive: false,
              updatedBy: businessId
            });
            break;
          
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        results.successful++;
        results.results.push({
          keyId,
          status: 'success',
          result: {
            keyId: result.keyId,
            name: result.name,
            action: action
          }
        });

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          keyId,
          error: error.message || 'Unknown error'
        });
        results.results.push({
          keyId,
          status: 'failed',
          error: error.message || 'Unknown error'
        });
      }
    }

    // Track bulk operation
    trackManufacturerAction('bulk_api_key_operation');

    res.json({
      ...results,
      summary: {
        total: results.processed,
        successful: results.successful,
        failed: results.failed,
        successRate: results.processed > 0 ? 
                     Math.round((results.successful / results.processed) * 100) : 0
      }
    });
  } catch (error) {
    logger.error('Bulk API key operation error:', error);
    next(error);
  }
}

/**
 * GET /api/brand/api-keys/audit
 * Get API key security audit log
 */
export async function getAuditLog(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const {
      keyId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Build audit log query
    const auditQuery: any = { business: businessId };
    
    if (keyId) auditQuery.keyId = keyId;
    if (action) auditQuery.action = action;
    if (startDate || endDate) {
      auditQuery.timestamp = {};
      if (startDate) auditQuery.timestamp.$gte = new Date(startDate as string);
      if (endDate) auditQuery.timestamp.$lte = new Date(endDate as string);
    }

    // Get audit log entries
    const auditEntries = await apiKeyService.getApiKeyAuditLog(businessId, auditQuery, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      auditLog: auditEntries.entries,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: auditEntries.total,
        pages: Math.ceil(auditEntries.total / parseInt(limit as string))
      },
      filters: {
        keyId: keyId || null,
        action: action || null,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    logger.error('API key audit log error:', error);
    next(error);
  }
}

/**
 * POST /api/brand/api-keys/export
 * Export API key data and configurations
 */
export async function exportKeys(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const {
      format = 'json',
      includeUsageStats = false,
      includeAuditLog = false,
      keyIds
    } = req.validatedBody || req.body;

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Get API keys to export
    const keysToExport = keyIds && keyIds.length > 0 ? 
                        keyIds : 
                        (await apiKeyService.listApiKeys(businessId)).map((k: any) => k.keyId);

    const exportData: {
      exportedAt: string;
      businessId: string;
      totalKeys: number;
      format: string;
      keys: any[];
    } = {
      exportedAt: new Date().toISOString(),
      businessId,
      totalKeys: keysToExport.length,
      format,
      keys: []
    };

    // Collect data for each key
    for (const keyId of keysToExport) {
      try {
        const apiKey = await apiKeyService.getApiKey(keyId, businessId);
        if (!apiKey) continue;

        const keyData = apiKeyService.formatApiKeyForExport(apiKey);

        // Include usage stats if requested
        if (includeUsageStats) {
          const usage = await apiKeyService.getKeyUsageStats(keyId, 'all');
          keyData.usageStats = usage;
        }

        // Include audit log if requested
        if (includeAuditLog) {
          // TODO: Implement audit log retrieval in ApiKeyService
          keyData.auditLog = [];
        }

        exportData.keys.push(keyData);
      } catch (error) {
        logger.error('Error exporting key ${keyId}:', error);
      }
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csvContent = apiKeyService.generateCSV(exportData.keys);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="api-keys-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="api-keys-${Date.now()}.json"`);
      res.json(exportData);
    }

    // Track export operation
    trackManufacturerAction('export_api_keys');
  } catch (error) {
    logger.error('API key export error:', error);
    next(error);
  }
}

/**
 * GET /api/brand/api-keys
 * List all API keys for the authenticated brand with usage statistics
 */
export async function listKeys(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Get all API keys with usage statistics
    const keys = await apiKeyService.listApiKeysWithUsage(businessId);
    const planLimits = apiKeyService.getApiKeyLimits(userPlan);

    // Add enhanced metadata
    const enhancedKeys = await Promise.all(
      keys.map(async (apiKey) => {
        // Use type guard to access properties safely
        const keyData = isApiKeyObject(apiKey) ? apiKey : {
          keyId: '',
          _id: null
        };
        const keyIdentifier = keyData.keyId || (keyData._id ? keyData._id.toString() : '');
        
        const usage = await apiKeyService.getKeyUsageStats(keyIdentifier, '30d');
        
        return {
          ...apiKey,
          keyId: keyIdentifier, // Ensure keyId is always present
          usage: {
            last30Days: usage.totalRequests,
            averageDaily: Math.round(usage.totalRequests / 30),
            lastUsed: usage.lastUsed,
            topEndpoints: usage.topEndpoints?.slice(0, 5) || []
          },
          security: {
            isActive: !apiKey.revoked && (!apiKey.expiresAt || apiKey.expiresAt > new Date()),
            daysUntilExpiry: apiKey.expiresAt ? 
              Math.ceil((apiKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
            rateLimitStatus: usage.rateLimitHits > 0 ? 'warning' : 'normal'
          }
        };
      })
    );

    // Calculate overall usage statistics
    const totalUsage = enhancedKeys.reduce((sum, key) => 
      sum + (key.usage.last30Days || 0), 0
    );

    res.json({
      keys: enhancedKeys,
      summary: {
        totalKeys: keys.length,
        activeKeys: enhancedKeys.filter(k => k.security.isActive).length,
        maxKeys: planLimits.maxKeys,
        remainingKeys: planLimits.maxKeys - keys.length,
        totalUsage30Days: totalUsage,
        planLevel: userPlan
      },
      planInfo: {
        currentPlan: userPlan,
        allowedPermissions: apiKeyService.getPlanPermissions(userPlan),
        rateLimits: planLimits.defaultRateLimits,
        upgradeAvailable: userPlan === 'foundation'
      }
    });
  } catch (error) {
    logger.error('API key listing error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand/api-keys/:keyId
 * Update an existing API key configuration
 */
export async function updateKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { keyId } = req.params;
    const userPlan = req.tenant?.plan || 'foundation';

    if (!keyId) {
       res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      })
      return;
    }

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Verify key ownership
    const existingKey = await apiKeyService.getApiKey(keyId, businessId);
    if (!existingKey) {
       res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      })
      return;
    }

    const {
      name,
      permissions,
      expiresAt,
      rateLimits,
      allowedOrigins,
      description,
      isActive
    } = req.validatedBody || req.body;

    // Validate permissions if being updated
    if (permissions) {
      const allowedPermissions = apiKeyService.getPlanPermissions(userPlan);
     const invalidPermissions = permissions.filter((p: string) => !allowedPermissions.includes(p)); 
      
      if (invalidPermissions.length > 0) {
         res.status(400).json({
          error: 'Invalid permissions for your plan',
          invalidPermissions,
          allowedPermissions,
          code: 'INVALID_PERMISSIONS'
        })
        return;
      }
    }

    // Update API key
    const updatedKey = await apiKeyService.updateApiKey(keyId, businessId, {
      name,
      permissions,
      expiresAt,
      rateLimits,
      allowedOrigins,
      description,
      isActive,
      updatedBy: businessId
    });

    // Track API key update
    trackManufacturerAction('update_api_key');

    // Log API key update for security audit
    logger.info('API Key updated: ${keyId} by business: ${businessId}');

    res.json({
      key: updatedKey,
      message: 'API key updated successfully'
    });
  } catch (error) {
    logger.error('API key update error:', error);
    next(error);
  }
}

/**
 * DELETE /api/brand/api-keys/:keyId
 * Revoke a specific API key by ID for the authenticated brand
 */
export async function revokeKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { keyId } = req.params;

    if (!keyId) {
       res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      })
      return;
    }

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Verify key ownership and get usage stats before revoking
    const keyInfo = await apiKeyService.getApiKey(keyId, businessId);
    if (!keyInfo) {
       res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      })
      return;
    }

    // Get final usage statistics
    const finalUsage = await apiKeyService.getKeyUsageStats(keyId, 'all');

    // Revoke the API key
    const revokedKey = await apiKeyService.revokeApiKey(keyId, businessId, {
      revokedBy: businessId,
      reason: 'Manual revocation via API'
    });

    // Track API key revocation
    trackManufacturerAction('revoke_api_key');

    // Log API key revocation for security audit
    logger.info('API Key revoked: ${keyId} by business: ${businessId}');

    res.json({
      key: {
        keyId: revokedKey.keyId,
        name: revokedKey.name,
        revoked: true,
        revokedAt: revokedKey.revokedAt
      },
      finalUsage: {
        totalRequests: finalUsage.totalRequests,
        lastUsed: finalUsage.lastUsed,
        activeFrom: keyInfo.createdAt,
        activeDuration: revokedKey.revokedAt ? 
          Math.ceil((revokedKey.revokedAt.getTime() - keyInfo.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0
      },
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error('API key revocation error:', error);
    next(error);
  }
}

/**
 * GET /api/brand/api-keys/:keyId/usage
 * Get detailed usage statistics for a specific API key
 */
export async function getKeyUsage(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { keyId } = req.params;
    const { timeframe = '30d', groupBy = 'day' } = req.query;

    if (!keyId) {
       res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      })
      return;
    }

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Verify key ownership
    const keyExists = await apiKeyService.getApiKey(keyId, businessId);
    if (!keyExists) {
       res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      })
      return;
    }

    // Get detailed usage statistics
    const usage = await apiKeyService.getDetailedUsageStats(keyId, {
      timeframe: timeframe as string,
      groupBy: groupBy as string,
      includeEndpoints: true,
      includeErrors: true,
      includeGeolocation: true
    });

    res.json({
      keyId,
      timeframe,
      groupBy,
      ...usage,
      metadata: {
        generatedAt: new Date().toISOString(),
        businessId
      }
    });
  } catch (error) {
    logger.error('API key usage error:', error);
    next(error);
  }
}

/**
 * POST /api/brand/api-keys/:keyId/rotate
 * Rotate an API key (generate new secret while keeping same permissions)
 */
export async function rotateKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { keyId } = req.params;

    if (!keyId) {
       res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      })
      return;
    }

    // Get service instance
    const { apiKey: apiKeyService } = getServices();

    // Verify key ownership
    const existingKey = await apiKeyService.getApiKey(keyId, businessId);
    if (!existingKey) {
       res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      })
      return;
    }

    // Rotate the API key
    const rotatedKey = await apiKeyService.rotateApiKey(keyId, businessId, {
      rotatedBy: businessId,
      reason: 'Manual rotation via API'
    });

    // Track API key rotation
    trackManufacturerAction('rotate_api_key');

    // Log API key rotation for security audit
    logger.info('API Key rotated: ${keyId} by business: ${businessId}');

    res.json({
      keyId: rotatedKey.keyId,
      newKey: rotatedKey.key, // Only returned once
      rotatedAt: rotatedKey.rotatedAt,
      message: 'API key rotated successfully. Please update your applications with the new key.',
      warning: 'The old key will be deactivated in 24 hours to allow for graceful migration.'
    });
  } catch (error) {
    logger.error('API key rotation error:', error);
    next(error);
  }
}

