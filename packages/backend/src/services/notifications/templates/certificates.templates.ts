import { TemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { NotificationCategory } from '../types/notificationCategory';
import { NotificationPriority } from '../types/notificationPriority';

export const certificateTemplates: Record<string, (context: TemplateContext) => TemplateOutput> = {
  'certificate.minted': ({ payload }) => {
    const productName = (payload?.productName as string) || 'your product';
    const tokenId = payload?.tokenId as string | undefined;
    return {
      email: {
        subject: `Certificate minted${tokenId ? ` (#${tokenId})` : ''}`,
        text: `A new certificate has been minted for ${productName}${tokenId ? ` with token ID ${tokenId}` : ''}.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate minted for ${productName}`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.Medium,
      },
    };
  },
  'certificate.transfer_failed': ({ payload }) => {
    const tokenId = payload?.tokenId as string | undefined;
    return {
      email: {
        subject: 'Certificate transfer failed',
        text: `A certificate${tokenId ? ` (${tokenId})` : ''} failed to transfer. Please review the transaction and retry.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate transfer failed${tokenId ? ` (${tokenId})` : ''}`,
        actionUrl: payload?.retryUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.High,
      },
    };
  },
};
