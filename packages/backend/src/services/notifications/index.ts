import { inboxService, deliveryService, preferencesService, analyticsService, batchingService, templateService, triggersService, maintenanceService, outboundNotificationService } from './features';
import { notificationDataService, preferenceDataService, digestDataService } from './core';
import { notificationValidationService, preferenceValidationService } from './validation';
import { eventHandlerService, digestSchedulerService } from './workflows';

export * from './core';
export * from './features';
export * from './channels';
export * from './templates';
export * from './utils';
export * from './validation';
export * from './workflows';
export * from './types';

export const NotificationsServices = {
  core: {
    notificationDataService,
    preferenceDataService,
    digestDataService,
  },
  features: {
    inboxService,
    deliveryService,
    preferencesService,
    analyticsService,
    batchingService,
    templateService,
    triggersService,
    maintenanceService,
    outboundNotificationService,
  },
  validation: {
    notificationValidationService,
    preferenceValidationService,
  },
  workflows: {
    eventHandlerService,
    digestSchedulerService,
  },
} as const;

export const getNotificationsServices = () => NotificationsServices;

export const NotificationsModuleInfo = {
  version: '1.0.0',
  channels: ['email', 'webhook', 'inApp'],
  features: ['inbox', 'delivery', 'preferences', 'analytics', 'batching', 'maintenance', 'outbound'],
} as const;
