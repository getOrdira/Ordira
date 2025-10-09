import { notificationDataService } from '../core/notificationData.service';
import { NotificationEvent } from '../types/notificationEvent';
import { templateService } from '../features/template.service';

export class InAppChannel {
  async send(event: NotificationEvent): Promise<void> {
    const templateKey = event.metadata?.templateKey ?? event.type;
    const template = templateService.render(templateKey, { payload: event.payload });
    if (!template?.inApp) {
      return;
    }

    await notificationDataService.createNotification({
      business: event.recipient.businessId,
      manufacturer: event.recipient.manufacturerId,
      type: event.type,
      message: template.inApp.message,
      data: event.payload 
    } as any);
  }
}

export const inAppChannel = new InAppChannel();
