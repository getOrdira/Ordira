// src/controllers/features/notifications/notificationsPreferences.controller.ts
// Controller responsible for managing notification preference endpoints

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';
import {
  NotificationPreferences,
  NotificationRecipient,
} from '../../../services/notifications';

interface UpdatePreferencesRequest extends BaseRequest {
  validatedBody: Partial<NotificationPreferences>;
}

/**
 * NotificationsPreferencesController exposes read/write operations for user notification preferences.
 */
export class NotificationsPreferencesController extends NotificationsBaseController {
  private preferencesService = this.notificationsServices.features.preferencesService;
  private preferenceDataService = this.notificationsServices.core.preferenceDataService;

  /**
   * Retrieve both raw and effective notification preferences for the requesting recipient.
   */
  async getPreferences(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);

      this.recordPerformance(req, 'GET_NOTIFICATION_PREFERENCES');

      const stored = await this.loadCurrentPreferences(recipient);
      const effective = await this.preferencesService.resolve(recipient);

      this.logAction(req, 'GET_NOTIFICATION_PREFERENCES_SUCCESS', {
        recipient,
        frequency: stored.frequency,
      });

      return {
        preferences: stored,
        effective,
      };
    }, res, 'Notification preferences retrieved', this.getRequestMeta(req));
  }

  /**
   * Update notification preferences for the requesting recipient.
   */
  async updatePreferences(req: UpdatePreferencesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);

      this.recordPerformance(req, 'UPDATE_NOTIFICATION_PREFERENCES');

      const current = await this.loadCurrentPreferences(recipient);
      const merged = this.mergePreferences(current, req.validatedBody ?? {});

      await this.preferencesService.update(recipient, merged);

      this.logAction(req, 'UPDATE_NOTIFICATION_PREFERENCES_SUCCESS', {
        recipient,
        frequency: merged.frequency,
      });

      const effective = await this.preferencesService.resolve(recipient);

      return {
        preferences: merged,
        effective,
      };
    }, res, 'Notification preferences updated', this.getRequestMeta(req));
  }

  private async loadCurrentPreferences(recipient: NotificationRecipient): Promise<NotificationPreferences> {
    if (recipient.businessId) {
      return this.preferenceDataService.getBusinessPreferences(recipient.businessId);
    }

    if (recipient.manufacturerId) {
      return this.preferenceDataService.getManufacturerPreferences(recipient.manufacturerId);
    }

    return {
      channel: {},
      categories: {},
      frequency: 'immediate',
    };
  }

  private mergePreferences(
    current: NotificationPreferences,
    updates: Partial<NotificationPreferences>,
  ): NotificationPreferences {
    return {
      channel: { ...current.channel, ...(updates.channel ?? {}) },
      categories: { ...current.categories, ...(updates.categories ?? {}) },
      frequency: updates.frequency ?? current.frequency,
      timezone: updates.timezone ?? current.timezone,
    };
  }
}

export const notificationsPreferencesController = new NotificationsPreferencesController();
