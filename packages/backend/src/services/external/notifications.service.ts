// src/services/external/notifications.service.ts
import nodemailer from 'nodemailer';
import { Business } from '../../models/business.model';
import { Manufacturer } from '../../models/manufacturer.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { Certificate } from '../../models/certificate.model';
import { Notification, INotification } from '../../models/notification.model';
import { PlanKey } from '../../constants/plans';
import { Types } from 'mongoose';
import { UtilsService } from '../utils/utils.service';
import path from 'path';
import stripe from 'stripe'

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export interface NotificationData {
  brandId?: string;
  manufacturerId?: string;
  proposalId?: string;
  certificateId?: string;
  plan?: string;
  subscriptionId?: string;
  messageId?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html?: string;
}

export interface EmailOptions {
  priority?: 'low' | 'normal' | 'high';
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  trackingEnabled?: boolean;
  retryCount?: number;
}

export interface BulkNotificationResult {
  sent: number;
  failed: number;
  errors: string[];
  details: Array<{
    email: string;
    status: 'sent' | 'failed';
    error?: string;
    retries?: number;
  }>;
}

// ✨ New interfaces for Web3 transfer notifications
export interface TransferNotificationData {
  certificateId: string;
  tokenId: string;
  brandWallet: string;
  txHash?: string;
  transferredAt?: Date;
  gasUsed?: string;
  transferTime?: number;
}

export interface TransferFailureData {
  certificateId: string;
  tokenId: string;
  error: string;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  gasWasted?: string;
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

/**
 * Enhanced external notifications service with Web3 transfer notifications
 * Handles email sending, Slack integration, webhooks, and notification tracking
 */
export class NotificationsService {

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Private Utility Methods                                                   */
  /** ─────────────────────────────────────────────────────────────────────────── */

  private validateEmailAddress(email: string): void {
    if (!email || !UtilsService.isValidEmail(email)) {
      throw { statusCode: 400, message: 'Invalid email address provided' };
    }
  }

  private validateUserId(userId: string, userType: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw { statusCode: 400, message: `Invalid ${userType} ID provided` };
    }
  }

  private sanitizeEmailContent(content: string): string {
    // Remove potentially dangerous content and normalize
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript: links
      .trim();
  }

  private logNotificationEvent(
    event: string, 
    recipient: string, 
    type: string, 
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const maskedRecipient = recipient.includes('@') ? UtilsService.maskEmail(recipient) : recipient;
    const timestamp = UtilsService.formatDate(new Date(), { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log(`[NOTIFICATIONS] ${timestamp} - ${event} - ${type} - ${maskedRecipient} - ${success ? 'SUCCESS' : 'FAILED'}${metadata ? ` - ${JSON.stringify(metadata)}` : ''}`);
  }

  private async retryEmailSend(
    emailFn: () => Promise<void>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<void> {
    return UtilsService.retry(emailFn, maxRetries, baseDelay);
  }

  private generateEmailId(): string {
    return UtilsService.generateSecureToken(16);
  }

  private formatCurrency(amount: number, currency: string = 'USD'): string {
    return UtilsService.formatCurrency(amount, currency);
  }

  private formatBlockchainAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private formatGasAmount(gasWei: string): string {
    try {
      const gasFloat = parseFloat(gasWei) / 1e18; // Convert wei to ETH
      return gasFloat.toFixed(6) + ' ETH';
    } catch {
      return gasWei + ' wei';
    }
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Core Email Methods                                                        */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Send a generic email with enhanced validation and tracking
   */
  async sendEmail(
    to: string, 
    subject: string, 
    text: string, 
    html?: string, 
    options: EmailOptions = {}
  ): Promise<void> {
    // Validate inputs
    this.validateEmailAddress(to);
    
    if (!subject || subject.trim().length === 0) {
      throw { statusCode: 400, message: 'Email subject is required' };
    }

    if (!text || text.trim().length === 0) {
      throw { statusCode: 400, message: 'Email content is required' };
    }

    // Normalize email and sanitize content
    const normalizedEmail = UtilsService.normalizeEmail(to);
    const sanitizedSubject = this.sanitizeEmailContent(subject);
    const sanitizedText = this.sanitizeEmailContent(text);
    const sanitizedHtml = html ? this.sanitizeEmailContent(html) : undefined;

    // Generate unique email ID for tracking
    const emailId = this.generateEmailId();

    const emailPayload: any = { 
      from: process.env.SMTP_USER, 
      to: normalizedEmail, 
      subject: sanitizedSubject, 
      text: sanitizedText,
      html: sanitizedHtml,
      headers: {
        'X-Email-ID': emailId,
        'X-Priority': options.priority === 'high' ? '1' : options.priority === 'low' ? '5' : '3'
      }
    };

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      emailPayload.attachments = options.attachments.map(att => ({
        filename: UtilsService.generateSlug(att.filename) + path.extname(att.filename),
        content: att.content,
        contentType: att.contentType
      }));
    }

    try {
      // Use retry mechanism for reliability
      const maxRetries = options.retryCount || 3;
      await this.retryEmailSend(
        async () => {
          await transport.sendMail(emailPayload);
        },
        maxRetries
      );

      this.logNotificationEvent('EMAIL_SENT', normalizedEmail, 'EMAIL', true, {
        emailId,
        subject: sanitizedSubject,
        priority: options.priority || 'normal'
      });

    } catch (error) {
      this.logNotificationEvent('EMAIL_FAILED', normalizedEmail, 'EMAIL', false, {
        emailId,
        error: error.message
      });
      throw new Error(`Failed to send email to ${UtilsService.maskEmail(normalizedEmail)}: ${error.message}`);
    }
  }

  /**
   * Send verification code email with enhanced security
   */
  async sendEmailCode(email: string, code: string): Promise<void> {
    this.validateEmailAddress(email);
    
    if (!code || code.length < 4) {
      throw { statusCode: 400, message: 'Invalid verification code provided' };
    }

    const template = this.getVerificationEmailTemplate(code);
    await this.sendEmail(email, template.subject, template.text, template.html, { 
      priority: 'high',
      trackingEnabled: true 
    });

    this.logNotificationEvent('VERIFICATION_CODE_SENT', email, 'VERIFICATION', true, {
      codeLength: code.length
    });
  }

  /**
   * Send password reset code email
   */
  async sendPasswordResetCode(email: string, resetCode: string): Promise<void> {
    this.validateEmailAddress(email);
    
    if (!resetCode || resetCode.length < 6) {
      throw { statusCode: 400, message: 'Invalid reset code provided' };
    }

    const template = this.getPasswordResetEmailTemplate(resetCode);
    await this.sendEmail(email, template.subject, template.text, template.html, { 
      priority: 'high',
      trackingEnabled: true 
    });

    this.logNotificationEvent('PASSWORD_RESET_SENT', email, 'PASSWORD_RESET', true);
  }

  /**
   * Send welcome email with personalization
   */
  async sendWelcomeEmail(email: string, name: string, userType: 'brand' | 'manufacturer'): Promise<void> {
    this.validateEmailAddress(email);
    
    if (!name || name.trim().length === 0) {
      throw { statusCode: 400, message: 'User name is required for welcome email' };
    }

    if (!['brand', 'manufacturer'].includes(userType)) {
      throw { statusCode: 400, message: 'Invalid user type specified' };
    }

    const formattedName = UtilsService.titleCase(name.trim());
    const template = this.getWelcomeEmailTemplate(formattedName, userType);
    
    await this.sendEmail(email, template.subject, template.text, template.html, { 
      priority: 'normal',
      trackingEnabled: true 
    });

    this.logNotificationEvent('WELCOME_EMAIL_SENT', email, `WELCOME_${userType.toUpperCase()}`, true, {
      userName: formattedName
    });
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** 🚀 New Web3 Transfer Notification Methods                                  */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * 🎉 NFT Transfer Success Notification
   */
  async sendTransferSuccessNotification(
    businessId: string,
    transferData: TransferNotificationData
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    try {
      const [business, brandSettings] = await Promise.all([
        Business.findById(businessId).select('businessName email'),
        BrandSettings.findOne({ business: businessId })
      ]);

      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      const notificationSettings = brandSettings?.getTransferSettings()?.notificationSettings;
      
      // Send email notification if enabled
      if (notificationSettings?.emailNotifications && notificationSettings?.notifyOnSuccess) {
        const template = this.getTransferSuccessEmailTemplate(transferData);
        
        if (business.email && UtilsService.isValidEmail(business.email)) {
          await this.sendEmail(business.email, template.subject, template.text, template.html, {
            priority: 'normal',
            trackingEnabled: true
          });
        }
      }

      // Send Slack notification if configured
      if (notificationSettings?.slackIntegration?.enabled) {
        await this.sendSlackTransferNotification(brandSettings, transferData, 'success');
      }

      // Send webhook notification if configured
      if (notificationSettings?.webhookNotifications && notificationSettings?.webhookUrl) {
        await this.sendWebhookNotification(notificationSettings.webhookUrl, {
          event: 'transfer_success',
          businessId,
          data: transferData
        });
      }

      // Create in-app notification
      await this.createInAppNotification({
        business: businessId,
        type: 'transfer_success',
        message: `NFT certificate ${transferData.tokenId} successfully transferred to your wallet`,
        data: UtilsService.cleanObject({
          certificateId: transferData.certificateId,
          tokenId: transferData.tokenId,
          brandWallet: transferData.brandWallet,
          txHash: transferData.txHash,
          transferredAt: transferData.transferredAt,
          gasUsed: transferData.gasUsed
        }),
        read: false
      });

      // Update brand transfer analytics
      if (brandSettings) {
        await brandSettings.updateTransferAnalytics({
          success: true,
          gasUsed: transferData.gasUsed,
          transferTime: transferData.transferTime
        });
      }

      this.logNotificationEvent('TRANSFER_SUCCESS_NOTIFICATION', business.email, 'WEB3_TRANSFER', true, {
        businessId,
        certificateId: transferData.certificateId,
        tokenId: transferData.tokenId,
        txHash: transferData.txHash
      });

    } catch (error) {
      console.error('Failed to send transfer success notification:', error);
      this.logNotificationEvent('TRANSFER_SUCCESS_NOTIFICATION', businessId, 'WEB3_TRANSFER', false, {
        error: error.message
      });
    }
  }

  /**
   * ⚠️ NFT Transfer Failure Notification
   */
  async sendTransferFailureNotification(
    businessId: string,
    failureData: TransferFailureData
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    try {
      const [business, brandSettings] = await Promise.all([
        Business.findById(businessId).select('businessName email'),
        BrandSettings.findOne({ business: businessId })
      ]);

      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      const notificationSettings = brandSettings?.getTransferSettings()?.notificationSettings;
      const isUrgent = failureData.attemptNumber >= failureData.maxAttempts;
      
      // Send email notification if enabled
      if (notificationSettings?.emailNotifications && notificationSettings?.notifyOnFailure) {
        const template = this.getTransferFailureEmailTemplate(failureData);
        
        if (business.email && UtilsService.isValidEmail(business.email)) {
          await this.sendEmail(business.email, template.subject, template.text, template.html, {
            priority: isUrgent ? 'high' : 'normal',
            trackingEnabled: true
          });
        }
      }

      // Send Slack notification if configured
      if (notificationSettings?.slackIntegration?.enabled) {
        await this.sendSlackTransferNotification(brandSettings, failureData, 'failure');
      }

      // Send webhook notification if configured
      if (notificationSettings?.webhookNotifications && notificationSettings?.webhookUrl) {
        await this.sendWebhookNotification(notificationSettings.webhookUrl, {
          event: 'transfer_failure',
          businessId,
          data: failureData
        });
      }

      // Create in-app notification
      await this.createInAppNotification({
        business: businessId,
        type: 'transfer_failure',
        message: `NFT certificate ${failureData.tokenId} transfer failed (attempt ${failureData.attemptNumber}/${failureData.maxAttempts})`,
        data: UtilsService.cleanObject({
          certificateId: failureData.certificateId,
          tokenId: failureData.tokenId,
          error: failureData.error,
          attemptNumber: failureData.attemptNumber,
          maxAttempts: failureData.maxAttempts,
          nextRetryAt: failureData.nextRetryAt,
          isUrgent
        }),
        read: false
      });

      // Update brand transfer analytics
      if (brandSettings) {
        await brandSettings.updateTransferAnalytics({
          success: false,
          gasUsed: failureData.gasWasted
        });
      }

      this.logNotificationEvent('TRANSFER_FAILURE_NOTIFICATION', business.email, 'WEB3_TRANSFER', true, {
        businessId,
        certificateId: failureData.certificateId,
        tokenId: failureData.tokenId,
        error: failureData.error,
        attemptNumber: failureData.attemptNumber
      });

    } catch (error) {
      console.error('Failed to send transfer failure notification:', error);
      this.logNotificationEvent('TRANSFER_FAILURE_NOTIFICATION', businessId, 'WEB3_TRANSFER', false, {
        error: error.message
      });
    }
  }

  async sendCertificateRevocationNotification(businessId: string, data: any): Promise<void> {
  console.log('sendCertificateRevocationNotification called - stub implementation');
}

async sendSettingsChangeNotification(businessId: string, changes: any): Promise<void> {
  console.log('sendSettingsChangeNotification called - stub implementation');
}

  /**
   * 🔄 NFT Transfer Retry Notification
   */
  async sendTransferRetryNotification(
    businessId: string,
    retryData: Omit<TransferFailureData, 'error'> & { previousError: string }
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    try {
      const [business, brandSettings] = await Promise.all([
        Business.findById(businessId).select('businessName email'),
        BrandSettings.findOne({ business: businessId })
      ]);

      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      const notificationSettings = brandSettings?.getTransferSettings()?.notificationSettings;
      
      // Only send if retry notifications are enabled
      if (notificationSettings?.notifyOnRetry) {
        // Send email notification if enabled
        if (notificationSettings?.emailNotifications) {
          const template = this.getTransferRetryEmailTemplate(retryData);
          
          if (business.email && UtilsService.isValidEmail(business.email)) {
            await this.sendEmail(business.email, template.subject, template.text, template.html, {
              priority: 'normal',
              trackingEnabled: true
            });
          }
        }

        // Send Slack notification if configured
        if (notificationSettings?.slackIntegration?.enabled) {
          await this.sendSlackTransferNotification(brandSettings, retryData, 'retry');
        }

        // Create in-app notification
        await this.createInAppNotification({
          business: businessId,
          type: 'transfer_retry',
          message: `Retrying NFT certificate ${retryData.tokenId} transfer (attempt ${retryData.attemptNumber}/${retryData.maxAttempts})`,
          data: UtilsService.cleanObject({
            certificateId: retryData.certificateId,
            tokenId: retryData.tokenId,
            attemptNumber: retryData.attemptNumber,
            maxAttempts: retryData.maxAttempts,
            previousError: retryData.previousError,
            nextRetryAt: retryData.nextRetryAt
          }),
          read: false
        });
      }

      this.logNotificationEvent('TRANSFER_RETRY_NOTIFICATION', business.email, 'WEB3_TRANSFER', true, {
        businessId,
        certificateId: retryData.certificateId,
        tokenId: retryData.tokenId,
        attemptNumber: retryData.attemptNumber
      });

    } catch (error) {
      console.error('Failed to send transfer retry notification:', error);
      this.logNotificationEvent('TRANSFER_RETRY_NOTIFICATION', businessId, 'WEB3_TRANSFER', false, {
        error: error.message
      });
    }
  }

  /**
   * 💼 Wallet Connection/Verification Notifications
   */
  async sendWalletChangeNotification(
    businessId: string,
    walletData: {
      previousWallet?: string;
      newWallet: string;
      changeDate: Date;
      verificationStatus?: 'verified' | 'pending' | 'failed';
    }
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    try {
      const business = await Business.findById(businessId).select('businessName email');
      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      const template = this.getWalletChangeEmailTemplate(walletData);
      
      if (business.email && UtilsService.isValidEmail(business.email)) {
        await this.sendEmail(business.email, template.subject, template.text, template.html, {
          priority: 'high',
          trackingEnabled: true
        });
      }

      // Create in-app notification
      await this.createInAppNotification({
        business: businessId,
        type: 'wallet_change',
        message: walletData.previousWallet 
          ? `Web3 wallet updated successfully` 
          : `Web3 wallet connected successfully`,
        data: UtilsService.cleanObject({
          previousWallet: walletData.previousWallet,
          newWallet: walletData.newWallet,
          changeDate: walletData.changeDate,
          verificationStatus: walletData.verificationStatus || 'pending'
        }),
        read: false
      });

      this.logNotificationEvent('WALLET_CHANGE_NOTIFICATION', business.email, 'WEB3_WALLET', true, {
        businessId,
        walletChanged: !!walletData.previousWallet,
        verificationStatus: walletData.verificationStatus
      });

    } catch (error) {
      console.error('Failed to send wallet change notification:', error);
      this.logNotificationEvent('WALLET_CHANGE_NOTIFICATION', businessId, 'WEB3_WALLET', false, {
        error: error.message
      });
    }
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** 📱 Slack Integration Methods                                               */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Send Slack notification for transfer events
   */
  private async sendSlackTransferNotification(
    brandSettings: any,
    data: any,
    eventType: 'success' | 'failure' | 'retry'
  ): Promise<void> {
    const slackConfig = brandSettings?.transferPreferences?.notificationSettings?.slackIntegration;
    
    if (!slackConfig?.enabled || !slackConfig?.webhookUrl) {
      return;
    }

    const notification = this.buildSlackTransferMessage(data, eventType);
    
    try {
      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notification,
          channel: slackConfig.channel || '#general'
        })
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      this.logNotificationEvent('SLACK_NOTIFICATION', slackConfig.channel, 'SLACK', true, {
        eventType,
        tokenId: data.tokenId
      });

    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      this.logNotificationEvent('SLACK_NOTIFICATION', slackConfig.channel, 'SLACK', false, {
        error: error.message
      });
    }
  }

  private buildSlackTransferMessage(data: any, eventType: 'success' | 'failure' | 'retry'): SlackNotification {
    const baseMessage = {
      username: 'Ordira NFT Bot',
      iconEmoji: ':zap:'
    };

    switch (eventType) {
      case 'success':
        return {
          ...baseMessage,
          text: `✅ NFT Transfer Successful`,
          attachments: [{
            color: 'good',
            title: `Certificate ${data.tokenId}`,
            fields: [
              { title: 'Token ID', value: data.tokenId, short: true },
              { title: 'Wallet', value: this.formatBlockchainAddress(data.brandWallet), short: true },
              { title: 'Gas Used', value: data.gasUsed ? this.formatGasAmount(data.gasUsed) : 'N/A', short: true },
              { title: 'Tx Hash', value: `<https://basescan.io/tx/${data.txHash}|View on Basescan>`, short: false }
            ]
          }]
        };

      case 'failure':
        return {
          ...baseMessage,
          text: `❌ NFT Transfer Failed`,
          attachments: [{
            color: 'danger',
            title: `Certificate ${data.tokenId}`,
            fields: [
              { title: 'Token ID', value: data.tokenId, short: true },
              { title: 'Attempt', value: `${data.attemptNumber}/${data.maxAttempts}`, short: true },
              { title: 'Error', value: data.error.substring(0, 100), short: false },
              { title: 'Next Retry', value: data.nextRetryAt ? new Date(data.nextRetryAt).toLocaleString() : 'No retry scheduled', short: false }
            ]
          }]
        };

      case 'retry':
        return {
          ...baseMessage,
          text: `🔄 NFT Transfer Retry`,
          attachments: [{
            color: 'warning',
            title: `Certificate ${data.tokenId}`,
            fields: [
              { title: 'Token ID', value: data.tokenId, short: true },
              { title: 'Attempt', value: `${data.attemptNumber}/${data.maxAttempts}`, short: true },
              { title: 'Previous Error', value: data.previousError.substring(0, 100), short: false }
            ]
          }]
        };

      default:
        return baseMessage;
    }
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** 🌐 Webhook Integration Methods                                             */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    webhookUrl: string,
    payload: {
      event: string;
      businessId: string;
      data: any;
      timestamp?: string;
    }
  ): Promise<void> {
    try {
      const webhookPayload = {
        ...payload,
        timestamp: payload.timestamp || new Date().toISOString(),
        version: '1.0'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ordira-Webhook/1.0'
        },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
      }

      this.logNotificationEvent('WEBHOOK_NOTIFICATION', webhookUrl, 'WEBHOOK', true, {
        event: payload.event,
        businessId: payload.businessId
      });

    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      this.logNotificationEvent('WEBHOOK_NOTIFICATION', webhookUrl, 'WEBHOOK', false, {
        error: error.message
      });
    }
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Existing Business Notification Methods (Enhanced)                         */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * 1️⃣ New invite sent by Brand → notify Manufacturer (Enhanced)
   */
  async notifyManufacturerOfInvite(brandId: string, manufacturerId: string): Promise<void> {
    this.validateUserId(brandId, 'brand');
    this.validateUserId(manufacturerId, 'manufacturer');

    const [brand, mfg] = await Promise.all([
      Business.findById(brandId).select('businessName email industry'),
      Manufacturer.findById(manufacturerId).select('name email industry')
    ]);
    
    if (!brand || !mfg) {
      throw { statusCode: 404, message: 'Brand or manufacturer not found' };
    }

    const formattedBrandName = UtilsService.titleCase(brand.businessName);
    const template = this.getInviteEmailTemplate(formattedBrandName, 'manufacturer');
    
    if (mfg.email && UtilsService.isValidEmail(mfg.email)) {
      await this.sendEmail(mfg.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    // Create enhanced in-app notification
    await this.createInAppNotification({
      manufacturer: manufacturerId,
      type: 'invite',
      message: template.text,
      data: UtilsService.cleanObject({ 
        brandId, 
        brandName: formattedBrandName,
        brandIndustry: brand.industry,
        inviteDate: new Date().toISOString()
      }),
      read: false
    });

    this.logNotificationEvent('MANUFACTURER_INVITE_SENT', mfg.email, 'BUSINESS_INVITE', true, {
      brandId,
      manufacturerId,
      brandName: formattedBrandName
    });
  }

  /**
   * 4️⃣ Certificate minted → notify Brand (Enhanced with transfer status)
   */
  async notifyBrandOfCertificateMinted(
    businessId: string, 
    certificateId: string,
    certificateData?: {
      tokenId?: string;
      txHash?: string;
      recipient?: string;
      transferScheduled?: boolean;
      brandWallet?: string;
      autoTransferEnabled?: boolean;
    }
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    if (!certificateId || certificateId.trim().length === 0) {
      throw { statusCode: 400, message: 'Valid certificate ID is required' };
    }

    const [business, brandSettings] = await Promise.all([
      Business.findById(businessId).select('businessName email'),
      BrandSettings.findOne({ business: businessId })
    ]);
    
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const template = this.getCertificateMintedEmailTemplate(certificateId, certificateData);
    
    if (business.email && UtilsService.isValidEmail(business.email)) {
      await this.sendEmail(business.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    // Create enhanced in-app notification with transfer status
    await this.createInAppNotification({
      business: businessId,
      type: 'certificate',
      message: template.text,
      data: UtilsService.cleanObject({ 
        certificateId,
        mintTimestamp: new Date().toISOString(),
        hasWeb3: brandSettings?.hasWeb3Features() || false,
        transferScheduled: certificateData?.transferScheduled || false,
        autoTransferEnabled: certificateData?.autoTransferEnabled || false,
        ...certificateData
      }),
      read: false
    });

    this.logNotificationEvent('CERTIFICATE_MINTED', business.email, 'BLOCKCHAIN', true, {
      businessId,
      certificateId,
      transferScheduled: certificateData?.transferScheduled,
      hasWeb3: brandSettings?.hasWeb3Features()
    });
  }

  // [Previous methods continue...]

  /**
   * 2️⃣ Invite accepted → notify Brand (Enhanced)
   */
  async notifyBrandOfInviteAccepted(manufacturerId: string, brandId: string): Promise<void> {
    this.validateUserId(manufacturerId, 'manufacturer');
    this.validateUserId(brandId, 'brand');

    const [mfg, biz] = await Promise.all([
      Manufacturer.findById(manufacturerId).select('name email industry servicesOffered'),
      Business.findById(brandId).select('businessName email')
    ]);
    
    if (!mfg || !biz) {
      throw { statusCode: 404, message: 'Manufacturer or business not found' };
    }

    const formattedMfgName = UtilsService.titleCase(mfg.name);
    const template = this.getInviteAcceptedEmailTemplate(formattedMfgName);
    
    if (biz.email && UtilsService.isValidEmail(biz.email)) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    await this.createInAppNotification({
      business: brandId,
      type: 'invite_accepted',
      message: template.text,
      data: UtilsService.cleanObject({ 
        manufacturerId, 
        manufacturerName: formattedMfgName,
        manufacturerIndustry: mfg.industry,
        servicesOffered: mfg.servicesOffered,
        connectionDate: new Date().toISOString()
      }),
      read: false
    });

    this.logNotificationEvent('BRAND_INVITE_ACCEPTED', biz.email, 'BUSINESS_CONNECTION', true, {
      brandId,
      manufacturerId,
      manufacturerName: formattedMfgName
    });
  }

  /**
   * 3️⃣ New vote received → notify Brand (Enhanced)
   */
  async notifyBrandOfNewVote(businessId: string, proposalId: string, voteData?: {
    voterCount?: number;
    voteType?: 'for' | 'against' | 'abstain';
    totalVotes?: number;
  }): Promise<void> {
    this.validateUserId(businessId, 'business');

    if (!proposalId || proposalId.trim().length === 0) {
      throw { statusCode: 400, message: 'Valid proposal ID is required' };
    }

    const biz = await Business.findById(businessId).select('businessName email');
    if (!biz) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const template = this.getNewVoteEmailTemplate(proposalId, voteData);
    
    if (biz.email && UtilsService.isValidEmail(biz.email)) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    await this.createInAppNotification({
      business: businessId,
      type: 'vote',
      message: template.text,
      data: UtilsService.cleanObject({ 
        proposalId,
        voteTimestamp: new Date().toISOString(),
        ...voteData
      }),
      read: false
    });

    this.logNotificationEvent('NEW_VOTE_NOTIFICATION', biz.email, 'VOTING', true, {
      businessId,
      proposalId,
      voteData
    });
  }

  /**
   * 5️⃣ Plan renewal processed → notify Brand (Enhanced)
   */
  async notifyBrandOfRenewal(subscriptionId: string): Promise<void> {
    if (!subscriptionId || subscriptionId.trim().length === 0) {
      throw { statusCode: 400, message: 'Valid subscription ID is required' };
    }

    const settings = await BrandSettings.findOne({ stripeSubscriptionId: subscriptionId })
      .populate<{ business: any }>('business', 'businessName email plan');
    
    if (!settings?.business) {
      throw { statusCode: 404, message: 'Brand settings or business not found' };
    }

    const biz = settings.business;
    const plan = settings.plan as PlanKey;
    const template = this.getPlanRenewalEmailTemplate(plan);
    
    if (biz.email && UtilsService.isValidEmail(biz.email)) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    await this.createInAppNotification({
      business: biz._id.toString(),
      type: 'billing_renewal',
      message: template.text,
      data: UtilsService.cleanObject({ 
        plan, 
        subscriptionId,
        renewalDate: new Date().toISOString(),
        businessName: biz.businessName
      }),
      read: false
    });

    this.logNotificationEvent('PLAN_RENEWAL', biz.email, 'BILLING', true, {
      businessId: biz._id.toString(),
      plan,
      subscriptionId
    });
  }

  async sendPaymentFailedNotification(subscriptionIdOrEmail: string, failureData?: any): Promise<void> {
  try {
    let email: string;
    let businessName: string = 'Valued Customer';
    let invoiceId: string = 'Unknown';
    let attemptCount: number = 1;
    let amount: number = 0;
    let nextRetryDate: Date | null = null;

    // Handle different parameter patterns
    if (subscriptionIdOrEmail.includes('@')) {
      // First parameter is email
      email = subscriptionIdOrEmail;
      if (failureData) {
        invoiceId = failureData.invoiceId || failureData;
        attemptCount = failureData.attemptCount || 1;
        amount = failureData.amount || 0;
        nextRetryDate = failureData.nextRetryDate || null;
        businessName = failureData.businessName || businessName;
      }
    } else if (subscriptionIdOrEmail.startsWith('sub_')) {
      // First parameter is subscription ID
      const subscriptionId = subscriptionIdOrEmail;
      
      // Get subscription details from Stripe
      const subscription = await this.getSubscriptionDetails(subscriptionId);
      const businessId = subscription.metadata?.businessId;
      
      if (!businessId) {
        throw new Error('Business ID not found in subscription metadata');
      }

      // Get business details
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      email = business.email;
      businessName = business.businessName || `${business.firstName} ${business.lastName}`;
      
      // If failureData is provided, use it; otherwise get from Stripe
      if (failureData) {
        invoiceId = failureData.invoiceId || failureData;
        attemptCount = failureData.attemptCount || 1;
        amount = failureData.amount || 0;
      }
    } else {
      // Assume it's a business ID
      const business = await Business.findById(subscriptionIdOrEmail);
      if (!business) {
        throw new Error(`Business not found: ${subscriptionIdOrEmail}`);
      }
      
      email = business.email;
      businessName = business.businessName || `${business.firstName} ${business.lastName}`;
      
      if (failureData) {
        invoiceId = failureData.invoiceId || failureData;
        attemptCount = failureData.attemptCount || 1;
        amount = failureData.amount || 0;
      }
    }

    const subject = `Payment Failed - Action Required ${attemptCount > 1 ? `(Attempt ${attemptCount})` : ''}`;
    
    const templateData = {
      businessName,
      email,
      invoiceId,
      attemptCount,
      amount: (amount / 100).toFixed(2), // Convert cents to dollars
      currency: 'USD',
      failureDate: new Date().toLocaleDateString(),
      nextRetryDate: nextRetryDate ? nextRetryDate.toLocaleDateString() : 'within 3-5 business days',
      
      // Urgency and action items
      isFirstAttempt: attemptCount === 1,
      isSecondAttempt: attemptCount === 2,
      isFinalWarning: attemptCount >= 3,
      
      // URLs for action
      updatePaymentUrl: `${process.env.FRONTEND_URL}/billing/payment-methods`,
      accountUrl: `${process.env.FRONTEND_URL}/billing`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
      supportPhone: process.env.SUPPORT_PHONE || '1-800-SUPPORT',
      
      // Additional info
      year: new Date().getFullYear(),
      companyName: process.env.COMPANY_NAME || 'Your Company'
    };

    await this.sendEmail({
      to: email,
      subject,
      template: 'payment-failed',
      data: templateData
    });

    console.log(`Payment failure notification sent to: ${email} (attempt ${attemptCount})`);

  } catch (error) {
    console.error('Failed to send payment failure notification:', {
      subscriptionIdOrEmail,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Don't throw - payment failure processing should continue
  }
}

/**
 * Send verification submission confirmation email
 * Called when a business submits documents for verification
 */
async sendVerificationSubmissionConfirmation(
  businessId: string, 
  verificationType: 'business' | 'identity' | 'wallet',
  submissionData?: {
    documentsUploaded?: string[];
    estimatedReviewTime?: string;
    referenceId?: string;
  }
): Promise<void> {
  this.validateUserId(businessId, 'business');

  if (!['business', 'identity', 'wallet'].includes(verificationType)) {
    throw { statusCode: 400, message: 'Invalid verification type specified' };
  }

  try {
    const business = await Business.findById(businessId).select('businessName email');
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const template = this.getVerificationSubmissionEmailTemplate(verificationType, submissionData);
    
    if (business.email && UtilsService.isValidEmail(business.email)) {
      await this.sendEmail(business.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    // Create in-app notification
    await this.createInAppNotification({
      business: businessId,
      type: 'verification_submitted',
      message: template.text,
      data: UtilsService.cleanObject({
        verificationType,
        submissionDate: new Date().toISOString(),
        referenceId: submissionData?.referenceId,
        estimatedReviewTime: submissionData?.estimatedReviewTime,
        documentsCount: submissionData?.documentsUploaded?.length || 0
      }),
      read: false
    });

    this.logNotificationEvent('VERIFICATION_SUBMISSION_SENT', business.email, 'VERIFICATION', true, {
      businessId,
      verificationType,
      submissionData
    });

    console.log(`Verification submission confirmation sent for business ${businessId}: ${verificationType}`);
  } catch (error) {
    console.error('Failed to send verification submission confirmation:', error);
    this.logNotificationEvent('VERIFICATION_SUBMISSION_FAILED', businessId, 'VERIFICATION', false, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Send account deactivation confirmation email
 * Called when a business account is deactivated
 */
async sendAccountDeactivationConfirmation(
  businessId: string,
  deactivationData: {
    reason?: string;
    feedback?: string;
    deactivatedAt: Date;
    reactivationPossible: boolean;
    dataRetentionPeriod?: number; // in days
    id: string;
  }
): Promise<void> {
  this.validateUserId(businessId, 'business');

  try {
    const business = await Business.findById(businessId).select('businessName email');
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const template = this.getAccountDeactivationEmailTemplate(business.businessName, deactivationData);
    
    if (business.email && UtilsService.isValidEmail(business.email)) {
      await this.sendEmail(business.email, template.subject, template.text, template.html, {
        priority: 'high',
        trackingEnabled: true
      });
    }

    // Create in-app notification (if account isn't immediately deleted)
    if (deactivationData.reactivationPossible) {
      await this.createInAppNotification({
        business: businessId,
        type: 'account_deactivated',
        message: template.text,
        data: UtilsService.cleanObject({
          deactivationId: deactivationData.id,
          deactivatedAt: deactivationData.deactivatedAt.toISOString(),
          reason: deactivationData.reason,
          reactivationPossible: deactivationData.reactivationPossible,
          dataRetentionPeriod: deactivationData.dataRetentionPeriod
        }),
        read: false
      });
    }

    this.logNotificationEvent('ACCOUNT_DEACTIVATION_SENT', business.email, 'ACCOUNT_MANAGEMENT', true, {
      businessId,
      deactivationId: deactivationData.id,
      reason: deactivationData.reason,
      reactivationPossible: deactivationData.reactivationPossible
    });

    console.log(`Account deactivation confirmation sent for business ${businessId}`);
  } catch (error) {
    console.error('Failed to send account deactivation confirmation:', error);
    this.logNotificationEvent('ACCOUNT_DEACTIVATION_FAILED', businessId, 'ACCOUNT_MANAGEMENT', false, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Send profile change notification email
 * Called when significant profile changes are made
 */
async sendProfileChangeNotification(
  businessId: string,
  changedFields: string[],
  changeData?: {
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changeSource?: 'user' | 'admin' | 'system';
    ipAddress?: string;
  }
): Promise<void> {
  this.validateUserId(businessId, 'business');

  if (!changedFields || changedFields.length === 0) {
    throw { statusCode: 400, message: 'Changed fields are required' };
  }

  try {
    const business = await Business.findById(businessId).select('businessName email');
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    // Only send notification for significant changes
    const significantFields = ['businessName', 'email', 'walletAddress', 'contactEmail', 'industry'];
    const significantChanges = changedFields.filter(field => significantFields.includes(field));
    
    if (significantChanges.length === 0) {
      console.log(`No significant profile changes for business ${businessId}, skipping notification`);
      return;
    }

    const template = this.getProfileChangeEmailTemplate(business.businessName, significantChanges, changeData);
    
    if (business.email && UtilsService.isValidEmail(business.email)) {
      await this.sendEmail(business.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    // Create in-app notification
    await this.createInAppNotification({
      business: businessId,
      type: 'profile_changed',
      message: template.text,
      data: UtilsService.cleanObject({
        changedFields: significantChanges,
        changeDate: new Date().toISOString(),
        changeSource: changeData?.changeSource || 'user',
        securityRelevant: significantChanges.some(field => ['email', 'walletAddress'].includes(field)),
        ipAddress: changeData?.ipAddress
      }),
      read: false
    });

    this.logNotificationEvent('PROFILE_CHANGE_SENT', business.email, 'PROFILE_MANAGEMENT', true, {
      businessId,
      changedFields: significantChanges,
      changeSource: changeData?.changeSource,
      securityRelevant: significantChanges.some(field => ['email', 'walletAddress'].includes(field))
    });

    console.log(`Profile change notification sent for business ${businessId}: ${significantChanges.join(', ')}`);
  } catch (error) {
    console.error('Failed to send profile change notification:', error);
    this.logNotificationEvent('PROFILE_CHANGE_FAILED', businessId, 'PROFILE_MANAGEMENT', false, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

  async sendRenewalConfirmation(subscriptionIdOrEmail: string, planOrAmount?: string | number, amount?: number): Promise<void> {
  try {
    let email: string;
    let businessName: string = 'Valued Customer';
    let plan: string;
    let renewalAmount: number;

    // Handle different parameter patterns
    if (subscriptionIdOrEmail.includes('@')) {
      // First parameter is email (from BillingService call pattern)
      email = subscriptionIdOrEmail;
      plan = planOrAmount as string || 'subscription';
      renewalAmount = amount || 0;
    } else if (subscriptionIdOrEmail.startsWith('sub_')) {
      // First parameter is subscription ID (from your current call)
      const subscriptionId = subscriptionIdOrEmail;
      
      // Get subscription details from Stripe
      const subscription = await this.getSubscriptionDetails(subscriptionId);
      const businessId = subscription.metadata?.businessId;
      
      if (!businessId) {
        throw new Error('Business ID not found in subscription metadata');
      }

      // Get business details
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      email = business.email;
      businessName = business.businessName || `${business.firstName} ${business.lastName}`;
      plan = subscription.metadata?.plan || 'subscription';
      renewalAmount = subscription.items.data[0]?.price?.unit_amount || 0;
    } else {
      // Assume it's a business ID
      const business = await Business.findById(subscriptionIdOrEmail);
      if (!business) {
        throw new Error(`Business not found: ${subscriptionIdOrEmail}`);
      }
      
      email = business.email;
      businessName = business.businessName || `${business.firstName} ${business.lastName}`;
      plan = planOrAmount as string || 'subscription';
      renewalAmount = amount || 0;
    }

    const subject = 'Subscription Renewed Successfully';
    
    const templateData = {
      businessName,
      email,
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      amount: (renewalAmount / 100).toFixed(2), // Convert cents to dollars
      currency: 'USD',
      renewalDate: new Date().toLocaleDateString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 30 days from now
      billingPeriod: '30 days',
      
      // Account info
      accountUrl: `${process.env.FRONTEND_URL}/billing`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
      
      // Additional info
      year: new Date().getFullYear(),
      companyName: process.env.COMPANY_NAME || 'Your Company'
    };

    await this.sendEmail({
      to: email,
      subject,
      template: 'subscription-renewal',
      data: templateData
    });

    console.log(`Renewal confirmation sent successfully to: ${email}`);

  } catch (error) {
    console.error('Failed to send renewal confirmation:', {
      subscriptionIdOrEmail,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
  }
}

  async sendCancellationConfirmation(businessIdOrEmail: string, cancellationData: any): Promise<void> {
  try {
    let email: string;
    let businessName: string = 'Valued Customer';

    // Check if first parameter is email or businessId
    if (businessIdOrEmail.includes('@')) {
      email = businessIdOrEmail;
    } else {
      // It's a businessId, get the business details
      const business = await Business.findById(businessIdOrEmail);
      if (!business) {
        throw new Error('Business not found for cancellation confirmation');
      }
      email = business.email;
      businessName = business.businessName || business.firstName + ' ' + business.lastName;
    }

    const subject = 'Subscription Cancelled - We\'re Sorry to See You Go';
    
    const templateData = {
      businessName,
      email,
      plan: cancellationData.plan || 'subscription',
      cancelDate: new Date().toLocaleDateString(),
      effectiveDate: cancellationData.effectiveDate || new Date().toLocaleDateString(),
      refundAmount: cancellationData.refundAmount || null,
      finalBillingDate: cancellationData.finalBillingDate || null,
      // Feedback and support
      feedbackUrl: `${process.env.FRONTEND_URL}/feedback`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
      // Re-activation info
      reactivationUrl: `${process.env.FRONTEND_URL}/billing`,
      year: new Date().getFullYear()
    };

    await this.sendEmail({
      to: email,
      subject,
      template: 'cancellation-confirmation',
      templateData
    });

    console.log(`Cancellation confirmation sent to: ${email}`);

  } catch (error) {
    console.error('Failed to send cancellation confirmation:', {
      businessIdOrEmail,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

  async sendPlanChangeNotification(email: string, oldPlan: string, newPlan: string, changeType?: 'upgrade' | 'downgrade'): Promise<void> {
  try {
    const subject = `Plan Updated: Welcome to ${this.capitalizePlan(newPlan)}!`;
    
    // Determine if it's an upgrade or downgrade
    const planLevels = { foundation: 0, growth: 1, premium: 2, enterprise: 3 };
    const isUpgrade = planLevels[newPlan as keyof typeof planLevels] > planLevels[oldPlan as keyof typeof planLevels];
    
    const templateData = {
      oldPlan: this.capitalizePlan(oldPlan),
      newPlan: this.capitalizePlan(newPlan),
      changeType: isUpgrade ? 'upgrade' : 'downgrade',
      changeDate: new Date().toLocaleDateString(),
      effectiveDate: new Date().toLocaleDateString(),
      // Add plan-specific benefits
      newFeatures: this.getPlanFeatures(newPlan),
      // Add support information
      supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com'
    };

    await this.sendEmail({
      to: email,
      subject,
      template: 'plan-change-notification',
      templateData
    });

    console.log(`Plan change notification sent: ${email} changed from ${oldPlan} to ${newPlan}`);
    
  } catch (error) {
    console.error('Failed to send plan change notification:', {
      email,
      oldPlan,
      newPlan,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

  /**
   * 6️⃣ Payment failed → notify Brand (Enhanced)
   */
  async notifyBrandOfPaymentFailure(
    businessId: string, 
    amount: number, 
    reason?: string,
    paymentData?: {
      attemptCount?: number;
      nextRetryDate?: Date;
      paymentMethodLast4?: string;
    }
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    if (typeof amount !== 'number' || amount <= 0) {
      throw { statusCode: 400, message: 'Valid payment amount is required' };
    }

    const biz = await Business.findById(businessId).select('businessName email');
    if (!biz) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const formattedAmount = this.formatCurrency(amount);
    const template = this.getPaymentFailureEmailTemplate(formattedAmount, reason, paymentData);
    
    if (biz.email && UtilsService.isValidEmail(biz.email)) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html, {
        priority: 'high',
        trackingEnabled: true
      });
    }

    await this.createInAppNotification({
      business: businessId,
      type: 'payment_failed',
      message: template.text,
      data: UtilsService.cleanObject({ 
        amount: formattedAmount,
        reason,
        failureDate: new Date().toISOString(),
        ...paymentData
      }),
      read: false
    });

    this.logNotificationEvent('PAYMENT_FAILURE', biz.email, 'BILLING', true, {
      businessId,
      amount: formattedAmount,
      reason,
      paymentData
    });
  }

  /**
   * 7️⃣ Usage limit warning → notify Brand (Enhanced)
   */
  async notifyBrandOfUsageLimitWarning(
    businessId: string, 
    limitType: 'votes' | 'certificates' | 'transfers', 
    usage: number, 
    limit: number
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    if (!['votes', 'certificates', 'transfers'].includes(limitType)) {
      throw { statusCode: 400, message: 'Invalid limit type specified' };
    }

    if (typeof usage !== 'number' || typeof limit !== 'number' || usage < 0 || limit <= 0) {
      throw { statusCode: 400, message: 'Valid usage and limit numbers are required' };
    }

    const biz = await Business.findById(businessId).select('businessName email plan');
    if (!biz) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const settings = await BrandSettings.findOne({ business: businessId });
    const percentage = Math.round((usage / limit) * 100);
    const template = this.getUsageLimitWarningEmailTemplate(limitType, usage, limit, percentage);
    
    if (biz.email && UtilsService.isValidEmail(biz.email)) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html, {
        priority: percentage >= 90 ? 'high' : 'normal',
        trackingEnabled: true
      });
    }

    await this.createInAppNotification({
      business: businessId,
      type: 'usage_warning',
      message: template.text,
      data: UtilsService.cleanObject({ 
        limitType, 
        usage, 
        limit,
        percentage,
        currentPlan: settings?.plan,
        warningDate: new Date().toISOString()
      }),
      read: false
    });

    this.logNotificationEvent('USAGE_WARNING', biz.email, 'USAGE_LIMIT', true, {
      businessId,
      limitType,
      usage,
      limit,
      percentage
    });
  }

  /**
   * 8️⃣ New message received → notify recipient (Enhanced)
   */
  async notifyOfNewMessage(
    recipientId: string, 
    recipientType: 'brand' | 'manufacturer', 
    senderId: string, 
    senderName: string,
    messagePreview?: string
  ): Promise<void> {
    this.validateUserId(recipientId, recipientType);
    this.validateUserId(senderId, 'sender');

    if (!senderName || senderName.trim().length === 0) {
      throw { statusCode: 400, message: 'Sender name is required' };
    }

    if (!['brand', 'manufacturer'].includes(recipientType)) {
      throw { statusCode: 400, message: 'Invalid recipient type specified' };
    }

    const recipient = recipientType === 'brand' 
      ? await Business.findById(recipientId).select('businessName email')
      : await Manufacturer.findById(recipientId).select('name email');
    
    if (!recipient) {
      throw { statusCode: 404, message: 'Recipient not found' };
    }

    const formattedSenderName = UtilsService.titleCase(senderName);
    const template = this.getNewMessageEmailTemplate(formattedSenderName, messagePreview);
    
    if (recipient.email && UtilsService.isValidEmail(recipient.email)) {
      await this.sendEmail(recipient.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    const notificationData: any = {
      type: 'message',
      message: template.text,
      data: UtilsService.cleanObject({ 
        senderId, 
        senderName: formattedSenderName,
        messagePreview: messagePreview ? messagePreview.substring(0, 100) : undefined,
        messageDate: new Date().toISOString()
      }),
      read: false
    };

    if (recipientType === 'brand') {
      notificationData.business = recipientId;
    } else {
      notificationData.manufacturer = recipientId;
    }

    await this.createInAppNotification(notificationData);

    this.logNotificationEvent('NEW_MESSAGE', recipient.email, 'MESSAGING', true, {
      recipientId,
      recipientType,
      senderId,
      senderName: formattedSenderName
    });
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Utility and Admin Methods                                                 */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Create enhanced in-app notification with validation
   */
  private async createInAppNotification(data: any): Promise<INotification> {
    if (!data.type || !data.message) {
      throw { statusCode: 400, message: 'Notification type and message are required' };
    }

    const cleanedData = UtilsService.cleanObject({
      ...data,
      createdAt: new Date(),
      metadata: {
        source: 'notifications_service',
        version: '2.0'
      }
    });

    return Notification.create(cleanedData);
  }

  /**
   * Test email configuration with enhanced diagnostics
   */
  async testEmailConfiguration(): Promise<{
    isConfigured: boolean;
    canConnect: boolean;
    errors: string[];
    serverInfo?: any;
  }> {
    const result = {
      isConfigured: false,
      canConnect: false,
      errors: [] as string[],
      serverInfo: undefined as any
    };

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      result.errors.push('Missing SMTP configuration (SMTP_HOST, SMTP_USER, or SMTP_PASS)');
      return result;
    }

    result.isConfigured = true;

    try {
      const verification = await transport.verify();
      result.canConnect = verification;
      
      result.serverInfo = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: Number(process.env.SMTP_PORT) === 465
      };

    } catch (error) {
      result.errors.push(`SMTP connection failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Send bulk notifications with enhanced tracking and rate limiting
   */
  async sendBulkNotification(
    recipients: Array<{ email: string; type: 'brand' | 'manufacturer'; id: string; name?: string }>,
    subject: string,
    message: string,
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<BulkNotificationResult> {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw { statusCode: 400, message: 'Recipients array is required and cannot be empty' };
    }

    if (!subject || !message) {
      throw { statusCode: 400, message: 'Subject and message are required' };
    }

    const batchSize = options.batchSize || 50;
    const delay = options.delayBetweenBatches || 1000;
    
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const details: BulkNotificationResult['details'] = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        const recipientResult = {
          email: recipient.email,
          status: 'failed' as 'sent' | 'failed',
          error: undefined as string | undefined,
          retries: 0
        };

        try {
          if (!UtilsService.isValidEmail(recipient.email)) {
            throw new Error('Invalid email address');
          }

          const personalizedMessage = recipient.name 
            ? message.replace(/{{name}}/g, UtilsService.titleCase(recipient.name))
            : message;

          await this.sendEmail(recipient.email, subject, personalizedMessage, undefined, {
            priority: options.priority || 'normal',
            retryCount: 2
          });
          
          const notificationData: any = {
            type: 'announcement',
            message: personalizedMessage,
            data: UtilsService.cleanObject({ 
              isAdmin: true,
              bulkNotificationId: UtilsService.generateAlphanumericCode(8),
              sentDate: new Date().toISOString()
            }),
            read: false
          };

          if (recipient.type === 'brand') {
            notificationData.business = recipient.id;
          } else {
            notificationData.manufacturer = recipient.id;
          }

          await this.createInAppNotification(notificationData);
          
          recipientResult.status = 'sent';
          sent++;

        } catch (error) {
          recipientResult.error = error.message;
          failed++;
          errors.push(`Failed to send to ${UtilsService.maskEmail(recipient.email)}: ${error.message}`);
        }

        details.push(recipientResult);
        return recipientResult;
      });

      await Promise.all(batchPromises);

      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.logNotificationEvent('BULK_NOTIFICATION_COMPLETED', 'multiple', 'BULK', true, {
      totalRecipients: recipients.length,
      sent,
      failed,
      successRate: Math.round((sent / recipients.length) * 100)
    });

    return { sent, failed, errors, details };
  }

  private capitalizePlan(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

private getPlanFeatures(plan: string): string[] {
  const features = {
    foundation: [
      'Basic API access',
      'Community support',
      'Standard documentation'
    ],
    growth: [
      'Increased API limits',
      'Email support',
      'Basic analytics',
      'API key management'
    ],
    premium: [
      'Advanced API features',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
      'Webhook support'
    ],
    enterprise: [
      'Unlimited API access',
      'Dedicated support',
      'Custom solutions',
      'SLA guarantees',
      'Advanced security features'
    ]
  };
  
  return features[plan as keyof typeof features] || features.foundation;
}

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** 🎨 Enhanced Email Template Methods (Web3 Focused)                          */
  /** ─────────────────────────────────────────────────────────────────────────── */

  private getTransferSuccessEmailTemplate(transferData: TransferNotificationData): EmailTemplate {
    const formattedWallet = this.formatBlockchainAddress(transferData.brandWallet);
    const gasUsed = transferData.gasUsed ? this.formatGasAmount(transferData.gasUsed) : 'N/A';
    
    return {
      subject: `✅ NFT Certificate ${transferData.tokenId} Transferred Successfully`,
      text: `Great news! Your NFT certificate has been successfully transferred to your wallet.\n\nDetails:\n• Token ID: ${transferData.tokenId}\n• Your Wallet: ${formattedWallet}\n• Transaction Hash: ${transferData.txHash}\n• Gas Used: ${gasUsed}\n\nThe certificate is now in your wallet and you have full ownership. You can view it on blockchain explorers or in your Web3 wallet.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745; text-align: center;">🎉 Transfer Successful!</h2>
          <p>Great news! Your NFT certificate has been successfully transferred to your wallet.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Transfer Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Token ID:</td>
                <td style="padding: 8px 0; color: #333;">${transferData.tokenId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Your Wallet:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace;">${formattedWallet}</td>
              </tr>
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Gas Used:</td>
                <td style="padding: 8px 0; color: #333;">${gasUsed}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Transaction:</td>
                <td style="padding: 8px 0;">
                  <a href="https://basescan.io/tx/${transferData.txHash}" style="color: #007bff; text-decoration: none;">View on Basescan</a>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #0c5460;">
              <strong>✅ Ownership Confirmed:</strong> The certificate is now in your wallet and you have full ownership.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/certificates" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">View Certificate</a>
            <a href="https://basescan.io/tx/${transferData.txHash}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Transaction</a>
          </div>
        </div>
      `
    };
  }

  private getTransferFailureEmailTemplate(failureData: TransferFailureData): EmailTemplate {
    const isLastAttempt = failureData.attemptNumber >= failureData.maxAttempts;
    const urgencyColor = isLastAttempt ? '#dc3545' : '#fd7e14';
    const urgencyIcon = isLastAttempt ? '🚨' : '⚠️';
    
    return {
      subject: `${urgencyIcon} NFT Transfer ${isLastAttempt ? 'Failed' : 'Retry'} - Certificate ${failureData.tokenId}`,
      text: `${isLastAttempt ? 'URGENT: ' : ''}NFT certificate transfer ${isLastAttempt ? 'failed permanently' : 'encountered an issue'}.\n\nDetails:\n• Token ID: ${failureData.tokenId}\n• Attempt: ${failureData.attemptNumber}/${failureData.maxAttempts}\n• Error: ${failureData.error}\n\n${isLastAttempt ? 'Please contact support for manual transfer.' : `Next retry: ${failureData.nextRetryAt ? new Date(failureData.nextRetryAt).toLocaleString() : 'Not scheduled'}`}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${urgencyColor}; text-align: center;">${urgencyIcon} Transfer ${isLastAttempt ? 'Failed' : 'Issue'}</h2>
          <p>${isLastAttempt ? 'URGENT: ' : ''}NFT certificate transfer ${isLastAttempt ? 'failed permanently' : 'encountered an issue'}.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Transfer Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Token ID:</td>
                <td style="padding: 8px 0; color: #333;">${failureData.tokenId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Attempt:</td>
                <td style="padding: 8px 0; color: #333;">${failureData.attemptNumber} of ${failureData.maxAttempts}</td>
              </tr>
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Error:</td>
                <td style="padding: 8px 0; color: #dc3545; word-break: break-word;">${failureData.error}</td>
              </tr>
              ${failureData.nextRetryAt && !isLastAttempt ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Next Retry:</td>
                <td style="padding: 8px 0; color: #333;">${new Date(failureData.nextRetryAt).toLocaleString()}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${isLastAttempt ? `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24;">
                <strong>⚠️ Action Required:</strong> All automatic retry attempts have been exhausted. Your certificate is still secure in our relayer wallet, but manual intervention is needed to complete the transfer.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/support" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Contact Support</a>
            </div>
          ` : `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>🔄 Automatic Retry:</strong> We'll automatically retry the transfer. Your certificate remains secure in our system.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/certificates" style="background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Status</a>
            </div>
          `}
        </div>
      `
    };
  }

  private getTransferRetryEmailTemplate(retryData: any): EmailTemplate {
    return {
      subject: `🔄 Retrying NFT Transfer - Certificate ${retryData.tokenId}`,
      text: `We're retrying the transfer of your NFT certificate.\n\nDetails:\n• Token ID: ${retryData.tokenId}\n• Retry Attempt: ${retryData.attemptNumber}/${retryData.maxAttempts}\n• Previous Error: ${retryData.previousError}\n\nWe'll notify you when the transfer completes or if further action is needed.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #fd7e14; text-align: center;">🔄 Transfer Retry in Progress</h2>
          <p>We're retrying the transfer of your NFT certificate.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Retry Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Token ID:</td>
                <td style="padding: 8px 0; color: #333;">${retryData.tokenId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Retry Attempt:</td>
                <td style="padding: 8px 0; color: #333;">${retryData.attemptNumber} of ${retryData.maxAttempts}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Previous Error:</td>
                <td style="padding: 8px 0; color: #dc3545; word-break: break-word;">${retryData.previousError}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #cce5ff; border: 1px solid #99d3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #004085;">
              <strong>🔄 In Progress:</strong> We'll notify you when the transfer completes or if further action is needed.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/certificates" style="background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Monitor Progress</a>
          </div>
        </div>
      `
    };
  }

  private getWalletChangeEmailTemplate(walletData: {
    previousWallet?: string;
    newWallet: string;
    changeDate: Date;
    verificationStatus?: 'verified' | 'pending' | 'failed';
  }): EmailTemplate {
    const isNewConnection = !walletData.previousWallet;
    const formattedNewWallet = this.formatBlockchainAddress(walletData.newWallet);
    const formattedPrevWallet = walletData.previousWallet ? this.formatBlockchainAddress(walletData.previousWallet) : null;
    const statusColor = walletData.verificationStatus === 'verified' ? '#28a745' : 
                       walletData.verificationStatus === 'failed' ? '#dc3545' : '#fd7e14';
    const statusText = walletData.verificationStatus === 'verified' ? 'Verified ✅' : 
                      walletData.verificationStatus === 'failed' ? 'Failed ❌' : 'Pending ⏳';

    return {
      subject: `🔐 Web3 Wallet ${isNewConnection ? 'Connected' : 'Updated'} Successfully`,
      text: `Your Web3 wallet has been ${isNewConnection ? 'connected' : 'updated'} successfully.\n\nDetails:\n${formattedPrevWallet ? `• Previous Wallet: ${formattedPrevWallet}\n` : ''}• New Wallet: ${formattedNewWallet}\n• Status: ${statusText}\n• Date: ${walletData.changeDate.toLocaleString()}\n\n${walletData.verificationStatus === 'verified' ? 'Your NFT certificates will now be automatically transferred to this wallet.' : 'Wallet verification is required before automatic transfers can begin.'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">🔐 Wallet ${isNewConnection ? 'Connected' : 'Updated'}</h2>
          <p>Your Web3 wallet has been ${isNewConnection ? 'connected' : 'updated'} successfully.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Wallet Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${formattedPrevWallet ? `
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Previous Wallet:</td>
                <td style="padding: 8px 0; color: #6c757d; font-family: monospace;">${formattedPrevWallet}</td>
              </tr>
              ` : ''}
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">New Wallet:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace;">${formattedNewWallet}</td>
              </tr>
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Status:</td>
                <td style="padding: 8px 0; color: ${statusColor}; font-weight: bold;">${statusText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Date:</td>
                <td style="padding: 8px 0; color: #333;">${walletData.changeDate.toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          ${walletData.verificationStatus === 'verified' ? `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #155724;">
                <strong>🎉 Ready for Auto-Transfers:</strong> Your NFT certificates will now be automatically transferred to this wallet.
              </p>
            </div>
          ` : `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⏳ Verification Required:</strong> Wallet verification is needed before automatic transfers can begin.
              </p>
            </div>
          `}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/settings/web3" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Web3 Settings</a>
            <a href="${process.env.FRONTEND_URL}/certificates" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Certificates</a>
          </div>
          
          <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #495057;">Security Note</h4>
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              If you didn't make this change, please contact our support team immediately. Always keep your wallet private keys secure and never share them with anyone.
            </p>
          </div>
        </div>
      `
    };
  }

  private getCertificateMintedEmailTemplate(certificateId: string, certificateData?: {
    tokenId?: string;
    txHash?: string;
    recipient?: string;
    transferScheduled?: boolean;
    brandWallet?: string;
    autoTransferEnabled?: boolean;
  }): EmailTemplate {
    const hasWeb3 = certificateData?.autoTransferEnabled;
    const transferScheduled = certificateData?.transferScheduled;
    const blockchainInfo = certificateData ? `\n\nBlockchain Details:\n• Token ID: ${certificateData.tokenId}\n• Transaction: ${certificateData.txHash}\n• Recipient: ${certificateData.recipient}${hasWeb3 ? `\n• Auto-Transfer: ${transferScheduled ? 'Scheduled' : 'Disabled'}` : ''}` : '';
    
    return {
      subject: `🎖️ NFT Certificate Minted Successfully - ${certificateId}`,
      text: `Your NFT certificate ${certificateId} has been minted successfully on the blockchain.${blockchainInfo}\n\n${hasWeb3 && transferScheduled ? 'The certificate will be automatically transferred to your Web3 wallet shortly.' : hasWeb3 ? 'The certificate will remain in our secure relayer wallet.' : 'The certificate is securely stored in our system.'}\n\nYou can view the certificate in your dashboard.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Certificate Minted Successfully 🎖️</h2>
          <p>Your NFT certificate <strong>${certificateId}</strong> has been minted successfully on the blockchain.</p>
          
          ${certificateData ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Blockchain Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Token ID:</td>
                  <td style="padding: 8px 0; color: #333;">${certificateData.tokenId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Recipient:</td>
                  <td style="padding: 8px 0; color: #333;">${certificateData.recipient}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Transaction:</td>
                  <td style="padding: 8px 0;">
                    <a href="https://basescan.io/tx/${certificateData.txHash}" style="color: #007bff; text-decoration: none; word-break: break-all;">${certificateData.txHash}</a>
                  </td>
                </tr>
                ${hasWeb3 ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Auto-Transfer:</td>
                  <td style="padding: 8px 0; color: ${transferScheduled ? '#28a745' : '#fd7e14'}; font-weight: bold;">
                    ${transferScheduled ? '✅ Scheduled' : '⏸️ Disabled'}
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
          ` : ''}
          
          ${hasWeb3 && transferScheduled ? `
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0c5460;">
                <strong>🚀 Auto-Transfer Scheduled:</strong> The certificate will be automatically transferred to your Web3 wallet (${certificateData?.brandWallet ? this.formatBlockchainAddress(certificateData.brandWallet) : 'configured wallet'}) shortly.
              </p>
            </div>
          ` : hasWeb3 ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>🔒 Secure Storage:</strong> The certificate will remain in our secure relayer wallet as per your settings.
              </p>
            </div>
          ` : `
            <div style="background: #e2e3e5; border: 1px solid #d6d8db; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #383d41;">
                <strong>🏦 Secure Storage:</strong> The certificate is securely stored in our system. Consider upgrading to Premium for Web3 wallet integration.
              </p>
            </div>
          `}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/certificates/${certificateId}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">View Certificate</a>
            <a href="https://basecan.io/tx/${certificateData?.txHash}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View on Blockchain</a>
          </div>
          
          ${!hasWeb3 ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #495057;">Want automatic transfers to your Web3 wallet?</p>
              <a href="${process.env.FRONTEND_URL}/billing/upgrade" style="background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 3px; font-size: 14px;">Upgrade to Premium</a>
            </div>
          ` : ''}
        </div>
      `
    };
  }

  // [Previous template methods continue with enhancements...]

  private getVerificationEmailTemplate(code: string): EmailTemplate {
    return {
      subject: 'Your Ordira Verification Code',
      text: `Your verification code is: ${code}\n\nThis code will expire in 15 minutes for security reasons.\n\nIf you didn't request this code, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 15 minutes for security reasons.<br>
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `
    };
  }

  private getPasswordResetEmailTemplate(resetCode: string): EmailTemplate {
    return {
      subject: 'Reset Your Ordira Password',
      text: `You requested a password reset for your Ordira account.\n\nYour reset code is: ${resetCode}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this reset, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Password Reset</h2>
          <p>You requested a password reset for your Ordira account.</p>
          <p>Your reset code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
            ${resetCode}
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 15 minutes for security reasons.<br>
            If you didn't request this reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      `
    };
  }

  private getWelcomeEmailTemplate(name: string, userType: 'brand' | 'manufacturer'): EmailTemplate {
    const platformName = userType === 'brand' ? 'brand dashboard' : 'manufacturer portal';
    const features = userType === 'brand' 
      ? ['Create voting campaigns', 'Connect with manufacturers', 'Track customer engagement', 'Generate NFT certificates', 'Web3 wallet integration (Premium)']
      : ['Connect with brands', 'Access voting analytics', 'View partnership opportunities', 'Track performance'];

    return {
      subject: `Welcome to Ordira, ${name}!`,
      text: `Welcome to Ordira, ${name}!\n\nYour ${userType} account has been created successfully. You can now access your ${platformName} and start connecting with partners.\n\nGet started with:\n${features.map(f => `• ${f}`).join('\n')}\n\nBest regards,\nThe Ordira Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Welcome to Ordira, ${name}!</h2>
          <p>Your ${userType} account has been created successfully. You can now access your ${platformName} and start connecting with partners.</p>
          <h3 style="color: #555;">Get started with:</h3>
          <ul style="color: #666;">
            ${features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Access Your Dashboard</a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Ordira Team
          </p>
        </div>
      `
    };
  }

  private getInviteEmailTemplate(brandName: string, recipientType: 'manufacturer'): EmailTemplate {
    return {
      subject: `Partnership Invitation from ${brandName}`,
      text: `${brandName} has invited you to connect on Ordira.\n\nThis partnership will allow you to:\n• Access their voting analytics\n• Collaborate on product development\n• Build stronger brand relationships\n\nLog in to your dashboard to accept or decline this invitation.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Partnership Invitation</h2>
          <p><strong>${brandName}</strong> has invited you to connect on Ordira.</p>
          <h3 style="color: #555;">This partnership will allow you to:</h3>
          <ul style="color: #666;">
            <li>Access their voting analytics</li>
            <li>Collaborate on product development</li>
            <li>Build stronger brand relationships</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/invitations" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Invitation</a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Log in to your dashboard to accept or decline this invitation.
          </p>
        </div>
      `
    };
  }

  private getInviteAcceptedEmailTemplate(manufacturerName: string): EmailTemplate {
    return {
      subject: `${manufacturerName} Accepted Your Partnership Invitation`,
      text: `Great news! ${manufacturerName} has accepted your partnership invitation.\n\nThey now have access to your voting analytics and can collaborate with you on product development.\n\nYou can start working together immediately through your dashboard.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Partnership Accepted! 🎉</h2>
          <p>Great news! <strong>${manufacturerName}</strong> has accepted your partnership invitation.</p>
          <p>They now have access to your voting analytics and can collaborate with you on product development.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/partnerships" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Partnership</a>
          </div>
          <p style="color: #666; font-size: 14px;">
            You can start working together immediately through your dashboard.
          </p>
        </div>
      `
    };
  }

  private getNewVoteEmailTemplate(proposalId: string, voteData?: {
    voterCount?: number;
    voteType?: 'for' | 'against' | 'abstain';
    totalVotes?: number;
  }): EmailTemplate {
    const voteInfo = voteData ? `\n\nVote Details:\n• Vote Type: ${voteData.voteType}\n• Total Votes: ${voteData.totalVotes}\n• Unique Voters: ${voteData.voterCount}` : '';
    
    return {
      subject: `New Vote Received - Proposal ${proposalId}`,
      text: `A customer just cast a vote on proposal ${proposalId}.${voteInfo}\n\nCheck your dashboard for detailed analytics and insights.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">New Vote Received 📊</h2>
          <p>A customer just cast a vote on proposal <strong>${proposalId}</strong>.</p>
          ${voteData ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #555;">Vote Details:</h4>
              <ul style="margin: 0; color: #666;">
                <li>Vote Type: <strong>${voteData.voteType}</strong></li>
                <li>Total Votes: <strong>${voteData.totalVotes}</strong></li>
                <li>Unique Voters: <strong>${voteData.voterCount}</strong></li>
              </ul>
            </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/analytics" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Analytics</a>
          </div>
        </div>
      `
    };
  }

  private getPlanRenewalEmailTemplate(plan: PlanKey): EmailTemplate {
    return {
      subject: `Your ${UtilsService.titleCase(plan)} Plan Has Been Renewed`,
      text: `Your ${plan} subscription has been successfully renewed.\n\nYour next billing date has been updated, and all features remain active.\n\nThank you for continuing to use Ordira!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Subscription Renewed ✅</h2>
          <p>Your <strong>${UtilsService.titleCase(plan)}</strong> subscription has been successfully renewed.</p>
          <p>Your next billing date has been updated, and all features remain active.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/billing" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Billing</a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Thank you for continuing to use Ordira!
          </p>
        </div>
      `
    };
  }

  private getPaymentFailureEmailTemplate(
    formattedAmount: string, 
    reason?: string,
    paymentData?: {
      attemptCount?: number;
      nextRetryDate?: Date;
      paymentMethodLast4?: string;
    }
  ): EmailTemplate {
    const reasonText = reason ? ` Reason: ${reason}` : '';
    const retryInfo = paymentData?.nextRetryDate 
      ? `\n\nWe will automatically retry the payment on ${UtilsService.formatDate(paymentData.nextRetryDate)}.`
      : '';
    
    return {
      subject: 'Payment Failed - Action Required',
      text: `Your payment of ${formattedAmount} failed.${reasonText}${retryInfo}\n\nPlease update your payment method to ensure continued service.\n\nIf you need assistance, please contact our support team.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545; text-align: center;">Payment Failed ⚠️</h2>
          <p>Your payment of <strong>${formattedAmount}</strong> failed.${reasonText}</p>
          ${paymentData?.nextRetryDate ? `
            <p style="color: #666;">We will automatically retry the payment on <strong>${UtilsService.formatDate(paymentData.nextRetryDate)}</strong>.</p>
          ` : ''}
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Action Required:</strong> Please update your payment method to ensure continued service.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/billing" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Update Payment Method</a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you need assistance, please contact our support team.
          </p>
        </div>
      `
    };
  }

  private getUsageLimitWarningEmailTemplate(
    limitType: 'votes' | 'certificates' | 'transfers', 
    usage: number, 
    limit: number, 
    percentage: number
  ): EmailTemplate {
    const urgencyLevel = percentage >= 90 ? 'urgent' : percentage >= 80 ? 'important' : 'notice';
    const urgencyColor = percentage >= 90 ? '#dc3545' : percentage >= 80 ? '#fd7e14' : '#ffc107';
    
    return {
      subject: `${UtilsService.titleCase(limitType)} Usage Warning - ${percentage}% of Limit Reached`,
      text: `You've used ${usage} of ${limit} ${limitType} (${percentage}%).\n\n${percentage >= 90 ? 'URGENT: ' : ''}Consider upgrading your plan to avoid service interruption.\n\nUpgrade now to continue enjoying uninterrupted service.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${urgencyColor}; text-align: center;">Usage Warning ${percentage >= 90 ? '🚨' : '⚠️'}</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Current Usage</h3>
            <div style="background: #e9ecef; border-radius: 10px; padding: 3px;">
              <div style="background: ${urgencyColor}; height: 20px; width: ${percentage}%; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                ${percentage}%
              </div>
            </div>
            <p style="margin: 10px 0 0 0; color: #666;">
              <strong>${usage}</strong> of <strong>${limit}</strong> ${limitType} used
            </p>
          </div>
          ${percentage >= 90 ? `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24;">
                <strong>URGENT:</strong> You're approaching your limit. Service may be interrupted if you exceed your quota.
              </p>
            </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/billing/upgrade" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Upgrade Plan</a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Upgrade now to continue enjoying uninterrupted service.
          </p>
        </div>
      `
    };
  }

  private getNewMessageEmailTemplate(senderName: string, messagePreview?: string): EmailTemplate {
    const preview = messagePreview ? `\n\nMessage preview: "${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}"` : '';
    
    return {
      subject: `New Message from ${senderName}`,
      text: `You have a new message from ${senderName} on Ordira.${preview}\n\nLog in to read the full message and reply.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">New Message 💬</h2>
          <p>You have a new message from <strong>${senderName}</strong> on Ordira.</p>
          ${messagePreview ? `
            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-style: italic;">
                "${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}"
              </p>
            </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/messages" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Read & Reply</a>
          </div>
        </div>
      `
    };
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

  private async getSubscriptionDetails(subscriptionId: string): Promise<any> {
  try {
    // If you have Stripe access in NotificationsService
    const stripe = new stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Failed to get subscription details:', error);
    throw error;
  }
}
}