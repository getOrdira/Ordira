// src/services/business/tenant.service.ts

import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import { logger } from '../../utils/logger'; 
import { Business } from '../../models/business.model';
import { configService } from '../utils/config.service';

/**
 * Tenant resolution result interface
 */
export interface TenantResolutionResult {
  settings: IBrandSettings | null;
  business: any;
  identifier: string;
  isCustomDomain: boolean;
  cacheHit: boolean;
}

/**
 * Tenant validation result interface
 */
export interface TenantValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Tenant cache entry interface
 */
interface TenantCacheEntry {
  settings: IBrandSettings;
  business: any;
  timestamp: number;
}

/**
 * Tenant Service for comprehensive tenant resolution and management
 */
export class TenantService {
  private static instance: TenantService;
  private tenantCache: Map<string, TenantCacheEntry> = new Map();
  private readonly TENANT_CACHE_TTL: number = 5 * 60 * 1000; // 5 minutes
  private readonly BASE_DOMAIN: string;
  private readonly ALLOWED_SUBDOMAINS: string[] = ['www', 'api', 'admin', 'dashboard', 'app'];

  private constructor() {
    this.BASE_DOMAIN = configService.get('BASE_DOMAIN');
    if (!this.BASE_DOMAIN) {
      throw new Error('Missing BASE_DOMAIN environment variable!');
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  /**
   * Resolve tenant from hostname
   */
  async resolveTenant(hostname: string): Promise<TenantResolutionResult> {
    const host = hostname.toLowerCase();
    let settings: IBrandSettings | null = null;
    let business: any = null;
    let isCustomDomain = false;
    let identifier: string;
    let cacheHit = false;

    // Determine if this is a subdomain or custom domain request
    if (host.endsWith(this.BASE_DOMAIN)) {
      // Subdomain case: extract subdomain from host
      const subdomain = host.slice(0, host.length - this.BASE_DOMAIN.length - 1);
      
      // Validate subdomain format
      const validation = this.validateSubdomain(subdomain);
      if (!validation.valid) {
        throw new Error(`Invalid subdomain: ${validation.reason}`);
      }

      identifier = subdomain;
      const result = await this.getTenantSettings(subdomain, true);
      settings = result.settings;
      business = result.business;
      cacheHit = result.cacheHit;
    } else {
      // Custom domain case
      isCustomDomain = true;
      
      // Validate custom domain format
      const validation = this.validateCustomDomain(host);
      if (!validation.valid) {
        throw new Error(`Invalid domain: ${validation.reason}`);
      }

      identifier = host;
      const result = await this.getTenantSettings(host, false);
      settings = result.settings;
      business = result.business;
      cacheHit = result.cacheHit;
    }

    return {
      settings,
      business,
      identifier,
      isCustomDomain,
      cacheHit
    };
  }

  /**
   * Get tenant settings from cache or database
   */
  private async getTenantSettings(
    identifier: string, 
    isSubdomain: boolean
  ): Promise<{ settings: IBrandSettings | null; business: any; cacheHit: boolean }> {
    const cacheKey = `${isSubdomain ? 'sub' : 'domain'}:${identifier}`;
    
    // Check cache first
    const cached = this.tenantCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.TENANT_CACHE_TTL) {
      return { 
        settings: cached.settings, 
        business: cached.business,
        cacheHit: true
      };
    }

    try {
      // Query database
      const query = isSubdomain ? { subdomain: identifier } : { customDomain: identifier };
      const settings = await BrandSettings.findOne(query).populate({
        path: 'business',
        select: 'businessName email isEmailVerified plan status createdAt'
      });

      if (settings) {
        // Cache the result
        this.tenantCache.set(cacheKey, {
          settings,
          business: settings.business,
          timestamp: Date.now()
        });

        return { 
          settings, 
          business: settings.business,
          cacheHit: false
        };
      }

      return { settings: null, business: null, cacheHit: false };
    } catch (error) {
      logger.error('Error fetching tenant settings:', error);
      return { settings: null, business: null, cacheHit: false };
    }
  }

  /**
   * Validate subdomain format and check if it's allowed
   */
  validateSubdomain(subdomain: string): TenantValidationResult {
    // Check length
    if (subdomain.length < 3 || subdomain.length > 63) {
      return { valid: false, reason: 'Subdomain must be between 3 and 63 characters' };
    }

    // Check format (alphanumeric and hyphens, no leading/trailing hyphens)
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return { valid: false, reason: 'Invalid subdomain format' };
    }

    // Check if it's a reserved subdomain
    if (this.ALLOWED_SUBDOMAINS.includes(subdomain)) {
      return { valid: false, reason: 'Reserved subdomain' };
    }

    return { valid: true };
  }

  /**
   * Validate custom domain format
   */
  validateCustomDomain(domain: string): TenantValidationResult {
    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    
    if (!domainRegex.test(domain)) {
      return { valid: false, reason: 'Invalid domain format' };
    }

    // Prevent using the base domain as custom domain
    if (domain === this.BASE_DOMAIN || domain.endsWith(`.${this.BASE_DOMAIN}`)) {
      return { valid: false, reason: 'Cannot use base domain as custom domain' };
    }

    return { valid: true };
  }

  /**
   * Validate tenant hostname for security
   */
  validateTenantHostname(hostname: string): boolean {
    if (!hostname || typeof hostname !== 'string') {
      return false;
    }
    
    // Basic length check
    if (hostname.length === 0 || hostname.length > 253) {
      return false;
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\./, // Double dots
      /[^a-z0-9.-]/, // Invalid characters
      /^-/, // Starting with dash
      /-$/, // Ending with dash
      /^\./, // Starting with dot
      /\.$/, // Ending with dot
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(hostname.toLowerCase())) {
        return false;
      }
    }
    
    // Must have at least one dot
    if (!hostname.includes('.')) {
      return false;
    }
    
    // Each label must be 1-63 characters
    const labels = hostname.split('.');
    for (const label of labels) {
      if (label.length === 0 || label.length > 63) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if tenant has required plan
   */
  validateTenantPlan(tenant: IBrandSettings, requiredPlans: string[]): boolean {
    const currentPlan = tenant.plan;
    return currentPlan && requiredPlans.includes(currentPlan);
  }

  /**
   * Check if tenant has completed setup
   */
  validateTenantSetup(business: any): { valid: boolean; missingFields?: string[] } {
    const requiredFields = ['businessName', 'email'];
    const missingFields = requiredFields.filter(field => !business[field]);

    return {
      valid: missingFields.length === 0,
      missingFields: missingFields.length > 0 ? missingFields : undefined
    };
  }

  /**
   * Check if business account is active
   */
  validateBusinessStatus(business: any): { valid: boolean; reason?: string } {
    if (!business) {
      return { valid: false, reason: 'Business not found' };
    }

    if (business.status === 'suspended') {
      return { valid: false, reason: 'Account suspended' };
    }

    if (!business.isEmailVerified && business.requiresEmailVerification) {
      return { valid: false, reason: 'Email verification required' };
    }

    return { valid: true };
  }

  /**
   * Clear tenant cache for a specific identifier
   */
  clearTenantCache(identifier: string, isSubdomain: boolean = true): void {
    const cacheKey = `${isSubdomain ? 'sub' : 'domain'}:${identifier}`;
    this.tenantCache.delete(cacheKey);
  }

  /**
   * Clear all tenant cache entries
   */
  clearAllTenantCache(): void {
    this.tenantCache.clear();
  }

  /**
   * Get tenant cache statistics
   */
  getTenantCacheStats(): { size: number; entries: string[]; hitRate?: number } {
    return {
      size: this.tenantCache.size,
      entries: Array.from(this.tenantCache.keys())
    };
  }

  /**
   * Warm up tenant cache for frequently accessed tenants
   */
  async warmupTenantCache(identifiers: string[]): Promise<void> {
    for (const identifier of identifiers) {
      try {
        // Try both subdomain and custom domain
        await this.getTenantSettings(identifier, true);
        await this.getTenantSettings(identifier, false);
      } catch (error) {
        logger.warn('Failed to warmup cache for ${identifier}:', error);
      }
    }
  }

  /**
   * Get tenant by business ID
   */
  async getTenantByBusinessId(businessId: string): Promise<IBrandSettings | null> {
    try {
      return await BrandSettings.findOne({ business: businessId }).populate({
        path: 'business',
        select: 'businessName email isEmailVerified plan status createdAt'
      });
    } catch (error) {
      logger.error('Error fetching tenant by business ID:', error);
      return null;
    }
  }

  /**
   * Create tenant settings for a business
   */
  async createTenantSettings(
    businessId: string, 
    subdomain: string, 
    customDomain?: string
  ): Promise<IBrandSettings> {
    try {
      // Validate subdomain
      const subdomainValidation = this.validateSubdomain(subdomain);
      if (!subdomainValidation.valid) {
        throw new Error(`Invalid subdomain: ${subdomainValidation.reason}`);
      }

      // Validate custom domain if provided
      if (customDomain) {
        const domainValidation = this.validateCustomDomain(customDomain);
        if (!domainValidation.valid) {
          throw new Error(`Invalid custom domain: ${domainValidation.reason}`);
        }
      }

      const tenantSettings = new BrandSettings({
        business: businessId,
        subdomain,
        customDomain,
        plan: 'foundation',
        isActive: true
      });

      await tenantSettings.save();
      
      // Clear cache to ensure fresh data
      this.clearTenantCache(subdomain, true);
      if (customDomain) {
        this.clearTenantCache(customDomain, false);
      }

      return tenantSettings;
    } catch (error) {
      logger.error('Error creating tenant settings:', error);
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string, 
    updates: Partial<IBrandSettings>
  ): Promise<IBrandSettings | null> {
    try {
      const tenant = await BrandSettings.findByIdAndUpdate(
        tenantId,
        { ...updates, updatedAt: new Date() },
        { new: true }
      ).populate({
        path: 'business',
        select: 'businessName email isEmailVerified plan status createdAt'
      });

      if (tenant) {
        // Clear cache for this tenant
        this.clearTenantCache(tenant.subdomain, true);
        if (tenant.customDomain) {
          this.clearTenantCache(tenant.customDomain, false);
        }
      }

      return tenant;
    } catch (error) {
      logger.error('Error updating tenant settings:', error);
      throw error;
    }
  }

  /**
   * Delete tenant settings
   */
  async deleteTenantSettings(tenantId: string): Promise<boolean> {
    try {
      const tenant = await BrandSettings.findById(tenantId);
      if (!tenant) {
        return false;
      }

      await BrandSettings.findByIdAndDelete(tenantId);
      
      // Clear cache
      this.clearTenantCache(tenant.subdomain, true);
      if (tenant.customDomain) {
        this.clearTenantCache(tenant.customDomain, false);
      }

      return true;
    } catch (error) {
      logger.error('Error deleting tenant settings:', error);
      throw error;
    }
  }

  /**
   * Get all tenants with pagination
   */
  async getAllTenants(
    page: number = 1, 
    limit: number = 50, 
    filters: {
      plan?: string;
      isActive?: boolean;
      hasCustomDomain?: boolean;
    } = {}
  ): Promise<{
    tenants: IBrandSettings[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};
      
      if (filters.plan) {
        query.plan = filters.plan;
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      if (filters.hasCustomDomain !== undefined) {
        if (filters.hasCustomDomain) {
          query.customDomain = { $exists: true, $ne: null };
        } else {
          query.$or; [
            { customDomain: { $exists: false } },
            { customDomain: null }
          ];
        }
      }

      const skip = (page - 1) * limit;
      
      const [tenants, total] = await Promise.all([
        BrandSettings.find(query)
          .populate({
            path: 'business',
            select: 'businessName email isEmailVerified plan status createdAt'
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        BrandSettings.countDocuments(query)
      ]);

      return {
        tenants,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error fetching all tenants:', error);
      throw error;
    }
  }

  /**
   * Get tenant analytics
   */
  async getTenantAnalytics(): Promise<{
    totalTenants: number;
    activeTenants: number;
    tenantsByPlan: Record<string, number>;
    tenantsWithCustomDomain: number;
    averageTenantAge: number;
  }> {
    try {
      const analytics = await BrandSettings.aggregate([
        {
          $group: {
            _id: null,
            totalTenants: { $sum: 1 },
            activeTenants: { 
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            tenantsWithCustomDomain: {
              $sum: { 
                $cond: [
                  { $and: [
                    { $ne: ['$customDomain', null] },
                    { $ne: ['$customDomain', ''] }
                  ]}, 
                  1, 
                  0
                ]
              }
            },
            averageTenantAge: {
              $avg: {
                $divide: [
                  { $subtract: [new Date(), '$createdAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              }
            }
          }
        }
      ]);

      const planAnalytics = await BrandSettings.aggregate([
        {
          $group: {
            _id: '$plan',
            count: { $sum: 1 }
          }
        }
      ]);

      const tenantsByPlan = planAnalytics.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      const result = analytics[0] || {
        totalTenants: 0,
        activeTenants: 0,
        tenantsWithCustomDomain: 0,
        averageTenantAge: 0
      };

      return {
        ...result,
        tenantsByPlan
      };
    } catch (error) {
      logger.error('Error fetching tenant analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tenantService = TenantService.getInstance();
