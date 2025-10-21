// src/services/subscriptions/features/billingManagement.service.ts
import Stripe from 'stripe';
import { logger } from '../../../utils/logger'; 
import { Business } from '../../../models/business.model';
import { notificationsService } from '../../notifications/notifications.service'; 
import { StripeGatewayService, stripeGatewayService } from '../core/stripeGateway.service';
import { TokenDiscountService, tokenDiscountService } from './tokenDiscount.service';
import { PlanKey, PLAN_DEFINITIONS } from '../../../constants/plans';
import { BrandSettings } from '../../../models/brandSettings.model';
import { billingDataService, BillingDataService } from '../core/billingData.service';
import { billingPlanUtils, BillingPlanUtils } from '../utils/billingPlan.utils';
import { billingValidationService, BillingValidationService } from '../validation/billingValidation.service';

export class BillingManagementService {
  private stripe: Stripe;
  private notificationsService = notificationsService;
  private stripeGateway: StripeGatewayService;
  private tokenDiscountService: TokenDiscountService;
  private dataService: BillingDataService;
  private planUtils: BillingPlanUtils;
  private validationService: BillingValidationService;

  constructor(
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' }),
    notificationsServiceParam = notificationsService,
    stripeGateway: StripeGatewayService = stripeGatewayService,
    tokenService: TokenDiscountService = tokenDiscountService,
    dataService = billingDataService,
    planUtils = billingPlanUtils,
    validationService = billingValidationService
  ) {
    this.stripe = stripe;
    this.notificationsService = notificationsServiceParam;
    this.stripeGateway = stripeGateway;
    this.tokenDiscountService = tokenService;
    this.dataService = dataService;
    this.planUtils = planUtils;
    this.validationService = validationService;
  }

  async createCheckoutSession(config: any): Promise<any> {
    // Implementation from previous response
    const { businessId, plan, couponCode, addons = [], metadata = {} } = config;

    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const planPricing = await this.planUtils.getPlanPricing(plan);
    const lineItems = [{ price: planPricing.stripePriceId, quantity: 1 }];

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      customer_email: business.email,
      metadata: { businessId, plan, ...metadata }
    });

    return { sessionId: session.id, url: session.url };
  }

  async getBillingInfo(businessId: string): Promise<any> {
    try {
      // Get billing record from database
      const billing = await this.dataService.getBillingByBusinessId(businessId);
      if (!billing) {
        return null;
      }

      // Get Stripe subscription if exists
      let stripeSubscription = null;
      if (billing.stripeSubscriptionId) {
        try {
          stripeSubscription = await this.stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
        } catch (error) {
          logger.warn('Failed to retrieve Stripe subscription:', error);
        }
      }

      // Get Stripe customer if exists
      let stripeCustomer = null;
      if (billing.stripeCustomerId) {
        try {
          stripeCustomer = await this.stripe.customers.retrieve(billing.stripeCustomerId);
        } catch (error) {
          logger.warn('Failed to retrieve Stripe customer:', error);
        }
      }

      return {
        ...billing.toObject?.() || billing,
        stripeSubscription,
        stripeCustomer,
        isActive: billing.status === 'active',
        nextBillingDate: stripeSubscription?.current_period_end 
          ? new Date(stripeSubscription.current_period_end * 1000) 
          : null
      };
    } catch (error) {
      logger.error('Failed to get billing info:', error);
      throw error;
    }
  }

  async removeTokenDiscounts(businessId: string): Promise<any> {
  try {
    const billing = await this.getBillingInfo(businessId);
    if (!billing || !billing.stripeSubscriptionId) {
      return { 
        success: false,
        message: 'No active subscription found',
        subscriptionUpdated: false
      };
    }

    let subscriptionUpdated = false;

    // Remove discounts from Stripe subscription (correct approach)
    if (billing.status === 'active') {
      try {
        // Get the subscription to access customer info
        const subscription = await this.stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
        
        if (subscription.customer) {
          // Remove discount from customer (this affects all their subscriptions)
          await this.stripe.customers.update(subscription.customer as string, {
            coupon: '' // Empty string removes the coupon
          });

          logger.info('Removed customer-level discount for business ${businessId}');
          subscriptionUpdated = true;
        }

        // Also check for and remove any subscription-level promotion codes
        if (subscription.discount) {
          // Note: You cannot directly remove a discount from a subscription
          // But we can log it and handle it in the billing record
          logger.info('Subscription ${billing.stripeSubscriptionId} has subscription-level discount that cannot be directly removed');
        }

      } catch (stripeError) {
        logger.warn('Failed to remove Stripe discounts:', stripeError);
        // Continue with local cleanup even if Stripe update fails
      }
    }

    // Update local billing record (always do this for consistency)
    await this.dataService.updateBilling(businessId, {
      tokenDiscounts: null,
      activeDiscountApplied: false,
      tokenDiscountsUpdatedAt: new Date(),
      discountRemovedAt: new Date(),
      discountRemovalReason: 'manual_removal'
    });

    logger.info('Token discounts removed for business ${businessId}:', {
      stripeUpdated: subscriptionUpdated,
      localRecordUpdated: true,
      subscriptionId: billing.stripeSubscriptionId
    });

    return {
      success: true,
      message: subscriptionUpdated 
        ? 'Token discounts removed successfully from Stripe and local records' 
        : 'Token discounts removed from local records (Stripe update not applicable)',
      subscriptionUpdated,
      details: {
        stripeCustomerUpdated: subscriptionUpdated,
        localBillingUpdated: true,
        subscriptionId: billing.stripeSubscriptionId,
        removedAt: new Date()
      }
    };
  } catch (error) {
    logger.error('Error removing token discounts:', error);
    throw { 
      statusCode: 500, 
      message: 'Failed to remove token discounts',
      originalError: error instanceof Error ? error.message : 'Unknown error',
      businessId
    };
  }
}

  async validateDowngrade(fromPlan: string, toPlan: string, businessId: string) {
    try {
      return await this.validationService.validateDowngrade({
        fromPlan: fromPlan as PlanKey,
        toPlan: toPlan as PlanKey,
        businessId,
        getCurrentUsage: () => this.getCurrentUsage(businessId),
        getCurrentUsageForType: (type) => this.getCurrentUsageForType(businessId, type)
      });
    } catch (error) {
      logger.error('Failed to validate downgrade:', error);
      throw error;
    }
  }

  /**
   * Helper method to get current usage for a specific type
   */
  private async getCurrentUsageForType(businessId: string, type: string): Promise<number> {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    return billing?.currentUsage?.[type] || 0;
  }
  async updateTokenDiscounts(businessId: string, walletAddress?: string): Promise<any> {
  try {
    // Get current billing info
    const billing = await this.getBillingInfo(businessId);
    if (!billing) {
      return { 
        hasDiscounts: false, 
        message: 'No billing record found' 
      };
    }

    // Get business and brand settings for wallet information
    const [business, brandSettings] = await Promise.all([
      Business.findById(businessId),
      BrandSettings.findOne({ business: businessId })
    ]);

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    // Use provided wallet or get from brand settings (wallet info is in brandSettings, not business)
    const targetWallet = walletAddress || brandSettings?.web3Settings?.certificateWallet;
    
    if (!targetWallet || !brandSettings?.web3Settings?.walletVerified) {
      return { 
        hasDiscounts: false, 
        message: 'No verified wallet found',
        billingId: billing.id,
        walletAddress: targetWallet || null,
        verificationStatus: {
          hasWallet: !!targetWallet,
          isVerified: brandSettings?.web3Settings?.walletVerified || false,
          verifiedAt: brandSettings?.web3Settings?.walletVerifiedAt || null
        }
      };
    }

    // Check for token-based billing discounts
    const tokenService = this.tokenDiscountService;
    const tokenDiscounts = await tokenService.getCouponForWallet(targetWallet);

    // Helper function to safely get discount type
    const getDiscountType = (discounts: any): string => {
      if (!discounts) return 'none';
      if (typeof discounts === 'string') return 'coupon_code';
      if (typeof discounts === 'object' && discounts.type) return discounts.type;
      if (Array.isArray(discounts) && discounts.length > 0) return 'multiple_discounts';
      return 'unknown_format';
    };

    // Helper function to safely get discount value
    const getDiscountValue = (discounts: any): number => {
      if (!discounts) return 0;
      if (typeof discounts === 'object' && typeof discounts.discount === 'number') return discounts.discount;
      if (typeof discounts === 'object' && typeof discounts.value === 'number') return discounts.value;
      return 0;
    };

    // Update local billing record with discount information
    const discountUpdates: any = {
      tokenDiscounts: tokenDiscounts || null,
      tokenDiscountsUpdatedAt: new Date(),
      walletAddress: targetWallet
    };

    // If there's an active subscription, apply the discount
    let subscriptionUpdated = false;
    if (billing.stripeSubscriptionId && billing.status === 'active' && tokenDiscounts) {
      try {
        await this.applyTokenDiscountToSubscription(billing.stripeSubscriptionId, tokenDiscounts);
        discountUpdates.activeDiscountApplied = true;
        discountUpdates.discountAppliedAt = new Date();
        subscriptionUpdated = true;
      } catch (discountError) {
        logger.warn('Failed to apply token discount to subscription:', discountError);
        discountUpdates.discountApplicationError = discountError instanceof Error ? discountError.message : 'Unknown error';
      }
    }

    // Update the billing record
    await this.dataService.updateBilling(businessId, discountUpdates);

    // Calculate potential savings
    const potentialSavings = this.planUtils.calculatePotentialSavings(billing.plan, tokenDiscounts);

    const result = {
      hasDiscounts: !!tokenDiscounts,
      discounts: tokenDiscounts || null,
      walletAddress: targetWallet,
      billingId: billing.id,
      subscriptionUpdated,
      potentialSavings,
      lastUpdated: new Date(),
      verificationStatus: {
        hasWallet: true,
        isVerified: true,
        verifiedAt: brandSettings.web3Settings.walletVerifiedAt,
        walletType: brandSettings.web3Settings.walletType
      },
      message: tokenDiscounts 
        ? `Token discounts applied${subscriptionUpdated ? ' to active subscription' : ''}` 
        : 'No token discounts available'
    };

    // Log the update with safe property access
    logger.info('Billing token discounts updated for business ${businessId}:', {
      hasDiscounts: result.hasDiscounts,
      subscriptionUpdated,
      discountType: getDiscountType(tokenDiscounts),
      discountValue: getDiscountValue(tokenDiscounts),
      walletAddress: targetWallet,
      verifiedAt: brandSettings.web3Settings.walletVerifiedAt,
      // Include raw data for debugging
      rawTokenDiscounts: tokenDiscounts
    });

    return result;
  } catch (error) {
    logger.error('Error updating billing token discounts:', error);
    throw { 
      statusCode: 500, 
      message: 'Failed to update billing token discounts',
      originalError: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

  async changePlan(businessId: string, newPlan: string, options: any = {}): Promise<any> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    // Get current subscription
    const currentBilling = await this.dataService.getBillingByBusinessId(businessId);
    if (!currentBilling?.stripeSubscriptionId) {
      throw { statusCode: 400, message: 'No active subscription found' };
    }

    // Validate downgrade if applicable
    if (options.isDowngrade) {
      await this.validateDowngrade(currentBilling.plan, newPlan, businessId);
    }

    // Update Stripe subscription
    const subscription = await this.stripe.subscriptions.update(
      currentBilling.stripeSubscriptionId,
      {
        items: [{
          id: currentBilling.stripeSubscriptionItemId,
          price: this.planUtils.getPlanPricing(newPlan).stripePriceId
        }],
        proration_behavior: 'always_invoice'
      }
    );

    // Update local billing record
    await this.dataService.updateBilling(businessId, {
      plan: newPlan,
      updatedAt: new Date()
    });

    // Send notification
    await this.sendPlanChangeNotification(business.email, currentBilling.plan, newPlan);

    return subscription;
  }

  async processRenewal(subscriptionId: string): Promise<any> {
    try {
      logger.info('Processing renewal for subscription: ${subscriptionId}');

      // Get subscription details from Stripe
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const businessId = subscription.metadata.businessId;

      if (!businessId) {
        throw new Error('Business ID not found in subscription metadata');
      }

      // Get business and billing info
      const [business, billing] = await Promise.all([
        Business.findById(businessId),
        this.dataService.getBillingByBusinessId(businessId)
      ]);

      if (!business) {
        throw new Error(`Business not found: ${businessId}`);
      }

      // Re-evaluate token discounts for renewal
      const tokenDiscount = await this.checkTokenDiscounts(businessId);
      
      // Update subscription with any new discounts
      if (tokenDiscount) {
        await this.applyTokenDiscountToSubscription(subscriptionId, tokenDiscount);
      }

      // Update local billing record
      await this.dataService.updateBilling(businessId, {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        lastRenewalAt: new Date(),
        renewalCount: (billing?.renewalCount || 0) + 1
      });

      // Send renewal confirmation
      await this.sendRenewalConfirmation(
        business.email, 
        billing?.plan || 'unknown',
        subscription.items.data[0]?.price?.unit_amount || 0
      );

      // Check for loyalty discounts for future renewals
      const loyaltyDiscount = await this.checkLoyaltyDiscount(businessId);
      if (loyaltyDiscount) {
        await this.scheduleLoyaltyDiscount(businessId, loyaltyDiscount);
      }

      // Log successful renewal
      logger.info('Renewal processed successfully for business: ${businessId}');

      return {
        subscriptionId,
        businessId,
        status: subscription.status,
        renewalDate: new Date(),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        tokenDiscount: tokenDiscount || null,
        loyaltyDiscount: loyaltyDiscount || null
      };

    } catch (error) {
      logger.error('Renewal processing failed:', {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getComprehensiveBillingInfo(businessId: string): Promise<any> {
    const [billing, usage, subscription] = await Promise.all([
      this.dataService.getBillingByBusinessId(businessId),
      this.getCurrentUsage(businessId),
      this.getStripeSubscription(businessId)
    ]);

    return {
      billing,
      usage,
      subscription,
      projections: await this.calculateUsageProjections(businessId),
      paymentMethods: await this.getPaymentMethods(businessId),
      invoices: await this.getRecentInvoices(businessId, 5)
    };
  }

  async getCurrentUsage(businessId: string): Promise<any> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get usage from various sources
    const [apiUsage, certificateUsage, votingUsage] = await Promise.all([
      this.getApiUsage(businessId, startOfMonth),
      this.getCertificateUsage(businessId, startOfMonth),
      this.getVotingUsage(businessId, startOfMonth)
    ]);

    return {
      apiCalls: apiUsage.count,
      certificates: certificateUsage.count,
      votes: votingUsage.count,
      storage: await this.getStorageUsage(businessId),
      bandwidth: await this.getBandwidthUsage(businessId),
      period: {
        start: startOfMonth,
        end: new Date()
      }
    };
  }

  async getDetailedUsage(businessId: string, timeframe: string = '30d'): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return {
      apiUsage: await this.getDetailedApiUsage(businessId, startDate, endDate),
      certificateUsage: await this.getDetailedCertificateUsage(businessId, startDate, endDate),
      votingUsage: await this.getDetailedVotingUsage(businessId, startDate, endDate),
      timeframe,
      period: { start: startDate, end: endDate }
    };
  }

  async calculateUsageProjections(businessId: string): Promise<any> {
    const usage30d = await this.getDetailedUsage(businessId, '30d');
    const usage7d = await this.getDetailedUsage(businessId, '7d');

    // Simple projection based on recent trends
    const dailyAverage = usage7d.apiUsage.total / 7;
    const monthlyProjection = dailyAverage * 30;

    return {
      nextMonth: {
        apiCalls: Math.round(monthlyProjection),
        certificates: Math.round(usage7d.certificateUsage.total / 7 * 30),
        votes: Math.round(usage7d.votingUsage.total / 7 * 30)
      },
      confidence: this.planUtils.calculateProjectionConfidence(usage30d, usage7d)
    };
  }

  // Add these methods to your BillingManagementService class

/**
 * Charge overage fees for usage beyond plan limits
 */
async chargeOverage(
  businessId: string, 
  amount: number, 
  description: string
): Promise<{
  success: boolean;
  invoiceId?: string;
  chargeId?: string;
  amount: number;
  error?: string;
}> {
  try {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing) {
      throw new Error('No billing record found');
    }

    if (!billing.stripeCustomerId) {
      throw new Error('No Stripe customer ID found');
    }

    // Create invoice item for overage
    const invoiceItem = await this.stripe.invoiceItems.create({
      customer: billing.stripeCustomerId,
      amount: Math.round(amount), // Ensure it's in cents
      currency: 'usd',
      description: description,
      metadata: {
        businessId,
        type: 'overage',
        timestamp: new Date().toISOString()
      }
    });

    // Create and finalize invoice
    const invoice = await this.stripe.invoices.create({
      customer: billing.stripeCustomerId,
      collection_method: 'charge_automatically',
      auto_advance: true, // Automatically attempt payment
      metadata: {
        businessId,
        type: 'overage'
      }
    });

    // Finalize the invoice to attempt payment
    const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);

    // Update local billing record
    await this.dataService.updateBilling(businessId, {
      lastOverageCharge: amount,
      lastOverageDate: new Date(),
      totalOverageCharges: (billing.totalOverageCharges || 0) + amount
    });

    logger.info('Overage charge processed: ${description} - $${(amount/100).toFixed(2)} for business ${businessId}');

    return {
      success: true,
      invoiceId: finalizedInvoice.id,
      chargeId: invoiceItem.id,
      amount: amount
    };

  } catch (error: any) {
    logger.error('Overage charging failed:', {
      businessId,
      amount,
      description,
      error: error.message
    });

    // Don't throw error - log it and return failure status
    return {
      success: false,
      amount: amount,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Create a one-time invoice for overages or additional charges
 */
async createOneTimeInvoice(
  businessId: string,
  items: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>
): Promise<{
  success: boolean;
  invoiceId?: string;
  totalAmount: number;
  error?: string;
}> {
  try {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing?.stripeCustomerId) {
      throw new Error('No billing customer found');
    }

    let totalAmount = 0;

    // Create invoice items
    for (const item of items) {
      const itemAmount = Math.round(item.amount * (item.quantity || 1));
      totalAmount += itemAmount;

      await this.stripe.invoiceItems.create({
        customer: billing.stripeCustomerId,
        amount: itemAmount,
        currency: 'usd',
        description: item.description,
        quantity: item.quantity || 1,
        metadata: {
          businessId,
          type: 'one_time_charge'
        }
      });
    }

    // Create and send invoice
    const invoice = await this.stripe.invoices.create({
      customer: billing.stripeCustomerId,
      collection_method: 'charge_automatically',
      auto_advance: true,
      metadata: {
        businessId,
        type: 'one_time_invoice',
        itemCount: items.length.toString()
      }
    });

    const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);

    return {
      success: true,
      invoiceId: finalizedInvoice.id,
      totalAmount
    };

  } catch (error: any) {
    logger.error('One-time invoice creation failed:', error);
    return {
      success: false,
      totalAmount: items.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0),
      error: error.message
    };
  }
}

/**
 * Get overage billing history for a business
 */
async getOverageHistory(
  businessId: string, 
  limit: number = 10
): Promise<Array<{
  date: Date;
  amount: number;
  description: string;
  type: string;
  status: string;
  invoiceId?: string;
}>> {
  try {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing?.stripeCustomerId) {
      return [];
    }

    // Get recent invoices with overage items
    const invoices = await this.stripe.invoices.list({
      customer: billing.stripeCustomerId,
      limit: limit * 2, // Get more than needed to filter
      expand: ['data.lines']
    });

    const overageHistory: any[] = [];

    for (const invoice of invoices.data) {
      // Look for overage items in the invoice
      const overageLines = invoice.lines.data.filter(
        line => line.metadata?.type === 'overage' || 
               line.description?.toLowerCase().includes('overage')
      );

      for (const line of overageLines) {
        overageHistory.push({
          date: new Date(invoice.created * 1000),
          amount: line.amount,
          description: line.description || 'Overage charge',
          type: line.metadata?.type || 'overage',
          status: invoice.status,
          invoiceId: invoice.id
        });
      }

      if (overageHistory.length >= limit) break;
    }

    return overageHistory.slice(0, limit);

  } catch (error) {
    logger.error('Failed to get overage history:', error);
    return [];
  }
}

/**
 * Check if overage billing is enabled for a business plan
 */
async isOverageBillingEnabled(businessId: string): Promise<{
  enabled: boolean;
  reason?: string;
  plan?: string;
}> {
  try {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing) {
      return { enabled: false, reason: 'No billing record found' };
    }

    // Overage typically not enabled for free plans
    if (billing.plan === 'foundation') {
      return { 
        enabled: false, 
        reason: 'Overage billing not available on Foundation plan',
        plan: billing.plan 
      };
    }

    // Check if payment method is set up
    if (!billing.stripeCustomerId || !billing.stripeSubscriptionId) {
      return { 
        enabled: false, 
        reason: 'Active subscription required for overage billing',
        plan: billing.plan 
      };
    }

    return { 
      enabled: true, 
      plan: billing.plan 
    };

  } catch (error) {
    logger.error('Error checking overage billing status:', error);
    return { 
      enabled: false, 
      reason: 'Unable to check overage billing status' 
    };
  }
}

/**
 * Track vote usage for a business
 */
async trackVoteUsage(businessId: string, voteId: string): Promise<void> {
    // Implementation for tracking vote usage in billing system
    // This is a placeholder implementation
    try {
      // Add your billing tracking logic here
      logger.info('Tracked vote usage for business ${businessId}, vote ${voteId}');
    } catch (error) {
      logger.error('Error tracking vote usage:', error);
      throw new Error('Failed to track vote usage in billing system');
    }
  }

/**
 * Get overage rates for different resource types
 */
getOverageRates(plan: string): {
  votes: number;
  certificates: number;
  apiCalls: number;
  storage: number; // per GB
} {
  const overageRates = {
    foundation: {
      votes: 0, // No overage on free plan
      certificates: 0,
      apiCalls: 0,
      storage: 0
    },
    growth: {
      votes: 5, // $0.05 per vote
      certificates: 100, // $1.00 per certificate
      apiCalls: 1, // $0.01 per API call
      storage: 200 // $2.00 per GB
    },
    premium: {
      votes: 3, // $0.03 per vote
      certificates: 75, // $0.75 per certificate
      apiCalls: 1, // $0.01 per API call
      storage: 150 // $1.50 per GB
    },
    enterprise: {
      votes: 2, // $0.02 per vote
      certificates: 50, // $0.50 per certificate
      apiCalls: 1, // $0.01 per API call
      storage: 100 // $1.00 per GB
    }
  };

  return overageRates[plan as keyof typeof overageRates] || overageRates.growth;
}

  async updatePaymentMethod(businessId: string, paymentMethodId: string): Promise<any> {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing?.stripeCustomerId) {
      throw { statusCode: 400, message: 'No billing account found' };
    }

    // Attach payment method to customer
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: billing.stripeCustomerId
    });

    // Set as default
    await this.stripe.customers.update(billing.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    return { success: true, paymentMethodId };
  }

  async cancelSubscription(businessId: string, options: any = {}): Promise<any> {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing?.stripeSubscriptionId) {
      throw { statusCode: 400, message: 'No active subscription found' };
    }

    const canceledSubscription = await this.stripe.subscriptions.cancel(
      billing.stripeSubscriptionId,
      {
        prorate: options.immediate || false
      }
    );

    // Update local billing
    await this.dataService.updateBilling(businessId, {
      status: 'canceled',
      canceledAt: new Date(),
      plan: 'foundation' // Downgrade to free plan
    });

    // Send confirmation
    const business = await Business.findById(businessId);
    if (business) {
      await this.sendCancellationConfirmation(business.email, billing.plan);
    }

    return canceledSubscription;
  }

  async handleFailedPayment(subscriptionId: string, invoiceId: string): Promise<void> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const businessId = subscription.metadata.businessId;

    if (businessId) {
      const business = await Business.findById(businessId);
      if (business) {
        await this.sendPaymentFailedNotification(business.email, invoiceId);
      }
    }
  }

  async syncSubscriptionUpdate(subscription: any): Promise<void> {
    const businessId = subscription.metadata.businessId;
    if (!businessId) return;

    await this.dataService.updateBilling(businessId, {
      status: subscription.status,
      plan: subscription.metadata.plan,
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date()
    });
  }

  async handleSubscriptionCancellation(subscription: any): Promise<void> {
    const businessId = subscription.metadata.businessId;
    if (!businessId) return;

    await this.dataService.updateBilling(businessId, {
      status: 'canceled',
      canceledAt: new Date(),
      plan: 'foundation'
    });
  }

  async handleSubscriptionCreated(subscription: any): Promise<void> {
    const businessId = subscription.metadata.businessId;
    if (!businessId) return;

    await this.dataService.upsertBilling(businessId, {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      plan: subscription.metadata.plan,
      status: subscription.status,
      createdAt: new Date()
    });
  }

  async checkLoyaltyDiscount(businessId: string): Promise<any> {
    const business = await Business.findById(businessId);
    if (!business) return null;

    const accountAge = Date.now() - business.createdAt.getTime();
    const monthsOld = accountAge / (1000 * 60 * 60 * 24 * 30);

    if (monthsOld >= 12) {
      return {
        type: 'loyalty',
        discount: 10, // 10% discount
        description: 'Loyal customer discount'
      };
    }

    return null;
  }

  // Helper methods
  private getPlanPricing(plan: string): any {
    const pricing = {
      foundation: { stripePriceId: process.env.STRIPE_FOUNDATION_PRICE_ID, amount: 0 },
      growth: { stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID, amount: 2900 },
      premium: { stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID, amount: 9900 },
      enterprise: { stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, amount: 29900 }
    };
    return pricing[plan as keyof typeof pricing];
  }

  private getPlanLimits(plan: string): any {
    const limits = {
      foundation: { apiCalls: 1000, certificates: 10, votes: 100 },
      growth: { apiCalls: 10000, certificates: 100, votes: 1000 },
      premium: { apiCalls: 100000, certificates: 1000, votes: 10000 },
      enterprise: { apiCalls: 1000000, certificates: 10000, votes: 100000 }
    };
    return limits[plan as keyof typeof limits];
  }




  private async getApiUsage(businessId: string, startDate: Date): Promise<any> {
    // TODO: Implement based on your API usage tracking
    return { count: 0 };
  }

  private async getCertificateUsage(businessId: string, startDate: Date): Promise<any> {
    // TODO: Implement based on your certificate usage
    return { count: 0 };
  }

  private async getVotingUsage(businessId: string, startDate: Date): Promise<any> {
    // TODO: Implement based on your voting usage
    return { count: 0 };
  }

  private async getStorageUsage(businessId: string): Promise<number> {
    // TODO: Implement storage usage calculation
    return 0;
  }

  private async getBandwidthUsage(businessId: string): Promise<number> {
    // TODO: Implement bandwidth usage calculation
    return 0;
  }

  private async getDetailedApiUsage(businessId: string, startDate: Date, endDate: Date): Promise<any> {
    // TODO: Implement detailed API usage analytics
    return { total: 0, breakdown: [] };
  }

  private async getDetailedCertificateUsage(businessId: string, startDate: Date, endDate: Date): Promise<any> {
    // TODO: Implement detailed certificate usage analytics
    return { total: 0, breakdown: [] };
  }

  private async getDetailedVotingUsage(businessId: string, startDate: Date, endDate: Date): Promise<any> {
    // TODO: Implement detailed voting usage analytics
    return { total: 0, breakdown: [] };
  }

  private calculateProjectionConfidence(usage30d: any, usage7d: any): number {
    // Simple confidence calculation based on data consistency
    return 0.85; // TODO: Implement proper confidence calculation
  }

  private async getStripeSubscription(businessId: string): Promise<any> {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing?.stripeSubscriptionId) return null;

    try {
      return await this.stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
    } catch (error) {
      logger.warn('Failed to retrieve Stripe subscription:', error);
      return null;
    }
  }

  private async getPaymentMethods(businessId: string): Promise<any[]> {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing?.stripeCustomerId) return [];

    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: billing.stripeCustomerId,
        type: 'card'
      });
      return paymentMethods.data;
    } catch (error) {
      logger.warn('Failed to retrieve payment methods:', error);
      return [];
    }
  }

  private async getRecentInvoices(businessId: string, limit: number = 5): Promise<any[]> {
    const billing = await this.dataService.getBillingByBusinessId(businessId);
    if (!billing?.stripeCustomerId) return [];

    try {
      const invoices = await this.stripe.invoices.list({
        customer: billing.stripeCustomerId,
        limit
      });
      return invoices.data;
    } catch (error) {
      logger.warn('Failed to retrieve invoices:', error);
      return [];
    }
  }

  private async checkTokenDiscounts(businessId: string): Promise<any> {
  try {
    // Get brand settings with Web3 configuration (wallet info is in brandSettings, not business)
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings?.web3Settings?.certificateWallet || !brandSettings.web3Settings.walletVerified) {
      logger.info('No verified wallet found for business ${businessId}:', {
        hasWallet: !!brandSettings?.web3Settings?.certificateWallet,
        isVerified: brandSettings?.web3Settings?.walletVerified || false,
        walletAddress: brandSettings?.web3Settings?.certificateWallet || null
      });
      return null;
    }

    // Check for token-based discounts
    const tokenService = this.tokenDiscountService;
    const discounts = await tokenService.getCouponForWallet(brandSettings.web3Settings.certificateWallet);
    
    // Helper functions to safely extract discount properties
    const getDiscountType = (discountData: any): string => {
      if (!discountData) return 'none';
      if (typeof discountData === 'string') return 'coupon_code';
      if (typeof discountData === 'object') {
        if (discountData.type) return discountData.type;
        if (discountData.discount_type) return discountData.discount_type;
        if (discountData.kind) return discountData.kind;
      }
      if (Array.isArray(discountData) && discountData.length > 0) return 'multiple_discounts';
      return 'unknown_format';
    };

    const getDiscountValue = (discountData: any): number | string => {
      if (!discountData) return 0;
      if (typeof discountData === 'string') return discountData;
      if (typeof discountData === 'object') {
        if (typeof discountData.discount === 'number') return discountData.discount;
        if (typeof discountData.value === 'number') return discountData.value;
        if (typeof discountData.amount === 'number') return discountData.amount;
        if (typeof discountData.percentage === 'number') return discountData.percentage;
      }
      return 'unknown';
    };

    const getDiscountId = (discountData: any): string | null => {
      if (!discountData) return null;
      if (typeof discountData === 'string') return discountData;
      if (typeof discountData === 'object') {
        return discountData.stripeDiscountId || discountData.couponId || discountData.id || null;
      }
      return null;
    };
    
    // Log successful discount check with safe property access
    if (discounts) {
      logger.info('Token discounts found for business ${businessId}:', {
        walletAddress: brandSettings.web3Settings.certificateWallet,
        discountType: getDiscountType(discounts),
        discountValue: getDiscountValue(discounts),
        discountId: getDiscountId(discounts),
        verifiedAt: brandSettings.web3Settings.walletVerifiedAt,
        // Include raw data for debugging
        rawDiscountData: discounts,
        dataType: typeof discounts,
        isArray: Array.isArray(discounts),
        objectKeys: typeof discounts === 'object' && discounts !== null ? Object.keys(discounts) : null
      });
    } else {
      logger.info('No token discounts available for business ${businessId} with wallet ${brandSettings.web3Settings.certificateWallet}');
    }
    
    return discounts;
  } catch (error) {
    logger.warn('Token discount check failed for business ${businessId}:', error);
    return null;
  }
}

private calculatePotentialSavings(plan: string, tokenDiscount: any): any {
  if (!tokenDiscount) {
    return { monthlySavings: 0, annualSavings: 0, currency: 'usd' };
  }

  const planPricing = this.planUtils.getPlanPricing(plan);
  if (!planPricing) {
    logger.warn('No pricing found for plan: ${plan}');
    return { monthlySavings: 0, annualSavings: 0, currency: 'usd' };
  }

  const monthlyPrice = planPricing.amount / 100; // Convert from cents
  let discountAmount = 0;

  if (tokenDiscount.type === 'percentage') {
    discountAmount = monthlyPrice * (tokenDiscount.discount / 100);
  } else if (tokenDiscount.type === 'fixed_amount') {
    discountAmount = tokenDiscount.discount / 100; // Convert from cents
  } else {
    logger.warn('Unknown discount type: ${tokenDiscount.type}');
  }

  const savings = {
    monthlySavings: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    annualSavings: Math.round(discountAmount * 12 * 100) / 100,
    currency: 'usd',
    discountType: tokenDiscount.type,
    discountValue: tokenDiscount.discount,
    // Additional context
    originalMonthlyPrice: monthlyPrice,
    discountedMonthlyPrice: monthlyPrice - discountAmount,
    savingsPercentage: monthlyPrice > 0 ? Math.round((discountAmount / monthlyPrice) * 100) : 0
  };

  logger.info('Calculated potential savings for plan ${plan}:', savings);
  
  return savings;
}

  private async applyTokenDiscountToSubscription(subscriptionId: string, tokenDiscount: any): Promise<void> {
    try {
      if (!tokenDiscount.stripeDiscountId) return;

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      await this.stripe.customers.update(subscription.customer as string, {
      coupon: tokenDiscount.stripeDiscountId // Apply to customer, affects all subscriptions
    });

      logger.info('Applied token discount to subscription: ${subscriptionId}');
    } catch (error) {
      logger.error('Failed to apply token discount:', error);
      // Don't throw - renewal should continue even if discount fails
    }
  }

  private async scheduleLoyaltyDiscount(businessId: string, loyaltyDiscount: any): Promise<void> {
    try {
      // Store loyalty discount for next renewal
      await this.dataService.updateBilling(businessId, {
        loyaltyDiscount: loyaltyDiscount,
        loyaltyDiscountScheduled: true
      });

      logger.info('Loyalty discount scheduled for business: ${businessId}');
    } catch (error) {
      logger.error('Failed to schedule loyalty discount:', error);
    }
  }

  private async sendPlanChangeNotification(email: string, fromPlan: string, toPlan: string): Promise<void> {
    try {
      await this.notificationsService.sendSubscriptionPlanChangedNotification(email, fromPlan, toPlan);
    } catch (error) {
      logger.error('Failed to send plan change notification:', error);
    }
  }

  private async sendRenewalConfirmation(email: string, plan: string, amount: number): Promise<void> {
    try {
      await this.notificationsService.sendRenewalConfirmation(email, plan, amount);
    } catch (error) {
      logger.error('Failed to send renewal confirmation:', error);
    }
  }

  private async sendCancellationConfirmation(email: string, plan: string): Promise<void> {
    try {
      await this.notificationsService.sendCancellationConfirmation(email, plan);
    } catch (error) {
      logger.error('Failed to send cancellation confirmation:', error);
    }
  }

  private async sendPaymentFailedNotification(email: string, invoiceId: string): Promise<void> {
    try {
      await this.notificationsService.sendPaymentFailedNotification(
        email, // recipientId
        'business', // recipientType
        invoiceId, // invoiceId
        0, // amount (placeholder)
        'USD', // currency (placeholder)
        'Payment failed' // errorMessage
      );
    } catch (error) {
      logger.error('Failed to send payment failed notification:', error);
    }
  }

  // ===== Controller-extracted helper functions =====

  public getPlanLevel(plan: PlanKey): number {
    return this.planUtils.getPlanLevel(plan);
  }

  public formatPlanName(plan: string): string {
    return this.planUtils.formatPlanName(plan);
  }

  public getPlanLimitsPublic(plan: PlanKey) {
    return this.planUtils.getPublicPlanLimits(plan);
  }

  public getPlanApiKeyLimit(plan: PlanKey): number {
    return this.planUtils.getPlanApiKeyLimit(plan);
  }

  public getPlanStorageLimit(plan: PlanKey): number {
    return this.planUtils.getPlanStorageLimit(plan);
  }

  public calculateUtilization(usage: any, plan: PlanKey): any {
    return this.planUtils.calculateUtilization(usage, plan);
  }

  public calculateOverage(usage: any, limits: any): any {
    return this.planUtils.calculateOverage(usage, limits);
  }

  public getPlanFeatures(plan: PlanKey): string[] {
    return this.planUtils.getPlanFeatures(plan);
  }

  public getAddonPrice(addon: string): number {
    return this.planUtils.getAddonPrice(addon);
  }
  public generateUsageRecommendations(usage: any, limits: any, projections: any): string[] {
    const recommendations = [];
    
    if (projections.votesNextMonth > limits.votes) {
      recommendations.push('Projected to exceed vote limits next month');
    }
    
    if (usage.storage > limits.storage * 0.9) {
      recommendations.push('Storage usage is high - consider upgrading');
    }
    
    return recommendations;
  }

  public async calculatePricingSummary(plan: PlanKey, couponCode?: string, addons: string[] = []): Promise<any> {
    const basePlan = PLAN_DEFINITIONS[plan];
    
    // Ensure price is always a number
    let total = Number(basePlan.price) || 0;

    // Add addon pricing
    const addonPricing = addons.reduce((sum, addon) => {
      return sum + this.planUtils.getAddonPrice(addon);
    }, 0);

    total += addonPricing;

    // Apply coupon discount
    let discount = 0;
    if (couponCode) {
      discount = await this.calculateCouponDiscount(couponCode, total);
    }

    return {
      basePrice: Number(basePlan.price) || 0,
      addons: addonPricing,
      subtotal: total,
      discount,
      total: total - discount,
      currency: 'USD'
    };
  }

  public async calculateCouponDiscount(couponCode: string, amount: number): Promise<number> {
    try {
      const coupon = await this.stripe.coupons.retrieve(couponCode);
      if (coupon.percent_off) {
        return (amount * coupon.percent_off) / 100;
      }
      if (coupon.amount_off) {
        return coupon.amount_off / 100; // Convert cents to dollars
      }
    } catch (error) {
      logger.warn('Invalid coupon code:', { couponCode: couponCode });  
    }
    return 0;
  }
}


export const billingManagementService = new BillingManagementService();




