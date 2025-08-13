// /src/app/api/api-keys/[keyId]/revoke/route.ts

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

const revokeApiKeySchema = z.object({
  reason: z.string()
    .trim()
    .max(200, 'Reason must be less than 200 characters')
    .optional(),
  
  immediate: z.boolean()
    .default(true)
    .optional(),
    
  notifyClients: z.boolean()
    .default(false)
    .optional()
});

/**
 * DELETE /api/api-keys/[keyId]/revoke
 * Revoke/delete an API key
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @param keyId - API key identifier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Rate limiting - 20 revocations per minute
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-revoke',
      limit: 20,
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
          error: 'Plan upgrade required for API key management', 
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

    // Optional body validation for revocation details
    let revocationOptions = { reason: 'Manual revocation via API', immediate: true, notifyClients: false };
    
    try {
      const body = await request.json();
      const validatedBody = validateBody(body, revokeApiKeySchema);
      if (validatedBody.success) {
        revocationOptions = { ...revocationOptions, ...validatedBody.data };
      }
    } catch {
      // Body is optional for DELETE requests
    }

    // Forward request to backend
    const response = await backendFetch(`/api/brand/api-keys/${params.keyId}`, {
      method: 'DELETE',
      body: revocationOptions,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const revocationData = await response.json();

    // Add revocation-specific metadata and guidance
    const enhancedResponse = {
      ...revocationData,
      revocationInfo: {
        revokedAt: new Date().toISOString(),
        revokedBy: user.id,
        reason: revocationOptions.reason,
        immediate: revocationOptions.immediate,
        securityNote: 'All requests using this key will be immediately rejected',
        gracePeriod: revocationOptions.immediate ? null : '24 hours',
        effectiveAt: revocationOptions.immediate ? new Date().toISOString() : 
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      cleanupGuidance: {
        immediate: [
          'Remove this key from all client applications immediately',
          'Update any documentation referencing this key',
          'Monitor error logs for failed requests using the revoked key',
          'Consider creating a replacement key if needed'
        ],
        monitoring: [
          'Check application logs for 401 authentication errors',
          'Verify backup authentication methods are working',
          'Update any automated systems or CI/CD pipelines',
          'Notify team members who may be using this key'
        ],
        security: [
          'Audit recent usage to ensure no unauthorized access',
          'Review permissions that were granted to this key',
          'Consider rotating other keys if compromise is suspected',
          'Document the revocation in your security audit log'
        ]
      },
      replacementSuggestions: generateReplacementSuggestions(revocationData, tenant.plan),
      impactAssessment: calculateRevocationImpact(revocationData),
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        revocationConfirmed: true
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('API key revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys/[keyId]/revoke
 * Alternative POST method for revocation with detailed options
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Rate limiting - 20 revocations per minute
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-revoke',
      limit: 20,
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
          error: 'Plan upgrade required for API key management', 
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

    // Body validation for revocation options
    const body = await request.json();
    const validatedBody = validateBody(body, revokeApiKeySchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid revocation options', details: validatedBody.errors },
        { status: 400 }
      );
    }

    // Forward request to backend with enhanced revocation data
    const response = await backendFetch(`/api/brand/api-keys/${params.keyId}/revoke`, {
      method: 'POST',
      body: {
        ...validatedBody.data,
        revokedBy: user.id,
        revokedFromIP: getClientIP(request),
        revocationMethod: 'api_interface'
      },
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const revocationData = await response.json();

    // Enhanced response for POST method
    const enhancedResponse = {
      ...revocationData,
      revocationDetails: {
        scheduledFor: validatedBody.data?.immediate ? 'immediate' : 'grace_period',
        notificationsSent: validatedBody.data?.notifyClients || false,
        auditTrail: {
          action: 'api_key_revoked',
          timestamp: new Date().toISOString(),
          user: user.id,
          keyId: params.keyId,
          reason: validatedBody.data?.reason || 'No reason provided'
        }
      },
      nextSteps: generateRevocationNextSteps(validatedBody.data, tenant.plan),
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        revocationMethod: 'scheduled'
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('API key scheduled revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for revocation processing
function generateReplacementSuggestions(revocationData: any, plan: string): any {
  const suggestions = {
    createNewKey: {
      recommended: true,
      reason: 'Maintain API access with fresh credentials',
      permissions: revocationData.key?.permissions || ['read'],
      securityImprovements: [
        'Set expiration date for new key',
        'Implement IP restrictions if not already present',
        'Use principle of least privilege for permissions'
      ]
    },
    securityUpgrades: [],
    planBenefits: []
  };

  // Plan-specific suggestions
  if (plan === 'foundation') {
    suggestions.planBenefits.push('Upgrade to Growth for 5 API keys and advanced features');
  } else if (plan === 'growth') {
    suggestions.planBenefits.push('Upgrade to Premium for 15 API keys and enterprise security');
  }

  // Security improvements based on revoked key
  if (!revocationData.key?.expiresAt) {
    suggestions.securityUpgrades.push('Set expiration dates on new keys');
  }
  
  if (!revocationData.key?.ipWhitelist?.length) {
    suggestions.securityUpgrades.push('Configure IP restrictions for enhanced security');
  }

  return suggestions;
}

function calculateRevocationImpact(revocationData: any): any {
  const usage = revocationData.finalUsage || {};
  const dailyAverage = usage.averageDaily || 0;
  
  return {
    usageImpact: {
      level: dailyAverage > 1000 ? 'high' : dailyAverage > 100 ? 'medium' : 'low',
      dailyRequests: dailyAverage,
      lastUsed: usage.lastUsed,
      totalLifetimeRequests: usage.totalRequests || 0
    },
    serviceImpact: {
      affectedEndpoints: usage.topEndpoints?.length || 0,
      estimatedDowntime: dailyAverage > 500 ? 'immediate' : 'minimal',
      rollbackOptions: 'none_available_create_new_key'
    },
    recommendations: [
      dailyAverage > 100 ? 'High usage detected - ensure replacement key is ready' : 'Low usage impact expected',
      'Monitor applications for authentication errors',
      'Have replacement key ready before revoking if this is a critical key'
    ]
  };
}

function generateRevocationNextSteps(options: any, plan: string): string[] {
  const steps = [];
  
  if (options?.immediate) {
    steps.push('Key has been immediately revoked - all requests will fail');
    steps.push('Remove key from applications within the next few minutes');
  } else {
    steps.push('Key will be revoked after grace period - plan transition');
    steps.push('Update applications before the grace period expires');
  }
  
  if (options?.notifyClients) {
    steps.push('Notifications have been sent to configured channels');
  }
  
  steps.push('Create a replacement key if continued API access is needed');
  steps.push('Update documentation and team knowledge base');
  
  if (plan === 'enterprise') {
    steps.push('Review security audit logs for comprehensive impact analysis');
  }
  
  return steps;
}

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