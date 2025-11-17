import { Business } from '../../../models/core/business.model';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { NotificationPreferences, DEFAULT_CHANNEL_PREFERENCES, DEFAULT_CATEGORY_PREFERENCES } from '../types';

export class PreferenceDataService {
  private ensureDefaults(prefs?: NotificationPreferences | null): NotificationPreferences {
    return {
      channel: { ...DEFAULT_CHANNEL_PREFERENCES, ...(prefs?.channel ?? {}) },
      categories: { ...DEFAULT_CATEGORY_PREFERENCES, ...(prefs?.categories ?? {}) },
      frequency: prefs?.frequency ?? 'immediate',
      timezone: prefs?.timezone,
    };
  }

  async getBusinessPreferences(businessId: string): Promise<NotificationPreferences> {
    const business = await Business.findById(businessId).select('notificationPreferences').lean();
    return this.ensureDefaults((business as any)?.notificationPreferences);
  }

  async getManufacturerPreferences(manufacturerId: string): Promise<NotificationPreferences> {
    const manufacturer = await Manufacturer.findById(manufacturerId).select('notificationPreferences').lean();
    return this.ensureDefaults((manufacturer as any)?.notificationPreferences);
  }

  async upsertBusinessPreferences(businessId: string, preferences: NotificationPreferences): Promise<void> {
    await Business.updateOne(
      { _id: businessId },
      { $set: { notificationPreferences: this.ensureDefaults(preferences) } },
      { upsert: false }
    );
  }

  async upsertManufacturerPreferences(manufacturerId: string, preferences: NotificationPreferences): Promise<void> {
    await Manufacturer.updateOne(
      { _id: manufacturerId },
      { $set: { notificationPreferences: this.ensureDefaults(preferences) } },
      { upsert: false }
    );
  }
}

export const preferenceDataService = new PreferenceDataService();

