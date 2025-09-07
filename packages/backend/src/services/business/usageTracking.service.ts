// src/services/business/usageTracking.service.ts
import { Billing } from '../../models/billing.model';
import { Business } from '../../models/business.model';
import { PLAN_DEFINITIONS, PlanKey } from '../../constants/plans';
import { createAppError } from '../../middleware/error.middleware';

export interface UsageUpdate {
  certificates?: number;
  votes?: number;
  apiCalls?: number;
  storage?: number; // in MB
}

export interface UsageLimits {
  certificates: { used: number; limit: number; percentage: number };
  votes: { used: number; limit: number; percentage: number };
  apiCalls: { used: number; limit: number; percentage: number };
  storage: { used: number; limit: number; percentage: number };
}

export class UsageTrackingService {
  /**
   * Update usage for a business
   */
  async updateUsage(businessId: string, usageUpdate: UsageUpdate): Promise<void> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const updateFields: any = {
        'currentUsage.lastUpdated': new Date()
      };

      // Update each usage type
      Object.entries(usageUpdate).forEach(([key, value]) => {
        if (typeof value === 'number' && value > 0) {
          updateFields[`currentUsage.${key}`] = { $inc: value };
        }
      });

      // Update billing record
      const result = await Billing.findOneAndUpdate(
        { business: businessId },
        { $set: updateFields },
        { upsert: true, new: true }
      );

      if (!result) {
        throw createAppError('Failed to update usage tracking', 500, 'USAGE_UPDATE_FAILED');
      }

      console.log(`Usage updated for business ${businessId}:`, usageUpdate);
    } catch (error: any) {
      console.error('Usage tracking update error:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createAppError(`Failed to update usage: ${error.message}`, 500, 'USAGE_TRACKING_ERROR');
    }
  }

  /**
   * Get current usage and limits for a business
   */
  async getUsageLimits(businessId: string): Promise<UsageLimits> {
    try {
      const [billing, business] = await Promise.all([
        Billing.findOne({ business: businessId }),
        Business.findById(businessId)
      ]);

      if (!business) {
        throw createAppError('Business not found', 404, 'BUSINESS_NOT_FOUND');
      }

      // Get plan from business or default to foundation
      const plan = (business.plan || 'foundation') as PlanKey;
      const planLimits = PLAN_DEFINITIONS[plan];
      const currentUsage = billing?.currentUsage || {
        certificates: 0,
        votes: 0,
        apiCalls: 0,
        storage: 0,
        lastUpdated: new Date()
      };

      return {
        certificates: {
          used: currentUsage.certificates,
          limit: planLimits.certificates,
          percentage: this.calculatePercentage(currentUsage.certificates, planLimits.certificates)
        },
        votes: {
          used: currentUsage.votes,
          limit: planLimits.votes,
          percentage: this.calculatePercentage(currentUsage.votes, planLimits.votes)
        },
        apiCalls: {
          used: currentUsage.apiCalls,
          limit: planLimits.apiCalls,
          percentage: this.calculatePercentage(currentUsage.apiCalls, planLimits.apiCalls)
        },
        storage: {
          used: currentUsage.storage,
          limit: planLimits.storage,
          percentage: this.calculatePercentage(currentUsage.storage, planLimits.storage)
        }
      };
    } catch (error: any) {
      console.error('Get usage limits error:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createAppError(`Failed to get usage limits: ${error.message}`, 500, 'USAGE_LIMITS_ERROR');
    }
  }

  /**
   * Check if operation would exceed limits
   */
  async checkLimits(businessId: string, operation: keyof UsageUpdate, amount: number = 1): Promise<{
    allowed: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
    percentage: number;
    overage?: number;
  }> {
    try {
      const usageLimits = await this.getUsageLimits(businessId);
      const usage = usageLimits[operation];
      
      const newUsage = usage.used + amount;
      const limit = usage.limit;
      const overage = limit !== Infinity && newUsage > limit ? newUsage - limit : 0;
      
      return {
        allowed: limit === Infinity || newUsage <= limit,
        currentUsage: usage.used,
        limit,
        remaining: limit === Infinity ? Infinity : Math.max(0, limit - usage.used),
        percentage: this.calculatePercentage(newUsage, limit),
        overage: overage > 0 ? overage : undefined
      };
    } catch (error: any) {
      console.error('Check limits error:', error);
      throw error;
    }
  }

  /**
   * Reset monthly usage (called by cron job)
   */
  async resetMonthlyUsage(businessId: string): Promise<void> {
    try {
      await Billing.findOneAndUpdate(
        { business: businessId },
        {
          $set: {
            'currentUsage.certificates': 0,
            'currentUsage.votes': 0,
            'currentUsage.apiCalls': 0,
            'currentUsage.lastUpdated': new Date()
          }
        }
      );

      console.log(`Monthly usage reset for business ${businessId}`);
    } catch (error: any) {
      console.error('Reset monthly usage error:', error);
      throw createAppError(`Failed to reset usage: ${error.message}`, 500, 'USAGE_RESET_ERROR');
    }
  }

  /**
   * Get usage analytics for a business
   */
  async getUsageAnalytics(businessId: string, days: number = 30): Promise<{
    currentUsage: UsageLimits;
    trends: {
      certificates: number[];
      votes: number[];
      apiCalls: number[];
      storage: number[];
    };
    recommendations: string[];
  }> {
    try {
      const currentUsage = await this.getUsageLimits(businessId);
      
      // Get historical usage data (you'll need to implement this)
      const trends = await this.getHistoricalUsage(businessId, days);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(currentUsage);

      return {
        currentUsage,
        trends,
        recommendations
      };
    } catch (error: any) {
      console.error('Get usage analytics error:', error);
      throw error;
    }
  }

  /**
   * Calculate percentage with Infinity handling
   */
  private calculatePercentage(used: number, limit: number): number {
    if (limit === Infinity) return 0;
    return Math.round((used / limit) * 100);
  }

  /**
   * Get historical usage data (placeholder implementation)
   */
  private async getHistoricalUsage(businessId: string, days: number): Promise<{
    certificates: number[];
    votes: number[];
    apiCalls: number[];
    storage: number[];
  }> {
    // This would typically query a usage history collection
    // For now, return empty arrays
    return {
      certificates: [],
      votes: [],
      apiCalls: [],
      storage: []
    };
  }

  /**
   * Generate usage recommendations
   */
  private generateRecommendations(usage: UsageLimits): string[] {
    const recommendations: string[] = [];

    Object.entries(usage).forEach(([key, data]) => {
      if (data.percentage > 90) {
        recommendations.push(`High ${key} usage (${data.percentage}%). Consider upgrading your plan.`);
      } else if (data.percentage > 75) {
        recommendations.push(`Approaching ${key} limit (${data.percentage}%). Monitor usage closely.`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Usage is within normal limits across all categories.');
    }

    return recommendations;
  }
}
