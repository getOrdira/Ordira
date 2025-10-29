// src/controllers/features/security/securityTokens.controller.ts
// Controller exposing token revocation and blacklist checks

import { Response } from 'express';
import { SecurityBaseController, SecurityBaseRequest } from './securityBase.controller';
import type { SecurityActorType } from '../../../services/infrastructure/security';

interface BlacklistTokenRequest extends SecurityBaseRequest {
  validatedBody: {
    token: string;
    userId?: string;
    userType?: SecurityActorType;
    reason?: string;
  };
}

interface TokenQueryRequest extends SecurityBaseRequest {
  validatedQuery?: {
    token?: string;
  };
}

/**
 * SecurityTokensController wraps token revocation feature services.
 */
export class SecurityTokensController extends SecurityBaseController {
  /**
   * Blacklist a token and log the revocation event.
   */
  async blacklistToken(req: BlacklistTokenRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:tokens');

      const actor = this.resolveActor(req, {
        userId: req.validatedBody.userId,
        userType: req.validatedBody.userType,
      });

      await this.securityServices.tokenRevocationService.blacklistToken(
        req.validatedBody.token,
        actor.userId,
        actor.userType,
        this.parseString(req.validatedBody.reason) ?? 'manual_revoke',
      );

      return {
        blacklisted: true,
        userId: actor.userId,
      };
    }, res, 'Token blacklisted successfully', this.getRequestMeta(req));
  }

  /**
   * Check whether a token has been blacklisted.
   */
  async isTokenBlacklisted(req: TokenQueryRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:tokens');

      const token =
        this.parseString(req.validatedQuery?.token) ??
        this.parseString((req.query?.token as string | undefined));

      if (!token) {
        throw { statusCode: 400, message: 'Token query parameter is required', code: 'SECURITY_TOKEN_REQUIRED' };
      }

      const blacklisted = await this.securityServices.tokenRevocationService.isTokenBlacklisted(token);

      return {
        tokenHashPreview: token.slice(0, 8),
        blacklisted,
      };
    }, res, 'Token blacklist status retrieved', this.getRequestMeta(req));
  }
}

export const securityTokensController = new SecurityTokensController();
