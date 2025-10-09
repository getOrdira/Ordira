import { TemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { NotificationCategory } from '../types/notificationCategory';

export const connectionTemplates: Record<string, (context: TemplateContext) => TemplateOutput> = {
  'connection.requested': ({ payload }) => {
    const requester = (payload?.requesterName as string) || 'A partner';
    return {
      email: {
        subject: `${requester} sent you a connection request`,
        text: `${requester} wants to collaborate with your team. View the request in your dashboard to respond.`,
      },
      webhook: payload,
      inApp: {
        message: `${requester} requested a connection`,
        actionUrl: payload?.requestUrl as string | undefined,
      },
      metadata: { category: NotificationCategory.Connection },
    };
  },
  'connection.accepted': ({ payload }) => {
    const partner = (payload?.partnerName as string) || 'Your partner';
    return {
      email: {
        subject: `${partner} accepted your connection`,
        text: `Great news! ${partner} accepted your connection request. You can now collaborate on projects.`,
      },
      webhook: payload,
      inApp: {
        message: `${partner} accepted your connection`,
        actionUrl: payload?.connectionUrl as string | undefined,
      },
      metadata: { category: NotificationCategory.Connection },
    };
  },
};
