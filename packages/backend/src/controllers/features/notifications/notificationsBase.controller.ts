// src/controllers/features/notifications/notificationsBase.controller.ts
// Shared helpers for notification feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import { getNotificationsServices } from '../../../services/container/container.getters';  
import { NotificationRecipient } from '../../../services/notifications';

interface ResolveRecipientOptions {
  allowExplicit?: boolean;
}

/**
 * NotificationsBaseController centralizes common helpers for notification controllers.
 */
export abstract class NotificationsBaseController extends BaseController {
  protected notificationsServices = getNotificationsServices();

  /**
   * Resolve the notification recipient from the current request or validated payload.
   */
  protected resolveRecipient(req: BaseRequest, options: ResolveRecipientOptions = {}): NotificationRecipient {
    const { allowExplicit = false } = options;

    if (allowExplicit && req.validatedBody) {
      const direct = req.validatedBody as Partial<NotificationRecipient>;
      if (direct.businessId || direct.manufacturerId || direct.email || direct.webhookUrl) {
        return {
          businessId: direct.businessId,
          manufacturerId: direct.manufacturerId,
          email: direct.email,
          webhookUrl: direct.webhookUrl,
        };
      }

      if ('recipient' in req.validatedBody) {
        const nested = (req.validatedBody as { recipient?: NotificationRecipient }).recipient;
        if (nested && (nested.businessId || nested.manufacturerId || nested.email || nested.webhookUrl)) {
          return nested;
        }
      }
    }

    if (req.userType === 'business' && req.businessId) {
      return { businessId: req.businessId, email: (req as any).email };
    }

    if (req.userType === 'manufacturer' && req.manufacturerId) {
      return { manufacturerId: req.manufacturerId, email: (req as any).email };
    }

    throw {
      statusCode: 400,
      message: 'Recipient context is required to perform notification operations',
    };
  }

  /**
   * Sanitize a page limit parameter to keep it within acceptable bounds.
   */
  protected sanitizeLimit(limit?: number): number {
    if (!limit || Number.isNaN(Number(limit))) {
      return 20;
    }

    return Math.min(100, Math.max(1, Number(limit)));
  }

  /**
   * Parse a date-like value safely.
   */
  protected parseDate(value?: string | Date): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
