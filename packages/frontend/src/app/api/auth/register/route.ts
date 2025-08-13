// /src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { backendFetch } from '@/lib/backend';

// Validation schemas for registration
const registerBusinessSchema = z.object({
  // Business information
  businessName: z.string()
    .trim()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-&.,'()]+$/, 'Business name contains invalid characters'),
  
  businessType: z.enum([
    'sole_proprietorship', 'partnership', 'llc', 'corporation', 
    'nonprofit', 'cooperative', 'other'
  ]),
  
  industry: z.string()
    .min(2, 'Industry must be specified')
    .max(50, 'Industry name too long'),
  
  registrationNumber: z.string()
    .trim()
    .min(6, 'Registration number must be at least 6 characters')
    .max(20, 'Registration number too long')
    .optional(),
  
  taxId: z.string()
    .trim()
    .regex(/^[A-Z0-9\-]{8,15}$/i, 'Invalid tax ID format')
    .optional(),
  
  // Contact information
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email address too long')
    .transform(email => email.toLowerCase().trim()),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  
  website: z.string()
    .url('Invalid website URL')
    .optional(),
  
  // Address
  address: z.object({
    street: z.string().min(5, 'Street address required').max(100),
    city: z.string().min(2, 'City required').max(50),
    state: z.string().min(2, 'State/Province required').max(50),
    zipCode: z.string().min(3, 'Postal code required').max(20),
    country: z.string().min(2, 'Country required').max(50)
  }),
  
  // Authentication
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number')
    .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string(),
  
  // Legal and preferences
  acceptTerms: z.boolean().refine(val => val === true, 'Terms must be accepted'),
  acceptPrivacy: z.boolean().refine(val => val === true, 'Privacy policy must be accepted'),
  allowMarketing: z.boolean().default(false).optional(),
  
  // Optional tracking
  referralCode: z.string()
    .trim()
    .regex(/^[A-Z0-9]{3,20}$/i, 'Invalid referral code format')
    .optional(),
  
  planType: z.enum(['foundation', 'growth', 'premium', 'enterprise'])
    .default('foundation')
    .optional()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

const registerUserSchema = z.object({
  // Basic information
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email address too long')
    .transform(email => email.toLowerCase().trim()),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number')
    .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string(),
  
  // Optional profile information
  firstName: z.string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters')
    .optional(),
  
  lastName: z.string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters')
    .optional(),
  
  // Legal and preferences
  acceptTerms: z.boolean().refine(val => val === true, 'Terms must be accepted'),
  allowMarketing: z.boolean().default(false).optional(),
  preferredLanguage: z.enum(['en', 'es', 'fr', 'de']).default('en').optional(),
  
  // Optional tracking
  referralCode: z.string()
    .trim()
    .regex(/^[A-Z0-9]{3,20}$/i, 'Invalid referral code format')
    .optional()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * POST /api/auth/register
 * Register a new business or user account
 * 
 * @requires validation: registration data
 * @rate-limited: 5 attempts per 15 minutes per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 registrations per 15 minutes
    const rateLimitResult = await rateLimit(request, {
      identifier: 'auth-register',
      limit: 5,
      window: 15 * 60 * 1000
    });

    if (rateLimitResult.exceeded) {
      return NextResponse.json(
        { 
          error: 'Registration rate limit exceeded', 
          resetTime: rateLimitResult.resetTime,
          message: 'Too many registration attempts. Please try again later.'
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { accountType, ...registrationData } = body;

    // Determine registration type
    const isBusiness = accountType === 'business' || body.businessName;
    const schema = isBusiness ? registerBusinessSchema : registerUserSchema;
    const endpoint = isBusiness ? '/api/auth/register/business' : '/api/auth/register/user';

    // Validate registration data
    const validatedBody = validateBody(registrationData, schema);
    if (!validatedBody.success) {
      return NextResponse.json(
        { 
          error: 'Invalid registration data', 
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
      registrationMethod: 'web_interface'
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
      return NextResponse.json(error, { status: response.status });
    }

    const registrationResult = await response.json();

    // Enhanced response with frontend-specific guidance
    const enhancedResponse = {
      ...registrationResult,
      registrationInfo: {
        accountType: isBusiness ? 'business' : 'user',
        verificationRequired: true,
        registeredAt: new Date().toISOString(),
        securityLevel: calculateSecurityLevel(validatedBody.data),
        planInfo: isBusiness ? {
          selectedPlan: validatedBody.data.planType || 'foundation',
          upgradeAvailable: true,
          trialPeriod: '14 days'
        } : null
      },
      nextSteps: {
        immediate: [
          'Check your email for a verification code',
          'The verification code will expire in 15 minutes',
          'Add our email to your contacts to avoid spam filtering'
        ],
        onboarding: isBusiness ? [
          'Complete email verification',
          'Set up your business profile',
          'Configure your first API integration',
          'Explore platform features'
        ] : [
          'Complete email verification',
          'Set up your profile',
          'Browse available services',
          'Connect with businesses'
        ]
      },
      securityTips: [
        'Use a strong, unique password for your account',
        'Enable two-factor authentication when available',
        'Keep your contact information up to date',
        'Review security settings regularly'
      ],
      supportInfo: {
        helpCenter: 'https://help.yourplatform.com',
        emailSupport: 'support@yourplatform.com',
        expectedResponseTime: '24 hours',
        availableHours: 'Monday-Friday, 9 AM - 6 PM EST'
      },
      frontendMetadata: {
        requestId: crypto.randomUUID(),
        rateLimitRemaining: rateLimitResult.remaining,
        verificationCodeLength: 6,
        verificationExpiry: 15 // minutes
      }
    };

    return NextResponse.json(enhancedResponse, {
      status: 201,
      headers: {
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Registration-Type': isBusiness ? 'business' : 'user'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Don't expose internal errors
    return NextResponse.json(
      { 
        error: 'Registration failed', 
        message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
        code: 'REGISTRATION_ERROR'
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

function calculateSecurityLevel(data: any): 'basic' | 'good' | 'strong' {
  let score = 0;
  
  // Password strength
  if (data.password?.length >= 12) score += 2;
  else if (data.password?.length >= 8) score += 1;
  
  // Additional security indicators
  if (data.phone) score += 1;
  if (data.businessName && data.registrationNumber) score += 1; // Business verification
  if (!data.allowMarketing) score += 1; // Privacy-conscious
  
  if (score >= 4) return 'strong';
  if (score >= 2) return 'good';
  return 'basic';
}