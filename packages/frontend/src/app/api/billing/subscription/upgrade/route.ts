// /src/app/api/billing/subscriptions/upgrade/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant } from '@/lib/tenant';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for subscription upgrades
const upgradeSubscriptionSchema = z.object({
  targetPlan: z.enum(['growth', 'premium', 'enterprise'], {
    errorMap: () => ({ message: 'Target plan must be growth, premium, or enterprise' })
  }),
  
  // Upgrade preferences
  upgradeType: z.enum(['immediate', 'next_cycle']).default('immediate'),
  prorationPreference: z.enum(['prorate', 'credit_unused']).default('prorate'),
  
  // Optional customizations
  addons: z.array(z.string()).max(10).default([]).optional(),
  customFeatures: z.array(z.string()).max(5).default([]).optional(),
  
  // Discount codes
  couponCode: z.string().max(50).optional(),
  
  // Enterprise-specific options
  contractLength: z.enum(['monthly', 'annual', 'custom']).optional(),
  customRequirements: z.string().max(500).optional(),
  
  // Metadata
  upgradeReason: z.string().max(200).optional(),
  expectedUsageGrowth: z.number().min(0).max(1000).optional() // percentage
});

/**
 * POST /api/billing/subscriptions/upgrade
 * Upgrade subscription to a higher plan
 * 
 * @requires authentication & tenant context
 * @requires validation: upgrade configuration
 * @rate-limited: 5 upgrades per day
 */
export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting for upgrades
    const rateLimitResult = await rateLimit(request, {
      identifier: 'billing-subscription-upgrade',
      limit: 5,
      window: 24 * 60 * 60 * 1000 // 5 upgrades per day
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Upgrade rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Too many upgrade attempts. Please contact support for assistance.',
          support: {
            email: 'billing@yourplatform.com',
            phone: '1-800-SUPPORT'
          }
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

    // Check if user can upgrade (not already on highest plan)
    if (tenant.plan === 'enterprise') {
      return NextResponse.json(
        { 
          error: 'Already on highest plan', 
          currentPlan: 'enterprise',
          message: 'You are already on our Enterprise plan with all features included.',
          alternatives: [
            'Contact sales for custom enterprise solutions',
            'Explore add-on services',
            'Consider volume discounts'
          ]
        },
        { status: 400 }
      );
    }

    // Body validation
    const body = await request.json();
    const validatedBody = validateBody(body, upgradeSubscriptionSchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid upgrade configuration', 
          details: validatedBody.errors,
          availableTargets: getAvailableUpgradePlans(tenant.plan)
        },
        { status: 400 }
      );
    }

    // Validate upgrade target
    const currentPlanLevel = getPlanLevel(tenant.plan);
    const targetPlanLevel = getPlanLevel(validatedBody.data.targetPlan);
    
    if (targetPlanLevel <= currentPlanLevel) {
      return NextResponse.json(
        { 
          error: 'Invalid upgrade target', 
          currentPlan: tenant.plan,
          targetPlan: validatedBody.data.targetPlan,
          message: 'Target plan must be higher than current plan',
          suggestions: getAvailableUpgradePlans(tenant.plan)
        },
        { status: 400 }
      );
    }

    // Add upgrade context and metadata
    const upgradeRequest = {
      plan: validatedBody.data.targetPlan, // Backend expects 'plan' field
      ...validatedBody.data,
      upgradeContext: {
        initiatedBy: user.id,
        initiatedAt: new Date().toISOString(),
        fromPlan: tenant.plan,
        toPlan: validatedBody.data.targetPlan,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'Unknown'
      }
    };

    // For Enterprise upgrades, create checkout session instead
    if (validatedBody.data.targetPlan === 'enterprise') {
      return await handleEnterpriseUpgrade(request, upgradeRequest, user, tenant, rateLimitResult);
    }

    // Forward upgrade request to backend
    const response = await backendFetch('/api/billing/plan', {
      method: 'PUT',
      body: upgradeRequest,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const upgradeResult = await response.json();

    // Enhanced response with upgrade celebration and guidance
    const enhancedResponse = {
      ...upgradeResult,
      upgradeSuccess: {
        celebrationMessage: `🎉 Welcome to ${validatedBody.data.targetPlan.charAt(0).toUpperCase() + validatedBody.data.targetPlan.slice(1)}!`,
        completedAt: new Date().toISOString(),
        effectiveImmediately: upgradeRequest.upgradeType === 'immediate',
        upgradeBenefits: getUpgradeBenefits(tenant.plan, validatedBody.data.targetPlan)
      },
      newCapabilities: {
        features: getNewFeatures(tenant.plan, validatedBody.data.targetPlan),
        limits: getNewLimits(tenant.plan, validatedBody.data.targetPlan),
        integrations: getNewIntegrations(tenant.plan, validatedBody.data.targetPlan),
        support: getUpgradedSupport(validatedBody.data.targetPlan)
      },
      billing: {
        ...upgradeResult.planChange,
        nextInvoice: calculateNextInvoice(upgradeResult),
        prorationCredit: upgradeResult.planChange?.prorationAmount || 0,
        annualSavings: calculateAnnualSavings(tenant.plan, validatedBody.data.targetPlan)
      },
      onboarding: {
        nextSteps: [
          'Explore your new features in the dashboard',
          'Review updated usage limits',
          'Set up any new integrations',
          'Contact support if you need assistance'
        ],
        featuresGuide: `/help/plans/${validatedBody.data.targetPlan}`,
        supportAvailable: true,
        hasWelcomeCall: validatedBody.data.targetPlan === 'enterprise'
      },
      celebration: {
        shareWorthy: true,
        socialMessage: `Just upgraded to ${validatedBody.data.targetPlan} plan! 🚀`,
        achievements: generateAchievements(validatedBody.data.targetPlan),
        milestones: getUnlockedMilestones(validatedBody.data.targetPlan)
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        upgradeComplete: true,
        showCelebration: true,
        redirectToDashboard: true,
        newPlan: validatedBody.data.targetPlan
      }
    };

    return NextResponse.json(enhancedResponse, {
      status: 201,
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Upgrade-Status': 'completed',
        'X-New-Plan': validatedBody.data.targetPlan,
        'X-Celebration': 'true'
      }
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    return NextResponse.json(
      { 
        error: 'Upgrade failed', 
        message: 'An unexpected error occurred during the upgrade process.',
        support: {
          message: 'Please contact our support team for immediate assistance',
          email: 'billing@yourplatform.com',
          priority: 'high'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/subscriptions/upgrade
 * Get upgrade options and pricing information
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting for upgrade info
    const rateLimitResult = await rateLimit(request, {
      identifier: 'billing-upgrade-info',
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

    // Get current plan info from backend
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

    // Generate upgrade options
    const upgradeOptions = generateUpgradeOptions(tenant.plan, planData);

    const enhancedResponse = {
      currentPlan: {
        id: tenant.plan,
        name: tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1),
        features: planData.currentPlan?.features || {}
      },
      upgradeOptions,
      pricing: {
        comparison: generatePricingComparison(tenant.plan),
        savings: calculateUpgradeSavings(tenant.plan),
        paymentOptions: getPaymentOptions(tenant.plan)
      },
      benefits: {
        immediate: getImmediateBenefits(tenant.plan),
        longTerm: getLongTermBenefits(tenant.plan),
        roi: calculateUpgradeROI(tenant.plan, planData.usage)
      },
      incentives: {
        currentOffers: getCurrentOffers(tenant.plan),
        discounts: getAvailableDiscounts(tenant.plan),
        timeline: getUpgradeIncentiveTimeline()
      },
      support: {
        upgradeAssistance: true,
        migrationSupport: true,
        onboardingIncluded: ['premium', 'enterprise'].includes(tenant.plan),
        dedicatedManager: tenant.plan === 'enterprise'
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        upgradeEligible: tenant.plan !== 'enterprise'
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('Upgrade options fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upgrade options' },
      { status: 500 }
    );
  }
}

/**
 * Handle Enterprise upgrade (requires sales process)
 */
async function handleEnterpriseUpgrade(
  request: NextRequest,
  upgradeRequest: any,
  user: any,
  tenant: any,
  rateLimitResult: any
): Promise<NextResponse> {
  
  // Create checkout session for Enterprise
  const checkoutResponse = await backendFetch('/api/billing/checkout-session', {
    method: 'POST',
    body: {
      plan: 'enterprise',
      ...upgradeRequest,
      requiresSalesContact: true
    },
    user,
    tenant
  });

  if (!checkoutResponse.ok) {
    const error = await checkoutResponse.json();
    return NextResponse.json(error, { status: checkoutResponse.status });
  }

  const checkoutResult = await checkoutResponse.json();

  return NextResponse.json({
    upgradeType: 'enterprise_sales_required',
    message: 'Enterprise upgrade requires sales consultation',
    salesProcess: {
      checkoutUrl: checkoutResult.sessionUrl,
      contactSales: true,
      estimatedTimeline: '1-2 business days',
      nextSteps: [
        'Complete the Enterprise application',
        'Schedule a consultation call',
        'Receive custom pricing proposal',
        'Complete upgrade with assistance'
      ]
    },
    enterpriseBenefits: getEnterpriseBenefits(),
    consultation: {
      available: true,
      bookingUrl: checkoutResult.consultationUrl || '/contact-sales',
      priority: 'immediate',
      includes: [
        'Custom feature configuration',
        'Volume pricing discussion',
        'Implementation timeline',
        'Dedicated account manager introduction'
      ]
    },
    frontendMetadata: {
      requestId: crypto.randomUUID(),
      rateLimitRemaining: rateLimitResult.remaining,
      requiresCheckout: true,
      upgradeType: 'enterprise'
    }
  }, {
    status: 202, // Accepted, but requires additional steps
    headers: {
      'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
      'X-Upgrade-Type': 'enterprise_sales'
    }
  });
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

function getAvailableUpgradePlans(currentPlan: string): string[] {
  const allPlans = ['foundation', 'growth', 'premium', 'enterprise'];
  const currentIndex = allPlans.indexOf(currentPlan);
  return allPlans.slice(currentIndex + 1);
}

function getUpgradeBenefits(fromPlan: string, toPlan: string): string[] {
  const benefits = [];
  
  if (fromPlan === 'foundation' && toPlan === 'growth') {
    benefits.push('Unlimited voting features', 'Advanced analytics', '5 API keys');
  } else if (toPlan === 'premium') {
    benefits.push('15 API keys', 'NFT features', 'Premium support', 'Custom domains');
  } else if (toPlan === 'enterprise') {
    benefits.push('Unlimited API keys', 'White-label options', 'Dedicated support', 'Custom features');
  }
  
  return benefits;
}

function getNewFeatures(fromPlan: string, toPlan: string): string[] {
  // Implementation would return actual new features based on plan comparison
  return ['Advanced Analytics', 'Priority Support', 'Enhanced Integrations'];
}

function getNewLimits(fromPlan: string, toPlan: string): any {
  // Implementation would return actual limit increases
  return {
    apiKeys: getPlanApiKeyLimit(toPlan),
    storage: getPlanStorageLimit(toPlan),
    votes: 'unlimited'
  };
}

function getNewIntegrations(fromPlan: string, toPlan: string): string[] {
  return ['Webhooks', 'Advanced APIs', 'Third-party Connectors'];
}

function getUpgradedSupport(plan: string): any {
  const support = {
    growth: { level: 'Standard', responseTime: '24 hours' },
    premium: { level: 'Priority', responseTime: '4-8 hours' },
    enterprise: { level: 'Dedicated', responseTime: '2-4 hours' }
  };
  
  return support[plan as keyof typeof support] || support.growth;
}

function calculateNextInvoice(upgradeResult: any): any {
  return {
    date: upgradeResult.billing?.nextInvoiceDate,
    amount: upgradeResult.billing?.nextInvoiceAmount,
    includesProration: true
  };
}

function calculateAnnualSavings(fromPlan: string, toPlan: string): number {
  // Mock calculation - would be based on actual pricing
  const savings = {
    'foundation->growth': 120,
    'foundation->premium': 480,
    'growth->premium': 360,
    'growth->enterprise': 1200,
    'premium->enterprise': 840
  };
  
  return savings[`${fromPlan}->${toPlan}` as keyof typeof savings] || 0;
}

function generateAchievements(plan: string): string[] {
  const achievements = {
    growth: ['Growth Achiever', 'Feature Explorer'],
    premium: ['Premium User', 'Power User', 'Advanced Explorer'],
    enterprise: ['Enterprise Elite', 'Platform Master', 'Innovation Leader']
  };
  
  return achievements[plan as keyof typeof achievements] || [];
}

function getUnlockedMilestones(plan: string): string[] {
  return [`Unlocked ${plan.charAt(0).toUpperCase() + plan.slice(1)} features`, 'Increased limits activated'];
}

function generateUpgradeOptions(currentPlan: string, planData: any): any[] {
  const availablePlans = getAvailableUpgradePlans(currentPlan);
  
  return availablePlans.map(plan => ({
    id: plan,
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    recommended: plan === 'premium', // Example logic
    pricing: getPlanPricing(plan),
    features: getPlanFeatures(plan),
    limits: getPlanLimits(plan)
  }));
}

function generatePricingComparison(currentPlan: string): any {
  // Implementation would return actual pricing comparison
  return {
    current: getPlanPricing(currentPlan),
    upgrades: getAvailableUpgradePlans(currentPlan).map(plan => ({
      plan,
      pricing: getPlanPricing(plan)
    }))
  };
}

function calculateUpgradeSavings(currentPlan: string): any {
  return {
    annualDiscount: '20%',
    firstMonthFree: currentPlan === 'foundation',
    migrationCredit: 50
  };
}

function getPaymentOptions(currentPlan: string): string[] {
  return ['Monthly billing', 'Annual billing (20% off)', 'Custom billing'];
}

function getImmediateBenefits(currentPlan: string): string[] {
  return ['Instant feature access', 'Higher usage limits', 'Priority support queue'];
}

function getLongTermBenefits(currentPlan: string): string[] {
  return ['Scalable infrastructure', 'Advanced integrations', 'Strategic partnership'];
}

function calculateUpgradeROI(currentPlan: string, usage: any): any {
  return {
    paybackPeriod: '2-3 months',
    expectedSavings: 'Up to 40% on operational costs',
    valueMultiplier: '3-5x'
  };
}

function getCurrentOffers(currentPlan: string): any[] {
  return [
    {
      title: 'First Month Free',
      description: 'No charges for your first month on the new plan',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function getAvailableDiscounts(currentPlan: string): any[] {
  return [
    { code: 'UPGRADE20', discount: '20%', description: 'Annual billing discount' }
  ];
}

function getUpgradeIncentiveTimeline(): any {
  return {
    immediate: 'First month free',
    thirtyDays: 'Feature optimization session',
    ninetyDays: 'Success review and recommendations'
  };
}

function getEnterpriseBenefits(): string[] {
  return [
    'Unlimited everything',
    'Dedicated account manager', 
    'Custom integrations',
    'White-label options',
    'SLA guarantees',
    'Premium support'
  ];
}

// Mock helper functions (implement based on actual business logic)
function getPlanApiKeyLimit(plan: string): number {
  const limits = { foundation: 2, growth: 5, premium: 15, enterprise: 50 };
  return limits[plan as keyof typeof limits] || 1;
}

function getPlanStorageLimit(plan: string): string {
  const limits = { foundation: '1GB', growth: '5GB', premium: '25GB', enterprise: '100GB' };
  return limits[plan as keyof typeof limits] || '500MB';
}

function getPlanPricing(plan: string): any {
  const pricing = {
    foundation: { monthly: 0, annual: 0 },
    growth: { monthly: 29, annual: 290 },
    premium: { monthly: 99, annual: 990 },
    enterprise: { monthly: 299, annual: 2990 }
  };
  return pricing[plan as keyof typeof pricing] || { monthly: 0, annual: 0 };
}

function getPlanFeatures(plan: string): string[] {
  const features = {
    foundation: ['Basic Analytics', 'Email Support', '2 API Keys'],
    growth: ['Advanced Analytics', 'Priority Support', '5 API Keys', 'Integrations'],
    premium: ['Custom Reports', 'Phone Support', '15 API Keys', 'Advanced Integrations', 'NFT Features'],
    enterprise: ['White-label', 'Dedicated Support', 'Unlimited API Keys', 'Custom Features', 'SLA']
  };
  return features[plan as keyof typeof features] || [];
}

function getPlanLimits(plan: string): any {
  const limits = {
    foundation: { votes: 100, certificates: 50, storage: '1GB' },
    growth: { votes: 'unlimited', certificates: 500, storage: '5GB' },
    premium: { votes: 'unlimited', certificates: 'unlimited', storage: '25GB' },
    enterprise: { votes: 'unlimited', certificates: 'unlimited', storage: '100GB' }
  };
  return limits[plan as keyof typeof limits] || {};
}