import { Billing } from '../../../models/deprecated/billing.model';

/**
 * Core data access layer for subscription billing records.
 * Handles persistence operations for Billing documents.
 */
export class BillingDataService {
  async getBillingByBusinessId(businessId: string) {
    return Billing.findOne({ business: businessId });
  }

  async updateBilling(businessId: string, updates: Record<string, unknown>) {
    await Billing.updateOne({ business: businessId }, updates);
  }

  async upsertBilling(businessId: string, data: Record<string, unknown>) {
    await Billing.findOneAndUpdate(
      { business: businessId },
      data,
      { upsert: true, new: true }
    );
  }
}

export const billingDataService = new BillingDataService();
