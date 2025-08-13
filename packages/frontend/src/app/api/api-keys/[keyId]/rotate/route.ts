// /src/app/api/api-keys/[keyId]/rotate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateParams, validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schemas
const apiKeyParamsSchema = z.object({
  keyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid API key ID format')
});

const rotateApiKeySchema = z.object({
  reason: z.string()
    .trim()
    .max(200, 'Reason must be less than 200 characters')
    .default('Manual rotation via API')
    .optional(),
  
  gracePeriod: z.number()
    .int()
    .min(0, 'Grace period cannot be negative')
    .max(168, 'Grace period cannot exceed 168 hours (7 days)')
    .default(24)
    .optional(),
    
  preservePermissions: z.boolean()
    .default(true)
    .optional(),
    
  notifyOnRotation: z.boolean()
    .default(false)
    .optional(),
    
  updatePermissions: z.array(z.enum([
      'read', 'write', 'delete',
      'products:read', 'products:write', 'products:delete',
      'analytics:read', 'certificates:read', 'certificates:write',
      'votes:read', 'votes:write', 'nfts:read', 'nfts:write'
    ]))
    .optional()
});

/**
 * POST /api/api-keys/[keyId]/rotate
 * Rotate an API key (generate new key while keeping same configuration)
 * 
 * @requires authentication & tenant context
 * @requires enterprise plan
 * @param keyId - API key identifier
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Rate limiting - 5 rotations per minute (more restrictive)
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-rotate',
      limit: 5,
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

    // Plan validation - Enterprise only for rotation
    const hasAccess = await requireTenantPlan(tenant, ['enterprise']);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Enterprise plan required for API key rotation', 
          requiredPlans: ['enterprise'],
          currentPlan: tenant.plan,
          alternativeAction: 'Consider revoking and creating a new key instead'
        },
        { status: 403 }
      );
    }

    // Params validation
    const validatedParams = validateParams(params, apiKeyParamsSchema);
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid key ID format', details: validatedParams.errors },
        { status: 400 }
      );
    }

    // Body validation for rotation options
    const body = await request.json().catch(() => ({}));
    const validatedBody = validateBody(body, rotateApiKeySchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid rotation options', details: validatedBody.errors },
        { status: 400 }
      );
    }

    // Forward request to backend with enhanced rotation data
    const response = await backendFetch(`/api/brand/api-keys/${params.keyId}/rotate`, {
      method: 'POST',
      body: {
        ...validatedBody.data,
        rotatedBy: user.id,
        rotatedFromIP: getClientIP(request),
        rotationMethod: 'api_interface',
        timestamp: new Date().toISOString()
      },
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const rotationData = await response.json();

    // Enhanced response with comprehensive rotation guidance
    const enhancedResponse = {
      ...rotationData,
      rotationInfo: {
        newKeyId: rotationData.keyId,
        newKey: rotationData.newKey, // Only shown once!
        rotatedAt: new Date().toISOString(),
        rotatedBy: user.id,
        reason: validatedBody.data?.reason || 'Manual rotation via API',
        gracePeriod: `${validatedBody.data?.gracePeriod || 24} hours`,
        oldKeyValidUntil: new Date(Date.now() + (validatedBody.data?.gracePeriod || 24) * 60 * 60 * 1000).toISOString(),
        preservedSettings: {
          permissions: validatedBody.data?.preservePermissions !== false,
          rateLimits: true,
          ipRestrictions: true,
          name: true
        }
      },
      migrationGuidance: {
        immediate: [
          '🔑 IMPORTANT: Copy the new API key above - it will not be shown again',
          '⏰ You have ' + (validatedBody.data?.gracePeriod || 24) + ' hours to migrate',
          '🔄 Both old and new keys work during grace period',
          '🚀 Update your applications with the new key'
        ],
        stepByStep: [
          {
            step: 1,
            action: 'Copy the new API key to a secure location',
            priority: 'critical',
            timeframe: 'immediate'
          },
          {
            step: 2,
            action: 'Test the new key in a development environment',
            priority: 'high',
            timeframe: 'within 1 hour'
          },
          {
            step: 3,
            action: 'Update production applications with the new key',
            priority: 'high',
            timeframe: 'within 12 hours'
          },
          {
            step: 4,
            action: 'Monitor applications for successful authentication',
            priority: 'medium',
            timeframe: 'ongoing'
          },
          {
            step: 5,
            action: 'Remove old key references after grace period',
            priority: 'low',
            timeframe: 'after grace period'
          }
        ],
        testing: [
          'Test authentication with new key in staging environment',
          'Verify all permissions work correctly with new key',
          'Check rate limiting behavior remains consistent',
          'Validate IP restrictions are properly applied',
          'Confirm all API endpoints respond as expected'
        ],
        monitoring: [
          'Watch for 401 authentication errors in application logs',
          'Monitor API usage patterns for anomalies',
          'Track successful vs failed requests during migration',
          'Set up alerts for the grace period expiration'
        ]
      },
      securityBenefits: {
        keyFreshness: 'New cryptographically secure key generated',
        auditTrail: 'Full rotation history maintained for compliance',
        zeroDowntime: 'Graceful migration with no service interruption',
        riskMitigation: 'Potential key compromise resolved',
        bestPractices: [
          'Regular key rotation enhances security posture',
          'Reduces impact of potential key exposure',
          'Maintains principle of least privilege',
          'Provides clear audit trail for security reviews'
        ]
      },
      timeline: {
        gracePeriodStart: new Date().toISOString(),
        gracePeriodEnd: new Date(Date.now() + (validatedBody.data?.gracePeriod || 24) * 60 * 60 * 1000).toISOString(),
        recommendedMigrationBy: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
        oldKeyDeactivation: new Date(Date.now() + (validatedBody.data?.gracePeriod || 24) * 60 * 60 * 1000).toISOString(),
        milestones: [
          {
            time: 'T+1 hour',
            action: 'Complete testing with new key',
            status: 'pending'
          },
          {
            time: 'T+6 hours',
            action: 'Begin production migration',
            status: 'pending'
          },
          {
            time: 'T+12 hours',
            action: 'Complete production migration',
            status: 'pending'
          },
          {
            time: `T+${validatedBody.data?.gracePeriod || 24} hours`,
            action: 'Old key automatically deactivated',
            status: 'scheduled'
          }
        ]
      },
      troubleshooting: {
        commonIssues: [
          {
            issue: 'New key returns 401 errors',
            solution: 'Verify key was copied correctly without extra spaces',
            urgency: 'high'
          },
          {
            issue: 'Permissions seem different',
            solution: 'Check if updatePermissions was used during rotation',
            urgency: 'medium'
          },
          {
            issue: 'Rate limits behaving differently',
            solution: 'Rate limit counters reset with new key - this is normal',
            urgency: 'low'
          }
        ],
        emergencyContacts: tenant.plan === 'enterprise' ? [
          'Enterprise support: Available 24/7 for rotation issues',
          'Technical account manager: For migration guidance',
          'Security team: For compliance and audit questions'
        ] : [
          'Support tickets: For technical assistance',
          'Documentation: Comprehensive rotation guides available'
        ]
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rotationCompleted: true,
        keyVisibilityWarning: 'New API key shown once only - ensure it is saved securely',
        rateLimitRemaining: rateLimitResult.remaining,
        nextRotationRecommended: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      }
    };

    return NextResponse.json(enhancedResponse, {
      status: 201,
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Rotation-Grace-Period': `${validatedBody.data?.gracePeriod || 24}h`,
        'X-Old-Key-Valid-Until': new Date(Date.now() + (validatedBody.data?.gracePeriod || 24) * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('API key rotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/api-keys/[keyId]/rotate
 * Get rotation status and information for an API key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Rate limiting - 30 requests per minute for status checks
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-rotation-status',
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

    // Plan validation
    const hasAccess = await requireTenantPlan(tenant, ['premium', 'enterprise']);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Plan upgrade required for rotation status', 
          requiredPlans: ['premium', 'enterprise'],
          currentPlan: tenant.plan 
        },
        { status: 403 }
      );
    }

    // Params validation
    const validatedParams = validateParams(params, apiKeyParamsSchema);
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid key ID format', details: validatedParams.errors },
        { status: 400 }
      );
    }

    // Get rotation status from backend
    const response = await backendFetch(`/api/brand/api-keys/${params.keyId}/rotation-status`, {
      method: 'GET',
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const rotationStatus = await response.json();

    // Enhanced rotation status response
    const enhancedResponse = {
      ...rotationStatus,
      rotationEligibility: {
        canRotate: tenant.plan === 'enterprise',
        planRequirement: 'enterprise',
        currentPlan: tenant.plan,
        upgradeRequired: tenant.plan !== 'enterprise'
      },
      rotationHistory: {
        ...rotationStatus.history,
        nextRecommendedRotation: calculateNextRotationDate(rotationStatus.history?.lastRotated),
        rotationFrequency: getRecommendedRotationFrequency(tenant.plan),
        securityScore: calculateKeySecurityScore(rotationStatus)
      },
      currentStatus: {
        ...rotationStatus.current,
        ageInDays: calculateKeyAge(rotationStatus.current?.createdAt),
        riskLevel: assessRotationRisk(rotationStatus),
        recommendations: generateRotationRecommendations(rotationStatus, tenant.plan)
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
    console.error('API key rotation status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for rotation processing
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

function calculateNextRotationDate(lastRotated?: string): string {
  const lastRotatedDate = lastRotated ? new Date(lastRotated) : new Date();
  const nextRotation = new Date(lastRotatedDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
  return nextRotation.toISOString();
}

function getRecommendedRotationFrequency(plan: string): string {
  switch (plan) {
    case 'enterprise': return '90 days';
    case 'premium': return '120 days';
    case 'growth': return '180 days';
    default: return '365 days';
  }
}

function calculateKeyAge(createdAt?: string): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateKeySecurityScore(rotationStatus: any): number {
  let score = 100;
  
  const ageInDays = calculateKeyAge(rotationStatus.current?.createdAt);
  
  // Deduct points for age
  if (ageInDays > 365) score -= 40;
  else if (ageInDays > 180) score -= 30;
  else if (ageInDays > 90) score -= 20;
  else if (ageInDays > 60) score -= 10;
  
  // Deduct points for never being rotated
  if (!rotationStatus.history?.lastRotated) score -= 20;
  
  // Deduct points for high usage without rotation
  if (rotationStatus.usage?.high && ageInDays > 30) score -= 15;
  
  return Math.max(0, score);
}

function assessRotationRisk(rotationStatus: any): 'low' | 'medium' | 'high' {
  const ageInDays = calculateKeyAge(rotationStatus.current?.createdAt);
  const hasBeenRotated = Boolean(rotationStatus.history?.lastRotated);
  const highUsage = rotationStatus.usage?.high;
  
  if (ageInDays > 180 || (!hasBeenRotated && ageInDays > 90)) return 'high';
  if (ageInDays > 90 || (highUsage && ageInDays > 60)) return 'medium';
  return 'low';
}

function generateRotationRecommendations(rotationStatus: any, plan: string): string[] {
  const recommendations = [];
  const riskLevel = assessRotationRisk(rotationStatus);
  const ageInDays = calculateKeyAge(rotationStatus.current?.createdAt);
  
  if (plan !== 'enterprise') {
    recommendations.push('Upgrade to Enterprise plan to enable automatic key rotation');
  }
  
  if (riskLevel === 'high') {
    recommendations.push('Immediate rotation recommended due to key age or usage patterns');
  } else if (riskLevel === 'medium') {
    recommendations.push('Consider rotating this key within the next 30 days');
  }
  
  if (ageInDays > 90 && !rotationStatus.history?.lastRotated) {
    recommendations.push('This key has never been rotated - consider establishing a rotation schedule');
  }
  
  if (rotationStatus.usage?.high) {
    recommendations.push('High usage keys should be rotated more frequently for security');
  }
  
  return recommendations;
}