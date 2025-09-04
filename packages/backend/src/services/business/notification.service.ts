// src/services/business/notification.service.ts
import { Notification, INotification } from '../../models/notification.model';
import { Types } from 'mongoose';
import { Business } from '../../models/business.model';

export interface NotificationSummary {
  id: string;
  type: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  recent: number;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html?: string;
}

export interface NotificationPreferences {
  emailNotifications?: {
    invitations?: boolean;
    orderUpdates?: boolean;
    systemUpdates?: boolean;
    marketing?: boolean;
  };
  pushNotifications?: {
    invitations?: boolean;
    orderUpdates?: boolean;
    systemUpdates?: boolean;
  };
  smsNotifications?: {
    criticalUpdates?: boolean;
    orderAlerts?: boolean;
  };
  frequency?: 'immediate' | 'daily' | 'weekly';
  timezone?: string;
}

export interface NotificationFilters {
  type?: string;
  read?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Business service for managing in-app notifications
 * Handles notification storage, retrieval, and management logic
 */
export class NotificationService {

  /**
   * List notifications for a user (brand or manufacturer)
   */
  async listNotifications(
    businessId?: string,
    manufacturerId?: string,
    filters: NotificationFilters = {}
  ): Promise<{
    notifications: NotificationSummary[];
    total: number;
    unread: number;
  }> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const query = this.buildNotificationQuery(businessId, manufacturerId, filters);
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [notifications, total, unread] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        ...this.buildUserQuery(businessId, manufacturerId),
        read: false
      })
    ]);

    return {
      notifications: notifications.map(this.mapToSummary),
      total,
      unread
    };
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(
    businessId?: string,
    manufacturerId?: string
  ): Promise<NotificationSummary[]> {
    const result = await this.listNotifications(businessId, manufacturerId, { read: false });
    return result.notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<NotificationSummary> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        ...userQuery
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      throw { statusCode: 404, message: 'Notification not found' };
    }

    return this.mapToSummary(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    businessId?: string,
    manufacturerId?: string
  ): Promise<{ modified: number }> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const result = await Notification.updateMany(
      {
        ...userQuery,
        read: false
      },
      { read: true }
    );

    return { modified: result.modifiedCount };
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    notificationId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<void> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      ...userQuery
    });

    if (!result) {
      throw { statusCode: 404, message: 'Notification not found' };
    }
  }

  /**
   * Bulk delete notifications
   */
  async bulkDeleteNotifications(
    notificationIds: string[],
    businessId?: string,
    manufacturerId?: string
  ): Promise<{ deleted: number }> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      ...userQuery
    });

    return { deleted: result.deletedCount };
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(
    businessId?: string,
    manufacturerId?: string
  ): Promise<NotificationStats> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const [totalStats, typeStats] = await Promise.all([
      Notification.aggregate([
        { $match: userQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } }
          }
        }
      ]),
      Notification.aggregate([
        { $match: userQuery },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    // Count recent notifications (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await Notification.countDocuments({
      ...userQuery,
      createdAt: { $gte: weekAgo }
    });

    const byType: Record<string, number> = {};
    typeStats.forEach(stat => {
      byType[stat._id] = stat.count;
    });

    return {
      total: totalStats[0]?.total || 0,
      unread: totalStats[0]?.unread || 0,
      byType,
      recent
    };
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(
    notificationId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<NotificationSummary> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const notification = await Notification.findOne({
      _id: notificationId,
      ...userQuery
    });

    if (!notification) {
      throw { statusCode: 404, message: 'Notification not found' };
    }

    return this.mapToSummary(notification);
  }

  /**
   * Clean up old notifications (for maintenance)
   */
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<{ deleted: number }> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true // Only delete read notifications
    });

    return { deleted: result.deletedCount };
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(
    type: string,
    businessId?: string,
    manufacturerId?: string,
    limit: number = 20
  ): Promise<NotificationSummary[]> {
    const result = await this.listNotifications(businessId, manufacturerId, {
      type,
      limit
    });
    
    return result.notifications;
  }

  /**
   * Create a custom notification (for admin use)
   */
  async createNotification(data: {
    businessId?: string;
    manufacturerId?: string;
    type: string;
    message: string;
    data?: any;
  }): Promise<NotificationSummary> {
    const notificationData: any = {
      type: data.type,
      message: data.message,
      data: data.data,
      read: false
    };

    if (data.businessId) {
      notificationData.business = data.businessId;
    }
    
    if (data.manufacturerId) {
      notificationData.manufacturer = data.manufacturerId;
    }

    const notification = await Notification.create(notificationData);
    return this.mapToSummary(notification);
  }

  
  async sendPlanChangeNotification(email: string, oldPlan: string, newPlan: string): Promise<void> {
    const subject = `Plan Changed: Welcome to ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}!`;
    const template = 'plan-change';
    
    await this.sendEmail({
      to: email,
      subject,
      template,
      data: {
        oldPlan: oldPlan.charAt(0).toUpperCase() + oldPlan.slice(1),
        newPlan: newPlan.charAt(0).toUpperCase() + newPlan.slice(1),
        changeDate: new Date().toLocaleDateString()
      }
    });
  }

  async sendCancellationConfirmation(email: string, plan: string): Promise<void> {
    const subject = 'Subscription Cancelled - We\'re Sorry to See You Go';
    
    await this.sendEmail({
      to: email,
      subject,
      template: 'cancellation-confirmation',
      data: {
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        cancelDate: new Date().toLocaleDateString()
      }
    });
  }

  async sendRenewalConfirmation(email: string, plan: string, amount: number): Promise<void> {
    const subject = 'Subscription Renewed Successfully';
    
    await this.sendEmail({
      to: email,
      subject,
      template: 'renewal-confirmation',
      data: {
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        amount: (amount / 100).toFixed(2), // Convert cents to dollars
        renewalDate: new Date().toLocaleDateString(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
      }
    });
  }

  async sendPaymentFailedNotification(email: string, invoiceId: string): Promise<void> {
    const subject = 'Payment Failed - Action Required';
    
    await this.sendEmail({
      to: email,
      subject,
      template: 'payment-failed',
      data: {
        invoiceId,
        failureDate: new Date().toLocaleDateString(),
        retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()
      }
    });
  }

  /**
 * Send welcome notification for new subscription
 */
async sendSubscriptionWelcome(businessId: string, tier: string): Promise<void> {
  try {
    // Get business details
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error('Business not found for subscription welcome');
    }

    const subject = `Welcome to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`;
    
    const templateData = {
      businessName: business.businessName || `${business.firstName} ${business.lastName}`,
      email: business.email,
      plan: tier.charAt(0).toUpperCase() + tier.slice(1),
      welcomeDate: new Date().toLocaleDateString(),
      // Plan-specific benefits
      planFeatures: this.getPlanFeatures(tier),
      // Support information
      supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      billingUrl: `${process.env.FRONTEND_URL}/billing`,
      year: new Date().getFullYear()
    };

    await this.sendEmail({
      to: business.email,
      subject,
      template: 'subscription-welcome',
      data: templateData
    });

    console.log(`Subscription welcome sent to: ${business.email} for ${tier} plan`);

  } catch (error) {
    console.error('Failed to send subscription welcome:', error);
    // Don't throw - this shouldn't break subscription creation
  }
}

/**
 * Send cancellation notification (enhanced version)
 */
async sendCancellationNotification(
  businessId: string, 
  effectiveDate: Date, 
  refund?: any,
  planName?: string  // Add this parameter
): Promise<void> {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error('Business not found for cancellation notification');
    }

    const plan = planName || 'subscription'; // Use passed plan or default

    const subject = 'Subscription Cancelled - We\'re Sorry to See You Go';
    
    const templateData = {
      businessName: business.businessName || `${business.firstName} ${business.lastName}`,
      email: business.email,
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      cancelDate: new Date().toLocaleDateString(),
      effectiveDate: effectiveDate.toLocaleDateString(),
      hasRefund: !!refund,
      refundAmount: refund ? (refund.amount / 100).toFixed(2) : null,
      feedbackUrl: `${process.env.FRONTEND_URL}/feedback`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
      reactivationUrl: `${process.env.FRONTEND_URL}/billing`,
      year: new Date().getFullYear()
    };

    await this.sendEmail({
      to: business.email,
      subject,
      template: 'subscription-cancellation',
      data: templateData  // Use 'data' not 'templateData'
    });

    console.log(`Cancellation notification sent to: ${business.email}`);

  } catch (error) {
    console.error('Failed to send cancellation notification:', error);
  }
}

/**
 * Send account deletion confirmation
 */
async sendAccountDeletionConfirmation(email: string, reason?: string): Promise<void> {
  try {
    const subject = 'Account Deletion Confirmation';
    
    const templateData = {
      email,
      deletionDate: new Date().toLocaleDateString(),
      deletionReason: reason || 'User requested account deletion',
      dataRetentionPeriod: '30 days',
      reactivationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
      year: new Date().getFullYear()
    };

    await this.sendEmail({
      to: email,
      subject,
      template: 'account-deletion',
      data: templateData
    });

    console.log(`Account deletion confirmation sent to: ${email}`);

  } catch (error) {
    console.error('Failed to send account deletion confirmation:', error);
    // Don't throw - this shouldn't break account deletion
  }
}

  /**
   * Helper methods
   */
  private buildUserQuery(businessId?: string, manufacturerId?: string): any {
    const query: any = {};
    
    if (businessId && manufacturerId) {
      query.$or = [
        { business: new Types.ObjectId(businessId) },
        { manufacturer: new Types.ObjectId(manufacturerId) }
      ];
    } else if (businessId) {
      query.business = new Types.ObjectId(businessId);
    } else if (manufacturerId) {
      query.manufacturer = new Types.ObjectId(manufacturerId);
    }

    return query;
  }

  /**
 * Get verification submission email template
 */
private getVerificationSubmissionEmailTemplate(
  verificationType: string, 
  submissionData?: any
): EmailTemplate {
  const typeLabels = {
    business: 'Business Verification',
    identity: 'Identity Verification', 
    wallet: 'Wallet Verification'
  };
  
  const typeLabel = typeLabels[verificationType as keyof typeof typeLabels] || 'Verification';
  const estimatedTime = submissionData?.estimatedReviewTime || '2-3 business days';
  const referenceId = submissionData?.referenceId || `VER_${Date.now()}`;

  return {
    subject: `${typeLabel} Submitted Successfully`,
    text: `Your ${typeLabel.toLowerCase()} has been submitted successfully.\n\nReference ID: ${referenceId}\nEstimated Review Time: ${estimatedTime}\n\nWe'll email you once the review is complete. You can check the status anytime in your dashboard.\n\nThank you for your patience!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">${typeLabel} Submitted ✅</h2>
        <p>Your <strong>${typeLabel.toLowerCase()}</strong> has been submitted successfully.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Reference ID:</strong> ${referenceId}</p>
          <p style="margin: 0 0 10px 0;"><strong>Estimated Review Time:</strong> ${estimatedTime}</p>
          ${submissionData?.documentsUploaded ? `<p style="margin: 0;"><strong>Documents Uploaded:</strong> ${submissionData.documentsUploaded.length}</p>` : ''}
        </div>

        <p>We'll email you once the review is complete. You can check the status anytime in your dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/account/verification" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Check Status</a>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center;">
          Thank you for your patience!
        </p>
      </div>
    `
  };
}

/**
 * Helper method to get plan features
 */
private getPlanFeatures(plan: string): string[] {
  const features = {
    foundation: [
      'Basic voting features',
      'Limited API access',
      'Community support'
    ],
    growth: [
      'Enhanced voting features',
      'Increased API limits',
      'Email support',
      'Basic analytics'
    ],
    premium: [
      'Advanced voting features',
      'Priority API access',
      'Priority support',
      'Advanced analytics',
      'Custom branding'
    ],
    enterprise: [
      'Full feature access',
      'Unlimited API access',
      'Dedicated support',
      'Custom integrations',
      'White-label options'
    ]
  };

  return features[plan as keyof typeof features] || features.foundation;
}

/**
 * Get account deactivation email template
 */
private getAccountDeactivationEmailTemplate(
  businessName: string,
  deactivationData: any
): EmailTemplate {
  const reactivationInfo = deactivationData.reactivationPossible 
    ? `Your account can be reactivated within ${deactivationData.dataRetentionPeriod || 30} days by contacting our support team.`
    : 'This deactivation is permanent and your data will be deleted.';

  return {
    subject: 'Account Deactivated - We\'re Sorry to See You Go',
    text: `Dear ${businessName},\n\nYour account has been successfully deactivated as requested.\n\nDeactivation Details:\n• Date: ${deactivationData.deactivatedAt.toLocaleDateString()}\n• Reference: ${deactivationData.id}\n${deactivationData.reason ? `• Reason: ${deactivationData.reason}` : ''}\n\n${reactivationInfo}\n\nIf you have any questions, please contact our support team.\n\nThank you for being part of our community.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">Account Deactivated</h2>
        <p>Dear <strong>${businessName}</strong>,</p>
        
        <p>Your account has been successfully deactivated as requested.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #555;">Deactivation Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${deactivationData.deactivatedAt.toLocaleDateString()}</p>
          <p style="margin: 0 0 10px 0;"><strong>Reference:</strong> ${deactivationData.id}</p>
          ${deactivationData.reason ? `<p style="margin: 0;"><strong>Reason:</strong> ${deactivationData.reason}</p>` : ''}
        </div>

        <div style="background: ${deactivationData.reactivationPossible ? '#d4edda' : '#f8d7da'}; border: 1px solid ${deactivationData.reactivationPossible ? '#c3e6cb' : '#f5c6cb'}; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: ${deactivationData.reactivationPossible ? '#155724' : '#721c24'};">
            ${reactivationInfo}
          </p>
        </div>

        ${deactivationData.reactivationPossible ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@yourcompany.com'}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Contact Support</a>
          </div>
        ` : ''}
        
        <p style="color: #666; font-size: 14px;">
          If you have any questions, please contact our support team.<br>
          Thank you for being part of our community.
        </p>
      </div>
    `
  };
}

/**
 * Get profile change email template
 */
private getProfileChangeEmailTemplate(
  businessName: string,
  changedFields: string[],
  changeData?: any
): EmailTemplate {
  const fieldLabels: Record<string, string> = {
    businessName: 'Business Name',
    email: 'Email Address',
    walletAddress: 'Wallet Address', 
    contactEmail: 'Contact Email',
    industry: 'Industry'
  };

  const changedFieldsList = changedFields.map(field => fieldLabels[field] || field).join(', ');
  const isSecurityRelevant = changedFields.some(field => ['email', 'walletAddress'].includes(field));
  const changeSource = changeData?.changeSource || 'user';

  return {
    subject: `Profile Updated - ${businessName}`,
    text: `Your profile has been updated.\n\nChanges Made:\n${changedFields.map(field => `• ${fieldLabels[field] || field}`).join('\n')}\n\nChange Date: ${new Date().toLocaleString()}\nChanged By: ${changeSource}\n\n${isSecurityRelevant ? 'This change affects your account security. If you didn\'t make this change, please contact support immediately.' : 'If you didn\'t make this change, please contact support.'}\n\nView your profile in the dashboard to see all details.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">Profile Updated</h2>
        <p>Hello <strong>${businessName}</strong>,</p>
        
        <p>Your profile has been updated with the following changes:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #555;">Changes Made</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${changedFields.map(field => `<li>${fieldLabels[field] || field}</li>`).join('')}
          </ul>
          <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
            <strong>Change Date:</strong> ${new Date().toLocaleString()}<br>
            <strong>Changed By:</strong> ${changeSource}
          </p>
        </div>

        ${isSecurityRelevant ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              ⚠️ <strong>Security Notice:</strong> This change affects your account security. If you didn't make this change, please contact support immediately.
            </p>
          </div>
        ` : `
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #0c5460;">
              If you didn't make this change, please contact support.
            </p>
          </div>
        `}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/account/profile" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">View Profile</a>
          <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@yourcompany.com'}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Contact Support</a>
        </div>
      </div>
    `
  };
}

  

  private buildNotificationQuery(
    businessId?: string,
    manufacturerId?: string,
    filters: NotificationFilters = {}
  ): any {
    const query = this.buildUserQuery(businessId, manufacturerId);

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.read !== undefined) {
      query.read = filters.read;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    return query;
  }

  private mapToSummary(notification: INotification): NotificationSummary {
    return {
      id: notification._id.toString(),
      type: notification.type,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt
    };
  }

   private async sendEmail(emailData: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<void> {
    try {
      // Implement with your email service (SendGrid, AWS SES, etc.)
      console.log(`Sending email: ${emailData.subject} to ${emailData.to}`);
      
      // Example with SendGrid:
      // await this.sendgrid.send({
      //   to: emailData.to,
      //   from: process.env.FROM_EMAIL!,
      //   subject: emailData.subject,
      //   templateId: this.getTemplateId(emailData.template),
      //   dynamicTemplateData: emailData.data
      // });
      
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  private getTemplateId(templateName: string): string {
    const templates = {
      'plan-change': process.env.SENDGRID_PLAN_CHANGE_TEMPLATE_ID!,
      'cancellation-confirmation': process.env.SENDGRID_CANCELLATION_TEMPLATE_ID!,
      'renewal-confirmation': process.env.SENDGRID_RENEWAL_TEMPLATE_ID!,
      'payment-failed': process.env.SENDGRID_PAYMENT_FAILED_TEMPLATE_ID!
    };
    
    return templates[templateName as keyof typeof templates] || '';
  }
}

