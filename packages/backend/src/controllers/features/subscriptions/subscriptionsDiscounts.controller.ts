// src/controllers/features/subscriptions/subscriptionsDiscounts.controller.ts
// Controller handling token-based subscription discounts

import { Response } from 'express';
import { SubscriptionsBaseController, SubscriptionsBaseRequest } from './subscriptionsBase.controller';

interface WalletQuery extends SubscriptionsBaseRequest {
  validatedQuery?: {
    walletAddress?: string;
    timeframe?: 'last_30_days' | 'last_90_days' | 'all_time';
    subscriptionAmount?: number;
    billingCycle?: 'monthly' | 'yearly';
  };
}

interface ApplyDiscountRequest extends SubscriptionsBaseRequest {
  validatedBody: {
    customerId: string;
    walletAddress: string;
    subscriptionId?: string;
    validateBalance?: boolean;
  };
}

interface RemoveDiscountRequest extends SubscriptionsBaseRequest {
  validatedBody: {
    customerId: string;
    subscriptionId?: string;
  };
}

/**
 * SubscriptionsDiscountsController maps token discount operations to HTTP endpoints.
 */
export class SubscriptionsDiscountsController extends SubscriptionsBaseController {
  /**
   * Retrieve current wallet balance using the token balance service.
   */
  async getWalletBalance(req: WalletQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const walletAddress = this.parseString(req.validatedQuery?.walletAddress);
      if (!walletAddress) {
        throw { statusCode: 400, message: 'walletAddress query parameter is required' };
      }

      const balance = await this.subscriptionServices.tokenBalance.getWalletBalance(walletAddress);

      return {
        walletAddress,
        balance,
      };
    }, res, 'Wallet balance retrieved successfully');
  }

  /**
   * List discounts available for a wallet address.
   */
  async getAvailableDiscounts(req: WalletQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const walletAddress = this.parseString(req.validatedQuery?.walletAddress);
      if (!walletAddress) {
        throw { statusCode: 400, message: 'walletAddress query parameter is required' };
      }

      const discounts = await this.subscriptionServices.tokenDiscounts.getAvailableDiscounts(walletAddress);

      return {
        walletAddress,
        discounts,
      };
    }, res, 'Available token discounts retrieved');
  }

  /**
   * Check eligibility information for token-based discounts.
   */
  async checkDiscountEligibility(req: WalletQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const walletAddress = this.parseString(req.validatedQuery?.walletAddress);
      if (!walletAddress) {
        throw { statusCode: 400, message: 'walletAddress query parameter is required' };
      }

      const eligibility = await this.subscriptionServices.tokenDiscounts.checkDiscountEligibility(walletAddress);

      return {
        walletAddress,
        eligibility,
      };
    }, res, 'Token discount eligibility evaluated');
  }

  /**
   * Apply the best available discount to a Stripe customer/subscription.
   */
  async applyTokenDiscount(req: ApplyDiscountRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const { customerId, walletAddress, subscriptionId, validateBalance } = req.validatedBody;

      const application = await this.subscriptionServices.tokenDiscounts.applyDiscountToCustomer(
        customerId,
        walletAddress,
        subscriptionId,
        { validateBalance },
      );

      return { application };
    }, res, 'Token discount application processed', this.getRequestMeta(req));
  }

  /**
   * Remove token discount from a customer/subscription.
   */
  async removeTokenDiscount(req: RemoveDiscountRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const removed = await this.subscriptionServices.tokenDiscounts.removeDiscountFromCustomer(
        req.validatedBody.customerId,
        req.validatedBody.subscriptionId,
      );

      return {
        removed,
      };
    }, res, 'Token discount removal processed', this.getRequestMeta(req));
  }

  /**
   * Validate configured Stripe coupons for token tiers.
   */
  async validateStripeCoupons(_req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const validation = await this.subscriptionServices.tokenDiscounts.validateStripeCoupons();
      return { validation };
    }, res, 'Token discount coupons validated');
  }

  /**
   * Create missing Stripe coupons for configured token tiers.
   */
  async createMissingCoupons(_req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const created = await this.subscriptionServices.tokenDiscounts.createMissingStripeCoupons();
      return { created };
    }, res, 'Missing Stripe coupons created');
  }

  /**
   * Retrieve usage statistics for token discounts.
   */
  async getDiscountUsageStats(req: WalletQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const timeframe = (req.validatedQuery?.timeframe ?? 'last_30_days') as
        | 'last_30_days'
        | 'last_90_days'
        | 'all_time';

      const stats = await this.subscriptionServices.tokenDiscounts.getDiscountUsageStats(timeframe);

      return {
        timeframe,
        stats,
      };
    }, res, 'Token discount usage stats retrieved');
  }

  /**
   * Calculate potential savings based on wallet balance and plan amount.
   */
  async calculatePotentialSavings(req: WalletQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const walletAddress = this.parseString(req.validatedQuery?.walletAddress);
      if (!walletAddress) {
        throw { statusCode: 400, message: 'walletAddress query parameter is required' };
      }

      const subscriptionAmount = this.parseOptionalNumber(req.validatedQuery?.subscriptionAmount, { min: 0 }) ?? 0;
      const billingCycle = (req.validatedQuery?.billingCycle ?? 'monthly') as 'monthly' | 'yearly';

      const savings = await this.subscriptionServices.tokenDiscounts.calculatePotentialSavings(
        walletAddress,
        subscriptionAmount,
        billingCycle,
      );

      return {
        walletAddress,
        billingCycle,
        savings,
      };
    }, res, 'Potential savings calculated');
  }

  /**
   * Retrieve detailed discount info for a wallet.
   */
  async getWalletDiscountInfo(req: WalletQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const walletAddress = this.parseString(req.validatedQuery?.walletAddress);
      if (!walletAddress) {
        throw { statusCode: 400, message: 'walletAddress query parameter is required' };
      }

      const info = await this.subscriptionServices.tokenDiscounts.getDiscountInfoForWallet(walletAddress);

      return {
        walletAddress,
        info,
      };
    }, res, 'Wallet discount information retrieved');
  }
}

export const subscriptionsDiscountsController = new SubscriptionsDiscountsController();
