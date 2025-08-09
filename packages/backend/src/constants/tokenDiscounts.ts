export const TOKEN_DISCOUNT_TIERS = [
  { 
    threshold: 1_000_000, 
    couponId: '8RKUP162', 
    discountPercentage: 25,
    name: 'Enterprise'
  },
  { 
    threshold: 500_000, 
    couponId: 'wCiYYJtH', 
    discountPercentage: 20,
    name: 'Pro'
  },
  { 
    threshold: 250_000, 
    couponId: 'OPn0DBJA', 
    discountPercentage: 15,
    name: 'Growth'
  },
  { 
    threshold: 100_000, 
    couponId: 'jxZHlWzw', 
    discountPercentage: 10,
    name: 'Foundation'
  },
] as const;
  