// src/services/business/apiKey.service.ts
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import bcrypt from 'bcrypt';
import { ApiKey } from '../../models/security/apiKey.model';


type CreateApiKeyOptions = {
  name?: string;
  permissions?: string[];
  expiresAt?: Date;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedOrigins?: string[];
  description?: string;
  planLevel?: string;
  createdBy?: string;
};

type RevokeOptions = {
  revokedBy?: string;
  reason?: string;
};

export class ApiKeyService {
  
  async createApiKey(businessId: string, options?: CreateApiKeyOptions) {
    const keyId = crypto.randomBytes(8).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');
    const toHash = `${keyId}.${secret}`;
    const hashed = await bcrypt.hash(toHash, 10);

    const doc = await ApiKey.create({
      business: businessId,
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
  }

  async checkRateLimit(apiKeyId: string, hourlyLimit: number): Promise<{
  limit: number;
  remaining: number;
  resetTime: Date;
}> {
  // This is a simple in-memory implementation
  // In production, you'd use Redis or similar
  
  const now = new Date();
  const resetTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  
  // Simple implementation - in reality you'd track usage in Redis/database
  // For now, just return a basic response
  return {
    limit: hourlyLimit,
    remaining: hourlyLimit - 1, // Simplified - would track actual usage
    resetTime
  };
}



  async listApiKeys(businessId: string) {
  return ApiKey.find({ business: businessId, revoked: false })
    .select('keyId name createdAt revoked expiresAt')
    .lean();
}


  async revokeApiKey(keyId: string, businessId: string, options?: RevokeOptions) {
    const doc = await ApiKey.findOneAndUpdate(
      { business: businessId, keyId, revoked: false },
      { 
        revoked: true,
        revokedAt: new Date(),
        revokedBy: options?.revokedBy,
        reason: options?.reason
      },
      { new: true }
    );
    
    if (!doc) {
      throw { statusCode: 404, message: 'API key not found' };
    }
    return doc;
  }

    async verifyApiKey(provided: string) {
      // provided format: "keyId.secret"
     const [keyId, secret] = provided.split('.');
    if (!keyId || !secret) return null;

  const doc = await ApiKey.findOne({ keyId, revoked: false });
  if (!doc) return null;

  const ok = await bcrypt.compare(provided, doc.hashedSecret);
  return ok ? doc : null; // This line was incomplete in your file
  }

  async getApiKeyInfo(keyId: string, businessId: string) {
    const doc = await ApiKey.findOne({ 
      business: businessId, 
      keyId, 
      revoked: false 
    }).select('keyId createdAt revoked');
    
    if (!doc) {
      throw { statusCode: 404, message: 'API key not found' };
    }
    return doc;
  }

  async revokeAllApiKeys(businessId: string) {
    const result = await ApiKey.updateMany(
      { business: businessId, revoked: false },
      { revoked: true }
    );
    return { revokedCount: result.modifiedCount };
  }

   async getKeyCount(businessId: string): Promise<number> {
    const count = await ApiKey.countDocuments({ 
      business: businessId, 
      revoked: false 
    });
    return count;
  }

  async getApiKey(keyId: string, businessId: string) {
    const doc = await ApiKey.findOne({ 
      business: businessId, 
      keyId, 
      revoked: false 
    });
    
    if (!doc) {
      return null;
    }
    return doc;
  }

  async listApiKeysWithUsage(businessId: string) {
  return ApiKey.find({ business: businessId, revoked: false })
    .select('keyId name createdAt revoked expiresAt permissions rateLimits description')
    .lean();
}

  async getKeyUsageStats(keyId: string, timeframe: string) {
    // TODO: Implement usage statistics tracking
    // This would typically query a usage tracking collection
    return {
      totalRequests: 0,
      lastUsed: null,
      topEndpoints: [],
      rateLimitHits: 0
    };
  }

  async updateApiKey(keyId: string, businessId: string, updates: any) {
    const doc = await ApiKey.findOneAndUpdate(
      { business: businessId, keyId, revoked: false },
      { 
        ...updates,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!doc) {
      throw { statusCode: 404, message: 'API key not found' };
    }
    return doc;
  }

  /**
   * Get API key limits for a given plan
   */
  public getApiKeyLimits(plan: string) {
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

  /**
   * Get allowed permissions for a given plan
   */
  public getPlanPermissions(plan: string): string[] {
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

  /**
   * Generate CSV content for API key export
   */
  public generateCSV(keys: any[]): string {
    const headers = ['Key ID', 'Name', 'Created At', 'Status', 'Permissions', 'Rate Limits', 'Description'];
    const rows = keys.map(key => [
      key.keyId,
      key.name || '',
      key.createdAt ? new Date(key.createdAt).toISOString() : '',
      key.isActive ? 'Active' : 'Inactive',
      key.permissions ? key.permissions.join(', ') : '',
      key.rateLimits ? `${key.rateLimits.requestsPerMinute}/min, ${key.rateLimits.requestsPerDay}/day` : '',
      key.description || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Format API key data for export
   */
  public formatApiKeyForExport(apiKey: any): any {
    return {
      keyId: apiKey.keyId,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
      status: apiKey.isActive ? 'active' : 'inactive',
      permissions: apiKey.permissions || [],
      rateLimits: apiKey.rateLimits || {},
      description: apiKey.description,
      expiresAt: apiKey.expiresAt,
      lastUsed: apiKey.lastUsed,
      usage: apiKey.usage || {}
    };
  }

  /**
   * Perform API key tests
   */
  public performApiKeyTests(apiKey: any): any {
    return {
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
  }

  async rotateApiKey(keyId: string, businessId: string, options: any) {
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
      throw { statusCode: 404, message: 'API key not found' };
    }

    return {
      keyId,
      key: `${keyId}.${secret}`, // Full key for one-time display
      rotatedAt: doc.rotatedAt
    };
  }

  async getDetailedUsageStats(keyId: string, options: any) {
    // TODO: Implement detailed usage statistics
    // This would query usage logs and aggregate data
    return {
      totalRequests: 0,
      requestsByDay: [],
      topEndpoints: [],
      errorRate: 0,
      averageResponseTime: 0,
      lastUsed: null,
      geolocation: {}
    };
  }

  async logUsage(keyId: string, usageData: any) {
    // TODO: Implement usage logging
    // This would store usage data for analytics
    logger.info('API Key ${keyId} used:', usageData);
  }

  async hasPermission(keyId: string, permission: string): Promise<boolean> {
    const doc = await ApiKey.findOne({ keyId, revoked: false });
    if (!doc || !doc.permissions) return false;
    return doc.permissions.includes(permission);
  }

  async hasScope(keyId: string, scope: string): Promise<boolean> {
    const doc = await ApiKey.findOne({ keyId, revoked: false });
    if (!doc || !doc.scopes) return false;
    return doc.scopes.includes(scope);
  }

  /**
 * Get detailed API key information including security status
 */
async getApiKeyDetails(keyId: string, businessId: string) {
  const apiKey = await ApiKey.findOne({ 
    business: businessId, 
    keyId, 
    revoked: false 
  }).lean();
  
  if (!apiKey) {
    throw { statusCode: 404, message: 'API key not found' };
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
}

/**
 * Test API key functionality and security
 */
async testApiKey(keyId: string, businessId: string) {
  const apiKey = await this.getApiKey(keyId, businessId);
  if (!apiKey) {
    throw { statusCode: 404, message: 'API key not found' };
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
    recommendations: this.generateTestRecommendations(tests)
  };
}

/**
 * Perform bulk operations on multiple API keys
 */
async bulkUpdateApiKeys(
  businessId: string, 
  action: 'revoke' | 'activate' | 'deactivate', 
  keyIds: string[], 
  options: { reason?: string; updatedBy?: string } = {}
) {
  const results = {
    successful: [] as Array<{ keyId: string; action: string; result: any }>,
    failed: [] as Array<{ keyId: string; error: string }>,
    summary: { total: keyIds.length, success: 0, failed: 0 }
  };

  for (const keyId of keyIds) {
    try {
      let result;
      
      switch (action) {
        case 'revoke':
          result = await this.revokeApiKey(keyId, businessId, {
            revokedBy: options.updatedBy,
            reason: options.reason || 'Bulk revocation'
          });
          break;
        
        case 'activate':
          result = await this.updateApiKey(keyId, businessId, {
            isActive: true,
            updatedBy: options.updatedBy
          });
          break;
        
        case 'deactivate':
          result = await this.updateApiKey(keyId, businessId, {
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
}

/**
 * Get API key audit log (placeholder - implement based on your audit system)
 */
async getApiKeyAuditLog(
  businessId: string, 
  filters: {
    keyId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
  pagination: { page?: number; limit?: number } = {}
) {
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
}

/**
 * Export API key data in various formats
 */
async exportApiKeys(
  businessId: string, 
  options: {
    keyIds?: string[];
    includeUsageStats?: boolean;
    includeAuditLog?: boolean;
    format?: 'json' | 'csv';
  } = {}
) {
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
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    businessId,
    totalKeys: apiKeys.length,
    keys: [] as Array<{ keyId: string; name: string; description?: string; permissions: string[]; isActive: boolean; createdAt: Date; expiresAt?: Date; rateLimits: any; allowedOrigins?: string[]; planLevel: string; revoked: boolean }>
  };

  for (const apiKey of apiKeys) {
    const keyData: {
      keyId: string;
      name: string;
      description?: string;
      permissions: string[];
      isActive: boolean;
      createdAt: Date;
      expiresAt?: Date;
      rateLimits: any;
      allowedOrigins?: string[];
      planLevel: string;
      revoked: boolean;
      usageStats?: any;
      auditLog?: any;
    } = {
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
      keyData.usageStats  = await this.getKeyUsageStats(apiKey.keyId, 'all');   
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
    return this.convertToCSV(exportData.keys);
  }

  return exportData;
}

/**
 * Enhanced usage statistics with more detailed metrics
 */
async getEnhancedUsageStats(keyId: string, timeframe: string = '30d') {
  // This extends the existing getKeyUsageStats method
  const basicStats = await this.getKeyUsageStats(keyId, timeframe);
  
  // Add enhanced metrics
  return {
    ...basicStats,
    timeframe,
    metrics: {
      requestsPerDay: this.calculateDailyAverage(basicStats.totalRequests, timeframe),
      peakUsage: 'Not implemented', // Would calculate peak usage times
      errorRate: 'Not implemented', // Would calculate error percentage
      popularEndpoints: basicStats.topEndpoints || [],
      geolocation: 'Not implemented' // Would show usage by location
    },
    trends: {
      growing: false, // Would compare with previous period
      stable: true,
      declining: false
    }
  };
}

/**
 * Check if API key has specific permission
 */
async checkKeyPermission(keyId: string, permission: string): Promise<boolean> {
  const apiKey = await ApiKey.findOne({ keyId, revoked: false }).select('permissions');
  if (!apiKey || !apiKey.permissions) return false;
  
  // Check exact permission or wildcard permissions
  return apiKey.permissions.includes(permission) || 
         apiKey.permissions.includes('admin') || 
         apiKey.permissions.includes('*');
}

/**
 * Get API key security recommendations
 */
async getSecurityRecommendations(keyId: string, businessId: string) {
  const apiKey = await this.getApiKey(keyId, businessId);
  if (!apiKey) return [];

  const recommendations = [];

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

  if (apiKey.rateLimits?.requestsPerMinute > 1000) {
    recommendations.push({
      type: 'performance',
      priority: 'low',
      message: 'High rate limits detected - monitor for potential abuse'
    });
  }

  return recommendations;
}

private generateTestRecommendations(tests: any): string[] {
  const recommendations = [];
  
  if (!tests.active.passed) {
    recommendations.push('Activate the API key to enable functionality');
  }
  
  if (!tests.notExpired.passed) {
    recommendations.push('Update the expiration date or remove expiration');
  }
  
  if (!tests.hasPermissions.passed) {
    recommendations.push('Add appropriate permissions to the API key');
  }
  
  return recommendations;
}

private calculateDailyAverage(totalRequests: number, timeframe: string): number {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 30;
  return Math.round(totalRequests / days);
}

private convertToCSV(keys: any[]): string {
  if (keys.length === 0) return 'No data to export';

  const headers = ['Key ID', 'Name', 'Description', 'Permissions', 'Is Active', 'Created At', 'Expires At'];
  const csvRows = [headers.join(',')];

  keys.forEach(key => {
    const row = [
      key.keyId,
      `"${key.name || ''}"`,
      `"${key.description || ''}"`,
      `"${key.permissions?.join(';') || ''}"`,
      key.isActive,
      key.createdAt,
      key.expiresAt || ''
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}
}

