// src/services/tenants/core/tenantData.service.ts

import { BrandSettings, IBrandSettings } from '../../../models/brandSettings.model';
import { logger } from '../../../utils/logger';
import type { TenantAnalyticsOverview, TenantListFilters, TenantListResult } from '../utils/types';

export class TenantDataService {
  async findBySubdomain(subdomain: string): Promise<IBrandSettings | null> {
    try {
      return await BrandSettings.findOne({ subdomain }).populate({
        path: 'business',
        select: 'businessName email isEmailVerified plan status createdAt'
      });
    } catch (error) {
      logger.error('Error fetching tenant by subdomain:', error);
      return null;
    }
  }

  async findByCustomDomain(customDomain: string): Promise<IBrandSettings | null> {
    try {
      return await BrandSettings.findOne({ customDomain }).populate({
        path: 'business',
        select: 'businessName email isEmailVerified plan status createdAt'
      });
    } catch (error) {
      logger.error('Error fetching tenant by custom domain:', error);
      return null;
    }
  }

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

  async createTenantSettings(
    businessId: string,
    subdomain: string,
    customDomain?: string
  ): Promise<IBrandSettings> {
    try {
      const tenantSettings = new BrandSettings({
        business: businessId,
        subdomain,
        customDomain,
        plan: 'foundation',
        isActive: true
      });

      await tenantSettings.save();
      return tenantSettings;
    } catch (error) {
      logger.error('Error creating tenant settings:', error);
      throw error;
    }
  }

  async updateTenantSettings(
    tenantId: string,
    updates: Partial<IBrandSettings>
  ): Promise<IBrandSettings | null> {
    try {
      return await BrandSettings.findByIdAndUpdate(
        tenantId,
        { ...updates, updatedAt: new Date() },
        { new: true }
      ).populate({
        path: 'business',
        select: 'businessName email isEmailVerified plan status createdAt'
      });
    } catch (error) {
      logger.error('Error updating tenant settings:', error);
      throw error;
    }
  }

  async deleteTenantSettings(tenantId: string): Promise<IBrandSettings | null> {
    try {
      const tenant = await BrandSettings.findById(tenantId);
      if (!tenant) {
        return null;
      }

      await BrandSettings.findByIdAndDelete(tenantId);
      return tenant;
    } catch (error) {
      logger.error('Error deleting tenant settings:', error);
      throw error;
    }
  }

  async listTenants(
    page: number = 1,
    limit: number = 50,
    filters: TenantListFilters = {}
  ): Promise<TenantListResult> {
    try {
      const query: Record<string, unknown> = {};

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
          query.$or = [
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
      logger.error('Error fetching tenant list:', error);
      throw error;
    }
  }

  async getTenantAnalytics(): Promise<TenantAnalyticsOverview> {
    try {
      const [summaryDoc, planAnalytics] = await Promise.all([
        BrandSettings.aggregate([
          {
            $group: {
              _id: null,
              totalTenants: { $sum: 1 },
              activeTenants: { $sum: { $cond: ['$isActive', 1, 0] } },
              tenantsWithCustomDomain: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$customDomain', null] },
                        { $ne: ['$customDomain', ''] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              averageTenantAge: {
                $avg: {
                  $divide: [
                    { $subtract: [new Date(), '$createdAt'] },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            }
          }
        ]).then(results => results[0] as (Omit<TenantAnalyticsOverview, 'tenantsByPlan'> | undefined)),
        BrandSettings.aggregate([
          {
            $group: {
              _id: '$plan',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const defaultSummary = {
        totalTenants: 0,
        activeTenants: 0,
        tenantsWithCustomDomain: 0,
        averageTenantAge: 0
      };

      const summary = summaryDoc ?? defaultSummary;
      const tenantsByPlan = planAnalytics?.reduce<Record<string, number>>((acc, item) => {
        if (item._id) {
          acc[item._id] = item.count;
        }
        return acc;
      }, {}) ?? {};

      return {
        ...summary,
        tenantsByPlan
      };
    } catch (error) {
      logger.error('Error fetching tenant analytics:', error);
      throw error;
    }
  }
}

export const tenantDataService = new TenantDataService();
