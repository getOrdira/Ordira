import { emailChannel } from '../channels/email.channel';
import { webhookChannel } from '../channels/webhook.channel';
import { inAppChannel } from '../channels/inApp.channel';
import { preferencesService } from './preferences.service';
import { NotificationEvent } from '../types';
import { recipientResolverService } from '../utils/recipientResolver.service';

export class DeliveryService {
  async deliver(event: NotificationEvent): Promise<void> {
    const resolved = await recipientResolverService.resolve(event.recipient);
    const preferences = await preferencesService.resolve(resolved.recipient, event.metadata?.category);

    const sends: Array<Promise<void>> = [];

    if (preferences.channel.inApp !== false && (event.metadata?.channels?.inApp ?? true)) {
      sends.push(inAppChannel.send({ ...event, recipient: resolved.recipient }));
    }

    if (preferences.channel.email && (event.metadata?.channels?.email ?? true)) {
      sends.push(emailChannel.send({ ...event, recipient: resolved.recipient }));
    }

    if (preferences.channel.webhook && (event.metadata?.channels?.webhook ?? false)) {
      sends.push(webhookChannel.send({ ...event, recipient: resolved.recipient }));
    }

    if (sends.length) {
      await Promise.allSettled(sends);
    }
  }
}

export const deliveryService = new DeliveryService();
