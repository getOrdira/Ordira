/**
 * Modular Notifications Service
 * 
 * This service provides a unified interface to the modular notifications system,
 * replacing the legacy monolithic notifications.service.ts
 * 
 * @author Modular Notifications System
 * @version 2.0.0
 */

import { NotificationEvent, NotificationEventType, NotificationCategory, NotificationPriority } from './types';
import { triggersService } from './features/triggers.service';
import { deliveryService, DeliveryOptions } from './features/delivery.service';
import { templateService } from './features/template.service';
import { notificationDataService } from './core/notificationData.service';
import { preferenceDataService } from './core/preferenceData.service';
import { logger } from '../../utils/logger';

/**
 * Unified Notifications Service
 * 
 * This class provides a compatibility layer and unified interface
 * for the modular notifications system, maintaining backward compatibility
 * while leveraging the new modular architecture.
 */
export class NotificationsService {
  // ============================================================================
  // CORE NOTIFICATION METHODS
  // ============================================================================

  /**
   * Send a notification event
   * @param event - The notification event to send
   * @param options - Delivery options
   */
  async sendNotification(event: NotificationEvent, options?: DeliveryOptions): Promise<void> {
    try {
      await triggersService.handle(event);
      logger.info(`Notification sent: ${event.type}`, {
        type: event.type,
        recipientType: event.recipient.businessId ? 'business' : 'manufacturer',
        recipientId: event.recipient.businessId || event.recipient.manufacturerId
      });
    } catch (error) {
      logger.error(`Failed to send notification: ${event.type}`, {
        type: event.type,
        error: error.message,
        recipientType: event.recipient.businessId ? 'business' : 'manufacturer',
        recipientId: event.recipient.businessId || event.recipient.manufacturerId
      });
      throw error;
    }
  }

  /**
   * Send an email notification
   * @param to - Email recipient
   * @param subject - Email subject
   * @param text - Plain text content
   * @param html - HTML content (optional)
   * @param options - Email options
   */
  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
    options: {
      priority?: 'low' | 'normal' | 'high';
      attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
      trackingEnabled?: boolean;
      retryCount?: number;
    } = {}
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.SystemMaintenance, // Generic system event
      recipient: { email: to },
      payload: {
        subject,
        text,
        html,
        ...options
      },
      metadata: {
        category: NotificationCategory.System,
        priority: options.priority === 'high' ? NotificationPriority.High : 
                  options.priority === 'low' ? NotificationPriority.Low : NotificationPriority.Medium,
        channels: { email: true, inApp: false, webhook: false, slack: false }
      }
    };

    const deliveryOptions: DeliveryOptions = {
      emailOptions: {
        priority: options.priority,
        attachments: options.attachments,
        trackingEnabled: options.trackingEnabled,
        retryCount: options.retryCount
      }
    };

    await this.sendNotification(event, deliveryOptions);
  }

  /**
   * Send an in-app notification
   * @param recipientId - Recipient ID
   * @param recipientType - Recipient type
   * @param type - Notification type
   * @param message - Notification message
   * @param data - Additional data
   */
  async sendInAppNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    type: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const event: NotificationEvent = {
      type: type as NotificationEventType,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: data || {},
      metadata: {
        category: NotificationCategory.System,
        message,
        channels: { email: false, inApp: true, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // WEB3 & CERTIFICATE NOTIFICATIONS
  // ============================================================================

  /**
   * Send certificate transfer notification
   */
  async sendCertificateTransferNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    tokenId: string,
    certificateId: string,
    brandWallet: string,
    txHash?: string,
    transferredAt?: Date,
    gasUsed?: string,
    transferTime?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.CertificateTransferred,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        tokenId,
        certificateId,
        brandWallet,
        txHash,
        transferredAt,
        gasUsed,
        transferTime
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: true, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send certificate transfer failure notification
   */
  async sendCertificateTransferFailureNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    tokenId: string,
    error: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.CertificateTransferFailed,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        tokenId,
        error
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.High,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send certificate transfer retry notification
   */
  async sendCertificateTransferRetryNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    tokenId: string,
    attempt: number,
    maxAttempts: number
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.CertificateTransferRetry,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        tokenId,
        attempt,
        maxAttempts
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.High,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // AUTHENTICATION NOTIFICATIONS
  // ============================================================================

  /**
   * Send email verification code
   */
  async sendEmailVerificationCode(
    email: string,
    code: string,
    expiresIn: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.AuthEmailVerificationCode,
      recipient: { email },
      payload: {
        code,
        email,
        expiresIn
      },
      metadata: {
        category: NotificationCategory.Auth,
        priority: NotificationPriority.High,
        channels: { email: true, inApp: false, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send password reset link
   */
  async sendPasswordResetLink(
    email: string,
    resetLink: string,
    expiresIn: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.AuthPasswordResetLink,
      recipient: { email },
      payload: {
        resetLink,
        email,
        expiresIn
      },
      metadata: {
        category: NotificationCategory.Auth,
        priority: NotificationPriority.High,
        channels: { email: true, inApp: false, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    loginUrl: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.AuthWelcomeEmail,
      recipient: { email },
      payload: {
        name,
        email,
        loginUrl
      },
      metadata: {
        category: NotificationCategory.Auth,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: true, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // WALLET & WEB3 NOTIFICATIONS
  // ============================================================================

  /**
   * Send wallet connected notification
   */
  async sendWalletConnectedNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    walletAddress: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.WalletConnected,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        walletAddress
      },
      metadata: {
        category: NotificationCategory.Wallet,
        priority: NotificationPriority.Medium,
        channels: { email: false, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send wallet changed notification
   */
  async sendWalletChangedNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    oldWalletAddress: string,
    newWalletAddress: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.WalletChanged,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        oldWalletAddress,
        newWalletAddress
      },
      metadata: {
        category: NotificationCategory.Wallet,
        priority: NotificationPriority.High,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // BILLING & SUBSCRIPTION NOTIFICATIONS
  // ============================================================================

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    invoiceId: string,
    amount: number,
    currency: string,
    errorMessage?: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.PaymentFailed,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        invoiceId,
        amount,
        currency,
        errorMessage
      },
      metadata: {
        category: NotificationCategory.Billing,
        priority: NotificationPriority.High,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send subscription renewal notification
   */
  async sendSubscriptionRenewalNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    plan: string,
    renewalDate: Date,
    amount: number,
    currency: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.SubscriptionRenewed,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        plan,
        renewalDate,
        amount,
        currency
      },
      metadata: {
        category: NotificationCategory.Billing,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: true, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send subscription plan changed notification (email only)
   */
  async sendSubscriptionPlanChangedNotification(
    email: string,
    fromPlan: string,
    toPlan: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.SubscriptionPlanChanged,
      recipient: { email },
      payload: {
        fromPlan,
        toPlan,
        email
      },
      metadata: {
        category: NotificationCategory.Billing,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: false, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send renewal confirmation notification (email only)
   */
  async sendRenewalConfirmation(
    email: string,
    plan: string,
    amount: number
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.SubscriptionRenewed,
      recipient: { email },
      payload: {
        plan,
        amount,
        email
      },
      metadata: {
        category: NotificationCategory.Billing,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: false, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send cancellation confirmation notification (email only)
   */
  async sendCancellationConfirmation(
    email: string,
    plan: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.SubscriptionCancelled,
      recipient: { email },
      payload: {
        plan,
        email
      },
      metadata: {
        category: NotificationCategory.Billing,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: false, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // ACCOUNT & SECURITY NOTIFICATIONS
  // ============================================================================

  /**
   * Send security alert notification
   */
  async sendSecurityAlertNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    alertType: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.AccountSecurityAlert,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        alertType,
        description,
        severity
      },
      metadata: {
        category: NotificationCategory.Security,
        priority: severity === 'critical' ? NotificationPriority.Urgent : 
                  severity === 'high' ? NotificationPriority.High : NotificationPriority.Medium,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send account profile updated notification
   */
  async sendAccountProfileUpdatedNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    updatedFields: string[]
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.AccountProfileUpdated,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        updatedFields
      },
      metadata: {
        category: NotificationCategory.Account,
        priority: NotificationPriority.Low,
        channels: { email: false, inApp: true, webhook: false, slack: false }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // VOTING & PROPOSAL NOTIFICATIONS
  // ============================================================================

  /**
   * Send vote received notification
   */
  async sendVoteReceivedNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    proposalId: string,
    proposalTitle: string,
    voterName: string,
    voteChoice: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.VoteReceived,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        proposalId,
        proposalTitle,
        voterName,
        voteChoice
      },
      metadata: {
        category: NotificationCategory.Vote,
        priority: NotificationPriority.Medium,
        channels: { email: false, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send proposal created notification
   */
  async sendProposalCreatedNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    proposalId: string,
    proposalTitle: string,
    proposalDescription: string,
    votingDeadline: Date
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.ProposalCreated,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        proposalId,
        proposalTitle,
        proposalDescription,
        votingDeadline
      },
      metadata: {
        category: NotificationCategory.Vote,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // MESSAGING NOTIFICATIONS
  // ============================================================================

  /**
   * Send message received notification
   */
  async sendMessageReceivedNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    messageId: string,
    senderName: string,
    messagePreview: string
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.MessageReceived,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        messageId,
        senderName,
        messagePreview
      },
      metadata: {
        category: NotificationCategory.Messaging,
        priority: NotificationPriority.Medium,
        channels: { email: false, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // USAGE & LIMITS NOTIFICATIONS
  // ============================================================================

  /**
   * Send usage limit warning notification
   */
  async sendUsageLimitWarningNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    currentUsage: number,
    limit: number,
    percentage: number,
    resetDate?: Date
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.UsageLimitWarning,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        currentUsage,
        limit,
        percentage,
        resetDate
      },
      metadata: {
        category: NotificationCategory.Usage,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  /**
   * Send usage limit exceeded notification
   */
  async sendUsageLimitExceededNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    currentUsage: number,
    limit: number,
    resetDate?: Date
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.UsageLimitExceeded,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        currentUsage,
        limit,
        resetDate
      },
      metadata: {
        category: NotificationCategory.Usage,
        priority: NotificationPriority.High,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // BULK NOTIFICATIONS
  // ============================================================================

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: Array<{
      recipientId: string;
      recipientType: 'business' | 'manufacturer';
      type: NotificationEventType;
      message: string;
      payload?: Record<string, unknown>;
    }>
  ): Promise<void> {
    const batchId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const events = notifications.map(notification => ({
      type: notification.type,
      recipient: notification.recipientType === 'business' 
        ? { businessId: notification.recipientId } 
        : { manufacturerId: notification.recipientId },
      payload: notification.payload || {},
      metadata: {
        category: NotificationCategory.System,
        message: notification.message,
        batchId
      }
    }));

    // Send all notifications in parallel
    await Promise.allSettled(
      events.map(event => this.sendNotification(event as NotificationEvent))
    );

    logger.info(`Bulk notifications sent: ${notifications.length} notifications`, {
      batchId,
      count: notifications.length
    });
  }

  // ============================================================================
  // SYSTEM & MAINTENANCE NOTIFICATIONS
  // ============================================================================

  /**
   * Send system maintenance notification
   */
  async sendSystemMaintenanceNotification(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    maintenanceStart: Date,
    maintenanceEnd: Date,
    description: string,
    affectedServices?: string[]
  ): Promise<void> {
    const event: NotificationEvent = {
      type: NotificationEventType.SystemMaintenance,
      recipient: recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId },
      payload: {
        maintenanceStart,
        maintenanceEnd,
        description,
        affectedServices
      },
      metadata: {
        category: NotificationCategory.System,
        priority: NotificationPriority.Medium,
        channels: { email: true, inApp: true, webhook: false, slack: true }
      }
    };

    await this.sendNotification(event);
  }

  // ============================================================================
  // NOTIFICATION MANAGEMENT METHODS
  // ============================================================================

  /**
   * Get notifications for a recipient
   */
  async getNotifications(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    options: {
      limit?: number;
      offset?: number;
      category?: NotificationCategory;
      read?: boolean;
      priority?: NotificationPriority;
    } = {}
  ): Promise<any> {
    const recipient = recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId };
    return notificationDataService.listForRecipient(recipient, options);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, recipientId: string, recipientType: 'business' | 'manufacturer'): Promise<void> {
    const recipient = recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId };
    await notificationDataService.markAsReadForRecipient(notificationId, recipient);
  }

  /**
   * Mark all notifications as read for a recipient
   */
  async markAllAsRead(
    recipientId: string,
    recipientType: 'business' | 'manufacturer'
  ): Promise<void> {
    const recipient = recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId };
    await notificationDataService.markAllAsRead(recipient);
  }

  /**
   * Get unread count for a recipient
   */
  async getUnreadCount(
    recipientId: string,
    recipientType: 'business' | 'manufacturer'
  ): Promise<number> {
    const recipient = recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId };
    const stats = await notificationDataService.getStats(recipient);
    return stats.unread;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(
    recipientId: string,
    recipientType: 'business' | 'manufacturer'
  ) {
    const recipient = recipientType === 'business' ? { businessId: recipientId } : { manufacturerId: recipientId };
    return notificationDataService.getStats(recipient);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    recipientId: string,
    recipientType: 'business' | 'manufacturer',
    preferences: {
      channel: {
        email?: boolean;
        inApp?: boolean;
        webhook?: boolean;
        slack?: boolean;
      };
      categories: Record<string, any>;
      frequency: 'immediate' | 'daily' | 'weekly';
      timezone?: string;
    }
  ): Promise<void> {
    if (recipientType === 'business') {
      await preferenceDataService.upsertBusinessPreferences(recipientId, preferences);
    } else {
      await preferenceDataService.upsertManufacturerPreferences(recipientId, preferences);
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(
    recipientId: string,
    recipientType: 'business' | 'manufacturer'
  ) {
    if (recipientType === 'business') {
      return preferenceDataService.getBusinessPreferences(recipientId);
    } else {
      return preferenceDataService.getManufacturerPreferences(recipientId);
    }
  }

  /**
   * Test notification configuration
   */
  async testConfiguration(): Promise<{
    email: any;
    slack: any;
  }> {
    return deliveryService.testChannelConfigurations();
  }

  /**
   * Render a template
   */
  async renderTemplate(
    templateKey: string,
    context: Record<string, unknown>
  ) {
    return templateService.render(templateKey, { payload: context });
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
