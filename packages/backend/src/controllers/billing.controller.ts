// src/controllers/billing.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import Stripe from 'stripe';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { getBillingService, getNotificationsService, getStripeService, getTokenDiscountService } from '../services/container.service';
import { PLAN_DEFINITIONS, PlanKey } from '../constants/plans';
import { clearPlanCache } from '../middleware/rateLimiter.middleware';
import { Billing } from '../models/billing.model';

// Enhanced request interfaces
interface BillingRequest extends Request, UnifiedAuthRequest, TenantRequest, ValidatedRequest {
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

// Services are now injected via container

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
    const billingService = getBillingService();
    const currentBilling = await billingService.getBillingInfo(businessId).catch(() => null);
    const isUpgrade = currentBilling && billingService.getPlanLevel(plan) > billingService.getPlanLevel(currentBilling.plan);
    const isDowngrade = currentBilling && billingService.getPlanLevel(plan) < billingService.getPlanLevel(currentBilling.plan);

    // Check for Web3 token discounts
   let tokenDiscount = null;
if (req.tenant?.web3Settings?.certificateWallet) {
  tokenDiscount = await getTokenDiscountService().getCouponForWallet(
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
    const pricingSummary = await billingService.calculatePricingSummary(plan, couponCode, addons);

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
    logger.error('Checkout session creation error:', error);
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
    const billingService = getBillingService();
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
const isDowngrade = billingService.getPlanLevel(plan) < billingService.getPlanLevel(currentPlan);
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
    await getNotificationsService().sendPlanChangeNotification(
      businessId,
      currentPlan,
      plan,
      isDowngrade ? 'downgrade' : 'upgrade'
    );

    // Log plan change for analytics
    logger.info('Plan changed: ${businessId} from ${currentPlan} to ${plan}');

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
      newFeatures: billingService.getPlanFeatures(plan),
      message: `Successfully ${isDowngrade ? 'downgraded' : 'upgraded'} to ${plan} plan`
    });
  } catch (error) {
    logger.error('Plan change error:', error);
    next(error);
  }
}

/**
 * GET /api/billing/plan
 * Get comprehensive billing and subscription information
 */
export async function getPlan(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;

    // Get comprehensive billing information
    const billingService = getBillingService();
    const billingInfo = await billingService.getComprehensiveBillingInfo(businessId);
    
    // Get usage statistics
    const usageStats = await billingService.getCurrentUsage(businessId);
    
    // Get available plans and features
    const availablePlans = Object.entries(PLAN_DEFINITIONS).map(([key, def]) => ({
      id: key,
      name: billingService.formatPlanName(key),
      features: def,
      currentPlan: key === billingInfo.plan,
      canUpgradeTo: billingService.getPlanLevel(key as PlanKey) > billingService.getPlanLevel(billingInfo.plan),
      canDowngradeTo: billingService.getPlanLevel(key as PlanKey) < billingService.getPlanLevel(billingInfo.plan)
    }));

    // Check for available discounts
    const availableDiscounts = await billingService.getAvailableDiscounts(businessId, req.tenant);

    res.json({
       currentPlan: {
    id: billingInfo.plan,
    name: billingService.formatPlanName(billingInfo.plan),
    features: PLAN_DEFINITIONS[billingInfo.plan as keyof typeof PLAN_DEFINITIONS] || PLAN_DEFINITIONS.foundation,
    subscriptionStatus: billingInfo.subscriptionStatus,
    currentPeriodEnd: billingInfo.currentPeriodEnd,
    cancelAtPeriodEnd: billingInfo.cancelAtPeriodEnd
  },
      usage: {
        current: usageStats,
        limits: billingService.getPlanLimitsPublic(billingInfo.plan),
        utilizationPercentage: billingService.calculateUtilization(usageStats, billingInfo.plan)
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
      recommendations: billingService.generatePlanRecommendations(usageStats, billingInfo.plan)
    });
  } catch (error) {
    logger.error('Get plan error:', error);
    next(error);
  }
}

/**
 * GET /api/billing/usage
 * Get detailed usage statistics and billing analytics
 */
export async function getUsageStats(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { period = '30d' } = req.query;

    // Get detailed usage analytics
    const billingService = getBillingService();
    const usage = await billingService.getDetailedUsage(businessId, period as string);
    const currentPlan = req.tenant?.plan || 'foundation';
    const planLimits = billingService.getPlanLimitsPublic(currentPlan);

    // Calculate projections
    const projections = await billingService.calculateUsageProjections(businessId);

    res.json({
      period,
      currentUsage: usage,
      limits: planLimits,
      utilization: billingService.calculateUtilization(usage, currentPlan),
      projections,
      overage: billingService.calculateOverage(usage, planLimits),
      recommendations: billingService.generateUsageRecommendations(usage, planLimits, projections)
    });
  } catch (error) {
    logger.error('Usage stats error:', error);
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
    const billingService = getBillingService();
    const result = await billingService.updatePaymentMethod(businessId, paymentMethodId);

    // Track payment method update
    trackManufacturerAction('update_payment_method');

    res.json({
      success: true,
      paymentMethod: result.paymentMethod,
      message: 'Payment method updated successfully'
    });
  } catch (error) {
    logger.error('Payment method update error:', error);
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
    const billingService = getBillingService();
    const result = await billingService.cancelSubscription(businessId, {
      reason,
      feedback,
      cancelImmediately,
      canceledBy: businessId
    });

    // Track cancellation
    trackManufacturerAction('cancel_subscription');

    // Send cancellation confirmation
    await getNotificationsService().sendCancellationConfirmation(businessId, result);

    res.json({
      success: true,
      cancellation: result,
      message: cancelImmediately ? 
        'Subscription canceled immediately' : 
        'Subscription will be canceled at the end of the current period'
    });
  } catch (error) {
    logger.error('Subscription cancellation error:', error);
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
    logger.error('Webhook signature verification failed:', error.message);
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
        logger.info('Unhandled webhook event type: ${event.type}');
    }

    // Log webhook processing
    logger.info('Webhook processed: ${event.type} - ${event.id}');

    res.json({ 
      received: true,
      eventType: event.type,
      eventId: event.id,
      processed: true
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
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
      logger.error('No businessId found in invoice metadata', { invoiceId: invoice.id });
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
      await getBillingService().processRenewal(subscriptionId);
      
      // Send renewal notification
      await getNotificationsService().sendRenewalConfirmation(subscriptionId);
    }
    
    // Clear any cached billing info
    const customer = await stripe.customers.retrieve(invoice.customer as string);
    if (customer && !customer.deleted) {
      // Clear plan cache for immediate effect
      clearPlanCache(businessId);
    }

    logger.info('Payment succeeded for business ${businessId}, subscription ${subscriptionId}');
  } catch (error) {
    logger.error('Error handling payment succeeded webhook:', error);
    throw error; // Re-throw to trigger webhook retry
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription!.toString();
  
  // Handle failed payment
  await getBillingService().handleFailedPayment(subscriptionId, invoice.id);
  
  // Send payment failed notification
  await getNotificationsService().sendPaymentFailedNotification(subscriptionId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  await getBillingService().syncSubscriptionUpdate(subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  await getBillingService().handleSubscriptionCancellation(subscription.id);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  await getBillingService().handleSubscriptionCreated(subscription);
}

// Helper functions moved to BillingService - now using service methods



