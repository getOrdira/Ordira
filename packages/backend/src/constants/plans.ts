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
      },
      supplyChain: {
        eventsPerMinute: 2,
        eventsPerHour: 10,
        eventsPerDay: 50,
        cooldownPeriod: 30, // seconds
        burstAllowance: 5
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
      },
      supplyChain: {
        eventsPerMinute: 5,
        eventsPerHour: 30,
        eventsPerDay: 200,
        cooldownPeriod: 15, // seconds
        burstAllowance: 10
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
      },
      supplyChain: {
        eventsPerMinute: 10,
        eventsPerHour: 100,
        eventsPerDay: 1000,
        cooldownPeriod: 10, // seconds
        burstAllowance: 25
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
      },
      supplyChain: {
        eventsPerMinute: 30,
        eventsPerHour: 500,
        eventsPerDay: 5000,
        cooldownPeriod: 5, // seconds
        burstAllowance: 100
      }
    }
  } as const;
  
  export type PlanKey = keyof typeof PLAN_DEFINITIONS;
  
  