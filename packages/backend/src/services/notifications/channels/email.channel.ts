import nodemailer from 'nodemailer';
import { NotificationEvent } from '../types/notificationEvent';
import { templateService } from '../features/template.service';
import { logger } from '../../../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export class EmailChannel {
  async send(event: NotificationEvent): Promise<void> {
    const templateKey = event.metadata?.templateKey ?? event.type;
    const template = templateService.render(templateKey, { payload: event.payload });
    if (!template?.email || !event.recipient.email) {
      return;
    }

    try {
      await transporter.sendMail({
        to: event.recipient.email,
        subject: template.email.subject,
        text: template.email.text,
        html: template.email.html
      });
    } catch (error) {
      logger.error('Email delivery failed', { error, type: event.type });
    }
  }
}

export const emailChannel = new EmailChannel();
