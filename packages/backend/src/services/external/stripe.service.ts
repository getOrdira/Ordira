// Deprecated location: src/services/external/stripe.service.ts
// The Stripe integration now lives within the subscriptions modular architecture.

export {
  StripeGatewayService as StripeService,
  stripeGatewayService as stripeService
} from '../subscriptions/core/stripeGateway.service';
