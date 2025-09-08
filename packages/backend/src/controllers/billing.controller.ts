// src/controllers/billing.controller.ts
import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { BillingService } from '../services/external/billing.service';
import { NotificationsService } from '../services/external/notifications.service';
import { StripeService } from '../services/external/stripe.service';
import { TokenDiscountService } from '../services/external/tokenDiscount.service';
import { PLAN_DEFINITIONS, PlanKey } from '../constants/plans';
import { clearPlanCache } from '../middleware/rateLimiter.middleware';
import { Billing } from '../models/billing.model';

// Enhanced request interfaces
interface BillingRequest extends Request, AuthRequest, TenantRequest, ValidatedRequest {
  body: {
    plan?: PlanKey;
    paymentMethodId?: string;
    billingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    taxId?: string;
    couponCode?: string;
    addons?: string[];
  };
}

interface WebhookRequest extends Request {
  body: Buffer;
  headers: {
    'stripe-signature': string;
  };
}

// Initialize services
const billingService = new BillingService();
const notificationsService = new NotificationsService();
const stripeService = new StripeService();
const tokenDiscountService = new TokenDiscountService();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15'
});
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Type guard for plan validation
function isPlanKey(x: unknown): x is PlanKey {
  return typeof x === 'string' && x in PLAN_DEFINITIONS;
}

/**
 * POST /api/billing/checkout-session
 * Create an enhanced Stripe Checkout Session with comprehensive features
 */
export async function createCheckoutSession(
  req: BillingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { plan, couponCode, addons = [] } = req.validatedBody || req.body;

    if (!isPlanKey(plan)) {
       res.status(400).json({ 
        error: 'Invalid subscription plan',
        availablePlans: Object.keys(PLAN_DEFINITIONS),
        code: 'INVALID_PLAN'
      })
      return;
    }

    // Get current subscription info
    const currentBilling = await billingService.getBillingInfo(businessId).catch(() => null);
    const isUpgrade = currentBilling && getPlanLevel(plan) > getPlanLevel(currentBilling.plan);
    const isDowngrade = currentBilling && getPlanLevel(plan) < getPlanLevel(currentBilling.plan);

    // Check for Web3 token discounts
   let tokenDiscount = null;
if (req.tenant?.web3Settings?.certificateWallet) {
  tokenDiscount = await tokenDiscountService.getCouponForWallet(
    req.tenant.web3Settings.certificateWallet
  );
}

    // Prepare checkout session configuration
    const sessionConfig = {
  businessId,
  plan,
  couponCode: tokenDiscount || couponCode,
  addons,
  isUpgrade,
  isDowngrade,
  metadata: {
    businessId,
    plan,
    upgradeFrom: currentBilling?.plan,
    walletAddress: req.tenant?.web3Settings?.certificateWallet
  }
};

    // Create or update subscription and get checkout session
    const checkoutSession = await billingService.createCheckoutSession(sessionConfig);

    // Track billing action
    trackManufacturerAction(isUpgrade ? 'upgrade_plan' : 'create_subscription');

    // Calculate pricing summary
    const pricingSummary = await calculatePricingSummary(plan, couponCode, addons);

    res.json({
      sessionId: checkoutSession.id,
      sessionUrl: checkoutSession.url,
      planDetails: {
        selectedPlan: plan,
        planFeatures: PLAN_DEFINITIONS[plan],
        isUpgrade,
        isDowngrade,
        upgradeFrom: currentBilling?.plan
      },
      pricing: pricingSummary,
      discounts: {
        tokenDiscount: tokenDiscount ? 'Applied Web3 discount' : null,
        couponCode: couponCode || null
      },
      nextSteps: [
        'Complete payment in Stripe Checkout',
        'Account will be upgraded immediately',
        'New features will be available instantly'
      ]
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    next(error);
  }
}

/**
 * PUT /api/billing/plan
 * Change subscription plan with enhanced validation and features
 */
export async function changePlan(
  req: BillingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { plan } = req.validatedBody || req.body;

    if (!isPlanKey(plan)) {
       res.status(400).json({ 
        error: 'Invalid subscription plan',
        code: 'INVALID_PLAN'
      })
      return;
    }

    // Get current billing information
    const currentBilling = await billingService.getBillingInfo(businessId);
    const currentPlan = currentBilling.plan;

    // Prevent unnecessary changes
    if (currentPlan === plan) {
       res.status(400).json({
        error: 'Already subscribed to this plan',
        currentPlan,
        code: 'SAME_PLAN'
      })
      return;
    }

    // Fix the method call to pass all required arguments
const isDowngrade = getPlanLevel(plan) < getPlanLevel(currentPlan);
if (isDowngrade) {
  // Check if downgrade is allowed based on current usage
  const usageCheck = await billingService.validateDowngrade(currentPlan, plan, businessId);
  if (!usageCheck.allowed) {
    res.status(400).json({
      error: 'Cannot downgrade due to current usage',
      issues: usageCheck.issues,
      recommendations: usageCheck.recommendations,
      code: 'DOWNGRADE_BLOCKED'
    });
    return;
  }
}

    // Process plan change
    const result = await billingService.changePlan(businessId, plan, {
      changeReason: isDowngrade ? 'downgrade' : 'upgrade',
      previousPlan: currentPlan,
      effectiveDate: new Date()
    });

    // Clear plan cache to ensure immediate effect
    clearPlanCache(businessId);

    // Track plan change
    trackManufacturerAction(isDowngrade ? 'downgrade_plan' : 'upgrade_plan');

    // Send notification email
    await notificationsService.sendPlanChangeNotification(
      businessId,
      currentPlan,
      plan,
      isDowngrade ? 'downgrade' : 'upgrade'
    );

    // Log plan change for analytics
    console.log(`Plan changed: ${businessId} from ${currentPlan} to ${plan}`);

    res.json({
      success: true,
      subscription: result.subscription,
      planChange: {
        from: currentPlan,
        to: plan,
        type: isDowngrade ? 'downgrade' : 'upgrade',
        effectiveDate: result.effectiveDate,
        prorationAmount: result.prorationAmount
      },
      newFeatures: getPlanFeatures(plan),
      message: `Successfully ${isDowngrade ? 'downgraded' : 'upgraded'} to ${plan} plan`
    });
  } catch (error) {
    console.error('Plan change error:', error);
    next(error);
  }
}

/**
 * GET /api/billing/plan
 * Get comprehensive billing and subscription information
 */
export async function getPlan(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;

    // Get comprehensive billing information
    const billingInfo = await billingService.getComprehensiveBillingInfo(businessId);
    
    // Get usage statistics
    const usageStats = await billingService.getCurrentUsage(businessId);
    
    // Get available plans and features
    const availablePlans = Object.entries(PLAN_DEFINITIONS).map(([key, def]) => ({
      id: key,
      name: formatPlanName(key),
      features: def,
      currentPlan: key === billingInfo.plan,
      canUpgradeTo: getPlanLevel(key as PlanKey) > getPlanLevel(billingInfo.plan),
      canDowngradeTo: getPlanLevel(key as PlanKey) < getPlanLevel(billingInfo.plan)
    }));

    // Check for available discounts
    const availableDiscounts = await getAvailableDiscounts(businessId, req.tenant);

    res.json({
       currentPlan: {
    id: billingInfo.plan,
    name: formatPlanName(billingInfo.plan),
    features: PLAN_DEFINITIONS[billingInfo.plan as keyof typeof PLAN_DEFINITIONS] || PLAN_DEFINITIONS.foundation,
    subscriptionStatus: billingInfo.subscriptionStatus,
    currentPeriodEnd: billingInfo.currentPeriodEnd,
    cancelAtPeriodEnd: billingInfo.cancelAtPeriodEnd
  },
      usage: {
        current: usageStats,
        limits: getPlanLimits(billingInfo.plan),
        utilizationPercentage: calculateUtilization(usageStats, billingInfo.plan)
      },
      billing: {
        customerId: billingInfo.stripeCustomerId,
        paymentMethod: billingInfo.paymentMethod,
        billingEmail: billingInfo.billingEmail,
        nextInvoiceDate: billingInfo.nextInvoiceDate,
        nextInvoiceAmount: billingInfo.nextInvoiceAmount
      },
      availablePlans,
      discounts: availableDiscounts,
      recommendations: generatePlanRecommendations(usageStats, billingInfo.plan)
    });
  } catch (error) {
    console.error('Get plan error:', error);
    next(error);
  }
}

/**
 * GET /api/billing/usage
 * Get detailed usage statistics and billing analytics
 */
export async function getUsageStats(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { period = '30d' } = req.query;

    // Get detailed usage analytics
    const usage = await billingService.getDetailedUsage(businessId, period as string);
    const currentPlan = req.tenant?.plan || 'foundation';
    const planLimits = getPlanLimits(currentPlan);

    // Calculate projections
    const projections = await billingService.calculateUsageProjections(businessId);

    res.json({
      period,
      currentUsage: usage,
      limits: planLimits,
      utilization: calculateUtilization(usage, currentPlan),
      projections,
      overage: calculateOverage(usage, planLimits),
      recommendations: generateUsageRecommendations(usage, planLimits, projections)
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    next(error);
  }
}

/**
 * POST /api/billing/payment-method
 * Add or update payment method with enhanced security
 */
export async function updatePaymentMethod(
  req: BillingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { paymentMethodId, billingAddress } = req.validatedBody || req.body;

    if (!paymentMethodId) {
       res.status(400).json({
        error: 'Payment method ID is required',
        code: 'MISSING_PAYMENT_METHOD'
      })
      return;
    }

    // Update payment method with billing address
    // Current method signature: updatePaymentMethod(businessId: string, paymentMethodId: string)
const result = await billingService.updatePaymentMethod(businessId, paymentMethodId);

    // Track payment method update
    trackManufacturerAction('update_payment_method');

    res.json({
      success: true,
      paymentMethod: result.paymentMethod,
      message: 'Payment method updated successfully'
    });
  } catch (error) {
    console.error('Payment method update error:', error);
    next(error);
  }
}

/**
 * POST /api/billing/cancel
 * Cancel subscription with feedback collection
 */
export async function cancelSubscription(
  req: BillingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { reason, feedback, cancelImmediately = false } = req.validatedBody || req.body;

    // Process cancellation
    const result = await billingService.cancelSubscription(businessId, {
      reason,
      feedback,
      cancelImmediately,
      canceledBy: businessId
    });

    // Track cancellation
    trackManufacturerAction('cancel_subscription');

    // Send cancellation confirmation
    await notificationsService.sendCancellationConfirmation(businessId, result);

    res.json({
      success: true,
      cancellation: result,
      message: cancelImmediately ? 
        'Subscription canceled immediately' : 
        'Subscription will be canceled at the end of the current period'
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    next(error);
  }
}

/**
 * POST /api/billing/webhook
 * Enhanced Stripe webhook handler with comprehensive event processing
 */
export async function handleStripeWebhook(
  req: WebhookRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
     res.status(400).json({ 
      error: `Webhook Error: ${error.message}`,
      code: 'WEBHOOK_VERIFICATION_FAILED'
    })
    return;
  }

  try {
    // Enhanced webhook event processing
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    // Log webhook processing
    console.log(`Webhook processed: ${event.type} - ${event.id}`);

    res.json({ 
      received: true,
      eventType: event.type,
      eventId: event.id,
      processed: true
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      eventType: event.type,
      eventId: event.id
    });
  }
}

// Enhanced webhook event handlers
async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  try {
    const subscriptionId = invoice.subscription!.toString();
    const businessId = invoice.metadata?.businessId;
    
    if (!businessId) {
      console.error('No businessId found in invoice metadata:', invoice.id);
      return;
    }

    // Update billing record with successful payment
    await Billing.findOneAndUpdate(
      { business: businessId },
      {
        $set: {
          status: 'active',
          lastPaymentDate: new Date(),
          lastPaymentAmount: invoice.amount_paid / 100, // Convert from cents
          consecutivePayments: { $inc: 1 },
          missedPayments: 0
        }
      }
    );
    
    if (invoice.billing_reason === 'subscription_cycle') {
      // Process renewal with token discount re-evaluation
      await billingService.processRenewal(subscriptionId);
      
      // Send renewal notification
      await notificationsService.sendRenewalConfirmation(subscriptionId);
    }
    
    // Clear any cached billing info
    const customer = await stripe.customers.retrieve(invoice.customer as string);
    if (customer && !customer.deleted) {
      // Clear plan cache for immediate effect
      clearPlanCache(businessId);
    }

    console.log(`Payment succeeded for business ${businessId}, subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling payment succeeded webhook:', error);
    throw error; // Re-throw to trigger webhook retry
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription!.toString();
  
  // Handle failed payment
  await billingService.handleFailedPayment(subscriptionId, invoice.id);
  
  // Send payment failed notification
  await notificationsService.sendPaymentFailedNotification(subscriptionId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  await billingService.syncSubscriptionUpdate(subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  await billingService.handleSubscriptionCancellation(subscription.id);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  await billingService.handleSubscriptionCreated(subscription);
}

// Helper functions
function getPlanLevel(plan: PlanKey): number {
  const levels = { foundation: 1, growth: 2, premium: 3, enterprise: 4 };
  return levels[plan] || 0;
}

function formatPlanName(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function getPlanLimits(plan: PlanKey) {
  return {
    votes: PLAN_DEFINITIONS[plan].votes,
    certificates: PLAN_DEFINITIONS[plan].certificates,
    apiKeys: getPlanApiKeyLimit(plan),
    storage: getPlanStorageLimit(plan)
  };
}

function getPlanApiKeyLimit(plan: PlanKey): number {
  const limits = { foundation: 2, growth: 5, premium: 15, enterprise: 50 };
  return limits[plan] || 1;
}

function getPlanStorageLimit(plan: PlanKey): number {
  const limits = { foundation: 1, growth: 5, premium: 25, enterprise: 100 }; // GB
  return limits[plan] || 0.5;
}

function calculateUtilization(usage: any, plan: PlanKey): any {
  const limits = getPlanLimits(plan);
  return {
    votes: limits.votes === Infinity ? 0 : (usage.votes / limits.votes) * 100,
    certificates: limits.certificates === Infinity ? 0 : (usage.certificates / limits.certificates) * 100,
    storage: (usage.storage / (limits.storage * 1024 * 1024 * 1024)) * 100 // Convert GB to bytes
  };
}

function calculateOverage(usage: any, limits: any): any {
  return {
    votes: Math.max(0, usage.votes - limits.votes),
    certificates: Math.max(0, usage.certificates - limits.certificates),
    storage: Math.max(0, usage.storage - (limits.storage * 1024 * 1024 * 1024))
  };
}

function getPlanFeatures(plan: PlanKey): string[] {
  const features = {
    foundation: ['Basic Analytics', 'Email Support', '2 API Keys'],
    growth: ['Advanced Analytics', 'Priority Support', '5 API Keys', 'Integrations'],
    premium: ['Custom Reports', 'Phone Support', '15 API Keys', 'Advanced Integrations', 'NFT Features'],
    enterprise: ['White-label', 'Dedicated Support', 'Unlimited API Keys', 'Custom Features', 'SLA']
  };
  return features[plan] || [];
}

async function getAvailableDiscounts(businessId: string, tenant: any): Promise<any[]> {
  const discounts = [];
  
  // Check for Web3 token discounts
  if (tenant?.certificateWallet) {
    const tokenDiscount = await tokenDiscountService.getCouponForWallet(tenant.certificateWallet);
    if (tokenDiscount) {
      discounts.push({
        type: 'web3_token',
        description: 'NFT Holder Discount',
        discount: '10%'
      });
    }
  }
  
  // Check for loyalty discounts
  const loyaltyDiscount = await billingService.checkLoyaltyDiscount(businessId);
  if (loyaltyDiscount) {
    discounts.push(loyaltyDiscount);
  }
  
  return discounts;
}

function generatePlanRecommendations(usage: any, currentPlan: PlanKey): string[] {
  const recommendations = [];
  const utilization = calculateUtilization(usage, currentPlan);
  
  if (utilization.votes > 80) {
    recommendations.push('Consider upgrading to avoid hitting vote limits');
  }
  
  if (utilization.certificates > 80) {
    recommendations.push('Certificate usage is high - upgrade for more capacity');
  }
  
  if (currentPlan === 'foundation' && usage.apiCalls > 50) {
    recommendations.push('Upgrade to Growth plan for better API limits');
  }
  
  return recommendations;
}

function generateUsageRecommendations(usage: any, limits: any, projections: any): string[] {
  const recommendations = [];
  
  if (projections.votesNextMonth > limits.votes) {
    recommendations.push('Projected to exceed vote limits next month');
  }
  
  if (usage.storage > limits.storage * 0.9) {
    recommendations.push('Storage usage is high - consider upgrading');
  }
  
  return recommendations;
}

async function calculatePricingSummary(plan: PlanKey, couponCode?: string, addons: string[] = []): Promise<any> {
  const basePlan = PLAN_DEFINITIONS[plan];
  
  // Ensure price is always a number
  let total = Number(basePlan.price) || 0;

  // Add addon pricing
  const addonPricing = addons.reduce((sum, addon) => {
    return sum + getAddonPrice(addon);
  }, 0);

  total += addonPricing;

  // Apply coupon discount
  let discount = 0;
  if (couponCode) {
    discount = await calculateCouponDiscount(couponCode, total);
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

function getAddonPrice(addon: string): number {
  const addonPrices: Record<string, number> = {
    'extra_storage': 5,
    'priority_support': 15,
    'custom_domain': 10,
    'advanced_analytics': 20
  };
  return addonPrices[addon] || 0;
}

async function calculateCouponDiscount(couponCode: string, amount: number): Promise<number> {
  try {
    const coupon = await stripe.coupons.retrieve(couponCode);
    if (coupon.percent_off) {
      return (amount * coupon.percent_off) / 100;
    }
    if (coupon.amount_off) {
      return coupon.amount_off / 100; // Convert cents to dollars
    }
  } catch (error) {
    console.warn('Invalid coupon code:', couponCode);
  }
  return 0;
}



