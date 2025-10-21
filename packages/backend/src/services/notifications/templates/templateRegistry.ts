import { TemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { billingTemplates } from './billing.templates';
import { connectionTemplates } from './connections.templates';
import { certificateTemplates } from './certificates.templates';
import { accountTemplates } from './account.templates';
import { authTemplates } from './auth.templates';
import { walletTemplates } from './wallet.templates';
import { messagingTemplates } from './messaging.templates';
import { usageTemplates } from './usage.templates';
import { NotificationCategory } from '../types/notificationCategory';

interface TemplateDefinition {
  render: (context: TemplateContext) => TemplateOutput;
}

class TemplateRegistry {
  private templates = new Map<string, TemplateDefinition>();

  constructor() {
    this.register('generic.notification', ({ payload }) => ({
      email: {
        subject: (payload as any)?.subject || 'Notification',
        text: (payload as any)?.message || 'You have a new notification',
      },
      webhook: payload,
      inApp: { message: (payload as any)?.message || 'You have a new notification' },
      metadata: { category: NotificationCategory.System },
    }));

    this.register('certificate.minted', ({ payload }) => ({
      email: {
        subject: `Certificate minted for ${(payload?.productName as string) || 'your product'}`,
        text: `A new certificate has been minted for ${(payload?.productName as string) || 'your product'}. Token ID: ${payload?.tokenId || 'N/A'}.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate minted for ${(payload?.productName as string) || 'product'}`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: { category: NotificationCategory.Certificate },
    }));

    Object.entries(billingTemplates).forEach(([key, renderer]) => {
      this.register(key, renderer);
    });
    Object.entries(connectionTemplates).forEach(([key, renderer]) => {
      this.register(key, renderer);
    });
    Object.entries(certificateTemplates).forEach(([key, renderer]) => {
      this.register(key, renderer);
    });
    Object.entries(accountTemplates).forEach(([key, renderer]) => {
      this.register(key, renderer);
    });
    Object.entries(authTemplates).forEach(([key, renderer]) => {
      this.register(key, renderer);
    });
    Object.entries(walletTemplates).forEach(([key, renderer]) => {
      this.register(key, renderer);
    });
    Object.entries(messagingTemplates).forEach(([key, renderer]) => {
      this.register(key, renderer);
    });
    Object.entries(usageTemplates).forEach(([key, renderer]) => {
      this.register(key, renderer);
    });
  }

  register(key: string, render: (context: TemplateContext) => TemplateOutput): void {
    this.templates.set(key, { render });
  }

  get(key: string): TemplateDefinition | undefined {
    return this.templates.get(key);
  }
}

export const templateRegistry = new TemplateRegistry();
