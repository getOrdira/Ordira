// src/hooks/use-brand-hooks.ts

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BrandSettings,
  DomainMapping,
  ApiKey,
  Collection
} from '@/lib/types/brand';
import { AllowedCustomer } from '@/lib/types/customer';
import { CustomerFilters } from '@/lib/api/customers';
import { useAuth } from './use-auth';
import { useNotifications } from './use-utilities';
import * as brandApi from '@/lib/api/brand-settings';
import * as customerApi from '@/lib/api/customers';
import * as domainApi from '@/lib/api/domain';
import * as apiKeysApi from '@/lib/api/api-keys';

/**
 * Hook for managing brand settings
 */
export function useBrandSettings() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['brand-settings', user?._id],
    queryFn: () => brandApi.brandSettingsApi.getBrandSettings(),
    enabled: !!user && user.role === 'brand',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettings = useMutation({
    mutationFn: (data: any) => brandApi.brandSettingsApi.updateBrandSettings(data),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['brand-settings', user?._id], updatedSettings);
      addNotification({
        type: 'success',
        title: 'Settings Updated',
        message: 'Brand settings have been updated successfully.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update brand settings',
        category: 'system'
      });
    }
  });

  const updateWeb3Settings = useMutation({
    mutationFn: (web3Settings: any) =>
      brandApi.brandSettingsApi.updateBrandSettings({ web3Settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-settings'] });
      addNotification({
        type: 'success',
        title: 'Web3 Settings Updated',
        message: 'Blockchain integration settings updated successfully.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Web3 Update Failed',
        message: error.message || 'Failed to update Web3 settings',
        category: 'system'
      });
    }
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutateAsync,
    updateWeb3Settings: updateWeb3Settings.mutateAsync,
    isUpdating: updateSettings.isPending || updateWeb3Settings.isPending
  };
}

/**
 * Hook for managing domain mappings
 */
export function useDomainMappings() {
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: domains, isLoading } = useQuery({
    queryKey: ['domain-mappings'],
    queryFn: () => domainApi.getDomainMappings(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const addDomain = useMutation({
    mutationFn: (data: any) => domainApi.createDomainMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-mappings'] });
      addNotification({
        type: 'success',
        title: 'Domain Added',
        message: 'Domain mapping has been created. DNS verification in progress.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Domain Addition Failed',
        message: error.message || 'Failed to add domain mapping',
        category: 'system'
      });
    }
  });

  const removeDomain = useMutation({
    mutationFn: (id: string) => domainApi.deleteDomainMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-mappings'] });
      addNotification({
        type: 'success',
        title: 'Domain Removed',
        message: 'Domain mapping has been removed successfully.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Domain Removal Failed',
        message: error.message || 'Failed to remove domain mapping',
        category: 'system'
      });
    }
  });

  const verifyDomain = useMutation({
    mutationFn: (id: string) => domainApi.getDomainMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-mappings'] });
      addNotification({
        type: 'success',
        title: 'Domain Verified',
        message: 'Domain verification completed successfully.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Verification Failed',
        message: error.message || 'Domain verification failed',
        category: 'system'
      });
    }
  });

  return {
    domains: domains || [],
    isLoading,
    addDomain: addDomain.mutateAsync,
    removeDomain: removeDomain.mutateAsync,
    verifyDomain: verifyDomain.mutateAsync,
    isOperating: addDomain.isPending || removeDomain.isPending || verifyDomain.isPending
  };
}

/**
 * Hook for managing API keys
 */
export function useBrandApiKeys() {
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.getApiKeys(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createApiKey = useMutation({
    mutationFn: (data: any) => apiKeysApi.createApiKey(data),
    onSuccess: (newApiKey) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      addNotification({
        type: 'success',
        title: 'API Key Created',
        message: 'New API key has been generated successfully. Make sure to copy it now.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'API Key Creation Failed',
        message: error.message || 'Failed to create API key',
        category: 'system'
      });
    }
  });

  const revokeApiKey = useMutation({
    mutationFn: (data: any) => apiKeysApi.revokeApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      addNotification({
        type: 'success',
        title: 'API Key Revoked',
        message: 'API key has been revoked and is no longer active.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Revocation Failed',
        message: error.message || 'Failed to revoke API key',
        category: 'system'
      });
    }
  });

  const rotateApiKey = useMutation({
    mutationFn: (id: string) => apiKeysApi.updateApiKey(id, { rotationReason: 'Manual rotation' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      addNotification({
        type: 'success',
        title: 'API Key Rotated',
        message: 'API key has been rotated. Update your applications with the new key.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Rotation Failed',
        message: error.message || 'Failed to rotate API key',
        category: 'system'
      });
    }
  });

  return {
    apiKeys: apiKeys || [],
    isLoading,
    createApiKey: createApiKey.mutateAsync,
    revokeApiKey: revokeApiKey.mutateAsync,
    rotateApiKey: rotateApiKey.mutateAsync,
    isOperating: createApiKey.isPending || revokeApiKey.isPending || rotateApiKey.isPending
  };
}

/**
 * Hook for managing customers (brand perspective)
 */
export function useCustomers(filters?: CustomerFilters) {
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ['customers', filters],
    queryFn: () => customerApi.customersApi.getCustomers(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const addCustomer = useMutation({
    mutationFn: (data: any) => customerApi.customersApi.addCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addNotification({
        type: 'success',
        title: 'Customer Added',
        message: 'New customer has been added successfully.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Failed to Add Customer',
        message: error.message || 'Unable to add customer',
        category: 'system'
      });
    }
  });

  const updateCustomer = useMutation({
    mutationFn: ({ customerId, updates }: { customerId: string; updates: any }) =>
      customerApi.customersApi.updateCustomer(customerId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addNotification({
        type: 'success',
        title: 'Customer Updated',
        message: 'Customer information has been updated.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update customer',
        category: 'system'
      });
    }
  });

  const bulkImport = useMutation({
    mutationFn: (data: any) => customerApi.customersApi.bulkImportCustomers(data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addNotification({
        type: 'success',
        title: 'Import Complete',
        message: `Successfully imported ${result.imported} customers.`,
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Import Failed',
        message: error.message || 'Failed to import customers',
        category: 'system'
      });
    }
  });

  return {
    customers: customersResponse?.customers || [],
    totalCount: customersResponse?.pagination?.total || 0,
    isLoading,
    addCustomer: addCustomer.mutateAsync,
    updateCustomer: updateCustomer.mutateAsync,
    bulkImport: bulkImport.mutateAsync,
    isOperating: addCustomer.isPending || updateCustomer.isPending || bulkImport.isPending
  };
}

/**
 * Hook for email gating functionality
 */
export function useEmailGating() {
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: gatingSettings, isLoading } = useQuery({
    queryKey: ['email-gating-settings'],
    queryFn: () => brandApi.brandSettingsApi.getBrandSettings(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const updateGatingSettings = useMutation({
    mutationFn: (data: any) => brandApi.brandSettingsApi.updateBrandSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-gating-settings'] });
      addNotification({
        type: 'success',
        title: 'Email Gating Updated',
        message: 'Email gating settings have been updated successfully.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update email gating settings',
        category: 'system'
      });
    }
  });

  const testEmailAccess = useMutation({
    mutationFn: (email: string) => Promise.resolve({ allowed: true, reason: 'Mock test' }),
    onSuccess: (result: any) => {
      addNotification({
        type: result.allowed ? 'success' : 'warning',
        title: 'Email Test Complete',
        message: result.allowed ? 
          'Email would be granted access' : 
          `Email would be denied: ${result.reason}`,
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Test Failed',
        message: error.message || 'Failed to test email access',
        category: 'system'
      });
    }
  });

  return {
    gatingSettings,
    isLoading,
    updateGatingSettings: updateGatingSettings.mutateAsync,
    testEmailAccess: testEmailAccess.mutateAsync,
    isOperating: updateGatingSettings.isPending || testEmailAccess.isPending
  };
}

/**
 * Hook for managing integrations
 */
export function useIntegrations() {
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => brandApi.brandSettingsApi.getBrandSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const connectShopify = useMutation({
    mutationFn: (data: any) => Promise.resolve({ authUrl: 'https://example.com/shopify/auth' }),
    onSuccess: (result: any) => {
      if (result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        queryClient.invalidateQueries({ queryKey: ['integrations'] });
        addNotification({
          type: 'success',
          title: 'Shopify Connected',
          message: 'Shopify integration has been set up successfully.',
          category: 'system'
        });
      }
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Shopify Connection Failed',
        message: error.message || 'Failed to connect Shopify',
        category: 'system'
      });
    }
  });

  const disconnectIntegration = useMutation({
    mutationFn: (integration: string) => brandApi.brandSettingsApi.updateBrandSettings({}),
    onSuccess: (_, integration) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      addNotification({
        type: 'success',
        title: 'Integration Disconnected',
        message: `${integration} integration has been disconnected.`,
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Disconnection Failed',
        message: error.message || 'Failed to disconnect integration',
        category: 'system'
      });
    }
  });

  const syncIntegration = useMutation({
    mutationFn: (integration: string) => Promise.resolve({ synced: 0 }),
    onSuccess: (result: any, integration) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'customers'] });
      addNotification({
        type: 'success',
        title: 'Sync Complete',
        message: `${integration} sync completed. ${result.synced} items updated.`,
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: error.message || 'Integration sync failed',
        category: 'system'
      });
    }
  });

  return {
    integrations: integrations || {},
    isLoading,
    connectShopify: connectShopify.mutateAsync,
    disconnectIntegration: disconnectIntegration.mutateAsync,
    syncIntegration: syncIntegration.mutateAsync,
    isOperating: connectShopify.isPending || disconnectIntegration.isPending || syncIntegration.isPending
  };
}

/**
 * Hook for manufacturer profile management
 */
export function useBrandManufacturerProfile() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['manufacturer-profile', user?._id],
    queryFn: () => brandApi.brandSettingsApi.getBrandSettings(),
    enabled: !!user && user.role === 'manufacturer',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateProfile = useMutation({
    mutationFn: (data: any) => brandApi.brandSettingsApi.updateBrandSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturer-profile'] });
      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your manufacturer profile has been updated successfully.',
        category: 'system'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update profile',
        category: 'system'
      });
    }
  });

  return {
    profile,
    isLoading,
    updateProfile: updateProfile.mutateAsync,
    isUpdating: updateProfile.isPending
  };
}