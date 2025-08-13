import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateQuery } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for overview analytics query
const overviewAnalyticsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum(['votes', 'certificates', 'connections', 'revenue', 'transactions', 'engagement']))
    .min(1)
    .max(10)
    .optional(),
  format: z.enum(['json', 'csv', 'xlsx']).default('json').optional()
});

/**
 * GET /api/analytics/overview
 * Get comprehensive business analytics overview
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 60 requests per minute
    const rateLimitResult = await rateLimit(request, {
      identifier: 'analytics-overview',
      limit: 60,
      window: 60 * 1000 // 1 minute
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
          error: 'Plan upgrade required', 
          requiredPlans: ['premium', 'enterprise'],
          currentPlan: tenant.plan 
        },
        { status: 403 }
      );
    }

    // Query validation
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse array parameters
    if (queryParams.metrics) {
      queryParams.metrics = queryParams.metrics.split(',');
    }

    const validatedQuery = validateQuery(queryParams, overviewAnalyticsSchema);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.errors },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendFetch('/api/analytics/overview', {
      method: 'GET',
      params: validatedQuery.data,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const analyticsData = await response.json();

    // Add frontend-specific metadata
    const enhancedResponse = {
      ...analyticsData,
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
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
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
