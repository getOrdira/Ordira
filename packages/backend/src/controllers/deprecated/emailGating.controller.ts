
// src/controllers/emailGating.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../../middleware/deprecated/unifiedAuth.middleware';
import { ValidatedRequest } from '../../middleware/deprecated/validation.middleware';
import { asyncHandler, createAppError } from '../../middleware/deprecated/error.middleware';
import { getCustomerAccessService } from '../../services/container.service';

// Initialize service via container
const customerAccessService = getCustomerAccessService();

/**
 * Extended request interfaces for type safety
 */
interface TenantEmailGatingRequest extends Request, UnifiedAuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface EmailGatingSettingsRequest extends Request, TenantEmailGatingRequest, ValidatedRequest {
  validatedBody: {
    enabled?: boolean;
    mode?: 'whitelist' | 'blacklist' | 'disabled';
    allowUnregistered?: boolean;
    requireApproval?: boolean;
    autoSyncEnabled?: boolean;
    syncSources?: string[];
    welcomeEmailEnabled?: boolean;
    accessDeniedMessage?: string;
  };
}

interface CustomersImportRequest extends TenantEmailGatingRequest, ValidatedRequest {
  validatedBody: {
    customers: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      tags?: string[];
      vipStatus?: boolean;
      externalCustomerId?: string;
    }>;
    source?: 'manual' | 'api_import';
  };
}

interface CSVImportRequest extends TenantEmailGatingRequest, ValidatedRequest {
  validatedBody: {
    csvData: string;
  };
}

interface CustomerListRequest extends TenantEmailGatingRequest, ValidatedRequest {
  validatedQuery: {
    source?: string;
    hasAccess?: boolean;
    isActive?: boolean;
    vipStatus?: boolean;
    engagementLevel?: 'none' | 'low' | 'medium' | 'high';
    tags?: string[];
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'lastVotingAccess' | 'totalVotes' | 'email';
    sortOrder?: 'asc' | 'desc';
  };
}

interface CustomerAccessRequest extends TenantEmailGatingRequest, ValidatedRequest {
  validatedParams: { customerId: string };
  validatedBody?: {
    reason?: string;
  };
}

interface BulkAccessRequest extends TenantEmailGatingRequest, ValidatedRequest {
  validatedBody: {
    customerIds: string[];
    hasAccess: boolean;
    reason?: string;
  };
}

interface EmailCheckRequest extends TenantEmailGatingRequest, ValidatedRequest {
  validatedParams: { email: string };
}

// ====================
// EMAIL GATING SETTINGS
// ====================

/**
 * Get email gating settings for the brand
 * GET /api/email-gating/settings
 */
export const getEmailGatingSettings = asyncHandler(async (
  req: TenantEmailGatingRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;

  // Get current settings
  const settings = await customerAccessService.getEmailGatingSettings(businessId);

  // Get customer stats for context
  const analytics = await customerAccessService.getCustomerAnalytics(businessId);

  res.json({
    success: true,
    message: 'Email gating settings retrieved successfully',
    data: {
      settings,
      analytics: {
        totalCustomers: analytics.overview.total,
        activeCustomers: analytics.overview.active,
        registeredCustomers: analytics.overview.registered,
        sources: analytics.sources
      },
      recommendations: generateSettingsRecommendations(settings, analytics),
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Update email gating settings
 * PUT /api/email-gating/settings
 */
export const updateEmailGatingSettings = asyncHandler(async (
  req: EmailGatingSettingsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const updateData = req.validatedBody;

  if (Object.keys(updateData).length === 0) {
    throw createAppError('No settings provided for update', 400, 'EMPTY_UPDATE_DATA');
  }

  // Update settings
  const updatedSettings = await customerAccessService.updateEmailGatingSettings(businessId, updateData);

  // Analyze impact of changes
  const impact = analyzeSettingsImpact(updateData);

  res.json({
    success: true,
    message: 'Email gating settings updated successfully',
    data: {
      settings: updatedSettings,
      changes: {
        updated: Object.keys(updateData),
        impact
      },
      warnings: generateSettingsWarnings(updatedSettings),
      updatedAt: new Date().toISOString()
    }
  });
});

// ====================
// CUSTOMER MANAGEMENT
// ====================

/**
 * Get list of allowed customers
 * GET /api/email-gating/customers
 */
export const getCustomers = asyncHandler(async (
  req: CustomerListRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const queryParams = req.validatedQuery;

  // Parse query parameters
  const filters = {
    source: queryParams.source,
    hasAccess: queryParams.hasAccess,
    isActive: queryParams.isActive,
    vipStatus: queryParams.vipStatus,
    engagementLevel: queryParams.engagementLevel,
    tags: queryParams.tags,
    search: queryParams.search,
    limit: Math.min(queryParams.limit || 20, 100),
    offset: ((queryParams.page || 1) - 1) * (queryParams.limit || 20),
    sortBy: queryParams.sortBy || 'createdAt',
    sortOrder: queryParams.sortOrder || 'desc'
  };

  // Get customers
  const result = await customerAccessService.getCustomers(businessId, filters);

  // Get analytics for insights
  const analytics = await customerAccessService.getCustomerAnalytics(businessId);

  res.json({
    success: true,
    message: 'Customers retrieved successfully',
    data: {
      customers: result.customers,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: filters.limit,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1
      },
      analytics: {
        overview: analytics.overview,
        engagement: analytics.engagement
      },
      insights: generateCustomerInsights(result.customers, analytics),
      filters: {
        applied: Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        ),
        available: {
          sources: ['manual', 'shopify', 'woocommerce', 'csv_import', 'api_import'],
          engagementLevels: ['none', 'low', 'medium', 'high'],
          sortBy: ['createdAt', 'lastVotingAccess', 'totalVotes', 'email']
        }
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Add customers manually
 * POST /api/email-gating/customers
 */
export const addCustomers = asyncHandler(async (
  req: CustomersImportRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { customers, source = 'manual' } = req.validatedBody;

  if (!customers || customers.length === 0) {
    throw createAppError('No customers provided', 400, 'MISSING_CUSTOMERS');
  }

  if (customers.length > 1000) {
    throw createAppError('Maximum 1000 customers per batch', 400, 'TOO_MANY_CUSTOMERS');
  }

  // Validate customer data
  for (const customer of customers) {
    if (!customer.email || !customer.email.includes('@')) {
      throw createAppError(`Invalid email: ${customer.email}`, 400, 'INVALID_EMAIL');
    }
  }

  // Add customers
  const result = await customerAccessService.addCustomers(businessId, customers, source, req.userId);

  // Generate recommendations based on results
  const recommendations = generateImportRecommendations(result, customers.length);

  res.status(201).json({
    success: true,
    message: `Customer import completed: ${result.imported} added, ${result.updated} updated`,
    data: {
      summary: {
        total: customers.length,
        imported: result.imported,
        updated: result.updated,
        failed: result.errors.length,
        batchId: result.batchId
      },
      results: {
        successRate: Math.round(((result.imported + result.updated) / customers.length) * 100),
        errors: result.errors
      },
      recommendations,
      nextSteps: [
        'Review any import errors',
        'Configure email gating settings if not done',
        'Test voting access with sample customers'
      ],
      importedAt: new Date().toISOString()
    }
  });
});

/**
 * Import customers from CSV
 * POST /api/email-gating/customers/import-csv
 */
export const importFromCSV = asyncHandler(async (
  req: CSVImportRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { csvData } = req.validatedBody;

  if (!csvData || csvData.trim().length === 0) {
    throw createAppError('CSV data is required', 400, 'MISSING_CSV_DATA');
  }

  // Validate CSV format
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    throw createAppError('CSV must contain at least a header row and one data row', 400, 'INVALID_CSV_FORMAT');
  }

  // Import from CSV
  const result = await customerAccessService.importFromCSV(csvData, businessId, req.userId);

  // Generate import analysis
  const analysis = analyzeCSVImport(result, lines.length - 1);

  res.status(201).json({
    success: true,
    message: `CSV import completed: ${result.imported} added, ${result.updated} updated`,
    data: {
      summary: {
        totalRows: lines.length - 1,
        imported: result.imported,
        updated: result.updated,
        failed: result.errors.length,
        batchId: result.batchId
      },
      analysis,
      errors: result.errors,
      recommendations: [
        'Verify imported customer data',
        'Check for any validation errors',
        'Test email gating with sample customers'
      ],
      csvFormat: {
        requiredColumns: ['email'],
        optionalColumns: ['firstname', 'lastname', 'tags', 'vip_status', 'customer_id'],
        example: 'email,firstname,lastname,tags,vip_status\njohn@example.com,John,Doe,premium;loyal,true'
      },
      importedAt: new Date().toISOString()
    }
  });
});

/**
 * Sync customers from Shopify
 * POST /api/email-gating/customers/sync-shopify
 */
export const syncFromShopify = asyncHandler(async (
  req: TenantEmailGatingRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;

  // Sync from Shopify
  const result = await customerAccessService.syncFromShopify(businessId);

  res.json({
    success: true,
    message: `Shopify sync completed: ${result.synced} customers synced`,
    data: {
      summary: {
        synced: result.synced,
        errors: result.errors.length
      },
      errors: result.errors,
      recommendations: result.synced > 0 ? [
        'Review synced customer data',
        'Configure auto-sync if needed',
        'Test voting access for Shopify customers'
      ] : [
        'Check Shopify integration settings',
        'Verify API permissions',
        'Ensure customers exist in Shopify'
      ],
      syncedAt: new Date().toISOString()
    }
  });
});

// ====================
// CUSTOMER ACCESS CONTROL
// ====================

/**
 * Check if email is allowed access
 * GET /api/email-gating/check/:email
 */
export const checkEmailAccess = asyncHandler(async (
  req: EmailCheckRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { email } = req.validatedParams;

  if (!email || !email.includes('@')) {
    throw createAppError('Valid email address is required', 400, 'INVALID_EMAIL');
  }

  // Check email access
  const result = await customerAccessService.isEmailAllowed(email.toLowerCase(), businessId);

  res.json({
    success: true,
    message: 'Email access check completed',
    data: {
      email: email.toLowerCase(),
      allowed: result.allowed,
      reason: result.reason,
      customer: result.customer,
      settings: {
        enabled: result.settings?.enabled,
        mode: result.settings?.mode,
        accessDeniedMessage: result.settings?.accessDeniedMessage
      },
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Revoke access for a customer
 * POST /api/email-gating/customers/:customerId/revoke
 */
export const revokeCustomerAccess = asyncHandler(async (
  req: CustomerAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { customerId } = req.validatedParams;
  const { reason } = req.validatedBody || {};

  // Revoke access
  const customer = await customerAccessService.revokeCustomerAccess(
    businessId,
    customerId,
    reason,
    req.userId
  );

  res.json({
    success: true,
    message: 'Customer access revoked successfully',
    data: {
      customer,
      revocation: {
        reason: reason || 'No reason provided',
        revokedBy: req.userId,
        revokedAt: new Date().toISOString()
      },
      impact: {
        votingAccess: 'Customer can no longer access voting platform',
        existingVotes: 'Previous votes remain valid',
        notification: 'Customer has been notified of access revocation'
      }
    }
  });
});

/**
 * Restore access for a customer
 * POST /api/email-gating/customers/:customerId/restore
 */
export const restoreCustomerAccess = asyncHandler(async (
  req: CustomerAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { customerId } = req.validatedParams;

  // Restore access
  const customer = await customerAccessService.restoreCustomerAccess(businessId, customerId);

  res.json({
    success: true,
    message: 'Customer access restored successfully',
    data: {
      customer,
      restoration: {
        restoredBy: req.userId,
        restoredAt: new Date().toISOString()
      },
      impact: {
        votingAccess: 'Customer can now access voting platform',
        notification: 'Customer has been notified of access restoration'
      },
      nextSteps: [
        'Customer can now register and vote',
        'Consider sending welcome back message',
        'Monitor customer engagement'
      ]
    }
  });
});

/**
 * Bulk update customer access
 * PUT /api/email-gating/customers/bulk-access
 */
export const bulkUpdateAccess = asyncHandler(async (
  req: BulkAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { customerIds, hasAccess, reason } = req.validatedBody;

  if (!customerIds || customerIds.length === 0) {
    throw createAppError('Customer IDs are required', 400, 'MISSING_CUSTOMER_IDS');
  }

  if (customerIds.length > 100) {
    throw createAppError('Maximum 100 customers per bulk operation', 400, 'TOO_MANY_CUSTOMERS');
  }

  // Bulk update access
  const result = await customerAccessService.bulkUpdateAccess(businessId, customerIds, hasAccess, reason);

  res.json({
    success: true,
    message: `Bulk access update completed: ${result.updated} customers updated`,
    data: {
      summary: {
        requested: customerIds.length,
        updated: result.updated,
        failed: result.errors.length,
        successRate: Math.round((result.updated / customerIds.length) * 100)
      },
      operation: {
        type: hasAccess ? 'grant_access' : 'revoke_access',
        reason: reason || 'Bulk operation',
        performedBy: req.userId,
        performedAt: new Date().toISOString()
      },
      errors: result.errors,
      impact: hasAccess 
        ? `${result.updated} customers can now access voting platform`
        : `${result.updated} customers can no longer access voting platform`
    }
  });
});

/**
 * Delete a customer from allowed list
 * DELETE /api/email-gating/customers/:customerId
 */
export const deleteCustomer = asyncHandler(async (
  req: CustomerAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { customerId } = req.validatedParams;

  // Delete customer
  const result = await customerAccessService.deleteCustomer(businessId, customerId);

  if (!result.deleted) {
    throw createAppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Customer deleted successfully',
    data: {
      deleted: true,
      customerId,
      deletedAt: new Date().toISOString(),
      impact: {
        access: 'Customer removed from allowed list',
        voting: 'Customer can no longer access voting platform',
        data: 'Customer data permanently removed'
      },
      warning: 'This action cannot be undone'
    }
  });
});

// ====================
// ANALYTICS
// ====================

/**
 * Get customer analytics
 * GET /api/email-gating/analytics
 */
export const getCustomerAnalytics = asyncHandler(async (
  req: TenantEmailGatingRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;

  // Get comprehensive analytics
  const analytics = await customerAccessService.getCustomerAnalytics(businessId);

  // Generate insights
  const insights = generateAnalyticsInsights(analytics);

  res.json({
    success: true,
    message: 'Customer analytics retrieved successfully',
    data: {
      analytics,
      insights,
      recommendations: generateAnalyticsRecommendations(analytics),
      benchmarks: generateBenchmarks(analytics),
      generatedAt: new Date().toISOString()
    }
  });
});

// ====================
// HELPER FUNCTIONS
// ====================

function generateSettingsRecommendations(settings: any, analytics: any): string[] {
  const recommendations: string[] = [];

  if (!settings.enabled && analytics.overview.total > 0) {
    recommendations.push('Enable email gating to control access to your voting platform');
  }

  if (settings.mode === 'disabled' && analytics.overview.total > 100) {
    recommendations.push('Consider using whitelist mode for better control with many customers');
  }

  if (settings.autoSyncEnabled && !settings.syncSources.length) {
    recommendations.push('Configure sync sources to automate customer imports');
  }

  return recommendations;
}

function analyzeSettingsImpact(updateData: any): string[] {
  const impact: string[] = [];

  if (updateData.enabled === true) {
    impact.push('Email gating is now active - only allowed customers can access voting');
  }

  if (updateData.mode === 'whitelist') {
    impact.push('Only customers in allowed list can access voting platform');
  }

  if (updateData.mode === 'blacklist') {
    impact.push('All customers can access except those explicitly blocked');
  }

  if (updateData.enabled === false) {
    impact.push('All customers can now access voting platform regardless of allowed list');
  }

  return impact;
}

function generateSettingsWarnings(settings: any): string[] {
  const warnings: string[] = [];

  if (settings.enabled && settings.mode === 'whitelist' && !settings.allowUnregistered) {
    warnings.push('Strict whitelist mode may prevent legitimate customers from accessing voting');
  }

  if (settings.autoSyncEnabled && !settings.syncSources.length) {
    warnings.push('Auto-sync is enabled but no sync sources are configured');
  }

  return warnings;
}

function generateCustomerInsights(customers: any[], analytics: any): any {
  return {
    topEngaged: customers
      .filter(c => c.totalVotes > 0)
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, 5),
    
    recentlyActive: customers
      .filter(c => c.lastVotingAccess)
      .sort((a, b) => new Date(b.lastVotingAccess!).getTime() - new Date(a.lastVotingAccess!).getTime())
      .slice(0, 5),
    
    vipCustomers: customers.filter(c => c.vipStatus).length,
    
    sourceDistribution: analytics.sources
  };
}

function generateImportRecommendations(result: any, totalCustomers: number): string[] {
  const recommendations: string[] = [];

  if (result.errors.length > totalCustomers * 0.1) {
    recommendations.push('High error rate detected - review customer data format');
  }

  if (result.imported > 0) {
    recommendations.push('Configure email gating settings to control access');
  }

  if (result.updated > result.imported) {
    recommendations.push('Many existing customers updated - consider reviewing duplicate sources');
  }

  return recommendations;
}

function analyzeCSVImport(result: any, totalRows: number): any {
  return {
    successRate: Math.round(((result.imported + result.updated) / totalRows) * 100),
    errorRate: Math.round((result.errors.length / totalRows) * 100),
    duplicateRate: Math.round((result.updated / totalRows) * 100),
    quality: result.errors.length < totalRows * 0.05 ? 'excellent' : 
             result.errors.length < totalRows * 0.1 ? 'good' : 
             result.errors.length < totalRows * 0.2 ? 'fair' : 'poor'
  };
}

function generateAnalyticsInsights(analytics: any): any {
  return {
    overview: {
      healthScore: calculateCustomerHealthScore(analytics),
      growth: analytics.trends.length > 1 ? 
        calculateGrowthRate(analytics.trends) : 0,
      engagementRate: analytics.overview.total > 0 ? 
        Math.round((analytics.overview.totalVotes / analytics.overview.total) * 100) : 0
    },
    engagement: {
      highEngagement: analytics.engagement.high || 0,
      activeRate: analytics.overview.total > 0 ? 
        Math.round((analytics.overview.active / analytics.overview.total) * 100) : 0,
      registrationRate: analytics.overview.total > 0 ? 
        Math.round((analytics.overview.registered / analytics.overview.total) * 100) : 0
    },
    sources: {
      mostEffective: findMostEffectiveSource(analytics.sources),
      diversification: Object.keys(analytics.sources).length,
      automation: calculateAutomationLevel(analytics.sources)
    }
  };
}

function generateAnalyticsRecommendations(analytics: any): string[] {
  const recommendations: string[] = [];

  if (analytics.overview.total === 0) {
    recommendations.push('Import your first customers to start using email gating');
  }

  if (analytics.overview.total > 0 && analytics.overview.registered / analytics.overview.total < 0.3) {
    recommendations.push('Low registration rate - consider improving onboarding process');
  }

  if (analytics.engagement.none > analytics.engagement.high + analytics.engagement.medium) {
    recommendations.push('Many customers have not voted - create engaging campaigns');
  }

  const sourceCount = Object.keys(analytics.sources).length;
  if (sourceCount === 1 && analytics.overview.total > 100) {
    recommendations.push('Diversify customer sources for better reach');
  }

  if (analytics.overview.vipCustomers > 0) {
    recommendations.push('Leverage VIP customers for exclusive campaigns');
  }

  return recommendations;
}

function generateBenchmarks(analytics: any): any {
  return {
    industry: {
      registrationRate: 45, // Industry average
      engagementRate: 25,
      retentionRate: 70
    },
    yourPlatform: {
      registrationRate: analytics.overview.total > 0 ? 
        Math.round((analytics.overview.registered / analytics.overview.total) * 100) : 0,
      engagementRate: analytics.overview.total > 0 ? 
        Math.round(((analytics.engagement.low + analytics.engagement.medium + analytics.engagement.high) / analytics.overview.total) * 100) : 0,
      retentionRate: analytics.overview.total > 0 ? 
        Math.round((analytics.overview.active / analytics.overview.total) * 100) : 0
    }
  };
}

function calculateCustomerHealthScore(analytics: any): { score: number; status: string } {
  let score = 100;

  // Penalize low registration rate
  const registrationRate = analytics.overview.total > 0 ? 
    (analytics.overview.registered / analytics.overview.total) * 100 : 0;
  if (registrationRate < 30) score -= 20;
  else if (registrationRate < 50) score -= 10;

  // Penalize low engagement
  const engagementRate = analytics.overview.total > 0 ? 
    ((analytics.engagement.low + analytics.engagement.medium + analytics.engagement.high) / analytics.overview.total) * 100 : 0;
  if (engagementRate < 20) score -= 25;
  else if (engagementRate < 40) score -= 15;

  // Penalize low active rate
  const activeRate = analytics.overview.total > 0 ? 
    (analytics.overview.active / analytics.overview.total) * 100 : 0;
  if (activeRate < 60) score -= 15;

  const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';
  return { score: Math.max(0, score), status };
}

function calculateGrowthRate(trends: any[]): number {
  if (trends.length < 2) return 0;
  
  const latest = trends[trends.length - 1];
  const previous = trends[trends.length - 2];
  
  if (previous.newCustomers === 0) return latest.newCustomers > 0 ? 100 : 0;
  
  return Math.round(((latest.newCustomers - previous.newCustomers) / previous.newCustomers) * 100);
}

function findMostEffectiveSource(sources: any): string {
  let mostEffective = 'manual';
  let highestActive = 0;

  Object.entries(sources).forEach(([source, data]: [string, any]) => {
    if (data.active > highestActive) {
      highestActive = data.active;
      mostEffective = source;
    }
  });

  return mostEffective;
}

function calculateAutomationLevel(sources: Record<string, { total: number }>): number {
  const automatedSources = ['shopify', 'woocommerce', 'api_import'];
  const totalCustomers = Object.values(sources).reduce((sum: number, source) => sum + source.total, 0);
  
  if (totalCustomers === 0) return 0;
  
  const automatedCustomers = Object.entries(sources)
    .filter(([source]) => automatedSources.includes(source))
    .reduce((sum, [, data]) => sum + data.total, 0);
  
  return Math.round((automatedCustomers / totalCustomers) * 100);
}


