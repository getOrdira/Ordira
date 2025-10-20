import { createAppError } from '../../../middleware/error.middleware';
import type { UsageUpdate, UsageCategory } from '../utils/types';

export class UsageValidationService {
  ensureBusinessId(rawBusinessId: string | undefined | null): string {
    const businessId = rawBusinessId?.toString().trim();

    if (!businessId) {
      throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
    }

    return businessId;
  }

  ensureOperation(operation: string): UsageCategory {
    if (operation === 'certificates' || operation === 'votes' || operation === 'apiCalls' || operation === 'storage') {
      return operation;
    }

    throw createAppError(`Unsupported usage operation: ${operation}`, 400, 'INVALID_USAGE_OPERATION');
  }

  ensureAmount(amount: number | undefined): number {
    const normalized = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 1;

    if (normalized <= 0) {
      throw createAppError('Usage amount must be positive', 400, 'INVALID_USAGE_AMOUNT');
    }

    return normalized;
  }

  normalizeUpdate(update: UsageUpdate): UsageUpdate {
    const normalized: UsageUpdate = {};

    (['certificates', 'votes', 'apiCalls', 'storage'] as UsageCategory[]).forEach(category => {
      const value = update?.[category];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        normalized[category] = value;
      }
    });

    if (Object.keys(normalized).length === 0) {
      throw createAppError('At least one usage metric must be supplied', 400, 'EMPTY_USAGE_UPDATE');
    }

    return normalized;
  }
}

export const usageValidationService = new UsageValidationService();