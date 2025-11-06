/**
 * Notification Types
 * 
 * Re-exports backend notification types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  NotificationFilters,
  NotificationSummary,
  NotificationStats,
  NotificationPreferences,
  ChannelPreferences,
  CategoryPreferences,
  TemplateContext,
  EmailVerificationTemplateContext,
  PasswordResetTemplateContext,
  WelcomeTemplateContext,
  TransferNotificationTemplateContext,
  TransferFailureTemplateContext,
  WalletChangeTemplateContext,
  PaymentFailureTemplateContext,
  PlanChangeTemplateContext,
  UsageLimitTemplateContext,
  VerificationSubmissionTemplateContext,
  AccountDeactivationTemplateContext,
  ProfileChangeTemplateContext,
  AccessControlTemplateContext,
  MessageTemplateContext,
  VotingTemplateContext,
  ContractDeploymentTemplateContext,
  BulkNotificationTemplateContext
} from '@backend/services/notifications/types';

// Re-export all backend types
export type {
  NotificationFilters,
  NotificationSummary,
  NotificationStats,
  NotificationPreferences,
  ChannelPreferences,
  CategoryPreferences,
  TemplateContext,
  EmailVerificationTemplateContext,
  PasswordResetTemplateContext,
  WelcomeTemplateContext,
  TransferNotificationTemplateContext,
  TransferFailureTemplateContext,
  WalletChangeTemplateContext,
  PaymentFailureTemplateContext,
  PlanChangeTemplateContext,
  UsageLimitTemplateContext,
  VerificationSubmissionTemplateContext,
  AccountDeactivationTemplateContext,
  ProfileChangeTemplateContext,
  AccessControlTemplateContext,
  MessageTemplateContext,
  VotingTemplateContext,
  ContractDeploymentTemplateContext,
  BulkNotificationTemplateContext
};

// Re-export constants
export {
  DEFAULT_CHANNEL_PREFERENCES,
  DEFAULT_CATEGORY_PREFERENCES
} from '@backend/services/notifications/types/notificationPreferences';

// Re-export from separate files
export * from './notificationCategory';
export * from './notificationRecipient';
export * from './notificationEvent';

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Notification display type with enhanced UI fields
 */
export interface NotificationDisplay extends NotificationSummary {
  _ui?: {
    formattedTimestamp?: string;
    relativeTime?: string;
    priorityBadge?: 'low' | 'medium' | 'high' | 'urgent';
    categoryBadge?: string;
    isActionable?: boolean;
    actionButtonText?: string;
    icon?: string;
  };
}

/**
 * Notification preferences form data
 */
export interface NotificationPreferencesFormData {
  channel: ChannelPreferences;
  categories: CategoryPreferences;
  frequency: 'immediate' | 'daily' | 'weekly';
  timezone?: string;
  _ui?: {
    validationErrors?: Record<string, string>;
  };
}

/**
 * Notification list view options
 */
export interface NotificationListViewOptions {
  filters?: NotificationFilters;
  viewMode?: 'all' | 'unread' | 'read';
  sortBy?: 'date' | 'priority' | 'category';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

