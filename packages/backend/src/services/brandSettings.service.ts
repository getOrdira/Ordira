// src/services/brandSettings.service.ts
import { BrandSettings, IBrandSettings } from '../models/brandSettings.model';
import * as certificateManager from './certificateManager'; // your SSL provisioning module

/**
 * Get or create brand settings for a business
 */
export async function getSettings(businessId: string): Promise<IBrandSettings> {
  let settings = await BrandSettings.findOne({ business: businessId });
  if (!settings) {
    settings = await BrandSettings.create({ business: businessId });
  }
  return settings;
}

export async function updateCertificateWallet(
  businessId: string,
  certificateWallet: string
): Promise<IBrandSettings> {
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
export async function updateSettings(
  businessId: string,
  data: Partial<{
    themeColor:    string;
    logoUrl:       string;
    bannerImages:  string[];
    customCss:     string;
    customDomain:  string;
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
