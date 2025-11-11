// src/lib/auth/policy/routes.ts

import { isBrandLike, isManufacturer, type MaybeAuthUser } from './roles';

/**
 * Public routes that do not require authentication.
 */
export const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/pricing',
  '/auth',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/verify'
] as const;

/**
 * Brand / creator accessible route prefixes.
 */
export const BRAND_ROUTE_PREFIXES = [
  '/dashboard',
  '/certificates',
  '/voting',
  '/integrations',
  '/products',
  '/analytics',
  '/proposals',
] as const;

/**
 * Manufacturer accessible route prefixes.
 */
export const MANUFACTURER_ROUTE_PREFIXES = [
  '/manufacturer/dashboard',
  '/manufacturer/settings',
  '/manufacturer',
  '/connections',
  '/supply-chain',
  '/analytics'
] as const;

export const BRAND_SETTINGS_ROUTES = [
  '/settings',
  '/settings/profile',
  '/settings/notifications',
  '/settings/billing',
  '/settings/security',
  '/settings/domains',
  '/settings/certificates',
  '/settings/voting',
] as const;

export const MANUFACTURER_SETTINGS_ROUTES = [
  '/manufacturer/settings',
  '/manufacturer/settings/profile',
  '/manufacturer/settings/supply-chain',
  '/manufacturer/settings/connections',
  '/manufacturer/settings/security'
] as const;

/**
 * Routes any authenticated user can access (shared settings, profile, etc.).
 */
export const AUTH_SHARED_ROUTE_PREFIXES = [
  '/settings',
  '/profile'
] as const;

const matchesPrefix = (route: string, prefixes: readonly string[]): boolean => {
  return prefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
};

export const getDefaultRedirectPath = (user: MaybeAuthUser): string => {
  if (!user) {
    return '/auth/login';
  }

  switch (user.role) {
    case 'brand':
    case 'creator':
      return '/dashboard';
    case 'manufacturer':
      return '/manufacturer/dashboard';
    case 'customer':
      return '/gate';
    default:
      return '/';
  }
};

export const canAccessRoute = (user: MaybeAuthUser, route: string): boolean => {
  if (matchesPrefix(route, PUBLIC_ROUTES)) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (matchesPrefix(route, BRAND_ROUTE_PREFIXES)) {
    return isBrandLike(user);
  }

  if (matchesPrefix(route, MANUFACTURER_ROUTE_PREFIXES)) {
    return isManufacturer(user);
  }

  if (matchesPrefix(route, AUTH_SHARED_ROUTE_PREFIXES)) {
    return true;
  }

  if (matchesPrefix(route, BRAND_SETTINGS_ROUTES)) {
    return isBrandLike(user);
  }
  
  if (matchesPrefix(route, MANUFACTURER_SETTINGS_ROUTES)) {
    return isManufacturer(user);
  }

  return true;
};

export type AuthUserType = 'brand' | 'manufacturer' | null;

export const getUserType = (user: MaybeAuthUser): AuthUserType => {
  if (!user) {
    return null;
  }

  if (isBrandLike(user)) {
    return 'brand';
  }

  if (isManufacturer(user)) {
    return 'manufacturer';
  }

  return null;
};

export type AuthMethodMap = {
  register: string;
  login: string;
  verify: string;
};

export const getAuthMethods = (userType: 'brand' | 'creator' | 'manufacturer'): AuthMethodMap => {
  switch (userType) {
    case 'brand':
    case 'creator':
      return {
        register: 'registerBusiness',
        login: 'loginBusiness',
        verify: 'verifyBusiness'
      };
    case 'manufacturer':
      return {
        register: 'registerManufacturer',
        login: 'loginManufacturer',
        verify: 'verifyManufacturer'
      };
    default:
      return {
        register: 'registerUser',
        login: 'loginUser',
        verify: 'verifyUser'
      };
  }
};

export const routeProtection = {
  getDefaultRedirectPath,
  canAccessRoute,
  getUserType,
  getAuthMethods
} as const;


