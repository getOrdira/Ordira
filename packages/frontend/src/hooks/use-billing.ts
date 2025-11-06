import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ApiError } from '@/lib/errors';
import apiClient from '@/lib/apis/client';

// ===== TYPES =====

type PlanType = 'foundation' | 'growth' | 'premium' | 'enterprise';
type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'paused';
type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

interface PlanLimits {
  votes: number;
  certificates: number;
  integrations: number;
  storage: number;
  teamMembers: number;
  customDomain: boolean;
  prioritySupport: boolean;
  analyticsRetention: number;
}

interface CurrentUsage {
  votes: {
    used: number;
    limit: number;
    resetDate: string;
  };
  certificates: {
    used: number;
    limit: number;
    resetDate: string;
  };
  integrations: {
    used: number;
    limit: number;
  };
  storage: {
    used: number;
    limit: number;
  };
  lastUpdated: string;
}

interface PaymentMethod {
  id: string;
  type: 'card';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault: boolean;
  created: Date;
}

interface Subscription {
  id: string;
  status: SubscriptionStatus;
  currentPlan: PlanType;
  planLimits: PlanLimits;
  currentUsage: CurrentUsage;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  paymentMethod?: PaymentMethod;
  billing: {
    nextInvoiceDate: string;
    nextInvoiceAmount: number;
    currency: string;
    taxRate?: number;
    isTrialPeriod: boolean;
    trialEndsAt?: string;
    daysUntilRenewal: number;
  };
  metadata: {
    businessId: string;
    lastUpdated: string;
  };
}

interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  created: Date;
  dueDate: Date | null;
  paidDate: Date | null;
  description: string;
  subscriptionId?: string;
  downloadUrl?: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
}

interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  summary: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  };
}

interface UsageStats {
  current: CurrentUsage;
  history: Array<{
    date: string;
    votes: number;
    certificates: number;
    storage: number;
  }>;
  projections: {
    nextMonth: {
      votes: number;
      certificates: number;
      likelihood: 'low' | 'medium' | 'high';
    };
  };
  recommendations: Array<{
    type: 'upgrade' | 'optimize' | 'alert';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  utilizationPercentage: {
    votes: number;
    certificates: number;
    storage: number;
    integrations: number;
  };
}

interface PlanComparison {
  plans: Array<{
    id: PlanType;
    name: string;
    price: number;
    currency: string;
    interval: string;
    limits: PlanLimits;
    features: string[];
    popular?: boolean;
    currentPlan?: boolean;
  }>;
  recommendations: {
    suggestedPlan: PlanType;
    reason: string;
    savings?: number;
  };
}

interface CheckoutSessionRequest {
  planId: PlanType;
  returnUrl?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

interface ChangePlanRequest {
  newPlan: PlanType;
  prorationBehavior?: 'always_invoice' | 'none';
  effectiveDate?: 'now' | 'next_period';
}

interface PaymentMethodUpdate {
  paymentMethodId: string;
  setAsDefault?: boolean;
}

interface CancelSubscriptionRequest {
  reason?: string;
  feedback?: string;
  cancelImmediately?: boolean;
  cancellationDate?: string;
  retentionOfferAccepted?: boolean;
}

// ===== API FUNCTIONS =====

// Use the centralized API client
const api = apiClient;

const billingApi = {
  // Subscription management
  getCurrentSubscription: async (): Promise<Subscription> => {
    const response = await api.get<Subscription>('/billing/subscription/current');
    return response;
  },

  changePlan: async (data: ChangePlanRequest): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/billing/subscription/change-plan', data);
    return response;
  },

  cancelSubscription: async (data: CancelSubscriptionRequest): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/billing/subscription/cancel', data);
    return response;
  },

  // Checkout and billing
  createCheckoutSession: async (data: CheckoutSessionRequest): Promise<{ sessionUrl: string; sessionId: string }> => {
    const response = await api.post<{ sessionUrl: string; sessionId: string }>('/billing/checkout/create-session', data);
    return response;
  },

  getAvailablePlans: async (): Promise<PlanComparison> => {
    const response = await api.get<PlanComparison>('/billing/plans');
    return response;
  },

  // Payment methods
  getPaymentMethods: async (): Promise<{ paymentMethods: PaymentMethod[] }> => {
    const response = await api.get<{ paymentMethods: PaymentMethod[] }>('/billing/payment-methods');
    return response;
  },

  updatePaymentMethod: async (data: PaymentMethodUpdate): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/billing/payment-methods/update', data);
    return response;
  },

  deletePaymentMethod: async (paymentMethodId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/billing/payment-methods/${paymentMethodId}`);
    return response;
  },

  // Invoices
  getInvoices: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'created' | 'amount' | 'dueDate';
    sortOrder?: 'asc' | 'desc';
  }): Promise<InvoiceListResponse> => {
    const response = await api.get<InvoiceListResponse>('/billing/invoices', { params });
    return response;
  },

  getInvoiceById: async (invoiceId: string): Promise<Invoice & { lineItems: any[]; paymentHistory: any[] }> => {
    const response = await api.get<Invoice & { lineItems: any[]; paymentHistory: any[] }>(`/billing/invoices/${invoiceId}`);
    return response;
  },

  downloadInvoice: async (invoiceId: string): Promise<Blob> => {
    const response = await api.get<Blob>(`/billing/invoices/${invoiceId}/download`, { responseType: 'blob' });
    return response;
  },

  resendInvoice: async (invoiceId: string, email?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/billing/invoices/actions', { action: 'send', invoiceId, email });
    return response;
  },

  // Usage and analytics
  getUsageStats: async (params?: {
    period?: '7d' | '30d' | '90d' | '1y';
    includeProjections?: boolean;
    includeRecommendations?: boolean;
    detailedBreakdown?: boolean;
  }): Promise<UsageStats> => {
    const response = await api.get<UsageStats>('/billing/usage', { params });
    return response;
  },

  resetUsageCounters: async (resetType: 'votes' | 'certificates' | 'all'): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/billing/usage/actions', { action: 'reset_counters', resetType });
    return response;
  },

  exportUsageData: async (params: {
    exportFormat: 'csv' | 'json' | 'xlsx';
    exportTimeframe?: '30d' | '90d' | '1y';
  }): Promise<Blob> => {
    const response = await api.post<Blob>('/billing/usage/actions', { 
      action: 'export_data', 
      ...params 
    }, { responseType: 'blob' });
    return response;
  },
};

// ===== HOOKS =====

/**
 * Get current subscription details
 */
export function useCurrentSubscription(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: billingApi.getCurrentSubscription,
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Get available plans for comparison
 */
export function useAvailablePlans(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: billingApi.getAvailablePlans,
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}

/**
 * Get usage statistics and projections
 */
export function useUsageStats(
  params?: {
    period?: '7d' | '30d' | '90d' | '1y';
    includeProjections?: boolean;
    includeRecommendations?: boolean;
    detailedBreakdown?: boolean;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['billing', 'usage', params],
    queryFn: () => billingApi.getUsageStats(params),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
  });
}

/**
 * Get payment methods
 */
export function usePaymentMethods(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['billing', 'payment-methods'],
    queryFn: billingApi.getPaymentMethods,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Get invoices with pagination
 */
export function useInvoices(
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'created' | 'amount' | 'dueDate';
    sortOrder?: 'asc' | 'desc';
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['billing', 'invoices', params],
    queryFn: () => billingApi.getInvoices(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Get specific invoice details
 */
export function useInvoiceById(invoiceId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['billing', 'invoices', invoiceId],
    queryFn: () => billingApi.getInvoiceById(invoiceId!),
    enabled: (options?.enabled ?? true) && !!invoiceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Create checkout session for plan upgrade
 */
export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingApi.createCheckoutSession,
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.sessionUrl;
    },
    onError: (error) => {
      console.error('Checkout session creation failed:', error);
    },
  });
}

/**
 * Change subscription plan
 */
export function useChangePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingApi.changePlan,
    onSuccess: () => {
      // Invalidate subscription and usage data
      queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
    onError: (error) => {
      console.error('Usage counter reset failed:', error);
    },
  });
}

/**
 * Export usage data
 */
export function useExportUsageData() {
  return useMutation({
    mutationFn: billingApi.exportUsageData,
    onSuccess: (data, variables) => {
      // Create download link
      const mimeType = {
        csv: 'text/csv',
        json: 'application/json',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }[variables.exportFormat];

      const blob = new Blob([data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `usage-data-${new Date().toISOString().split('T')[0]}.${variables.exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Usage data export failed:', error);
    },
  });
}

/**
 * Comprehensive billing status hook
 */
export function useBillingStatus() {
  const subscription = useCurrentSubscription();
  const usage = useUsageStats({ includeRecommendations: true });
  const paymentMethods = usePaymentMethods();

  return {
    subscription: subscription.data,
    usage: usage.data,
    paymentMethods: paymentMethods.data?.paymentMethods,
    isLoading: subscription.isLoading || usage.isLoading || paymentMethods.isLoading,
    error: subscription.error || usage.error || paymentMethods.error,
    
    // Computed values
    isActive: subscription.data?.status === 'active',
    isTrialing: subscription.data?.status === 'trialing',
    isPastDue: subscription.data?.status === 'past_due',
    willCancelAtPeriodEnd: subscription.data?.cancelAtPeriodEnd,
    daysUntilRenewal: subscription.data?.billing.daysUntilRenewal,
    
    // Usage alerts
    usageAlerts: usage.data?.utilizationPercentage ? Object.entries(usage.data.utilizationPercentage)
      .filter(([_, percentage]) => (percentage as number) > 80)
      .map(([resource, percentage]) => ({
        resource,
        percentage: percentage as number,
        severity: (percentage as number) > 95 ? 'critical' : 'warning',
      })) : [],
    
    // Payment status
    hasValidPaymentMethod: paymentMethods.data?.paymentMethods?.some(pm => pm.isDefault) ?? false,
    
    // Recommendations
    recommendations: usage.data?.recommendations || [],
  };
}

/**
 * Plan upgrade recommendations
 */
export function usePlanRecommendations() {
  const subscription = useCurrentSubscription();
  const usage = useUsageStats({ includeProjections: true });
  const plans = useAvailablePlans();

  return useQuery({
    queryKey: ['billing', 'recommendations', subscription.data?.currentPlan, usage.data?.utilizationPercentage],
    queryFn: () => {
      if (!subscription.data || !usage.data || !plans.data) {
        return { shouldUpgrade: false, recommendations: [] };
      }

      const currentPlan = subscription.data.currentPlan;
      const utilization = usage.data.utilizationPercentage;
      const projections = usage.data.projections;
      
      const recommendations = [];
      let shouldUpgrade = false;

      // Check current usage
      Object.entries(utilization).forEach(([resource, percentage]) => {
        if (percentage > 90) {
          shouldUpgrade = true;
          recommendations.push({
            reason: `${resource} usage is at ${Math.round(percentage)}%`,
            urgency: 'high',
            suggestedAction: 'Upgrade to avoid service interruption',
          });
        } else if (percentage > 75) {
          recommendations.push({
            reason: `${resource} usage is at ${Math.round(percentage)}%`,
            urgency: 'medium',
            suggestedAction: 'Consider upgrading to allow for growth',
          });
        }
      });

      // Check projections
      if (projections.nextMonth.likelihood === 'high') {
        if (projections.nextMonth.votes > subscription.data.planLimits.votes) {
          shouldUpgrade = true;
          recommendations.push({
            reason: 'Projected to exceed vote limits next month',
            urgency: 'medium',
            suggestedAction: 'Upgrade before hitting limits',
          });
        }
        
        if (projections.nextMonth.certificates > subscription.data.planLimits.certificates) {
          shouldUpgrade = true;
          recommendations.push({
            reason: 'Projected to exceed certificate limits next month',
            urgency: 'medium',
            suggestedAction: 'Upgrade to ensure continuous service',
          });
        }
      }

      // Find best upgrade path
      let suggestedPlan: PlanType | null = null;
      if (shouldUpgrade) {
        const planOrder: PlanType[] = ['foundation', 'growth', 'premium', 'enterprise'];
        const currentIndex = planOrder.indexOf(currentPlan);
        if (currentIndex < planOrder.length - 1) {
          suggestedPlan = planOrder[currentIndex + 1];
        }
      }

      return {
        shouldUpgrade,
        recommendations,
        suggestedPlan,
        currentUsage: utilization,
        projections,
      };
    },
    enabled: !!(subscription.data && usage.data && plans.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Invoice summary for dashboard
 */
export function useInvoiceSummary() {
  return useInvoices({ limit: 5, sortBy: 'created', sortOrder: 'desc' });
}

/**
 * Subscription health check
 */
export function useSubscriptionHealth() {
  const subscription = useCurrentSubscription();
  const paymentMethods = usePaymentMethods();
  
  return useQuery({
    queryKey: ['billing', 'health', subscription.data?.status, paymentMethods.data?.paymentMethods?.length],
    queryFn: () => {
      if (!subscription.data) {
        return { score: 0, status: 'unknown', issues: ['No subscription data'] };
      }

      let score = 100;
      const issues: string[] = [];
      
      // Check subscription status
      if (subscription.data.status === 'past_due') {
        score -= 50;
        issues.push('Payment overdue');
      } else if (subscription.data.status === 'canceled') {
        score -= 100;
        issues.push('Subscription canceled');
      } else if (subscription.data.status !== 'active' && subscription.data.status !== 'trialing') {
        score -= 30;
        issues.push(`Subscription status: ${subscription.data.status}`);
      }

      // Check payment method
      if (!paymentMethods.data?.paymentMethods?.length) {
        score -= 25;
        issues.push('No payment method on file');
      }

      // Check trial status
      if (subscription.data.status === 'trialing' && subscription.data.billing.daysUntilRenewal <= 7) {
        score -= 15;
        issues.push('Trial ending soon');
      }

      // Check cancellation
      if (subscription.data.cancelAtPeriodEnd) {
        score -= 20;
        issues.push('Set to cancel at period end');
      }

      let status: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
      if (score < 50) status = 'critical';
      else if (score < 80) status = 'warning';

      return { score: Math.max(0, score), status, issues };
    },
    enabled: !!subscription.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Billing notifications and alerts
 */
export function useBillingAlerts() {
  const subscription = useCurrentSubscription();
  const usage = useUsageStats();
  const health = useSubscriptionHealth();

  return useQuery({
    queryKey: ['billing', 'alerts'],
    queryFn: () => {
      const alerts: Array<{
        id: string;
        type: 'info' | 'warning' | 'error';
        title: string;
        message: string;
        actionRequired?: boolean;
        actionUrl?: string;
      }> = [];

      if (subscription.data) {
        // Trial ending
        if (subscription.data.status === 'trialing' && subscription.data.billing.daysUntilRenewal <= 7) {
          alerts.push({
            id: 'trial-ending',
            type: 'warning',
            title: 'Trial Ending Soon',
            message: `Your trial ends in ${subscription.data.billing.daysUntilRenewal} days. Add a payment method to continue.`,
            actionRequired: true,
            actionUrl: '/billing/payment-methods',
          });
        }

        // Payment overdue
        if (subscription.data.status === 'past_due') {
          alerts.push({
            id: 'payment-overdue',
            type: 'error',
            title: 'Payment Overdue',
            message: 'Your payment is overdue. Please update your payment method to avoid service interruption.',
            actionRequired: true,
            actionUrl: '/billing/payment-methods',
          });
        }

        // Cancellation scheduled
        if (subscription.data.cancelAtPeriodEnd) {
          alerts.push({
            id: 'cancellation-scheduled',
            type: 'warning',
            title: 'Cancellation Scheduled',
            message: `Your subscription will cancel on ${new Date(subscription.data.currentPeriodEnd).toLocaleDateString()}.`,
            actionRequired: false,
            actionUrl: '/billing/subscription',
          });
        }
      }

      // Usage alerts
      if (usage.data?.utilizationPercentage) {
        Object.entries(usage.data.utilizationPercentage).forEach(([resource, percentage]) => {
          if (percentage > 90) {
            alerts.push({
              id: `usage-${resource}`,
              type: 'warning',
              title: `${resource.charAt(0).toUpperCase() + resource.slice(1)} Usage High`,
              message: `You're using ${Math.round(percentage)}% of your ${resource} quota.`,
              actionRequired: true,
              actionUrl: '/billing/plans',
            });
          }
        });
      }

      return alerts.sort((a, b) => {
        const order = { error: 0, warning: 1, info: 2 };
        return order[a.type] - order[b.type];
      });
    },
    enabled: !!(subscription.data || usage.data),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: () => {
      // Invalidate subscription data
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
    onError: (error) => {
      console.error('Subscription cancellation failed:', error);
    },
  });
}

/**
 * Update payment method
 */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingApi.updatePaymentMethod,
    onSuccess: () => {
      // Invalidate payment methods and subscription
      queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
    onError: (error) => {
      console.error('Payment method update failed:', error);
    },
  });
}

/**
 * Delete payment method
 */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingApi.deletePaymentMethod,
    onSuccess: () => {
      // Invalidate payment methods
      queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] });
    },
    onError: (error) => {
      console.error('Payment method deletion failed:', error);
    },
  });
}

/**
 * Download invoice
 */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: billingApi.downloadInvoice,
    onSuccess: (data, invoiceId) => {
      // Create download link
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Invoice download failed:', error);
    },
  });
}

/**
 * Resend invoice
 */
export function useResendInvoice() {
  return useMutation({
    mutationFn: ({ invoiceId, email }: { invoiceId: string; email?: string }) =>
      billingApi.resendInvoice(invoiceId, email),
    onError: (error) => {
      console.error('Invoice resend failed:', error);
    },
  });
}

/**
 * Reset usage counters
 */
export function useResetUsageCounters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingApi.resetUsageCounters,
    onSuccess: () => {
      // Invalidate usage data
      queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
    onError: (error) => {
      console.error('Usage counter reset failed:', error);
    },
  });
}