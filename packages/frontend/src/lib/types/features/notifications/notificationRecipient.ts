/**
 * Notification Recipient Types
 * 
 * Re-exports backend notification recipient types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  NotificationRecipient
} from '@backend/services/notifications/types/notificationRecipient';

// Re-export all backend types
export type {
  NotificationRecipient
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Notification recipient display type with enhanced UI fields
 */
export interface NotificationRecipientDisplay extends NotificationRecipient {
  _ui?: {
    displayName?: string;
    avatarUrl?: string;
    recipientType?: 'business' | 'manufacturer' | 'user' | 'email' | 'webhook';
    formattedName?: string;
  };
}

/**
 * Notification recipient form data
 */
export interface NotificationRecipientFormData {
  businessId?: string;
  manufacturerId?: string;
  userId?: string;
  email?: string;
  webhookUrl?: string;
  name?: string;
  _ui?: {
    validationErrors?: Record<string, string>;
    isValid?: boolean;
  };
}

