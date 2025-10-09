// src/controllers/brandSettings.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { getServices } from '../services/container.service';
import { clearTenantCache } from '../middleware/tenant.middleware';
import { hasShopifyAccessToken } from '../utils/typeGuards';

// Enhanced request interfaces
interface BrandSettingsRequest extends Request, UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    // Visual branding
    themeColor?: string;
    logoUrl?: string;
    bannerImages?: string[];
    customCss?: string;
    
    // Domain configuration
    subdomain?: string;
    customDomain?: string;
    
    // Web3 settings
    certificateWallet?: string;
    voteContract?: string;
    nftContract?: string;
    chainId?: number;
    
    // E-commerce integrations
    shopifyIntegration?: {
      shopifyDomain: string;
      shopifyAccessToken: string;
      shopifyWebhookSecret?: string;
      syncProducts?: boolean;
      syncOrders?: boolean;
    };
    wooCommerceIntegration?: {
      wooDomain: string;
      wooConsumerKey: string;
      wooConsumerSecret: string;
      apiVersion?: string;
      syncInterval?: number;
    };
    wixIntegration?: {
      wixDomain: string;
      wixApiKey: string;
      wixRefreshToken?: string;
    };
    
    // API and webhook settings
    apiSettings?: {
      webhookUrl?: string;
      webhookSecret?: string;
      enabledEvents?: string[];
      rateLimits?: {
        requestsPerMinute: number;
        burstLimit: number;
      };
    };
    
    // Analytics and tracking
    analyticsSettings?: {
      googleAnalyticsId?: string;
      facebookPixelId?: string;
      enableHeatmaps?: boolean;
      enableSessionRecording?: boolean;
    };
    
    // SEO settings
    seoSettings?: {
      metaTitle?: string;
      metaDescription?: string;
      keywords?: string[];
      canonicalUrl?: string;
    };
  };
}

interface WalletUpdateRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    certificateWallet: string;
    signature?: string;
    message?: string;
  };
}

interface SubdomainRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    subdomain: string;
  };
}

interface DomainRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    customDomain: string;
  };
}

interface QuickBrandingRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    themeColor?: string;
    logoUrl?: string;
  };
}

/**
 * GET /api/brand-settings
 * Retrieve comprehensive brand settings with plan-based features
 */
export async function getBrandSettings(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Get comprehensive brand settings
    const settings = await brandSettingsService.getEnhancedSettings(businessId);
    
    // Get plan-based available features
    const availableFeatures = brandSettingsService.getPlanFeatures(userPlan);
    
    // Get integration status
    const integrationStatus = await brandSettingsService.getIntegrationStatus(businessId);
    
    // Get domain configuration status
    const domainStatus = await brandSettingsService.getDomainStatus(businessId);

    // Track settings view
    trackManufacturerAction('view_brand_settings');

    res.json({
      settings: {
        ...settings,
        lastUpdated: settings.updatedAt,
        settingsVersion: settings.version || 1
      },
      features: {
        available: availableFeatures,
        currentPlan: userPlan,
        limitations: brandSettingsService.getPlanLimitations(userPlan)
      },
      integrations: {
        status: integrationStatus,
        available: brandSettingsService.getAvailableIntegrations(userPlan),
        configured: brandSettingsService.getConfiguredIntegrations(settings)
      },
      domains: {
        status: domainStatus,
        configuration: {
          subdomain: settings.subdomain,
          customDomain: settings.customDomain,
          ssl: settings.enableSsl
        }
      },
      web3: {
        walletConnected: !!settings.certificateWallet,
        contracts: {
          vote: settings.web3Settings.voteContract,
          nft: settings.web3Settings.nftContract
        },
        discounts: settings.certificateWallet ? 
          await brandSettingsService.getTokenDiscounts(settings.certificateWallet) : null
      }
    });
  } catch (error) {
    logger.error('Get brand settings error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings
 * Update brand settings with comprehensive validation and features
 */
export async function updateBrandSettings(
  req: BrandSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const updateData = req.validatedBody;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Validate plan permissions for requested features
    const restrictedFeatures = brandSettingsService.validatePlanPermissions(updateData, userPlan);
    if (restrictedFeatures.length > 0) {
       res.status(403).json(brandSettingsService.buildErrorResponse(
        'Some features require a higher plan',
        'PLAN_UPGRADE_REQUIRED',
        {
          restrictedFeatures,
          currentPlan: userPlan,
          requiredPlans: brandSettingsService.getRequiredPlans(restrictedFeatures)
        }
      ))
      return;
    }

    // Get current settings for comparison
    const currentSettings = await brandSettingsService.getSettings(businessId);

    // Process domain changes with validation
    if (updateData.subdomain || updateData.customDomain) {
      await brandSettingsService.validateDomainChanges(businessId, updateData, currentSettings);
    }

    // Process Web3 wallet changes
    if (updateData.certificateWallet) {
      await brandSettingsService.processWalletChange(businessId, updateData.certificateWallet, currentSettings.certificateWallet);
    }

    // Update settings with enhanced tracking
    const updatedSettings = await brandSettingsService.updateEnhancedSettings(businessId, {
      ...updateData,
      lastUpdatedBy: businessId,
      updateSource: 'settings_panel',
      updateMetadata: {
        changedFields: brandSettingsService.getChangedFields(currentSettings, updateData),
        planLevel: userPlan,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      }
    });

    // Clear tenant cache if critical changes made
    const criticalChanges = brandSettingsService.hasCriticalChanges(updateData);
    
    if (criticalChanges) {
      clearTenantCache(businessId);
    }

    // Process integration updates
    await brandSettingsService.processIntegrationUpdates(businessId, updateData, currentSettings);

    // Track settings update
    trackManufacturerAction('update_brand_settings');

    // Send notifications for significant changes
    await brandSettingsService.handleSettingsChangeNotifications(businessId, currentSettings, updateData);

    // Calculate setup completeness
    const setupCompleteness = brandSettingsService.calculateSetupCompleteness(updatedSettings, userPlan);

    res.json(brandSettingsService.buildSettingsResponse(
      updatedSettings,
      {
        fieldsUpdated: Object.keys(updateData),
        criticalChanges,
        integrationChanges: brandSettingsService.getIntegrationChanges(currentSettings, updateData)
      },
      {
        completeness: setupCompleteness,
        nextSteps: brandSettingsService.generateSetupRecommendations(updatedSettings, userPlan),
        missingFeatures: brandSettingsService.getMissingFeatures(updatedSettings, userPlan)
      }
    ));
  } catch (error) {
    logger.error('Update brand settings error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/certificate-wallet
 * Update certificate wallet with enhanced security and validation
 */
export async function updateCertificateWallet(
  req: WalletUpdateRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { certificateWallet, signature, message } = req.validatedBody;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Validate Web3 feature access
    if (!['premium', 'enterprise'].includes(userPlan)) {
       res.status(403).json(brandSettingsService.buildErrorResponse(
        'Web3 features require Premium plan or higher',
        'PLAN_UPGRADE_REQUIRED',
        { currentPlan: userPlan }
      ))
      return;
    }

    // Get current wallet for comparison
    const currentSettings = await brandSettingsService.getSettings(businessId);
    const previousWallet = currentSettings.certificateWallet;

    // Enhanced wallet validation and verification
    const walletValidation = await brandSettingsService.validateWalletAddress(certificateWallet, {
      requireSignature: userPlan === 'enterprise',
      signature,
      message,
      businessId
    });

    if (!walletValidation.valid) {
       res.status(400).json({
        error: 'Wallet validation failed',
        details: walletValidation.errors,
        code: 'WALLET_VALIDATION_FAILED'
      })
      return;
    }

    // Check for existing wallet usage
    const walletInUse = await brandSettingsService.isWalletInUse(certificateWallet, businessId);
    if (walletInUse) {
       res.status(400).json({
        error: 'Wallet address is already in use by another brand',
        code: 'WALLET_ALREADY_IN_USE'
      })
      return;
    }

    // Update wallet with enhanced security
    const result = await brandSettingsService.updateCertificateWallet(businessId, {
      certificateWallet,
      previousWallet,
      verificationData: {
        signature,
        message,
        verifiedAt: new Date(),
        ipAddress: req.ip
      },
      updateMetadata: {
        updateReason: 'manual_update',
        planLevel: userPlan
      }
    });

    // Update billing discounts if wallet changed
    if (previousWallet !== certificateWallet) {
      const { billing: billingService } = getServices();
      await billingService.updateTokenDiscounts(businessId, certificateWallet);
    }

    // Clear tenant cache
    clearTenantCache(businessId);

    // Track wallet update
    trackManufacturerAction('update_certificate_wallet');

    // Log wallet change for security audit
    logger.info('Certificate wallet updated', {
      businessId,
      previousWallet: previousWallet || 'none',
      newWallet: certificateWallet,
      changeDate: new Date()
    });

    // Get available token discounts
    const tokenDiscounts = await brandSettingsService.getTokenDiscounts(certificateWallet);

    res.json({
      success: true,
      certificateWallet: result.certificateWallet,
      verification: {
        verified: walletValidation.verified,
        verifiedAt: result.verifiedAt
      },
      benefits: {
        tokenDiscounts,
        web3Features: brandSettingsService.getWeb3Features(userPlan),
        nftCapabilities: brandSettingsService.getNftCapabilities(userPlan)
      },
      security: {
        walletChanged: previousWallet !== certificateWallet,
        notificationSent: true,
        backupRecommended: true
      },
      message: 'Certificate wallet updated successfully'
    });
  } catch (error) {
    logger.error('Update certificate wallet error:', error);
    next(error);
  }
}

/**
 * Upload brand logo directly
 * POST /api/brand-settings/logo
 * 
 * @requires authentication & tenant context
 * @requires multipart/form-data with 'logo' field
 * @returns { logoUrl, uploadedAt }
 */
export async function uploadBrandLogo(
  req: UnifiedAuthRequest & TenantRequest & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!businessId) {
      res.status(401).json({
        error: 'Business ID not found in request',
        code: 'MISSING_BUSINESS_ID'
      });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        error: 'No logo file provided',
        code: 'MISSING_FILE'
      });
      return;
    }

    // Validate file type and size
    const logoMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!logoMimeTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        error: 'Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed',
        code: 'INVALID_FILE_TYPE'
      });
      return;
    }

    // Get service instance
    const { brandSettings: brandSettingsService, media: mediaService } = getServices();

    // Validate file upload
    const allowedMimeTypes = brandSettingsService.getAllowedMimeTypes('logo');
    const validation = brandSettingsService.validateFileUpload(req.file, allowedMimeTypes, 10 * 1024 * 1024);
    
    if (!validation.valid) {
      res.status(400).json(brandSettingsService.buildErrorResponse(
        validation.error!,
        validation.error === 'No file uploaded' ? 'MISSING_FILE' : 
        validation.error!.includes('Invalid file type') ? 'INVALID_FILE_TYPE' : 'FILE_TOO_LARGE'
      ));
      return;
    }

    // Upload logo through media service
    
    const media = await mediaService.saveMedia(req.file, businessId, {
      category: 'banner',
      description: 'Brand logo',
      isPublic: true
    });

    // Update brand settings with new logo URL
    const updatedSettings = await brandSettingsService.updateSettings(businessId, {
      logoUrl: media.url
    });

    // Track logo upload
    trackManufacturerAction('upload_brand_logo');

    res.json({
      success: true,
      message: 'Brand logo uploaded successfully',
      data: {
        logoUrl: media.url,
        uploadedAt: media.createdAt,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        // S3 information if available
        ...(media.s3Key && {
          storage: {
            type: 's3',
            s3Key: media.s3Key,
            s3Bucket: media.s3Bucket,
            s3Region: media.s3Region
          }
        })
      }
    });
  } catch (error) {
    logger.error('Upload brand logo error:', error);
    next(error);
  }
}

/**
 * Upload brand banner image
 * POST /api/brand-settings/banner
 * 
 * @requires authentication & tenant context
 * @requires multipart/form-data with 'banner' field
 * @returns { bannerUrl, uploadedAt }
 */
export async function uploadBrandBanner(
  req: UnifiedAuthRequest & TenantRequest & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!businessId) {
      res.status(401).json({
        error: 'Business ID not found in request',
        code: 'MISSING_BUSINESS_ID'
      });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        error: 'No banner file provided',
        code: 'MISSING_FILE'
      });
      return;
    }

    // Validate file type and size
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        code: 'INVALID_FILE_TYPE'
      });
      return;
    }

    const maxFileSize = 15 * 1024 * 1024; // 15MB for banners
    if (req.file.size > maxFileSize) {
      res.status(400).json({
        error: 'File size exceeds 15MB limit',
        code: 'FILE_TOO_LARGE'
      });
      return;
    }

    // Get service instance
    const { brandSettings: brandSettingsService, media: mediaService } = getServices();
    
    const media = await mediaService.saveMedia(req.file, businessId, {
      category: 'banner',
      description: 'Brand banner image',
      isPublic: true
    });

    // Update brand settings with new banner URL
    const currentSettings = await brandSettingsService.getSettings(businessId);
    const updatedBannerImages = [...(currentSettings.bannerImages || []), media.url];
    
    const updatedSettings = await brandSettingsService.updateSettings(businessId, {
      bannerImages: updatedBannerImages
    });

    // Track banner upload
    trackManufacturerAction('upload_brand_banner');

    res.json({
      success: true,
      message: 'Brand banner uploaded successfully',
      data: {
        bannerUrl: media.url,
        uploadedAt: media.createdAt,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        totalBanners: updatedBannerImages.length,
        // S3 information if available
        ...(media.s3Key && {
          storage: {
            type: 's3',
            s3Key: media.s3Key,
            s3Bucket: media.s3Bucket,
            s3Region: media.s3Region
          }
        })
      }
    });
  } catch (error) {
    logger.error('Upload brand banner error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/quick-branding
 * Quick branding updates (theme color, logo)
 */
export async function updateQuickBranding(
  req: QuickBrandingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const updateData = req.validatedBody;

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Update only branding fields
    const updatedSettings = await brandSettingsService.updateSettings(businessId, {
      themeColor: updateData.themeColor,
      logoUrl: updateData.logoUrl
    });

    // Track quick branding update
    trackManufacturerAction('update_quick_branding');

    res.json({
      success: true,
      settings: {
        themeColor: updatedSettings.themeColor,
        logoUrl: updatedSettings.logoUrl
      },
      message: 'Branding updated successfully'
    });
  } catch (error) {
    logger.error('Update quick branding error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/subdomain
 * Update subdomain configuration
 */
export async function updateSubdomain(
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { subdomain } = req.validatedBody;

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Update subdomain using service method
    const updatedSettings = await brandSettingsService.updateSubdomain(businessId, subdomain);

    // Clear tenant cache
    clearTenantCache(businessId);

    // Track subdomain update
    trackManufacturerAction('update_subdomain');

    res.json({
      success: true,
      subdomain: updatedSettings.subdomain,
      url: `https://${subdomain}.yourdomain.com`,
      message: 'Subdomain updated successfully'
    });
  } catch (error) {
    logger.error('Update subdomain error:', error);
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
 * POST /api/brand-settings/subdomain/validate
 * Validate subdomain availability
 */
export async function validateSubdomain(
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { subdomain } = req.validatedBody;

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Validate using service method
    const isValid = await brandSettingsService.validateSubdomain(subdomain);

    res.json({
      subdomain,
      valid: isValid,
      available: isValid,
      message: isValid ? 
        'Subdomain is available' : 
        'Subdomain is invalid or already taken'
    });
  } catch (error) {
    logger.error('Validate subdomain error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/custom-domain
 * Set custom domain
 */
export async function setCustomDomain(
  req: DomainRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { customDomain } = req.validatedBody;
    const userPlan = req.tenant?.plan || 'foundation';

    // Validate plan access
    if (!['premium', 'enterprise'].includes(userPlan)) {
      res.status(403).json({
        error: 'Custom domains require Premium plan or higher',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      });
      return;
    }

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Validate custom domain
    const validation = await brandSettingsService.validateCustomDomain(customDomain);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Custom domain validation failed',
        details: validation.error,
        code: 'INVALID_CUSTOM_DOMAIN'
      });
      return;
    }

    // Update custom domain
    const updatedSettings = await brandSettingsService.updateSettings(businessId, {
      customDomain
    });

    // Clear tenant cache
    clearTenantCache(businessId);

    // Track custom domain update
    trackManufacturerAction('set_custom_domain');

    res.json({
      success: true,
      customDomain: updatedSettings.customDomain,
      url: `https://${customDomain}`,
      verification: {
        required: true,
        status: 'pending',
        instructions: 'Please add the required DNS records to complete setup'
      },
      message: 'Custom domain configured successfully'
    });
  } catch (error) {
    logger.error('Set custom domain error:', error);
    next(error);
  }
}

/**
 * DELETE /api/brand-settings/custom-domain
 * Remove custom domain
 */
export async function removeCustomDomain(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

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
    logger.error('Remove custom domain error:', error);
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
 * POST /api/brand-settings/custom-domain/verify
 * Verify custom domain DNS configuration
 */
export async function verifyCustomDomain(
  req: DomainRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { customDomain } = req.validatedBody;

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Validate custom domain
    const validation = await brandSettingsService.validateCustomDomain(customDomain);

    res.json({
      domain: customDomain,
      verification: {
        valid: validation.valid,
        status: validation.valid ? 'verified' : 'failed',
        error: validation.error || null,
        checkedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Verify custom domain error:', error);
    next(error);
  }
}

/**
 * POST /api/brand-settings/integrations/shopify
 * Configure Shopify integration with comprehensive setup
 */
export async function configureShopifyIntegration(
  req: BrandSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const integrationData = req.validatedBody;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Validate integration permissions
    if (!brandSettingsService.checkIntegrationPermissions(userPlan, 'shopify')) {
       res.status(403).json(brandSettingsService.buildErrorResponse(
        'E-commerce integrations require Growth plan or higher',
        'PLAN_UPGRADE_REQUIRED',
        { currentPlan: userPlan }
      ))
      return;
    }

    // Test Shopify connection
    const connectionTest = await brandSettingsService.testShopifyConnection(integrationData);
    if (!connectionTest.success) {
       res.status(400).json(brandSettingsService.buildErrorResponse(
        'Shopify connection test failed',
        'SHOPIFY_CONNECTION_FAILED',
        { details: connectionTest.errors }
      ))
      return;
    }

    // Configure integration
    const integration = await brandSettingsService.configureShopifyIntegration(businessId, {
      ...integrationData,
      configuredBy: businessId,
      planLevel: userPlan,
      connectionTest: connectionTest.data
    });

    // Track integration setup
    trackManufacturerAction('configure_shopify_integration');

    res.status(201).json(brandSettingsService.buildIntegrationResponse(
      integration,
      {
        productSync: integration.syncProducts,
        orderSync: integration.syncOrders,
        webhooks: integration.webhooksConfigured
      },
      userPlan
    ));
  } catch (error) {
    logger.error('Configure Shopify integration error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/integrations/shopify
 * Update existing Shopify integration
 */
export async function updateShopifyIntegration(
  req: BrandSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const integrationData = req.validatedBody;

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Update Shopify integration
    await brandSettingsService.updateShopifyIntegration(businessId, integrationData);

    // Track integration update
    trackManufacturerAction('update_shopify_integration');

    res.json({
      success: true,
      message: 'Shopify integration updated successfully'
    });
  } catch (error) {
    logger.error('Update Shopify integration error:', error);
    next(error);
  }
}

/**
 * POST /api/brand-settings/integrations/woocommerce
 * Configure WooCommerce integration
 */
export async function configureWooCommerceIntegration(
  req: BrandSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const integrationData = req.validatedBody;
    const userPlan = req.tenant?.plan || 'foundation';

    // Validate integration permissions
    if (!['growth', 'premium', 'enterprise'].includes(userPlan)) {
      res.status(403).json({
        error: 'E-commerce integrations require Growth plan or higher',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      });
      return;
    }

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Update WooCommerce integration (using existing service method)
    await brandSettingsService.updateWooCommerceIntegration(businessId, integrationData);

    // Track integration setup
    trackManufacturerAction('configure_woocommerce_integration');

    res.status(201).json({
      success: true,
      integration: {
        type: 'woocommerce',
        domain: integrationData.wooDomain,
        configured: true
      },
      message: 'WooCommerce integration configured successfully'
    });
  } catch (error) {
    logger.error('Configure WooCommerce integration error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/integrations/woocommerce
 * Update existing WooCommerce integration
 */
export async function updateWooCommerceIntegration(
  req: BrandSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const integrationData = req.validatedBody;

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Update WooCommerce integration
    await brandSettingsService.updateWooCommerceIntegration(businessId, integrationData);

    // Track integration update
    trackManufacturerAction('update_woocommerce_integration');

    res.json({
      success: true,
      message: 'WooCommerce integration updated successfully'
    });
  } catch (error) {
    logger.error('Update WooCommerce integration error:', error);
    next(error);
  }
}

/**
 * POST /api/brand-settings/integrations/wix
 * Configure Wix integration
 */
export async function configureWixIntegration(
  req: BrandSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const integrationData = req.validatedBody;
    const userPlan = req.tenant?.plan || 'foundation';

    // Validate integration permissions
    if (!['growth', 'premium', 'enterprise'].includes(userPlan)) {
      res.status(403).json({
        error: 'E-commerce integrations require Growth plan or higher',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      });
      return;
    }

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Configure Wix integration (store directly in settings)
    const updatedSettings = await brandSettingsService.updateEnhancedSettings(businessId, {
      wixDomain: integrationData.wixDomain,
      wixApiKey: integrationData.wixApiKey,
      wixRefreshToken: integrationData.wixRefreshToken
    });

    // Track integration setup
    trackManufacturerAction('configure_wix_integration');

    res.status(201).json({
      success: true,
      integration: {
        type: 'wix',
        domain: integrationData.wixDomain,
        configured: true
      },
      message: 'Wix integration configured successfully'
    });
  } catch (error) {
    logger.error('Configure Wix integration error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand-settings/integrations/wix
 * Update existing Wix integration
 */
export async function updateWixIntegration(
  req: BrandSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const integrationData = req.validatedBody;

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Update Wix integration
    await brandSettingsService.updateEnhancedSettings(businessId, {
      wixDomain: integrationData.wixDomain,
      wixApiKey: integrationData.wixApiKey,
      wixRefreshToken: integrationData.wixRefreshToken
    });

    // Track integration update
    trackManufacturerAction('update_wix_integration');

    res.json({
      success: true,
      message: 'Wix integration updated successfully'
    });
  } catch (error) {
    logger.error('Update Wix integration error:', error);
    next(error);
  }
}

/**
 * DELETE /api/brand-settings/integrations/:type
 * Remove integration configuration
 */
export async function removeIntegration(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { type } = req.params;

    if (!['shopify', 'woocommerce', 'wix'].includes(type)) {
       res.status(400).json({
        error: 'Invalid integration type',
        supportedTypes: ['shopify', 'woocommerce', 'wix'],
        code: 'INVALID_INTEGRATION_TYPE'
      })
      return;
    }

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Remove integration with cleanup
    const removal = await brandSettingsService.removeIntegration(businessId, type, {
      removedBy: businessId,
      removalReason: 'manual_removal',
      cleanupData: true
    });

    // Track integration removal
    trackManufacturerAction(`remove_${type}_integration`);

    res.json({
      success: true,
      integration: type,
      removed: true,
      cleanup: {
        dataRemoved: removal.dataRemoved,
        webhooksDisabled: removal.webhooksDisabled,
        syncStopped: removal.syncStopped
      },
      message: `${type} integration removed successfully`
    });
  } catch (error) {
    logger.error('Remove integration error:', error);
    next(error);
  }
}

/**
 * POST /api/brand-settings/integrations/:type/test
 * Test integration connection
 */
export async function testIntegration(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { type } = req.params;

    if (!['shopify', 'woocommerce', 'wix'].includes(type)) {
      res.status(400).json({
        error: 'Invalid integration type',
        supportedTypes: ['shopify', 'woocommerce', 'wix'],
        code: 'INVALID_INTEGRATION_TYPE'
      });
      return;
    }

    // Get current settings to test
    const { brandSettings: brandSettingsService } = getServices();
    const settings = await brandSettingsService.getSettings(businessId);

    let testResult: any = { success: false };

    if (type === 'shopify' && settings.shopifyDomain) {
      testResult = await brandSettingsService.testShopifyConnection({
        shopifyDomain: settings.shopifyDomain,
        shopifyAccessToken: hasShopifyAccessToken(settings) ? settings.shopifyAccessToken : undefined
      });
    }

    // Track test action
    trackManufacturerAction(`test_${type}_integration`);

    res.json({
      integration: type,
      test: {
        success: testResult.success,
        testedAt: new Date(),
        details: testResult.data || null,
        errors: testResult.errors || null
      }
    });
  } catch (error) {
    logger.error('Test integration error:', error);
    next(error);
  }
}

/**
 * GET /api/brand-settings/export
 * Export brand settings configuration
 */
export async function exportBrandSettings(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { format = 'json', includeSensitive = false } = req.query;

    // Validate format
    if (!['json', 'yaml', 'csv'].includes(format as string)) {
      res.status(400).json({
        error: 'Invalid export format',
        supportedFormats: ['json', 'yaml', 'csv'],
        code: 'INVALID_FORMAT'
      });
      return;
    }

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Export settings
    const exportData = await brandSettingsService.exportSettings(businessId, {
      format: format as string,
      includeSensitive: includeSensitive === 'true',
      exportedBy: businessId
    });

    // Track export
    trackManufacturerAction('export_brand_settings');

    // Set headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `brand_settings_${timestamp}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', brandSettingsService.getContentType(format as string));

    if (format === 'json') {
      res.json(exportData);
    } else {
      res.send(exportData);
    }
  } catch (error) {
    logger.error('Export brand settings error:', error);
    next(error);
  }
}

/**
 * GET /api/brand-settings/public/:businessId
 * Get public brand settings (for display on public pages)
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

    // Get service instance
    const { brandSettings: brandSettingsService } = getServices();

    // Get public settings using service method
    const publicSettings = await brandSettingsService.getPublicSettings(businessId);

    res.json({
      success: true,
      settings: publicSettings
    });
  } catch (error) {
    logger.error('Get public brand settings error:', error);
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

