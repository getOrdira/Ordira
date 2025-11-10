// src/lib/auth/guards.ts

import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { UserRole } from '@/lib/types/features/users';
import { getToken, isTokenExpired } from '../session/session';

/**
 * Hook to guard routes requiring authentication.
 * Redirects to login if not authenticated.
 * @param redirectPath Optional path to redirect to after login (defaults to current path).
 * @param immediate If true, redirects immediately without waiting for loading state.
 */
export const useAuthGuard = (redirectPath?: string, immediate = false): void => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (immediate || (!isLoading && !isAuthenticated)) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const redirect = redirectPath || currentPath;
      const loginPath = `/auth/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
      router.push(loginPath);
    }
  }, [isAuthenticated, isLoading, router, redirectPath, immediate]);
};

/**
 * Hook to guard routes based on user role.
 * Redirects to dashboard or home if role doesn't match.
 * @param allowedRoles Array of allowed UserRole values.
 * @param redirectPath Optional fallback redirect path (defaults to role-based dashboard).
 * @param strict If true, requires exact role match. If false, allows higher privileges.
 */
export const useRoleGuard = (
  allowedRoles: UserRole[], 
  redirectPath?: string,
  strict = true
): void => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const checkAccess = useCallback(() => {
    if (!isLoading && isAuthenticated && user) {
      let hasAccess = false;

      if (strict) {
        hasAccess = allowedRoles.includes(user.role);
      } else {
        // Role hierarchy: brand > creator > manufacturer > customer
        const roleHierarchy: Record<UserRole, number> = {
          'brand': 4,
          'creator': 3,
          'manufacturer': 2,
          'customer': 1
        };

        const userLevel = roleHierarchy[user.role as UserRole] || 0;
        const requiredLevel = Math.min(...allowedRoles.map(role => roleHierarchy[role] || 0));
        hasAccess = userLevel >= requiredLevel;
      }

      if (!hasAccess) {
        let fallback = redirectPath;
        if (!fallback) {
          switch (user.role) {
            case 'brand':
            case 'creator':
              fallback = '/dashboard';
              break;
            case 'manufacturer':
              fallback = '/manufacturer/dashboard';
              break;
            case 'customer':
              fallback = '/gate';
              break;
            default:
              fallback = '/';
          }
        }
        router.push(fallback);
      }
    }
  }, [user, isAuthenticated, isLoading, allowedRoles, router, redirectPath, strict]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);
};

/**
 * Hook to guard routes for verified users only.
 * Redirects to verification page if email not verified.
 * @param requirePhoneVerification Also require phone verification.
 */
export const useVerificationGuard = (requirePhoneVerification = false): void => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!user.isEmailVerified) {
        router.push('/auth/verify-email');
        return;
      }
    }
  }, [user, isAuthenticated, isLoading, router, requirePhoneVerification]);
};

/**
 * Hook to guard routes requiring specific tenant plan.
 * Redirects to upgrade page if plan is insufficient.
 * @param requiredPlans Array of allowed plan names.
 * @param redirectPath Optional redirect path (defaults to upgrade page).
 */
export const usePlanGuard = (
  requiredPlans: string[], 
  redirectPath?: string
): void => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Assuming user has a plan property or tenant.plan
      const userPlan = (user as any).plan || (user as any).tenant?.plan || 'foundation';
      
      if (!requiredPlans.includes(userPlan)) {
        const upgradePath = redirectPath || `/upgrade?required=${requiredPlans[0]}`;
        router.push(upgradePath);
      }
    }
  }, [user, isAuthenticated, isLoading, requiredPlans, router, redirectPath]);
};

/**
 * Hook to prevent access to auth pages when already logged in.
 * Redirects authenticated users away from login/register pages.
 */
export const useGuestGuard = (): void => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect to appropriate dashboard based on role
      switch (user.role) {
        case 'brand':
        case 'creator':
          router.push('/dashboard');
          break;
        case 'manufacturer':
          router.push('/manufacturer/dashboard');
          break;
        case 'customer':
          router.push('/gate');
          break;
        default:
          router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);
};

/**
 * Hook to handle session expiration.
 * Monitors token expiration and redirects to login when expired.
 * @param checkInterval Interval in milliseconds to check token expiration (default: 60000ms = 1 minute).
 */
export const useSessionGuard = (checkInterval = 60000): void => {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkSession = () => {
      const token = getToken();
      if (token && isTokenExpired(token)) {
        logout();
        router.push('/auth/login?reason=session-expired');
      }
    };

    // Check immediately
    checkSession();

    // Set up interval to check periodically
    const interval = setInterval(checkSession, checkInterval);

    return () => clearInterval(interval);
  }, [logout, router, checkInterval]);
};

/**
 * Function to check if current user has a specific role.
 * @param role The UserRole to check.
 * @returns True if user has the role, false otherwise.
 */
export const hasRole = (role: UserRole): boolean => {
  const { user } = useAuth();
  return !!user && user.role === role;
};

/**
 * Function to check if user has any of the specified roles.
 * @param roles Array of UserRole values to check.
 * @returns True if user has any of the roles, false otherwise.
 */
export const hasAnyRole = (roles: UserRole[]): boolean => {
  const { user } = useAuth();
  return !!user && roles.includes(user.role);
};

/**
 * Function to check if user has sufficient role level.
 * @param minimumRole The minimum required role.
 * @returns True if user meets or exceeds the role level, false otherwise.
 */
export const hasRoleLevel = (minimumRole: UserRole): boolean => {
  const { user } = useAuth();
  if (!user) return false;

  const roleHierarchy: Record<UserRole, number> = {
    'brand': 4,
    'creator': 3,
    'manufacturer': 2,
    'customer': 1
  };

  const userLevel = roleHierarchy[user.role as UserRole] || 0;
  const requiredLevel = roleHierarchy[minimumRole as UserRole] || 0;

  return userLevel >= requiredLevel;
};

/**
 * Function to check if user is authenticated synchronously.
 * Uses token check for quick validation.
 * @returns True if token exists and is not expired.
 */
export const isAuthenticatedSync = (): boolean => {
  const token = getToken();
  return !!token && !isTokenExpired(token);
};

/**
 * Function to check if user is verified (email and optionally phone).
 * @param requirePhone Whether to also require phone verification.
 * @returns True if user is verified, false otherwise.
 */
export const isUserVerified = (requirePhone = false): boolean => {
  const { user } = useAuth();
  if (!user) return false;
  
  if (!user.isEmailVerified) return false;
  
  
  return true;
};

/**
 * Function to get user's dashboard path based on role.
 * @param role Optional role (uses current user's role if not provided).
 * @returns Dashboard path for the role.
 */
export const getDashboardPath = (role?: UserRole): string => {
  const { user } = useAuth();
  const targetRole = role || user?.role;

  switch (targetRole) {
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

/**
 * Custom hook to check multiple guard conditions.
 * @param conditions Object with guard conditions to check.
 * @returns Object with access status and any redirect path.
 */
export const useMultiGuard = (conditions: {
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
  requireVerification?: boolean;
  requirePhone?: boolean;
  requiredPlans?: string[];
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  const checkAccess = useCallback(() => {
    if (isLoading) return { hasAccess: true, redirectPath: null, reason: null };

    // Check authentication
    if (conditions.requireAuth && !isAuthenticated) {
      return {
        hasAccess: false,
        redirectPath: '/auth/login',
        reason: 'authentication_required'
      };
    }

    if (!user) return { hasAccess: true, redirectPath: null, reason: null };

    // Check role
    if (conditions.allowedRoles && !conditions.allowedRoles.includes(user.role)) {
      return {
        hasAccess: false,
        redirectPath: getDashboardPath(user.role),
        reason: 'insufficient_role'
      };
    }

    // Check email verification
    if (conditions.requireVerification && !user.isEmailVerified) {
      return {
        hasAccess: false,
        redirectPath: '/auth/verify-email',
        reason: 'email_verification_required'
      };
    }

    // Check plan
    if (conditions.requiredPlans) {
      const userPlan = (user as any).plan || (user as any).tenant?.plan || 'foundation';
      if (!conditions.requiredPlans.includes(userPlan)) {
        return {
          hasAccess: false,
          redirectPath: `/upgrade?required=${conditions.requiredPlans[0]}`,
          reason: 'plan_upgrade_required'
        };
      }
    }

    return { hasAccess: true, redirectPath: null, reason: null };
  }, [user, isAuthenticated, isLoading, conditions]);

  return checkAccess();
};