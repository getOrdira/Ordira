// src/services/external/notifications.service.ts
import nodemailer from 'nodemailer';
import { Business } from '../../models/business.model';
import { Manufacturer } from '../../models/manufacturer.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { Notification, INotification } from '../../models/notification.model';
import { PlanKey } from '../../constants/plans';
import { Types } from 'mongoose';
import { UtilsService } from '../utils/utils.service';
import path from 'path';

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

/**
 * Enhanced external notifications service with validation, security, and analytics
 * Handles email sending, message formatting, and notification tracking
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
    const maskedEmail = UtilsService.maskEmail(recipient);
    const timestamp = UtilsService.formatDate(new Date(), { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log(`[NOTIFICATIONS] ${timestamp} - ${event} - ${type} - ${maskedEmail} - ${success ? 'SUCCESS' : 'FAILED'}${metadata ? ` - ${JSON.stringify(metadata)}` : ''}`);
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
  /** Business Notification Methods                                             */
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

    // Create enhanced in-app notification
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

    // Create enhanced in-app notification
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
   * 4️⃣ Certificate minted → notify Brand (Enhanced)
   */
  async notifyBrandOfCertificateMinted(
    businessId: string, 
    certificateId: string,
    certificateData?: {
      tokenId?: string;
      txHash?: string;
      recipient?: string;
    }
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    if (!certificateId || certificateId.trim().length === 0) {
      throw { statusCode: 400, message: 'Valid certificate ID is required' };
    }

    const biz = await Business.findById(businessId).select('businessName email');
    if (!biz) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const template = this.getCertificateMintedEmailTemplate(certificateId, certificateData);
    
    if (biz.email && UtilsService.isValidEmail(biz.email)) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html, {
        priority: 'normal',
        trackingEnabled: true
      });
    }

    // Create enhanced in-app notification
    await this.createInAppNotification({
      business: businessId,
      type: 'certificate',
      message: template.text,
      data: UtilsService.cleanObject({ 
        certificateId,
        mintTimestamp: new Date().toISOString(),
        ...certificateData
      }),
      read: false
    });

    this.logNotificationEvent('CERTIFICATE_MINTED', biz.email, 'BLOCKCHAIN', true, {
      businessId,
      certificateId,
      certificateData
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

    // Create enhanced in-app notification
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

    // Create enhanced in-app notification
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
    limitType: 'votes' | 'certificates', 
    usage: number, 
    limit: number
  ): Promise<void> {
    this.validateUserId(businessId, 'business');

    if (!['votes', 'certificates'].includes(limitType)) {
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

    // Create enhanced in-app notification
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

    // Create enhanced in-app notification
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
    // Validate required fields
    if (!data.type || !data.message) {
      throw { statusCode: 400, message: 'Notification type and message are required' };
    }

    // Clean and validate data
    const cleanedData = UtilsService.cleanObject({
      ...data,
      createdAt: new Date(),
      metadata: {
        source: 'notifications_service',
        version: '1.0'
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

    // Check configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      result.errors.push('Missing SMTP configuration (SMTP_HOST, SMTP_USER, or SMTP_PASS)');
      return result;
    }

    result.isConfigured = true;

    // Test connection
    try {
      const verification = await transport.verify();
      result.canConnect = verification;
      
      // Get server info if possible
      try {
        result.serverInfo = {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: Number(process.env.SMTP_PORT) === 465
        };
      } catch {}

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
    // Validate inputs
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

    // Process in batches to avoid overwhelming the email server
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (recipient) => {
        const recipientResult = {
          email: recipient.email,
          status: 'failed' as 'sent' | 'failed',
          error: undefined as string | undefined,
          retries: 0
        };

        try {
          // Validate recipient email
          if (!UtilsService.isValidEmail(recipient.email)) {
            throw new Error('Invalid email address');
          }

          // Personalize message if name is provided
          const personalizedMessage = recipient.name 
            ? message.replace(/{{name}}/g, UtilsService.titleCase(recipient.name))
            : message;

          await this.sendEmail(recipient.email, subject, personalizedMessage, undefined, {
            priority: options.priority || 'normal',
            retryCount: 2
          });
          
          // Create in-app notification
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

      // Wait for batch to complete
      await Promise.all(batchPromises);

      // Add delay between batches (except for the last batch)
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

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Email Template Methods                                                    */
  /** ─────────────────────────────────────────────────────────────────────────── */

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
      ? ['Create voting campaigns', 'Connect with manufacturers', 'Track customer engagement', 'Generate insights']
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

  private getCertificateMintedEmailTemplate(certificateId: string, certificateData?: {
    tokenId?: string;
    txHash?: string;
    recipient?: string;
  }): EmailTemplate {
    const blockchainInfo = certificateData ? `\n\nBlockchain Details:\n• Token ID: ${certificateData.tokenId}\n• Transaction: ${certificateData.txHash}\n• Recipient: ${certificateData.recipient}` : '';
    
    return {
      subject: `NFT Certificate Minted Successfully - ${certificateId}`,
      text: `Your NFT certificate ${certificateId} has been minted successfully on the blockchain.${blockchainInfo}\n\nYou can view the certificate in your dashboard.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Certificate Minted Successfully 🎖️</h2>
          <p>Your NFT certificate <strong>${certificateId}</strong> has been minted successfully on the blockchain.</p>
          ${certificateData ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #555;">Blockchain Details:</h4>
              <ul style="margin: 0; color: #666; word-break: break-all;">
                <li>Token ID: <strong>${certificateData.tokenId}</strong></li>
                <li>Transaction: <strong>${certificateData.txHash}</strong></li>
                <li>Recipient: <strong>${certificateData.recipient}</strong></li>
              </ul>
            </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/certificates" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Certificate</a>
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
    limitType: 'votes' | 'certificates', 
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
}
