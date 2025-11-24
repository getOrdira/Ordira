import nodemailer from 'nodemailer';
import path from 'path';
import { NotificationEvent } from '../types/notificationEvent';
import { templateService } from '../features/template.service';
import { logger } from '../../../utils/logger';
import { UtilsService } from '../../infrastructure/shared';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    // Do not fail on invalid certs (useful for some SMTP servers)
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
  },
  // Connection timeout settings (in milliseconds)
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000, // 10 seconds
  socketTimeout: 10000 // 10 seconds
} as any);

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

export class EmailChannel {
  private validateEmailAddress(email: string): void {
    if (!email || !UtilsService.isValidEmail(email)) {
      throw { statusCode: 400, message: 'Invalid email address provided' };
    }
  }

  private sanitizeEmailContent(content: string): string {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  private generateEmailId(): string {
    return UtilsService.generateSecureToken(16);
  }

  private async retryEmailSend(
    emailFn: () => Promise<void>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<void> {
    return UtilsService.retry(emailFn, maxRetries, baseDelay);
  }

  async send(event: NotificationEvent, options: EmailOptions = {}): Promise<void> {
    if (!event.recipient.email) {
      logger.warn('No email recipient provided', { type: event.type });
      return;
    }

    this.validateEmailAddress(event.recipient.email);

    const templateKey = event.metadata?.templateKey ?? event.type;
    const template = templateService.render(templateKey, { payload: event.payload });
    
    if (!template?.email) {
      logger.warn('No email template found', { templateKey, type: event.type });
      return;
    }

    // Normalize email and sanitize content
    const normalizedEmail = UtilsService.normalizeEmail(event.recipient.email);
    const sanitizedSubject = this.sanitizeEmailContent(template.email.subject);
    const sanitizedText = this.sanitizeEmailContent(template.email.text);
    const sanitizedHtml = template.email.html ? this.sanitizeEmailContent(template.email.html) : undefined;

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

    // Add Postmark Message Stream header if configured
    if (process.env.SMTP_MESSAGE_STREAM) {
      emailPayload.headers['X-PM-Message-Stream'] = process.env.SMTP_MESSAGE_STREAM;
    }

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
          await transporter.sendMail(emailPayload);
        },
        maxRetries
      );

      this.logNotificationEvent('EMAIL_SENT', normalizedEmail, 'EMAIL', true, {
        emailId,
        subject: sanitizedSubject,
        priority: options.priority || 'normal',
        type: event.type
      });

    } catch (error) {
      this.logNotificationEvent('EMAIL_FAILED', normalizedEmail, 'EMAIL', false, {
        emailId,
        error: error.message,
        type: event.type
      });
      throw new Error(`Failed to send email to ${UtilsService.maskEmail(normalizedEmail)}: ${error.message}`);
    }
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
    
    logger.info(`[NOTIFICATIONS] ${timestamp} - ${event} - ${type} - ${maskedRecipient} - ${success ? 'SUCCESS' : 'FAILED'}${metadata ? ` - ${JSON.stringify(metadata)}` : ''}`);
  }

  async testConfiguration(): Promise<{
    isConfigured: boolean;
    canConnect: boolean;
    errors: string[];
    serverInfo?: any;
  }> {
    const result = {
      isConfigured: false,
      canConnect: false,
      errors: [] as string[],
      serverInfo: undefined as Record<string, any> | undefined
    };

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      result.errors.push('Missing SMTP configuration (SMTP_HOST, SMTP_USER, or SMTP_PASS)');
      return result;
    }

    result.isConfigured = true;

    try {
      // Add timeout to prevent hanging (15 second timeout for SMTP AUTH propagation)
      const verificationPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP verification timeout after 15 seconds. This may indicate: 1) SMTP AUTH changes not yet propagated (wait 15-60 min), 2) Firewall blocking port 587, 3) Incorrect SMTP_HOST (should be smtp.office365.com for Microsoft 365)')), 15000)
      );
      
      const verification = await Promise.race([verificationPromise, timeoutPromise]);
      result.canConnect = verification === true;
      
      result.serverInfo = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: Number(process.env.SMTP_PORT) === 465
      };

    } catch (error: any) {
      let errorMessage = error.message || 'Unknown error';
      
      // Provide specific guidance for common Microsoft 365 errors
      if (errorMessage.includes('security defaults policy') || errorMessage.includes('locked by your organization')) {
        errorMessage += '. This means Microsoft 365 Security Defaults is blocking SMTP authentication. Solutions: 1) Disable Security Defaults in Azure AD (requires admin), 2) Create a Conditional Access policy to allow SMTP AUTH, 3) Use a service account excluded from Security Defaults. See RENDER_ENV_SETUP.md for detailed steps.';
      } else if (errorMessage.includes('SmtpClientAuthentication is disabled')) {
        errorMessage += '. Enable SMTP AUTH in Exchange Admin Center → Settings → Security (uncheck "Turn off SMTP AUTH protocol") and for your mailbox using PowerShell: Set-CASMailbox -Identity "your-email@domain.com" -SmtpClientAuthenticationDisabled $false';
      } else if (errorMessage.includes('Invalid login') || errorMessage.includes('Authentication unsuccessful')) {
        errorMessage += '. Verify: 1) SMTP_USER is your full email address, 2) SMTP_PASS is correct (use App Password if MFA is enabled), 3) SMTP AUTH is enabled for your mailbox, 4) Security Defaults is not blocking the account.';
      }
      
      result.errors.push(`SMTP connection failed: ${errorMessage}`);
      result.canConnect = false;
    }

    return result;
  }
}

export const emailChannel = new EmailChannel();
