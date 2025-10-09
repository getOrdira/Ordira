import { TemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { NotificationCategory } from '../types/notificationCategory';
import { NotificationPriority } from '../types/notificationPriority';

export const accountTemplates: Record<string, (context: TemplateContext) => TemplateOutput> = {
  'account.security_alert': ({ payload }) => {
    return {
      email: {
        subject: 'Security Alert',
        text: 'We detected a security event on your account. Please review your recent activity.',
      },
      webhook: payload,
      inApp: {
        message: 'Security alert on your account',
        actionUrl: payload?.securityCenterUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Security,
        priority: NotificationPriority.Urgent,
      },
    };
  },
  'account.profile_updated': ({ payload }) => {
    const fields = (payload?.fields as string[])?.join(', ') || 'profile details';
    return {
      email: {
        subject: 'Profile Updated',
        text: `Your profile has been updated: ${fields}. If this wasn't you, contact support immediately.`,
      },
      webhook: payload,
      inApp: {
        message: 'Your profile was updated',
        actionUrl: payload?.profileUrl as string | undefined,
      },
      metadata: {
        category: NotificationCategory.Account,
        priority: NotificationPriority.High,
      },
    };
  },
  'account.verification_submitted': ({ payload }) => {
    const reference = (payload?.referenceId as string) || 'Submission';
    return {
      email: {
        subject: 'Verification Submitted',
        text: `Thanks for submitting verification. Reference: ${reference}. We'll review it shortly.`,
      },
      webhook: payload,
      inApp: {
        message: 'Verification submitted',
      },
      metadata: {
        category: NotificationCategory.Security,
      },
    };
  },
};
