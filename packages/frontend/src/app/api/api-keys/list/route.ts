// /src/app/api/api-keys/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateQuery } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for list query parameters
const apiKeyListQuerySchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  status: z.enum(['active', 'inactive', 'expired', 'all']).default('all').optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'lastUsedAt', 'expiresAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional()
});

/**
 * GET /api/api-keys/list
 * List all API keys for the authenticated brand with filtering and pagination
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @optional query: pagination, filtering, sorting
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 60 requests per minute
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-list',
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
          error: 'Plan upgrade required for API key management', 
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
    if (queryParams.page) queryParams.page = parseInt(queryParams.page);
    if (queryParams.limit) queryParams.limit = parseInt(queryParams.limit);

    const validatedQuery = validateQuery(queryParams, apiKeyListQuerySchema);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.errors },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendFetch('/api/brand/api-keys', {
      method: 'GET',
      params: validatedQuery.data,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const apiKeysData = await response.json();

    // Add frontend-specific enhancements
    const enhancedResponse = {
      ...apiKeysData,
      keys: apiKeysData.keys?.map((key: any) => ({
        ...key,
        // Mask the actual API key for security
        key: key.key ? `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}` : null,
        security: {
          ...key.security,
          isExpiringSoon: key.security?.daysUntilExpiry && key.security.daysUntilExpiry <= 30,
          needsRotation: calculateNeedsRotation(key),
          riskLevel: calculateRiskLevel(key)
        },
        usage: {
          ...key.usage,
          utilizationPercentage: calculateUtilization(key, tenant.plan),
          trend: calculateUsageTrend(key.usage)
        }
      })) || [],
      planInsights: {
        currentPlan: tenant.plan,
        upgradeRecommendations: generateUpgradeRecommendations(apiKeysData, tenant.plan),
        securityRecommendations: generateSecurityRecommendations(apiKeysData.keys || [])
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        rateLimitRemaining: rateLimitResult.remaining,
        totalPages: Math.ceil((apiKeysData.summary?.totalKeys || 0) / (validatedQuery.data?.limit || 20))
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('API keys list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for enhanced data
function calculateNeedsRotation(key: any): boolean {
  if (!key.createdAt) return false;
  
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(key.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceCreation > 90; // Recommend rotation after 90 days
}

function calculateRiskLevel(key: any): 'low' | 'medium' | 'high' {
  let riskScore = 0;
  
  // Check for security issues
  if (!key.security?.isActive) riskScore += 2;
  if (key.security?.daysUntilExpiry && key.security.daysUntilExpiry <= 7) riskScore += 3;
  if (key.security?.rateLimitStatus === 'warning') riskScore += 1;
  if (calculateNeedsRotation(key)) riskScore += 2;
  if (!key.allowedOrigins?.length && !key.ipWhitelist?.length) riskScore += 1;
  
  if (riskScore >= 4) return 'high';
  if (riskScore >= 2) return 'medium';
  return 'low';
}

function calculateUtilization(key: any, plan: string): number {
  const rateLimits = getPlanRateLimits(plan);
  const dailyUsage = key.usage?.averageDaily || 0;
  const dailyLimit = rateLimits.requestsPerDay;
  
  return Math.min((dailyUsage / dailyLimit) * 100, 100);
}

function calculateUsageTrend(usage: any): 'increasing' | 'decreasing' | 'stable' {
  if (!usage?.timeSeries || usage.timeSeries.length < 2) return 'stable';
  
  const recent = usage.timeSeries.slice(-7); // Last 7 days
  const older = usage.timeSeries.slice(-14, -7); // Previous 7 days
  
  const recentAvg = recent.reduce((sum: number, day: any) => sum + (day.requests || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum: number, day: any) => sum + (day.requests || 0), 0) / older.length;
  
  const changePercentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  
  if (changePercentage > 20) return 'increasing';
  if (changePercentage < -20) return 'decreasing';
  return 'stable';
}

function generateUpgradeRecommendations(data: any, plan: string): string[] {
  const recommendations = [];
  
  if (plan === 'premium' && data.summary?.totalKeys >= 10) {
    recommendations.push('Upgrade to Enterprise for unlimited API keys and advanced features');
  }
  
  if (plan === 'foundation') {
    recommendations.push('Upgrade to Premium for advanced API key management features');
  }
  
  return recommendations;
}

function generateSecurityRecommendations(keys: any[]): string[] {
  const recommendations = [];
  
  const expiringSoon = keys.filter(k => k.security?.daysUntilExpiry && k.security.daysUntilExpiry <= 30);
  if (expiringSoon.length > 0) {
    recommendations.push(`${expiringSoon.length} API key(s) expiring within 30 days - consider renewal`);
  }
  
  const needRotation = keys.filter(k => calculateNeedsRotation(k));
  if (needRotation.length > 0) {
    recommendations.push(`${needRotation.length} API key(s) should be rotated (older than 90 days)`);
  }
  
  const noRestrictions = keys.filter(k => !k.allowedOrigins?.length && !k.ipWhitelist?.length);
  if (noRestrictions.length > 0) {
    recommendations.push(`${noRestrictions.length} API key(s) have no IP or origin restrictions`);
  }
  
  return recommendations;
}

function getPlanRateLimits(plan: string) {
  switch (plan) {
    case 'foundation': return { requestsPerMinute: 100, requestsPerDay: 1000 };
    case 'growth': return { requestsPerMinute: 300, requestsPerDay: 5000 };
    case 'premium': return { requestsPerMinute: 1000, requestsPerDay: 25000 };
    case 'enterprise': return { requestsPerMinute: 5000, requestsPerDay: 100000 };
    default: return { requestsPerMinute: 50, requestsPerDay: 500 };
  }
}