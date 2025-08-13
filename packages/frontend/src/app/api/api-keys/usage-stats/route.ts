// /src/app/api/api-keys/usage-stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateQuery } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for usage stats query
const usageStatsQuerySchema = z.object({
  timeframe: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).default('30d').optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day').optional(),
  keyIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/))
    .max(20, 'Maximum 20 API keys can be analyzed at once')
    .optional(),
  includeEndpoints: z.boolean().default(true).optional(),
  includeErrors: z.boolean().default(true).optional(),
  includeGeolocation: z.boolean().default(false).optional(),
  format: z.enum(['json', 'csv']).default('json').optional()
});

/**
 * GET /api/api-keys/usage-stats
 * Get comprehensive usage statistics for API keys
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @optional query: timeframe, granularity, key filters, analysis options
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 30 requests per minute for usage stats
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-usage-stats',
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

    // Plan validation - Premium or Enterprise required
    const hasAccess = await requireTenantPlan(tenant, ['premium', 'enterprise']);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Plan upgrade required for usage analytics', 
          requiredPlans: ['premium', 'enterprise'],
          currentPlan: tenant.plan 
        },
        { status: 403 }
      );
    }

    // Query validation
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse array and boolean parameters
    if (queryParams.keyIds) {
      queryParams.keyIds = queryParams.keyIds.split(',');
    }
    if (queryParams.includeEndpoints) {
      queryParams.includeEndpoints = queryParams.includeEndpoints === 'true';
    }
    if (queryParams.includeErrors) {
      queryParams.includeErrors = queryParams.includeErrors === 'true';
    }
    if (queryParams.includeGeolocation) {
      queryParams.includeGeolocation = queryParams.includeGeolocation === 'true';
    }

    const validatedQuery = validateQuery(queryParams, usageStatsQuerySchema);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.errors },
        { status: 400 }
      );
    }

    // If no specific keys requested, get usage for all keys
    let endpoint = '/api/brand/api-keys/usage-stats';
    if (validatedQuery.data?.keyIds?.length === 1) {
      // Single key usage stats
      endpoint = `/api/brand/api-keys/${validatedQuery.data.keyIds[0]}/usage`;
    }

    // Forward request to backend
    const response = await backendFetch(endpoint, {
      method: 'GET',
      params: validatedQuery.data,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const usageData = await response.json();

    // Handle CSV export format
    if (validatedQuery.data?.format === 'csv') {
      const csvData = await response.text();
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="api-usage-${validatedQuery.data.timeframe}-${new Date().toISOString().split('T')[0]}.csv"`,
          'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
        }
      });
    }

    // Enhanced JSON response with comprehensive analytics
    const enhancedResponse = {
      ...usageData,
      analytics: {
        summary: generateUsageSummary(usageData),
        trends: generateUsageTrends(usageData),
        performance: generatePerformanceMetrics(usageData),
        security: generateSecurityInsights(usageData),
        optimization: generateOptimizationRecommendations(usageData, tenant.plan),
        forecasting: generateUsageForecasting(usageData, validatedQuery.data?.timeframe)
      },
      planInsights: {
        currentPlan: tenant.plan,
        utilizationPercentage: calculateOverallUtilization(usageData, tenant.plan),
        upgradeRecommendations: generatePlanUpgradeRecommendations(usageData, tenant.plan),
        costAnalysis: generateCostAnalysis(usageData, tenant.plan)
      },
      benchmarks: {
        industryAverage: getIndustryBenchmarks(tenant.plan),
        planAverage: getPlanBenchmarks(tenant.plan),
        percentile: calculateUsagePercentile(usageData, tenant.plan)
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        analysisDepth: getAnalysisDepth(tenant.plan),
        cacheExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        rateLimitRemaining: rateLimitResult.remaining,
        exportFormats: tenant.plan === 'enterprise' ? ['json', 'csv', 'pdf'] : ['json', 'csv']
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=600', // 10 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('API keys usage stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for comprehensive usage analytics
function generateUsageSummary(data: any): any {
  const totalRequests = data.summary?.totalRequests || 0;
  const successfulRequests = totalRequests - (data.summary?.errorCount || 0);
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
  
  return {
    totalRequests,
    successfulRequests,
    errorCount: data.summary?.errorCount || 0,
    successRate: Math.round(successRate * 100) / 100,
    averageResponseTime: data.summary?.averageResponseTime || 0,
    uniqueEndpoints: data.endpointStats?.length || 0,
    peakRequestsPerHour: Math.max(...(data.timeSeries?.map((t: any) => t.requests) || [0])),
    totalDataTransfer: data.summary?.totalBytes || 0
  };
}

function generateUsageTrends(data: any): any {
  if (!data.timeSeries || data.timeSeries.length < 2) {
    return { trend: 'stable', changePercentage: 0, direction: 'neutral' };
  }
  
  const recent = data.timeSeries.slice(-7);
  const previous = data.timeSeries.slice(-14, -7);
  
  if (previous.length === 0) {
    return { trend: 'insufficient_data', changePercentage: 0, direction: 'neutral' };
  }
  
  const recentAvg = recent.reduce((sum: number, day: any) => sum + (day.requests || 0), 0) / recent.length;
  const previousAvg = previous.reduce((sum: number, day: any) => sum + (day.requests || 0), 0) / previous.length;
  
  const changePercentage = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
  
  let trend = 'stable';
  let direction = 'neutral';
  
  if (Math.abs(changePercentage) > 20) {
    trend = changePercentage > 0 ? 'increasing' : 'decreasing';
    direction = changePercentage > 0 ? 'upward' : 'downward';
  }
  
  return {
    trend,
    changePercentage: Math.round(changePercentage * 100) / 100,
    direction,
    weeklyGrowth: changePercentage,
    volatility: calculateVolatility(data.timeSeries)
  };
}

function generatePerformanceMetrics(data: any): any {
  const endpointStats = data.endpointStats || [];
  const slowestEndpoints = endpointStats
    .sort((a: any, b: any) => (b.averageResponseTime || 0) - (a.averageResponseTime || 0))
    .slice(0, 5);
  
  const fastestEndpoints = endpointStats
    .sort((a: any, b: any) => (a.averageResponseTime || 0) - (b.averageResponseTime || 0))
    .slice(0, 5);
  
  return {
    averageResponseTime: data.summary?.averageResponseTime || 0,
    p95ResponseTime: data.summary?.p95ResponseTime || 0,
    p99ResponseTime: data.summary?.p99ResponseTime || 0,
    slowestEndpoints,
    fastestEndpoints,
    throughputPerSecond: calculateThroughput(data),
    errorRateByEndpoint: calculateErrorRateByEndpoint(endpointStats)
  };
}

function generateSecurityInsights(data: any): any {
  const rateLimitViolations = data.summary?.rateLimitHits || 0;
  const suspiciousActivity = detectSuspiciousActivity(data);
  const geoStats = data.geolocationStats || [];
  
  return {
    rateLimitViolations,
    suspiciousActivityScore: suspiciousActivity.score,
    suspiciousIndicators: suspiciousActivity.indicators,
    uniqueIpAddresses: geoStats.length,
    topCountries: geoStats.slice(0, 5),
    unusualPatterns: detectUnusualPatterns(data),
    securityRecommendations: generateSecurityRecommendations(data)
  };
}

function generateOptimizationRecommendations(data: any, plan: string): string[] {
  const recommendations = [];
  
  // Performance optimizations
  if (data.summary?.averageResponseTime > 2000) {
    recommendations.push('Consider implementing caching to reduce response times');
  }
  
  // Usage pattern optimizations
  if (data.summary?.errorCount > data.summary?.totalRequests * 0.05) {
    recommendations.push('High error rate detected - review API integration and error handling');
  }
  
  // Rate limiting optimizations
  if (data.summary?.rateLimitHits > 0) {
    recommendations.push('Implement exponential backoff to reduce rate limit violations');
  }
  
  // Endpoint usage optimizations
  const endpointStats = data.endpointStats || [];
  const heavyEndpoints = endpointStats.filter((e: any) => e.requests > data.summary?.totalRequests * 0.3);
  if (heavyEndpoints.length > 0) {
    recommendations.push(`Heavy usage detected on ${heavyEndpoints.length} endpoint(s) - consider optimization`);
  }
  
  // Plan-specific recommendations
  if (plan === 'foundation' && data.summary?.totalRequests > 500) {
    recommendations.push('Consider upgrading to Growth plan for higher rate limits');
  }
  
  return recommendations;
}

function generateUsageForecasting(data: any, timeframe?: string): any {
  if (!data.timeSeries || data.timeSeries.length < 7) {
    return { forecast: 'insufficient_data', confidence: 'low' };
  }
  
  const dailyAverages = data.timeSeries.map((d: any) => d.requests || 0);
  const trend = calculateLinearTrend(dailyAverages);
  
  let forecastPeriod = 30; // days
  if (timeframe === '7d') forecastPeriod = 7;
  else if (timeframe === '90d') forecastPeriod = 90;
  
  const currentAvg = dailyAverages.slice(-7).reduce((sum: number, val: number) => sum + val, 0) / 7;
  const projectedDaily = Math.max(0, currentAvg + (trend * forecastPeriod));
  const projectedTotal = projectedDaily * forecastPeriod;
  
  return {
    forecastPeriod,
    projectedDailyAverage: Math.round(projectedDaily),
    projectedTotal: Math.round(projectedTotal),
    confidence: data.timeSeries.length >= 30 ? 'high' : data.timeSeries.length >= 14 ? 'medium' : 'low',
    trendDirection: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
    seasonalPatterns: detectSeasonalPatterns(data.timeSeries)
  };
}

function calculateOverallUtilization(data: any, plan: string): number {
  const planLimits = getPlanLimits(plan);
  const dailyUsage = data.summary?.totalRequests / Math.max(1, data.timeSeries?.length || 1);
  const dailyLimit = planLimits.requestsPerDay;
  
  return Math.min((dailyUsage / dailyLimit) * 100, 100);
}

function generatePlanUpgradeRecommendations(data: any, plan: string): string[] {
  const recommendations = [];
  const utilization = calculateOverallUtilization(data, plan);
  
  if (utilization > 80) {
    const nextPlan = getNextPlan(plan);
    if (nextPlan) {
      recommendations.push(`Consider upgrading to ${nextPlan} plan - current utilization: ${Math.round(utilization)}%`);
    }
  }
  
  if (plan !== 'enterprise' && data.summary?.rateLimitHits > 0) {
    recommendations.push('Upgrade for higher rate limits to avoid throttling');
  }
  
  if (plan === 'foundation' && data.endpointStats?.length > 5) {
    recommendations.push('Upgrade to Growth for advanced analytics and monitoring');
  }
  
  return recommendations;
}

function generateCostAnalysis(data: any, plan: string): any {
  const requests = data.summary?.totalRequests || 0;
  const planCosts = getPlanCosts(plan);
  const overageRequests = Math.max(0, requests - planCosts.includedRequests);
  const overageCost = overageRequests * planCosts.costPerExtraRequest;
  
  return {
    basePlanCost: planCosts.monthlyCost,
    includedRequests: planCosts.includedRequests,
    overageRequests,
    overageCost: Math.round(overageCost * 100) / 100,
    totalEstimatedCost: planCosts.monthlyCost + overageCost,
    costPerRequest: requests > 0 ? (planCosts.monthlyCost + overageCost) / requests : 0,
    projectedMonthlyCost: calculateProjectedMonthlyCost(data, plan)
  };
}

// Additional helper functions
function calculateVolatility(timeSeries: any[]): number {
  if (timeSeries.length < 2) return 0;
  
  const values = timeSeries.map(t => t.requests || 0);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance) / mean * 100;
}

function calculateThroughput(data: any): number {
  const totalRequests = data.summary?.totalRequests || 0;
  const timeSpan = data.timeSeries?.length || 1;
  const hoursInTimeSpan = timeSpan * 24; // Assuming daily data points
  
  return totalRequests / hoursInTimeSpan;
}

function calculateErrorRateByEndpoint(endpointStats: any[]): any[] {
  return endpointStats.map(endpoint => ({
    endpoint: endpoint.path,
    errorRate: endpoint.requests > 0 ? (endpoint.errors / endpoint.requests) * 100 : 0,
    totalErrors: endpoint.errors
  })).sort((a, b) => b.errorRate - a.errorRate);
}

function detectSuspiciousActivity(data: any): { score: number; indicators: string[] } {
  let score = 0;
  const indicators = [];
  
  // High error rate
  if (data.summary?.errorCount > data.summary?.totalRequests * 0.2) {
    score += 3;
    indicators.push('Unusually high error rate');
  }
  
  // Rapid request patterns
  const maxHourlyRequests = Math.max(...(data.timeSeries?.map((t: any) => t.requests) || [0]));
  const avgHourlyRequests = (data.summary?.totalRequests || 0) / Math.max(1, data.timeSeries?.length || 1);
  
  if (maxHourlyRequests > avgHourlyRequests * 5) {
    score += 2;
    indicators.push('Unusual traffic spikes detected');
  }
  
  return { score: Math.min(score, 10), indicators };
}

function detectUnusualPatterns(data: any): string[] {
  const patterns = [];
  
  // Weekend vs weekday usage
  const timeSeries = data.timeSeries || [];
  if (timeSeries.length >= 14) {
    const weekdayAvg = calculateWeekdayAverage(timeSeries);
    const weekendAvg = calculateWeekendAverage(timeSeries);
    
    if (weekendAvg > weekdayAvg * 1.5) {
      patterns.push('Higher weekend usage than weekdays');
    }
  }
  
  return patterns;
}

function generateSecurityRecommendations(data: any): string[] {
  const recommendations = [];
  
  if (data.summary?.rateLimitHits > 0) {
    recommendations.push('Implement proper rate limiting in your client applications');
  }
  
  if (data.geolocationStats?.length > 10) {
    recommendations.push('Consider implementing IP allowlisting for enhanced security');
  }
  
  return recommendations;
}

function getPlanLimits(plan: string) {
  switch (plan) {
    case 'foundation': return { requestsPerDay: 1000, requestsPerMonth: 30000 };
    case 'growth': return { requestsPerDay: 5000, requestsPerMonth: 150000 };
    case 'premium': return { requestsPerDay: 25000, requestsPerMonth: 750000 };
    case 'enterprise': return { requestsPerDay: 100000, requestsPerMonth: 3000000 };
    default: return { requestsPerDay: 500, requestsPerMonth: 15000 };
  }
}

function getPlanCosts(plan: string) {
  switch (plan) {
    case 'foundation': return { monthlyCost: 0, includedRequests: 15000, costPerExtraRequest: 0.001 };
    case 'growth': return { monthlyCost: 29, includedRequests: 150000, costPerExtraRequest: 0.0008 };
    case 'premium': return { monthlyCost: 99, includedRequests: 750000, costPerExtraRequest: 0.0005 };
    case 'enterprise': return { monthlyCost: 299, includedRequests: 3000000, costPerExtraRequest: 0.0003 };
    default: return { monthlyCost: 0, includedRequests: 5000, costPerExtraRequest: 0.002 };
  }
}

function getNextPlan(currentPlan: string): string | null {
  switch (currentPlan) {
    case 'foundation': return 'Growth';
    case 'growth': return 'Premium';
    case 'premium': return 'Enterprise';
    default: return null;
  }
}

function calculateLinearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
  const sumXX = values.reduce((sum, _, index) => sum + (index * index), 0);
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

function detectSeasonalPatterns(timeSeries: any[]): any {
  if (timeSeries.length < 7) return { detected: false, pattern: 'insufficient_data' };
  
  // Simple weekly pattern detection
  const dayOfWeekAverages = new Array(7).fill(0);
  const dayOfWeekCounts = new Array(7).fill(0);
  
  timeSeries.forEach((dataPoint, index) => {
    const dayOfWeek = index % 7;
    dayOfWeekAverages[dayOfWeek] += dataPoint.requests || 0;
    dayOfWeekCounts[dayOfWeek]++;
  });
  
  // Calculate averages
  for (let i = 0; i < 7; i++) {
    if (dayOfWeekCounts[i] > 0) {
      dayOfWeekAverages[i] /= dayOfWeekCounts[i];
    }
  }
  
  const maxDay = dayOfWeekAverages.indexOf(Math.max(...dayOfWeekAverages));
  const minDay = dayOfWeekAverages.indexOf(Math.min(...dayOfWeekAverages));
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const variance = calculateVariance(dayOfWeekAverages);
  const mean = dayOfWeekAverages.reduce((sum, val) => sum + val, 0) / 7;
  const coefficientOfVariation = variance > 0 ? Math.sqrt(variance) / mean : 0;
  
  return {
    detected: coefficientOfVariation > 0.2,
    pattern: coefficientOfVariation > 0.2 ? 'weekly' : 'uniform',
    peakDay: dayNames[maxDay],
    lowDay: dayNames[minDay],
    weeklyVariation: Math.round(coefficientOfVariation * 100),
    dayOfWeekAverages: dayOfWeekAverages.map((avg, index) => ({
      day: dayNames[index],
      averageRequests: Math.round(avg)
    }))
  };
}

function calculateWeekdayAverage(timeSeries: any[]): number {
  const weekdayData = timeSeries.filter((_, index) => {
    const dayOfWeek = index % 7;
    return dayOfWeek >= 0 && dayOfWeek <= 4; // Monday to Friday
  });
  
  return weekdayData.reduce((sum, day) => sum + (day.requests || 0), 0) / Math.max(1, weekdayData.length);
}

function calculateWeekendAverage(timeSeries: any[]): number {
  const weekendData = timeSeries.filter((_, index) => {
    const dayOfWeek = index % 7;
    return dayOfWeek === 5 || dayOfWeek === 6; // Saturday and Sunday
  });
  
  return weekendData.reduce((sum, day) => sum + (day.requests || 0), 0) / Math.max(1, weekendData.length);
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

function calculateProjectedMonthlyCost(data: any, plan: string): number {
  const dailyAverage = (data.summary?.totalRequests || 0) / Math.max(1, data.timeSeries?.length || 1);
  const projectedMonthlyRequests = dailyAverage * 30;
  
  const planCosts = getPlanCosts(plan);
  const overageRequests = Math.max(0, projectedMonthlyRequests - planCosts.includedRequests);
  const overageCost = overageRequests * planCosts.costPerExtraRequest;
  
  return planCosts.monthlyCost + overageCost;
}

function getIndustryBenchmarks(plan: string): any {
  // Mock industry benchmarks - in real implementation, these would come from actual data
  return {
    averageRequestsPerDay: plan === 'enterprise' ? 15000 : plan === 'premium' ? 8000 : plan === 'growth' ? 2000 : 500,
    averageSuccessRate: 97.5,
    averageResponseTime: 250,
    averageErrorRate: 2.5
  };
}

function getPlanBenchmarks(plan: string): any {
  // Mock plan-specific benchmarks
  const benchmarks = {
    foundation: { avgDailyRequests: 300, avgSuccessRate: 96.0, avgResponseTime: 400 },
    growth: { avgDailyRequests: 1500, avgSuccessRate: 97.0, avgResponseTime: 300 },
    premium: { avgDailyRequests: 6000, avgSuccessRate: 98.0, avgResponseTime: 200 },
    enterprise: { avgDailyRequests: 12000, avgSuccessRate: 99.0, avgResponseTime: 150 }
  };
  
  return benchmarks[plan as keyof typeof benchmarks] || benchmarks.foundation;
}

function calculateUsagePercentile(data: any, plan: string): number {
  const dailyUsage = (data.summary?.totalRequests || 0) / Math.max(1, data.timeSeries?.length || 1);
  const planBenchmark = getPlanBenchmarks(plan);
  
  // Simple percentile calculation based on plan average
  if (dailyUsage > planBenchmark.avgDailyRequests * 2) return 95;
  if (dailyUsage > planBenchmark.avgDailyRequests * 1.5) return 80;
  if (dailyUsage > planBenchmark.avgDailyRequests) return 60;
  if (dailyUsage > planBenchmark.avgDailyRequests * 0.5) return 40;
  return 20;
}

function getAnalysisDepth(plan: string): 'basic' | 'standard' | 'advanced' | 'enterprise' {
  switch (plan) {
    case 'foundation': return 'basic';
    case 'growth': return 'standard';
    case 'premium': return 'advanced';
    case 'enterprise': return 'enterprise';
    default: return 'basic';
  }
}