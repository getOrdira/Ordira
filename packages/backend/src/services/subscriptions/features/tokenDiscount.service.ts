import type Stripe from 'stripe';
import { logger } from '../../../utils/logger';
import { TOKEN_DISCOUNT_TIERS } from '../../../constants/tokenDiscounts';
import {
  StripeGatewayService,
  stripeGatewayService
} from '../core/stripeGateway.service';
import {
  TokenBalanceService,
  tokenBalanceService
} from '../core/tokenBalance.service';

export interface TokenDiscount {
  id: string;
  name: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  threshold: number;
  stripeCouponId?: string;
  isActive: boolean;
  validUntil?: Date;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface DiscountEligibility {
  eligible: boolean;
  balance: number;
  requiredBalance?: number;
  availableDiscounts: TokenDiscount[];
  highestDiscount?: TokenDiscount;
  reason?: string;
}

export interface StripeDiscountApplication {
  couponId: string;
  discountId: string;
  customerId?: string;
  subscriptionId?: string;
  applied: boolean;
  error?: string;
}

/**
 * Feature service that bridges token balances with Stripe coupon management
 * to provide token-based subscription discounts.
 */
export class TokenDiscountService {
  constructor(
    private readonly balanceService: TokenBalanceService = tokenBalanceService,
    private readonly stripeGateway: StripeGatewayService = stripeGatewayService
  ) {}

  async getWalletBalance(walletAddress: string): Promise<number> {
    return this.balanceService.getWalletBalance(walletAddress);
  }

  async getAvailableDiscounts(walletAddress: string): Promise<TokenDiscount[]> {
    try {
      const balance = await this.balanceService.getWalletBalance(walletAddress);

      return TOKEN_DISCOUNT_TIERS
        .filter((tier) => balance >= tier.threshold)
        .map((tier) => ({
          id: `token_tier_${tier.name.toLowerCase().replace(/\s+/g, '_')}`,
          name: tier.name,
          discountType: 'percentage' as const,
          discountValue: tier.discountPercentage,
          threshold: tier.threshold,
          stripeCouponId: tier.couponId,
          isActive: true,
          description: `${tier.discountPercentage}% discount for holding ${tier.threshold}+ tokens`,
          metadata: {
            tokenThreshold: tier.threshold,
            userBalance: balance
          }
        }))
        .sort((a, b) => b.discountValue - a.discountValue);
    } catch (error) {
      logger.error('Error getting available token discounts', { error });
      return [];
    }
  }

  async checkDiscountEligibility(walletAddress: string): Promise<DiscountEligibility> {
    try {
      const balance = await this.balanceService.getWalletBalance(walletAddress);
      const availableDiscounts = await this.getAvailableDiscounts(walletAddress);

      const eligible = availableDiscounts.length > 0;
      const highestDiscount = availableDiscounts[0];

      let requiredBalance: number | undefined;
      let reason: string | undefined;

      if (!eligible) {
        const lowestTier = TOKEN_DISCOUNT_TIERS[TOKEN_DISCOUNT_TIERS.length - 1];
        if (lowestTier) {
          requiredBalance = lowestTier.threshold;
          reason = `Need ${Math.max(lowestTier.threshold - balance, 0)} more tokens for discount eligibility`;
        }
      }

      return {
        eligible,
        balance,
        requiredBalance,
        availableDiscounts,
        highestDiscount,
        reason
      };
    } catch (error) {
      logger.error('Error checking token discount eligibility', { error });
      return {
        eligible: false,
        balance: 0,
        availableDiscounts: [],
        reason: 'Failed to check token balance'
      };
    }
  }

  async getCouponForWallet(walletAddress: string): Promise<string | undefined> {
    try {
      const balance = await this.balanceService.getWalletBalance(walletAddress);
      return this.getCouponForBalance(balance);
    } catch (error) {
      logger.error('Error getting coupon for wallet', { error });
      return undefined;
    }
  }

  async getDiscountInfoForWallet(walletAddress: string): Promise<{
    balance: number;
    couponId?: string;
    discountPercentage?: number;
    tierName?: string;
    nextTierThreshold?: number;
    nextTierDiscount?: number;
  } | null> {
    try {
      const balance = await this.balanceService.getWalletBalance(walletAddress);

      const currentTier = TOKEN_DISCOUNT_TIERS.find((tier) => balance >= tier.threshold);
      const nextTier = TOKEN_DISCOUNT_TIERS.find((tier) => tier.threshold > balance);

      return {
        balance,
        couponId: currentTier?.couponId,
        discountPercentage: currentTier?.discountPercentage,
        tierName: currentTier?.name,
        nextTierThreshold: nextTier?.threshold,
        nextTierDiscount: nextTier?.discountPercentage
      };
    } catch (error) {
      logger.error('Error getting discount info for wallet', { error });
      return null;
    }
  }

  async applyDiscountToCustomer(
    customerId: string,
    walletAddress: string,
    subscriptionId?: string,
    options: {
      subscriptionId?: string;
      validateBalance?: boolean;
    } = {}
  ): Promise<StripeDiscountApplication> {
    try {
      const targetSubscriptionId = options.subscriptionId ?? subscriptionId;
      const couponId = await this.getCouponForWallet(walletAddress);

      if (!couponId) {
        return {
          couponId: '',
          discountId: '',
          customerId,
          subscriptionId: targetSubscriptionId,
          applied: false,
          error: 'No eligible discount found'
        };
      }

      const coupon = await this.stripeGateway.retrieveCoupon(couponId);
      if (!coupon.valid) {
        throw new Error(`Coupon ${couponId} is not valid`);
      }

      const metadata: Stripe.Metadata = {
        wallet_address: walletAddress,
        source: 'token_discount',
        applied_at: new Date().toISOString()
      };

      if (targetSubscriptionId) {
        const subscription = await this.stripeGateway.applyCouponToSubscription(
          targetSubscriptionId,
          couponId,
          metadata
        );

        return {
          couponId,
          discountId: subscription.discount?.id ?? '',
          customerId,
          subscriptionId: targetSubscriptionId,
          applied: true
        };
      }

      const customer = await this.stripeGateway.applyCouponToCustomer(customerId, couponId, {
        ...metadata,
        discount_applied_at: metadata.applied_at
      });

      return {
        couponId,
        discountId: customer.discount?.id ?? '',
        customerId,
        applied: true
      };
    } catch (error) {
      logger.error('Error applying token discount to customer', { error });
      return {
        couponId: '',
        discountId: '',
        customerId,
        subscriptionId,
        applied: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async removeDiscountFromCustomer(customerId: string, subscriptionId?: string): Promise<boolean> {
    try {
      if (subscriptionId) {
        await this.stripeGateway.removeCouponFromSubscription(subscriptionId);
      } else {
        await this.stripeGateway.removeCouponFromCustomer(customerId);
      }
      return true;
    } catch (error) {
      logger.error('Error removing token discount from customer', { error });
      return false;
    }
  }

  async validateStripeCoupons(): Promise<{
    valid: string[];
    invalid: string[];
    missing: string[];
  }> {
    const results = {
      valid: [] as string[],
      invalid: [] as string[],
      missing: [] as string[]
    };

    for (const tier of TOKEN_DISCOUNT_TIERS) {
      if (!tier.couponId) {
        results.missing.push(`${tier.name} (${tier.discountPercentage}%)`);
        continue;
      }

      try {
        const coupon = await this.stripeGateway.retrieveCoupon(tier.couponId);
        if (coupon.valid) {
          results.valid.push(tier.couponId);
        } else {
          results.invalid.push(tier.couponId);
        }
      } catch {
        results.missing.push(tier.couponId);
      }
    }

    return results;
  }

  async createMissingStripeCoupons(): Promise<{
    created: Array<{ tierName: string; couponId: string }>;
    errors: Array<{ tierName: string; error: string }>;
  }> {
    const results = {
      created: [] as Array<{ tierName: string; couponId: string }>,
      errors: [] as Array<{ tierName: string; error: string }>
    };

    for (const tier of TOKEN_DISCOUNT_TIERS) {
      if (tier.couponId) {
        continue;
      }

      try {
        const coupon = await this.stripeGateway.createCoupon({
          percent_off: tier.discountPercentage,
          duration: 'forever',
          name: `${tier.name} Token Holder Discount`,
          id: `token_${tier.name.toLowerCase().replace(/\s+/g, '_')}_${tier.discountPercentage}`,
          metadata: {
            token_threshold: tier.threshold.toString(),
            tier_name: tier.name,
            source: 'token_discount_service'
          }
        });

        results.created.push({
          tierName: tier.name,
          couponId: coupon.id
        });
      } catch (error) {
        results.errors.push({
          tierName: tier.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  async getDiscountUsageStats(
    timeframe: 'last_30_days' | 'last_90_days' | 'all_time' = 'last_30_days'
  ): Promise<{
    totalApplications: number;
    totalSavings: number;
    topTiers: Array<{ tierName: string; applications: number; savings: number }>;
    uniqueWallets: number;
  }> {
    try {
      if (timeframe === 'last_30_days') {
        // placeholder logic retained
      } else if (timeframe === 'last_90_days') {
        // placeholder logic retained
      }

      return {
        totalApplications: 0,
        totalSavings: 0,
        topTiers: [],
        uniqueWallets: 0
      };
    } catch (error) {
      logger.error('Error getting token discount usage stats', { error });
      return {
        totalApplications: 0,
        totalSavings: 0,
        topTiers: [],
        uniqueWallets: 0
      };
    }
  }

  getAvailableTiers(): typeof TOKEN_DISCOUNT_TIERS {
    return TOKEN_DISCOUNT_TIERS;
  }

  validateWalletAddress(address: string): boolean {
    return this.balanceService.validateWalletAddress(address);
  }

  async calculatePotentialSavings(
    walletAddress: string,
    subscriptionAmount: number,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<{
    currentDiscount: number;
    monthlySavings: number;
    yearlySavings: number;
    nextTierSavings?: {
      additionalTokensNeeded: number;
      additionalMonthlySavings: number;
      additionalYearlySavings: number;
    };
  }> {
    try {
      const discountInfo = await this.getDiscountInfoForWallet(walletAddress);
      const currentDiscountPercent = discountInfo?.discountPercentage ?? 0;
      const currentDiscountValue = subscriptionAmount * (currentDiscountPercent / 100);

      const monthlySavings = billingCycle === 'monthly' ? currentDiscountValue : currentDiscountValue / 12;
      const yearlySavings = monthlySavings * 12;

      let nextTierSavings:
        | {
          additionalTokensNeeded: number;
          additionalMonthlySavings: number;
          additionalYearlySavings: number;
        }
        | undefined;

      if (discountInfo?.nextTierThreshold && discountInfo.nextTierDiscount) {
        const additionalTokensNeeded = discountInfo.nextTierThreshold - (discountInfo.balance ?? 0);
        const nextTierDiscountValue = subscriptionAmount * (discountInfo.nextTierDiscount / 100);
        const additionalDiscount = nextTierDiscountValue - currentDiscountValue;
        const monthlyAdditional = billingCycle === 'monthly' ? additionalDiscount : additionalDiscount / 12;

        nextTierSavings = {
          additionalTokensNeeded,
          additionalMonthlySavings: monthlyAdditional,
          additionalYearlySavings: monthlyAdditional * 12
        };
      }

      return {
        currentDiscount: currentDiscountPercent,
        monthlySavings,
        yearlySavings,
        nextTierSavings
      };
    } catch (error) {
      logger.error('Error calculating token discount savings', { error });
      return {
        currentDiscount: 0,
        monthlySavings: 0,
        yearlySavings: 0
      };
    }
  }

  private getCouponForBalance(balance: number): string | undefined {
    for (const tier of TOKEN_DISCOUNT_TIERS) {
      if (balance >= tier.threshold) {
        return tier.couponId;
      }
    }
    return undefined;
  }
}

export const tokenDiscountService = new TokenDiscountService();
