// services/external/tokenDiscount.service.ts
import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
import { logger } from '../../utils/logger';
import Stripe from 'stripe';
import erc20Abi from '../../abi/erc20Minimal.json';
import { TOKEN_DISCOUNT_TIERS } from '../../constants/tokenDiscounts';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

// Initialize Web3 provider and contract
const provider = new JsonRpcProvider(process.env.BASE_RPC_URL);
const tokenContract = new Contract(process.env.TOKEN_CONTRACT_ADDRESS!, erc20Abi, provider);

// Types
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
  metadata?: Record<string, any>;
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

export class TokenDiscountService {
  
  /**
   * Get token balance for a wallet address
   */
  async getWalletBalance(walletAddress: string): Promise<number> {
    try {
      if (!this.validateWalletAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const raw = await tokenContract.balanceOf(walletAddress);
      return parseFloat(formatUnits(raw, 18));
    } catch (error) {
      logger.error('Error checking token balance for ${walletAddress}:', { error });
      throw new Error('Failed to fetch wallet balance');
    }
  }

  /**
   * Get available discounts for a wallet address
   */
  async getAvailableDiscounts(walletAddress: string): Promise<TokenDiscount[]> {
    try {
      const balance = await this.getWalletBalance(walletAddress);
      
      const eligibleDiscounts = TOKEN_DISCOUNT_TIERS
        .filter(tier => balance >= tier.threshold)
        .map(tier => ({
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
        .sort((a, b) => b.discountValue - a.discountValue); // Sort by highest discount first

      return eligibleDiscounts;
    } catch (error) {
      logger.error('Error getting available discounts:', { error });
      return [];
    }
  }

  /**
   * Check discount eligibility for a wallet
   */
  async checkDiscountEligibility(walletAddress: string): Promise<DiscountEligibility> {
    try {
      const balance = await this.getWalletBalance(walletAddress);
      const availableDiscounts = await this.getAvailableDiscounts(walletAddress);
      
      const eligible = availableDiscounts.length > 0;
      const highestDiscount = availableDiscounts[0]; // Already sorted by highest discount
      
      let requiredBalance: number | undefined;
      let reason: string | undefined;
      
      if (!eligible) {
        const lowestTier = TOKEN_DISCOUNT_TIERS[TOKEN_DISCOUNT_TIERS.length - 1];
        requiredBalance = lowestTier?.threshold;
        reason = `Need ${requiredBalance - balance} more tokens for discount eligibility`;
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
      logger.error('Error checking discount eligibility:', { error });
      return {
        eligible: false,
        balance: 0,
        availableDiscounts: [],
        reason: 'Failed to check token balance'
      };
    }
  }

  /**
   * Get the best coupon ID for a wallet balance
   */
  async getCouponForWallet(walletAddress: string): Promise<string | undefined> {
    try {
      const balance = await this.getWalletBalance(walletAddress);
      return this.getCouponForBalance(balance);
    } catch (error) {
      logger.error('Error getting coupon for wallet:', { error });
      return undefined;
    }
  }

  /**
   * Get coupon ID for a specific token balance
   */
  private getCouponForBalance(balance: number): string | undefined {
    for (const tier of TOKEN_DISCOUNT_TIERS) {
      if (balance >= tier.threshold) {
        return tier.couponId;
      }
    }
    return undefined;
  }

  /**
   * Get detailed discount information for a wallet
   */
  async getDiscountInfoForWallet(walletAddress: string): Promise<{
    balance: number;
    couponId?: string;
    discountPercentage?: number;
    tierName?: string;
    nextTierThreshold?: number;
    nextTierDiscount?: number;
  } | null> {
    try {
      const balance = await this.getWalletBalance(walletAddress);
      
      const currentTier = TOKEN_DISCOUNT_TIERS.find(t => balance >= t.threshold);
      const nextTier = TOKEN_DISCOUNT_TIERS.find(t => t.threshold > balance);
      
      return {
        balance,
        couponId: currentTier?.couponId,
        discountPercentage: currentTier?.discountPercentage,
        tierName: currentTier?.name,
        nextTierThreshold: nextTier?.threshold,
        nextTierDiscount: nextTier?.discountPercentage
      };
    } catch (error) {
      logger.error('Error getting discount info:', { error });
      return null;
    }
  }

  /**
   * Apply discount to Stripe customer
   */
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
      const { subscriptionId = undefined } = options;
      
      // Get the best available coupon
      const couponId = await this.getCouponForWallet(walletAddress);
      
      if (!couponId) {
        return {
          couponId: '',
          discountId: '',
          customerId,
          subscriptionId: subscriptionId || undefined,
          applied: false,
          error: 'No eligible discount found'
        };
      }

      // Verify coupon exists in Stripe
      const coupon = await stripe.coupons.retrieve(couponId);
      if (!coupon.valid) {
        throw new Error(`Coupon ${couponId} is not valid`);
      }

      let result;
      
      if (subscriptionId) {
        // Apply to specific subscription
        result = await stripe.subscriptions.update(subscriptionId, {
          coupon: couponId,
          metadata: {
            wallet_address: walletAddress,
            applied_at: new Date().toISOString(),
            source: 'token_discount'
          }
        });
      } else {
        // Apply to customer (affects future subscriptions)
        result = await stripe.customers.update(customerId, {
          coupon: couponId,
          metadata: {
            wallet_address: walletAddress,
            discount_applied_at: new Date().toISOString(),
            source: 'token_discount'
          }
        });
      }

      return {
        couponId,
        discountId: result.discount?.id || '',
        customerId,
        subscriptionId,
        applied: true
      };

    } catch (error) {
      logger.error('Error applying discount to customer:', { error });
      return {
        couponId: '',
        discountId: '',
        customerId,
        subscriptionId: subscriptionId || undefined,
        applied: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove discount from Stripe customer
   */
  async removeDiscountFromCustomer(
    customerId: string, 
    subscriptionId?: string
  ): Promise<boolean> {
    try {
      if (subscriptionId) {
        await stripe.subscriptions.update(subscriptionId, {
          coupon: '',
        });
      } else {
        await stripe.customers.update(customerId, {
          coupon: '',
        });
      }
      return true;
    } catch (error) {
      logger.error('Error removing discount:', { error });
      return false;
    }
  }

  /**
   * Validate and sync Stripe coupons with token tiers
   */
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
        const coupon = await stripe.coupons.retrieve(tier.couponId);
        if (coupon.valid) {
          results.valid.push(tier.couponId);
        } else {
          results.invalid.push(tier.couponId);
        }
      } catch (error) {
        results.missing.push(tier.couponId);
      }
    }

    return results;
  }

  /**
   * Create missing Stripe coupons for token tiers
   */
  async createMissingStripeCoupons(): Promise<{
    created: Array<{ tierName: string; couponId: string; }>;
    errors: Array<{ tierName: string; error: string; }>;
  }> {
    const results = {
      created: [] as Array<{ tierName: string; couponId: string; }>,
      errors: [] as Array<{ tierName: string; error: string; }>
    };

    for (const tier of TOKEN_DISCOUNT_TIERS) {
      if (tier.couponId) continue; // Skip if coupon ID already exists

      try {
        const coupon = await stripe.coupons.create({
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

  /**
   * Get usage statistics for token discounts
   */
  async getDiscountUsageStats(timeframe: 'last_30_days' | 'last_90_days' | 'all_time' = 'last_30_days'): Promise<{
    totalApplications: number;
    totalSavings: number;
    topTiers: Array<{ tierName: string; applications: number; savings: number; }>;
    uniqueWallets: number;
  }> {
    try {
      const startDate = new Date();
      if (timeframe === 'last_30_days') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (timeframe === 'last_90_days') {
        startDate.setDate(startDate.getDate() - 90);
      } else {
        startDate.setFullYear(2020); // All time
      }

      // This would typically query your database for usage stats
      // For now, returning placeholder data
      return {
        totalApplications: 0,
        totalSavings: 0,
        topTiers: [],
        uniqueWallets: 0
      };

    } catch (error) {
      logger.error('Error getting discount usage stats:', { error });
      return {
        totalApplications: 0,
        totalSavings: 0,
        topTiers: [],
        uniqueWallets: 0
      };
    }
  }

  /**
   * Get all available discount tiers
   */
  getAvailableTiers(): typeof TOKEN_DISCOUNT_TIERS {
    return TOKEN_DISCOUNT_TIERS;
  }

  /**
   * Validate wallet address format
   */
  validateWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Calculate potential savings for a wallet
   */
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
      
      const currentDiscountPercent = discountInfo?.discountPercentage || 0;
      const currentDiscount = subscriptionAmount * (currentDiscountPercent / 100);
      
      const monthlySavings = billingCycle === 'monthly' ? currentDiscount : currentDiscount / 12;
      const yearlySavings = monthlySavings * 12;

      let nextTierSavings;
      if (discountInfo?.nextTierThreshold && discountInfo?.nextTierDiscount) {
        const additionalTokensNeeded = discountInfo.nextTierThreshold - discountInfo.balance;
        const nextTierDiscount = subscriptionAmount * (discountInfo.nextTierDiscount / 100);
        const additionalDiscount = nextTierDiscount - currentDiscount;
        
        nextTierSavings = {
          additionalTokensNeeded,
          additionalMonthlySavings: billingCycle === 'monthly' ? additionalDiscount : additionalDiscount / 12,
          additionalYearlySavings: (billingCycle === 'monthly' ? additionalDiscount : additionalDiscount / 12) * 12
        };
      }

      return {
        currentDiscount: currentDiscountPercent,
        monthlySavings,
        yearlySavings,
        nextTierSavings
      };

    } catch (error) {
      logger.error('Error calculating potential savings:', { error });
      return {
        currentDiscount: 0,
        monthlySavings: 0,
        yearlySavings: 0
      };
    }
  }
}