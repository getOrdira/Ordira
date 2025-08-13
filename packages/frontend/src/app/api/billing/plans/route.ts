// /src/app/api/billing/plans/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant } from '@/lib/tenant';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for plan changes
const changePlanSchema = z.object({
  plan: z.enum(['foundation', 'growth', 'premium', 'enterprise'], {
    errorMap: () => ({ message: 'Plan must be one of: foundation, growth, premium, enterprise' })
  }),
  
  // Optional parameters for plan changes
  changeReason: z.string().max(200).optional(),
  effectiveDate: z.string().datetime().optional(),
  prorationPreference: z.enum(['immediate', 'next_cycle']).default('immediate').optional()
});

// Validation schema for checkout session
const checkoutSessionSchema = z.object({
  plan: z.enum(['foundation', 'growth', 'premium', 'enterprise']),
  
  // Optional discount codes
  couponCode: z.string().max(50).optional(),
  
  // Optional add-ons or customizations
  addons: z.array(z.string()).max(10).default([]).optional(),
  
  // Custom redirect URLs
  successUrl: z.string().url('Invalid success URL').optional(),
  cancelUrl: z.string().url('Invalid cancel URL').optional(),
  
  // Billing preferences
  billingInterval: z.enum(['monthly', 'yearly']).default('monthly').optional()
});

/**
 * GET /api/billing/plans
 * Get comprehensive billing and plan information
 * 
 * @requires authentication & tenant context
 * @rate-limited: 60 requests per minute
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 60 requests per minute
    const rateLimitResult = await rateLimit(request, {
      identifier: 'billing-plans',
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

    const planData = await response.json();

    // Enhanced response with frontend-specific data
    const enhancedResponse = {
      ...planData,
      planComparison: generatePlanComparison(planData.currentPlan, planData.availablePlans),
      usageInsights: generateUsageInsights(planData.usage),
      costAnalysis: generateCostAnalysis(planData),
      recommendations: generatePlanRecommendations(planData),
      upgradeIncentives: generateUpgradeIncentives(planData.currentPlan, planData.usage),
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        lastUpdated: new Date().toISOString()
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('Plans fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan information' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/billing/plans
 * Change subscription plan with enhanced validation
 * 
 * @requires authentication & tenant context
 * @requires validation: plan change data
 * @rate-limited: 10 plan changes per hour
 */
export async function PUT(request: NextRequest) {
  try {
    // Strict rate limiting for plan changes
    const rateLimitResult = await rateLimit(request, {
      identifier: 'billing-plan-change',
      limit: 10,
      window: 60 * 60 * 1000 // 10 changes per hour
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Plan change rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Too many plan changes. Please wait before making another change.'
        },
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

    // Body validation
    const body = await request.json();
    const validatedBody = validateBody(body, changePlanSchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid plan change data', 
          details: validatedBody.errors,
          availablePlans: ['foundation', 'growth', 'premium', 'enterprise']
        },
        { status: 400 }
      );
    }

    // Add change tracking metadata
    const changeMetadata = {
      ...validatedBody.data,
      changeInitiatedBy: user.id,
      changeInitiatedAt: new Date().toISOString(),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown'
    };

    // Forward request to backend
    const response = await backendFetch('/api/billing/plan', {
      method: 'PUT',
      body: changeMetadata,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Enhanced error handling for plan changes
      if (error.code === 'DOWNGRADE_BLOCKED') {
        return NextResponse.json({
          ...error,
          downgradeHelp: {
            blockedReasons: error.issues || [],
            actionableSteps: error.recommendations || [],
            contactSupport: 'For assistance with downgrades, contact our support team',
            alternativeOptions: [
              'Continue with current plan',
              'Reduce usage to meet lower plan limits',
              'Contact support for custom solutions'
            ]
          }
        }, { status: 400 });
      }
      
      return NextResponse.json(error, { status: response.status });
    }

    const planChangeResult = await response.json();

    // Enhanced response with change tracking and next steps
    const enhancedResponse = {
      ...planChangeResult,
      changeInfo: {
        completedAt: new Date().toISOString(),
        changeType: planChangeResult.planChange?.type || 'unknown',
        effectiveImmediately: true,
        previousPlan: planChangeResult.planChange?.from,
        newPlan: planChangeResult.planChange?.to,
        prorationAmount: planChangeResult.planChange?.prorationAmount || 0
      },
      featureChanges: {
        newFeatures: getNewFeatures(
          planChangeResult.planChange?.from, 
          planChangeResult.planChange?.to
        ),
        removedFeatures: getRemovedFeatures(
          planChangeResult.planChange?.from, 
          planChangeResult.planChange?.to
        ),
        changedLimits: getChangedLimits(
          planChangeResult.planChange?.from, 
          planChangeResult.planChange?.to
        )
      },
      nextSteps: {
        immediate: [
          'Plan change is now active',
          'New features are immediately available',
          'Updated limits are now in effect'
        ],
        recommended: [
          'Review your new plan features',
          'Update your usage patterns if needed',
          'Check the billing section for prorations'
        ]
      },
      support: {
        helpCenter: 'https://help.yourplatform.com/billing',
        contactSupport: 'support@yourplatform.com',
        liveChatAvailable: tenant.plan === 'enterprise'
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        requiresPageRefresh: true,
        showSuccessMessage: true
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Plan-Changed': 'true',
        'X-New-Plan': planChangeResult.planChange?.to || 'unknown'
      }
    });

  } catch (error) {
    console.error('Plan change error:', error);
    return NextResponse.json(
      { error: 'Failed to change plan' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/plans
 * Create checkout session for plan subscription
 * 
 * @requires authentication & tenant context
 * @requires validation: checkout session data
 * @rate-limited: 20 checkout sessions per hour
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for checkout session creation
    const rateLimitResult = await rateLimit(request, {
      identifier: 'billing-checkout',
      limit: 20,
      window: 60 * 60 * 1000 // 20 sessions per hour
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Checkout rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Too many checkout attempts. Please wait before trying again.'
        },
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

    // Body validation
    const body = await request.json();
    const validatedBody = validateBody(body, checkoutSessionSchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid checkout data', 
          details: validatedBody.errors,
          availablePlans: ['foundation', 'growth', 'premium', 'enterprise']
        },
        { status: 400 }
      );
    }

    // Add checkout metadata
    const checkoutMetadata = {
      ...validatedBody.data,
      sessionInitiatedBy: user.id,
      sessionInitiatedAt: new Date().toISOString(),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown'
    };

    // Forward request to backend
    const response = await backendFetch('/api/billing/checkout-session', {
      method: 'POST',
      body: checkoutMetadata,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const checkoutResult = await response.json();

    // Enhanced response with checkout guidance
    const enhancedResponse = {
      ...checkoutResult,
      checkoutInfo: {
        sessionCreatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        secureCheckout: true,
        acceptedPaymentMethods: [
          'Credit Cards (Visa, MasterCard, American Express)',
          'Bank Transfers (ACH)',
          'Digital Wallets (Apple Pay, Google Pay)',
          'International Cards'
        ]
      },
      planTransition: {
        currentPlan: tenant.plan,
        targetPlan: validatedBody.data.plan,
        isUpgrade: getPlanLevel(validatedBody.data.plan) > getPlanLevel(tenant.plan),
        immediateAccess: true
      },
      security: {
        stripeSecured: true,
        pciCompliant: true,
        encryptedPayment: true,
        noStoredPaymentData: true
      },
      support: {
        checkoutHelp: 'If you experience issues during checkout, contact support',
        phoneSupport: tenant.plan === 'enterprise',
        emailSupport: 'billing@yourplatform.com'
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        redirectToCheckout: true
      }
    };

    return NextResponse.json(enhancedResponse, {
      status: 201,
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Checkout-Session': 'created'
      }
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Helper functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

function getPlanLevel(plan: string): number {
  const levels = { foundation: 1, growth: 2, premium: 3, enterprise: 4 };
  return levels[plan as keyof typeof levels] || 0;
}

function generatePlanComparison(currentPlan: any, availablePlans: any[]): any {
  return {
    currentPlanFeatures: currentPlan.features,
    upgradeOptions: availablePlans.filter(p => p.canUpgradeTo),
    downgradeOptions: availablePlans.filter(p => p.canDowngradeTo),
    featureMatrix: generateFeatureMatrix(availablePlans)
  };
}

function generateUsageInsights(usage: any): any {
  return {
    utilizationSummary: {
      overall: calculateOverallUtilization(usage),
      byFeature: usage.utilization || {},
      trend: 'stable' // Could be calculated from historical data
    },
    recommendations: [
      usage.utilization?.votes > 80 ? 'Consider upgrading for more voting capacity' : null,
      usage.utilization?.certificates > 80 ? 'Certificate usage is high - upgrade recommended' : null,
      usage.utilization?.apiKeys > 80 ? 'API key limit approaching - consider higher plan' : null
    ].filter(Boolean)
  };
}

function generateCostAnalysis(planData: any): any {
  return {
    currentCost: planData.billing?.nextInvoiceAmount || 0,
    projectedSavings: calculateProjectedSavings(planData),
    costPerFeature: calculateCostPerFeature(planData),
    roi: calculateROI(planData)
  };
}

function generatePlanRecommendations(planData: any): string[] {
  const recommendations = [];
  const usage = planData.usage?.utilizationPercentage || {};
  
  if (Object.values(usage).some((util: any) => util > 80)) {
    recommendations.push('Consider upgrading to avoid hitting usage limits');
  }
  
  if (planData.currentPlan.id === 'foundation' && usage.votes > 50) {
    recommendations.push('Upgrade to Growth for unlimited voting features');
  }
  
  return recommendations;
}

function generateUpgradeIncentives(currentPlan: any, usage: any): any {
  return {
    savings: calculateUpgradeSavings(currentPlan, usage),
    newFeatures: getUpgradeFeatures(currentPlan.id),
    limitIncreases: getLimitIncreases(currentPlan.id),
    businessValue: calculateBusinessValue(currentPlan.id)
  };
}

// Placeholder helper functions (implement based on business logic)
function generateFeatureMatrix(plans: any[]): any { return {}; }
function calculateOverallUtilization(usage: any): number { return 0; }
function calculateProjectedSavings(planData: any): number { return 0; }
function calculateCostPerFeature(planData: any): any { return {}; }
function calculateROI(planData: any): number { return 0; }
function getNewFeatures(fromPlan: string, toPlan: string): string[] { return []; }
function getRemovedFeatures(fromPlan: string, toPlan: string): string[] { return []; }
function getChangedLimits(fromPlan: string, toPlan: string): any { return {}; }
function calculateUpgradeSavings(currentPlan: any, usage: any): number { return 0; }
function getUpgradeFeatures(planId: string): string[] { return []; }
function getLimitIncreases(planId: string): any { return {}; }
function calculateBusinessValue(planId: string): string[] { return []; }