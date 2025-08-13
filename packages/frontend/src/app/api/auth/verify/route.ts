// /src/app/api/auth/verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schemas for verification
const verifyBusinessSchema = z.object({
  businessId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid business ID format')
    .optional(),
  
  email: z.string()
    .email('Invalid email format')
    .optional(),
  
  emailCode: z.string()
    .regex(/^[A-Z0-9]{6}$/, 'Email verification code must be 6 alphanumeric characters')
    .optional(),
  
  phoneCode: z.string()
    .regex(/^[A-Z0-9]{6}$/, 'Phone verification code must be 6 alphanumeric characters')
    .optional(),
  
  deviceFingerprint: z.string().optional()
}).refine(data => data.emailCode || data.phoneCode, {
  message: 'Either email or phone verification code is required'
}).refine(data => data.email || data.businessId, {
  message: 'Either email or business ID is required'
});

const verifyUserSchema = z.object({
  email: z.string()
    .email('Invalid email format'),
  
  emailCode: z.string()
    .regex(/^[A-Z0-9]{6}$/, 'Verification code must be 6 alphanumeric characters'),
  
  deviceFingerprint: z.string().optional()
});

// Schema for resending verification codes
const resendVerificationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .optional(),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  
  businessId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid business ID format')
    .optional(),
  
  verificationType: z.enum(['email', 'phone', 'both']).default('email')
}).refine(data => data.email || data.phone || data.businessId, {
  message: 'Email, phone, or business ID is required'
});

/**
 * POST /api/auth/verify
 * Verify email/phone for business or user accounts
 * 
 * @requires validation: verification codes
 * @rate-limited: 15 attempts per 15 minutes per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 15 verification attempts per 15 minutes
    const rateLimitResult = await rateLimit(request, {
      identifier: 'auth-verify',
      limit: 15,
      window: 15 * 60 * 1000
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Verification rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Too many verification attempts. Please wait before trying again.',
          help: {
            suggestion: 'Double-check your verification code and try again later',
            resendAvailable: false
          }
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { accountType, action, ...verificationData } = body;

    // Handle resend verification code requests
    if (action === 'resend') {
      return await handleResendVerification(request, verificationData, rateLimitResult);
    }

    // Determine verification type
    const isBusiness = accountType === 'business' || 
                      body.businessId || 
                      body.phoneCode ||
                      (!body.email && body.businessEmail);
    
    const schema = isBusiness ? verifyBusinessSchema : verifyUserSchema;
    const endpoint = isBusiness ? '/api/auth/verify/business' : '/api/auth/verify/user';

    // Validate verification data
    const validatedBody = validateBody(verificationData, schema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid verification data', 
          details: validatedBody.errors,
          accountType: isBusiness ? 'business' : 'user',
          help: {
            suggestion: 'Please check your verification code format and try again',
            codeFormat: '6 alphanumeric characters (A-Z, 0-9)'
          }
        },
        { status: 400 }
      );
    }

    // Add security context
    const securityContext = {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      timestamp: new Date().toISOString(),
      verificationMethod: 'web_interface'
    };

    // Forward request to backend
    const response = await backendFetch(endpoint, {
      method: 'POST',
      body: {
        ...validatedBody.data,
        securityContext
      }
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Enhanced error handling for verification failures
      if (response.status === 400 || response.status === 401) {
        const attemptsRemaining = rateLimitResult.remaining;
        return NextResponse.json({
          ...error,
          verification: {
            attemptsRemaining,
            codeExpired: error.code === 'VERIFICATION_CODE_EXPIRED',
            invalidCode: error.code === 'INVALID_VERIFICATION_CODE',
            accountNotFound: error.code === 'ACCOUNT_NOT_FOUND',
            alreadyVerified: error.code === 'ALREADY_VERIFIED'
          },
          nextActions: generateVerificationErrorActions(error.code, attemptsRemaining),
          help: {
            codeFormat: '6 alphanumeric characters (A-Z, 0-9)',
            expiryTime: '15 minutes',
            resendAvailable: attemptsRemaining > 5
          }
        }, { status: response.status });
      }
      
      return NextResponse.json(error, { status: response.status });
    }

    const verificationResult = await response.json();

    // Set secure HTTP-only cookie for authenticated session
    const isProduction = process.env.NODE_ENV === 'production';
    const response_headers = new Headers();
    
    if (verificationResult.token) {
      const cookieOptions = [
        `auth_token=${verificationResult.token}`,
        'HttpOnly',
        'Path=/',
        'Max-Age=604800', // 7 days
        isProduction ? 'Secure' : '',
        isProduction ? 'SameSite=Strict' : 'SameSite=Lax'
      ].filter(Boolean).join('; ');
      
      response_headers.set('Set-Cookie', cookieOptions);
    }

    // Enhanced response with verification success details
    const enhancedResponse = {
      ...verificationResult,
      verificationInfo: {
        accountType: isBusiness ? 'business' : 'user',
        verifiedAt: new Date().toISOString(),
        verificationType: isBusiness ? 
          (validatedBody.data.emailCode && validatedBody.data.phoneCode ? 'both' : 
           validatedBody.data.emailCode ? 'email' : 'phone') : 'email',
        securityLevel: calculateVerificationSecurityLevel(verificationResult)
      },
      account: {
        ...verificationResult.user || verificationResult.business,
        status: 'verified',
        verificationComplete: true,
        accountActive: true
      },
      onboarding: {
        nextSteps: generatePostVerificationSteps(verificationResult, isBusiness),
        profileCompletion: calculateProfileCompletion(verificationResult),
        recommendedActions: generateRecommendedActions(verificationResult, isBusiness)
      },
      security: {
        accountSecured: true,
        loginEnabled: true,
        twoFactorRecommended: !verificationResult.twoFactorEnabled,
        securityScore: calculateSecurityScore(verificationResult),
        recommendations: generateSecurityRecommendations(verificationResult)
      },
      welcome: {
        message: isBusiness ? 
          'Welcome to the platform! Your business account is now verified and ready to use.' :
          'Welcome! Your account is now verified and you can start exploring our services.',
        quickStart: isBusiness ? [
          'Set up your business profile',
          'Create your first API key',
          'Explore integration options',
          'Review plan features'
        ] : [
          'Complete your profile',
          'Browse available services',
          'Set up preferences',
          'Connect with businesses'
        ]
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        verificationComplete: true,
        redirectToOnboarding: !verificationResult.profileComplete,
        redirectToDashboard: verificationResult.profileComplete
      }
    };

    // Add success headers
    response_headers.set('X-Rate-Limit-Remaining', rateLimitResult.remaining.toString());
    response_headers.set('X-Account-Type', isBusiness ? 'business' : 'user');
    response_headers.set('X-Verification-Status', 'completed');

    return NextResponse.json(enhancedResponse, {
      headers: response_headers
    });

  } catch (error) {
    console.error('Verification error:', error);
    
    return NextResponse.json(
      { 
        error: 'Verification failed', 
        message: 'An unexpected error occurred during verification. Please try again.',
        code: 'VERIFICATION_ERROR',
        help: {
          suggestion: 'Try refreshing the page and entering your verification code again',
          support: 'Contact support if the problem persists'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Handle resend verification code requests
 */
async function handleResendVerification(
  request: NextRequest, 
  data: any, 
  rateLimitResult: any
): Promise<NextResponse> {
  
  // Additional rate limiting for resend requests (more restrictive)
  const resendRateLimit = await rateLimit(request, {
    identifier: 'auth-verify-resend',
    limit: 3,
    window: 15 * 60 * 1000 // 3 attempts per 15 minutes
  });

  if (resendRateLimit.exceeded) {
    return NextResponse.json(
      { 
        error: 'Resend rate limit exceeded', 
        resetTime: resendRateLimit.resetTime,
        message: 'Too many resend requests. Please wait before requesting another code.',
        help: {
          waitTime: '15 minutes',
          suggestion: 'Check your spam/junk folder for the previous verification email'
        }
      },
      { status: 429 }
    );
  }

  // Validate resend request
  const validatedResend = validateBody(data, resendVerificationSchema);
  if (!validatedResend.success) {
    return NextResponse.json(
      { 
        error: 'Invalid resend request', 
        details: validatedResend.errors
      },
      { status: 400 }
    );
  }

  // Forward resend request to backend
  const response = await backendFetch('/api/auth/resend-verification', {
    method: 'POST',
    body: {
      ...validatedResend.data,
      securityContext: {
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        timestamp: new Date().toISOString()
      }
    }
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json(error, { status: response.status });
  }

  const resendResult = await response.json();

  return NextResponse.json({
    ...resendResult,
    resendInfo: {
      sentAt: new Date().toISOString(),
      expiryTime: '15 minutes',
      attemptsRemaining: resendRateLimit.remaining,
      checkSpamFolder: true
    },
    help: {
      troubleshooting: [
        'Check your spam/junk folder',
        'Add our email to your contacts',
        'Try a different email if issue persists',
        'Contact support if you continue having problems'
      ],
      expectedDelivery: '1-2 minutes',
      supportEmail: 'support@yourplatform.com'
    }
  }, {
    headers: {
      'X-Rate-Limit-Remaining': resendRateLimit.remaining.toString(),
      'X-Resend-Status': 'sent'
    }
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

function generateVerificationErrorActions(errorCode: string, attemptsRemaining: number): string[] {
  const actions = [];
  
  switch (errorCode) {
    case 'VERIFICATION_CODE_EXPIRED':
      actions.push('Request a new verification code');
      actions.push('Check the timestamp on your email');
      break;
    case 'INVALID_VERIFICATION_CODE':
      actions.push('Double-check the code in your email');
      actions.push('Ensure you\'re using the most recent code');
      if (attemptsRemaining <= 3) {
        actions.push('Consider requesting a new code if you continue having issues');
      }
      break;
    case 'ACCOUNT_NOT_FOUND':
      actions.push('Verify you\'re using the correct email address');
      actions.push('Try registering a new account if needed');
      break;
    case 'ALREADY_VERIFIED':
      actions.push('Try logging in instead');
      actions.push('Your account is already active');
      break;
    default:
      actions.push('Try again with the correct verification code');
      actions.push('Request a new code if the current one has expired');
  }
  
  return actions;
}

function calculateVerificationSecurityLevel(result: any): 'basic' | 'standard' | 'enhanced' {
  let score = 0;
  
  if (result.emailVerified) score += 2;
  if (result.phoneVerified) score += 2;
  if (result.twoFactorEnabled) score += 3;
  if (result.deviceFingerprint) score += 1;
  
  if (score >= 6) return 'enhanced';
  if (score >= 4) return 'standard';
  return 'basic';
}

function generatePostVerificationSteps(result: any, isBusiness: boolean): string[] {
  const steps = [];
  
  if (isBusiness) {
    steps.push('Complete your business profile');
    if (!result.paymentMethodAdded) {
      steps.push('Add a payment method for plan upgrades');
    }
    steps.push('Create your first API key');
    steps.push('Set up integrations');
    steps.push('Explore plan features');
  } else {
    steps.push('Complete your personal profile');
    steps.push('Set up your preferences');
    steps.push('Browse available services');
    steps.push('Connect with verified businesses');
  }
  
  return steps;
}

function calculateProfileCompletion(result: any): number {
  let completed = 0;
  let total = 0;
  
  // Basic verification always counts
  if (result.emailVerified) completed += 1;
  total += 1;
  
  // Additional profile fields
  if (result.profileComplete) completed += 3;
  total += 3;
  
  if (result.paymentMethodAdded) completed += 1;
  total += 1;
  
  return Math.round((completed / total) * 100);
}

function generateRecommendedActions(result: any, isBusiness: boolean): string[] {
  const actions = [];
  
  if (!result.twoFactorEnabled) {
    actions.push('Enable two-factor authentication for enhanced security');
  }
  
  if (isBusiness && !result.businessVerified) {
    actions.push('Complete business verification for additional features');
  }
  
  if (!result.profileComplete) {
    actions.push('Complete your profile to unlock all features');
  }
  
  return actions;
}

function calculateSecurityScore(result: any): number {
  let score = 50; // Base score for verified account
  
  if (result.emailVerified) score += 20;
  if (result.phoneVerified) score += 15;
  if (result.twoFactorEnabled) score += 10;
  if (result.strongPassword) score += 5;
  
  return Math.min(score, 100);
}

function generateSecurityRecommendations(result: any): string[] {
  const recommendations = [];
  
  if (!result.twoFactorEnabled) {
    recommendations.push('Enable two-factor authentication');
  }
  
  if (!result.phoneVerified && result.emailVerified) {
    recommendations.push('Add and verify a phone number for account recovery');
  }
  
  if (!result.strongPassword) {
    recommendations.push('Consider using a stronger password');
  }
  
  recommendations.push('Regularly review your account security settings');
  
  return recommendations;
}