// src/constants/plans.ts

export const PLAN_DEFINITIONS = {
    foundation: {
      votes:         100,
      certificates:  50,
      price: '39,99',
      stripePriceId: 'price_1RqIhPAUE6HtX6lzNr05UfW6'   
    },
    growth: {
      votes:         500,
      certificates: 150,
      price: '59,99',
      stripePriceId: 'price_1RqJ1AAUE6HtX6lzavobhOU3'       
    },
    premium: {
      votes:          2000,
      certificates:   500,
      price: '119,99',
      stripePriceId:  'price_1RqJ2sAUE6HtX6lzRqdesPVZ'     
    },
    enterprise: {
      votes:          Infinity,
      certificates:   Infinity,
      price: '499,99',
      stripePriceId:  'price_1RqJ3vAUE6HtX6lz8hpLnfVm'  
    }
  } as const;
  
  export type PlanKey = keyof typeof PLAN_DEFINITIONS;
  
  