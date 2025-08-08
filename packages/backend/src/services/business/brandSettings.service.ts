// src/services/business/brandSettings.service.ts
import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import * as certificateManager from '../external/certificateManager'; // your SSL provisioning module

export class BrandSettingsService {

  /**
   * Get or create brand settings for a business
   */
  async getSettings(businessId: string): Promise<IBrandSettings> {
    let settings = await BrandSettings.findOne({ business: businessId });
    if (!settings) {
      settings = await BrandSettings.create({ business: businessId });
    }
    return settings;
  }

  async updateCertificateWallet(businessId: string, certificateWallet: string): Promise<IBrandSettings> {
    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      { certificateWallet },
      { new: true, upsert: true }
    ) as IBrandSettings;
    return settings;
  }

  /**
   * Update brand settings, and provision SSL if customDomain is added/changed
   */
  async updateSettings(
    businessId: string,
    data: Partial<{
      themeColor: string;
      logoUrl: string;
      bannerImages: string[];
      customCss: string;
      customDomain: string;
    }>
  ): Promise<IBrandSettings> {
    // 1️⃣ Update (or insert) the settings document
    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      data,
      { new: true, upsert: true }
    ) as IBrandSettings;

    // 2️⃣ If they've set or changed a customDomain, provision SSL for it
    if (data.customDomain) {
      try {
        await certificateManager.provisionCertForHost(data.customDomain);
      } catch (err) {
        // Log error but don't block the update
        console.error(`SSL provisioning failed for ${data.customDomain}:`, err);
      }
    }

    return settings;
  }

  async updateSubdomain(businessId: string, subdomain: string): Promise<IBrandSettings> {
    // Check if subdomain is already taken
    const existing = await BrandSettings.findOne({ 
      subdomain, 
      business: { $ne: businessId } 
    });
    
    if (existing) {
      throw { statusCode: 409, message: 'Subdomain already taken' };
    }

    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      { subdomain },
      { new: true, upsert: true }
    ) as IBrandSettings;

    return settings;
  }

  async removeCustomDomain(businessId: string): Promise<IBrandSettings> {
    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      { $unset: { customDomain: 1 } },
      { new: true }
    ) as IBrandSettings;

    if (!settings) {
      throw { statusCode: 404, message: 'Brand settings not found' };
    }

    return settings;
  }

  async getPublicSettings(businessId: string): Promise<Pick<IBrandSettings, 'themeColor' | 'logoUrl' | 'bannerImages' | 'customCss'>> {
    const settings = await BrandSettings.findOne({ business: businessId })
      .select('themeColor logoUrl bannerImages customCss');
    
    if (!settings) {
      throw { statusCode: 404, message: 'Brand settings not found' };
    }

    return settings;
  }

  async validateSubdomain(subdomain: string): Promise<boolean> {
    // Basic validation: alphanumeric and hyphens only, 3-63 chars
    const isValid = /^[a-zA-Z0-9-]{3,63}$/.test(subdomain);
    if (!isValid) return false;

    // Check if available
    const existing = await BrandSettings.findOne({ subdomain });
    return !existing;
  }
}
