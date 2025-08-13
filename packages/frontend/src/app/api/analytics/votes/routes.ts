import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateQuery } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for votes analytics
const votesAnalyticsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  proposalId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  groupBy: z.array(z.enum(['proposal', 'voter', 'date', 'status'])).max(3).optional(),
  timeframe: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).default('30d').optional()
});

/**
 * GET /api/analytics/votes
 * Get voting analytics with enhanced filtering
 * 
 * @requires authentication & tenant context
 * @requires growth plan or higher
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 100 requests per minute for votes analytics
    const rateLimitResult = await rateLimit(request, {
      identifier: 'analytics-votes',
      limit: 100,
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

    // Plan validation - Growth, Premium, or Enterprise required
    const hasAccess = await requireTenantPlan(tenant, ['growth', 'premium', 'enterprise']);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Plan upgrade required for voting analytics', 
          requiredPlans: ['growth', 'premium', 'enterprise'],
          currentPlan: tenant.plan 
        },
        { status: 403 }
      );
    }

    // Query validation
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse array parameters
    if (queryParams.groupBy) {
      queryParams.groupBy = queryParams.groupBy.split(',');
    }

    const validatedQuery = validateQuery(queryParams, votesAnalyticsSchema);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.errors },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendFetch('/api/analytics/votes', {
      method: 'GET',
      params: validatedQuery.data,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const votesData = await response.json();

    // Add voting-specific metadata
    const enhancedResponse = {
      ...votesData,
      votingInsights: {
        planFeatures: {
          currentPlan: tenant.plan,
          hasAdvancedAnalytics: ['premium', 'enterprise'].includes(tenant.plan),
          hasRealTimeUpdates: tenant.plan === 'enterprise'
        },
        recommendations: generateVotingRecommendations(votesData, tenant.plan)
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        cacheExpiry: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes for votes
        rateLimitRemaining: rateLimitResult.remaining
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=120', // 2 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('Votes analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function for voting recommendations
function generateVotingRecommendations(data: any, plan: string): string[] {
  const recommendations = [];
  
  if (data.summary?.participationRate < 0.3) {
    recommendations.push('Consider increasing voter engagement through incentives');
  }
  
  if (plan === 'growth' && data.summary?.totalProposals > 10) {
    recommendations.push('Upgrade to Premium for advanced proposal analytics');
  }
  
  if (data.timeSeries?.length && data.timeSeries[data.timeSeries.length - 1].count < data.summary?.averageVotes) {
    recommendations.push('Recent voting activity is below average - consider community outreach');
  }
  
  return recommendations;
}
