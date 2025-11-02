import { logger } from '../../../../utils/logger';
import { BlacklistedTokenModel, type BlacklistedTokenDocument } from '../../../../models/security/blacklistedToken.model';
import { TOKEN_BLACKLIST_FALLBACK_EXPIRY_MS } from '../utils/securityConfig';
import type { TokenBlacklistEntry } from '../utils/securityTypes';
import type { FilterQuery, Model } from 'mongoose';

/**
 * Data access layer for token blacklist entries.
 */
export class TokenBlacklistDataService {
  /**
   * Insert a new blacklisted token record.
   */
  async addToken(entry: Omit<TokenBlacklistEntry, 'blacklistedAt'> & { blacklistedAt?: Date }): Promise<void> {
    try {
      const newToken = new BlacklistedTokenModel({
        ...entry,
        blacklistedAt: entry.blacklistedAt ?? new Date()
      });
      await newToken.save();
    } catch (error) {
      logger.error('Failed to blacklist token', {
        tokenId: entry?.tokenId,
        userId: entry?.userId,
        error
      });
      throw error;
    }
  }

  /**
   * Locate a blacklisted token by identifier or hashed value.
   */
  async findByTokenIdOrHash(tokenId: string, tokenHash: string): Promise<TokenBlacklistEntry | null> {
    const token = await (BlacklistedTokenModel as Model<BlacklistedTokenDocument>).findOne({
      $or: [
        { tokenId },
        { tokenHash }
      ]
    }).lean();

    return token as unknown as TokenBlacklistEntry | null;
  }

  /**
   * Ensure a fallback expiration exists for legacy blacklisted tokens.
   */
  async ensureFallbackExpiry(tokenId: string): Promise<void> {
    await BlacklistedTokenModel.updateOne(
      { tokenId, expiresAt: { $exists: false } },
      { $set: { expiresAt: new Date(Date.now() + TOKEN_BLACKLIST_FALLBACK_EXPIRY_MS) } }
    );
  }
}

export const tokenBlacklistDataService = new TokenBlacklistDataService();



