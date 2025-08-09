
import { NextFunction, Request, Response } from 'express';
import { BrandSettings, IBrandSettings } from '../models/brandSettings.model';
import { Business } from '../models/business.model';

/**
 * Extended Request interface with tenant information
 */
export interface TenantRequest extends Request {
  tenant?: IBrandSettings;
  business?: any; // Populated business document
  tenantId?: string; // Quick access to business ID
  isCustomDomain?: boolean; // Whether request came via custom domain
}

const BASE_DOMAIN = process.env.BASE_DOMAIN!; // e.g. "dashboard.yoursaas.com"
const ALLOWED_SUBDOMAINS = ['www', 'api', 'admin', 'dashboard', 'app']; // Reserved subdomains

if (!BASE_DOMAIN) {
  throw new Error('Missing BASE_DOMAIN environment variable!');
}

/**
 * Cache for tenant lookups to reduce database queries
 */
const tenantCache = new Map<string, { 
  settings: IBrandSettings; 
  business: any; 
  timestamp: number; 
}>();
const TENANT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get tenant from cache or database
 */
async function getTenantSettings(
  identifier: string, 
  isSubdomain: boolean
): Promise<{ settings: IBrandSettings | null; business: any }> {
  const cacheKey = `${isSubdomain ? 'sub' : 'domain'}:${identifier}`;
  
  // Check cache first
  const cached = tenantCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < TENANT_CACHE_TTL) {
    return { settings: cached.settings, business: cached.business };
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
      tenantCache.set(cacheKey, {
        settings,
        business: settings.business,
        timestamp: Date.now()
      });

      return { settings, business: settings.business };
    }

    return { settings: null, business: null };
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return { settings: null, business: null };
  }
}

/**
 * Validate subdomain format and check if it's allowed
 */
function validateSubdomain(subdomain: string): { valid: boolean; reason?: string } {
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
  if (ALLOWED_SUBDOMAINS.includes(subdomain)) {
    return { valid: false, reason: 'Reserved subdomain' };
  }

  return { valid: true };
}

/**
 * Validate custom domain format
 */
function validateCustomDomain(domain: string): { valid: boolean; reason?: string } {
  // Basic domain validation
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
  
  if (!domainRegex.test(domain)) {
    return { valid: false, reason: 'Invalid domain format' };
  }

  // Prevent using the base domain as custom domain
  if (domain === BASE_DOMAIN || domain.endsWith(`.${BASE_DOMAIN}`)) {
    return { valid: false, reason: 'Cannot use base domain as custom domain' };
  }

  return { valid: true };
}

/**
 * Main tenant resolution middleware
 */
export async function resolveTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    const host = req.hostname.toLowerCase();
    let settings: IBrandSettings | null = null;
    let business: any = null;
    let isCustomDomain = false;
    let identifier: string;

    // Determine if this is a subdomain or custom domain request
    if (host.endsWith(BASE_DOMAIN)) {
      // Subdomain case: extract subdomain from host
      const subdomain = host.slice(0, host.length - BASE_DOMAIN.length - 1);
      
      // Validate subdomain format
      const validation = validateSubdomain(subdomain);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid subdomain',
          details: validation.reason,
          code: 'INVALID_SUBDOMAIN'
        });
      }

      identifier = subdomain;
      const result = await getTenantSettings(subdomain, true);
      settings = result.settings;
      business = result.business;
    } else {
      // Custom domain case
      isCustomDomain = true;
      
      // Validate custom domain format
      const validation = validateCustomDomain(host);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid domain',
          details: validation.reason,
          code: 'INVALID_DOMAIN'
        });
      }

      identifier = host;
      const result = await getTenantSettings(host, false);
      settings = result.settings;
      business = result.business;
    }

    // Check if tenant was found
    if (!settings) {
      return res.status(404).json({ 
        error: 'Brand not found',
        message: `No brand configuration found for ${isCustomDomain ? 'domain' : 'subdomain'}: ${identifier}`,
        code: 'BRAND_NOT_FOUND'
      });
    }

    // Check if business account is active
    if (business && business.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Account suspended',
        message: 'This brand account has been suspended',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Check if business email is verified (for critical operations)
    if (business && !business.isEmailVerified && req.path.includes('/admin')) {
      return res.status(403).json({ 
        error: 'Email verification required',
        message: 'Please verify your email address to access admin features',
        code: 'EMAIL_VERIFICATION_REQUIRED'
      });
    }

    // Attach tenant information to request
    req.tenant = settings;
    req.business = business;
    req.tenantId = business?._id?.toString();
    req.isCustomDomain = isCustomDomain;

    // Add tenant info to response headers for debugging
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-Tenant-ID', req.tenantId || 'unknown');
      res.setHeader('X-Tenant-Type', isCustomDomain ? 'custom-domain' : 'subdomain');
      res.setHeader('X-Tenant-Identifier', identifier);
    }

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to resolve tenant configuration',
      code: 'TENANT_RESOLUTION_ERROR'
    });
  }
}

/**
 * Middleware to require a specific plan for tenant access
 */
export function requireTenantPlan(requiredPlans: string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.tenant) {
      return res.status(500).json({ 
        error: 'Tenant not resolved',
        message: 'Tenant middleware must run before plan validation',
        code: 'MIDDLEWARE_ORDER_ERROR'
      });
    }

    const currentPlan = req.tenant.plan;
    
    if (!currentPlan || !requiredPlans.includes(currentPlan)) {
      return res.status(403).json({ 
        error: 'Plan upgrade required',
        message: `This feature requires one of the following plans: ${requiredPlans.join(', ')}`,
        currentPlan,
        requiredPlans,
        code: 'PLAN_UPGRADE_REQUIRED'
      });
    }

    next();
  };
}

/**
 * Middleware to ensure tenant has completed setup
 */
export function requireTenantSetup(req: TenantRequest, res: Response, next: NextFunction): void | Response {
  if (!req.tenant || !req.business) {
    return res.status(500).json({ 
      error: 'Tenant not resolved',
      code: 'MIDDLEWARE_ORDER_ERROR'
    });
  }

  // Check if required setup fields are present
  const requiredFields = ['businessName', 'email'];
  const missingFields = requiredFields.filter(field => !req.business[field]);

  if (missingFields.length > 0) {
    return res.status(403).json({ 
      error: 'Setup incomplete',
      message: 'Please complete your brand setup before accessing this feature',
      missingFields,
      code: 'SETUP_INCOMPLETE'
    });
  }

  next();
}

/**
 * Clear tenant cache for a specific identifier
 */
export function clearTenantCache(identifier: string, isSubdomain: boolean = true): void {
  const cacheKey = `${isSubdomain ? 'sub' : 'domain'}:${identifier}`;
  tenantCache.delete(cacheKey);
}

/**
 * Clear all tenant cache entries
 */
export function clearAllTenantCache(): void {
  tenantCache.clear();
}

/**
 * Get tenant cache statistics
 */
export function getTenantCacheStats(): { size: number; entries: string[] } {
  return {
    size: tenantCache.size,
    entries: Array.from(tenantCache.keys())
  };
}

/**
 * Middleware to add CORS headers for tenant-specific domains
 */
export function tenantCorsMiddleware(req: TenantRequest, res: Response, next: NextFunction): void {
  if (req.isCustomDomain && req.tenant) {
    // Allow the custom domain to make requests
    res.setHeader('Access-Control-Allow-Origin', `https://${req.hostname}`);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  next();
}
