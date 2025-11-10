// src/lib/api/features/notifications/index.ts
// Notifications API barrel export

import notificationsAnalyticsApi from './notificationsAnalytics.api';
import notificationsBatchingApi from './notificationsBatching.api';
import notificationsDeliveryApi from './notificationsDelivery.api';
import notificationsInboxApi from './notificationsInbox.api';
import notificationsMaintenanceApi from './notificationsMaintenance.api';
import notificationsOutboundApi from './notificationsOutbound.api';
import notificationsPreferencesApi from './notificationsPreferences.api';
import notificationsTemplateApi from './notificationsTemplate.api';
import notificationsTriggersApi from './notificationsTriggers.api';

export * from './notificationsAnalytics.api';
export * from './notificationsBatching.api';
export * from './notificationsDelivery.api';
export * from './notificationsInbox.api';
export * from './notificationsMaintenance.api';
export * from './notificationsOutbound.api';
export * from './notificationsPreferences.api';
export * from './notificationsTemplate.api';
export * from './notificationsTriggers.api';

export {
  notificationsAnalyticsApi,
  notificationsBatchingApi,
  notificationsDeliveryApi,
  notificationsInboxApi,
  notificationsMaintenanceApi,
  notificationsOutboundApi,
  notificationsPreferencesApi,
  notificationsTemplateApi,
  notificationsTriggersApi
};

export const notificationsApi = {
  analytics: notificationsAnalyticsApi,
  batching: notificationsBatchingApi,
  delivery: notificationsDeliveryApi,
  inbox: notificationsInboxApi,
  maintenance: notificationsMaintenanceApi,
  outbound: notificationsOutboundApi,
  preferences: notificationsPreferencesApi,
  template: notificationsTemplateApi,
  triggers: notificationsTriggersApi
};

export default notificationsApi;
