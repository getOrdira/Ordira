/**
 * Notification Event Types
 * 
 * Re-exports backend notification event types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  NotificationEvent,
  NotificationEventMetadata
} from '@backend/services/notifications/types/notificationEvent';

import type {
  NotificationEventType
} from '@backend/services/notifications/types/notificationEventType';

import type {
  NotificationCategory
} from '@backend/services/notifications/types/notificationCategory';

import type {
  NotificationPriority
} from '@backend/services/notifications/types/notificationPriority';

// Re-export all backend types
export type {
  NotificationEvent,
  NotificationEventMetadata
};

export {
  NotificationEventType
} from '@backend/services/notifications/types/notificationEventType';

export {
  NotificationCategory
} from '@backend/services/notifications/types/notificationCategory';

export {
  NotificationPriority
} from '@backend/services/notifications/types/notificationPriority';

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Notification event display type with enhanced UI fields
 */
export interface NotificationEventDisplay extends NotificationEvent {
  _ui?: {
    formattedType?: string;
    typeLabel?: string;
    categoryLabel?: string;
    priorityLabel?: string;
    formattedTimestamp?: string;
    relativeTime?: string;
    statusBadge?: 'pending' | 'sent' | 'delivered' | 'failed';
    actionButtonText?: string;
    icon?: string;
  };
}

/**
 * Notification event form data for creating events
 */
export interface NotificationEventFormData {
  type: NotificationEventType;
  recipient: {
    businessId?: string;
    manufacturerId?: string;
    userId?: string;
    email?: string;
    webhookUrl?: string;
    name?: string;
  };
  payload: Record<string, unknown>;
  metadata?: {
    category?: NotificationCategory;
    priority?: NotificationPriority;
    title?: string;
    message?: string;
    actionUrl?: string;
    templateKey?: string;
    channels?: {
      email?: boolean;
      webhook?: boolean;
      inApp?: boolean;
      slack?: boolean;
    };
  };
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    scheduledFor?: Date;
  };
}

