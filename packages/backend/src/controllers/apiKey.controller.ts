// src/controllers/apiKey.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { ApiKeyService } from '../services/business/apiKey.service';
import { BillingService } from '../services/external/billing.service';

// Enhanced request interfaces
interface ApiKeyRequest extends AuthRequest, TenantRequest, ValidatedRequest {
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
      return res.status(403).json({
        error: 'API key limit reached for your plan',
        currentKeys,
        maxKeys: planLimits.maxKeys,
        plan: userPlan,
        code: 'API_KEY_LIMIT_REACHED'
      });
    }

    // Validate and process request data
    const {
      name = 'Default API Key',
      permissions = ['read'],
      expiresAt,
      rateLimits,
      allowedOrigins,
      description
    } = req.validatedBody || req.body;

    // Validate permissions against plan
    const allowedPermissions = getPlanPermissions(userPlan);
    const invalidPermissions = permissions.filter(p => !allowedPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        error: 'Invalid permissions for your plan',
        invalidPermissions,
        allowedPermissions,
        code: 'INVALID_PERMISSIONS'
      });
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
      keys.map(async (key) => {
        const usage = await apiKeyService.getKeyUsageStats(key.keyId, '30d');
        
        return {
          ...key,
          usage: {
            last30Days: usage.totalRequests,
            averageDaily: Math.round(usage.totalRequests / 30),
            lastUsed: usage.lastUsed,
            topEndpoints: usage.topEndpoints?.slice(0, 5) || []
          },
          security: {
            isActive: !key.revoked && (!key.expiresAt || key.expiresAt > new Date()),
            daysUntilExpiry: key.expiresAt ? 
              Math.ceil((key.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
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
      return res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      });
    }

    // Verify key ownership
    const existingKey = await apiKeyService.getApiKey(keyId, businessId);
    if (!existingKey) {
      return res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
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
      const invalidPermissions = permissions.filter(p => !allowedPermissions.includes(p));
      
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          error: 'Invalid permissions for your plan',
          invalidPermissions,
          allowedPermissions,
          code: 'INVALID_PERMISSIONS'
        });
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
      return res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      });
    }

    // Verify key ownership and get usage stats before revoking
    const keyInfo = await apiKeyService.getApiKey(keyId, businessId);
    if (!keyInfo) {
      return res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
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
      return res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      });
    }

    // Verify key ownership
    const keyExists = await apiKeyService.getApiKey(keyId, businessId);
    if (!keyExists) {
      return res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
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
      return res.status(400).json({
        error: 'Key ID is required',
        code: 'MISSING_KEY_ID'
      });
    }

    // Verify key ownership
    const existingKey = await apiKeyService.getApiKey(keyId, businessId);
    if (!existingKey) {
      return res.status(404).json({
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
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
