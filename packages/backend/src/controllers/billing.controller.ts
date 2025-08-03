// src/controllers/billing.controller.ts

import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware/auth.middleware';
import * as billingSvc from '../services/billing.service';
import { notifyBrandOfRenewal } from '../services/notification.service';
import { PLAN_DEFINITIONS, PlanKey } from '../constants/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15'
});
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

function isPlanKey(x: unknown): x is PlanKey {
  return typeof x === 'string' && x in PLAN_DEFINITIONS;
}

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout Session for the given plan.
 */
export async function createCheckoutSession(
  req: AuthRequest & { body: { plan: unknown } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;
    const { plan }   = req.body;

    if (!isPlanKey(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Ensure Stripe customer exists & subscription record is created/updated
    await billingSvc.createOrUpdateSubscription(businessId, plan);

    // Fetch customer ID back
    const { stripeCustomerId } = await billingSvc.getBillingInfo(businessId);

    const priceId = PLAN_DEFINITIONS[plan].stripePriceId;
    const session = await stripe.checkout.sessions.create({
      customer:   stripeCustomerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:`${process.env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/billing/cancel`
    });

    res.json({ sessionId: session.id });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/billing/plan
 * Change or upgrade/downgrade the subscription plan immediately.
 */
export async function changePlan(
  req: AuthRequest & { body: { plan: PlanKey } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;
    const { plan }   = req.body;

    const subscription = await billingSvc.createOrUpdateSubscription(businessId, plan);
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/billing/plan
 * Retrieve the current plan & billing limits for the authenticated brand.
 */
export async function getPlan(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;
    const info       = await billingSvc.getBillingInfo(businessId);
    res.json(info);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/billing/webhook
 * Stripe webhook endpoint: handles invoice.payment_succeeded events.
 */
export async function handleStripeWebhook(
  req: Request, // raw body middleware applied in index.ts
  res: Response,
  next: NextFunction
) {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (
    event.type === 'invoice.payment_succeeded'
    && event.data.object &&
    (event.data.object as Stripe.Invoice).billing_reason === 'subscription_cycle'
  ) {
    const invoice = event.data.object as Stripe.Invoice;
    const subId   = invoice.subscription!.toString();
    try {
      // Re-evaluate discounts on renewal
      await billingSvc.processRenewal(subId);
      // Notify the brand of successful renewal
      await notifyBrandOfRenewal(subId);
    } catch (err) {
      console.error('Renewal processing error:', err);
    }
  }

  res.json({ received: true });
}



