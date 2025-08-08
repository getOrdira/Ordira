// src/services/business/apiKey.service.ts
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { ApiKey } from '../../models/apiKey.model';

export class ApiKeyService {
  
  async createApiKey(businessId: string) {
    const keyId = crypto.randomBytes(8).toString('hex');    // e.g. "a1b2c3d4e5f6g7h8"
    const secret = crypto.randomBytes(32).toString('hex');  // e.g. "abcdef012345..."
    const toHash = `${keyId}.${secret}`;
    const hashed = await bcrypt.hash(toHash, 10);

    const doc = await ApiKey.create({
      business: businessId,
      keyId,
      hashedSecret: hashed
    });

    // Return the one-and-only time we can show the raw key:
    return { 
      keyId, 
      secret, 
      id: doc._id.toString(), 
      createdAt: doc.createdAt 
    };
  }

  async listApiKeys(businessId: string) {
    return ApiKey.find({ business: businessId, revoked: false })
      .select('keyId createdAt revoked')
      .lean();
  }

  async revokeApiKey(keyId: string, businessId: string) {
    const doc = await ApiKey.findOneAndUpdate(
      { business: businessId, keyId },
      { revoked: true },
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
}
