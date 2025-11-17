// src/services/apiKey/utils/planHelpers.ts
// Plan-related utility functions

import type { PlanLimits } from './types';

export function getApiKeyLimits(plan: string): PlanLimits {
  switch (plan) {
    case 'foundation':
      return {
        maxKeys: 2,
        defaultRateLimits: {
          requestsPerMinute: 100,
          requestsPerDay: 1000
        }
      };
    case 'growth':
      return {
        maxKeys: 5,
        defaultRateLimits: {
          requestsPerMinute: 300,
          requestsPerDay: 5000
        }
      };
    case 'premium':
      return {
        maxKeys: 15,
        defaultRateLimits: {
          requestsPerMinute: 1000,
          requestsPerDay: 25000
        }
      };
    case 'enterprise':
      return {
        maxKeys: 50,
        defaultRateLimits: {
          requestsPerMinute: 5000,
          requestsPerDay: 100000
        }
      };
    default:
      return {
        maxKeys: 1,
        defaultRateLimits: {
          requestsPerMinute: 50,
          requestsPerDay: 500
        }
      };
  }
}

export function getPlanPermissions(plan: string): string[] {
  const basePermissions = ['read'];
  
  switch (plan) {
    case 'foundation':
      return [...basePermissions];
    case 'growth':
      return [...basePermissions, 'write', 'analytics'];
    case 'premium':
      return [...basePermissions, 'write', 'analytics', 'admin', 'integrations'];
    case 'enterprise':
      return [...basePermissions, 'write', 'analytics', 'admin', 'integrations', 'webhooks', 'export'];
    default:
      return basePermissions;
  }
}

