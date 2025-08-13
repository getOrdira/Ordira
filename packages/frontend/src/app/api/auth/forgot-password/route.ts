// /src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schema for forgot password
const forgotPasswordSchema = z.object({
  emailOrPhone: z.string()
    .min(1, 'Email or phone number is required')
    .refine((value) => {
      // Check if it's an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a phone number
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(value) || phoneRegex.test(value);
    }, 'Must be a valid email address or phone number'),
  
  accountType: z.enum(['business', 'user']).optional(),
  captchaToken: z.string().optional(),
  
  // Additional security context
  deviceFingerprint: z.string().optional(),
  browserInfo: z.object({
    userAgent: z.string().optional(),
    language: z.string().optional(),
    platform: z.string().optional()
  }).optional()
});

// Validation schema for reset password (completing the reset)
const resetPasswordSchema = z.object({
  token: z.string()
    .min(32, 'Invalid reset token')
    .max(128, 'Invalid reset token'),
  
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number')
    .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string(),
  
  // Security context for password reset
  deviceFingerprint: z.string().optional()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset process
 * 
 * @requires validation: email or phone
 * @rate-limited: 5 attempts per 30 minutes per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting for password reset requests
    const rateLimitResult = await rateLimit(request, {
      identifier: 'auth-forgot-password',
      limit: 5,
      window: 30 * 60 * 1000 // 5 attempts per 30 minutes
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Password reset rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Too many password reset requests. Please wait before trying again.',
          security: {
            reason: 'Rate limiting helps protect against automated attacks',
            waitTime: '30 minutes',
            suggestion: 'Check your email for previous reset instructions'
          }
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, ...resetData } = body;

    // Handle password reset completion
    if (action === 'reset') {
      return await handlePasswordReset(request, resetData, rateLimitResult);
    }

    // Handle forgot password initiation
    const validatedBody = validateBody(resetData, forgotPasswordSchema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validatedBody.errors,
          help: {
            format: 'Provide a valid email address or phone number',
            examples: ['user@example.com', '+1234567890']
          }
        },
        { status: 400 }
      );
    }

    // Add comprehensive security context
    const securityContext = {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      timestamp: new Date().toISOString(),
      method: 'web_interface',
      deviceFingerprint: validatedBody.data.deviceFingerprint,
      browserInfo: {
        ...validatedBody.data.browserInfo,
        acceptLanguage: request.headers.get('accept-language'),
        referer: request.headers.get('referer')
      }
    };

    // Forward request to backend
    const response = await backendFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        ...validatedBody.data,
        securityContext
      }
    });

    // Always return success to prevent email enumeration attacks
    // Backend handles the actual logic and only sends emails for valid accounts
    const enhancedResponse = {
      success: true,
      message: 'If an account with that email exists, you will receive password reset instructions.',
      resetInfo: {
        instructionsSent: true,
        checkInMinutes: 5,
        expiryTime: '1 hour',
        nextSteps: [
          'Check your email inbox for reset instructions',
          'Look in your spam/junk folder if you don\'t see the email',
          'Follow the link in the email to reset your password',
          'The reset link will expire in 1 hour for security'
        ]
      },
      security: {
        tokenExpiry: '1 hour',
        singleUse: true,
        ipTracking: true,
        secureTransmission: true
      },
      troubleshooting: {
        noEmailReceived: [
          'Check your spam/junk folder',
          'Verify you entered the correct email address',
          'Wait a few minutes as email delivery can be delayed',
          'Contact support if you continue having issues'
        ],
        linkNotWorking: [
          'Ensure you\'re using the most recent reset email',
          'Check if the link has expired (1 hour limit)',
          'Try copying and pasting the full URL',
          'Request a new reset link if needed'
        ],
        stillHaveIssues: {
          supportEmail: 'support@yourplatform.com',
          helpCenter: 'https://help.yourplatform.com/password-reset',
          expectedResponseTime: '24 hours'
        }
      },
      prevention: {
        tips: [
          'Use a password manager to generate and store secure passwords',
          'Enable two-factor authentication when available',
          'Avoid using the same password across multiple sites',
          'Consider using a passphrase instead of a complex password'
        ]
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        canRetry: true,
        retryAfter: rateLimitResult.remaining === 0 ? rateLimitResult.resetTime : null
      }
    };

    return NextResponse.json(enhancedResponse, {
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Reset-Status': 'initiated'
      }
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Always return success for security (prevent enumeration)
    return NextResponse.json(
      { 
        success: true,
        message: 'If an account with that email exists, you will receive password reset instructions.',
        error: 'PROCESSING_ERROR',
        help: {
          suggestion: 'If you continue having issues, please contact support',
          supportEmail: 'support@yourplatform.com'
        }
      },
      { status: 200 } // Return 200 even on error to prevent enumeration
    );
  }
}

/**
 * Handle password reset completion
 */
async function handlePasswordReset(
  request: NextRequest, 
  data: any, 
  rateLimitResult: any
): Promise<NextResponse> {
  
  // Additional rate limiting for password reset completion
  const resetRateLimit = await rateLimit(request, {
    identifier: 'auth-reset-password',
    limit: 10,
    window: 30 * 60 * 1000 // 10 attempts per 30 minutes
  });

  if (resetRateLimit.exceeded) {
    return NextResponse.json(
      { 
        error: 'Password reset completion rate limit exceeded', 
        resetTime: resetRateLimit.resetTime,
        message: 'Too many password reset attempts. Please wait before trying again.',
        security: {
          reason: 'Multiple failed attempts detected',
          suggestion: 'Ensure you have the correct reset token from your email'
        }
      },
      { status: 429 }
    );
  }

  // Validate reset data
  const validatedReset = validateBody(data, resetPasswordSchema);
  if (!validatedReset.success) {
    return NextResponse.json(
      { 
        error: 'Invalid password reset data', 
        details: validatedReset.errors,
        help: {
          tokenFormat: 'Use the complete token from your reset email',
          passwordRequirements: [
            'At least 8 characters long',
            'Contains uppercase and lowercase letters',
            'Contains at least one number',
            'Contains at least one special character (@$!%*?&)'
          ]
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
    resetMethod: 'web_interface'
  };

  // Forward reset request to backend
  const response = await backendFetch('/api/auth/reset-password', {
    method: 'POST',
    body: {
      ...validatedReset.data,
      securityContext
    }
  });

  if (!response.ok) {
    const error = await response.json();
    
    // Enhanced error handling for reset failures
    const enhancedError = {
      ...error,
      resetHelp: {
        tokenExpired: error.code === 'TOKEN_EXPIRED',
        tokenInvalid: error.code === 'INVALID_TOKEN',
        tokenUsed: error.code === 'TOKEN_ALREADY_USED',
        attemptsRemaining: resetRateLimit.remaining
      },
      solutions: generateResetErrorSolutions(error.code),
      security: {
        allSessionsTerminated: error.code === 'PASSWORD_RESET_SUCCESS',
        reloginRequired: true
      }
    };
    
    return NextResponse.json(enhancedError, { status: response.status });
  }

  const resetResult = await response.json();

  // Enhanced success response
  const enhancedResponse = {
    ...resetResult,
    resetSuccess: {
      completedAt: new Date().toISOString(),
      securityActions: [
        'Password successfully updated',
        'All existing sessions have been terminated',
        'Security event logged for your account'
      ],
      nextSteps: [
        'Log in with your new password',
        'Review your account security settings',
        'Consider enabling two-factor authentication',
        'Update password in any saved browsers or password managers'
      ]
    },
    security: {
      allSessionsRevoked: true,
      loginRequired: true,
      passwordStrength: assessPasswordStrength(validatedReset.data.newPassword),
      recommendations: generateSecurityRecommendations(resetResult)
    },
    account: {
      securityImproved: true,
      lastPasswordChange: new Date().toISOString(),
      accessRestored: true
    },
    frontendMetadata: {
      requestId: crypto.randomUUID(),
      redirectToLogin: true,
      showSuccessMessage: true,
      rateLimitRemaining: resetRateLimit.remaining
    }
  };

  return NextResponse.json(enhancedResponse, {
    headers: {
      'X-Rate-Limit-Remaining': resetRateLimit.remaining.toString(),
      'X-Reset-Status': 'completed',
      'X-Redirect-To': '/auth/login'
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

function generateResetErrorSolutions(errorCode: string): string[] {
  const solutions = [];
  
  switch (errorCode) {
    case 'TOKEN_EXPIRED':
      solutions.push('Request a new password reset link');
      solutions.push('Reset tokens expire after 1 hour for security');
      break;
    case 'INVALID_TOKEN':
      solutions.push('Ensure you\'re using the complete URL from your email');
      solutions.push('Check for any missing characters when copying the link');
      break;
    case 'TOKEN_ALREADY_USED':
      solutions.push('This reset link has already been used');
      solutions.push('Request a new password reset if you need to change your password again');
      break;
    case 'ACCOUNT_NOT_FOUND':
      solutions.push('The account associated with this reset token was not found');
      solutions.push('Try registering a new account if needed');
      break;
    default:
      solutions.push('Try requesting a new password reset link');
      solutions.push('Contact support if you continue having issues');
  }
  
  return solutions;
}

function assessPasswordStrength(password: string): 'weak' | 'medium' | 'strong' | 'very_strong' {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;
  if (password.length >= 16) score += 1;
  
  if (score >= 6) return 'very_strong';
  if (score >= 5) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
}

function generateSecurityRecommendations(result: any): string[] {
  const recommendations = [];
  
  recommendations.push('Enable two-factor authentication for enhanced security');
  recommendations.push('Use a unique password that you don\'t use elsewhere');
  recommendations.push('Consider using a password manager');
  recommendations.push('Regularly review your account security settings');
  
  if (!result.twoFactorEnabled) {
    recommendations.push('Set up 2FA as soon as you log in');
  }
  
  return recommendations;
}