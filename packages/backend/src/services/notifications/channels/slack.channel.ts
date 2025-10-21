import { NotificationEvent } from '../types/notificationEvent';
import { templateService } from '../features/template.service';
import { logger } from '../../../utils/logger';

export interface SlackNotificationOptions {
  channel?: string;
  username?: string;
  iconEmoji?: string;
  attachments?: Array<{
    color?: string;
    title?: string;
    text?: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
  }>;
}

export interface SlackNotification {
  text: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  attachments?: Array<{
    color?: string;
    title?: string;
    text?: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
  }>;
}

export class SlackChannel {
  private validateSlackConfiguration(): void {
    if (!process.env.SLACK_WEBHOOK_URL && !process.env.SLACK_BOT_TOKEN) {
      throw { statusCode: 400, message: 'Slack configuration missing (SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN)' };
    }
  }

  private async sendSlackMessage(payload: SlackNotification): Promise<void> {
    this.validateSlackConfiguration();

    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackUrl) {
      throw new Error('SLACK_WEBHOOK_URL not configured');
    }

    try {
      const response = await fetch(slackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      this.logNotificationEvent('SLACK_SENT', payload.channel || 'default', 'SLACK', true, {
        text: payload.text.substring(0, 100) + '...'
      });

    } catch (error) {
      this.logNotificationEvent('SLACK_FAILED', payload.channel || 'default', 'SLACK', false, {
        error: error.message
      });
      throw error;
    }
  }

  async send(event: NotificationEvent, options: SlackNotificationOptions = {}): Promise<void> {
    const templateKey = event.metadata?.templateKey ?? event.type;
    const template = templateService.render(templateKey, { payload: event.payload });
    
    if (!template?.webhook) {
      logger.warn('No webhook template found for Slack', { templateKey, type: event.type });
      return;
    }

    try {
      // Build Slack message from template and options
      const slackMessage: SlackNotification = {
        text: (template.webhook.text as string) || `Notification: ${event.type}`,
        channel: options.channel || process.env.SLACK_DEFAULT_CHANNEL || '#notifications',
        username: options.username || process.env.SLACK_BOT_NAME || 'Ordira Bot',
        iconEmoji: options.iconEmoji || ':bell:',
        attachments: this.buildSlackAttachments(event, template, options)
      };

      await this.sendSlackMessage(slackMessage);

    } catch (error) {
      logger.error('Slack delivery failed', { 
        error: error.message, 
        type: event.type,
        channel: options.channel 
      });
      throw error;
    }
  }

  private buildSlackAttachments(
    event: NotificationEvent, 
    template: any, 
    options: SlackNotificationOptions
  ): SlackNotification['attachments'] {
    const attachments: SlackNotification['attachments'] = [];

    // Main attachment with event details
    const mainAttachment = {
      color: this.getPriorityColor(event.metadata?.priority),
      title: template.metadata?.title || `Notification: ${event.type}`,
      text: template.webhook.text || 'You have a new notification',
      fields: [
        {
          title: 'Type',
          value: event.type,
          short: true
        },
        {
          title: 'Timestamp',
          value: new Date().toISOString(),
          short: true
        }
      ]
    };

    // Add recipient info if available
    if (event.recipient.email) {
      mainAttachment.fields!.push({
        title: 'Recipient',
        value: event.recipient.email,
        short: true
      });
    }

    // Add action URL if available
    if (template.metadata?.actionUrl) {
      mainAttachment.fields!.push({
        title: 'Action URL',
        value: template.metadata.actionUrl,
        short: false
      });
    }

    // Add custom fields from payload
    if (event.payload && typeof event.payload === 'object') {
      Object.entries(event.payload).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          mainAttachment.fields!.push({
            title: key.charAt(0).toUpperCase() + key.slice(1),
            value: String(value),
            short: true
          });
        }
      });
    }

    attachments.push(mainAttachment);

    // Add custom attachments if provided
    if (options.attachments) {
      attachments.push(...options.attachments);
    }

    return attachments;
  }

  private getPriorityColor(priority?: string): string {
    switch (priority) {
      case 'urgent':
        return '#ff0000'; // Red
      case 'high':
        return '#ff6600'; // Orange
      case 'medium':
        return '#0099ff'; // Blue
      case 'low':
        return '#00cc00'; // Green
      default:
        return '#666666'; // Gray
    }
  }

  private logNotificationEvent(
    event: string, 
    channel: string, 
    type: string, 
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const timestamp = new Date().toLocaleString();
    logger.info(`[NOTIFICATIONS] ${timestamp} - ${event} - ${type} - ${channel} - ${success ? 'SUCCESS' : 'FAILED'}${metadata ? ` - ${JSON.stringify(metadata)}` : ''}`);
  }

  async testConfiguration(): Promise<{
    isConfigured: boolean;
    canConnect: boolean;
    errors: string[];
  }> {
    const result = {
      isConfigured: false,
      canConnect: false,
      errors: [] as string[]
    };

    if (!process.env.SLACK_WEBHOOK_URL && !process.env.SLACK_BOT_TOKEN) {
      result.errors.push('Missing Slack configuration (SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN)');
      return result;
    }

    result.isConfigured = true;

    try {
      // Test with a simple message
      await this.sendSlackMessage({
        text: 'Test notification from Ordira',
        channel: process.env.SLACK_DEFAULT_CHANNEL || '#notifications'
      });
      
      result.canConnect = true;

    } catch (error) {
      result.errors.push(`Slack connection failed: ${error.message}`);
    }

    return result;
  }
}

export const slackChannel = new SlackChannel();
