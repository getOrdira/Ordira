// src/services/business/emailGating.service.ts
import { AllowedCustomer, IAllowedCustomer } from '../../models/allowedCustomer.model';
import { User } from '../../models/user.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { NotificationService } from './notification.service';
import { NotificationsService } from '../external/notifications.service';
import { ShopifyService } from '../external/shopify.service';
import { UtilsService } from '../utils/utils.service';
import { logger } from '../../utils/logger'; 

export interface CustomerImportData {
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  vipStatus?: boolean;
  externalCustomerId?: string;
}

export interface EmailGatingSettings {
  enabled: boolean;
  mode: 'whitelist' | 'blacklist' | 'disabled';
  allowUnregistered: boolean;
  requireApproval: boolean;
  autoSyncEnabled: boolean;
  syncSources: string[];
  welcomeEmailEnabled: boolean;
  accessDeniedMessage?: string;
}

export interface CustomerSummary {
  id: string;
  email: string;
  fullName: string;
  customerSource: string;
  isActive: boolean;
  hasAccess: boolean;
  totalVotes: number;
  lastVotingAccess?: Date;
  engagementLevel: string;
  vipStatus: boolean;
  tags: string[];
  createdAt: Date;
}

export interface CustomerFilters {
  source?: string;
  hasAccess?: boolean;
  isActive?: boolean;
  vipStatus?: boolean;
  engagementLevel?: 'none' | 'low' | 'medium' | 'high';
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'lastVotingAccess' | 'totalVotes' | 'email';
  sortOrder?: 'asc' | 'desc';
}

class EmailGatingError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'EmailGatingError';
    this.statusCode = statusCode;
  }
}

export class EmailGatingService {
  private notificationsService = new NotificationsService();
  private shopifyService = new ShopifyService();

  /**
   * Check if an email is allowed to access the voting platform
   */
  async isEmailAllowed(email: string, businessId: string): Promise<{
    allowed: boolean;
    reason?: string;
    customer?: CustomerSummary;
    settings?: EmailGatingSettings;
  }> {
    // Get email gating settings for the business
    const settings = await this.getEmailGatingSettings(businessId);
    
    if (!settings.enabled || settings.mode === 'disabled') {
      return { allowed: true, settings };
    }

    // Check if email is in allowed list
    const customer = await AllowedCustomer.findByEmail(email, businessId);
    
    if (settings.mode === 'whitelist') {
      if (!customer) {
        return {
          allowed: false,
          reason: 'Email not in allowed customer list',
          settings
        };
      }
      
      if (!customer.isActive || !customer.hasAccess) {
        return {
          allowed: false,
          reason: customer.accessRevokedReason || 'Access has been revoked',
          customer: this.mapToSummary(customer),
          settings
        };
      }
      
      return {
        allowed: true,
        customer: this.mapToSummary(customer),
        settings
      };
    }
    
    // For blacklist mode, allow unless explicitly blacklisted
    if (settings.mode === 'blacklist') {
      if (customer && (!customer.hasAccess || !customer.isActive)) {
        return {
          allowed: false,
          reason: customer.accessRevokedReason || 'Email is blacklisted',
          customer: this.mapToSummary(customer),
          settings
        };
      }
      
      return { allowed: true, settings };
    }

    return { allowed: true, settings };
  }

  /**
   * Grant voting access to a user after email verification
   */
  async grantVotingAccess(email: string, businessId: string, userId: string): Promise<{
    granted: boolean;
    customer?: CustomerSummary;
    message: string;
  }> {
    const allowedCheck = await this.isEmailAllowed(email, businessId);
    
    if (!allowedCheck.allowed) {
      throw new EmailGatingError(
        allowedCheck.reason || 'Access denied',
        403
      );
    }

    // Record voting access
    if (allowedCheck.customer) {
      const customer = await AllowedCustomer.findById(allowedCheck.customer.id);
      if (customer) {
        await customer.recordVotingAccess();
        
        // Update with registration info if first time
        if (!customer.registeredAt) {
          customer.registeredAt = new Date();
          await customer.save();
        }
        
        return {
          granted: true,
          customer: this.mapToSummary(customer),
          message: 'Voting access granted'
        };
      }
    }

    return {
      granted: true,
      message: 'Voting access granted'
    };
  }

  /**
   * Add customers manually or via import
   */
  async addCustomers(
    businessId: string, 
    customers: CustomerImportData[], 
    source: 'manual' | 'csv_import' | 'api_import' = 'manual',
    addedBy?: string
  ): Promise<{
    imported: number;
    updated: number;
    errors: string[];
    batchId: string;
  }> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errors: string[] = [];
    let imported = 0;
    let updated = 0;

    for (const customerData of customers) {
      try {
        // Validate email
        if (!UtilsService.isValidEmail(customerData.email)) {
          errors.push(`Invalid email format: ${customerData.email}`);
          continue;
        }

        const email = customerData.email.toLowerCase();
        const existing = await AllowedCustomer.findByEmail(email, businessId);

        if (existing) {
          // Update existing customer
          await existing.updateFromExternalSource({
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            tags: customerData.tags,
            externalCustomerId: customerData.externalCustomerId
          });
          
          if (customerData.vipStatus !== undefined) {
            existing.vipStatus = customerData.vipStatus;
            await existing.save();
          }
          
          updated++;
        } else {
          // Create new customer
          await AllowedCustomer.create({
            business: businessId,
            email,
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            customerSource: source,
            externalCustomerId: customerData.externalCustomerId,
            importBatch: batchId,
            importedAt: new Date(),
            importedBy: addedBy,
            tags: customerData.tags || [],
            vipStatus: customerData.vipStatus || false,
            isActive: true,
            hasAccess: true,
            syncStatus: 'manual'
          });
          
          imported++;
        }
      } catch (error: any) {
        errors.push(`Failed to process ${customerData.email}: ${error.message}`);
      }
    }

    return { imported, updated, errors, batchId };
  }

  /**
   * Import customers from CSV data
   */
  async importFromCSV(
    businessId: string,
    csvData: string,
    addedBy?: string
  ): Promise<{
    imported: number;
    updated: number;
    errors: string[];
    batchId: string;
  }> {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // Validate required headers
    if (!headers.includes('email')) {
      throw new EmailGatingError('CSV must contain an "email" column', 400);
    }

    const customers: CustomerImportData[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const customer: CustomerImportData = {
          email: ''
        };

        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header) {
            case 'email':
              customer.email = value;
              break;
            case 'firstname':
            case 'first_name':
              customer.firstName = value;
              break;
            case 'lastname':
            case 'last_name':
              customer.lastName = value;
              break;
            case 'tags':
              customer.tags = value ? value.split(';').map(t => t.trim()) : [];
              break;
            case 'vip':
            case 'vip_status':
              customer.vipStatus = value.toLowerCase() === 'true' || value === '1';
              break;
            case 'customer_id':
            case 'external_id':
              customer.externalCustomerId = value;
              break;
          }
        });

        if (customer.email) {
          customers.push(customer);
        } else {
          errors.push(`Line ${i + 1}: Missing email address`);
        }
      } catch (error: any) {
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    const result = await this.addCustomers(businessId, customers, 'csv_import', addedBy);
    return {
      ...result,
      errors: [...errors, ...result.errors]
    };
  }

/**
 * Sync customers from Shopify
 */
async syncFromShopify(businessId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  try {
    // Get Shopify settings from brand settings
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings?.shopifyDomain || !brandSettings?.shopifyAccessToken) {
      throw new EmailGatingError('Shopify integration not configured', 400);
    }

    // Get Shopify customers directly using Shopify Admin API
    const shopifyCustomers = await this.fetchShopifyCustomers(brandSettings);
    
    const customers: CustomerImportData[] = shopifyCustomers.map(customer => ({
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      externalCustomerId: customer.id.toString(),
      tags: customer.tags?.split(',').map(t => t.trim()) || [],
      vipStatus: customer.tags?.includes('VIP') || false
    }));

    // Use 'api_import' as the source since this is an API-based import
    const result = await this.addCustomers(businessId, customers, 'api_import');
    
    return {
      synced: result.imported + result.updated,
      errors: result.errors
    };
  } catch (error: any) {
    return {
      synced: 0,
      errors: [error.message]
    };
  }
}

/**
 * Fetch customers directly from Shopify API
 */
private async fetchShopifyCustomers(brandSettings: any): Promise<Array<{
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  tags?: string;
}>> {
  try {
    const axios = require('axios');
    const response = await axios.get(
      `https://${brandSettings.shopifyDomain}/admin/api/2024-01/customers.json`,
      {
        headers: { 'X-Shopify-Access-Token': brandSettings.shopifyAccessToken },
        params: { limit: 250 }
      }
    );

    if (!response.data?.customers || !Array.isArray(response.data.customers)) {
      throw new Error('Invalid response from Shopify customers API');
    }

    return response.data.customers.filter((customer: any) => customer.email);
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Shopify access token is invalid or expired');
    }
    if (error.response?.status === 403) {
      throw new Error('Insufficient permissions to access Shopify customers');
    }
    if (error.response?.status >= 500) {
      throw new Error('Shopify API is currently unavailable');
    }
    
    throw new Error(`Failed to fetch Shopify customers: ${error.message}`);
  }
}

  /**
   * Get allowed customers for a business
   */
  async getCustomers(
    businessId: string,
    filters: CustomerFilters = {}
  ): Promise<{
    customers: CustomerSummary[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    const query = this.buildCustomerQuery(businessId, filters);
    const sort = this.buildCustomerSort(filters);

    const [customers, total] = await Promise.all([
      AllowedCustomer.find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .exec(),
      AllowedCustomer.countDocuments(query)
    ]);

    return {
      customers: customers.map(customer => this.mapToSummary(customer)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get email gating settings for a business
   */
  async getEmailGatingSettings(businessId: string): Promise<EmailGatingSettings> {
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    
    // Default settings if not configured
    return {
      enabled: brandSettings?.emailGating?.enabled || false,
      mode: brandSettings?.emailGating?.mode || 'disabled',
      allowUnregistered: brandSettings?.emailGating?.allowUnregistered || true,
      requireApproval: brandSettings?.emailGating?.requireApproval || false,
      autoSyncEnabled: brandSettings?.emailGating?.autoSyncEnabled || false,
      syncSources: brandSettings?.emailGating?.syncSources || [],
      welcomeEmailEnabled: brandSettings?.emailGating?.welcomeEmailEnabled || true,
      accessDeniedMessage: brandSettings?.emailGating?.accessDeniedMessage
    };
  }

  /**
   * Update email gating settings
   */
  async updateEmailGatingSettings(
    businessId: string,
    settings: Partial<EmailGatingSettings>
  ): Promise<EmailGatingSettings> {
    const brandSettings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      {
        $set: {
          'emailGating.enabled': settings.enabled,
          'emailGating.mode': settings.mode,
          'emailGating.allowUnregistered': settings.allowUnregistered,
          'emailGating.requireApproval': settings.requireApproval,
          'emailGating.autoSyncEnabled': settings.autoSyncEnabled,
          'emailGating.syncSources': settings.syncSources,
          'emailGating.welcomeEmailEnabled': settings.welcomeEmailEnabled,
          'emailGating.accessDeniedMessage': settings.accessDeniedMessage
        }
      },
      { new: true, upsert: true }
    );

    return this.getEmailGatingSettings(businessId);
  }

/**
 * Revoke access for a customer
 */
async revokeCustomerAccess(
  businessId: string,
  customerId: string,
  reason?: string,
  revokedBy?: string
): Promise<CustomerSummary> {
  const customer = await AllowedCustomer.findOne({
    _id: customerId,
    business: businessId
  });

  if (!customer) {
    throw new EmailGatingError('Customer not found', 404);
  }

  await customer.revokeAccess(reason, revokedBy);
  
  // Send notification to customer using the new method
  await this.notificationsService.sendAccessRevokedNotification(
    customer.email,
    reason || 'Access revoked by brand'
  );

  return this.mapToSummary(customer);
}

/**
 * Restore access for a customer
 */
async restoreCustomerAccess(businessId: string, customerId: string): Promise<CustomerSummary> {
  const customer = await AllowedCustomer.findOne({
    _id: customerId,
    business: businessId
  });

  if (!customer) {
    throw new EmailGatingError('Customer not found', 404);
  }

  await customer.grantAccess();
  
  // Send welcome back notification using the new method
  await this.notificationsService.sendAccessRestoredNotification(customer.email);

  return this.mapToSummary(customer);
}

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(businessId: string): Promise<{
    overview: any;
    engagement: any;
    sources: any;
    trends: any;
  }> {
    const [stats, engagementData] = await Promise.all([
      AllowedCustomer.getCustomerStats(businessId),
      this.getEngagementAnalytics(businessId)
    ]);

    const overview = stats[0] || {
      total: 0,
      active: 0,
      registered: 0,
      totalVotes: 0,
      vipCustomers: 0
    };

    // Calculate source distribution
    const sourceStats = await AllowedCustomer.aggregate([
      { $match: { business: businessId } },
      {
        $group: {
          _id: '$customerSource',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $and: ['$isActive', '$hasAccess'] }, 1, 0] } }
        }
      }
    ]);

    const sources = sourceStats.reduce((acc, stat) => {
      acc[stat._id] = {
        total: stat.count,
        active: stat.active
      };
      return acc;
    }, {});

    // Get trends (last 6 months)
    const trends = await this.getCustomerTrends(businessId, 6);

    return {
      overview,
      engagement: engagementData,
      sources,
      trends
    };
  }

  /**
   * Delete a customer from allowed list
   */
  async deleteCustomer(businessId: string, customerId: string): Promise<{ deleted: boolean }> {
    const result = await AllowedCustomer.deleteOne({
      _id: customerId,
      business: businessId
    });

    return { deleted: result.deletedCount > 0 };
  }

  /**
   * Bulk update customer access
   */
  async bulkUpdateAccess(
    businessId: string,
    customerIds: string[],
    hasAccess: boolean,
    reason?: string
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const customerId of customerIds) {
      try {
        const customer = await AllowedCustomer.findOne({
          _id: customerId,
          business: businessId
        });

        if (!customer) {
          errors.push(`Customer ${customerId} not found`);
          continue;
        }

        if (hasAccess) {
          await customer.grantAccess();
        } else {
          await customer.revokeAccess(reason);
        }

        updated++;
      } catch (error: any) {
        errors.push(`Failed to update ${customerId}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  private buildCustomerQuery(businessId: string, filters: CustomerFilters): any {
    const query: any = { business: businessId };

    if (filters.source) {
      query.customerSource = filters.source;
    }

    if (filters.hasAccess !== undefined) {
      query.hasAccess = filters.hasAccess;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.vipStatus !== undefined) {
      query.vipStatus = filters.vipStatus;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { email: { $regex: searchRegex } },
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } }
      ];
    }

    if (filters.engagementLevel) {
      switch (filters.engagementLevel) {
        case 'none':
          query.totalVotes = 0;
          break;
        case 'low':
          query.totalVotes = { $gte: 1, $lt: 3 };
          break;
        case 'medium':
          query.totalVotes = { $gte: 3, $lt: 10 };
          break;
        case 'high':
          query.totalVotes = { $gte: 10 };
          break;
      }
    }

    return query;
  }

  private buildCustomerSort(filters: CustomerFilters): any {
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    
    const sortQuery: any = {};
    sortQuery[sortField] = sortOrder;
    
    return sortQuery;
  }

  private async getEngagementAnalytics(businessId: string): Promise<any> {
    const engagementStats = await AllowedCustomer.aggregate([
      { $match: { business: businessId } },
      {
        $bucket: {
          groupBy: '$totalVotes',
          boundaries: [0, 1, 3, 10, Infinity],
          default: 'unknown',
          output: {
            count: { $sum: 1 },
            avgAccesses: { $avg: '$totalVotingAccesses' }
          }
        }
      }
    ]);

    const engagement = {
      none: 0,
      low: 0,
      medium: 0,
      high: 0
    };

    engagementStats.forEach(bucket => {
      switch (bucket._id) {
        case 0: engagement.none = bucket.count; break;
        case 1: engagement.low = bucket.count; break;
        case 3: engagement.medium = bucket.count; break;
        case 10: engagement.high = bucket.count; break;
      }
    });

    return engagement;
  }

  private async getCustomerTrends(businessId: string, months: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return AllowedCustomer.aggregate([
      {
        $match: {
          business: businessId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newCustomers: { $sum: 1 },
          activeCustomers: {
            $sum: { $cond: [{ $and: ['$isActive', '$hasAccess'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
  }

  private mapToSummary(customer: IAllowedCustomer): CustomerSummary {
    return {
      id: customer._id.toString(),
      email: customer.email,
      fullName: customer.fullName,
      customerSource: customer.customerSource,
      isActive: customer.isActive,
      hasAccess: customer.hasAccess,
      totalVotes: customer.totalVotes,
      lastVotingAccess: customer.lastVotingAccess,
      engagementLevel: customer.engagementLevel,
      vipStatus: customer.vipStatus,
      tags: customer.tags,
      createdAt: customer.createdAt
    };
  }
}