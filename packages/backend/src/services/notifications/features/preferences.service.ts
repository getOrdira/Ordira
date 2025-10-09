import { preferenceDataService } from '../core/preferenceData.service';
import { NotificationRecipient, NotificationCategory, ChannelPreferences, NotificationPreferences, DEFAULT_CHANNEL_PREFERENCES } from '../types';

export interface ResolvedPreferences {
  channel: Required<ChannelPreferences>;
  frequency: 'immediate' | 'daily' | 'weekly';
  timezone?: string;
}

export class PreferencesService {
  async resolve(recipient: NotificationRecipient, category?: NotificationCategory): Promise<ResolvedPreferences> {
    let prefs: NotificationPreferences;

    if (recipient.businessId) {
      prefs = await preferenceDataService.getBusinessPreferences(recipient.businessId);
    } else if (recipient.manufacturerId) {
      prefs = await preferenceDataService.getManufacturerPreferences(recipient.manufacturerId);
    } else {
      prefs = {
        channel: DEFAULT_CHANNEL_PREFERENCES,
        categories: {},
        frequency: 'immediate',
      };
    }

    const baseChannels = { ...DEFAULT_CHANNEL_PREFERENCES, ...prefs.channel } as Required<ChannelPreferences>;

    if (category && prefs.categories?.[category]) {
      return {
        channel: { ...baseChannels, ...prefs.categories[category] } as Required<ChannelPreferences>,
        frequency: prefs.frequency,
        timezone: prefs.timezone,
      };
    }

    return {
      channel: baseChannels,
      frequency: prefs.frequency,
      timezone: prefs.timezone,
    };
  }

  async update(recipient: NotificationRecipient, preferences: NotificationPreferences): Promise<void> {
    if (recipient.businessId) {
      await preferenceDataService.upsertBusinessPreferences(recipient.businessId, preferences);
    } else if (recipient.manufacturerId) {
      await preferenceDataService.upsertManufacturerPreferences(recipient.manufacturerId, preferences);
    }
  }
}

export const preferencesService = new PreferencesService();
