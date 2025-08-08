// src/services/external/notifications.service.ts
import nodemailer from 'nodemailer';
import { Business } from '../../models/business.model';
import { Manufacturer } from '../../models/manufacturer.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { Notification, INotification } from '../../models/notification.model';
import { PlanKey } from '../../constants/plans';
import { Types } from 'mongoose';

const transporter = nodemailer.createTransporter({
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
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html?: string;
}

/**
 * External notifications service - handles email sending and message formatting
 * This service focuses on the delivery mechanism, not the business logic
 */
export class NotificationsService {

  /**
   * Send a generic email
   */
  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    try {
      await transporter.sendMail({ 
        from: process.env.SMTP_USER, 
        to, 
        subject, 
        text,
        html 
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email to ${to}: ${error.message}`);
    }
  }

  /**
   * Send verification code email
   */
  async sendEmailCode(email: string, code: string): Promise<void> {
    const template = this.getVerificationEmailTemplate(code);
    await this.sendEmail(email, template.subject, template.text, template.html);
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, name: string, userType: 'brand' | 'manufacturer'): Promise<void> {
    const template = this.getWelcomeEmailTemplate(name, userType);
    await this.sendEmail(email, template.subject, template.text, template.html);
  }

  /**
   * 1️⃣ New invite sent by Brand → notify Manufacturer
   */
  async notifyManufacturerOfInvite(brandId: string, manufacturerId: string): Promise<void> {
    const [brand, mfg] = await Promise.all([
      Business.findById(brandId).select('businessName email'),
      Manufacturer.findById(manufacturerId).select('name email')
    ]);
    
    if (!brand || !mfg) {
      throw new Error('Brand or manufacturer not found');
    }

    const template = this.getInviteEmailTemplate(brand.businessName, 'manufacturer');
    
    if (mfg.email) {
      await this.sendEmail(mfg.email, template.subject, template.text, template.html);
    }

    // Create in-app notification
    await this.createInAppNotification({
      manufacturer: manufacturerId,
      type: 'invite',
      message: template.text,
      data: { brandId },
      read: false
    });
  }

  /**
   * 2️⃣ Invite accepted → notify Brand
   */
  async notifyBrandOfInviteAccepted(manufacturerId: string, brandId: string): Promise<void> {
    const [mfg, biz] = await Promise.all([
      Manufacturer.findById(manufacturerId).select('name email'),
      Business.findById(brandId).select('businessName email')
    ]);
    
    if (!mfg || !biz) {
      throw new Error('Manufacturer or business not found');
    }

    const template = this.getInviteAcceptedEmailTemplate(mfg.name);
    
    if (biz.email) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html);
    }

    // Create in-app notification
    await this.createInAppNotification({
      business: brandId,
      type: 'invite_accepted',
      message: template.text,
      data: { manufacturerId },
      read: false
    });
  }

  /**
   * 3️⃣ New vote received → notify Brand
   */
  async notifyBrandOfNewVote(businessId: string, proposalId: string): Promise<void> {
    const biz = await Business.findById(businessId).select('businessName email');
    if (!biz) {
      throw new Error('Business not found');
    }

    const template = this.getNewVoteEmailTemplate(proposalId);
    
    if (biz.email) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html);
    }

    // Create in-app notification
    await this.createInAppNotification({
      business: businessId,
      type: 'vote',
      message: template.text,
      data: { proposalId },
      read: false
    });
  }

  /**
   * 4️⃣ Certificate minted → notify Brand
   */
  async notifyBrandOfCertificateMinted(businessId: string, certificateId: string): Promise<void> {
    const biz = await Business.findById(businessId).select('businessName email');
    if (!biz) {
      throw new Error('Business not found');
    }

    const template = this.getCertificateMintedEmailTemplate(certificateId);
    
    if (biz.email) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html);
    }

    // Create in-app notification
    await this.createInAppNotification({
      business: businessId,
      type: 'certificate',
      message: template.text,
      data: { certificateId },
      read: false
    });
  }

  /**
   * 5️⃣ Plan renewal processed → notify Brand
   */
  async notifyBrandOfRenewal(subscriptionId: string): Promise<void> {
    const settings = await BrandSettings.findOne({ stripeSubscriptionId: subscriptionId })
      .populate<{ business: any }>('business', 'businessName email plan');
    
    if (!settings?.business) {
      throw new Error('Brand settings or business not found');
    }

    const biz = settings.business;
    const plan = settings.plan as PlanKey;
    const template = this.getPlanRenewalEmailTemplate(plan);
    
    if (biz.email) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html);
    }

    // Create in-app notification
    await this.createInAppNotification({
      business: biz._id.toString(),
      type: 'billing_renewal',
      message: template.text,
      data: { plan, subscriptionId },
      read: false
    });
  }

  /**
   * 6️⃣ Payment failed → notify Brand
   */
  async notifyBrandOfPaymentFailure(businessId: string, amount: number, reason?: string): Promise<void> {
    const biz = await Business.findById(businessId).select('businessName email');
    if (!biz) {
      throw new Error('Business not found');
    }

    const template = this.getPaymentFailureEmailTemplate(amount, reason);
    
    if (biz.email) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html);
    }

    // Create in-app notification
    await this.createInAppNotification({
      business: businessId,
      type: 'payment_failed',
      message: template.text,
      data: { amount, reason },
      read: false
    });
  }

  /**
   * 7️⃣ Usage limit warning → notify Brand
   */
  async notifyBrandOfUsageLimitWarning(businessId: string, limitType: 'votes' | 'certificates', usage: number, limit: number): Promise<void> {
    const biz = await Business.findById(businessId).select('businessName email');
    if (!biz) {
      throw new Error('Business not found');
    }

    const template = this.getUsageLimitWarningEmailTemplate(limitType, usage, limit);
    
    if (biz.email) {
      await this.sendEmail(biz.email, template.subject, template.text, template.html);
    }

    // Create in-app notification
    await this.createInAppNotification({
      business: businessId,
      type: 'usage_warning',
      message: template.text,
      data: { limitType, usage, limit },
      read: false
    });
  }

  /**
   * 8️⃣ New message received → notify recipient
   */
  async notifyOfNewMessage(recipientId: string, recipientType: 'brand' | 'manufacturer', senderId: string, senderName: string): Promise<void> {
    const recipient = recipientType === 'brand' 
      ? await Business.findById(recipientId).select('businessName email')
      : await Manufacturer.findById(recipientId).select('name email');
    
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    const template = this.getNewMessageEmailTemplate(senderName);
    
    if (recipient.email) {
      await this.sendEmail(recipient.email, template.subject, template.text, template.html);
    }

    // Create in-app notification
    const notificationData: any = {
      type: 'message',
      message: template.text,
      data: { senderId, senderName },
      read: false
    };

    if (recipientType === 'brand') {
      notificationData.business = recipientId;
    } else {
      notificationData.manufacturer = recipientId;
    }

    await this.createInAppNotification(notificationData);
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(data: any): Promise<INotification> {
    return Notification.create(data);
  }

  /**
   * Email template methods
   */
  private getVerificationEmailTemplate(code: string): EmailTemplate {
    return {
      subject: 'Your verification code',
      text: `Your verification code is: ${code}`,
      html: `<p>Your verification code is: <strong>${code}</strong></p>`
    };
  }

  private getWelcomeEmailTemplate(name: string, userType: 'brand' | 'manufacturer'): EmailTemplate {
    const platformName = userType === 'brand' ? 'brand dashboard' : 'manufacturer portal';
    return {
      subject: `Welcome to Despoke, ${name}!`,
      text: `Welcome to Despoke! Your ${userType} account has been created successfully. You can now access your ${platformName} and start connecting with partners.`,
      html: `<h2>Welcome to Despoke, ${name}!</h2><p>Your ${userType} account has been created successfully. You can now access your ${platformName} and start connecting with partners.</p>`
    };
  }

  private getInviteEmailTemplate(brandName: string, recipientType: 'manufacturer'): EmailTemplate {
    return {
      subject: `New connection request from ${brandName}`,
      text: `${brandName} has invited you to connect on Despoke. Log in to accept or decline this connection request.`,
      html: `<h3>New Connection Request</h3><p><strong>${brandName}</strong> has invited you to connect on Despoke.</p><p>Log in to your dashboard to accept or decline this connection request.</p>`
    };
  }

  private getInviteAcceptedEmailTemplate(manufacturerName: string): EmailTemplate {
    return {
      subject: `${manufacturerName} accepted your connection request`,
      text: `${manufacturerName} is now connected and can access your voting analytics.`,
      html: `<h3>Connection Accepted!</h3><p><strong>${manufacturerName}</strong> is now connected and can access your voting analytics.</p>`
    };
  }

  private getNewVoteEmailTemplate(proposalId: string): EmailTemplate {
    return {
      subject: `New vote on proposal ${proposalId}`,
      text: `A customer just cast a vote on proposal ${proposalId}. Check your dashboard for details.`,
      html: `<h3>New Vote Received</h3><p>A customer just cast a vote on proposal <strong>${proposalId}</strong>.</p><p>Check your dashboard for details.</p>`
    };
  }

  private getCertificateMintedEmailTemplate(certificateId: string): EmailTemplate {
    return {
      subject: `NFT Certificate ${certificateId} Minted`,
      text: `Your NFT certificate ${certificateId} has been minted successfully.`,
      html: `<h3>Certificate Minted Successfully</h3><p>Your NFT certificate <strong>${certificateId}</strong> has been minted successfully.</p>`
    };
  }

  private getPlanRenewalEmailTemplate(plan: PlanKey): EmailTemplate {
    return {
      subject: `Your ${plan} plan has been renewed`,
      text: `Your ${plan} subscription has been successfully renewed.`,
      html: `<h3>Subscription Renewed</h3><p>Your <strong>${plan}</strong> subscription has been successfully renewed.</p>`
    };
  }

  private getPaymentFailureEmailTemplate(amount: number, reason?: string): EmailTemplate {
    const reasonText = reason ? ` Reason: ${reason}` : '';
    return {
      subject: 'Payment failed - Action required',
      text: `Your payment of $${amount} failed.${reasonText} Please update your payment method to continue using Despoke.`,
      html: `<h3>Payment Failed</h3><p>Your payment of <strong>$${amount}</strong> failed.${reasonText}</p><p>Please update your payment method to continue using Despoke.</p>`
    };
  }

  private getUsageLimitWarningEmailTemplate(limitType: 'votes' | 'certificates', usage: number, limit: number): EmailTemplate {
    const percentage = Math.round((usage / limit) * 100);
    return {
      subject: `${limitType} usage warning - ${percentage}% of limit reached`,
      text: `You've used ${usage} of ${limit} ${limitType} (${percentage}%). Consider upgrading your plan to avoid service interruption.`,
      html: `<h3>Usage Warning</h3><p>You've used <strong>${usage} of ${limit}</strong> ${limitType} (${percentage}%).</p><p>Consider upgrading your plan to avoid service interruption.</p>`
    };
  }

  private getNewMessageEmailTemplate(senderName: string): EmailTemplate {
    return {
      subject: `New message from ${senderName}`,
      text: `You have a new message from ${senderName} on Despoke. Log in to read and reply.`,
      html: `<h3>New Message</h3><p>You have a new message from <strong>${senderName}</strong> on Despoke.</p><p>Log in to read and reply.</p>`
    };
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Send bulk notifications (for admin announcements)
   */
  async sendBulkNotification(
    recipients: Array<{ email: string; type: 'brand' | 'manufacturer'; id: string }>,
    subject: string,
    message: string
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        await this.sendEmail(recipient.email, subject, message);
        
        // Create in-app notification
        const notificationData: any = {
          type: 'announcement',
          message,
          data: { isAdmin: true },
          read: false
        };

        if (recipient.type === 'brand') {
          notificationData.business = recipient.id;
        } else {
          notificationData.manufacturer = recipient.id;
        }

        await this.createInAppNotification(notificationData);
        sent++;
      } catch (error) {
        failed++;
        errors.push(`Failed to send to ${recipient.email}: ${error.message}`);
      }
    }

    return { sent, failed, errors };
  }
}
