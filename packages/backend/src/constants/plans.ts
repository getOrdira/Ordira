// src/constants/plans.ts

export const PLAN_DEFINITIONS = {
    foundation: {
      votes:         100,
      certificates:  50,
      apiCalls:      1000,
      storage:       1024, // MB
      price: '39,99',
      stripePriceId: 'price_1RqIhPAUE6HtX6lzNr05UfW6',
      features: {
        hasWeb3: false,
        allowOverage: false,
        maxApiKeys: 1,
        supportLevel: 'community'
      }
    },
    growth: {
      votes:         500,
      certificates:  150,
      apiCalls:      10000,
      storage:       5120, // MB
      price: '59,99',
      stripePriceId: 'price_1RqJ1AAUE6HtX6lzavobhOU3',
      features: {
        hasWeb3: true,
        allowOverage: false,
        maxApiKeys: 3,
        supportLevel: 'email'
      }
    },
    premium: {
      votes:          2000,
      certificates:   500,
      apiCalls:       100000,
      storage:        20480, // MB
      price: '119,99',
      stripePriceId:  'price_1RqJ2sAUE6HtX6lzRqdesPVZ',
      features: {
        hasWeb3: true,
        allowOverage: true,
        maxApiKeys: 10,
        supportLevel: 'priority'
      }
    },
    enterprise: {
      votes:          Infinity,
      certificates:   Infinity,
      apiCalls:       Infinity,
      storage:        Infinity,
      price: '499,99',
      stripePriceId:  'price_1RqJ3vAUE6HtX6lz8hpLnfVm',
      features: {
        hasWeb3: true,
        allowOverage: true,
        maxApiKeys: Infinity,
        supportLevel: 'dedicated'
      }
    }
  } as const;
  
  export type PlanKey = keyof typeof PLAN_DEFINITIONS;
  
  