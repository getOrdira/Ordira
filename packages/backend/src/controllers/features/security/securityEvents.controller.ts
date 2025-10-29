// src/controllers/features/security/securityEvents.controller.ts
// Controller handling security event logging and retrieval

import { Response } from 'express';
import { SecurityBaseController, SecurityBaseRequest } from './securityBase.controller';
import type {
  SecurityEventCreateInput,
  SecurityActorType,
} from '../../../services/infrastructure/security';

interface LogEventRequest extends SecurityBaseRequest {
  validatedBody: SecurityEventCreateInput;
}

interface LogAuthAttemptRequest extends SecurityBaseRequest {
  validatedBody: {
    userId: string;
    userType: SecurityActorType;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    additionalData?: Record<string, unknown>;
  };
}

interface RecentEventsQuery extends SecurityBaseRequest {
  validatedQuery?: {
    userId?: string;
    limit?: number;
  };
}

interface EventsSinceQuery extends SecurityBaseRequest {
  validatedQuery?: {
    userId?: string;
    days?: number;
  };
}

interface SystemEventsQuery extends SecurityBaseRequest {
  validatedQuery?: {
    days?: number;
  };
}

/**
 * SecurityEventsController exposes endpoints for recording and querying security events.
 */
export class SecurityEventsController extends SecurityBaseController {
  /**
   * Log a generic security event.
   */
  async logEvent(req: LogEventRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:events');

      const payload = this.securityServices.securityValidationService.validateEventInput(req.validatedBody);
      await this.securityServices.securityEventLoggerService.logEvent(payload);

      return {
        logged: true,
        eventType: payload.eventType,
        severity: payload.severity,
      };
    }, res, 'Security event recorded', this.getRequestMeta(req));
  }

  /**
   * Log an authentication attempt event.
   */
  async logAuthenticationAttempt(req: LogAuthAttemptRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:events');

      const { userId, userType } = this.resolveActor(req, {
        userId: req.validatedBody.userId,
        userType: req.validatedBody.userType,
      });

      await this.securityServices.securityEventLoggerService.logAuthenticationAttempt(
        userId,
        userType,
        req.validatedBody.success,
        this.parseString(req.validatedBody.ipAddress),
        this.parseString(req.validatedBody.userAgent),
        req.validatedBody.additionalData,
      );

      return {
        logged: true,
        userId,
        success: req.validatedBody.success,
      };
    }, res, 'Authentication attempt logged', this.getRequestMeta(req));
  }

  /**
   * Retrieve recent events for a user.
   */
  async getRecentEvents(req: RecentEventsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:events');

      const { userId } = this.resolveActor(req, {
        userId: req.validatedQuery?.userId,
      });
      const limit = this.parseNumber(req.validatedQuery?.limit, 20, { min: 1, max: 200 });

      const events = await this.securityServices.securityEventDataService.findRecentEventsByUser(userId, limit);

      return {
        events,
        userId,
        limit,
      };
    }, res, 'Recent security events retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve events for a user since a given window (in days).
   */
  async getUserEventsSince(req: EventsSinceQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:events');

      const { userId } = this.resolveActor(req, {
        userId: req.validatedQuery?.userId,
      });
      const days = this.parseNumber(req.validatedQuery?.days, 30, { min: 1, max: 365 });
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await this.securityServices.securityEventDataService.findEventsByUserSince(userId, start);

      return {
        events,
        userId,
        since: start.toISOString(),
      };
    }, res, 'User security events retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve system events since a timeframe for dashboards.
   */
  async getSystemEvents(req: SystemEventsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:events');

      const days = this.parseNumber(req.validatedQuery?.days, 7, { min: 1, max: 180 });
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await this.securityServices.securityEventDataService.findEventsSince(start);

      return {
        events,
        since: start.toISOString(),
        total: events.length,
      };
    }, res, 'System security events retrieved', this.getRequestMeta(req));
  }
}

export const securityEventsController = new SecurityEventsController();
