// Deprecated location: src/services/external/tokenDiscount.service.ts
// Token discount functionality now lives within the subscriptions modular architecture.

export {
  TokenDiscountService,
  tokenDiscountService
} from '../subscriptions/features/tokenDiscount.service';
export {
  TokenBalanceService,
  tokenBalanceService
} from '../subscriptions/core/tokenBalance.service';
export type {
  TokenDiscount,
  DiscountEligibility,
  StripeDiscountApplication
} from '../subscriptions/features/tokenDiscount.service';
