// src/constants/tokenDiscounts.ts
export const TOKEN_DISCOUNT_TIERS = [
    { threshold: 1_000_000, couponId: '8RKUP162' },  // ← copy this from Stripe
    { threshold:   500_000, couponId: 'wCiYYJtH' },
    { threshold:   250_000, couponId: 'OPn0DBJA' },
    { threshold:   100_000, couponId: 'jxZHlWzw' },
  ] as const;
  
  