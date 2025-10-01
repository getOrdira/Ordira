// src/services/brands/core/brandProfile.service.ts
import { BrandSettings, IBrandSettings } from '../../../models/brandSettings.model';
import { Business, IBusiness } from '../../../models/business.model';

export interface BrandProfileSummary {
  id: string;
  businessId: string;
  businessName: string;
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  subdomain: string;
  customDomain?: string;
}

type PopulatedBrandSettings = IBrandSettings & { business: IBusiness };

export class BrandProfileCoreService {
  /**
   * List all brand profiles with basic presentation metadata.
   */
  async listBrandProfiles(): Promise<BrandProfileSummary[]> {
    const settings = await BrandSettings.find().populate<PopulatedBrandSettings>('business', 'businessName');

    return settings.map(setting => this.mapSettingsToProfile(setting));
  }

  /**
   * Get a single brand profile by its settings identifier.
   */
  async getBrandProfile(id: string): Promise<BrandProfileSummary> {
    const setting = await BrandSettings
      .findById(id)
      .populate<PopulatedBrandSettings>('business', 'businessName');

    if (!setting) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }

    return this.mapSettingsToProfile(setting);
  }

  /**
   * Get an individual brand profile using the public subdomain.
   */
  async getBrandProfileBySubdomain(subdomain: string): Promise<BrandProfileSummary | null> {
    const setting = await BrandSettings
      .findOne({ subdomain })
      .populate<PopulatedBrandSettings>('business', 'businessName');

    if (!setting) {
      return null;
    }

    return this.mapSettingsToProfile(setting);
  }

  /**
   * Resolve a brand profile from a custom domain if configured.
   */
  async getBrandProfileByCustomDomain(customDomain: string): Promise<BrandProfileSummary | null> {
    const setting = await BrandSettings
      .findOne({ customDomain })
      .populate<PopulatedBrandSettings>('business', 'businessName');

    if (!setting) {
      return null;
    }

    return this.mapSettingsToProfile(setting);
  }

  /**
   * Search brand profiles by business name using case-insensitive matching.
   */
  async searchBrandProfiles(query: string): Promise<BrandProfileSummary[]> {
    const settings = await BrandSettings
      .find()
      .populate<PopulatedBrandSettings>({
        path: 'business',
        select: 'businessName',
        match: {
          businessName: { $regex: query, $options: 'i' }
        }
      });

    return settings
      .filter(setting => Boolean(setting.business))
      .map(setting => this.mapSettingsToProfile(setting as PopulatedBrandSettings & typeof setting));
  }

  /**
   * Helper to normalize brand settings into the shared summary shape.
   */
  protected mapSettingsToProfile(setting: any): BrandProfileSummary {
    const business = setting.business;

    return {
      id: setting._id.toString(),
      businessId: business._id.toString(),
      businessName: business.businessName,
      themeColor: setting.themeColor,
      logoUrl: setting.logoUrl,
      bannerImages: setting.bannerImages,
      subdomain: setting.subdomain!,
      customDomain: setting.customDomain
    };
  }
}

export const brandProfileCoreService = new BrandProfileCoreService();

export type BrandProfile = BrandProfileSummary;
