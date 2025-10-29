// src/controllers/features/security/securitySessions.controller.ts
// Controller for session lifecycle management

import { Response } from 'express';
import { SecurityBaseController, SecurityBaseRequest } from './securityBase.controller';
import type {
  SessionCreateInput,
  SecurityActorType,
} from '../../../services/infrastructure/security';

interface CreateSessionRequest extends SecurityBaseRequest {
  validatedBody: SessionCreateInput;
}

interface SessionParamsRequest extends SecurityBaseRequest {
  validatedParams: {
    sessionId: string;
  };
}

interface RevokeAllSessionsRequest extends SecurityBaseRequest {
  validatedBody: {
    userId?: string;
    userType?: SecurityActorType;
    reason?: string;
    excludeSessionId?: string;
  };
}

interface ActiveSessionsQuery extends SecurityBaseRequest {
  validatedQuery?: {
    userId?: string;
    userType?: SecurityActorType;
  };
}

interface CleanupQuery extends SecurityBaseRequest {
  validatedQuery?: {
    referenceDate?: string;
  };
}

interface RecentSessionsQuery extends SecurityBaseRequest {
  validatedQuery?: {
    userId?: string;
    days?: number;
  };
}

/**
 * SecuritySessionsController exposes session lifecycle endpoints.
 */
export class SecuritySessionsController extends SecurityBaseController {
  /**
   * Create a new security session.
   */
  async createSession(req: CreateSessionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:sessions');

      const sessionId = await this.securityServices.sessionManagementService.createSession(req.validatedBody);

      return {
        sessionId,
        createdAt: new Date().toISOString(),
      };
    }, res, 'Session created successfully', this.getRequestMeta(req));
  }

  /**
   * Update session activity timestamp.
   */
  async updateSessionActivity(req: SessionParamsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:sessions');

      const sessionId = req.validatedParams.sessionId;
      await this.securityServices.sessionManagementService.updateSessionActivity(sessionId);

      return {
        sessionId,
        updatedAt: new Date().toISOString(),
      };
    }, res, 'Session activity updated', this.getRequestMeta(req));
  }

  /**
   * Revoke a single session.
   */
  async revokeSession(req: SessionParamsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:sessions');

      const sessionId = req.validatedParams.sessionId;
      await this.securityServices.sessionManagementService.revokeSession(sessionId);

      return {
        sessionId,
        revoked: true,
      };
    }, res, 'Session revoked', this.getRequestMeta(req));
  }

  /**
   * Revoke all sessions for a user.
   */
  async revokeAllSessions(req: RevokeAllSessionsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:sessions');

      const actor = this.resolveActor(req, {
        userId: req.validatedBody.userId,
        userType: req.validatedBody.userType,
      });

      const revoked = await this.securityServices.sessionManagementService.revokeAllSessions(
        actor.userId,
        actor.userType,
        {
          reason: this.parseString(req.validatedBody.reason),
          excludeSessionId: this.parseString(req.validatedBody.excludeSessionId),
        },
      );

      return {
        userId: actor.userId,
        revoked,
      };
    }, res, 'Sessions revoked', this.getRequestMeta(req));
  }

  /**
   * Get active sessions for a user.
   */
  async getActiveSessions(req: ActiveSessionsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:sessions');

      const actor = this.resolveActor(req, {
        userId: req.validatedQuery?.userId,
        userType: req.validatedQuery?.userType,
      });

      const sessions = await this.securityServices.sessionManagementService.getUserActiveSessions(actor.userId);

      return {
        userId: actor.userId,
        sessions,
      };
    }, res, 'Active sessions retrieved', this.getRequestMeta(req));
  }

  /**
   * Cleanup expired sessions and return count.
   */
  async cleanupExpiredSessions(req: CleanupQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:sessions');

      const referenceDate = req.validatedQuery?.referenceDate
        ? new Date(req.validatedQuery.referenceDate)
        : new Date();

      const cleaned = await this.securityServices.sessionManagementService.cleanupExpiredSessions(referenceDate);

      return {
        cleaned,
        referenceDate: referenceDate.toISOString(),
      };
    }, res, 'Expired sessions cleaned', this.getRequestMeta(req));
  }

  /**
   * Count recent sessions for a user within a window.
   */
  async countRecentSessions(req: RecentSessionsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:sessions');

      const actor = this.resolveActor(req, {
        userId: req.validatedQuery?.userId,
      });

      const days = this.parseNumber(req.validatedQuery?.days, 1, { min: 1, max: 30 });
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const count = await this.securityServices.sessionManagementService.countRecentSessions(actor.userId, since);

      return {
        userId: actor.userId,
        count,
        since: since.toISOString(),
      };
    }, res, 'Recent session count retrieved', this.getRequestMeta(req));
  }
}

export const securitySessionsController = new SecuritySessionsController();
