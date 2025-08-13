import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateManufacturer } from '@/lib/manufacturer-auth';
import { validateQuery } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for manufacturer analytics
const manufacturerAnalyticsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  brandId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  metrics: z.array(z.enum(['connections', 'orders', 'certificates', 'revenue']))
    .min(1)
    .max(10)
    .optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day').optional(),
  timeframe: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).default('30d').optional()
});

/**
 * GET /api/analytics/manufacturer
 * Get manufacturer analytics with brand relationship insights
 * 
 * @requires manufacturer authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 100 requests per minute for manufacturer analytics
    const rateLimitResult = await rateLimit(request, {
      identifier: 'analytics-manufacturer',
      limit: 100,
      window: 60 * 1000
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimitResult.resetTime },
        { status: 429 }
      );
    }

    // Manufacturer authentication
    const manufacturer = await authenticateManufacturer(request);
    if (!manufacturer) {
      return NextResponse.json({ error: 'Manufacturer authentication required' }, { status: 401 });
    }

    // Query validation
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse array parameters
    if (queryParams.metrics) {
      queryParams.metrics = queryParams.metrics.split(',');
    }

    const validatedQuery = validateQuery(queryParams, manufacturerAnalyticsSchema);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.errors },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendFetch('/api/analytics/manufacturer', {
      method: 'GET',
      params: validatedQuery.data,
      manufacturer
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const manufacturerData = await response.json();

    // Add manufacturer-specific insights
    const enhancedResponse = {
      ...manufacturerData,
      manufacturerInsights: {
        verificationStatus: manufacturer.isVerified ? 'verified' : 'pending',
        brandConnectionTrends: calculateBrandTrends(manufacturerData),
        performanceMetrics: calculateManufacturerPerformance(manufacturerData),
        recommendations: generateManufacturerRecommendations(manufacturerData, manufacturer)
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        manufacturerId: manufacturer.id,
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
    console.error('Manufacturer analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for manufacturer insights
function calculateBrandTrends(data: any): any {
  const brandConnections = data.brandMetrics?.connections || [];
  const currentMonth = brandConnections[brandConnections.length - 1]?.count || 0;
  const previousMonth = brandConnections[brandConnections.length - 2]?.count || 0;
  
  return {
    monthlyGrowth: previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0,
    totalBrands: data.summary?.totalBrands || 0,
    activeBrands: data.summary?.activeBrands || 0,
    averageOrderValue: data.summary?.averageOrderValue || 0
  };
}

function calculateManufacturerPerformance(data: any): any {
  const orders = data.orderMetrics || {};
  const certificates = data.certificateMetrics || {};
  
  return {
    fulfillmentRate: orders.totalOrders > 0 ? (orders.completedOrders / orders.totalOrders) * 100 : 100,
    averageDeliveryTime: orders.averageDeliveryTime || null,
    certificateIssueRate: certificates.totalRequests > 0 ? (certificates.issued / certificates.totalRequests) * 100 : 100,
    qualityScore: calculateQualityScore(data)
  };
}

function calculateQualityScore(data: any): number {
  // Simple quality score calculation based on various metrics
  let score = 100;
  
  if (data.orderMetrics?.fulfillmentRate < 90) score -= 20;
  if (data.certificateMetrics?.issueRate < 95) score -= 15;
  if (data.brandMetrics?.averageRating < 4.5) score -= 10;
  
  return Math.max(0, score);
}

function generateManufacturerRecommendations(data: any, manufacturer: any): string[] {
  const recommendations = [];
  
  if (!manufacturer.isVerified) {
    recommendations.push('Complete verification process to access premium features');
  }
  
  if (data.summary?.totalBrands < 5) {
    recommendations.push('Connect with more brands to increase revenue opportunities');
  }
  
  if (data.orderMetrics?.fulfillmentRate < 95) {
    recommendations.push('Focus on improving order fulfillment rate to maintain brand relationships');
  }
  
  if (data.brandMetrics?.monthlyGrowth < 10) {
    recommendations.push('Consider marketing initiatives to attract new brand partnerships');
  }
  
  return recommendations;
}