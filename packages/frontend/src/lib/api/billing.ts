// src/lib/api/billing.ts

import { api } from './client';
import { ApiError } from '@/lib/errors';
import { TimeRange } from '@/lib/types/common';
import { Billing, BillingAnalytics, BulkOperationResponse } from '@/lib/types/billing';

// Enhanced response interfaces matching backend controller responses
export interface CheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
  planDetails: {
    selectedPlan: string;
    planFeatures: any;
    isUpgrade: boolean; 
    isDowngrade: boolean;
    upgradeFrom?: string;
  };
  pricing: {
    subtotal: number;
    discount?: number;
    total: number;
    currency: string;
  };
  discounts: {
    tokenDiscount?: string;
    couponCode?: string;
  };
  nextSteps: string[];
}

export interface PlanChangeResponse {
  success: boolean;
  planChange: {
    from: string;
    to: string;
    effective: string;
  };
  billing: {
    nextChargeAmount: number;
    nextChargeDate: string;
    prorationCredit?: number;
  };
  features: {
    unlocked: string[];
    removed: string[];
  };
}

export interface CancellationResponse {
  success: boolean;
  cancellation: {
    effectiveDate: string;
    reason?: string;
    refund?: number;
  };
  message: string;
}

export interface DetailedUsageResponse {
  period: string;
  currentUsage: any;
  limits: any;
  utilization: any;
  projections: any;
  overage: any;
  recommendations: string[];
}

export interface PaymentMethodResponse {
  success: boolean;
  paymentMethod: {
    id: string;
    type: string;
    last4: string;
    brand: string;
  };
  message: string;
}

export interface InvoiceDetails {
  id: string;
  amount: number;
  status: string;
  date: string;
  items: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  downloadUrl?: string;
  paidAt?: string;
  dueDate?: string;
}

export interface DiscountInfo {
  tokenDiscounts?: {
    available: boolean;
    discount: number;
    walletAddress?: string;
  };
  loyaltyDiscount?: {
    available: boolean;
    discount: number;
    tier: string;
  };
  activeCoupons: Array<{
    code: string;
    discount: number;
    expiresAt: string;
  }>;
}

export const billingApi = {
  
  // ===== BILLING INFORMATION =====
  
  /**
   * Get current billing information
   * GET /api/billing
   */
  getBilling: async (): Promise<Billing> => {
    try {
      const response = await api.get<Billing>('/api/billing');
      return response;
    } catch (error) {
      console.error('Get billing error:', error);
      throw error;
    }
  },

  /**
   * Update billing information
   * PUT /api/billing
   */
  updateBilling: async (data: Partial<Billing>): Promise<Billing> => {
    try {
      const response = await api.put<Billing>('/api/billing', data);
      return response;
    } catch (error) {
      console.error('Update billing error:', error);
      throw error;
    }
  },

  // ===== SUBSCRIPTION MANAGEMENT =====
  
  /**
   * Get current subscription details
   * GET /api/billing/subscription
   */
  getSubscription: async (): Promise<{
    plan: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: string;
  }> => {
    try {
      const response = await api.get<{
        plan: string;
        status: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd?: boolean;
        trialEnd?: string;
      }>('/api/billing/subscription');
      return response;
    } catch (error) {
      console.error('Get subscription error:', error);
      throw error;
    }
  },

  /**
   * Create checkout session for new subscription
   * POST /api/billing/checkout-session
   */
  createCheckoutSession: async (data: {
    plan: 'foundation' | 'growth' | 'premium' | 'enterprise';
    couponCode?: string;
    addons?: string[];
  }): Promise<CheckoutSessionResponse> => {
    try {
      const response = await api.post<CheckoutSessionResponse>('/api/billing/checkout-session', data);
      return response;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  },

  /**
   * Change subscription plan
   * PUT /api/billing/plan
   */
  changePlan: async (data: {
    plan: 'foundation' | 'growth' | 'premium' | 'enterprise';
    couponCode?: string;
  }): Promise<PlanChangeResponse> => {
    try {
      const response = await api.put<PlanChangeResponse>('/api/billing/plan', data);
      return response;
    } catch (error) {
      console.error('Change plan error:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   * POST /api/billing/cancel
   */
  cancelSubscription: async (data?: {
    reason?: string;
    feedback?: string;
    cancelImmediately?: boolean;
  }): Promise<CancellationResponse> => {
    try {
      const response = await api.post<CancellationResponse>('/api/billing/cancel', data || {});
      return response;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  },

  // ===== PAYMENT MANAGEMENT =====
  
  /**
   * Get payment methods
   * GET /api/billing/payment-methods
   */
  getPaymentMethods: async (): Promise<Array<{
    id: string;
    type: string;
    last4: string;
    brand: string;
    isDefault?: boolean;
    expiryMonth?: number;
    expiryYear?: number;
  }>> => {
    try {
      const response = await api.get<Array<{
        id: string;
        type: string;
        last4: string;
        brand: string;
        isDefault?: boolean;
        expiryMonth?: number;
        expiryYear?: number;
      }>>('/api/billing/payment-methods');
      return response;
    } catch (error) {
      console.error('Get payment methods error:', error);
      throw error;
    }
  },

  /**
   * Add new payment method
   * POST /api/billing/payment-methods
   */
  addPaymentMethod: async (data: { 
    token: string;
    billingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  }): Promise<{
    id: string;
    type: string;
    last4: string;
    brand: string;
  }> => {
    try {
      const response = await api.post<{
        id: string;
        type: string;
        last4: string;
        brand: string;
      }>('/api/billing/payment-methods', data);
      return response;
    } catch (error) {
      console.error('Add payment method error:', error);
      throw error;
    }
  },

  /**
   * Update payment method (for billing address, etc.)
   * POST /api/billing/payment-method
   */
  updatePaymentMethod: async (data: {
    paymentMethodId: string;
    billingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  }): Promise<PaymentMethodResponse> => {
    try {
      const response = await api.post<PaymentMethodResponse>('/api/billing/payment-method', data);
      return response;
    } catch (error) {
      console.error('Update payment method error:', error);
      throw error;
    }
  },

  /**
   * Set default payment method
   * PUT /api/billing/payment-methods/default
   */
  setDefaultPaymentMethod: async (paymentMethodId: string): Promise<void> => {
    try {
      await api.put<void>('/api/billing/payment-methods/default', { paymentMethodId });
    } catch (error) {
      console.error('Set default payment method error:', error);
      throw error;
    }
  },

  /**
   * Remove payment method
   * DELETE /api/billing/payment-methods/:id
   */
  removePaymentMethod: async (paymentMethodId: string): Promise<void> => {
    try {
      await api.delete<void>(`/api/billing/payment-methods/${paymentMethodId}`);
    } catch (error) {
      console.error('Remove payment method error:', error);
      throw error;
    }
  },

  // ===== INVOICE MANAGEMENT =====
  
  /**
   * Get list of invoices with enhanced pagination
   * GET /api/billing/invoices
   */
  getInvoices: async (params?: {
    page?: number;
    limit?: number;
    status?: 'paid' | 'unpaid' | 'pending';
  }): Promise<{
    invoices: Array<{
      id: string;
      amount: number;
      status: string;
      date: string;
      downloadUrl?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    try {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.status) qs.set('status', params.status);

      const response = await api.get<{
        invoices: Array<{
          id: string;
          amount: number;
          status: string;
          date: string;
          downloadUrl?: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/api/billing/invoices?${qs.toString()}`);
      return response;
    } catch (error) {
      console.error('Get invoices error:', error);
      throw error;
    }
  },

  /**
   * Get specific invoice details
   * GET /api/billing/invoices/:id
   */
  getInvoice: async (invoiceId: string): Promise<InvoiceDetails> => {
    try {
      const response = await api.get<InvoiceDetails>(
        `/api/billing/invoices/${encodeURIComponent(invoiceId)}`
      );
      return response;
    } catch (error) {
      console.error('Get invoice error:', error);
      throw error;
    }
  },

  /**
   * Download invoice PDF
   * GET /api/billing/invoices/:id/download
   */
  downloadInvoice: async (invoiceId: string): Promise<Blob> => {
    try {
      // Use direct apiClient for blob response
      const response = await api.get<Blob>(`/api/billing/invoices/${encodeURIComponent(invoiceId)}/download`);
      return response;
    } catch (error) {
      console.error('Download invoice error:', error);
      throw error;
    }
  },

  // ===== USAGE AND ANALYTICS =====
  
  /**
   * Get detailed usage analytics
   * GET /api/billing/usage
   */
  getDetailedUsage: async (timeRange?: TimeRange): Promise<DetailedUsageResponse> => {
    try {
      const qs = new URLSearchParams();
      if (timeRange?.start) qs.set('start', timeRange.start);
      if (timeRange?.end) qs.set('end', timeRange.end);

      const response = await api.get<DetailedUsageResponse>(
        `/api/billing/usage?${qs.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Get detailed usage error:', error);
      throw error;
    }
  },

  /**
   * Get billing analytics
   * GET /api/billing/analytics
   */
  getBillingAnalytics: async (timeRange?: TimeRange): Promise<BillingAnalytics> => {
    try {
      const qs = new URLSearchParams();
      if (timeRange?.start) qs.set('start', timeRange.start);
      if (timeRange?.end) qs.set('end', timeRange.end);

      const response = await api.get<BillingAnalytics>(
        `/api/billing/analytics?${qs.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Get billing analytics error:', error);
      throw error;
    }
  },

  // ===== DISCOUNTS AND PROMOTIONS =====
  
  /**
   * Apply token discount
   * POST /api/billing/discounts/token
   */
  applyTokenDiscount: async (walletAddress: string): Promise<{
    discount: number;
    applied: boolean;
    couponCode?: string;
  }> => {
    try {
      const response = await api.post<{
        discount: number;
        applied: boolean;
        couponCode?: string;
      }>('/api/billing/discounts/token', { walletAddress });
      return response;
    } catch (error) {
      console.error('Apply token discount error:', error);
      throw error;
    }
  },

  /**
   * Get available discounts
   * GET /api/billing/discounts
   */
  getDiscounts: async (): Promise<DiscountInfo> => {
    try {
      const response = await api.get<DiscountInfo>('/api/billing/discounts');
      return response;
    } catch (error) {
      console.error('Get discounts error:', error);
      throw error;
    }
  },

  /**
   * Validate coupon code
   * POST /api/billing/coupons/validate
   */
  validateCoupon: async (couponCode: string): Promise<{
    valid: boolean;
    discount: number;
    expiresAt?: string;
    restrictions?: any;
  }> => {
    try {
      const response = await api.post<{
        valid: boolean;
        discount: number;
        expiresAt?: string;
        restrictions?: any;
      }>('/api/billing/coupons/validate', { couponCode });
      return response;
    } catch (error) {
      console.error('Validate coupon error:', error);
      throw error;
    }
  },

  // ===== WEBHOOK MANAGEMENT =====
  
  /**
   * Verify webhook signature (for internal use)
   * POST /api/billing/webhook/verify
   */
  verifyWebhookSignature: async (payload: string, signature: string): Promise<{
    valid: boolean;
    event?: any;
  }> => {
    try {
      const response = await api.post<{
        valid: boolean;
        event?: any;
      }>('/api/billing/webhook/verify', {
        payload,
        signature
      });
      return response;
    } catch (error) {
      console.error('Webhook verification error:', error);
      return { valid: false };
    }
  },

  // ===== PLAN AND PRICING =====
  
  /**
   * Get available plans and pricing
   * GET /api/billing/plans
   */
  getPlans: async (): Promise<{
    plans: Array<{
      id: string;
      name: string;
      price: number;
      features: string[];
      limits: any;
    }>;
    currentPlan?: string;
    canUpgradeTo: string[];
    canDowngradeTo: string[];
  }> => {
    try {
      const response = await api.get<{
        plans: Array<{
          id: string;
          name: string;
          price: number;
          features: string[];
          limits: any;
        }>;
        currentPlan?: string;
        canUpgradeTo: string[];
        canDowngradeTo: string[];
      }>('/api/billing/plans');
      return response;
    } catch (error) {
      console.error('Get plans error:', error);
      throw error;
    }
  },

  /**
   * Calculate pricing for plan with addons and coupons
   * POST /api/billing/calculate-pricing
   */
  calculatePricing: async (data: {
    plan: string;
    addons?: string[];
    couponCode?: string;
  }): Promise<{
    subtotal: number;
    discount: number;
    total: number;
    breakdown: Array<{
      item: string;
      amount: number;
    }>;
  }> => {
    try {
      const response = await api.post<{
        subtotal: number;
        discount: number;
        total: number;
        breakdown: Array<{
          item: string;
          amount: number;
        }>;
      }>('/api/billing/calculate-pricing', data);
      return response;
    } catch (error) {
      console.error('Calculate pricing error:', error);
      throw error;
    }
  },

  // ===== ENTERPRISE FEATURES =====
  
  /**
   * Bulk update billing for multiple users (enterprise only)
   * POST /api/billing/bulk
   */
  bulkUpdateBilling: async (data: {
    userIds: string[];
    updates: Partial<Billing>;
  }): Promise<BulkOperationResponse> => {
    try {
      const response = await api.post<BulkOperationResponse>('/api/billing/bulk', data);
      return response;
    } catch (error) {
      console.error('Bulk update billing error:', error);
      throw error;
    }
  },

  /**
   * Get billing summary for admin dashboard
   * GET /api/billing/admin/summary
   */
  getAdminBillingSummary: async (): Promise<{
    totalRevenue: number;
    activeSubscriptions: number;
    churnRate: number;
    averageRevenuePerUser: number;
    monthlyRecurring: number;
  }> => {
    try {
      const response = await api.get<{
        totalRevenue: number;
        activeSubscriptions: number;
        churnRate: number;
        averageRevenuePerUser: number;
        monthlyRecurring: number;
      }>('/api/billing/admin/summary');
      return response;
    } catch (error) {
      console.error('Get admin billing summary error:', error);
      throw error;
    }
  },
};

// ===== STANDALONE FUNCTIONS (moved outside billingApi object) =====

/**
 * Upgrade plan with checkout session
 * POST /api/billing/upgrade
 */
export const upgradePlan = async (data: { 
  targetPlan: 'foundation' | 'growth' | 'premium' | 'enterprise';
  paymentMethodId?: string;
  couponCode?: string;
}): Promise<{ success: boolean; subscriptionId: string }> => {
  try {
    const response = await api.post<{ success: boolean; subscriptionId: string }>('/api/billing/upgrade', data);
    return response;
  } catch (error) {
    console.error('Plan upgrade error:', error);
    throw error;
  }
};

/**
 * Downgrade plan
 * POST /api/billing/downgrade
 */
export const downgradePlan = async (data: {
  targetPlan: 'foundation' | 'growth' | 'premium' | 'enterprise';
  reason?: string;
}): Promise<{ success: boolean; effectiveDate: string }> => {
  try {
    const response = await api.post<{ success: boolean; effectiveDate: string }>('/api/billing/downgrade', data);
    return response;
  } catch (error) {
    console.error('Plan downgrade error:', error);
    throw error;
  }
};

/**
 * Pause subscription temporarily
 * POST /api/billing/pause
 */
export const pauseSubscription = async (data: {
  duration?: number; // days
  reason?: string;
}): Promise<{ success: boolean; resumeDate: string }> => {
  try {
    const response = await api.post<{ success: boolean; resumeDate: string }>('/api/billing/pause', data);
    return response;
  } catch (error) {
    console.error('Pause subscription error:', error);
    throw error;
  }
};

/**
 * Resume paused subscription
 * POST /api/billing/resume
 */
export const resumeSubscription = async (): Promise<{ success: boolean; resumedAt: string }> => {
  try {
    const response = await api.post<{ success: boolean; resumedAt: string }>('/api/billing/resume', {});
    return response;
  } catch (error) {
    console.error('Resume subscription error:', error);
    throw error;
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Calculate plan level for comparisons
 */
export const getPlanLevel = (plan: string): number => {
  const levels = { 
    foundation: 1, 
    growth: 2, 
    premium: 3, 
    enterprise: 4 
  };
  return levels[plan as keyof typeof levels] || 0;
};

/**
 * Check if plan change is an upgrade
 */
export const isUpgrade = (fromPlan: string, toPlan: string): boolean => {
  return getPlanLevel(toPlan) > getPlanLevel(fromPlan);
};

/**
 * Check if plan change is a downgrade
 */
export const isDowngrade = (fromPlan: string, toPlan: string): boolean => {
  return getPlanLevel(toPlan) < getPlanLevel(fromPlan);
};