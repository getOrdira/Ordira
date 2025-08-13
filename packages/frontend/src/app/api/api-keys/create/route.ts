// /src/app/api/api-keys/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for API key creation
const createApiKeySchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters')
    .default('Default API Key'),
  
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
    .default(['read']),
  
  expiresAt: z.string().datetime().optional(),
  
  rateLimits: z.object({
    requestsPerMinute: z.number().int().min(1).max(10000),
    requestsPerDay: z.number().int().min(1).max(1000000)
  }).optional(),
  
  allowedOrigins: z.array(z.string().url().or(z.string().ip()))
    .max(10, 'Maximum 10 allowed origins')
    .optional(),
  
  ipWhitelist: z.array(z.string().ip({ version: ['ipv4', 'ipv6'] }))
    .max(10, 'Maximum 10 IP addresses in whitelist')
    .optional(),
  
  rateLimitTier: z.enum(['standard', 'high', 'unlimited'])
    .default('standard')
    .optional()
});

/**
 * POST /api/api-keys/create
 * Create a new API key for the authenticated brand
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @requires validation: API key creation data
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 10 creations per minute
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-create',
      limit: 10,
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

    // Plan validation - Premium or Enterprise required
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

    // Body validation
    const body = await request.json();
    const validatedBody = validateBody(body, createApiKeySchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid API key data', details: validatedBody.errors },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendFetch('/api/brand/api-keys', {
      method: 'POST',
      body: validatedBody.data,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const apiKeyData = await response.json();

    // Add frontend-specific metadata
    const enhancedResponse = {
      ...apiKeyData,
      security: {
        keyVisible: true, // Key is only shown once
        rotationRecommended: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        planFeatures: {
          currentPlan: tenant.plan,
          canRotate: tenant.plan === 'enterprise',
          maxKeys: getMaxKeysForPlan(tenant.plan),
          advancedPermissions: ['premium', 'enterprise'].includes(tenant.plan)
        }
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        rateLimitRemaining: rateLimitResult.remaining
      }
    };

    return NextResponse.json(enhancedResponse, {
      status: 201,
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get max keys based on plan
function getMaxKeysForPlan(plan: string): number {
  switch (plan) {
    case 'foundation': return 2;
    case 'growth': return 5;
    case 'premium': return 15;
    case 'enterprise': return 50;
    default: return 1;
  }
}