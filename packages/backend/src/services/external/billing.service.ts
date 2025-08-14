
import { BrandSettings } from '../../models/brandSettings.model';
import { StripeService } from './stripe.service';
import { TokenDiscountService } from './tokenDiscount.service';
import { PlanKey } from '../../constants/plans';

export class BillingService {
  private stripe: Stripe;
  private notificationsService: NotificationsService;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.notificationsService = new NotificationsService();
  }

  async createCheckoutSession(config: any): Promise<any> {
    // Implementation from previous response
    const { businessId, plan, couponCode, addons = [], metadata = {} } = config;

    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const planPricing = await this.getPlanPricing(plan);
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
    const billing = await this.getCurrentBilling(businessId);
    if (!billing) {
      return null;
    }

    // Get Stripe subscription if exists
    let stripeSubscription = null;
    if (billing.stripeSubscriptionId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
      } catch (error) {
        console.warn('Failed to retrieve Stripe subscription:', error);
      }
    }

    // Get Stripe customer if exists
    let stripeCustomer = null;
    if (billing.stripeCustomerId) {
      try {
        stripeCustomer = await this.stripe.customers.retrieve(billing.stripeCustomerId);
      } catch (error) {
        console.warn('Failed to retrieve Stripe customer:', error);
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
    console.error('Failed to get billing info:', error);
    throw error;
  }
}

async removeTokenDiscounts(businessId: string): Promise<any> {
  try {
    const billing = await this.getBillingInfo(businessId);
    if (!billing || !billing.stripeSubscriptionId) {
      return { message: 'No active subscription found' };
    }

    // Remove discounts from Stripe subscription
    if (billing.status === 'active') {
      await this.stripe.subscriptions.update(billing.stripeSubscriptionId, {
        discounts: []
      });
    }

    // Update local billing record
    await this.updateLocalBilling(businessId, {
      tokenDiscounts: null,
      activeDiscountApplied: false,
      tokenDiscountsUpdatedAt: new Date(),
      discountRemovedAt: new Date()
    });

    console.log(`Token discounts removed for business ${businessId}`);

    return {
      success: true,
      message: 'Token discounts removed successfully',
      subscriptionUpdated: billing.status === 'active'
    };
  } catch (error) {
    console.error('Error removing token discounts:', error);
    throw { 
      statusCode: 500, 
      message: 'Failed to remove token discounts' 
    };
  }
}

 // In your BillingService class - update the method signature and implementation

async validateDowngrade(fromPlan: string, toPlan: string, businessId: string): Promise<{
  allowed: boolean;
  issues?: string[];
  recommendations?: string[];
}> {
  try {
    // Check if downgrade is allowed based on current usage
    const currentUsage = await this.getCurrentUsage(businessId);
    const newPlanLimits = this.getPlanLimits(toPlan);
    
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate against limits
    if (currentUsage.apiCalls > newPlanLimits.apiCalls) {
      issues.push(`Current API usage (${currentUsage.apiCalls}) exceeds ${toPlan} plan limit (${newPlanLimits.apiCalls})`);
      recommendations.push(`Reduce API usage to under ${newPlanLimits.apiCalls} calls per month`);
    }

    if (currentUsage.certificates > newPlanLimits.certificates) {
      issues.push(`Current certificate usage (${currentUsage.certificates}) exceeds ${toPlan} plan limit (${newPlanLimits.certificates})`);
      recommendations.push(`Archive or delete certificates to get under ${newPlanLimits.certificates} certificates`);
    }

    if (currentUsage.votes > newPlanLimits.votes) {
      issues.push(`Current voting usage (${currentUsage.votes}) exceeds ${toPlan} plan limit (${newPlanLimits.votes})`);
      recommendations.push(`Voting history will be preserved, but future voting will be limited to ${newPlanLimits.votes} per month`);
    }

    // Return the proper object structure
    return {
      allowed: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };

  } catch (error) {
    console.error('Error validating downgrade:', error);
    
    // Return error state with proper structure
    return {
      allowed: false,
      issues: ['Unable to validate current usage'],
      recommendations: ['Please try again later or contact support']
    };
  }
}

/**
 * Update token discounts for billing - called from brand account service
 * This method updates billing-related token discounts and applies them to active subscriptions
 */
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

    // Get business and wallet information
    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    // Use provided wallet or get from business web3 settings
    const targetWallet = walletAddress || business.web3Settings?.certificateWallet;
    
    if (!targetWallet || !business.web3Settings?.walletVerified) {
      return { 
        hasDiscounts: false, 
        message: 'No verified wallet found',
        billingId: billing.id
      };
    }

    // Check for token-based billing discounts
    const tokenService = new TokenDiscountService();
    const tokenDiscounts = await tokenService.getCouponForWallet(targetWallet);

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
        console.warn('Failed to apply token discount to subscription:', discountError);
        discountUpdates.discountApplicationError = discountError instanceof Error ? discountError.message : 'Unknown error';
      }
    }

    // Update the billing record
    await this.updateLocalBilling(businessId, discountUpdates);

    // Calculate potential savings
    const potentialSavings = this.calculatePotentialSavings(billing.plan, tokenDiscounts);

    const result = {
      hasDiscounts: !!tokenDiscounts,
      discounts: tokenDiscounts || null,
      walletAddress: targetWallet,
      billingId: billing.id,
      subscriptionUpdated,
      potentialSavings,
      lastUpdated: new Date(),
      message: tokenDiscounts 
        ? `Token discounts applied${subscriptionUpdated ? ' to active subscription' : ''}` 
        : 'No token discounts available'
    };

    // Log the update
    console.log(`Billing token discounts updated for business ${businessId}:`, {
      hasDiscounts: result.hasDiscounts,
      subscriptionUpdated,
      discountType: tokenDiscounts?.type || 'none'
    });

    return result;
  } catch (error) {
    console.error('Error updating billing token discounts:', error);
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
    const currentBilling = await this.getCurrentBilling(businessId);
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
          price: this.getPlanPricing(newPlan).stripePriceId
        }],
        proration_behavior: 'always_invoice'
      }
    );

    // Update local billing record
    await this.updateLocalBilling(businessId, {
      plan: newPlan,
      updatedAt: new Date()
    });

    // Send notification
    await this.sendPlanChangeNotification(business.email, currentBilling.plan, newPlan);

    return subscription;
  }

  async processRenewal(subscriptionId: string): Promise<any> {
  try {
    console.log(`Processing renewal for subscription: ${subscriptionId}`);

    // Get subscription details from Stripe
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const businessId = subscription.metadata.businessId;

    if (!businessId) {
      throw new Error('Business ID not found in subscription metadata');
    }

    // Get business and billing info
    const [business, billing] = await Promise.all([
      Business.findById(businessId),
      this.getCurrentBilling(businessId)
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
    await this.updateLocalBilling(businessId, {
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
    console.log(`Renewal processed successfully for business: ${businessId}`);

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
    console.error('Renewal processing failed:', {
      subscriptionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

  async getComprehensiveBillingInfo(businessId: string): Promise<any> {
    const [billing, usage, subscription] = await Promise.all([
      this.getCurrentBilling(businessId),
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
      confidence: this.calculateProjectionConfidence(usage30d, usage7d)
    };
  }

  async updatePaymentMethod(businessId: string, paymentMethodId: string): Promise<any> {
    const billing = await this.getCurrentBilling(businessId);
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
    const billing = await this.getCurrentBilling(businessId);
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
    await this.updateLocalBilling(businessId, {
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

    await this.updateLocalBilling(businessId, {
      status: subscription.status,
      plan: subscription.metadata.plan,
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date()
    });
  }

  async handleSubscriptionCancellation(subscription: any): Promise<void> {
    const businessId = subscription.metadata.businessId;
    if (!businessId) return;

    await this.updateLocalBilling(businessId, {
      status: 'canceled',
      canceledAt: new Date(),
      plan: 'foundation'
    });
  }

  async handleSubscriptionCreated(subscription: any): Promise<void> {
    const businessId = subscription.metadata.businessId;
    if (!businessId) return;

    await this.createOrUpdateBilling(businessId, {
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

  private async getCurrentBilling(businessId: string): Promise<any> {
    // Implement based on your billing model
    return await Billing.findOne({ business: businessId });
  }

  private async updateLocalBilling(businessId: string, updates: any): Promise<void> {
    await Billing.updateOne({ business: businessId }, updates);
  }

  private async getApiUsage(businessId: string, startDate: Date): Promise<any> {
    // Implement based on your API usage tracking
    return { count: 0 };
  }

  private async getCertificateUsage(businessId: string, startDate: Date): Promise<any> {
    // Implement based on your certificate usage
    return { count: 0 };
  }

  private async getVotingUsage(businessId: string, startDate: Date): Promise<any> {
    // Implement based on your voting usage
    return { count: 0 };
  }

  private async checkTokenDiscounts(businessId: string): Promise<any> {
  try {
    // Get business with Web3 settings
    const business = await Business.findById(businessId);
    if (!business?.web3Settings?.certificateWallet || !business.web3Settings.walletVerified) {
      return null;
    }

    // Check for token-based discounts
    const tokenService = new TokenDiscountService();
    return await tokenService.getCouponForWallet(business.web3Settings.certificateWallet);
  } catch (error) {
    console.warn('Token discount check failed:', error);
    return null;
  }
}

private calculatePotentialSavings(plan: string, tokenDiscount: any): any {
  if (!tokenDiscount) {
    return { monthlySavings: 0, annualSavings: 0, currency: 'usd' };
  }

  const planPricing = this.getPlanPricing(plan);
  if (!planPricing) {
    return { monthlySavings: 0, annualSavings: 0, currency: 'usd' };
  }

  const monthlyPrice = planPricing.amount / 100; // Convert from cents
  let discountAmount = 0;

  if (tokenDiscount.type === 'percentage') {
    discountAmount = monthlyPrice * (tokenDiscount.discount / 100);
  } else if (tokenDiscount.type === 'fixed_amount') {
    discountAmount = tokenDiscount.discount / 100; // Convert from cents
  }

  return {
    monthlySavings: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    annualSavings: Math.round(discountAmount * 12 * 100) / 100,
    currency: 'usd',
    discountType: tokenDiscount.type,
    discountValue: tokenDiscount.discount
  };
}


private async applyTokenDiscountToSubscription(subscriptionId: string, tokenDiscount: any): Promise<void> {
  try {
    if (!tokenDiscount.stripeDiscountId) return;

    await this.stripe.subscriptions.update(subscriptionId, {
      discounts: [{
        coupon: tokenDiscount.stripeDiscountId
      }]
    });

    console.log(`Applied token discount to subscription: ${subscriptionId}`);
  } catch (error) {
    console.error('Failed to apply token discount:', error);
    // Don't throw - renewal should continue even if discount fails
  }
}

private async scheduleLoyaltyDiscount(businessId: string, loyaltyDiscount: any): Promise<void> {
  try {
    // Store loyalty discount for next renewal
    await this.updateLocalBilling(businessId, {
      loyaltyDiscount: loyaltyDiscount,
      loyaltyDiscountScheduled: true
    });

    console.log(`Loyalty discount scheduled for business: ${businessId}`);
  } catch (error) {
    console.error('Failed to schedule loyalty discount:', error);
  }
}
}