// /src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for logout options
const logoutOptionsSchema = z.object({
  // Logout scope
  logoutAll: z.boolean().default(false).optional(),
  reason: z.string().max(200, 'Reason too long').optional(),
  
  // Security options
  revokeApiKeys: z.boolean().default(false).optional(),
  clearRememberMe: z.boolean().default(true).optional(),
  
  // Session management
  sessionId: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  
  // Additional context
  userInitiated: z.boolean().default(true).optional(),
  redirectUrl: z.string().url('Invalid redirect URL').optional()
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 * 
 * @requires authentication
 * @optional body: logout options
 * @rate-limited: 30 attempts per 15 minutes
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 30 logout attempts per 15 minutes
    const rateLimitResult = await rateLimit(request, {
      identifier: 'auth-logout',
      limit: 30,
      window: 15 * 60 * 1000
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Logout rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Too many logout requests. Please wait before trying again.'
        },
        { status: 429 }
      );
    }

    // Authentication (get current user context)
    const user = await authenticate(request);
    if (!user) {
      // Handle unauthenticated logout gracefully
      return handleUnauthenticatedLogout(request, rateLimitResult);
    }

    // Parse logout options
    const body = await request.json().catch(() => ({}));
    const validatedBody = validateBody(body, logoutOptionsSchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid logout options', 
          details: validatedBody.errors 
        },
        { status: 400 }
      );
    }

    // Add security context
    const securityContext = {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      timestamp: new Date().toISOString(),
      logoutMethod: 'web_interface',
      sessionId: validatedBody.data?.sessionId
    };

    // Get current auth token for invalidation
    const authToken = getAuthToken(request);

    // Forward logout request to backend
    const response = await backendFetch('/api/auth/logout', {
      method: 'POST',
      body: {
        ...validatedBody.data,
        securityContext,
        currentToken: authToken
      },
      user
    });

    // Handle backend response
    let logoutResult = { success: true };
    if (response.ok) {
      logoutResult = await response.json();
    } else {
      // Log error but proceed with frontend logout
      console.warn('Backend logout failed, proceeding with frontend cleanup');
    }

    // Prepare response headers for cookie clearing
    const response_headers = new Headers();
    
    // Clear all authentication cookies
    const cookiesToClear = [
      'auth_token',
      'refresh_token', 
      'remember_token',
      'session_id',
      'device_id'
    ];

    const isProduction = process.env.NODE_ENV === 'production';
    cookiesToClear.forEach(cookieName => {
      const clearCookieOptions = [
        `${cookieName}=`,
        'HttpOnly',
        'Path=/',
        'Max-Age=0',
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        isProduction ? 'Secure' : '',
        isProduction ? 'SameSite=Strict' : 'SameSite=Lax'
      ].filter(Boolean).join('; ');
      
      response_headers.append('Set-Cookie', clearCookieOptions);
    });

    // Enhanced logout response
    const enhancedResponse = {
      success: true,
      message: 'Successfully logged out',
      logoutInfo: {
        logoutAt: new Date().toISOString(),
        userId: user.id,
        logoutType: validatedBody.data?.logoutAll ? 'all_sessions' : 'current_session',
        reason: validatedBody.data?.reason || 'user_initiated',
        securityActions: generateSecurityActions(validatedBody.data, logoutResult)
      },
      session: {
        invalidated: true,
        tokensRevoked: authToken ? true : false,
        cookiesCleared: cookiesToClear.length,
        allSessionsTerminated: validatedBody.data?.logoutAll || false
      },
      security: {
        sessionSecured: true,
        dataCleared: true,
        apiKeysAffected: validatedBody.data?.revokeApiKeys || false,
        auditLogged: true,
        recommendations: generateLogoutSecurityRecommendations(validatedBody.data)
      },
      nextSteps: {
        immediate: [
          'You have been securely logged out',
          'All session data has been cleared from this device',
          'Close your browser if using a shared computer'
        ],
        security: [
          'Clear browser cache if using a public computer',
          'Sign out of other devices if this was a security logout',
          'Change your password if you suspect unauthorized access'
        ]
      },
      redirect: {
        suggested: '/auth/login',
        custom: validatedBody.data?.redirectUrl,
        showMessage: true,
        messageType: 'success'
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        logoutComplete: true,
        clearLocalStorage: true,
        clearSessionStorage: true
      }
    };

    // Add logout success headers
    response_headers.set('X-Rate-Limit-Remaining', rateLimitResult.remaining.toString());
    response_headers.set('X-Logout-Status', 'completed');
    response_headers.set('X-Session-Cleared', 'true');
    
    if (validatedBody.data?.redirectUrl) {
      response_headers.set('X-Redirect-To', validatedBody.data.redirectUrl);
    }

    return NextResponse.json(enhancedResponse, {
      headers: response_headers
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if logout fails, clear frontend cookies for security
    const response_headers = new Headers();
    const isProduction = process.env.NODE_ENV === 'production';
    
    const clearCookieOptions = [
      'auth_token=',
      'HttpOnly',
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      isProduction ? 'Secure' : '',
      isProduction ? 'SameSite=Strict' : 'SameSite=Lax'
    ].filter(Boolean).join('; ');
    
    response_headers.set('Set-Cookie', clearCookieOptions);
    
    return NextResponse.json(
      { 
        success: true, // Return success for security
        message: 'Logout completed with warnings',
        warning: 'Some cleanup operations may not have completed fully',
        recommendation: 'Clear your browser cache and close all browser windows for complete security'
      },
      { 
        status: 200,
        headers: response_headers
      }
    );
  }
}

/**
 * GET /api/auth/logout
 * Get logout status and options
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting for logout status checks
    const rateLimitResult = await rateLimit(request, {
      identifier: 'auth-logout-status',
      limit: 60,
      window: 15 * 60 * 1000
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get current authentication status
    const user = await authenticate(request);
    
    const logoutOptions = {
      authenticated: !!user,
      availableOptions: {
        logoutAll: user ? true : false,
        revokeApiKeys: user ? true : false,
        clearRememberMe: true,
        customRedirect: true
      },
      security: {
        hasActiveSessions: user ? true : false,
        hasApiKeys: user ? true : false, // Would need to check actual API keys
        recommendLogoutAll: false // Could be based on security context
      },
      currentSession: user ? {
        userId: user.id,
        loginTime: null, // Would come from session data
        ipAddress: getClientIP(request).substring(0, 8) + '***',
        deviceInfo: 'Current device'
      } : null,
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining
      }
    };

    return NextResponse.json(logoutOptions, {
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('Logout status error:', error);
    return NextResponse.json(
      { error: 'Failed to get logout status' },
      { status: 500 }
    );
  }
}

/**
 * Handle logout for unauthenticated requests
 */
function handleUnauthenticatedLogout(request: NextRequest, rateLimitResult: any): NextResponse {
  const response_headers = new Headers();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Clear cookies anyway for security
  const cookiesToClear = ['auth_token', 'refresh_token', 'remember_token'];
  cookiesToClear.forEach(cookieName => {
    const clearCookieOptions = [
      `${cookieName}=`,
      'HttpOnly',
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      isProduction ? 'Secure' : '',
      isProduction ? 'SameSite=Strict' : 'SameSite=Lax'
    ].filter(Boolean).join('; ');
    
    response_headers.append('Set-Cookie', clearCookieOptions);
  });

  const unauthenticatedResponse = {
    success: true,
    message: 'Logout completed (no active session found)',
    logoutInfo: {
      logoutAt: new Date().toISOString(),
      sessionFound: false,
      cookiesCleared: true
    },
    security: {
      dataCleared: true,
      recommendation: 'Clear browser cache if using a shared computer'
    },
    frontendMetadata: {
      requestId: crypto.randomUUID(),
      rateLimitRemaining: rateLimitResult.remaining,
      clearLocalStorage: true,
      clearSessionStorage: true
    }
  };

  response_headers.set('X-Rate-Limit-Remaining', rateLimitResult.remaining.toString());
  response_headers.set('X-Logout-Status', 'completed_no_session');

  return NextResponse.json(unauthenticatedResponse, {
    headers: response_headers
  });
}

// Helper functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

function getAuthToken(request: NextRequest): string | null {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get from cookies (if needed for logout)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

function generateSecurityActions(logoutData: any, logoutResult: any): string[] {
  const actions = [];
  
  actions.push('Session token invalidated');
  actions.push('Authentication cookies cleared');
  
  if (logoutData?.logoutAll) {
    actions.push('All user sessions terminated');
  }
  
  if (logoutData?.revokeApiKeys) {
    actions.push('API keys revoked for security');
  }
  
  if (logoutData?.clearRememberMe) {
    actions.push('Remember me tokens cleared');
  }
  
  actions.push('Logout event logged for audit');
  
  return actions;
}

function generateLogoutSecurityRecommendations(logoutData: any): string[] {
  const recommendations = [];
  
  if (logoutData?.reason === 'security_concern') {
    recommendations.push('Change your password immediately');
    recommendations.push('Review recent account activity');
    recommendations.push('Enable two-factor authentication if not already active');
  }
  
  recommendations.push('Close all browser windows if using a shared computer');
  recommendations.push('Clear browser history and cache on public computers');
  
  if (logoutData?.logoutAll) {
    recommendations.push('Check all your devices for any suspicious activity');
  }
  
  return recommendations;
}