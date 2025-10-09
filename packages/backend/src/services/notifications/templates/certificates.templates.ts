import { TemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { NotificationCategory } from '../types/notificationCategory';
import { NotificationPriority } from '../types/notificationPriority';

export const certificateTemplates: Record<string, (context: TemplateContext) => TemplateOutput> = {
  // Minting events
  'certificate.minted': ({ payload }) => {
    const productName = (payload?.productName as string) || 'your product';
    const tokenId = payload?.tokenId as string | undefined;
    const recipient = payload?.recipient as string | undefined;
    return {
      email: {
        subject: `Certificate minted successfully${tokenId ? ` (#${tokenId})` : ''}`,
        text: `A new certificate has been minted for ${productName}${tokenId ? ` with token ID ${tokenId}` : ''}${recipient ? ` for ${recipient}` : ''}.`,
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

  'certificate.mint_failed': ({ payload }) => {
    const productName = (payload?.productName as string) || 'a product';
    const reason = (payload?.reason as string) || 'Unknown error';
    return {
      email: {
        subject: 'Certificate minting failed',
        text: `Failed to mint certificate for ${productName}. Reason: ${reason}`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate minting failed for ${productName}`,
        actionUrl: payload?.retryUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.High,
      },
    };
  },

  // Batch minting events
  'certificate.batch_completed': ({ payload }) => {
    const total = payload?.total as number || 0;
    const successful = payload?.successful as number || 0;
    const failed = payload?.failed as number || 0;
    return {
      email: {
        subject: `Batch certificate minting completed`,
        text: `Batch minting completed: ${successful} successful, ${failed} failed out of ${total} total certificates.`,
      },
      webhook: payload,
      inApp: {
        message: `Batch minting: ${successful}/${total} successful`,
        actionUrl: payload?.batchUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: failed > 0 ? NotificationPriority.High : NotificationPriority.Medium,
      },
    };
  },

  // Transfer events
  'certificate.transferred': ({ payload }) => {
    const tokenId = payload?.tokenId as string | undefined;
    const recipient = payload?.recipient as string | undefined;
    return {
      email: {
        subject: `Certificate transferred successfully${tokenId ? ` (#${tokenId})` : ''}`,
        text: `Certificate${tokenId ? ` #${tokenId}` : ''} has been successfully transferred${recipient ? ` to ${recipient}` : ''}.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate transferred successfully${tokenId ? ` (#${tokenId})` : ''}`,
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
    const reason = (payload?.reason as string) || 'Unknown error';
    return {
      email: {
        subject: 'Certificate transfer failed',
        text: `Certificate${tokenId ? ` #${tokenId}` : ''} failed to transfer. Reason: ${reason}. Please review and retry.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate transfer failed${tokenId ? ` (#${tokenId})` : ''}`,
        actionUrl: payload?.retryUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.High,
      },
    };
  },

  'certificate.transfer_pending': ({ payload }) => {
    const tokenId = payload?.tokenId as string | undefined;
    const attemptCount = payload?.attemptCount as number || 1;
    return {
      email: {
        subject: 'Certificate transfer pending',
        text: `Certificate${tokenId ? ` #${tokenId}` : ''} transfer is pending (attempt ${attemptCount}). Will retry automatically.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate transfer pending${tokenId ? ` (#${tokenId})` : ''}`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.Low,
      },
    };
  },

  // Revocation events
  'certificate.revoked': ({ payload }) => {
    const tokenId = payload?.tokenId as string | undefined;
    const reason = (payload?.reason as string) || 'Not specified';
    const recipient = payload?.recipient as string | undefined;
    return {
      email: {
        subject: `Certificate revoked${tokenId ? ` (#${tokenId})` : ''}`,
        text: `Certificate${tokenId ? ` #${tokenId}` : ''}${recipient ? ` for ${recipient}` : ''} has been revoked. Reason: ${reason}`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate revoked${tokenId ? ` (#${tokenId})` : ''}`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.High,
      },
    };
  },

  'certificate.revocation_failed': ({ payload }) => {
    const tokenId = payload?.tokenId as string | undefined;
    const error = (payload?.error as string) || 'Unknown error';
    return {
      email: {
        subject: 'Certificate revocation failed',
        text: `Failed to revoke certificate${tokenId ? ` #${tokenId}` : ''}. Error: ${error}`,
      },
      webhook: payload,
      inApp: {
        message: `Revocation failed${tokenId ? ` (#${tokenId})` : ''}`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.High,
      },
    };
  },

  // Delivery events
  'certificate.delivered': ({ payload }) => {
    const recipient = payload?.recipient as string | undefined;
    const method = (payload?.deliveryMethod as string) || 'email';
    return {
      email: {
        subject: 'Certificate delivered successfully',
        text: `Certificate has been delivered${recipient ? ` to ${recipient}` : ''} via ${method}.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate delivered via ${method}`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.Low,
      },
    };
  },

  'certificate.delivery_failed': ({ payload }) => {
    const recipient = payload?.recipient as string | undefined;
    const method = (payload?.deliveryMethod as string) || 'email';
    const reason = (payload?.reason as string) || 'Unknown error';
    return {
      email: {
        subject: 'Certificate delivery failed',
        text: `Failed to deliver certificate${recipient ? ` to ${recipient}` : ''} via ${method}. Reason: ${reason}`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate delivery failed via ${method}`,
        actionUrl: payload?.retryUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.High,
      },
    };
  },

  // Expiration events
  'certificate.expiring_soon': ({ payload }) => {
    const tokenId = payload?.tokenId as string | undefined;
    const expiresAt = payload?.expiresAt as string | undefined;
    const daysLeft = payload?.daysLeft as number || 0;
    return {
      email: {
        subject: `Certificate expiring soon${tokenId ? ` (#${tokenId})` : ''}`,
        text: `Certificate${tokenId ? ` #${tokenId}` : ''} will expire in ${daysLeft} days${expiresAt ? ` on ${expiresAt}` : ''}.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate expiring in ${daysLeft} days`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: daysLeft <= 7 ? NotificationPriority.High : NotificationPriority.Medium,
      },
    };
  },

  'certificate.expired': ({ payload }) => {
    const tokenId = payload?.tokenId as string | undefined;
    return {
      email: {
        subject: `Certificate expired${tokenId ? ` (#${tokenId})` : ''}`,
        text: `Certificate${tokenId ? ` #${tokenId}` : ''} has expired and is no longer valid.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate expired${tokenId ? ` (#${tokenId})` : ''}`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.Medium,
      },
    };
  },

  // Verification events
  'certificate.verified': ({ payload }) => {
    const tokenId = payload?.tokenId as string | undefined;
    const verifier = payload?.verifier as string | undefined;
    return {
      email: {
        subject: `Certificate verified${tokenId ? ` (#${tokenId})` : ''}`,
        text: `Certificate${tokenId ? ` #${tokenId}` : ''} has been verified${verifier ? ` by ${verifier}` : ''}.`,
      },
      webhook: payload,
      inApp: {
        message: `Certificate verified${tokenId ? ` (#${tokenId})` : ''}`,
        actionUrl: payload?.certificateUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.Low,
      },
    };
  },
};
