// src/hooks/use-permissions.ts

import { useMemo, useCallback } from 'react';
import { useSession } from './use-session';
import { UserRole } from '@/lib/types/user';

interface Permission {
  resource: string;
  action: string;
  condition?: (user: any) => boolean;
}

interface UsePermissionsReturn {
  // Permission checking
  can: (resource: string, action: string) => boolean;
  cannot: (resource: string, action: string) => boolean;
  
  // Role-based permissions
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  
  // Resource access
  canAccess: (resource: string) => boolean;
  canCreate: (resource: string) => boolean;
  canRead: (resource: string) => boolean;
  canUpdate: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  
  // Business logic permissions
  canManageProducts: () => boolean;
  canManageCertificates: () => boolean;
  canManageAnalytics: () => boolean;
  canManageSettings: () => boolean;
  canManageBilling: () => boolean;
  canManageUsers: () => boolean;
  canManageIntegrations: () => boolean;
  canManageDomains: () => boolean;
  canViewOrders: () => boolean;
  canCreateContent: () => boolean;
  
  // Permission groups
  getPermissions: () => string[];
  getRolePermissions: (role: UserRole) => string[];
}

// Define permission matrix
const PERMISSION_MATRIX: Record<UserRole, string[]> = {
  customer: [
    'products:read',
    'votes:create',
    'votes:read',
    'certificates:read',
    'profile:read',
    'profile:update',
  ],
  brand: [
    'products:create',
    'products:read',
    'products:update',
    'products:delete',
    'certificates:create',
    'certificates:read',
    'certificates:update',
    'certificates:delete',
    'analytics:read',
    'settings:read',
    'settings:update',
    'billing:read',
    'billing:update',
    'users:read',
    'integrations:create',
    'integrations:read',
    'integrations:update',
    'integrations:delete',
    'domains:create',
    'domains:read',
    'domains:update',
    'domains:delete',
    'votes:create',
    'votes:read',
    'profile:read',
    'profile:update',
  ],
  creator: [
    'products:create',
    'products:read',
    'products:update',
    'products:delete',
    'certificates:create',
    'certificates:read',
    'certificates:update',
    'certificates:delete',
    'analytics:read',
    'settings:read',
    'settings:update',
    'billing:read',
    'billing:update',
    'users:read',
    'integrations:create',
    'integrations:read',
    'integrations:update',
    'integrations:delete',
    'domains:create',
    'domains:read',
    'domains:update',
    'domains:delete',
    'votes:create',
    'votes:read',
    'profile:read',
    'profile:update',
  ],
  manufacturer: [
    'products:create',
    'products:read',
    'products:update',
    'products:delete',
    'certificates:create',
    'certificates:read',
    'certificates:update',
    'certificates:delete',
    'analytics:read',
    'settings:read',
    'settings:update',
    'billing:read',
    'billing:update',
    'users:read',
    'integrations:create',
    'integrations:read',
    'integrations:update',
    'integrations:delete',
    'domains:create',
    'domains:read',
    'domains:update',
    'domains:delete',
    'votes:create',
    'votes:read',
    'profile:read',
    'profile:update',
  ],
};

// Resource-based access rules
const RESOURCE_ACCESS: Record<string, UserRole[]> = {
  'admin': ['brand', 'creator'], // Admin functionality available to brand and creator users
  'brand-dashboard': ['brand', 'creator'],
  'manufacturer-dashboard': ['manufacturer'],
  'customer-dashboard': ['customer'],
  'analytics': ['brand', 'creator', 'manufacturer'],
  'settings': ['brand', 'creator', 'manufacturer'],
  'billing': ['brand', 'creator', 'manufacturer'],
  'users': ['brand', 'creator', 'manufacturer'],
  'integrations': ['brand', 'creator', 'manufacturer'],
  'domains': ['brand', 'creator', 'manufacturer'],
  'products': ['brand', 'creator', 'manufacturer', 'customer'],
  'certificates': ['brand', 'creator', 'manufacturer', 'customer'],
  'votes': ['brand', 'creator', 'manufacturer', 'customer'],
};

export function usePermissions(): UsePermissionsReturn {
  const { user, isAuthenticated } = useSession();

  // Get user's permissions based on role
  const userPermissions = useMemo(() => {
    if (!user || !isAuthenticated) return [];
    return PERMISSION_MATRIX[user.role] || [];
  }, [user, isAuthenticated]);

  // Check if user has specific permission
  const can = useCallback((resource: string, action: string) => {
    if (!user || !isAuthenticated) return false;
    
    const permission = `${resource}:${action}`;
    return userPermissions.includes(permission);
  }, [user, isAuthenticated, userPermissions]);

  // Check if user cannot perform action
  const cannot = useCallback((resource: string, action: string) => {
    return !can(resource, action);
  }, [can]);

  // Check if user has specific role
  const hasRole = useCallback((role: UserRole) => {
    return user?.role === role;
  }, [user]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  // Check if user can access specific resource
  const canAccess = useCallback((resource: string) => {
    if (!user || !isAuthenticated) return false;
    
    const allowedRoles = RESOURCE_ACCESS[resource] || [];
    return allowedRoles.includes(user.role);
  }, [user, isAuthenticated]);

  // CRUD permission helpers
  const canCreate = useCallback((resource: string) => {
    return can(resource, 'create');
  }, [can]);

  const canRead = useCallback((resource: string) => {
    return can(resource, 'read');
  }, [can]);

  const canUpdate = useCallback((resource: string) => {
    return can(resource, 'update');
  }, [can]);

  const canDelete = useCallback((resource: string) => {
    return can(resource, 'delete');
  }, [can]);

  // Business logic permission helpers
  const canManageProducts = useCallback(() => {
    return can('products', 'create') || can('products', 'update') || can('products', 'delete');
  }, [can]);

  const canManageCertificates = useCallback(() => {
    return can('certificates', 'create') || can('certificates', 'update') || can('certificates', 'delete');
  }, [can]);

  const canManageAnalytics = useCallback(() => {
    return can('analytics', 'read');
  }, [can]);

  const canManageSettings = useCallback(() => {
    return can('settings', 'update');
  }, [can]);

  const canManageBilling = useCallback(() => {
    return can('billing', 'update');
  }, [can]);

  const canManageUsers = useCallback(() => {
    return can('users', 'read');
  }, [can]);

  const canManageIntegrations = useCallback(() => {
    return can('integrations', 'create') || can('integrations', 'update') || can('integrations', 'delete');
  }, [can]);

  const canManageDomains = useCallback(() => {
    return can('domains', 'create') || can('domains', 'update') || can('domains', 'delete');
  }, [can]);

  const canViewOrders = useCallback(() => {
    return can('orders', 'read');
  }, [can]);

  const canCreateContent = useCallback(() => {
    return can('content', 'create');
  }, [can]);

  // Get all user permissions
  const getPermissions = useCallback(() => {
    return userPermissions;
  }, [userPermissions]);

  // Get permissions for specific role
  const getRolePermissions = useCallback((role: UserRole) => {
    return PERMISSION_MATRIX[role] || [];
  }, []);

  return {
    can,
    cannot,
    hasRole,
    hasAnyRole,
    canAccess,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canManageProducts,
    canManageCertificates,
    canManageAnalytics,
    canManageSettings,
    canManageBilling,
    canManageUsers,
    canManageIntegrations,
    canManageDomains,
    canViewOrders,
    canCreateContent,
    getPermissions,
    getRolePermissions,
  };
}
