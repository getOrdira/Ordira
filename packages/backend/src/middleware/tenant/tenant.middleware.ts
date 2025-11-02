import { NextFunction, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { IBrandSettings } from '../../models/brands/brandSettings.model';
import { tenantService } from '../../services/business/tenant.service';

/**
 * Extended Request interface with tenant information
 */
export interface TenantRequest extends Request {
  tenant?: IBrandSettings;
  business?: any; // Populated business document
  tenantId?: string; // Quick access to business ID
  isCustomDomain?: boolean; // Whether request came via custom domain
}

// Tenant resolution logic moved to TenantService

/**
 * Main tenant resolution middleware
 */
export async function resolveTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    const hostname = req.hostname.toLowerCase();
    
    // Use tenant service to resolve tenant
    const result = await tenantService.resolveTenant(hostname);
    
    // Check if tenant was found
    if (!result.settings) {
      return res.status(404).json({ 
        error: 'Brand not found',
        message: `No brand configuration found for ${result.isCustomDomain ? 'domain' : 'subdomain'}: ${result.identifier}`,
        code: 'BRAND_NOT_FOUND'
      });
    }

    // Validate business status
    const businessValidation = tenantService.validateBusinessStatus(result.business);
    if (!businessValidation.valid) {
      return res.status(403).json({ 
        error: 'Account issue',
        message: businessValidation.reason,
        code: businessValidation.reason === 'Account suspended' ? 'ACCOUNT_SUSPENDED' : 'EMAIL_VERIFICATION_REQUIRED'
      });
    }

    // Check if business email is verified (for critical operations)
    if (result.business && !result.business.isEmailVerified && req.path.includes('/admin')) {
      return res.status(403).json({ 
        error: 'Email verification required',
        message: 'Please verify your email address to access admin features',
        code: 'EMAIL_VERIFICATION_REQUIRED'
      });
    }

    // Attach tenant information to request
    req.tenant = result.settings;
    req.business = result.business;
    req.tenantId = result.business?._id?.toString();
    req.isCustomDomain = result.isCustomDomain;

    // Add tenant info to response headers for debugging
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-Tenant-ID', req.tenantId || 'unknown');
      res.setHeader('X-Tenant-Type', result.isCustomDomain ? 'custom-domain' : 'subdomain');
      res.setHeader('X-Tenant-Identifier', result.identifier);
      res.setHeader('X-Cache-Hit', result.cacheHit ? 'true' : 'false');
    }

    next();
  } catch (error) {
    logger.error('Tenant resolution error:', error);
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

    const hasRequiredPlan = tenantService.validateTenantPlan(req.tenant, requiredPlans);
    
    if (!hasRequiredPlan) {
      return res.status(403).json({ 
        error: 'Plan upgrade required',
        message: `This feature requires one of the following plans: ${requiredPlans.join(', ')}`,
        currentPlan: req.tenant.plan,
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

  // Use tenant service to validate setup
  const setupValidation = tenantService.validateTenantSetup(req.business);

  if (!setupValidation.valid) {
    return res.status(403).json({ 
      error: 'Setup incomplete',
      message: 'Please complete your brand setup before accessing this feature',
      missingFields: setupValidation.missingFields,
      code: 'SETUP_INCOMPLETE'
    });
  }

  next();
}

/**
 * Clear tenant cache for a specific identifier
 */
export function clearTenantCache(identifier: string, isSubdomain: boolean = true): void {
  tenantService.clearTenantCache(identifier, isSubdomain);
}

/**
 * Clear all tenant cache entries
 */
export function clearAllTenantCache(): void {
  tenantService.clearAllTenantCache();
}

/**
 * Get tenant cache statistics
 */
export function getTenantCacheStats(): { size: number; entries: string[] } {
  return tenantService.getTenantCacheStats();
}

/**
 * Enhanced middleware to add CORS headers for tenant-specific domains with security validation
 */
export function tenantCorsMiddleware(req: TenantRequest, res: Response, next: NextFunction): void {
  if (req.isCustomDomain && req.tenant) {
    // Validate the hostname before setting CORS headers
    const hostname = req.hostname;
    
    // Use tenant service for security validation
    if (tenantService.validateTenantHostname(hostname)) {
      // Only allow HTTPS in production
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const origin = `${protocol}://${hostname}`;
      
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-Tenant-ID');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    } else {
      logger.warn('âš ï¸ Invalid tenant hostname detected: ${hostname}');
      // Don't set CORS headers for invalid hostnames
    }
  }
  
  next();
}


