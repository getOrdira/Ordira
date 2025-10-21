import { NotificationCategory } from './notificationCategory';

export interface ChannelPreferences {
  email?: boolean;
  webhook?: boolean;
  inApp?: boolean;
  slack?: boolean;
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
  slack: false,
};

export const DEFAULT_CATEGORY_PREFERENCES: CategoryPreferences = {
  [NotificationCategory.System]: { ...DEFAULT_CHANNEL_PREFERENCES, slack: true },
  [NotificationCategory.Billing]: { ...DEFAULT_CHANNEL_PREFERENCES, webhook: false, slack: true },
  [NotificationCategory.Certificate]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Connection]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Security]: { ...DEFAULT_CHANNEL_PREFERENCES, slack: true },
  [NotificationCategory.Account]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Invite]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Order]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Vote]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Auth]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Wallet]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Messaging]: { ...DEFAULT_CHANNEL_PREFERENCES, slack: true },
  [NotificationCategory.Usage]: { ...DEFAULT_CHANNEL_PREFERENCES, slack: true },
  [NotificationCategory.Settings]: { ...DEFAULT_CHANNEL_PREFERENCES },
  [NotificationCategory.Bulk]: { ...DEFAULT_CHANNEL_PREFERENCES, slack: true },
};
