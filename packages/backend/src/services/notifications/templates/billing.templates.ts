import { TemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { formatCurrency } from './helpers';
import { NotificationCategory } from '../types/notificationCategory';

export const billingTemplates: Record<string, (context: TemplateContext) => TemplateOutput> = {
  'billing.plan-change': ({ payload }) => {
    const oldPlan = (payload?.oldPlan as string) || 'Previous Plan';
    const newPlan = (payload?.newPlan as string) || 'Current Plan';
    const changeDate = payload?.changeDate as string | undefined;

    return {
      email: {
        subject: `Plan Changed: Welcome to ${newPlan}!`,
        text: `Your subscription has been updated from ${oldPlan} to ${newPlan}${changeDate ? ` on ${changeDate}` : ''}.`,
      },
      webhook: payload,
      inApp: {
        message: `Subscription upgraded to ${newPlan}`,
      },
      metadata: {
        category: NotificationCategory.Billing,
      },
    };
  },
  'billing.renewal-success': ({ payload }) => {
    const plan = (payload?.plan as string) || 'your plan';
    const amount = payload?.amount ? formatCurrency(Number(payload.amount)) : undefined;

    return {
      email: {
        subject: 'Subscription Renewed Successfully',
        text: `Your ${plan} subscription has been renewed${amount ? ` for ${amount}` : ''}.`,
      },
      webhook: payload,
      inApp: {
        message: `Subscription renewed${amount ? ` (${amount})` : ''}`,
      },
      metadata: {
        category: NotificationCategory.Billing,
      },
    };
  },
  'billing.payment-failed': ({ payload }) => {
    const invoiceId = (payload?.invoiceId as string) || 'Invoice';

    return {
      email: {
        subject: 'Payment Failed - Action Required',
        text: `We were unable to process payment for ${invoiceId}. Please update your payment method.`,
      },
      webhook: payload,
      inApp: {
        message: `Payment failed for ${invoiceId}`,
      },
      metadata: {
        category: NotificationCategory.Billing,
      },
    };
  },
  'billing.renewal-upcoming': ({ payload }) => {
    const plan = (payload?.plan as string) || 'your plan';
    const renewalDate = payload?.renewalDate as string | undefined;
    return {
      email: {
        subject: 'Subscription Renewal Reminder',
        text: `Your ${plan} subscription will renew${renewalDate ? ` on ${renewalDate}` : ''}.`,
      },
      webhook: payload,
      inApp: {
        message: `${plan} renews soon`,
      },
      metadata: {
        category: NotificationCategory.Billing,
      },
    };
  },
  'billing.subscription-welcome': ({ payload }) => {
    const plan = (payload?.plan as string) || 'your plan';

    return {
      email: {
        subject: `Welcome to ${plan}!`,
        text: `Thanks for subscribing to ${plan}. You now have access to all associated features.`,
      },
      webhook: payload,
      inApp: {
        message: `Welcome to ${plan}`,
      },
      metadata: {
        category: NotificationCategory.Billing,
      },
    };
  },
  'billing.subscription-cancelled': ({ payload }) => {
    const plan = (payload?.plan as string) || 'your plan';

    return {
      email: {
        subject: 'Subscription Cancelled',
        text: `Your ${plan} subscription has been cancelled. We're sorry to see you go.`,
      },
      webhook: payload,
      inApp: {
        message: `${plan} subscription cancelled`,
      },
      metadata: {
        category: NotificationCategory.Billing,
      },
    };
  },
};
