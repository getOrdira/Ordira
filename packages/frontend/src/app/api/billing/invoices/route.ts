// src/app/api/billing/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Types for better type safety
interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  currency: string;
  created: Date;
  dueDate: Date | null;
  paidDate: Date | null;
  description: string;
  subscriptionId?: string;
  downloadUrl?: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
}

interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  summary: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  };
}

interface InvoiceDetailResponse {
  invoice: Invoice;
  lineItems: Array<{
    id: string;
    description: string;
    amount: number;
    quantity: number;
    period?: {
      start: Date;
      end: Date;
    };
  }>;
  paymentHistory: Array<{
    id: string;
    amount: number;
    status: string;
    created: Date;
    paymentMethod?: string;
  }>;
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

/**
 * GET /api/billing/invoices
 * Fetch paginated list of invoices for the authenticated user
 * 
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - status: string (filter by status)
 * - dateFrom: string (ISO date)
 * - dateTo: string (ISO date)
 * - sortBy: 'created' | 'amount' | 'dueDate' (default: 'created')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract and validate query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'created';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query string for backend
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });

    if (status) queryParams.set('status', status);
    if (dateFrom) queryParams.set('dateFrom', dateFrom);
    if (dateTo) queryParams.set('dateTo', dateTo);

    // Make request to backend
    const response = await makeBackendRequest(`/billing/invoices?${queryParams}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      return NextResponse.json(
        { 
          error: errorData.error || 'Failed to fetch invoices',
          code: errorData.code || 'FETCH_FAILED'
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform and enhance the response
    const invoicesResponse: InvoiceListResponse = {
      invoices: data.invoices.map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number || `INV-${invoice.id.slice(-8)}`,
        status: invoice.status,
        amount: invoice.amount_due || invoice.total || 0,
        currency: invoice.currency || 'usd',
        created: new Date(invoice.created * 1000),
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        paidDate: invoice.status_transitions?.paid_at ? 
          new Date(invoice.status_transitions.paid_at * 1000) : null,
        description: invoice.description || 
          `${invoice.billing_reason === 'subscription_cycle' ? 'Subscription' : 'One-time'} payment`,
        subscriptionId: invoice.subscription,
        downloadUrl: invoice.invoice_pdf,
        paymentMethod: invoice.payment_intent?.payment_method ? {
          type: invoice.payment_intent.payment_method.type,
          last4: invoice.payment_intent.payment_method.card?.last4,
          brand: invoice.payment_intent.payment_method.card?.brand,
        } : undefined,
      })),
      pagination: {
        page,
        limit,
        total: data.total || data.invoices.length,
        hasMore: data.has_more || false,
      },
      summary: {
        totalAmount: data.summary?.totalAmount || 0,
        paidAmount: data.summary?.paidAmount || 0,
        pendingAmount: data.summary?.pendingAmount || 0,
        overdueAmount: data.summary?.overdueAmount || 0,
      },
    };

    return NextResponse.json(invoicesResponse);

  } catch (error) {
    console.error('Invoice fetch error:', error);

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
 * POST /api/billing/invoices
 * Generate or download specific invoice actions
 * 
 * Body:
 * - action: 'download' | 'send' | 'retry_payment'
 * - invoiceId: string
 * - email?: string (for send action)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, invoiceId, email } = body;

    if (!action || !invoiceId) {
      return NextResponse.json(
        { 
          error: 'Action and invoice ID are required',
          code: 'MISSING_PARAMETERS'
        },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions = ['download', 'send', 'retry_payment'];
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
    const response = await makeBackendRequest('/billing/invoices/actions', {
      method: 'POST',
      body: JSON.stringify({ action, invoiceId, email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      return NextResponse.json(
        { 
          error: errorData.error || `Failed to ${action} invoice`,
          code: errorData.code || 'ACTION_FAILED'
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return success response based on action
    const successMessage = {
      download: 'Invoice download link generated',
      send: 'Invoice sent successfully',
      retry_payment: 'Payment retry initiated'
    }[action];

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        invoiceId,
        action,
        ...data
      }
    });

  } catch (error) {
    console.error('Invoice action error:', error);

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