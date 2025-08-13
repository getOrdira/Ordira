// src/app/api/billing/usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Types for better type safety
interface UsageMetrics {
  apiCalls: number;
  certificates: number;
  votes: number;
  storage: number;
  bandwidth: number;
}

interface UsageLimits extends UsageMetrics {
  // Limits have the same structure as metrics
}

interface UsageUtilization {
  apiCalls: number;
  certificates: number;
  votes: number;
  storage: number;
  bandwidth: number;
  overall: number;
}

interface UsageProjection {
  nextMonth: UsageMetrics;
  nextQuarter: UsageMetrics;
  confidence: 'low' | 'medium' | 'high';
  factors: string[];
}

interface UsageResponse {
  period: {
    start: Date;
    end: Date;
    timeframe: string;
  };
  currentUsage: UsageMetrics;
  limits: UsageLimits;
  utilization: UsageUtilization;
  projections: UsageProjection;
  overage: {
    hasOverage: boolean;
    items: Array<{
      metric: keyof UsageMetrics;
      current: number;
      limit: number;
      overage: number;
      cost?: number;
    }>;
    totalOverageCost: number;
  };
  recommendations: Array<{
    type: 'optimization' | 'upgrade' | 'alert';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionUrl?: string;
  }>;
  history: Array<{
    date: Date;
    metrics: UsageMetrics;
  }>;
}

interface DetailedUsageResponse {
  timeframe: string;
  period: {
    start: Date;
    end: Date;
  };
  dailyBreakdown: Array<{
    date: Date;
    apiCalls: number;
    certificates: number;
    votes: number;
    storage: number;
    bandwidth: number;
  }>;
  topEndpoints: Array<{
    endpoint: string;
    calls: number;
    percentage: number;
  }>;
  topFeatures: Array<{
    feature: string;
    usage: number;
    percentage: number;
  }>;
  peakUsage: {
    date: Date;
    metrics: UsageMetrics;
  };
  trends: {
    apiCalls: 'increasing' | 'decreasing' | 'stable';
    certificates: 'increasing' | 'decreasing' | 'stable';
    votes: 'increasing' | 'decreasing' | 'stable';
    overall: 'increasing' | 'decreasing' | 'stable';
  };
}

// Helper function to get auth token from headers
function getAuthToken(): string | null {
  const headersList = headers();
  const authorization = headersList.get('authorization');
  
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  
  return authorization.substring(7);
}

// Helper function to make authenticated requests to backend
async function makeBackendRequest(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Unauthorized');
  }

  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  
  return fetch(`${baseUrl}/api${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Helper function to calculate utilization percentage
function calculateUtilization(current: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

// Helper function to determine trend
function determineTrend(current: number, previous: number): 'increasing' | 'decreasing' | 'stable' {
  const threshold = 0.05; // 5% threshold for "stable"
  const change = (current - previous) / (previous || 1);
  
  if (Math.abs(change) < threshold) return 'stable';
  return change > 0 ? 'increasing' : 'decreasing';
}

/**
 * GET /api/billing/usage
 * Fetch comprehensive usage statistics and analytics
 * 
 * Query parameters:
 * - timeframe: '7d' | '30d' | '90d' | 'current_month' (default: '30d')
 * - detailed: boolean (include detailed breakdown)
 * - includeHistory: boolean (include historical data)
 * - compareWith: 'previous_period' | 'previous_month' | 'previous_year'
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract and validate query parameters
    const timeframe = searchParams.get('timeframe') || '30d';
    const detailed = searchParams.get('detailed') === 'true';
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const compareWith = searchParams.get('compareWith');

    // Validate timeframe
    const validTimeframes = ['7d', '30d', '90d', 'current_month'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { 
          error: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`,
          code: 'INVALID_TIMEFRAME'
        },
        { status: 400 }
      );
    }

    // Build query string for backend
    const queryParams = new URLSearchParams({
      period: timeframe,
      detailed: detailed.toString(),
      includeHistory: includeHistory.toString(),
    });

    if (compareWith) queryParams.set('compareWith', compareWith);

    // Make request to backend
    const response = await makeBackendRequest(`/billing/usage?${queryParams}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      return NextResponse.json(
        { 
          error: errorData.error || 'Failed to fetch usage data',
          code: errorData.code || 'FETCH_FAILED'
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform backend response to frontend format
    const usageResponse: UsageResponse = {
      period: {
        start: new Date(data.period.start),
        end: new Date(data.period.end),
        timeframe: data.period,
      },
      currentUsage: {
        apiCalls: data.currentUsage.apiCalls || 0,
        certificates: data.currentUsage.certificates || 0,
        votes: data.currentUsage.votes || 0,
        storage: data.currentUsage.storage || 0,
        bandwidth: data.currentUsage.bandwidth || 0,
      },
      limits: {
        apiCalls: data.limits.apiCalls || 0,
        certificates: data.limits.certificates || 0,
        votes: data.limits.votes || 0,
        storage: data.limits.storage || 0,
        bandwidth: data.limits.bandwidth || 0,
      },
      utilization: {
        apiCalls: calculateUtilization(data.currentUsage.apiCalls, data.limits.apiCalls),
        certificates: calculateUtilization(data.currentUsage.certificates, data.limits.certificates),
        votes: calculateUtilization(data.currentUsage.votes, data.limits.votes),
        storage: calculateUtilization(data.currentUsage.storage, data.limits.storage),
        bandwidth: calculateUtilization(data.currentUsage.bandwidth, data.limits.bandwidth),
        overall: data.utilization?.overall || 0,
      },
      projections: {
        nextMonth: data.projections?.nextMonth || {
          apiCalls: 0,
          certificates: 0,
          votes: 0,
          storage: 0,
          bandwidth: 0,
        },
        nextQuarter: data.projections?.nextQuarter || {
          apiCalls: 0,
          certificates: 0,
          votes: 0,
          storage: 0,
          bandwidth: 0,
        },
        confidence: data.projections?.confidence || 'medium',
        factors: data.projections?.factors || [],
      },
      overage: {
        hasOverage: data.overage?.hasOverage || false,
        items: data.overage?.items || [],
        totalOverageCost: data.overage?.totalOverageCost || 0,
      },
      recommendations: data.recommendations || [],
      history: data.history?.map((entry: any) => ({
        date: new Date(entry.date),
        metrics: entry.metrics,
      })) || [],
    };

    // Add detailed breakdown if requested
    if (detailed && data.detailed) {
      const detailedResponse: DetailedUsageResponse = {
        timeframe,
        period: usageResponse.period,
        dailyBreakdown: data.detailed.dailyBreakdown?.map((day: any) => ({
          date: new Date(day.date),
          apiCalls: day.apiCalls || 0,
          certificates: day.certificates || 0,
          votes: day.votes || 0,
          storage: day.storage || 0,
          bandwidth: day.bandwidth || 0,
        })) || [],
        topEndpoints: data.detailed.topEndpoints || [],
        topFeatures: data.detailed.topFeatures || [],
        peakUsage: data.detailed.peakUsage ? {
          date: new Date(data.detailed.peakUsage.date),
          metrics: data.detailed.peakUsage.metrics,
        } : {
          date: new Date(),
          metrics: { apiCalls: 0, certificates: 0, votes: 0, storage: 0, bandwidth: 0 },
        },
        trends: {
          apiCalls: data.detailed.trends?.apiCalls || 'stable',
          certificates: data.detailed.trends?.certificates || 'stable',
          votes: data.detailed.trends?.votes || 'stable',
          overall: data.detailed.trends?.overall || 'stable',
        },
      };

      return NextResponse.json({
        ...usageResponse,
        detailed: detailedResponse,
      });
    }

    return NextResponse.json(usageResponse);

  } catch (error) {
    console.error('Usage fetch error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/usage
 * Update usage tracking preferences or reset usage counters
 * 
 * Body:
 * - action: 'update_preferences' | 'reset_counters' | 'export_data'
 * - preferences?: { alertThresholds: object, notifications: object }
 * - resetType?: 'all' | 'api_calls' | 'certificates' | 'votes'
 * - exportFormat?: 'csv' | 'json' | 'xlsx'
 * - exportTimeframe?: string
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, preferences, resetType, exportFormat, exportTimeframe } = body;

    if (!action) {
      return NextResponse.json(
        { 
          error: 'Action is required',
          code: 'MISSING_ACTION'
        },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions = ['update_preferences', 'reset_counters', 'export_data'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { 
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
          code: 'INVALID_ACTION'
        },
        { status: 400 }
      );
    }

    // Make request to backend
    const response = await makeBackendRequest('/billing/usage/actions', {
      method: 'POST',
      body: JSON.stringify({
        action,
        preferences,
        resetType,
        exportFormat,
        exportTimeframe,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      return NextResponse.json(
        { 
          error: errorData.error || `Failed to ${action.replace('_', ' ')}`,
          code: errorData.code || 'ACTION_FAILED'
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return success response based on action
    const successMessage = {
      update_preferences: 'Usage preferences updated successfully',
      reset_counters: 'Usage counters reset successfully',
      export_data: 'Usage data export initiated'
    }[action];

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        action,
        timestamp: new Date().toISOString(),
        ...data
      }
    });

  } catch (error) {
    console.error('Usage action error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
}