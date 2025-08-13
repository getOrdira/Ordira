// /src/app/api/billing/subscriptions/current/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { resolveTenant } from '@/lib/tenant';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

/**
 * GET /api/billing/subscriptions/current
 * Get detailed current subscription information
 * 
 * @requires authentication & tenant context
 * @rate-limited: 60 requests per minute
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 60 requests per minute
    const rateLimitResult = await rateLimit(request, {
      identifier: 'billing-subscription-current',
      limit: 60,
      window: 60 * 1000
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimitResult.resetTime },
        { status: 429 }
      );
    }

    // Authentication
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tenant resolution
    const tenant = await resolveTenant(request, user);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    // Forward request to backend
    const response = await backendFetch('/api/billing/plan', {
      method: 'GET',
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const subscriptionData = await response.json();

    // Enhanced response with subscription-specific insights
    const enhancedResponse = {
      subscription: {
        ...subscriptionData.currentPlan,
        health: assessSubscriptionHealth(subscriptionData),
        lifecycle: calculateSubscriptionLifecycle(subscriptionData),
        renewalInfo: generateRenewalInfo(subscriptionData),
        changeHistory: generateChangeHistory(subscriptionData)
      },
      billing: {
        ...subscriptionData.billing,
        paymentStatus: assessPaymentStatus(subscriptionData.billing),
        nextChargeBreakdown: generateChargeBreakdown(subscriptionData),
        billingCycle: calculateBillingCycle(subscriptionData.billing)
      },
      usage: {
        ...subscriptionData.usage,
        trendsAnalysis: generateUsageTrends(subscriptionData.usage),
        forecastedUsage: forecastNextPeriodUsage(subscriptionData.usage),
        optimizationSuggestions: generateOptimizationSuggestions(subscriptionData.usage)
      },
      value: {
        featureUtilization: calculateFeatureUtilization(subscriptionData),
        costEfficiency: calculateCostEfficiency(subscriptionData),
        roi: calculateSubscriptionROI(subscriptionData),
        valueRealization: assessValueRealization(subscriptionData)
      },
      actions: {
        availableActions: getAvailableActions(subscriptionData),
        recommendations: generateActionRecommendations(subscriptionData),
        quickActions: getQuickActions(subscriptionData),
        upcomingActions: getUpcomingActions(subscriptionData)
      },
      support: {
        subscriptionSupport: {
          available: true,
          channels: getSupportChannels(tenant.plan),
          priority: getSupportPriority(tenant.plan),
          responseTime: getExpectedResponseTime(tenant.plan)
        },
        accountManager: tenant.plan === 'enterprise' ? {
          assigned: true,
          contact: 'Your dedicated account manager will contact you',
          nextMeeting: null // Would be populated from actual data
        } : null
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        dataFreshness: 'real-time',
        cacheExpiry: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
        lastUpdated: new Date().toISOString()
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=120', // 2 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Subscription-Status': subscriptionData.currentPlan?.subscriptionStatus || 'unknown'
      }
    });

  } catch (error) {
    console.error('Current subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription information' },
      { status: 500 }
    );
  }
}

// Helper functions for subscription analysis
function assessSubscriptionHealth(data: any): {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  factors: string[];
} {
  let score = 100;
  const factors = [];
  
  // Payment health
  if (data.billing?.paymentMethod?.status !== 'active') {
    score -= 30;
    factors.push('Payment method issue detected');
  }
  
  // Usage patterns
  const overusage = Object.values(data.usage?.utilizationPercentage || {})
    .some((util: any) => util > 100);
  if (overusage) {
    score -= 20;
    factors.push('Usage exceeding plan limits');
  }
  
  // Billing status
  if (data.currentPlan?.cancelAtPeriodEnd) {
    score -= 40;
    factors.push('Subscription set to cancel');
  }
  
  let status: 'healthy' | 'warning' | 'critical';
  if (score >= 80) status = 'healthy';
  else if (score >= 60) status = 'warning';
  else status = 'critical';
  
  return { status, score, factors };
}

function calculateSubscriptionLifecycle(data: any): {
  phase: 'trial' | 'new' | 'established' | 'mature' | 'at_risk';
  daysActive: number;
  milestones: any[];
} {
  const startDate = data.currentPlan?.startDate ? 
    new Date(data.currentPlan.startDate) : new Date();
  const daysActive = Math.floor(
    (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  let phase: 'trial' | 'new' | 'established' | 'mature' | 'at_risk';
  if (daysActive < 14) phase = 'trial';
  else if (daysActive < 90) phase = 'new';
  else if (daysActive < 365) phase = 'established';
  else if (!data.currentPlan?.cancelAtPeriodEnd) phase = 'mature';
  else phase = 'at_risk';
  
  const milestones = [
    { name: '30 days active', achieved: daysActive >= 30 },
    { name: '90 days active', achieved: daysActive >= 90 },
    { name: '1 year active', achieved: daysActive >= 365 },
    { name: 'First upgrade', achieved: data.usage?.hasUpgraded || false }
  ];
  
  return { phase, daysActive, milestones };
}

function generateRenewalInfo(data: any): any {
  const nextRenewal = data.billing?.nextInvoiceDate ? 
    new Date(data.billing.nextInvoiceDate) : null;
  
  if (!nextRenewal) return { autoRenewal: false, nextDate: null };
  
  const daysUntilRenewal = Math.ceil(
    (nextRenewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  return {
    autoRenewal: !data.currentPlan?.cancelAtPeriodEnd,
    nextDate: nextRenewal.toISOString(),
    daysUntilRenewal,
    amount: data.billing?.nextInvoiceAmount || 0,
    discounts: data.discounts || [],
    warnings: daysUntilRenewal <= 7 ? ['Renewal approaching'] : []
  };
}

function generateChangeHistory(data: any): any[] {
  // This would typically come from backend data
  // For now, return a mock structure
  return [
    {
      date: new Date().toISOString(),
      action: 'subscription_created',
      plan: data.currentPlan?.id,
      details: 'Initial subscription created'
    }
  ];
}

function assessPaymentStatus(billing: any): {
  status: 'current' | 'past_due' | 'failed' | 'requires_action';
  lastPayment: string | null;
  nextPayment: string | null;
  issues: string[];
} {
  return {
    status: billing?.status === 'active' ? 'current' : 'requires_action',
    lastPayment: billing?.lastPaymentDate || null,
    nextPayment: billing?.nextInvoiceDate || null,
    issues: []
  };
}

function generateChargeBreakdown(data: any): any {
  const baseAmount = data.billing?.nextInvoiceAmount || 0;
  
  return {
    subtotal: baseAmount,
    discounts: 0,
    taxes: baseAmount * 0.08, // Example tax rate
    total: baseAmount * 1.08,
    items: [
      {
        description: `${data.currentPlan?.name || 'Current'} Plan`,
        amount: baseAmount,
        quantity: 1
      }
    ]
  };
}

function calculateBillingCycle(billing: any): any {
  return {
    frequency: 'monthly', // Would come from actual data
    dayOfMonth: billing?.nextInvoiceDate ? 
      new Date(billing.nextInvoiceDate).getDate() : null,
    timezone: 'UTC'
  };
}

function generateUsageTrends(usage: any): any {
  return {
    direction: 'stable', // 'increasing', 'decreasing', 'stable'
    growthRate: 0,
    seasonality: 'none',
    anomalies: []
  };
}

function forecastNextPeriodUsage(usage: any): any {
  return {
    apiCalls: (usage.current?.apiCalls || 0) * 1.1, // 10% growth estimate
    certificates: (usage.current?.certificates || 0) * 1.05,
    votes: (usage.current?.votes || 0) * 1.0,
    confidence: 'medium'
  };
}

function generateOptimizationSuggestions(usage: any): string[] {
  const suggestions = [];
  
  if (usage.utilizationPercentage?.apiCalls > 80) {
    suggestions.push('API usage is high - consider caching or optimization');
  }
  
  if (usage.utilizationPercentage?.certificates > 80) {
    suggestions.push('Certificate usage approaching limit - consider archiving old certificates');
  }
  
  return suggestions;
}

function calculateFeatureUtilization(data: any): any {
  return {
    overall: 65, // Percentage
    breakdown: {
      apiKeys: 80,
      certificates: 45,
      voting: 30,
      analytics: 90
    }
  };
}

function calculateCostEfficiency(data: any): any {
  return {
    costPerApiCall: 0.001,
    costPerCertificate: 0.10,
    costPerVote: 0.05,
    monthlyValue: calculateMonthlyValue(data),
    benchmarkComparison: 'above_average' // compared to industry
  };
}

function calculateSubscriptionROI(data: any): any {
  const monthlySpend = data.billing?.nextInvoiceAmount || 0;
  const estimatedValue = calculateMonthlyValue(data);
  
  return {
    roi: monthlySpend > 0 ? ((estimatedValue - monthlySpend) / monthlySpend) * 100 : 0,
    paybackPeriod: 'immediate',
    valueGenerated: estimatedValue,
    costSavings: estimatedValue - monthlySpend
  };
}

function assessValueRealization(data: any): any {
  return {
    score: 75, // Percentage of value being realized
    underutilizedFeatures: [
      'Advanced Analytics',
      'API Webhooks',
      'Custom Integrations'
    ],
    maxValuePotential: 'high',
    improvementAreas: [
      'Increase API usage efficiency',
      'Utilize more advanced features',
      'Implement automation workflows'
    ]
  };
}

function getAvailableActions(data: any): any[] {
  const actions = [];
  
  if (data.currentPlan?.id !== 'enterprise') {
    actions.push({
      id: 'upgrade_plan',
      title: 'Upgrade Plan',
      description: 'Access more features and higher limits',
      type: 'primary',
      urgent: false
    });
  }
  
  if (data.currentPlan?.id !== 'foundation') {
    actions.push({
      id: 'downgrade_plan',
      title: 'Downgrade Plan',
      description: 'Reduce costs with a lower-tier plan',
      type: 'secondary',
      urgent: false
    });
  }
  
  actions.push({
    id: 'update_payment',
    title: 'Update Payment Method',
    description: 'Change or update your payment information',
    type: 'neutral',
    urgent: false
  });
  
  if (data.currentPlan?.cancelAtPeriodEnd) {
    actions.push({
      id: 'reactivate_subscription',
      title: 'Reactivate Subscription',
      description: 'Cancel the scheduled cancellation',
      type: 'primary',
      urgent: true
    });
  } else {
    actions.push({
      id: 'cancel_subscription',
      title: 'Cancel Subscription',
      description: 'Cancel your subscription at the end of the billing period',
      type: 'danger',
      urgent: false
    });
  }
  
  return actions;
}

function generateActionRecommendations(data: any): string[] {
  const recommendations = [];
  
  const usage = data.usage?.utilizationPercentage || {};
  const highUsage = Object.values(usage).some((util: any) => util > 80);
  
  if (highUsage && data.currentPlan?.id !== 'enterprise') {
    recommendations.push('Consider upgrading to avoid hitting usage limits');
  }
  
  if (data.currentPlan?.id === 'foundation' && Object.values(usage).every((util: any) => util < 30)) {
    recommendations.push('Current plan may be sufficient for your usage patterns');
  }
  
  if (!data.billing?.paymentMethod) {
    recommendations.push('Add a payment method to ensure uninterrupted service');
  }
  
  return recommendations;
}

function getQuickActions(data: any): any[] {
  return [
    {
      id: 'view_usage',
      title: 'View Detailed Usage',
      icon: 'chart',
      url: '/billing/usage'
    },
    {
      id: 'download_invoice',
      title: 'Download Latest Invoice',
      icon: 'download',
      url: '/billing/invoices/latest'
    },
    {
      id: 'update_billing',
      title: 'Update Billing Info',
      icon: 'credit-card',
      url: '/billing/payment-methods'
    }
  ];
}

function getUpcomingActions(data: any): any[] {
  const upcoming = [];
  
  const renewalInfo = generateRenewalInfo(data);
  if (renewalInfo.daysUntilRenewal <= 30) {
    upcoming.push({
      date: renewalInfo.nextDate,
      action: 'Subscription Renewal',
      amount: renewalInfo.amount,
      automatic: renewalInfo.autoRenewal
    });
  }
  
  return upcoming;
}

function getSupportChannels(plan: string): string[] {
  const channels = ['Email Support', 'Help Center'];
  
  if (['premium', 'enterprise'].includes(plan)) {
    channels.push('Priority Support');
  }
  
  if (plan === 'enterprise') {
    channels.push('Phone Support', 'Dedicated Account Manager');
  }
  
  return channels;
}

function getSupportPriority(plan: string): 'standard' | 'priority' | 'enterprise' {
  if (plan === 'enterprise') return 'enterprise';
  if (['premium'].includes(plan)) return 'priority';
  return 'standard';
}

function getExpectedResponseTime(plan: string): string {
  switch (plan) {
    case 'enterprise': return '2-4 hours';
    case 'premium': return '4-8 hours';
    case 'growth': return '24 hours';
    default: return '24-48 hours';
  }
}

function calculateMonthlyValue(data: any): number {
  // Simple calculation - would be more sophisticated in real implementation
  const usage = data.usage?.current || {};
  const apiValue = (usage.apiCalls || 0) * 0.002;
  const certValue = (usage.certificates || 0) * 0.50;
  const voteValue = (usage.votes || 0) * 0.10;
  
  return apiValue + certValue + voteValue + 100; // Base platform value
}