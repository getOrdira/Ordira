import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateBody, validateParams } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schemas
const apiKeyParamsSchema = z.object({
  keyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid API key ID format')
});

const updateApiKeySchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters')
    .optional(),
  
  description: z.string()
    .trim()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  
  permissions: z.array(z.enum([
    'read', 'write', 'delete',
    'products:read', 'products:write', 'products:delete',
    'analytics:read', 'certificates:read', 'certificates:write',
    'votes:read', 'votes:write', 'nfts:read', 'nfts:write'
  ]))
    .min(1, 'At least one permission is required')
    .max(10, 'Maximum 10 permissions allowed')
    .optional(),
  
  ipWhitelist: z.array(z.string().ip({ version: ['ipv4', 'ipv6'] }))
    .max(10, 'Maximum 10 IP addresses in whitelist')
    .optional(),
  
  isActive: z.boolean().optional(),
  
  rateLimitTier: z.enum(['standard', 'high', 'unlimited']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be updated'
});

/**
 * PUT /api/api-keys/[keyId]/update
 * Update API key configuration
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @param keyId - API key identifier
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Rate limiting - 20 updates per minute
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-update',
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

    // Body validation
    const body = await request.json();
    const validatedBody = validateBody(body, updateApiKeySchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validatedBody.errors },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendFetch(`/api/brand/api-keys/${params.keyId}`, {
      method: 'PUT',
      body: validatedBody.data,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const updatedKeyData = await response.json();

    // Add update-specific metadata
    const enhancedResponse = {
      ...updatedKeyData,
      updateInfo: {
        updatedFields: Object.keys(validatedBody.data),
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
        securityImpact: assessSecurityImpact(validatedBody.data),
        requiresClientUpdate: checkRequiresClientUpdate(validatedBody.data),
        changeLog: generateChangeLog(validatedBody.data)
      },
      recommendations: generatePostUpdateRecommendations(validatedBody.data, tenant.plan),
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('API key update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for update processing
function assessSecurityImpact(updateData: any): 'low' | 'medium' | 'high' {
  if (updateData.permissions || updateData.ipWhitelist) return 'high';
  if (updateData.isActive !== undefined || updateData.rateLimitTier) return 'medium';
  return 'low';
}

function checkRequiresClientUpdate(updateData: any): boolean {
  return Boolean(updateData.permissions || updateData.isActive === false);
}

function generateChangeLog(updateData: any): Array<{ field: string; action: string; impact: string }> {
  const changeLog = [];
  
  if (updateData.name) {
    changeLog.push({
      field: 'name',
      action: 'updated',
      impact: 'Cosmetic change, no functional impact'
    });
  }
  
  if (updateData.permissions) {
    changeLog.push({
      field: 'permissions',
      action: 'modified',
      impact: 'Security change - affects API access capabilities'
    });
  }
  
  if (updateData.ipWhitelist) {
    changeLog.push({
      field: 'ipWhitelist',
      action: 'updated',
      impact: 'Security change - affects access restrictions'
    });
  }
  
  if (updateData.isActive !== undefined) {
    changeLog.push({
      field: 'status',
      action: updateData.isActive ? 'activated' : 'deactivated',
      impact: updateData.isActive ? 'Key reactivated' : 'Key temporarily disabled'
    });
  }
  
  if (updateData.rateLimitTier) {
    changeLog.push({
      field: 'rateLimitTier',
      action: 'changed',
      impact: 'Performance change - affects request throttling'
    });
  }
  
  return changeLog;
}

function generatePostUpdateRecommendations(updateData: any, plan: string): string[] {
  const recommendations = [];
  
  if (updateData.permissions) {
    recommendations.push('Test your API integration to ensure new permissions work as expected');
    recommendations.push('Update your application documentation to reflect permission changes');
  }
  
  if (updateData.ipWhitelist) {
    recommendations.push('Verify all authorized IP addresses can still access the API');
    recommendations.push('Consider implementing gradual rollout for IP restrictions');
  }
  
  if (updateData.isActive === false) {
    recommendations.push('Remove this key from active applications to avoid service disruption');
    recommendations.push('Monitor error logs for requests using the deactivated key');
  }
  
  if (updateData.rateLimitTier && plan !== 'enterprise') {
    recommendations.push('Consider upgrading to Enterprise for unlimited rate limiting');
  }
  
  return recommendations;
}