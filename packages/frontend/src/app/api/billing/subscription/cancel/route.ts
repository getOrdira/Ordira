// /src/app/api/billing/subscriptions/cancel/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant } from '@/lib/tenant';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for subscription cancellation
const cancelSubscriptionSchema = z.object({
  // Cancellation type
  cancelImmediately: z.boolean().default(false),
  cancelAtPeriodEnd: z.boolean().default(true),
  
  // Feedback collection
  reason: z.enum([
    'too_expensive',
    'not_using_enough',
    'missing_features',
    'poor_support',
    'switching_competitors',
    'business_changes',
    'technical_issues',
    'other'
  ]).optional(),
  
  feedback: z.string().max(1000, 'Feedback must be less than 1000 characters').optional(),
  
  // Improvement suggestions
  whatWouldMakeYouStay: z.string().max(500).optional(),
  missingFeatures: z.array(z.string()).max(10).optional(),
  pricePoint: z.number().min(0).max(10000).optional(),
  
  // Retention offers
  acceptRetentionOffer: z.boolean().default(false).optional(),
  interestedInPause: z.boolean().default(false).optional(),
  
  // Data preferences
  deleteAllData: z.boolean().default(false).optional(),
  exportDataFirst: z.boolean().default(true).optional(),
  
  // Confirmation
  confirmCancellation: z.boolean().refine(val => val === true, {
    message: 'Must confirm cancellation to proceed'
  })
});

// Schema for cancellation status/info requests
const cancellationStatusSchema = z.object({
  includeRetentionOffers: z.boolean().default(true).optional(),
  includeDataExportOptions: z.boolean().default(true).optional()
});

/**
 * POST /api/billing/subscriptions/cancel
 * Cancel subscription with feedback collection and retention offers
 * 
 * @requires authentication & tenant context
 * @requires validation: cancellation request
 * @rate-limited: 3 cancellations per day
 */
export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting for cancellations
    const rateLimitResult = await rateLimit(request, {
      identifier: 'billing-subscription-cancel',
      limit: 3,
      window: 24 * 60 * 60 * 1000 // 3 cancellations per day
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Cancellation rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Multiple cancellation attempts detected. Please contact support for assistance.',
          support: {
            urgentHelp: 'Our team is here to help resolve any issues',
            email: 'retention@yourplatform.com',
            phone: '1-800-SUPPORT',
            liveChatAvailable: true
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

    // Check if user has an active subscription to cancel
    if (tenant.plan === 'foundation') {
      return NextResponse.json(
        { 
          error: 'No active subscription to cancel', 
          currentPlan: 'foundation',
          message: 'You are currently on the free Foundation plan.',
          alternatives: [
            'Your account will remain active with Foundation features',
            'You can upgrade anytime to access premium features',
            'No cancellation is needed for free accounts'
          ]
        },
        { status: 400 }
      );
    }

    // Body validation
    const body = await request.json();
    const validatedBody = validateBody(body, cancelSubscriptionSchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid cancellation request', 
          details: validatedBody.errors,
          helpText: 'Please confirm your cancellation and provide feedback to help us improve'
        },
        { status: 400 }
      );
    }

    // Add cancellation context
    const cancellationRequest = {
      ...validatedBody.data,
      cancellationContext: {
        initiatedBy: user.id,
        initiatedAt: new Date().toISOString(),
        currentPlan: tenant.plan,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        accountAge: calculateAccountAge(tenant),
        lastActivity: new Date().toISOString()
      }
    };

    // Forward cancellation request to backend
    const response = await backendFetch('/api/billing/cancel', {
      method: 'POST',
      body: cancellationRequest,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific cancellation errors
      if (error.code === 'RETENTION_OFFER_AVAILABLE') {
        return NextResponse.json({
          ...error,
          retentionOffers: generateRetentionOffers(tenant.plan, validatedBody.data.reason),
          message: 'Before you go, we have some special offers for you'
        }, { status: 202 }); // Accepted but with offers
      }
      
      return NextResponse.json(error, { status: response.status });
    }

    const cancellationResult = await response.json();

    // Enhanced response with cancellation processing and next steps
    const enhancedResponse = {
      ...cancellationResult,
      cancellationInfo: {
        status: validatedBody.data.cancelImmediately ? 'cancelled_immediately' : 'scheduled',
        effectiveDate: validatedBody.data.cancelImmediately ? 
          new Date().toISOString() : 
          cancellationResult.cancellation?.effectiveDate,
        remainingDays: calculateRemainingDays(cancellationResult.cancellation?.effectiveDate),
        finalBillingDate: cancellationResult.cancellation?.finalBillingDate,
        refundAmount: cancellationResult.cancellation?.refundAmount || 0
      },
      dataManagement: {
        exportDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        exportAvailable: !validatedBody.data.deleteAllData,
        dataRetentionPeriod: '30 days',
        deletionScheduled: validatedBody.data.deleteAllData,
        exportFormats: ['JSON', 'CSV', 'PDF'],
        downloadLinks: generateDataExportLinks(user.id)
      },
      accountTransition: {
        downgradeTo: 'foundation',
        featuresLost: getFeaturesLost(tenant.plan),
        featuresRetained: getFeaturesRetained(),
        accessUntil: cancellationResult.cancellation?.effectiveDate,
        reactivationOption: {
          available: true,
          deadline: cancellationResult.cancellation?.effectiveDate,
          samePrice: true,
          noSetupFee: true
        }
      },
      feedback: {
        received: !!validatedBody.data.feedback,
        reason: validatedBody.data.reason,
        improvementSuggestions: validatedBody.data.whatWouldMakeYouStay,
        willBeReviewed: true,
        impactOnRoadmap: 'Your feedback helps shape our product roadmap'
      },
      retention: {
        lastChanceOffers: generateLastChanceOffers(tenant.plan, validatedBody.data),
        pauseOption: generatePauseOption(tenant.plan),
        winBackCampaign: {
          eligible: true,
          timeline: '30-60 days after cancellation',
          specialOffers: 'You may receive exclusive offers to return'
        }
      },
      support: {
        farewellMessage: 'We\'re sorry to see you go! Thank you for being part of our community.',
        openDoor: 'You\'re always welcome back - we\'ll be here when you\'re ready',
        finalSupport: {
          available: true,
          deadline: cancellationResult.cancellation?.effectiveDate,
          includes: ['Data export assistance', 'Account questions', 'Reactivation help']
        },
        exitInterview: {
          available: true,
          voluntary: true,
          purpose: 'Help us understand how to serve customers better'
        }
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        cancellationProcessed: true,
        showFarewellMessage: true,
        requiresDataExport: validatedBody.data.exportDataFirst
      }
    };

    return NextResponse.json(enhancedResponse, {
      status: validatedBody.data.cancelImmediately ? 200 : 202,
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Cancellation-Status': validatedBody.data.cancelImmediately ? 'immediate' : 'scheduled',
        'X-Data-Export-Available': validatedBody.data.exportDataFirst ? 'true' : 'false'
      }
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { 
        error: 'Cancellation failed', 
        message: 'An unexpected error occurred. Please contact support for assistance.',
        support: {
          emergency: 'For urgent cancellation requests, contact our support team directly',
          email: 'support@yourplatform.com',
          priority: 'high'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/subscriptions/cancel
 * Get cancellation options and information
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting for cancellation info
    const rateLimitResult = await rateLimit(request, {
      identifier: 'billing-cancel-info',
      limit: 30,
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

    // Query validation
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Convert string booleans
    if (queryParams.includeRetentionOffers) {
      queryParams.includeRetentionOffers = queryParams.includeRetentionOffers === 'true';
    }
    if (queryParams.includeDataExportOptions) {
      queryParams.includeDataExportOptions = queryParams.includeDataExportOptions === 'true';
    }

    const validatedQuery = validateBody(queryParams, cancellationStatusSchema);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.errors },
        { status: 400 }
      );
    }

    // Get current subscription info
    const subscriptionResponse = await backendFetch('/api/billing/plan', {
      method: 'GET',
      user,
      tenant
    });

    const subscriptionData = subscriptionResponse.ok ? 
      await subscriptionResponse.json() : null;

    // Generate cancellation information
    const cancellationInfo = {
      cancellationEligible: tenant.plan !== 'foundation',
      currentPlan: {
        id: tenant.plan,
        name: tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1),
        features: subscriptionData?.currentPlan?.features || {},
        nextBilling: subscriptionData?.billing?.nextInvoiceDate,
        amount: subscriptionData?.billing?.nextInvoiceAmount || 0
      },
      cancellationOptions: {
        immediate: {
          available: true,
          consequences: [
            'Immediate loss of premium features',
            'Prorated refund for unused time',
            'Account downgraded to Foundation plan'
          ],
          refundAmount: calculateProratedRefund(subscriptionData)
        },
        endOfPeriod: {
          available: true,
          consequences: [
            'Continue using premium features until billing period ends',
            'No additional charges',
            'Automatic downgrade to Foundation plan'
          ],
          finalDate: subscriptionData?.billing?.nextInvoiceDate
        }
      },
      impactAssessment: {
        featuresLost: getFeaturesLost(tenant.plan),
        featuresRetained: getFeaturesRetained(),
        dataRetention: '30 days after cancellation',
        reactivationPeriod: '90 days with same pricing'
      },
      alternatives: {
        pauseSubscription: {
          available: ['premium', 'enterprise'].includes(tenant.plan),
          duration: 'Up to 3 months',
          benefits: ['Retain settings', 'No billing', 'Easy reactivation']
        },
        downgrade: {
          available: tenant.plan !== 'growth',
          options: getDowngradeOptions(tenant.plan),
          savings: calculateDowngradeSavings(tenant.plan)
        },
        customPlan: {
          available: tenant.plan === 'enterprise',
          description: 'Work with us to create a plan that fits your needs'
        }
      }
    };

    // Add retention offers if requested
    if (validatedQuery.data?.includeRetentionOffers) {
      cancellationInfo.retentionOffers = generateRetentionOffers(tenant.plan);
    }

    // Add data export options if requested
    if (validatedQuery.data?.includeDataExportOptions) {
      cancellationInfo.dataExport = {
        available: true,
        formats: ['JSON', 'CSV', 'PDF'],
        includes: ['Account data', 'Usage history', 'Certificates', 'Settings'],
        estimatedSize: '< 50MB',
        preparationTime: '5-10 minutes'
      };
    }

    const enhancedResponse = {
      ...cancellationInfo,
      support: {
        beforeYouCancel: 'We\'re here to help resolve any issues you might be experiencing',
        retentionTeam: 'Speak with our retention specialists for personalized solutions',
        contact: {
          email: 'retention@yourplatform.com',
          phone: '1-800-RETENTION',
          liveChatAvailable: true,
          responseTime: 'Within 1 hour'
        }
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('Cancellation info fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cancellation information' },
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

function calculateAccountAge(tenant: any): number {
  // Mock calculation - would use actual account creation date
  return 90; // days
}

function calculateRemainingDays(effectiveDate?: string): number {
  if (!effectiveDate) return 0;
  
  const effective = new Date(effectiveDate);
  const now = new Date();
  const diffTime = effective.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

function generateDataExportLinks(userId: string): any {
  return {
    fullExport: `/api/export/full/${userId}`,
    certificates: `/api/export/certificates/${userId}`,
    analytics: `/api/export/analytics/${userId}`,
    settings: `/api/export/settings/${userId}`
  };
}

function getFeaturesLost(plan: string): string[] {
  const features = {
    growth: ['Advanced Analytics', 'Priority Support', '5 API Keys'],
    premium: ['Custom Reports', 'Phone Support', '15 API Keys', 'NFT Features'],
    enterprise: ['White-label', 'Dedicated Support', 'Unlimited API Keys', 'SLA']
  };
  
  return features[plan as keyof typeof features] || [];
}

function getFeaturesRetained(): string[] {
  return [
    'Basic account access',
    'Foundation plan features',
    'Data export capabilities',
    'Community support'
  ];
}

function generateRetentionOffers(plan: string, reason?: string): any[] {
  const offers = [];
  
  if (reason === 'too_expensive') {
    offers.push({
      title: '50% Off Next 3 Months',
      description: 'Continue with your current plan at half price',
      savings: 150,
      duration: '3 months'
    });
  }
  
  if (reason === 'not_using_enough') {
    offers.push({
      title: 'Pause Subscription',
      description: 'Take a break for up to 3 months, resume anytime',
      cost: 0,
      benefits: ['Keep all settings', 'No setup fees on return']
    });
  }
  
  offers.push({
    title: 'Downgrade Instead',
    description: `Switch to a lower plan instead of cancelling`,
    savings: calculateDowngradeSavings(plan),
    retainedFeatures: '80% of current features'
  });
  
  return offers;
}

function generateLastChanceOffers(plan: string, cancellationData: any): any[] {
  return [
    {
      title: 'Final Offer - 70% Off',
      description: 'Our best discount ever, just for you',
      validFor: '24 hours',
      code: 'STAYPLEASE70'
    }
  ];
}

function generatePauseOption(plan: string): any {
  if (!['premium', 'enterprise'].includes(plan)) {
    return { available: false, reason: 'Not available for current plan' };
  }
  
  return {
    available: true,
    maxDuration: '3 months',
    benefits: [
      'Keep all account settings',
      'Retain API configurations',
      'No reactivation fees',
      'Resume with same pricing'
    ],
    limitations: [
      'No feature access during pause',
      'No billing during pause',
      'Data export recommended before pause'
    ]
  };
}

function calculateProratedRefund(subscriptionData: any): number {
  // Mock calculation - would use actual subscription data
  return subscriptionData?.billing?.nextInvoiceAmount * 0.7 || 0;
}

function getDowngradeOptions(currentPlan: string): any[] {
  const options = [];
  
  if (currentPlan === 'enterprise') {
    options.push({ plan: 'premium', savings: 200 });
    options.push({ plan: 'growth', savings: 270 });
  } else if (currentPlan === 'premium') {
    options.push({ plan: 'growth', savings: 70 });
  }
  
  return options;
}

function calculateDowngradeSavings(currentPlan: string): number {
  const savings = {
    enterprise: 200,
    premium: 70,
    growth: 29
  };
  
  return savings[currentPlan as keyof typeof savings] || 0;
}