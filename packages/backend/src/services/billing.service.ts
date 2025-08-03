// src/services/billing.service.ts

import Stripe from 'stripe';
import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
import erc20Abi from '../abi/erc20Minimal.json';
import { BrandSettings } from '../models/brandSettings.model';
import { TOKEN_DISCOUNT_TIERS } from '../constants/tokenDiscounts';
import { PLAN_DEFINITIONS, PlanKey } from '../constants/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15'
});

const provider = new JsonRpcProvider(process.env.BASE_RPC_URL);
const tokenContract = new Contract(
  process.env.TOKEN_CONTRACT_ADDRESS!,
  erc20Abi,
  provider
);

/**
 * Pick the highest‐eligible coupon for a given token balance.
 */
export function getCouponForBalance(balance: number): string | undefined {
  for (const tier of TOKEN_DISCOUNT_TIERS) {
    if (balance >= tier.threshold) {
      return tier.couponId;
    }
  }
  return undefined;
}

export async function getBillingInfo(
  businessId: string
): Promise<{
  stripeCustomerId: string;
  plan: PlanKey;
}> {
  const cfg = await BrandSettings.findOne({ business: businessId });
  if (!cfg || !cfg.stripeCustomerId || !cfg.plan) {
    throw { statusCode: 404, message: 'No subscription found.' };
  }
  return {
    stripeCustomerId: cfg.stripeCustomerId,
    plan: cfg.plan as PlanKey
  };
}

/**
 * Charge a one‐off overage amount to a brand’s Stripe customer.
 */
export async function charge(
  businessId: string,
  amount: number,            // in dollars (e.g. 2.50)
  description: string
): Promise<Stripe.Charge> {
  const settings = await BrandSettings.findOne({ business: businessId });
  if (!settings?.stripeCustomerId) {
    throw new Error(`No Stripe customer configured for business ${businessId}`);
  }

  // Stripe expects amounts in the smallest currency unit (cents for USD)
  const cents = Math.round(amount * 100);

  const charge = await stripe.charges.create({
    customer:    settings.stripeCustomerId,
    amount:      cents,
    currency:    'usd',
    description
  });

  return charge;
}

/**
 * Create or update a recurring subscription for a brand.
 */
export async function createOrUpdateSubscription(
  businessId: string,
  plan: PlanKey
): Promise<Stripe.Subscription> {
  const settings = await BrandSettings.findOne({ business: businessId });
  if (!settings) {
    throw { statusCode: 404, message: 'Brand settings not found' };
  }

  const def = PLAN_DEFINITIONS[plan];
  let customerId = settings.stripeCustomerId;

  // 1️⃣ Ensure we have a Stripe customer
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { businessId } });
    customerId = customer.id;
    settings.stripeCustomerId = customerId;
  }

  // 2️⃣ Check on-chain token balance for discounts
  let couponToApply: string | undefined;
  if (settings.certificateWallet) {
    const raw       = await tokenContract.balanceOf(settings.certificateWallet);
    const balance   = parseFloat(formatUnits(raw, 18));
    couponToApply   = getCouponForBalance(balance);
  }

  // 3️⃣ Build subscription params
  const subParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items:    [{ price: def.stripePriceId }],
    metadata: { businessId },
    ...(couponToApply ? { coupon: couponToApply } : {})
  };

  let subscription: Stripe.Subscription;
  if (settings.stripeSubscriptionId) {
    // 4a) update existing subscription
    subscription = await stripe.subscriptions.update(
      settings.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
        items: [{
          id: settings.stripeSubscriptionItems!
            .find(i => i.priceId === def.stripePriceId)!.subscriptionItemId,
          price: def.stripePriceId
        }],
        ...(couponToApply ? { coupon: couponToApply } : {})
      } as Stripe.SubscriptionUpdateParams
    );
  } else {
    // 4b) create new subscription
    subscription = await stripe.subscriptions.create(subParams);
    settings.stripeSubscriptionId    = subscription.id;
    settings.stripeSubscriptionItems = subscription.items.data.map(item => ({
      priceId:           item.price.id,
      subscriptionItemId: item.id
    }));
  }

  // 5️⃣ Persist plan and settings
  settings.plan = plan;
  await settings.save();
  return subscription;
}

/**
 * Handle a renewal webhook or cron: re-apply any coupon based on current balance.
 */
export async function processRenewal(subscriptionId: string): Promise<void> {
  const settings = await BrandSettings.findOne({ stripeSubscriptionId: subscriptionId });
  if (!settings) {
    throw new Error(`No BrandSettings for subscription ${subscriptionId}`);
  }

  let couponToApply: string | undefined;
  if (settings.certificateWallet) {
    const raw     = await tokenContract.balanceOf(settings.certificateWallet);
    const balance = parseFloat(formatUnits(raw, 18));
    couponToApply = getCouponForBalance(balance);
  }

  await stripe.subscriptions.update(
    subscriptionId,
    {
      cancel_at_period_end: false,
      ...(couponToApply ? { coupon: couponToApply } : {})
    } as Stripe.SubscriptionUpdateParams
  );
}






