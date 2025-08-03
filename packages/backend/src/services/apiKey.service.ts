// src/services/apiKey.service.ts
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { APIKey } from '../models/apiKey.model';

export async function createApiKey(businessId: string) {
  const keyId    = crypto.randomBytes(8).toString('hex');    // e.g. "a1b2c3d4e5f6g7h8"
  const secret   = crypto.randomBytes(32).toString('hex');   // e.g. "abcdef012345..."
  const toHash   = `${keyId}.${secret}`;
  const hashed   = await bcrypt.hash(toHash, 10);

  const doc = await APIKey.create({
    business:     businessId,
    keyId,
    hashedSecret: hashed
  });

  // Return the one-and-only time we can show the raw key:
  return { keyId, secret, id: doc._id.toString(), createdAt: doc.createdAt };
}

export function listApiKeys(businessId: string) {
  return APIKey.find({ business: businessId, revoked: false })
    .select('keyId createdAt revoked')
    .lean();
}

export async function revokeApiKey(keyId: string, businessId: string) {
  const doc = await APIKey.findOneAndUpdate(
    { business: businessId, keyId },
    { revoked: true },
    { new: true }
  );
  if (!doc) throw { statusCode: 404, message: 'API key not found' };
  return doc;
}

export async function verifyApiKey(provided: string) {
  // provided format: "keyId.secret"
  const [keyId, secret] = provided.split('.');
  if (!keyId || !secret) return null;

  const doc = await APIKey.findOne({ keyId, revoked: false });
  if (!doc) return null;

  const ok = await bcrypt.compare(provided, doc.hashedSecret);
  return ok ? doc.business.toString() : null;
}
