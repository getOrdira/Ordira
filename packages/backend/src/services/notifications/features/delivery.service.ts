import { emailChannel, EmailOptions } from '../channels/email.channel';
import { webhookChannel } from '../channels/webhook.channel';
import { inAppChannel } from '../channels/inApp.channel';
import { slackChannel, SlackNotificationOptions } from '../channels/slack.channel';
import { preferencesService } from './preferences.service';
import { NotificationEvent } from '../types';
import { recipientResolverService } from '../utils/recipientResolver.service';
import { logger } from '../../../utils/logger';
import { ChannelPreferences } from '../types';

export interface DeliveryOptions {
  emailOptions?: EmailOptions;
  slackOptions?: SlackNotificationOptions;
  retryAttempts?: number;
  retryDelay?: number;
}

export class DeliveryService {
  async deliver(event: NotificationEvent, options: DeliveryOptions = {}): Promise<void> {
    const resolved = await recipientResolverService.resolve(event.recipient);
    const preferences = await preferencesService.resolve(resolved.recipient, event.metadata?.category);

    const sends: Array<Promise<void>> = [];

    // In-app notifications
    if (preferences.channel.inApp !== false && (event.metadata?.channels?.inApp ?? true)) {
      sends.push(this.deliverWithRetry(
        () => inAppChannel.send({ ...event, recipient: resolved.recipient }),
        'inApp',
        options.retryAttempts || 1
      ));
    }

    // Email notifications
    if (preferences.channel.email && (event.metadata?.channels?.email ?? true)) {
      sends.push(this.deliverWithRetry(
        () => emailChannel.send({ ...event, recipient: resolved.recipient }, options.emailOptions),
        'email',
        options.retryAttempts || 3
      ));
    }

    // Webhook notifications
    if (preferences.channel.webhook && (event.metadata?.channels?.webhook ?? false)) {
      sends.push(this.deliverWithRetry(
        () => webhookChannel.send({ ...event, recipient: resolved.recipient }),
        'webhook',
        options.retryAttempts || 3
      ));
    }

    // Slack notifications
    if ((preferences.channel as any).slack && (event.metadata?.channels?.slack ?? false)) {
      sends.push(this.deliverWithRetry(
        () => slackChannel.send({ ...event, recipient: resolved.recipient }, options.slackOptions),
        'slack',
        options.retryAttempts || 2
      ));
    }

    if (sends.length) {
      const results = await Promise.allSettled(sends);
      this.logDeliveryResults(event, results);
    }
  }

  private async deliverWithRetry(
    deliveryFn: () => Promise<void>,
    channel: string,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await deliveryFn();
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          logger.warn(`Delivery attempt ${attempt} failed for ${channel}, retrying in ${delay}ms`, {
            channel,
            attempt,
            maxRetries,
            error: error.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    logger.error(`All delivery attempts failed for ${channel}`, {
      channel,
      maxRetries,
      error: lastError?.message
    });
    throw lastError;
  }

  private logDeliveryResults(event: NotificationEvent, results: PromiseSettledResult<void>[]): void {
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    logger.info(`Delivery completed for ${event.type}`, {
      type: event.type,
      successful,
      failed,
      total: results.length
    });
  }

  async testChannelConfigurations(): Promise<{
    email: any;
    slack: any;
  }> {
    const results = await Promise.allSettled([
      emailChannel.testConfiguration(),
      slackChannel.testConfiguration()
    ]);

    return {
      email: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].status === 'rejected' ? results[0].reason : 'Unknown error' },
      slack: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].status === 'rejected' ? results[1].reason : 'Unknown error' }
    };
  }
}

export const deliveryService = new DeliveryService();
