// src/lib/auth/policy/roles.ts
// Shared role utilities for frontend auth logic.

import type { UserRole } from '@/lib/types/features/users';

/**
 * Minimal shape for role-aware auth users.
 * Extra properties are optional to keep utilities flexible.
 */
export interface AuthUser {
  role: UserRole;
  permissions?: readonly string[];
  plan?: string | null;
  tenant?: {
    plan?: string | null;
  } | null;
}

export type MaybeAuthUser = AuthUser | null | undefined;

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  brand: 'Brand Owner',
  creator: 'Content Creator',
  manufacturer: 'Manufacturer',
  customer: 'Customer'
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  brand: 4,
  creator: 3,
  manufacturer: 2,
  customer: 1
};

export const hasRole = (user: MaybeAuthUser, role: UserRole): boolean => {
  return !!user && user.role === role;
};

export const hasAnyRole = (user: MaybeAuthUser, roles: readonly UserRole[]): boolean => {
  return !!user && roles.includes(user.role);
};

export const hasPermission = (user: MaybeAuthUser, permission: string): boolean => {
  if (!user?.permissions) {
    return false;
  }

  return user.permissions.includes(permission) || user.permissions.includes('*');
};

export const getRoleDisplayName = (role: UserRole): string => {
  return ROLE_DISPLAY_NAMES[role] ?? role;
};

export const getRoleLevel = (role: UserRole): number => {
  return ROLE_HIERARCHY[role] ?? 0;
};

export const isBrand = (user: MaybeAuthUser): boolean => hasRole(user, 'brand');

export const isCreator = (user: MaybeAuthUser): boolean => hasRole(user, 'creator');

export const isBrandLike = (user: MaybeAuthUser): boolean => hasAnyRole(user, ['brand', 'creator']);

export const isManufacturer = (user: MaybeAuthUser): boolean => hasRole(user, 'manufacturer');

export const roleUtils = {
  hasRole,
  hasAnyRole,
  hasPermission,
  getRoleDisplayName,
  getRoleLevel,
  isBrand,
  isCreator,
  isBrandLike,
  isManufacturer
} as const;

export type RoleUtils = typeof roleUtils;

