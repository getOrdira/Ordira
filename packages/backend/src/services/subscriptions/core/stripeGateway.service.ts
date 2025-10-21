import Stripe from 'stripe';
import { PLAN_DEFINITIONS, PlanKey } from '../../../constants/plans';
import { SubscriptionError } from '../utils/errors';
import { BillingPlanUtils, billingPlanUtils } from '../utils/billingPlan.utils';

type CheckoutSessionOptions = {
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Stripe.Metadata;
};

type CouponMetadata = Stripe.Metadata | undefined;

/**
 * Provides a modular gateway for interacting with the Stripe API within the subscriptions domain.
 * Encapsulates subscription, customer, checkout session, and webhook operations while respecting
 * the shared plan catalog utilities.
 */
export class StripeGatewayService {
  constructor(
    private readonly stripe: Stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2022-11-15'
    }),
    private readonly planUtils: BillingPlanUtils = billingPlanUtils,
    private readonly appBaseUrl: string = process.env.APP_URL ?? process.env.FRONTEND_URL ?? '',
    private readonly webhookSecret: string | null = process.env.STRIPE_WEBHOOK_SECRET ?? null
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new SubscriptionError('Stripe secret key is not configured', 500);
    }
  }

  /**
   * Creates a Stripe customer with the business identifier in metadata.
   * @param businessId Identifier associated with the business/tenant.
   * @param email Primary billing email.
   * @returns The created Stripe customer identifier.
   */
  async createCustomer(businessId: string, email: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      metadata: { businessId },
      email
    });

    return customer.id;
  }

  /**
   * Provisions a subscription for the given customer and plan.
   * @param customerId Stripe customer identifier.
   * @param plan Subscription plan key.
   * @param couponId Optional coupon identifier to apply.
   */
  async createSubscription(
    customerId: string,
    plan: PlanKey,
    couponId?: string
  ): Promise<Stripe.Subscription> {
    const priceId = this.resolvePriceId(plan);
    const params: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata: { plan }
    };

    if (couponId) {
      params.coupon = couponId;
    }

    return this.stripe.subscriptions.create(params);
  }

  /**
   * Updates an existing subscription to the provided plan.
   * @param subscriptionId Stripe subscription identifier.
   * @param plan New plan to apply to the subscription.
   * @param couponId Optional coupon to apply to the updated subscription.
   */
  async updateSubscription(
    subscriptionId: string,
    plan: PlanKey,
    couponId?: string
  ): Promise<Stripe.Subscription> {
    const priceId = this.resolvePriceId(plan);
    const params: Stripe.SubscriptionUpdateParams = {
      cancel_at_period_end: false,
      items: [{ price: priceId }],
      metadata: { plan }
    };

    if (couponId) {
      params.coupon = couponId;
    }

    return this.stripe.subscriptions.update(subscriptionId, params);
  }

  /**
   * Executes an immediate charge against a Stripe customer.
   * @param customerId Stripe customer identifier.
   * @param amount Amount in dollars to charge.
   * @param description Descriptor that appears on the invoice.
   */
  async chargeCustomer(
    customerId: string,
    amount: number,
    description: string
  ): Promise<Stripe.Charge> {
    if (amount <= 0) {
      throw new SubscriptionError('Charge amount must be greater than zero', 400);
    }

    const cents = Math.round(amount * 100);
    return this.stripe.charges.create({
      customer: customerId,
      amount: cents,
      currency: 'usd',
      description
    });
  }

  /**
   * Creates a Stripe Checkout session for subscription purchase or upgrade.
   * @param customerId Stripe customer identifier.
   * @param plan Subscription plan to purchase.
   * @param options Optional overrides for redirect URLs and metadata.
   */
  async createCheckoutSession(
    customerId: string,
    plan: PlanKey,
    options: CheckoutSessionOptions = {}
  ): Promise<string> {
    const priceId = this.resolvePriceId(plan);
    const successUrl = options.successUrl ?? this.buildUrl('/billing/success?session_id={CHECKOUT_SESSION_ID}');
    const cancelUrl = options.cancelUrl ?? this.buildUrl('/billing/cancel');

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(options.metadata ? { metadata: options.metadata } : {})
    });

    return session.id;
  }

  /**
   * Validates a Stripe webhook payload and returns the hydrated event.
   * @param payload Raw webhook payload buffer.
   * @param signature Signature header from Stripe.
   */
  async validateWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    const secret = this.ensureWebhookSecret();
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Applies a coupon to an existing subscription instance.
   * @param subscriptionId Stripe subscription identifier.
   * @param couponId Stripe coupon identifier.
   */
  async applyCouponToSubscription(
    subscriptionId: string,
    couponId: string,
    metadata?: CouponMetadata
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      coupon: couponId,
      ...(metadata ? { metadata } : {})
    });
  }

  /**
   * Removes any coupon applied to a subscription.
   * @param subscriptionId Stripe subscription identifier.
   */
  async removeCouponFromSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, { coupon: '' });
  }

  /**
   * Applies a coupon directly to a customer.
   * @param customerId Stripe customer identifier.
   * @param couponId Stripe coupon identifier.
   * @param metadata Optional metadata to attach to the customer.
   */
  async applyCouponToCustomer(
    customerId: string,
    couponId: string,
    metadata?: CouponMetadata
  ): Promise<Stripe.Customer> {
    return this.stripe.customers.update(customerId, {
      coupon: couponId,
      ...(metadata ? { metadata } : {})
    });
  }

  /**
   * Removes a coupon assigned to a customer.
   * @param customerId Stripe customer identifier.
   */
  async removeCouponFromCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.update(customerId, { coupon: '' });
  }

  /**
   * Retrieves a coupon definition from Stripe.
   * @param couponId Stripe coupon identifier.
   */
  async retrieveCoupon(couponId: string): Promise<Stripe.Coupon> {
    try {
      return await this.stripe.coupons.retrieve(couponId);
    } catch (error) {
      throw new SubscriptionError(`Failed to retrieve Stripe coupon "${couponId}"`, 502);
    }
  }

  /**
   * Creates a coupon in Stripe for token discount programs.
   * @param params Stripe coupon creation parameters.
   */
  async createCoupon(params: Stripe.CouponCreateParams): Promise<Stripe.Coupon> {
    try {
      return await this.stripe.coupons.create(params);
    } catch (error) {
      throw new SubscriptionError('Failed to create Stripe coupon', 502);
    }
  }

  private resolvePriceId(plan: PlanKey): string {
    const fromUtils = this.planUtils.getPlanPricing(plan)?.stripePriceId;
    const fromDefinitions = PLAN_DEFINITIONS[plan]?.stripePriceId;
    const priceId = fromUtils ?? fromDefinitions;

    if (!priceId) {
      throw new SubscriptionError(`Stripe price ID is not configured for plan "${plan}"`, 500);
    }

    return priceId;
  }

  private ensureWebhookSecret(): string {
    if (!this.webhookSecret) {
      throw new SubscriptionError('Stripe webhook secret is not configured', 500);
    }
    return this.webhookSecret;
  }

  private buildUrl(path: string): string {
    if (!this.appBaseUrl) {
      throw new SubscriptionError('Application URL is not configured for Stripe checkout redirects', 500);
    }

    const normalizedBase = this.appBaseUrl.endsWith('/')
      ? this.appBaseUrl.slice(0, -1)
      : this.appBaseUrl;

    return `${normalizedBase}${path}`;
  }
}

export const stripeGatewayService = new StripeGatewayService();
