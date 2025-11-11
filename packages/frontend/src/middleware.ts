import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

import appConfig, { getApiUrl } from '@/lib/config/config';
import {
  canAccessRoute,
  getDefaultRedirectPath,
  PUBLIC_ROUTES
} from '@/lib/auth/policy/routes';
import type { MaybeAuthUser } from '@/lib/auth/policy/roles';
import type { UserRole } from '@/lib/types/features/users';
import { sanitizeSensitiveObject } from '@/lib/security/sensitiveData';

const encoder = new TextEncoder();
const rawSecrets = [process.env.JWT_SECRET, process.env.MFG_JWT_SECRET].filter(
  (value): value is string => typeof value === 'string' && value.length > 0
);
if (!rawSecrets.length && appConfig.environment.isDevelopment) {
  rawSecrets.push('development-secret');
}
const JWT_SECRETS = rawSecrets.map((secret) => encoder.encode(secret));

const AUTH_COOKIE = appConfig.auth.tokenKey;
const REFRESH_COOKIE = appConfig.auth.refreshTokenKey;
const REFRESH_ENDPOINT = getApiUrl('/auth/refresh');

const AUTH_ROUTE_PREFIX = '/auth';
const PUBLIC_ROUTE_SET = new Set(PUBLIC_ROUTES);
const DEVELOPMENT_DEBUG_HEADERS = appConfig.environment.isDevelopment;

const SITE_HOSTNAME = safeHostname(appConfig.urls.site);
const API_HOSTNAME = safeHostname(appConfig.urls.api);
const API_ORIGIN = safeOrigin(appConfig.urls.api);

const INTERNAL_HOSTNAMES = Array.from(
  new Set(
    [
      'localhost',
      '127.0.0.1',
      SITE_HOSTNAME,
      API_HOSTNAME,
      'ordira.com',
      'vercel.app'
    ].filter((value): value is string => typeof value === 'string' && value.length > 0)
  )
);

const VALID_ROLES: readonly UserRole[] = ['brand', 'creator', 'manufacturer', 'customer'];

const SECURITY_HEADERS = createSecurityHeaders();

interface EdgeAuthPayload extends JWTPayload {
  sub?: string;
  email?: string;
  role?: string;
  userType?: string;
  permissions?: readonly string[] | string[];
  plan?: string | null;
  tenant?: {
    plan?: string | null;
  } | null;
}

interface SessionCookies {
  token: string;
  refreshToken: string;
}

interface VerifiedAuthResult {
  payload: EdgeAuthPayload;
  user: MaybeAuthUser;
  userId?: string;
  email?: string;
}

interface RefreshResult {
  cookies: SessionCookies;
  verified: VerifiedAuthResult;
}

export async function middleware(request: NextRequest) {
  const normalizedPath = normalizePath(request.nextUrl.pathname);
  const fullReturnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  const tenantRewrite = handleTenantRewrite(request, normalizedPath);
  if (tenantRewrite) {
    return applySecurityHeaders(tenantRewrite);
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value ?? null;

  let authContext: VerifiedAuthResult | null = null;
  let refreshedSession: RefreshResult | null = null;
  let shouldClearSession = false;

  if (token) {
    authContext = await verifyAuthToken(token);

    if (!authContext && refreshToken) {
      refreshedSession = await tryRefreshSession(refreshToken);
      if (refreshedSession) {
        authContext = refreshedSession.verified;
      } else {
        shouldClearSession = true;
      }
    } else if (!authContext) {
      shouldClearSession = true;
    }
  } else if (refreshToken) {
    refreshedSession = await tryRefreshSession(refreshToken);
    if (refreshedSession) {
      authContext = refreshedSession.verified;
    } else {
      shouldClearSession = true;
    }
  }

  if (authContext && shouldClearSession) {
    shouldClearSession = false;
  }

  const user = authContext?.user ?? null;
  const requiresAuth = !canAccessRoute(null, normalizedPath);
  const isAuthRoute = isAuthEntryRoute(normalizedPath);

  if (isAuthRoute && user) {
    const redirectPath = getDefaultRedirectPath(user);
    if (redirectPath && redirectPath !== normalizedPath) {
      const redirectResponse = buildRedirectResponse(request, redirectPath);
      return applySecurityHeaders(
        applySessionCookies(redirectResponse, refreshedSession, shouldClearSession)
      );
    }
  }

  if (requiresAuth && !user) {
    const redirectResponse = buildRedirectResponse(request, `${AUTH_ROUTE_PREFIX}/login`, {
      reason: 'authentication_required',
      returnUrl: fullReturnPath
    });
    return applySecurityHeaders(
      applySessionCookies(redirectResponse, refreshedSession, shouldClearSession)
    );
  }

  if (user && !canAccessRoute(user, normalizedPath)) {
    const fallbackPath = getDefaultRedirectPath(user);
    const redirectResponse = buildRedirectResponse(request, fallbackPath ?? '/');
    return applySecurityHeaders(
      applySessionCookies(redirectResponse, refreshedSession, shouldClearSession)
    );
  }

  if (user && normalizedPath === '/') {
    const dashboardPath = getDefaultRedirectPath(user);
    if (dashboardPath && dashboardPath !== normalizedPath) {
      const redirectResponse = buildRedirectResponse(request, dashboardPath);
      return applySecurityHeaders(
        applySessionCookies(redirectResponse, refreshedSession, shouldClearSession)
      );
    }
  }

  const response = applySessionCookies(NextResponse.next(), refreshedSession, shouldClearSession);

  if (user && DEVELOPMENT_DEBUG_HEADERS) {
    response.headers.set('X-User-Role', user.role);
    if (authContext?.userId) {
      response.headers.set('X-User-ID', authContext.userId);
    }
    if (authContext?.email) {
      response.headers.set('X-User-Email', authContext.email);
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)'
  ]
};

function normalizePath(path: string): string {
  if (!path || path === '/') {
    return '/';
  }
  return path.endsWith('/') ? path.replace(/\/+$/u, '') || '/' : path;
}

function isAuthEntryRoute(path: string): boolean {
  return path === AUTH_ROUTE_PREFIX || path.startsWith(`${AUTH_ROUTE_PREFIX}/`);
}

function safeHostname(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function safeOrigin(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function createSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  const scriptSrc = ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://www.google-analytics.com'];
  const styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'];
  const fontSrc = ["'self'", 'https://fonts.gstatic.com'];
  const imgSrc = ["'self'", 'data:', 'https:'];

  const connectSrc = new Set<string>(["'self'"]);
  if (API_ORIGIN) {
    connectSrc.add(API_ORIGIN);
  }
  connectSrc.add('https://www.google-analytics.com');

  headers['Content-Security-Policy'] = [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    `font-src ${fontSrc.join(' ')}`,
    `img-src ${imgSrc.join(' ')}`,
    `connect-src ${Array.from(connectSrc).join(' ')}`
  ].join('; ');

  return headers;
}

async function verifyAuthToken(token: string): Promise<VerifiedAuthResult | null> {
  if (!token || !JWT_SECRETS.length) {
    return null;
  }

  for (const secret of JWT_SECRETS) {
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
      return mapPayloadToUser(payload as EdgeAuthPayload);
    } catch {
      // Try the next secret
    }
  }

  return null;
}

async function tryRefreshSession(refreshToken: string): Promise<RefreshResult | null> {
  if (!refreshToken || !JWT_SECRETS.length) {
    return null;
  }

  try {
    const response = await fetch(REFRESH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      cache: 'no-store',
      body: JSON.stringify({ refreshToken })
    });

    const body = await safeJson(response);

    if (!response.ok) {
      logEdgeEvent('middleware.refresh.failed', { status: response.status, body }, 'warn');
      return null;
    }

    const cookies = extractSessionCookies(body);
    if (!cookies) {
      logEdgeEvent('middleware.refresh.missingTokens', body, 'warn');
      return null;
    }

    const verified = await verifyAuthToken(cookies.token);
    if (!verified) {
      logEdgeEvent('middleware.refresh.invalidToken', body, 'warn');
      return null;
    }

    return { cookies, verified };
  } catch (error) {
    logEdgeEvent('middleware.refresh.error', { error }, 'error');
    return null;
  }
}

function extractSessionCookies(payload: unknown): SessionCookies | null {
  if (!isRecord(payload)) {
    return null;
  }

  const candidates: Record<string, unknown>[] = [];
  candidates.push(payload);

  const data = payload.data;
  if (isRecord(data)) {
    candidates.push(data);
  }

  const attributes = payload.attributes;
  if (isRecord(attributes)) {
    candidates.push(attributes);
  }

  for (const candidate of candidates) {
    const token = getStringField(candidate, ['token', 'accessToken']);
    const refreshToken = getStringField(candidate, ['refreshToken', 'refresh_token']);

    if (token && refreshToken) {
      return { token, refreshToken };
    }
  }

  return null;
}

function getStringField(source: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function mapPayloadToUser(payload: EdgeAuthPayload): VerifiedAuthResult {
  const role = isUserRole(payload.role) ? payload.role : undefined;
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter((value): value is string => typeof value === 'string')
    : undefined;

  const plan = typeof payload.plan === 'string' ? payload.plan : null;
  const tenantPlan =
    plan ??
    (payload.tenant && typeof payload.tenant === 'object' && typeof payload.tenant.plan === 'string'
      ? payload.tenant.plan
      : null);

  const tenant =
    payload.tenant && typeof payload.tenant === 'object'
      ? {
          plan: typeof payload.tenant.plan === 'string' ? payload.tenant.plan : tenantPlan
        }
      : tenantPlan
        ? { plan: tenantPlan }
        : null;

  const user: MaybeAuthUser =
    role !== undefined
      ? {
          role,
          permissions,
          plan: tenantPlan,
          tenant
        }
      : null;

  return {
    payload,
    user,
    userId: typeof payload.sub === 'string' ? payload.sub : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined
  };
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

function applySessionCookies(
  response: NextResponse,
  refreshedSession: RefreshResult | null,
  shouldClear: boolean
): NextResponse {
  if (refreshedSession) {
    const accessMaxAge = computeTokenMaxAge(refreshedSession.verified.payload);

    response.cookies.set(AUTH_COOKIE, refreshedSession.cookies.token, {
      httpOnly: true,
      secure: appConfig.environment.isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: accessMaxAge
    });

    response.cookies.set(REFRESH_COOKIE, refreshedSession.cookies.refreshToken, {
      httpOnly: true,
      secure: appConfig.environment.isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: appConfig.auth.rememberMeDurationDays * 24 * 60 * 60
    });
  }

  if (shouldClear) {
    response.cookies.delete(AUTH_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }

  return response;
}

function computeTokenMaxAge(payload: EdgeAuthPayload): number {
  if (typeof payload.exp === 'number') {
    const ttl = Math.floor(payload.exp - Date.now() / 1000);
    if (Number.isFinite(ttl) && ttl > 0) {
      return ttl;
    }
  }

  return appConfig.auth.sessionTimeoutMinutes * 60;
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

function buildRedirectResponse(
  request: NextRequest,
  destination: string,
  options: {
    reason?: string;
    returnUrl?: string;
  } = {}
): NextResponse {
  const target = new URL(destination, request.url);

  if (options.reason) {
    target.searchParams.set('error', options.reason);
  }

  if (options.returnUrl) {
    target.searchParams.set('redirect', options.returnUrl);
  }

  return NextResponse.redirect(target);
}

function handleTenantRewrite(request: NextRequest, pathname: string): NextResponse | null {
  const hostHeader = request.headers.get('host');
  if (!hostHeader) {
    return null;
  }

  const normalizedHost = hostHeader.toLowerCase();
  const isInternalHost = INTERNAL_HOSTNAMES.some(
    (known) => normalizedHost === known || normalizedHost.endsWith(`.${known}`)
  );

  if (!isInternalHost && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/gate';
    return NextResponse.rewrite(url);
  }

  return null;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function logEdgeEvent(label: string, data: unknown, level: 'info' | 'warn' | 'error' = 'info'): void {
  const payload = sanitizeSensitiveObject({ label, data });

  if (!appConfig.environment.isDevelopment && level !== 'error') {
    return;
  }

  switch (level) {
    case 'error':
      console.error(label, payload);
      break;
    case 'warn':
      console.warn(label, payload);
      break;
    default:
      console.info(label, payload);
      break;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
