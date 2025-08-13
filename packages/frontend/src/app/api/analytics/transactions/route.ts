import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateQuery } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for transactions analytics
const transactionsAnalyticsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(['all', 'nft_mint', 'vote_batch', 'certificate_issue']).default('all'),
  status: z.enum(['pending', 'confirmed', 'failed']).optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  timeframe: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).default('30d').optional(),
  includeGasAnalysis: z.boolean().default(false).optional()
});

/**
 * GET /api/analytics/transactions
 * Get blockchain transaction analytics with business insights
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 60 requests per minute for transaction analytics
    const rateLimitResult = await rateLimit(request, {
      identifier: 'analytics-transactions',
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

    // Plan validation - Premium or Enterprise required
    const hasAccess = await requireTenantPlan(tenant, ['premium', 'enterprise']);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Plan upgrade required for transaction analytics', 
          requiredPlans: ['premium', 'enterprise'],
          currentPlan: tenant.plan 
        },
        { status: 403 }
      );
    }

    // Query validation
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Convert string numbers to actual numbers
    if (queryParams.minAmount) queryParams.minAmount = parseFloat(queryParams.minAmount);
    if (queryParams.maxAmount) queryParams.maxAmount = parseFloat(queryParams.maxAmount);
    if (queryParams.includeGasAnalysis) queryParams.includeGasAnalysis = queryParams.includeGasAnalysis === 'true';

    const validatedQuery = validateQuery(queryParams, transactionsAnalyticsSchema);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.errors },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendFetch('/api/analytics/transactions', {
      method: 'GET',
      params: validatedQuery.data,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const transactionData = await response.json();

    // Add transaction-specific insights
    const enhancedResponse = {
      ...transactionData,
      blockchainInsights: {
        networkHealth: calculateNetworkHealth(transactionData),
        gasOptimization: generateGasOptimizationTips(transactionData),
        costAnalysis: calculateCostAnalysis(transactionData),
        planFeatures: {
          currentPlan: tenant.plan,
          hasAdvancedTransactionFilters: tenant.plan === 'enterprise',
          hasRealTimeAlerts: tenant.plan === 'enterprise',
          hasGasOptimization: tenant.plan === 'enterprise'
        }
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        cacheExpiry: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes
        rateLimitRemaining: rateLimitResult.remaining
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=180', // 3 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('Transaction analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for transaction insights
function calculateNetworkHealth(data: any): any {
  const totalTransactions = data.summary?.totalCount || 0;
  const failedTransactions = data.summary?.failedCount || 0;
  const successRate = totalTransactions > 0 ? ((totalTransactions - failedTransactions) / totalTransactions) * 100 : 100;
  
  return {
    successRate,
    status: successRate > 95 ? 'healthy' : successRate > 85 ? 'warning' : 'critical',
    avgConfirmationTime: data.insights?.avgConfirmationTime || null
  };
}

function generateGasOptimizationTips(data: any): string[] {
  const tips = [];
  
  if (data.insights?.averageGasPrice > 20) {
    tips.push('Consider batching transactions during off-peak hours to reduce gas costs');
  }
  
  if (data.summary?.failedCount > 0) {
    tips.push('Failed transactions indicate potential gas limit issues - review transaction parameters');
  }
  
  if (data.insights?.peakTransactionDay) {
    tips.push(`Peak activity on ${data.insights.peakTransactionDay.date} - plan accordingly for network congestion`);
  }
  
  return tips;
}

function calculateCostAnalysis(data: any): any {
  const totalVolume = data.summary?.totalVolume || 0;
  const totalCount = data.summary?.totalCount || 0;
  const totalGasCost = data.summary?.totalGasCost || 0;
  
  return {
    avgTransactionValue: totalCount > 0 ? totalVolume / totalCount : 0,
    avgGasCost: totalCount > 0 ? totalGasCost / totalCount : 0,
    gasToValueRatio: totalVolume > 0 ? (totalGasCost / totalVolume) * 100 : 0,
    projectedMonthlyCosts: (totalGasCost / (data.timeSeries?.length || 1)) * 30
  };
}