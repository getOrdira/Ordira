import Stripe from 'stripe';
import { PLAN_DEFINITIONS, PlanKey } from '../../constants/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export class StripeService {
  async createCustomer(businessId: string, email: string): Promise<string> {
    const customer = await stripe.customers.create({
      metadata: { businessId },
      email
    });
    return customer.id;
  }

  async createSubscription(customerId: string, plan: PlanKey, couponId?: string): Promise<Stripe.Subscription> {
    const def = PLAN_DEFINITIONS[plan];
    const params: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: def.stripePriceId }],
      metadata: { plan }
    };

    if (couponId) {
      params.coupon = couponId;
    }

    return await stripe.subscriptions.create(params);
  }

  async updateSubscription(subscriptionId: string, plan: PlanKey, couponId?: string): Promise<Stripe.Subscription> {
    const def = PLAN_DEFINITIONS[plan];
    const params: Stripe.SubscriptionUpdateParams = {
      cancel_at_period_end: false,
      items: [{ price: def.stripePriceId }],
      metadata: { plan }
    };

    if (couponId) {
      params.coupon = couponId;
    }

    return await stripe.subscriptions.update(subscriptionId, params);
  }

  async chargeCustomer(customerId: string, amount: number, description: string): Promise<Stripe.Charge> {
    const cents = Math.round(amount * 100);
    return await stripe.charges.create({
      customer: customerId,
      amount: cents,
      currency: 'usd',
      description
    });
  }

  async createCheckoutSession(customerId: string, plan: PlanKey): Promise<string> {
    const def = PLAN_DEFINITIONS[plan];
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: def.stripePriceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/billing/cancel`
    });
    return session.id;
  }

  async validateWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  }
}