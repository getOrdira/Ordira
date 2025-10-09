import { NotificationCategory } from './notificationCategory';

export interface ChannelPreferences {
  email?: boolean;
  webhook?: boolean;
  inApp?: boolean;
}

export type CategoryPreferences = Partial<Record<NotificationCategory, ChannelPreferences>>;

export interface NotificationPreferences {
  channel: ChannelPreferences;
  categories: CategoryPreferences;
  frequency: 'immediate' | 'daily' | 'weekly';
  timezone?: string;
}

export const DEFAULT_CHANNEL_PREFERENCES: Required<ChannelPreferences> = {
  email: true,
  webhook: false,
  inApp: true,
};

export const DEFAULT_CATEGORY_PREFERENCES: CategoryPreferences = {
  [NotificationCategory.System]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Billing]: { ...DEFAULT_CHANNEL_PREFERENCES, webhook: false },
  [NotificationCategory.Certificate]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Connection]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Security]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Account]: { ...DEFAULT_CHANNEL_PREFERENCES },
};
