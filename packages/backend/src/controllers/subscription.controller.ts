// src/controllers/subscription.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { SubscriptionService } from '../services/business/subscription.service';

// Initialize service
const subscriptionService = new SubscriptionService();


// ====================
// HELPER FUNCTIONS
// ====================

function getAvailableTiersData(): any[] {
  return [
    { id: 'foundation', name: 'Foundation', price: 39.99 },
    { id: 'growth', name: 'Growth', price: 59.99 },
    { id: 'premium', name: 'Premium', price: 119.99 },
    { id: 'enterprise', name: 'Enterprise', price: 499.99 }
  ];
}

function getTierFeatures(tier: string): string[] {
  const features = {
    foundation: ['Basic Analytics', 'Email Support', 'API Access', '1GB Storage'],
    growth: ['Advanced Analytics', 'Priority Support', 'Webhooks', '5GB Storage', 'Custom Branding'],
    premium: ['Real-time Analytics', 'Custom Domain', '25GB Storage', 'Advanced Integrations'],
    enterprise: ['White-label', 'Dedicated Support', 'SLA', '100GB Storage', 'Custom Features', 'On-premise Option']
  };
  return features[tier as keyof typeof features] || [];
}

function generateOnboardingSteps(tier: string): string[] {
  const baseSteps = [
    'Complete profile setup',
    'Upload your first product',
    'Explore analytics dashboard'
  ];

  if (tier === 'enterprise') {
    baseSteps.push('Schedule onboarding call', 'Configure custom features');
  }

  return baseSteps;
}

function calculateHealthScore(subscription: any): { score: number; status: string; factors: string[] } {
  let score = 100;
  const factors: string[] = [];

  // Check usage levels
  if (subscription.usagePercentages.votes > 90) {
    score -= 20;
    factors.push('Vote usage very high');
  } else if (subscription.usagePercentages.votes > 80) {
    score -= 10;
    factors.push('Vote usage high');
  }

  if (subscription.usagePercentages.nfts > 90) {
    score -= 20;
    factors.push('NFT usage very high');
  }

  // Check billing status
  if (subscription.status !== 'active') {
    score -= 30;
    factors.push(`Subscription ${subscription.status}`);
  }

  // Check trial status
  if (subscription.billing.isTrialPeriod) {
    const daysLeft = Math.ceil((new Date(subscription.billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) {
      score -= 15;
      factors.push('Trial ending soon');
    }
  }

  const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';
  return { score, status, factors };
}

function identifyRiskFactors(subscription: any): string[] {
  const risks: string[] = [];

  if (subscription.usagePercentages.votes > 95) {
    risks.push('Vote limit nearly exceeded');
  }

  if (subscription.billing.isTrialPeriod) {
    const daysLeft = Math.ceil((new Date(subscription.billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) {
      risks.push('Trial expiring within 7 days');
    }
  }

  if (subscription.status === 'past_due') {
    risks.push('Payment overdue');
  }

  return risks;
}

function findOptimizationOpportunities(subscription: any): string[] {
  const opportunities: string[] = [];

  // Check for underutilization
  if (subscription.tier !== 'foundation' && subscription.usagePercentages.votes < 30) {
    opportunities.push('Consider downgrading to save costs');
  }

  // Check for consistent high usage
  if (subscription.usagePercentages.votes > 80 && subscription.tier !== 'enterprise') {
    opportunities.push('Upgrade to higher tier for better limits');
  }

  return opportunities;
}

function generateTierComparison(currentTier: string): any {
  const tiers = ['foundation', 'growth', 'premium', 'enterprise'];
  const currentIndex = tiers.indexOf(currentTier);
  
  return {
    current: currentTier,
    canUpgrade: currentIndex < tiers.length - 1,
    canDowngrade: currentIndex > 0,
    nextTier: currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null,
    previousTier: currentIndex > 0 ? tiers[currentIndex - 1] : null
  };
}

function generateImmediateActions(subscription: any): string[] {
  const actions: string[] = [];

  if (subscription.billing.isTrialPeriod) {
    const daysLeft = Math.ceil((new Date(subscription.billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) {
      actions.push('Add billing information to continue service');
    }
  }

  if (subscription.usagePercentages.votes > 90) {
    actions.push('Consider upgrading plan to avoid hitting limits');
  }

  return actions;
}

function generatePlannedActions(subscription: any): string[] {
  return [
    'Review monthly usage patterns',
    'Evaluate tier optimization opportunities',
    'Plan for growth and scaling needs'
  ];
}

function analyzeSubscriptionChanges(current: any, updated: any, changes: any): any {
  const analysis = {
    tierChange: changes.tier && changes.tier !== current.tier,
    billingChange: changes.billingCycle && changes.billingCycle !== current.billing.billingCycle,
    statusChange: changes.status && changes.status !== current.status,
    immediate: [] as string[],
    billing: [] as string[],
    additionalSteps: [] as string[]
  };

  if (analysis.tierChange) {
    analysis.immediate.push(`Tier changed from ${current.tier} to ${changes.tier}`);
    analysis.billing.push('New tier pricing applies from next billing cycle');
  }

  return analysis;
}

function generateImmediateImpact(changes: any): string[] {
  return changes.immediate || [];
}

function generateBillingImpact(changes: any): string[] {
  return changes.billing || [];
}

function generateFeatureImpact(changes: any): string[] {
  return ['Feature access updated based on new tier'];
}

function generateLimitImpact(changes: any): string[] {
  return ['Usage limits updated to match new tier'];
}

function generateWinBackOffers(subscription: any, reason?: string): string[] {
  const offers: string[] = [];
  
  if (reason === 'cost') {
    offers.push('20% discount for next 3 months');
  }
  
  if (subscription.tier !== 'foundation') {
    offers.push('Temporary downgrade option');
  }
  
  return offers;
}

function generateLimitRecommendations(limitCheck: any, limitInfo: any, type: string): string[] {
  const recommendations: string[] = [];
  
  if (!limitCheck.allowed) {
    recommendations.push(`Upgrade your plan for more ${type} capacity`);
    recommendations.push('Consider optimizing your usage patterns');
  }
  
  return recommendations;
}

function generateLimitAlternatives(type: string): string[] {
  return [
    `Optimize your ${type} usage`,
    'Upgrade to a higher tier',
    'Contact support for custom limits'
  ];
}

function getUpgradeOptions(tier: string): string[] { 
  const tiers = ['foundation', 'growth', 'premium', 'enterprise'];
  const currentIndex = tiers.indexOf(tier);
  return tiers.slice(currentIndex + 1);
}

function getDowngradeOptions(tier: string): string[] { 
  const tiers = ['foundation', 'growth', 'premium', 'enterprise'];
  const currentIndex = tiers.indexOf(tier);
  return tiers.slice(0, currentIndex);
}

function generateTierRecommendations(subscription: any): string[] { 
  const recommendations: string[] = [];
  
  if (subscription.usagePercentages.votes > 80) {
    recommendations.push('Consider upgrading for better limits');
  }
  
  return recommendations;
}

function generateUsageWarnings(limits: any): string[] { 
  const warnings: string[] = [];
  
  if (typeof limits === 'object' && limits.percentage > 80) {
    warnings.push('Approaching usage limits');
  }
  
  return warnings;
}

// Placeholder functions for future implementation
function isTrialExpiringSoon(subscription: any): boolean { return false; }
function checkApproachingLimits(subscription: any): any { return null; }
function checkBillingIssues(subscription: any): any { return null; }
function checkUpgradeOpportunities(subscription: any): any { return null; }
function getTierSupportInfo(tier: string): any { return {}; }
function getSupportContactInfo(tier: string): any { return {}; }
function getTierResources(tier: string): any { return {}; }
function calculateUsageEfficiency(overview: any): any { return {}; }
function calculateGrowthMetrics(trends: any): any { return {}; }
function calculateOptimizationMetrics(overview: any): any { return {}; }
function generateBenchmarks(overview: any): any { return {}; }
function generateUsageInsights(overview: any, period: string): any { return {}; }
function generateTrendInsights(trends: any): any { return {}; }
function generateProjectionInsights(projections: any): any { return {}; }
function generateOpportunityInsights(overview: any, metrics: any): any { return {}; }

// ====================
// CONTROLLER FUNCTIONS
// ====================
interface TenantSubscriptionRequest extends Request, AuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface SubscriptionCreateRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedBody: {
    tier: 'foundation' | 'growth' | 'premium' | 'enterprise';
    billingCycle?: 'monthly' | 'yearly';
    isTrialPeriod?: boolean;
    trialDays?: number;
    stripeSubscriptionId?: string;
  };
}

interface SubscriptionUpdateRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedBody: {
    tier?: 'foundation' | 'growth' | 'premium' | 'enterprise';
    status?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
    billingCycle?: 'monthly' | 'yearly';
    cancelAtPeriodEnd?: boolean;
  };
}

interface SubscriptionCancelRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedBody: {
    cancelImmediately?: boolean;
    reason?: string;
    feedback?: string;
  };
}

interface UsageCheckRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedBody: {
    type: 'votes' | 'nfts' | 'api';
    count?: number;
  };
}

interface AnalyticsRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedQuery: {
    period?: '7d' | '30d' | '90d' | '1y';
    includeProjections?: boolean;
    includeTrends?: boolean;
  };
}

/**
 * Extended request interfaces for type safety
 */
interface TenantSubscriptionRequest extends Request, AuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface SubscriptionCreateRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedBody: {
    tier: 'foundation' | 'growth' | 'premium' | 'enterprise';
    billingCycle?: 'monthly' | 'yearly';
    isTrialPeriod?: boolean;
    trialDays?: number;
    stripeSubscriptionId?: string;
  };
}

interface SubscriptionUpdateRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedBody: {
    tier?: 'foundation' | 'growth' | 'premium' | 'enterprise';
    status?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
    billingCycle?: 'monthly' | 'yearly';
    cancelAtPeriodEnd?: boolean;
  };
}

interface SubscriptionCancelRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedBody: {
    cancelImmediately?: boolean;
    reason?: string;
    feedback?: string;
  };
}

interface UsageCheckRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedBody: {
    type: 'votes' | 'nfts' | 'api';
    count?: number;
  };
}

interface AnalyticsRequest extends TenantSubscriptionRequest, ValidatedRequest {
  validatedQuery: {
    period?: '7d' | '30d' | '90d' | '1y';
    includeProjections?: boolean;
    includeTrends?: boolean;
  };
}

/**
 * Get current subscription details with comprehensive information
 * GET /api/subscription
 */
export const getCurrentSubscription = asyncHandler(async (
  req: TenantSubscriptionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;

  try {
    // Get comprehensive subscription data
    const [subscription, analytics] = await Promise.all([
      subscriptionService.getSubscription(businessId),
      subscriptionService.getSubscriptionAnalytics(businessId)
    ]);

    // Calculate additional insights
    const insights = {
      healthScore: calculateHealthScore(subscription),
      riskFactors: identifyRiskFactors(subscription),
      optimizationOpportunities: findOptimizationOpportunities(subscription),
      tierComparison: generateTierComparison(subscription.tier)
    };

    // Generate actionable recommendations
    const actions = {
      immediate: generateImmediateActions(subscription),
      suggested: analytics.recommendations,
      planned: generatePlannedActions(subscription)
    };

    res.json({
      success: true,
      message: 'Subscription details retrieved successfully',
      data: {
        subscription,
        analytics: {
          trends: analytics.trends,
          projections: analytics.projections,
          insights
        },
        actions,
        notifications: {
          trialExpiring: subscription.billing.isTrialPeriod && isTrialExpiringSoon(subscription),
          limitsApproaching: checkApproachingLimits(subscription),
          billingIssues: checkBillingIssues(subscription),
          upgradeOpportunities: checkUpgradeOpportunities(subscription)
        },
        support: {
          tierSupport: getTierSupportInfo(subscription.tier),
          contactInfo: getSupportContactInfo(subscription.tier),
          resources: getTierResources(subscription.tier)
        },
        retrievedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error.statusCode === 404) {
      // No subscription exists - provide setup information
      res.json({
        success: true,
        message: 'No subscription found - setup required',
        data: {
          hasSubscription: false,
          setupRequired: true,
          availableTiers: getAvailableTiersData(),
          defaultTier: 'foundation',
          trialAvailable: true,
          trialDays: 14,
          setupSteps: [
            'Choose your subscription tier',
            'Enter billing information',
            'Confirm subscription',
            'Start using the platform'
          ]
        }
      });
    } else {
      next(error);
    }
  }
});

/**
 * Create a new subscription
 * POST /api/subscription
 */
export const createSubscription = asyncHandler(async (
  req: SubscriptionCreateRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const subscriptionData = req.validatedBody;

  // Validate tier selection
  if (!['foundation', 'growth', 'premium', 'enterprise'].includes(subscriptionData.tier)) {
    throw createAppError('Invalid subscription tier', 400, 'INVALID_TIER');
  }

  // Create subscription
  const subscription = await subscriptionService.createSubscription({
    businessId,
    ...subscriptionData
  });

  // Generate onboarding information
  const onboarding = {
    nextSteps: generateOnboardingSteps(subscription.tier),
    features: getTierFeatures(subscription.tier),
    limits: subscription.limits,
    resources: {
      documentation: '/docs/getting-started',
      tutorials: `/tutorials/${subscription.tier}`,
      support: '/support/contact',
      community: '/community'
    }
  };

  res.status(201).json({
    success: true,
    message: `${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} subscription created successfully`,
    data: {
      subscription,
      onboarding,
      trial: subscription.billing.isTrialPeriod ? {
        daysRemaining: Math.ceil((new Date(subscription.billing.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        features: 'Full access to all features during trial',
        upgradeReminder: 'Remember to add billing information before trial expires'
      } : null,
      createdAt: new Date().toISOString()
    }
  });
});

/**
 * Update subscription (tier change, billing cycle, etc.)
 * PUT /api/subscription
 */
export const updateSubscription = asyncHandler(async (
  req: SubscriptionUpdateRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const updateData = req.validatedBody;

  if (Object.keys(updateData).length === 0) {
    throw createAppError('No update data provided', 400, 'EMPTY_UPDATE_DATA');
  }

  // Get current subscription for comparison
  const currentSubscription = await subscriptionService.getSubscription(businessId);

  // Update subscription
  const updatedSubscription = await subscriptionService.updateSubscription(businessId, updateData);

  // Analyze the changes made
  const changes = analyzeSubscriptionChanges(currentSubscription, updatedSubscription, updateData);

  // Generate impact assessment
  const impact = {
    immediate: generateImmediateImpact(changes),
    billing: generateBillingImpact(changes),
    features: generateFeatureImpact(changes),
    limits: generateLimitImpact(changes)
  };

  res.json({
    success: true,
    message: 'Subscription updated successfully',
    data: {
      subscription: updatedSubscription,
      changes,
      impact,
      effective: {
        immediately: changes.immediate || [],
        nextBillingCycle: changes.billing || [],
        additionalSteps: changes.additionalSteps || []
      },
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Cancel subscription with feedback collection
 * POST /api/subscription/cancel
 */
export const cancelSubscription = asyncHandler(async (
  req: SubscriptionCancelRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { cancelImmediately = false, reason, feedback } = req.validatedBody;

  // Get current subscription
  const subscription = await subscriptionService.getSubscription(businessId);

  // Perform cancellation
  const cancellationResult = await subscriptionService.cancelSubscription(
    businessId,
    cancelImmediately,
    reason
  );

  // Generate data export offer
  const dataExport = {
    available: true,
    includes: ['Products', 'NFT Certificates', 'Analytics Data', 'Billing History'],
    requestUrl: '/api/subscription/export-data',
    expiresIn: '30 days after cancellation'
  };

  // Provide alternatives and win-back offers
  const alternatives = {
    pause: !cancelImmediately ? 'Consider pausing instead of canceling' : null,
    downgrade: subscription.tier !== 'foundation' ? 'Consider downgrading to a lower tier' : null,
    feedback: feedback ? 'Thank you for your feedback - we\'ll use it to improve' : 'We\'d love to hear why you\'re canceling',
    winBack: generateWinBackOffers(subscription, reason)
  };

  res.json({
    success: true,
    message: cancelImmediately ? 'Subscription canceled immediately' : 'Subscription will be canceled at the end of the billing period',
    data: {
      cancellation: {
        ...cancellationResult,
        type: cancelImmediately ? 'immediate' : 'end_of_period',
        reason: reason || 'No reason provided',
        feedback: feedback || null
      },
      access: {
        remainingAccess: cancelImmediately ? 'Access terminated immediately' : `Access continues until ${cancellationResult.effectiveDate.toDateString()}`,
        dataRetention: 'Data will be retained for 90 days',
        reactivationPeriod: '30 days'
      },
      alternatives,
      dataExport,
      support: {
        available: true,
        message: 'Our support team is here to help if you change your mind',
        contact: '/support/contact',
        reactivation: '/subscription/reactivate'
      },
      canceledAt: new Date().toISOString()
    }
  });
});

/**
 * Check usage limits before performing actions
 * POST /api/subscription/check-limits
 */
export const checkUsageLimits = asyncHandler(async (
  req: UsageCheckRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { type, count = 1 } = req.validatedBody;

  let limitCheck;
  let limitInfo;

  switch (type) {
    case 'votes':
      [limitCheck, limitInfo] = await Promise.all([
        subscriptionService.checkVotingLimits(businessId, count),
        subscriptionService.getVotingLimits(businessId)
      ]);
      break;
    case 'nfts':
      [limitCheck, limitInfo] = await Promise.all([
        subscriptionService.checkNftLimits(businessId, count),
        subscriptionService.getNftLimits(businessId)
      ]);
      break;
    case 'api':
      limitCheck = await subscriptionService.checkApiLimits(businessId, count);
      limitInfo = { message: 'API limit information' };
      break;
    default:
      throw createAppError('Invalid usage type', 400, 'INVALID_USAGE_TYPE');
  }

  // Generate recommendations based on limit status
  const recommendations = generateLimitRecommendations(limitCheck, limitInfo, type);

  res.json({
    success: true,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} limit check completed`,
    data: {
      check: limitCheck,
      limits: limitInfo,
      recommendations,
      alternatives: limitCheck.allowed ? null : generateLimitAlternatives(type),
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Get detailed subscription analytics and usage patterns
 * GET /api/subscription/analytics
 */
export const getSubscriptionAnalytics = asyncHandler(async (
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { period = '30d', includeProjections = true, includeTrends = true } = req.validatedQuery;

  // Get comprehensive analytics
  const analytics = await subscriptionService.getSubscriptionAnalytics(businessId);

  // Calculate additional metrics
  const metrics = {
    efficiency: calculateUsageEfficiency(analytics.overview),
    growth: calculateGrowthMetrics(analytics.trends),
    optimization: calculateOptimizationMetrics(analytics.overview),
    benchmarks: generateBenchmarks(analytics.overview)
  };

  // Generate insights
  const insights = {
    usage: generateUsageInsights(analytics.overview, period),
    trends: includeTrends ? generateTrendInsights(analytics.trends) : null,
    projections: includeProjections ? generateProjectionInsights(analytics.projections) : null,
    opportunities: generateOpportunityInsights(analytics.overview, metrics)
  };

  res.json({
    success: true,
    message: 'Subscription analytics retrieved successfully',
    data: {
      overview: analytics.overview,
      metrics,
      insights,
      trends: includeTrends ? analytics.trends : null,
      projections: includeProjections ? analytics.projections : null,
      recommendations: analytics.recommendations,
      period,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get available subscription tiers and their features
 * GET /api/subscription/tiers
 */
export const getAvailableTiers = asyncHandler(async (
  req: TenantSubscriptionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;

  // Get current subscription if exists
  let currentSubscription = null;
  try {
    currentSubscription = await subscriptionService.getSubscription(businessId);
  } catch (error) {
    // No subscription exists - that's fine
  }

  // Define all available tiers
  const tiers = {
    foundation: {
      id: 'foundation',
      name: 'Foundation',
      price: { monthly: 39, yearly: 479 },
      limits: { votes: 100, nfts: 50, api: 500, storage: 1 },
      features: getTierFeatures('foundation'),
      recommended: false,
      popular: false
    },
    growth: {
      id: 'growth',
      name: 'Growth',
      price: { monthly: 59, yearly: 720 },
      limits: { votes: 500, nfts: 150, api: 2000, storage: 5 },
      features: getTierFeatures('growth'),
      recommended: true,
      popular: true
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      price: { monthly: 119, yearly: 1428 },
      limits: { votes: 2000, nfts: 300, api: 10000, storage: 25 },
      features: getTierFeatures('premium'),
      recommended: false,
      popular: false
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      price: { monthly: 499, yearly: 4788 },
      limits: { votes: 'unlimited', nfts: 'unlimited', api: 'unlimited', storage: 100 },
      features: getTierFeatures('enterprise'),
      recommended: false,
      popular: false,
      customPricing: true
    }
  };

  // Add comparison information if user has current subscription
  const comparison = currentSubscription ? {
    current: currentSubscription.tier,
    upgrades: getUpgradeOptions(currentSubscription.tier),
    downgrades: getDowngradeOptions(currentSubscription.tier),
    recommendations: generateTierRecommendations(currentSubscription)
  } : null;

  res.json({
    success: true,
    message: 'Available subscription tiers retrieved successfully',
    data: {
      tiers,
      current: currentSubscription?.tier || null,
      comparison,
      trial: {
        available: !currentSubscription,
        duration: 14,
        includes: 'Full access to Growth tier features'
      },
      billing: {
        currencies: ['USD'],
        methods: ['Credit Card', 'ACH', 'Wire Transfer'],
        cycles: ['monthly', 'yearly'],
        discounts: {
          yearly: '20% off annual plans',
          enterprise: 'Custom pricing available'
        }
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Record usage for billing and limit tracking
 * POST /api/subscription/usage
 */
export const recordUsage = asyncHandler(async (
  req: UsageCheckRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;
  const { type, count = 1 } = req.validatedBody;

  // Record the usage
  switch (type) {
    case 'votes':
      await subscriptionService.recordVoteUsage(businessId, count);
      break;
    case 'nfts':
      await subscriptionService.recordNftUsage(businessId, count);
      break;
    case 'api':
      await subscriptionService.recordApiUsage(businessId, count);
      break;
    default:
      throw createAppError('Invalid usage type', 400, 'INVALID_USAGE_TYPE');
  }

  // Get updated limits
  const limits = type === 'votes' 
    ? await subscriptionService.getVotingLimits(businessId)
    : type === 'nfts'
    ? await subscriptionService.getNftLimits(businessId)
    : { message: 'API usage recorded' };

  res.json({
    success: true,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} usage recorded successfully`,
    data: {
      recorded: {
        type,
        count,
        timestamp: new Date().toISOString()
      },
      currentLimits: limits,
      warnings: generateUsageWarnings(limits),
      recordedAt: new Date().toISOString()
    }
  });
});

/**
 * Reset usage for testing purposes (admin only)
 * POST /api/subscription/reset-usage
 */
export const resetUsage = asyncHandler(async (
  req: TenantSubscriptionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString() || req.userId!;

  // Reset usage (this should be admin-only in production)
  const result = await subscriptionService.resetMonthlyUsage(businessId);

  res.json({
    success: true,
    message: 'Usage reset successfully',
    data: {
      result,
      resetAt: new Date().toISOString()
    }
  });
});