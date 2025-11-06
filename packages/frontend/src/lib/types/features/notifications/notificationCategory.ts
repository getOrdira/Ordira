/**
 * Notification Category Types
 * 
 * Re-exports backend notification category types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import enum for use in types
import {
  NotificationCategory
} from '@backend/services/notifications/types/notificationCategory';

// Export enum (enums are both types and values)
export {
  NotificationCategory
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Notification category display metadata
 */
export interface NotificationCategoryDisplay {
  category: NotificationCategory;
  label: string;
  icon?: string;
  color?: string;
  description?: string;
}

