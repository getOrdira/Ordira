import crypto from 'crypto';
import { logger } from '../../../../utils/logger';

const DEFAULT_ALGORITHM = 'aes-256-gcm';
const EXPECTED_KEY_LENGTH = 32; // bytes
const IV_LENGTH = 12; // Recommended for GCM

export interface EncryptionState {
  key: Buffer | null;
  algorithm: string;
}

export function loadEncryptionKey(rawKey: string | undefined): EncryptionState {
  if (!rawKey) {
    return { key: null, algorithm: DEFAULT_ALGORITHM };
  }

  const state: EncryptionState = { key: null, algorithm: DEFAULT_ALGORITHM };

  try {
    if (/^[0-9a-fA-F]+$/.test(rawKey) && rawKey.length === EXPECTED_KEY_LENGTH * 2) {
      state.key = Buffer.from(rawKey, 'hex');
      return state;
    }

    const base64Key = Buffer.from(rawKey, 'base64');
    if (base64Key.length === EXPECTED_KEY_LENGTH) {
      state.key = base64Key;
      return state;
    }

    if (rawKey.length === EXPECTED_KEY_LENGTH) {
      state.key = Buffer.from(rawKey, 'utf8');
      return state;
    }

    logger.error('CACHE_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64 encoded).');
    return state;
  } catch (error) {
    logger.error('Failed to load CACHE_ENCRYPTION_KEY. Encryption disabled.', error);
    return state;
  }
}

export function encryptPayload(state: EncryptionState, payload: string): string {
  if (!state.key) {
    throw new Error('Encryption key is not configured');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(state.algorithm, state.key, iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const authTag = (cipher as any).getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptPayload(state: EncryptionState, encryptedPayload: string): string {
  if (!state.key) {
    throw new Error('Encryption key is not configured');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivB64, tagB64, payloadB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const payload = Buffer.from(payloadB64, 'base64');

  const decipher = crypto.createDecipheriv(state.algorithm, state.key, iv);
  (decipher as any).setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString('utf8');
}
