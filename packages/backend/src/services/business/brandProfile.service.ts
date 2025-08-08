// src/services/business/brandProfile.service.ts
import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import { IBusiness } from '../../models/business.model';

export interface BrandProfile {
  id: string;
  businessId: string;
  businessName: string;
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  subdomain: string;
  customDomain?: string;
}

export class BrandProfileService {

  async listBrandProfiles(): Promise<BrandProfile[]> {
    const settings = await BrandSettings
      .find()
      .populate<IBrandSettings & { business: IBusiness }>(
        'business',
        'businessName'
      );

    return settings.map(s => ({
      id: s._id.toString(),
      businessId: s.business._id.toString(),
      businessName: s.business.businessName,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl,
      bannerImages: s.bannerImages,
      subdomain: s.subdomain!,
      customDomain: s.customDomain
    }));
  }

  async getBrandProfile(id: string): Promise<BrandProfile> {
    const s = await BrandSettings
      .findById(id)
      .populate<IBrandSettings & { business: IBusiness }>(
        'business',
        'businessName'
      );
    if (!s) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return {
      id: s._id.toString(),
      businessId: s.business._id.toString(),
      businessName: s.business.businessName,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl,
      bannerImages: s.bannerImages,
      subdomain: s.subdomain!,
      customDomain: s.customDomain
    };
  }

  async getBrandProfileBySubdomain(subdomain: string): Promise<BrandProfile | null> {
    const s = await BrandSettings
      .findOne({ subdomain })
      .populate<IBrandSettings & { business: IBusiness }>(
        'business',
        'businessName'
      );
    
    if (!s) return null;

    return {
      id: s._id.toString(),
      businessId: s.business._id.toString(),
      businessName: s.business.businessName,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl,
      bannerImages: s.bannerImages,
      subdomain: s.subdomain!,
      customDomain: s.customDomain
    };
  }

  async getBrandProfileByCustomDomain(customDomain: string): Promise<BrandProfile | null> {
    const s = await BrandSettings
      .findOne({ customDomain })
      .populate<IBrandSettings & { business: IBusiness }>(
        'business',
        'businessName'
      );
    
    if (!s) return null;

    return {
      id: s._id.toString(),
      businessId: s.business._id.toString(),
      businessName: s.business.businessName,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl,
      bannerImages: s.bannerImages,
      subdomain: s.subdomain!,
      customDomain: s.customDomain
    };
  }

  async searchBrandProfiles(query: string): Promise<BrandProfile[]> {
    const settings = await BrandSettings
      .find()
      .populate<IBrandSettings & { business: IBusiness }>({
        path: 'business',
        select: 'businessName',
        match: {
          businessName: { $regex: query, $options: 'i' }
        }
      });

    return settings
      .filter(s => s.business) // Only include matches
      .map(s => ({
        id: s._id.toString(),
        businessId: s.business._id.toString(),
        businessName: s.business.businessName,
        themeColor: s.themeColor,
        logoUrl: s.logoUrl,
        bannerImages: s.bannerImages,
        subdomain: s.subdomain!,
        customDomain: s.customDomain
      }));
  }
}