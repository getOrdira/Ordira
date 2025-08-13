// /src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schemas for login
const loginBusinessSchema = z.object({
  emailOrPhone: z.string()
    .min(1, 'Email or phone is required')
    .refine((value) => {
      // Check if it's an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a phone number
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(value) || phoneRegex.test(value);
    }, 'Must be a valid email address or phone number'),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
  
  rememberMe: z.boolean().default(false).optional(),
  deviceFingerprint: z.string().optional(),
  captchaToken: z.string().optional()
});

const loginUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .transform(email => email.toLowerCase().trim()),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
  
  rememberMe: z.boolean().default(false).optional(),
  deviceFingerprint: z.string().optional(),
  captchaToken: z.string().optional()
});

/**
 * POST /api/auth/login
 * Login for both business and user accounts
 * 
 * @requires validation: login credentials
 * @rate-limited: 15 attempts per 15 minutes per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 15 login attempts per 15 minutes
    const rateLimitResult = await rateLimit(request, {
      identifier: 'auth-login',
      limit: 15,
      window: 15 * 60 * 1000
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Login rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Too many login attempts. Please try again later.',
          security: {
            suggestion: 'Use forgot password if you cannot remember your credentials',
            lockoutDuration: '15 minutes'
          }
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { accountType, ...loginData } = body;

    // Determine login type based on data structure
    const isBusiness = accountType === 'business' || 
                      body.emailOrPhone || 
                      (!body.email && body.businessEmail);
    
    const schema = isBusiness ? loginBusinessSchema : loginUserSchema;
    const endpoint = isBusiness ? '/api/auth/login/business' : '/api/auth/login/user';

    // Validate login data
    const validatedBody = validateBody(loginData, schema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid login credentials', 
          details: validatedBody.errors,
          accountType: isBusiness ? 'business' : 'user'
        },
        { status: 400 }
      );
    }

    // Add security context
    const securityContext = {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      timestamp: new Date().toISOString(),
      loginMethod: 'web_interface',
      deviceFingerprint: validatedBody.data.deviceFingerprint
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
      
      // Enhanced error handling for common scenarios
      if (response.status === 401) {
        const attemptsRemaining = rateLimitResult.remaining;
        return NextResponse.json({
          ...error,
          security: {
            attemptsRemaining,
            suggestion: attemptsRemaining <= 5 ? 
              'Consider using forgot password feature' : 
              'Please check your credentials and try again',
            nextAction: attemptsRemaining <= 3 ? 'reset_password' : 'retry'
          }
        }, { status: 401 });
      }
      
      return NextResponse.json(error, { status: response.status });
    }

    const loginResult = await response.json();

    // Set secure HTTP-only cookie for token
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieMaxAge = validatedBody.data.rememberMe ? 
      30 * 24 * 60 * 60 * 1000 : // 30 days
      7 * 24 * 60 * 60 * 1000;   // 7 days

    const response_headers = new Headers();
    
    // Set auth token cookie
    if (loginResult.token) {
      const cookieOptions = [
        `auth_token=${loginResult.token}`,
        'HttpOnly',
        'Path=/',
        `Max-Age=${cookieMaxAge / 1000}`,
        isProduction ? 'Secure' : '',
        isProduction ? 'SameSite=Strict' : 'SameSite=Lax'
      ].filter(Boolean).join('; ');
      
      response_headers.set('Set-Cookie', cookieOptions);
    }

    // Enhanced response with frontend-specific data
    const enhancedResponse = {
      ...loginResult,
      loginInfo: {
        accountType: isBusiness ? 'business' : 'user',
        loginAt: new Date().toISOString(),
        sessionExpiry: new Date(Date.now() + cookieMaxAge).toISOString(),
        rememberMe: validatedBody.data.rememberMe || false,
        securityLevel: assessLoginSecurity(loginResult, securityContext)
      },
      user: {
        ...loginResult.user,
        // Don't expose sensitive information
        lastLogin: loginResult.user?.lastLogin,
        loginCount: loginResult.user?.loginCount,
        accountStatus: loginResult.user?.status || 'active'
      },
      session: {
        tokenExpiry: new Date(Date.now() + cookieMaxAge).toISOString(),
        refreshAvailable: true,
        deviceTrusted: false, // Could be enhanced based on device fingerprinting
        ipAddress: securityContext.ipAddress.substring(0, 8) + '***' // Partial IP for security
      },
      security: {
        twoFactorRequired: loginResult.requiresTwoFactor || false,
        passwordChangeRecommended: loginResult.passwordAge > 90,
        unusualActivity: loginResult.securityFlags?.unusualActivity || false,
        recommendations: generateSecurityRecommendations(loginResult, securityContext)
      },
      onboarding: isBusiness ? {
        profileComplete: loginResult.user?.profileComplete || false,
        setupSteps: generateBusinessSetupSteps(loginResult.user),
        planInfo: {
          currentPlan: loginResult.user?.plan || 'foundation',
          upgradeAvailable: true,
          trialDaysRemaining: loginResult.user?.trialDaysRemaining
        }
      } : {
        profileComplete: loginResult.user?.profileComplete || false,
        setupSteps: generateUserSetupSteps(loginResult.user)
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        loginMethod: 'password',
        requiresRedirect: loginResult.requiresTwoFactor || loginResult.requiresOnboarding
      }
    };

    // Add rate limit headers
    response_headers.set('X-Rate-Limit-Remaining', rateLimitResult.remaining.toString());
    response_headers.set('X-Account-Type', isBusiness ? 'business' : 'user');

    return NextResponse.json(enhancedResponse, {
      headers: response_headers
    });

  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { 
        error: 'Login failed', 
        message: 'An unexpected error occurred during login. Please try again.',
        code: 'LOGIN_ERROR',
        support: {
          action: 'contact_support',
          email: 'support@yourplatform.com'
        }
      },
      { status: 500 }
    );
  }
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

function assessLoginSecurity(loginResult: any, securityContext: any): 'low' | 'medium' | 'high' {
  let score = 0;
  
  // Base security factors
  if (loginResult.user?.twoFactorEnabled) score += 3;
  if (loginResult.user?.lastLogin && isRecentLogin(loginResult.user.lastLogin)) score += 1;
  if (securityContext.deviceFingerprint) score += 1;
  if (!loginResult.securityFlags?.unusualActivity) score += 2;
  
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

function isRecentLogin(lastLogin: string): boolean {
  const last = new Date(lastLogin);
  const now = new Date();
  const daysDiff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7; // Recent if within 7 days
}

function generateSecurityRecommendations(loginResult: any, securityContext: any): string[] {
  const recommendations = [];
  
  if (!loginResult.user?.twoFactorEnabled) {
    recommendations.push('Enable two-factor authentication for enhanced security');
  }
  
  if (loginResult.passwordAge > 90) {
    recommendations.push('Consider updating your password - current password is over 90 days old');
  }
  
  if (loginResult.securityFlags?.unusualActivity) {
    recommendations.push('Unusual login activity detected - review recent account activity');
  }
  
  if (!securityContext.deviceFingerprint) {
    recommendations.push('Enable device tracking for better security monitoring');
  }
  
  return recommendations;
}

function generateBusinessSetupSteps(user: any): string[] {
  const steps = [];
  
  if (!user?.businessProfile?.verified) {
    steps.push('Complete business verification');
  }
  
  if (!user?.paymentMethod) {
    steps.push('Add payment method for plan upgrades');
  }
  
  if (!user?.apiKeys?.length) {
    steps.push('Create your first API key');
  }
  
  if (!user?.integrations?.length) {
    steps.push('Set up your first integration');
  }
  
  return steps;
}

function generateUserSetupSteps(user: any): string[] {
  const steps = [];
  
  if (!user?.profile?.firstName) {
    steps.push('Complete your profile information');
  }
  
  if (!user?.preferences?.language) {
    steps.push('Set your language preferences');
  }
  
  if (!user?.notifications?.configured) {
    steps.push('Configure notification preferences');
  }
  
  return steps;
}