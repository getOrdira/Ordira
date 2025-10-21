import jwt from 'jsonwebtoken';
import { UtilsService } from '../../../utils/utils.service';
import { tokenBlacklistDataService, TokenBlacklistDataService } from '../core/tokenBlacklistData.service';
import { securityValidationService, SecurityValidationService } from '../validation/securityValidation.service';
import { securityEventLoggerService, SecurityEventLoggerService } from './securityEventLogger.service';
import { TOKEN_BLACKLIST_FALLBACK_EXPIRY_MS } from '../utils/securityConfig';
import { extractTokenId } from '../utils/securityHelpers';
import {
  SecurityActorType,
  SecurityEventType,
  SecuritySeverity
} from '../utils/securityTypes';

/**
 * Feature layer for token revocation and blacklist lookups.
 */
export class TokenRevocationService {
  constructor(
    private readonly tokens: TokenBlacklistDataService = tokenBlacklistDataService,
    private readonly validation: SecurityValidationService = securityValidationService,
    private readonly events: SecurityEventLoggerService = securityEventLoggerService
  ) {}

  /**
   * Add a token to the blacklist and emit a revocation event.
   */
  async blacklistToken(
    token: string,
    userId: string,
    userType: SecurityActorType,
    reason: string = 'manual_revoke'
  ): Promise<void> {
    const normalizedToken = this.validation.ensureToken(token);
    const tokenId = extractTokenId(normalizedToken);
    const tokenHash = UtilsService.hashString(normalizedToken);

    const decoded = jwt.decode(normalizedToken) as jwt.JwtPayload | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + TOKEN_BLACKLIST_FALLBACK_EXPIRY_MS);

    await this.tokens.addToken({
      tokenId,
      userId,
      tokenHash,
      reason,
      expiresAt
    });

    await this.events.logEvent({
      eventType: SecurityEventType.TOKEN_INVALIDATED,
      userId,
      userType,
      severity: SecuritySeverity.MEDIUM,
      success: true,
      tokenId,
      additionalData: { reason }
    });
  }

  /**
   * Check whether a token has been revoked.
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const normalizedToken = this.validation.ensureToken(token);
      const tokenId = extractTokenId(normalizedToken);
      const tokenHash = UtilsService.hashString(normalizedToken);

      const entry = await this.tokens.findByTokenIdOrHash(tokenId, tokenHash);
      return Boolean(entry);
    } catch (error) {
      // In case validation fails we treat the token as not blacklisted to avoid false positives
      return false;
    }
  }
}

export const tokenRevocationService = new TokenRevocationService();


