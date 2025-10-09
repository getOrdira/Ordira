import { Business } from '../../../models/business.model';
import { Manufacturer } from '../../../models/manufacturer.model';
import { NotificationRecipient } from '../types';

export interface ResolvedRecipient {
  recipient: NotificationRecipient;
  email?: string;
  webhookUrl?: string;
  name?: string;
}

export class RecipientResolverService {
  async resolve(recipient: NotificationRecipient): Promise<ResolvedRecipient> {
    if (recipient.email || recipient.webhookUrl) {
      return {
        recipient,
        email: recipient.email,
        webhookUrl: recipient.webhookUrl,
        name: recipient.name,
      };
    }

    if (recipient.businessId) {
      const business = await Business.findById(recipient.businessId).select('email businessName notificationWebhook').lean();
      return {
        recipient: {
          ...recipient,
          email: business?.email || recipient.email,
          webhookUrl: (business as any)?.notificationWebhook || recipient.webhookUrl,
          name: business?.businessName || recipient.name,
        },
        email: business?.email,
        webhookUrl: (business as any)?.notificationWebhook,
        name: business?.businessName,
      };
    }

    if (recipient.manufacturerId) {
      const manufacturer = await Manufacturer.findById(recipient.manufacturerId).select('email name notificationWebhook').lean();
      return {
        recipient: {
          ...recipient,
          email: manufacturer?.email || recipient.email,
          webhookUrl: (manufacturer as any)?.notificationWebhook || recipient.webhookUrl,
          name: manufacturer?.name || recipient.name,
        },
        email: manufacturer?.email,
        webhookUrl: (manufacturer as any)?.notificationWebhook,
        name: manufacturer?.name,
      };
    }

    return { recipient };
  }
}

export const recipientResolverService = new RecipientResolverService();
