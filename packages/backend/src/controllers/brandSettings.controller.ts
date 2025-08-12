// src/controllers/brandSettings.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { BrandSettingsService } from '../services/business/brandSettings.service';
import { clearTenantCache } from '../middleware/tenant.middleware';

// Enhanced request interfaces
interface BrandSettingsRequest extends AuthRequest, TenantRequest, ValidatedRequest {
  body: {
    // Visual branding
    themeColor?: string;
    logoUrl?: string;
    bannerImages?: string[];
    customCss?: string;
    
    // Domain configuration
    subdomain?: string;
    customDomain?: string;
    
    // Certificate wallet
    certificateWallet?: string;
  };
}

interface WalletUpdateRequest extends AuthRequest, TenantRequest, ValidatedRequest {
  body: {
    certificateWallet: string;
  };
}

interface SubdomainRequest extends AuthRequest, TenantRequest, ValidatedRequest {
  body: {
    subdomain: string;
  };
}

// Initialize service
const brandSettingsService = new BrandSettingsService();

/**
 * GET /api/brand-settings
 * Retrieve brand settings - matches service.getSettings()
 */
export async function getBrandSettings(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get brand settings from service
    const settings = await brandSettingsService.getSettings(businessId);
    
    // Get plan-based available features
    const availableFeatures = getPlanFeatures(userPlan);

    // Track settings view
    trackManufacturerAction('view_brand_settings');

    res.json({
      settings: {
        ...settings.toObject(),
        lastUpdated: settings.updatedAt
      },
      features: {
        available: availableFeatures,
        currentPlan: userPlan,
        limitations: getPlanLimitations(userPlan)
      },
      domains: {
        subdomain: settings.subdomain,
        customDomain: settings.customDomain
      },
      web3: {
        walletConnected: !!settings.certificateWallet,
        certificateWallet: settings.certificateWallet
      }
    });
  } catch (error) {
    console.error('Get brand settings error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings
 * Update brand settings - matches service.updateSettings()
 */
export async function updateBrandSettings(
  req: BrandSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const updateData = req.validatedBody || req.body;
    const userPlan = req.tenant?.plan || 'foundation';

    // Validate plan permissions for requested features
    const restrictedFeatures = validatePlanFeatures(updateData, userPlan);
    if (restrictedFeatures.length > 0) {
      res.status(403).json({
        error: 'Some features require a higher plan',
        restrictedFeatures,
        currentPlan: userPlan,
        requiredPlans: getRequiredPlans(restrictedFeatures),
        code: 'PLAN_UPGRADE_REQUIRED'
      });
      return;
    }

    // Get current settings for comparison
    const currentSettings = await brandSettingsService.getSettings(businessId);

    // Validate subdomain if provided
    if (updateData.subdomain && updateData.subdomain !== currentSettings.subdomain) {
      const isValid = await brandSettingsService.validateSubdomain(updateData.subdomain);
      if (!isValid) {
        res.status(400).json({
          error: 'Subdomain is invalid or already taken',
          code: 'INVALID_SUBDOMAIN'
        });
        return;
      }
    }

    // Extract only the fields that the service supports
    const serviceUpdateData = {
      themeColor: updateData.themeColor,
      logoUrl: updateData.logoUrl,
      bannerImages: updateData.bannerImages,
      customCss: updateData.customCss,
      customDomain: updateData.customDomain
    };

    // Remove undefined fields
    Object.keys(serviceUpdateData).forEach(key => {
      if (serviceUpdateData[key as keyof typeof serviceUpdateData] === undefined) {
        delete serviceUpdateData[key as keyof typeof serviceUpdateData];
      }
    });

    // Update settings using service method
    const updatedSettings = await brandSettingsService.updateSettings(businessId, serviceUpdateData);

    // Handle subdomain update separately if provided
    if (updateData.subdomain && updateData.subdomain !== currentSettings.subdomain) {
      await brandSettingsService.updateSubdomain(businessId, updateData.subdomain);
    }

    // Clear tenant cache if critical changes made
    const criticalFields = ['subdomain', 'customDomain', 'certificateWallet'];
    const criticalChanges = Object.keys(updateData).some(field => criticalFields.includes(field));
    
    if (criticalChanges) {
      clearTenantCache(businessId);
    }

    // Track settings update
    trackManufacturerAction('update_brand_settings');

    // Calculate setup completeness
    const setupCompleteness = calculateSetupCompleteness(updatedSettings, userPlan);

    res.json({
      success: true,
      settings: updatedSettings,
      changes: {
        fieldsUpdated: Object.keys(updateData),
        criticalChanges
      },
      setup: {
        completeness: setupCompleteness,
        nextSteps: generateSetupRecommendations(updatedSettings, userPlan)
      },
      message: 'Brand settings updated successfully'
    });
  } catch (error) {
    console.error('Update brand settings error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/certificate-wallet
 * Update certificate wallet - matches service.updateCertificateWallet()
 */
export async function updateCertificateWallet(
  req: WalletUpdateRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { certificateWallet } = req.validatedBody || req.body;
    const userPlan = req.tenant?.plan || 'foundation';

    // Validate Web3 feature access
    if (!['premium', 'enterprise'].includes(userPlan)) {
      res.status(403).json({
        error: 'Web3 features require Premium plan or higher',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      });
      return;
    }

    // Basic wallet validation (address format)
    if (!isValidWalletAddress(certificateWallet)) {
      res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
      return;
    }

    // Get current settings for comparison
    const currentSettings = await brandSettingsService.getSettings(businessId);
    const previousWallet = currentSettings.certificateWallet;

    // Update wallet using service method
    const result = await brandSettingsService.updateCertificateWallet(businessId, certificateWallet);

    // Clear tenant cache
    clearTenantCache(businessId);

    // Track wallet update
    trackManufacturerAction('update_certificate_wallet');

    res.json({
      success: true,
      certificateWallet: result.certificateWallet,
      security: {
        walletChanged: previousWallet !== certificateWallet,
        backupRecommended: true
      },
      benefits: {
        web3Features: getWeb3Features(userPlan)
      },
      message: 'Certificate wallet updated successfully'
    });
  } catch (error) {
    console.error('Update certificate wallet error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/subdomain
 * Update subdomain - matches service.updateSubdomain()
 */
export async function updateSubdomain(
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { subdomain } = req.validatedBody || req.body;

    // Validate subdomain format and availability
    const isValid = await brandSettingsService.validateSubdomain(subdomain);
    if (!isValid) {
      res.status(400).json({
        error: 'Subdomain is invalid or already taken',
        code: 'INVALID_SUBDOMAIN'
      });
      return;
    }

    // Update subdomain using service method
    const updatedSettings = await brandSettingsService.updateSubdomain(businessId, subdomain);

    // Clear tenant cache
    clearTenantCache(businessId);

    // Track subdomain update
    trackManufacturerAction('update_subdomain');

    res.json({
      success: true,
      subdomain: updatedSettings.subdomain,
      url: `https://${subdomain}.yourdomain.com`, // Replace with your actual domain
      message: 'Subdomain updated successfully'
    });
  } catch (error) {
    console.error('Update subdomain error:', error);
    if (error.statusCode === 409) {
      res.status(409).json({
        error: 'Subdomain already taken',
        code: 'SUBDOMAIN_TAKEN'
      });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/brand-settings/custom-domain
 * Remove custom domain - matches service.removeCustomDomain()
 */
export async function removeCustomDomain(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;

    // Remove custom domain using service method
    const updatedSettings = await brandSettingsService.removeCustomDomain(businessId);

    // Clear tenant cache
    clearTenantCache(businessId);

    // Track custom domain removal
    trackManufacturerAction('remove_custom_domain');

    res.json({
      success: true,
      customDomain: null,
      settings: updatedSettings,
      message: 'Custom domain removed successfully'
    });
  } catch (error) {
    console.error('Remove custom domain error:', error);
    if (error.statusCode === 404) {
      res.status(404).json({
        error: 'Brand settings not found',
        code: 'SETTINGS_NOT_FOUND'
      });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/brand-settings/public
 * Get public brand settings - matches service.getPublicSettings()
 */
export async function getPublicBrandSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      res.status(400).json({
        error: 'Business ID is required',
        code: 'MISSING_BUSINESS_ID'
      });
      return;
    }

    // Get public settings using service method
    const publicSettings = await brandSettingsService.getPublicSettings(businessId);

    res.json({
      success: true,
      settings: publicSettings
    });
  } catch (error) {
    console.error('Get public brand settings error:', error);
    if (error.statusCode === 404) {
      res.status(404).json({
        error: 'Brand settings not found',
        code: 'SETTINGS_NOT_FOUND'
      });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/brand-settings/validate-subdomain
 * Validate subdomain availability - matches service.validateSubdomain()
 */
export async function validateSubdomain(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { subdomain } = req.body;

    if (!subdomain) {
      res.status(400).json({
        error: 'Subdomain is required',
        code: 'MISSING_SUBDOMAIN'
      });
      return;
    }

    // Validate using service method
    const isValid = await brandSettingsService.validateSubdomain(subdomain);

    res.json({
      subdomain,
      valid: isValid,
      available: isValid,
      message: isValid ? 'Subdomain is available' : 'Subdomain is invalid or already taken'
    });
  } catch (error) {
    console.error('Validate subdomain error:', error);
    next(error);
  }
}

// Helper functions
function getPlanFeatures(plan: string): string[] {
  const features = {
    foundation: ['Basic Branding', 'Subdomain'],
    growth: ['Enhanced Branding', 'Custom CSS'],
    premium: ['Custom Domain', 'Web3 Features', 'Advanced Branding'],
    enterprise: ['White-label', 'Priority Support', 'Advanced Features']
  };
  return features[plan as keyof typeof features] || [];
}

function getPlanLimitations(plan: string): string[] {
  const limitations = {
    foundation: ['No custom domain', 'No Web3 features', 'Basic branding only'],
    growth: ['No custom domain', 'Limited Web3 features'],
    premium: ['Advanced features available'],
    enterprise: ['No limitations']
  };
  return limitations[plan as keyof typeof limitations] || [];
}

function validatePlanFeatures(updateData: any, plan: string): string[] {
  const restricted: string[] = [];
  
  // Custom domain requires premium+
  if (updateData.customDomain && !['premium', 'enterprise'].includes(plan)) {
    restricted.push('customDomain');
  }
  
  // Web3 features require premium+
  if (updateData.certificateWallet && !['premium', 'enterprise'].includes(plan)) {
    restricted.push('certificateWallet');
  }
  
  // Custom CSS requires growth+
  if (updateData.customCss && !['growth', 'premium', 'enterprise'].includes(plan)) {
    restricted.push('customCss');
  }
  
  return restricted;
}

function getRequiredPlans(features: string[]): string[] {
  const planRequirements: Record<string, string> = {
    customDomain: 'premium',
    certificateWallet: 'premium',
    customCss: 'growth'
  };
  
  return [...new Set(features.map(feature => planRequirements[feature]).filter(Boolean))];
}

function isValidWalletAddress(address: string): boolean {
  // Basic Ethereum address validation (42 characters, starts with 0x, hex)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function calculateSetupCompleteness(settings: any, plan: string): number {
  const requiredFields = ['themeColor', 'logoUrl'];
  const optionalFields = ['bannerImages', 'customCss', 'subdomain'];
  const premiumFields = ['customDomain', 'certificateWallet'];
  
  let total = requiredFields.length + optionalFields.length;
  let completed = 0;
  
  // Add premium fields for higher plans
  if (['premium', 'enterprise'].includes(plan)) {
    total += premiumFields.length;
  }
  
  // Count completed fields
  [...requiredFields, ...optionalFields, ...premiumFields].forEach(field => {
    if (settings[field]) completed++;
  });
  
  return Math.round((completed / total) * 100);
}

function generateSetupRecommendations(settings: any, plan: string): string[] {
  const recommendations: string[] = [];
  
  if (!settings.logoUrl) {
    recommendations.push('Upload a brand logo for better recognition');
  }
  
  if (!settings.themeColor) {
    recommendations.push('Set a theme color to match your brand');
  }
  
  if (!settings.subdomain) {
    recommendations.push('Choose a subdomain for your brand page');
  }
  
  if (plan === 'foundation') {
    recommendations.push('Consider upgrading for custom domain and Web3 features');
  }
  
  if (['premium', 'enterprise'].includes(plan) && !settings.certificateWallet) {
    recommendations.push('Connect a Web3 wallet to access token discounts');
  }
  
  if (['premium', 'enterprise'].includes(plan) && !settings.customDomain) {
    recommendations.push('Add a custom domain for professional branding');
  }
  
  return recommendations;
}

function getWeb3Features(plan: string): string[] {
  if (['premium', 'enterprise'].includes(plan)) {
    return ['Wallet Integration', 'Token Discounts', 'Smart Contracts'];
  }
  return [];
}