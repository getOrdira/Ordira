// @ts-nocheck
// src/controllers/apiKey.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { ApiKeyService } from '../services/business/apiKey.service';
import { BillingService } from '../services/external/billing.service';

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




// Initialize services
const apiKeyService = new ApiKeyService();
const billingService = new BillingService();

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

    // Check plan-based API key limits
    const currentKeys = await apiKeyService.getKeyCount(businessId);
    const planLimits = getApiKeyLimits(userPlan);

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
    const allowedPermissions: string[] = getPlanPermissions(userPlan);
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
    console.log(`API Key created: ${result.keyId} for business: ${businessId}`);

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
    console.error('API key creation error:', error);
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
    console.error('Get API key details error:', error);
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
    const testResults = {
      keyId: apiKey.keyId,
      testTimestamp: new Date().toISOString(),
      tests: {
        keyExists: {
          status: 'passed',
          message: 'API key found and accessible'
        },
        isActive: {
          status: apiKey.isActive ? 'passed' : 'failed',
          message: apiKey.isActive ? 'API key is active' : 'API key is inactive'
        },
        notExpired: {
          status: !apiKey.expiresAt || apiKey.expiresAt > new Date() ? 'passed' : 'failed',
          message: !apiKey.expiresAt ? 'API key does not expire' : 
                   apiKey.expiresAt > new Date() ? 'API key is not expired' : 'API key has expired'
        },
        notRevoked: {
          status: !apiKey.revoked ? 'passed' : 'failed',
          message: !apiKey.revoked ? 'API key is not revoked' : 'API key has been revoked'
        },
        hasPermissions: {
          status: apiKey.permissions && apiKey.permissions.length > 0 ? 'passed' : 'warning',
          message: apiKey.permissions && apiKey.permissions.length > 0 ? 
                   `API key has ${apiKey.permissions.length} permission(s)` : 'API key has no permissions'
        }
      }
    };

    // Calculate overall test result
    const failedTests = Object.values(testResults.tests).filter(test => test.status === 'failed').length;
    const warningTests = Object.values(testResults.tests).filter(test => test.status === 'warning').length;

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
    console.error('API key test error:', error);
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

    const results = {
      action,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      results: [] as any[]
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
    console.error('Bulk API key operation error:', error);
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

    // Build audit log query
    const auditQuery: any = { business: businessId };
    
    if (keyId) auditQuery.keyId = keyId;
    if (action) auditQuery.action = action;
    if (startDate || endDate) {
      auditQuery.timestamp = {};
      if (startDate) auditQuery.timestamp.$gte = new Date(startDate as string);
      if (endDate) auditQuery.timestamp.$lte = new Date(endDate as string);
    }

    // Get audit log entries (you'd need to implement audit logging in your service)
    const auditEntries = await this.getAuditEntries(auditQuery, {
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
    console.error('API key audit log error:', error);
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

    // Get API keys to export
    const keysToExport = keyIds && keyIds.length > 0 ? 
                        keyIds : 
                        (await apiKeyService.listApiKeys(businessId)).map((k: any) => k.keyId);

    const exportData = {
      exportedAt: new Date().toISOString(),
      businessId,
      totalKeys: keysToExport.length,
      format,
      keys: [] as any[]
    };

    // Collect data for each key
    for (const keyId of keysToExport) {
      try {
        const apiKey = await apiKeyService.getApiKey(keyId, businessId);
        if (!apiKey) continue;

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
          const usage = await apiKeyService.getKeyUsageStats(keyId, 'all');
          keyData.usageStats = usage;
        }

        // Include audit log if requested
        if (includeAuditLog) {
          const auditEntries = await this.getAuditEntries({ 
            business: businessId, 
            keyId 
          }, { limit: 100 });
          keyData.auditLog = auditEntries.entries;
        }

        exportData.keys.push(keyData);
      } catch (error) {
        console.error(`Error exporting key ${keyId}:`, error);
      }
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csvContent = this.formatAsCSV(exportData.keys);
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
    console.error('API key export error:', error);
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

    // Get all API keys with usage statistics
    const keys = await apiKeyService.listApiKeysWithUsage(businessId);
    const planLimits = getApiKeyLimits(userPlan);

    // Add enhanced metadata
    const enhancedKeys = await Promise.all(
      keys.map(async (apiKey) => {
        // Use type assertion to access properties safely
        const keyData = apiKey as any;
        const keyIdentifier = keyData.keyId || keyData.key || keyData._id?.toString();
        
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
        allowedPermissions: getPlanPermissions(userPlan),
        rateLimits: planLimits.defaultRateLimits,
        upgradeAvailable: userPlan === 'foundation'
      }
    });
  } catch (error) {
    console.error('API key listing error:', error);
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
      const allowedPermissions = getPlanPermissions(userPlan);
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
    console.log(`API Key updated: ${keyId} by business: ${businessId}`);

    res.json({
      key: updatedKey,
      message: 'API key updated successfully'
    });
  } catch (error) {
    console.error('API key update error:', error);
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
    console.log(`API Key revoked: ${keyId} by business: ${businessId}`);

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
    console.error('API key revocation error:', error);
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
    console.error('API key usage error:', error);
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
    console.log(`API Key rotated: ${keyId} by business: ${businessId}`);

    res.json({
      keyId: rotatedKey.keyId,
      newKey: rotatedKey.key, // Only returned once
      rotatedAt: rotatedKey.rotatedAt,
      message: 'API key rotated successfully. Please update your applications with the new key.',
      warning: 'The old key will be deactivated in 24 hours to allow for graceful migration.'
    });
  } catch (error) {
    console.error('API key rotation error:', error);
    next(error);
  }
}

// Helper functions
function getApiKeyLimits(plan: string) {
  switch (plan) {
    case 'foundation':
      return {
        maxKeys: 2,
        defaultRateLimits: {
          requestsPerMinute: 100,
          requestsPerDay: 1000
        }
      };
    case 'growth':
      return {
        maxKeys: 5,
        defaultRateLimits: {
          requestsPerMinute: 300,
          requestsPerDay: 5000
        }
      };
    case 'premium':
      return {
        maxKeys: 15,
        defaultRateLimits: {
          requestsPerMinute: 1000,
          requestsPerDay: 25000
        }
      };
    case 'enterprise':
      return {
        maxKeys: 50,
        defaultRateLimits: {
          requestsPerMinute: 5000,
          requestsPerDay: 100000
        }
      };
    default:
      return {
        maxKeys: 1,
        defaultRateLimits: {
          requestsPerMinute: 50,
          requestsPerDay: 500
        }
      };
  }
}

function getPlanPermissions(plan: string): string[] {
  const basePermissions = ['read'];
  
  switch (plan) {
    case 'foundation':
      return [...basePermissions];
    case 'growth':
      return [...basePermissions, 'write', 'analytics'];
    case 'premium':
      return [...basePermissions, 'write', 'analytics', 'admin', 'integrations'];
    case 'enterprise':
      return [...basePermissions, 'write', 'analytics', 'admin', 'integrations', 'webhooks', 'export'];
    default:
      return basePermissions;
  }
}
