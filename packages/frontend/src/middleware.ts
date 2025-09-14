// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Constants
const AUTH_TOKEN_COOKIE = 'auth_token';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');
const MFG_JWT_SECRET = new TextEncoder().encode(process.env.MFG_JWT_SECRET || 'default-secret');

// Types for better type safety
interface JWTPayload {
  sub: string; // User ID
  userType: 'customer' | 'manufacturer' | 'business';
  role: 'customer' | 'manufacturer' | 'brand';
  email: string;
  permissions?: string[];
  iat: number;
  exp: number;
}

interface RouteConfig {
  path: string;
  allowedRoles?: ('customer' | 'manufacturer' | 'brand')[];
  requireAuth: boolean;
  redirectUnauthenticated?: string;
  redirectUnauthorized?: string;
}

/**
 * Route configuration aligned with backend middleware patterns
 */
const routeConfigs: RouteConfig[] = [
  // Public routes (no authentication required)
  { path: '/', requireAuth: false },
  { path: '/pricing', requireAuth: false },
  { path: '/about', requireAuth: false },
  { path: '/contact', requireAuth: false },
  
  // Authentication routes (redirect if already authenticated)
  { path: '/auth/login', requireAuth: false },
  { path: '/auth/register', requireAuth: false },
  { path: '/auth/forgot-password', requireAuth: false },
  { path: '/auth/reset-password', requireAuth: false },
  { path: '/auth/verify-email', requireAuth: false },
  
  // Customer routes (for voting and certificates)
  { 
    path: '/gate', 
    requireAuth: true, 
    allowedRoles: ['customer'],
    redirectUnauthenticated: '/auth/login',
    redirectUnauthorized: '/auth/login?error=unauthorized'
  },
  { 
    path: '/vote', 
    requireAuth: true, 
    allowedRoles: ['customer'],
    redirectUnauthenticated: '/auth/login',
    redirectUnauthorized: '/auth/login?error=unauthorized'
  },
  { 
    path: '/certificate', 
    requireAuth: true, 
    allowedRoles: ['customer'],
    redirectUnauthenticated: '/auth/login',
    redirectUnauthorized: '/auth/login?error=unauthorized'
  },
  { 
    path: '/proposals', 
    requireAuth: true, 
    allowedRoles: ['customer'],
    redirectUnauthenticated: '/auth/login',
    redirectUnauthorized: '/auth/login?error=unauthorized'
  },
  
  // Brand routes (business users)
  { 
    path: '/brand', 
    requireAuth: true, 
    allowedRoles: ['brand'],
    redirectUnauthenticated: '/auth/login',
    redirectUnauthorized: '/manufacturer/dashboard'
  },
  
  // Manufacturer routes
  { 
    path: '/manufacturer', 
    requireAuth: true, 
    allowedRoles: ['manufacturer'],
    redirectUnauthenticated: '/auth/login',
    redirectUnauthorized: '/brand/dashboard'
  }
];

/**
 * Authentication routes that should redirect authenticated users
 */
const authRoutes = ['/auth/login', '/auth/register'];

/**
 * Default redirects based on user role
 */
const roleBasedRedirects = {
  customer: '/gate',
  manufacturer: '/manufacturer/dashboard',
  brand: '/brand/dashboard'
};

/**
 * Verify and decode JWT token
 * Tries both JWT_SECRET (for brands/customers) and MFG_JWT_SECRET (for manufacturers)
 */
async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // Try JWT_SECRET first (for brands/customers)
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });
    
    return payload as unknown as JWTPayload;
  } catch (error) {
    try {
      // Try MFG_JWT_SECRET (for manufacturers)
      const { payload } = await jwtVerify(token, MFG_JWT_SECRET, {
        algorithms: ['HS256']
      });
      
      return payload as unknown as JWTPayload;
    } catch (mfgError) {
      console.error('Token verification failed with both secrets:', { error, mfgError });
      return null;
    }
  }
}

/**
 * Find matching route configuration
 */
function findRouteConfig(pathname: string): RouteConfig | null {
  return routeConfigs.find(config => 
    pathname === config.path || pathname.startsWith(config.path + '/')
  ) || null;
}

/**
 * Check if user has required permissions for route
 */
function hasPermission(userRole: string, allowedRoles?: string[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  return allowedRoles.includes(userRole);
}

/**
 * Create redirect response with proper error handling
 */
function createRedirect(url: string, request: NextRequest, options: {
  reason?: string;
  returnUrl?: string;
} = {}): NextResponse {
  const redirectUrl = new URL(url, request.url);
  
  if (options.reason) {
    redirectUrl.searchParams.set('error', options.reason);
  }
  
  if (options.returnUrl) {
    redirectUrl.searchParams.set('redirect', options.returnUrl);
  }
  
  return NextResponse.redirect(redirectUrl);
}

/**
 * Handle tenant-specific routing (custom domains/subdomains)
 */
function handleTenantRouting(request: NextRequest): NextResponse | null {
  const hostname = request.headers.get('host') || '';
  const isCustomDomain = !hostname.includes('localhost') && 
                         !hostname.includes('vercel.app') && 
                         !hostname.includes('ordira.com');
  
  // For custom domains, potentially rewrite to tenant-specific paths
  if (isCustomDomain && request.nextUrl.pathname === '/') {
    // Rewrite to tenant-specific landing page
    const url = request.nextUrl.clone();
    url.pathname = '/gate'; // Default to voting gate for custom domains
    return NextResponse.rewrite(url);
  }
  
  return null;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers aligned with backend middleware
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP for XSS protection
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.ordira.com;"
  );
  
  return response;
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle tenant-specific routing first
  const tenantRedirect = handleTenantRouting(request);
  if (tenantRedirect) {
    return addSecurityHeaders(tenantRedirect);
  }
  
  // Get authentication token
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  let user: JWTPayload | null = null;
  
  // Verify token if present
  if (token) {
    user = await verifyToken(token);
    
    // Clear invalid token
    if (!user) {
      const response = NextResponse.next();
      response.cookies.delete(AUTH_TOKEN_COOKIE);
      return addSecurityHeaders(response);
    }
  }
  
  // Find route configuration
  const routeConfig = findRouteConfig(pathname);
  
  // Handle authentication routes (login, register)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  if (isAuthRoute && user) {
    const redirectUrl = roleBasedRedirects[user.role] || '/';
    return addSecurityHeaders(createRedirect(redirectUrl, request));
  }
  
  // Handle protected routes
  if (routeConfig?.requireAuth) {
    // Check if user is authenticated
    if (!user) {
      const redirectUrl = routeConfig.redirectUnauthenticated || '/auth/login';
      return addSecurityHeaders(createRedirect(redirectUrl, request, {
        reason: 'authentication_required',
        returnUrl: pathname
      }));
    }
    
    // Check if user has required role
    if (!hasPermission(user.role, routeConfig.allowedRoles)) {
      const redirectUrl = routeConfig.redirectUnauthorized || roleBasedRedirects[user.role] || '/';
      return addSecurityHeaders(createRedirect(redirectUrl, request, {
        reason: 'insufficient_permissions'
      }));
    }
  }
  
  // Handle root path redirects for authenticated users
  if (pathname === '/' && user) {
    const redirectUrl = roleBasedRedirects[user.role] || '/';
    if (redirectUrl !== '/') {
      return addSecurityHeaders(createRedirect(redirectUrl, request));
    }
  }
  
  // Create response with user context headers for debugging
  const response = NextResponse.next();
  
  if (user && process.env.NODE_ENV === 'development') {
    response.headers.set('X-User-Role', user.role);
    response.headers.set('X-User-Type', user.userType);
    response.headers.set('X-User-ID', user.sub);
  }
  
  return addSecurityHeaders(response);
}

/**
 * Middleware configuration
 * Excludes API routes, static files, and optimization files
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
