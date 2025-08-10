// src/services/business/apiKey.service.ts
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { ApiKey } from '../../models/apiKey.model';


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
    return ok ? doc.business.toString() : null;
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
    console.log(`API Key ${keyId} used:`, usageData);
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
}
