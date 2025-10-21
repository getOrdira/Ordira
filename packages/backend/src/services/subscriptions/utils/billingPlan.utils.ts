import { logger } from '../../../utils/logger';
import { PLAN_DEFINITIONS, PlanKey } from '../../../constants/plans';

type PlanPricingDefinition = {
  stripePriceId?: string;
  amount: number;
};

const PLAN_PRICING: Record<string, PlanPricingDefinition> = {
  foundation: { stripePriceId: process.env.STRIPE_FOUNDATION_PRICE_ID, amount: 0 },
  growth: { stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID, amount: 2900 },
  premium: { stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID, amount: 9900 },
  enterprise: { stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, amount: 29900 }
};

const PLAN_LIMITS: Record<string, { apiCalls: number; certificates: number; votes: number }> = {
  foundation: { apiCalls: 1000, certificates: 10, votes: 100 },
  growth: { apiCalls: 10000, certificates: 100, votes: 1000 },
  premium: { apiCalls: 100000, certificates: 1000, votes: 10000 },
  enterprise: { apiCalls: 1000000, certificates: 10000, votes: 100000 }
};

const PLAN_LEVELS: Record<PlanKey, number> = {
  foundation: 1,
  growth: 2,
  premium: 3,
  enterprise: 4
};

const PLAN_API_KEY_LIMITS: Record<PlanKey, number> = {
  foundation: 2,
  growth: 5,
  premium: 15,
  enterprise: 50
};

const PLAN_STORAGE_LIMITS: Record<PlanKey, number> = {
  foundation: 1,
  growth: 5,
  premium: 25,
  enterprise: 100
};

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  foundation: ['Basic Analytics', 'Email Support', '2 API Keys'],
  growth: ['Advanced Analytics', 'Priority Support', '5 API Keys', 'Integrations'],
  premium: ['Custom Reports', 'Phone Support', '15 API Keys', 'Advanced Integrations', 'NFT Features'],
  enterprise: ['White-label', 'Dedicated Support', 'Unlimited API Keys', 'Custom Features', 'SLA']
};

export class BillingPlanUtils {
  getPlanPricing(plan: string): PlanPricingDefinition {
    return PLAN_PRICING[plan] ?? PLAN_PRICING.foundation;
  }

  getPlanLimits(plan: string) {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.foundation;
  }

  getPlanLevel(plan: PlanKey): number {
    return PLAN_LEVELS[plan] ?? 0;
  }

  formatPlanName(plan: string): string {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }

  getPlanFeatures(plan: PlanKey): string[] {
    return PLAN_FEATURES[plan] ?? [];
  }

  getPlanApiKeyLimit(plan: PlanKey): number {
    return PLAN_API_KEY_LIMITS[plan] ?? 1;
  }

  getPlanStorageLimit(plan: PlanKey): number {
    return PLAN_STORAGE_LIMITS[plan] ?? 0.5;
  }

  getPublicPlanLimits(plan: PlanKey) {
    return {
      votes: PLAN_DEFINITIONS[plan].votes,
      certificates: PLAN_DEFINITIONS[plan].certificates,
      apiKeys: this.getPlanApiKeyLimit(plan),
      storage: this.getPlanStorageLimit(plan)
    };
  }

  calculateUtilization(usage: any, plan: PlanKey) {
    const limits = this.getPublicPlanLimits(plan);
    return {
      votes: limits.votes === Infinity ? 0 : (usage.votes / limits.votes) * 100,
      certificates: limits.certificates === Infinity ? 0 : (usage.certificates / limits.certificates) * 100,
      storage: (usage.storage / (limits.storage * 1024 * 1024 * 1024)) * 100
    };
  }

  calculateOverage(usage: any, limits: { votes: number; certificates: number; storage: number }) {
    return {
      votes: Math.max(0, usage.votes - limits.votes),
      certificates: Math.max(0, usage.certificates - limits.certificates),
      storage: Math.max(0, usage.storage - (limits.storage * 1024 * 1024 * 1024))
    };
  }

  calculatePotentialSavings(plan: PlanKey, tokenDiscount: any) {
    if (!tokenDiscount || !tokenDiscount.discount) {
      return null;
    }

    const monthlyPrice = Number(PLAN_DEFINITIONS[plan].price) || 0;
    const discountAmount = monthlyPrice * (tokenDiscount.discount / 100);

    const savings = {
      monthlySavings: Math.round(discountAmount * 100) / 100,
      annualSavings: Math.round(discountAmount * 12 * 100) / 100,
      currency: 'usd',
      discountType: tokenDiscount.type,
      discountValue: tokenDiscount.discount,
      originalMonthlyPrice: monthlyPrice,
      discountedMonthlyPrice: monthlyPrice - discountAmount,
      savingsPercentage: monthlyPrice > 0 ? Math.round((discountAmount / monthlyPrice) * 100) : 0
    };

    logger.info(`Calculated potential savings for plan ${plan}:`, savings);
    return savings;
  }

  calculateProjectionConfidence(usage30d: any, usage7d: any): number {
    if (!usage30d || !usage7d) {
      return 0;
    }
    const varianceVotes = Math.abs(usage30d.votes - usage7d.votes);
    const varianceCertificates = Math.abs(usage30d.certificates - usage7d.certificates);

    const varianceScore = varianceVotes + varianceCertificates;
    return Math.max(0, 100 - varianceScore);
  }

  getAddonPrice(addon: string): number {
    const addonPrices: Record<string, number> = {
      extra_storage: 5,
      priority_support: 15,
      custom_domain: 10,
      advanced_analytics: 20
    };
    return addonPrices[addon] ?? 0;
  }
}

export const billingPlanUtils = new BillingPlanUtils();
