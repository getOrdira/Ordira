// /src/app/api/api-keys/[keyId]/usage/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { resolveTenant, requireTenantPlan } from '@/lib/tenant';
import { validateParams, validateQuery } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schemas
const apiKeyParamsSchema = z.object({
  keyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid API key ID format')
});

const keyUsageQuerySchema = z.object({
  timeframe: z.enum(['1h', '24h', '7d', '30d', '90d', '1y', 'all']).default('30d').optional(),
  granularity: z.enum(['minute', 'hour', 'day', 'week', 'month']).default('day').optional(),
  includeEndpoints: z.boolean().default(true).optional(),
  includeErrors: z.boolean().default(true).optional(),
  includeGeolocation: z.boolean().default(false).optional(),
  includeUserAgents: z.boolean().default(false).optional(),
  groupBy: z.array(z.enum(['endpoint', 'status', 'hour', 'country', 'userAgent']))
    .max(3, 'Maximum 3 grouping options')
    .optional(),
  format: z.enum(['json', 'csv']).default('json').optional()
});

/**
 * GET /api/api-keys/[keyId]/usage
 * Get detailed usage statistics for a specific API key
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @param keyId - API key identifier
 * @optional query: timeframe, granularity, analysis options
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Rate limiting - 60 requests per minute for individual key usage
    const rateLimitResult = await rateLimit(request, {
      identifier: 'api-key-individual-usage',
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
          error: 'Plan upgrade required for detailed usage analytics', 
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

    // Query validation
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse array and boolean parameters
    if (queryParams.groupBy) {
      queryParams.groupBy = queryParams.groupBy.split(',');
    }
    ['includeEndpoints', 'includeErrors', 'includeGeolocation', 'includeUserAgents'].forEach(param => {
      if (queryParams[param]) {
        queryParams[param] = queryParams[param] === 'true';
      }
    });

    const validatedQuery = validateQuery(queryParams, keyUsageQuerySchema);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.errors },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendFetch(`/api/brand/api-keys/${params.keyId}/usage`, {
      method: 'GET',
      params: validatedQuery.data,
      user,
      tenant
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    // Handle CSV export format
    if (validatedQuery.data?.format === 'csv') {
      const csvData = await response.text();
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="api-key-usage-${params.keyId}-${validatedQuery.data.timeframe}-${new Date().toISOString().split('T')[0]}.csv"`,
          'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
        }
      });
    }

    const usageData = await response.json();

    // Enhanced JSON response with comprehensive analytics
    const enhancedResponse = {
      ...usageData,
      keyInfo: {
        keyId: params.keyId,
        timeframe: validatedQuery.data?.timeframe,
        granularity: validatedQuery.data?.granularity,
        analysisDepth: getAnalysisDepth(tenant.plan)
      },
      analytics: {
        summary: generateUsageSummary(usageData),
        performance: generatePerformanceAnalytics(usageData),
        patterns: generateUsagePatterns(usageData, validatedQuery.data?.timeframe),
        security: generateSecurityAnalytics(usageData),
        efficiency: generateEfficiencyMetrics(usageData),
        forecasting: generateUsageForecasting(usageData, validatedQuery.data?.timeframe)
      },
      insights: {
        topPerformingEndpoints: getTopPerformingEndpoints(usageData),
        errorAnalysis: generateErrorAnalysis(usageData),
        peakUsageTimes: identifyPeakUsageTimes(usageData),
        geographicDistribution: analyzeGeographicDistribution(usageData),
        clientBehavior: analyzeClientBehavior(usageData)
      },
      optimization: {
        recommendations: generateOptimizationRecommendations(usageData, tenant.plan),
        cachingOpportunities: identifyCachingOpportunities(usageData),
        rateLimitOptimization: analyzeRateLimitOptimization(usageData),
        costOptimization: generateCostOptimization(usageData, tenant.plan)
      },
      benchmarking: {
        planBenchmarks: getPlanBenchmarks(tenant.plan),
        industryComparison: getIndustryComparison(usageData, tenant.plan),
        performanceScore: calculatePerformanceScore(usageData),
        utilizationEfficiency: calculateUtilizationEfficiency(usageData, tenant.plan)
      },
      alerts: {
        active: generateActiveAlerts(usageData, tenant.plan),
        recommendations: generateAlertRecommendations(usageData, tenant.plan),
        thresholds: getAlertThresholds(tenant.plan)
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        rateLimitRemaining: rateLimitResult.remaining,
        dataPoints: usageData.timeSeries?.length || 0,
        analysisTime: new Date().toISOString()
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Analysis-Depth': getAnalysisDepth(tenant.plan)
      }
    });

  } catch (error) {
    console.error('API key usage analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for comprehensive usage analysis
function generateUsageSummary(data: any): any {
  const totalRequests = data.summary?.totalRequests || 0;
  const successfulRequests = totalRequests - (data.summary?.errorCount || 0);
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
  
  return {
    totalRequests,
    successfulRequests,
    errorCount: data.summary?.errorCount || 0,
    successRate: Math.round(successRate * 100) / 100,
    averageRequestsPerDay: calculateAverageRequestsPerDay(data),
    peakRequestsPerHour: Math.max(...(data.timeSeries?.map((t: any) => t.requests) || [0])),
    uniqueEndpoints: data.endpointStats?.length || 0,
    dataTransferred: formatDataSize(data.summary?.totalBytes || 0),
    avgResponseTime: data.summary?.averageResponseTime || 0,
    firstRequest: data.summary?.firstRequestAt,
    lastRequest: data.summary?.lastRequestAt
  };
}

function generatePerformanceAnalytics(data: any): any {
  const endpointStats = data.endpointStats || [];
  
  return {
    responseTimeDistribution: {
      p50: data.summary?.p50ResponseTime || 0,
      p95: data.summary?.p95ResponseTime || 0,
      p99: data.summary?.p99ResponseTime || 0,
      max: data.summary?.maxResponseTime || 0
    },
    throughput: {
      requestsPerSecond: calculateThroughput(data),
      requestsPerMinute: calculateThroughput(data) * 60,
      peakThroughput: calculatePeakThroughput(data)
    },
    endpointPerformance: {
      fastest: endpointStats.sort((a: any, b: any) => 
        (a.averageResponseTime || 0) - (b.averageResponseTime || 0)
      ).slice(0, 5),
      slowest: endpointStats.sort((a: any, b: any) => 
        (b.averageResponseTime || 0) - (a.averageResponseTime || 0)
      ).slice(0, 5)
    },
    reliabilityScore: calculateReliabilityScore(data)
  };
}

function generateUsagePatterns(data: any, timeframe?: string): any {
  const timeSeries = data.timeSeries || [];
  
  return {
    dailyPatterns: analyzeDailyPatterns(timeSeries),
    weeklyPatterns: analyzeWeeklyPatterns(timeSeries),
    seasonality: detectSeasonality(timeSeries, timeframe),
    trends: {
      direction: calculateTrendDirection(timeSeries),
      strength: calculateTrendStrength(timeSeries),
      volatility: calculateVolatility(timeSeries)
    },
    cyclic: detectCyclicPatterns(timeSeries),
    anomalies: detectAnomalies(timeSeries)
  };
}

function generateSecurityAnalytics(data: any): any {
  return {
    rateLimitViolations: data.summary?.rateLimitHits || 0,
    suspiciousActivity: {
      score: calculateSuspiciousActivityScore(data),
      indicators: identifySuspiciousIndicators(data),
      patterns: detectSuspiciousPatterns(data)
    },
    accessPatterns: {
      uniqueIPs: data.geolocationStats?.length || 0,
      countries: data.geolocationStats?.slice(0, 10) || [],
      userAgents: data.userAgentStats?.slice(0, 10) || []
    },
    errorPatterns: analyzeErrorPatterns(data),
    complianceIndicators: assessComplianceIndicators(data)
  };
}

function generateEfficiencyMetrics(data: any): any {
  return {
    apiUtilization: calculateApiUtilization(data),
    endpointEfficiency: calculateEndpointEfficiency(data),
    bandwidthEfficiency: calculateBandwidthEfficiency(data),
    errorReduction: calculateErrorReduction(data),
    cacheHitRate: data.summary?.cacheHitRate || 0,
    redundancyScore: calculateRedundancyScore(data)
  };
}

function generateUsageForecasting(data: any, timeframe?: string): any {
  const timeSeries = data.timeSeries || [];
  
  if (timeSeries.length < 7) {
    return { 
      forecast: 'insufficient_data', 
      confidence: 'low',
      message: 'Need at least 7 data points for forecasting'
    };
  }
  
  const trend = calculateLinearTrend(timeSeries.map((t: any) => t.requests || 0));
  const currentAverage = calculateRecentAverage(timeSeries, 7);
  
  let forecastPeriod = 30; // days
  if (timeframe === '7d') forecastPeriod = 7;
  else if (timeframe === '90d') forecastPeriod = 90;
  
  return {
    nextPeriod: {
      forecastPeriod,
      estimatedRequests: Math.max(0, Math.round(currentAverage + (trend * forecastPeriod))),
      confidenceLevel: timeSeries.length >= 30 ? 'high' : timeSeries.length >= 14 ? 'medium' : 'low',
      trendDirection: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
    },
    longTerm: {
      monthlyGrowthRate: calculateMonthlyGrowthRate(timeSeries),
      yearlyProjection: calculateYearlyProjection(timeSeries),
      seasonalAdjustments: calculateSeasonalAdjustments(timeSeries)
    },
    capacityPlanning: generateCapacityPlanningAdvice(data, trend)
  };
}

function getTopPerformingEndpoints(data: any): any[] {
  const endpointStats = data.endpointStats || [];
  
  return endpointStats
    .map((endpoint: any) => ({
      ...endpoint,
      performanceScore: calculateEndpointPerformanceScore(endpoint)
    }))
    .sort((a: any, b: any) => b.performanceScore - a.performanceScore)
    .slice(0, 10);
}

function generateErrorAnalysis(data: any): any {
  const endpointStats = data.endpointStats || [];
  const errorsByType = data.errorsByType || {};
  
  return {
    errorRate: (data.summary?.errorCount || 0) / Math.max(1, data.summary?.totalRequests || 1) * 100,
    errorsByEndpoint: endpointStats
      .filter((e: any) => e.errorCount > 0)
      .sort((a: any, b: any) => b.errorCount - a.errorCount)
      .slice(0, 10),
    errorsByType: Object.entries(errorsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a: any, b: any) => b.count - a.count),
    errorTrends: calculateErrorTrends(data),
    criticalErrors: identifyCriticalErrors(data)
  };
}

function identifyPeakUsageTimes(data: any): any {
  const timeSeries = data.timeSeries || [];
  
  if (timeSeries.length === 0) return null;
  
  const hourlyAverages = new Array(24).fill(0);
  const hourlyCounts = new Array(24).fill(0);
  
  timeSeries.forEach((dataPoint: any) => {
    if (dataPoint.timestamp) {
      const hour = new Date(dataPoint.timestamp).getHours();
      hourlyAverages[hour] += dataPoint.requests || 0;
      hourlyCounts[hour]++;
    }
  });
  
  // Calculate averages
  for (let i = 0; i < 24; i++) {
    if (hourlyCounts[i] > 0) {
      hourlyAverages[i] /= hourlyCounts[i];
    }
  }
  
  const peakHour = hourlyAverages.indexOf(Math.max(...hourlyAverages));
  const lowHour = hourlyAverages.indexOf(Math.min(...hourlyAverages));
  
  return {
    peakHour,
    peakHourRequests: Math.round(hourlyAverages[peakHour]),
    lowHour,
    lowHourRequests: Math.round(hourlyAverages[lowHour]),
    hourlyDistribution: hourlyAverages.map((avg, hour) => ({
      hour,
      averageRequests: Math.round(avg)
    })),
    peakToLowRatio: hourlyAverages[lowHour] > 0 ? hourlyAverages[peakHour] / hourlyAverages[lowHour] : null
  };
}

function analyzeGeographicDistribution(data: any): any {
  const geoStats = data.geolocationStats || [];
  
  if (geoStats.length === 0) return null;
  
  const totalRequests = geoStats.reduce((sum: number, stat: any) => sum + (stat.requests || 0), 0);
  
  return {
    countries: geoStats.slice(0, 15).map((stat: any) => ({
      ...stat,
      percentage: totalRequests > 0 ? (stat.requests / totalRequests * 100) : 0
    })),
    diversity: geoStats.length,
    concentration: calculateGeographicConcentration(geoStats),
    riskAssessment: assessGeographicRisk(geoStats)
  };
}

function analyzeClientBehavior(data: any): any {
  const userAgentStats = data.userAgentStats || [];
  
  return {
    clientTypes: categorizeUserAgents(userAgentStats),
    topClients: userAgentStats.slice(0, 10),
    behaviorPatterns: detectClientBehaviorPatterns(data),
    integrationHealth: assessIntegrationHealth(userAgentStats)
  };
}

function generateOptimizationRecommendations(data: any, plan: string): string[] {
  const recommendations = [];
  const errorRate = (data.summary?.errorCount || 0) / Math.max(1, data.summary?.totalRequests || 1) * 100;
  const avgResponseTime = data.summary?.averageResponseTime || 0;
  
  // Performance optimizations
  if (avgResponseTime > 2000) {
    recommendations.push('Consider implementing caching to reduce response times');
    recommendations.push('Review database query optimization for slow endpoints');
  }
  
  // Error rate optimizations
  if (errorRate > 5) {
    recommendations.push('High error rate detected - review API integration and error handling');
    recommendations.push('Implement exponential backoff for failed requests');
  }
  
  // Rate limiting optimizations
  if (data.summary?.rateLimitHits > 0) {
    recommendations.push('Implement request queuing to reduce rate limit violations');
    recommendations.push('Consider upgrading plan for higher rate limits');
  }
  
  // Usage pattern optimizations
  const peakUsage = identifyPeakUsageTimes(data);
  if (peakUsage?.peakToLowRatio > 5) {
    recommendations.push('Consider load balancing during peak hours');
    recommendations.push('Implement request scheduling for non-critical operations');
  }
  
  // Plan-specific recommendations
  if (plan === 'foundation') {
    recommendations.push('Upgrade to Growth plan for advanced analytics and optimization tools');
  } else if (plan === 'growth' && data.summary?.totalRequests > 3000) {
    recommendations.push('Consider Premium plan for enhanced performance features');
  }
  
  return recommendations;
}

function identifyCachingOpportunities(data: any): any {
  const endpointStats = data.endpointStats || [];
  
  const readOnlyEndpoints = endpointStats.filter((e: any) => 
    e.method === 'GET' && e.requests > 100 && e.averageResponseTime > 500
  );
  
  const frequentEndpoints = endpointStats.filter((e: any) => 
    e.requests > (data.summary?.totalRequests || 0) * 0.1
  );
  
  return {
    highImpactCaching: readOnlyEndpoints.slice(0, 5),
    frequentEndpoints: frequentEndpoints.slice(0, 5),
    potentialSavings: calculateCachingSavings(readOnlyEndpoints),
    recommendations: [
      'Implement Redis caching for frequently accessed GET endpoints',
      'Use CDN for static content and API responses',
      'Consider edge caching for geographically distributed users'
    ]
  };
}

function analyzeRateLimitOptimization(data: any): any {
  const rateLimitHits = data.summary?.rateLimitHits || 0;
  const totalRequests = data.summary?.totalRequests || 0;
  const rateLimitRate = totalRequests > 0 ? (rateLimitHits / totalRequests) * 100 : 0;
  
  return {
    currentViolationRate: rateLimitRate,
    severity: rateLimitRate > 5 ? 'high' : rateLimitRate > 1 ? 'medium' : 'low',
    recommendations: rateLimitHits > 0 ? [
      'Implement exponential backoff in client applications',
      'Use request queuing to smooth traffic spikes',
      'Monitor rate limit headers and adjust request patterns',
      'Consider upgrading plan for higher rate limits'
    ] : [
      'Current rate limiting is well managed',
      'Monitor during traffic spikes'
    ],
    optimizationPotential: calculateRateLimitOptimizationPotential(data)
  };
}

function generateCostOptimization(data: any, plan: string): any {
  const totalRequests = data.summary?.totalRequests || 0;
  const planLimits = getPlanLimits(plan);
  const utilizationRate = (totalRequests / planLimits.requestsPerMonth) * 100;
  
  return {
    currentUtilization: utilizationRate,
    costEfficiency: calculateCostEfficiency(data, plan),
    recommendations: utilizationRate > 80 ? [
      'High utilization - consider upgrading plan',
      'Optimize high-frequency endpoints to reduce total requests',
      'Implement caching to reduce API calls'
    ] : utilizationRate < 20 ? [
      'Low utilization - current plan may be oversized',
      'Monitor usage patterns before making plan changes',
      'Consider downgrading if usage remains low'
    ] : [
      'Good plan utilization',
      'Monitor for seasonal variations'
    ],
    projectedMonthlyCost: calculateProjectedMonthlyCost(data, plan)
  };
}

// Additional helper functions
function calculateAverageRequestsPerDay(data: any): number {
  const timeSeries = data.timeSeries || [];
  if (timeSeries.length === 0) return 0;
  
  const totalRequests = timeSeries.reduce((sum: number, day: any) => sum + (day.requests || 0), 0);
  return Math.round(totalRequests / timeSeries.length);
}

function formatDataSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function calculateThroughput(data: any): number {
  const totalRequests = data.summary?.totalRequests || 0;
  const timeSeries = data.timeSeries || [];
  const timeSpanHours = timeSeries.length * 24; // Assuming daily data points
  
  return timeSpanHours > 0 ? totalRequests / (timeSpanHours * 3600) : 0; // requests per second
}

function calculatePeakThroughput(data: any): number {
  const timeSeries = data.timeSeries || [];
  const maxHourlyRequests = Math.max(...timeSeries.map((t: any) => t.requests || 0));
  return maxHourlyRequests / 3600; // Convert to requests per second
}

function calculateReliabilityScore(data: any): number {
  const totalRequests = data.summary?.totalRequests || 0;
  const errorCount = data.summary?.errorCount || 0;
  const successRate = totalRequests > 0 ? ((totalRequests - errorCount) / totalRequests) * 100 : 100;
  
  // Additional factors
  const responseTimeScore = Math.max(0, 100 - ((data.summary?.averageResponseTime || 0) / 50)); // Penalize slow responses
  const rateLimitScore = Math.max(0, 100 - ((data.summary?.rateLimitHits || 0) / 10)); // Penalize rate limit hits
  
  return Math.round((successRate * 0.6 + responseTimeScore * 0.3 + rateLimitScore * 0.1) * 100) / 100;
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

function calculateRecentAverage(timeSeries: any[], days: number): number {
  const recentData = timeSeries.slice(-days);
  return recentData.reduce((sum: number, day: any) => sum + (day.requests || 0), 0) / Math.max(1, recentData.length);
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

function getPlanLimits(plan: string) {
  switch (plan) {
    case 'foundation': return { requestsPerMonth: 30000, requestsPerDay: 1000 };
    case 'growth': return { requestsPerMonth: 150000, requestsPerDay: 5000 };
    case 'premium': return { requestsPerMonth: 750000, requestsPerDay: 25000 };
    case 'enterprise': return { requestsPerMonth: 3000000, requestsPerDay: 100000 };
    default: return { requestsPerMonth: 15000, requestsPerDay: 500 };
  }
}

function getPlanBenchmarks(plan: string): any {
  const benchmarks = {
    foundation: { avgDailyRequests: 300, avgSuccessRate: 96.0, avgResponseTime: 400 },
    growth: { avgDailyRequests: 1500, avgSuccessRate: 97.0, avgResponseTime: 300 },
    premium: { avgDailyRequests: 6000, avgSuccessRate: 98.0, avgResponseTime: 200 },
    enterprise: { avgDailyRequests: 12000, avgSuccessRate: 99.0, avgResponseTime: 150 }
  };
  
  return benchmarks[plan as keyof typeof benchmarks] || benchmarks.foundation;
}

function getIndustryComparison(data: any, plan: string): any {
  const dailyAverage = calculateAverageRequestsPerDay(data);
  const benchmarks = getPlanBenchmarks(plan);
  
  return {
    vsIndustryAverage: ((dailyAverage / benchmarks.avgDailyRequests) * 100) - 100,
    performanceRank: dailyAverage > benchmarks.avgDailyRequests * 1.5 ? 'top_25' :
                    dailyAverage > benchmarks.avgDailyRequests ? 'above_average' :
                    dailyAverage > benchmarks.avgDailyRequests * 0.5 ? 'average' : 'below_average'
  };
}

function calculatePerformanceScore(data: any): number {
  const successRate = data.summary?.totalRequests > 0 ? 
    ((data.summary.totalRequests - (data.summary?.errorCount || 0)) / data.summary.totalRequests) * 100 : 100;
  
  const responseTimeScore = Math.max(0, 100 - ((data.summary?.averageResponseTime || 0) / 50));
  const reliabilityScore = calculateReliabilityScore(data);
  
  return Math.round((successRate * 0.4 + responseTimeScore * 0.3 + reliabilityScore * 0.3) * 100) / 100;
}

function calculateUtilizationEfficiency(data: any, plan: string): number {
  const planLimits = getPlanLimits(plan);
  const actualUsage = data.summary?.totalRequests || 0;
  const timeSpan = data.timeSeries?.length || 1;
  const monthlyUsage = (actualUsage / timeSpan) * 30;
  
  return Math.min((monthlyUsage / planLimits.requestsPerMonth) * 100, 100);
}

function generateActiveAlerts(data: any, plan: string): any[] {
  const alerts = [];
  const errorRate = (data.summary?.errorCount || 0) / Math.max(1, data.summary?.totalRequests || 1) * 100;
  
  if (errorRate > 10) {
    alerts.push({
      type: 'high_error_rate',
      severity: 'critical',
      message: `Error rate of ${errorRate.toFixed(1)}% exceeds threshold`,
      action: 'Review API integration and error handling'
    });
  }
  
  if (data.summary?.rateLimitHits > 50) {
    alerts.push({
      type: 'rate_limit_violations',
      severity: 'warning',
      message: `${data.summary.rateLimitHits} rate limit violations detected`,
      action: 'Implement request throttling or upgrade plan'
    });
  }
  
  if (data.summary?.averageResponseTime > 5000) {
    alerts.push({
      type: 'slow_response_time',
      severity: 'warning',
      message: `Average response time of ${data.summary.averageResponseTime}ms is very slow`,
      action: 'Optimize API endpoints and consider caching'
    });
  }
  
  return alerts;
}

function generateAlertRecommendations(data: any, plan: string): string[] {
  const recommendations = [];
  
  if (plan === 'foundation') {
    recommendations.push('Upgrade to Growth plan for real-time alerts and monitoring');
  }
  
  if (plan !== 'enterprise') {
    recommendations.push('Enterprise plan includes advanced alerting and SLA monitoring');
  }
  
  recommendations.push('Set up monitoring dashboards for proactive issue detection');
  recommendations.push('Configure notification channels for critical alerts');
  
  return recommendations;
}

function getAlertThresholds(plan: string): any {
  const thresholds = {
    foundation: { errorRate: 15, responseTime: 10000, rateLimitHits: 100 },
    growth: { errorRate: 10, responseTime: 5000, rateLimitHits: 50 },
    premium: { errorRate: 5, responseTime: 2000, rateLimitHits: 25 },
    enterprise: { errorRate: 2, responseTime: 1000, rateLimitHits: 10 }
  };
  
  return thresholds[plan as keyof typeof thresholds] || thresholds.foundation;
}

// Placeholder functions for complex analytics (would be implemented based on specific requirements)
function analyzeDailyPatterns(timeSeries: any[]): any { return { detected: false }; }
function analyzeWeeklyPatterns(timeSeries: any[]): any { return { detected: false }; }
function detectSeasonality(timeSeries: any[], timeframe?: string): any { return { detected: false }; }
function calculateTrendDirection(timeSeries: any[]): string { return 'stable'; }
function calculateTrendStrength(timeSeries: any[]): number { return 0; }
function calculateVolatility(timeSeries: any[]): number { return 0; }
function detectCyclicPatterns(timeSeries: any[]): any { return { detected: false }; }
function detectAnomalies(timeSeries: any[]): any[] { return []; }
function calculateSuspiciousActivityScore(data: any): number { return 0; }
function identifySuspiciousIndicators(data: any): string[] { return []; }
function detectSuspiciousPatterns(data: any): any[] { return []; }
function analyzeErrorPatterns(data: any): any { return {}; }
function assessComplianceIndicators(data: any): any { return {}; }
function calculateApiUtilization(data: any): number { return 0; }
function calculateEndpointEfficiency(data: any): any { return {}; }
function calculateBandwidthEfficiency(data: any): number { return 0; }
function calculateErrorReduction(data: any): number { return 0; }
function calculateRedundancyScore(data: any): number { return 0; }
function calculateMonthlyGrowthRate(timeSeries: any[]): number { return 0; }
function calculateYearlyProjection(timeSeries: any[]): number { return 0; }
function calculateSeasonalAdjustments(timeSeries: any[]): any { return {}; }
function generateCapacityPlanningAdvice(data: any, trend: number): string[] { return []; }
function calculateEndpointPerformanceScore(endpoint: any): number { return 0; }
function calculateErrorTrends(data: any): any { return {}; }
function identifyCriticalErrors(data: any): any[] { return []; }
function calculateGeographicConcentration(geoStats: any[]): number { return 0; }
function assessGeographicRisk(geoStats: any[]): string { return 'low'; }
function categorizeUserAgents(userAgentStats: any[]): any { return {}; }
function detectClientBehaviorPatterns(data: any): any { return {}; }
function assessIntegrationHealth(userAgentStats: any[]): string { return 'healthy'; }
function calculateCachingSavings(endpoints: any[]): any { return {}; }
function calculateRateLimitOptimizationPotential(data: any): number { return 0; }
function calculateCostEfficiency(data: any, plan: string): number { return 0; }
function calculateProjectedMonthlyCost(data: any, plan: string): number { return 0; }