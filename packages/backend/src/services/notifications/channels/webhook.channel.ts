import fetch from 'node-fetch';
import { NotificationEvent } from '../types/notificationEvent';
import { templateService } from '../features/template.service';
import { logger } from '../../../utils/logger';

export class WebhookChannel {
  async send(event: NotificationEvent): Promise<void> {
    const templateKey = event.metadata?.templateKey ?? event.type;
    const template = templateService.render(templateKey, { payload: event.payload });
    if (!template?.webhook || !event.recipient.webhookUrl) {
      return;
    }

    try {
      await fetch(event.recipient.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template.webhook)
      });
    } catch (error) {
      logger.error('Webhook delivery failed', { error, type: event.type });
    }
  }
}

export const webhookChannel = new WebhookChannel();
