'use client';

// src/hooks/core/useAuth.ts

import { useCallback } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import authApi from '@/lib/api/core/auth.api';
import {
  type AuthResponse,
  type BusinessLoginCredentials,
  type ChangePasswordData,
  type EmailVerificationData,
  type ForgotPasswordData,
  type LoginCredentials,
  type RegisterBusinessData,
  type RegisterManufacturerData,
  type RegisterUserData,
  type ResetPasswordData,
  type SecuritySettings,
  type SetupTwoFactorData,
  type TokenRefreshResponse,
  type VerifyTwoFactorData
} from '@/lib/types/features/auth';
import type { AnyUser } from '@/lib/types/features/users';
import { ApiError } from '@/lib/errors/errors';

type SetupTwoFactorResponse = Awaited<ReturnType<typeof authApi.setupTwoFactor>>;
type VerifyTwoFactorResponse = Awaited<ReturnType<typeof authApi.verifyTwoFactor>>;
type TokenValidationResponse = Awaited<ReturnType<typeof authApi.validateToken>>;
type EmailAvailabilityResponse = Awaited<ReturnType<typeof authApi.checkEmailAvailability>>;

export const authQueryKeys = {
  root: ['core', 'auth'] as const,
  profile: () => [...authQueryKeys.root, 'profile'] as const,
  currentUser: () => [...authQueryKeys.root, 'currentUser'] as const,
  securitySettings: () => [...authQueryKeys.root, 'securitySettings'] as const,
  mutation: (name: string) => [...authQueryKeys.root, 'mutation', name] as const
} as const;

type AuthQueryConfig<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type AuthMutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export interface UseAuthOptions {
  queries?: {
    profile?: AuthQueryConfig<AnyUser>;
    currentUser?: AuthQueryConfig<AnyUser>;
    securitySettings?: AuthQueryConfig<SecuritySettings>;
  };
  mutations?: {
    login?: AuthMutationConfig<AuthResponse, LoginCredentials>;
    loginUser?: AuthMutationConfig<AuthResponse, LoginCredentials>;
    loginBusiness?: AuthMutationConfig<AuthResponse, BusinessLoginCredentials>;
    loginManufacturer?: AuthMutationConfig<AuthResponse, LoginCredentials>;
    register?: AuthMutationConfig<AuthResponse, RegisterUserData | RegisterBusinessData>;
    registerUser?: AuthMutationConfig<AuthResponse, RegisterUserData>;
    registerBusiness?: AuthMutationConfig<AuthResponse, RegisterBusinessData>;
    registerManufacturer?: AuthMutationConfig<AuthResponse, RegisterManufacturerData>;
    verify?: AuthMutationConfig<void, EmailVerificationData>;
    verifyUser?: AuthMutationConfig<void, EmailVerificationData>;
    verifyBusiness?: AuthMutationConfig<void, EmailVerificationData>;
    verifyManufacturer?: AuthMutationConfig<void, EmailVerificationData>;
    forgotPassword?: AuthMutationConfig<void, ForgotPasswordData>;
    resetPassword?: AuthMutationConfig<void, ResetPasswordData>;
    resendVerification?: AuthMutationConfig<void, EmailVerificationData>;
    logout?: AuthMutationConfig<void, void>;
    refreshToken?: AuthMutationConfig<TokenRefreshResponse, void>;
    changePassword?: AuthMutationConfig<void, ChangePasswordData>;
    setupTwoFactor?: AuthMutationConfig<SetupTwoFactorResponse, SetupTwoFactorData>;
    verifyTwoFactor?: AuthMutationConfig<VerifyTwoFactorResponse, VerifyTwoFactorData>;
    disableTwoFactor?: AuthMutationConfig<void, string>;
    updateSecuritySettings?: AuthMutationConfig<SecuritySettings, Partial<SecuritySettings>>;
    checkEmailAvailability?: AuthMutationConfig<EmailAvailabilityResponse, string>;
    validateToken?: AuthMutationConfig<TokenValidationResponse, string>;
  };
}

export interface UseAuthResult {
  queries: {
    profile: UseQueryResult<AnyUser, ApiError>;
    currentUser: UseQueryResult<AnyUser, ApiError>;
    securitySettings: UseQueryResult<SecuritySettings, ApiError>;
  };
  mutations: {
    login: UseMutationResult<AuthResponse, ApiError, LoginCredentials, unknown>;
    loginUser: UseMutationResult<AuthResponse, ApiError, LoginCredentials, unknown>;
    loginBusiness: UseMutationResult<AuthResponse, ApiError, BusinessLoginCredentials, unknown>;
    loginManufacturer: UseMutationResult<AuthResponse, ApiError, LoginCredentials, unknown>;
    register: UseMutationResult<AuthResponse, ApiError, RegisterUserData | RegisterBusinessData, unknown>;
    registerUser: UseMutationResult<AuthResponse, ApiError, RegisterUserData, unknown>;
    registerBusiness: UseMutationResult<AuthResponse, ApiError, RegisterBusinessData, unknown>;
    registerManufacturer: UseMutationResult<AuthResponse, ApiError, RegisterManufacturerData, unknown>;
    verify: UseMutationResult<void, ApiError, EmailVerificationData, unknown>;
    verifyUser: UseMutationResult<void, ApiError, EmailVerificationData, unknown>;
    verifyBusiness: UseMutationResult<void, ApiError, EmailVerificationData, unknown>;
    verifyManufacturer: UseMutationResult<void, ApiError, EmailVerificationData, unknown>;
    forgotPassword: UseMutationResult<void, ApiError, ForgotPasswordData, unknown>;
    resetPassword: UseMutationResult<void, ApiError, ResetPasswordData, unknown>;
    resendVerification: UseMutationResult<void, ApiError, EmailVerificationData, unknown>;
    logout: UseMutationResult<void, ApiError, void, unknown>;
    refreshToken: UseMutationResult<TokenRefreshResponse, ApiError, void, unknown>;
    changePassword: UseMutationResult<void, ApiError, ChangePasswordData, unknown>;
    setupTwoFactor: UseMutationResult<SetupTwoFactorResponse, ApiError, SetupTwoFactorData, unknown>;
    verifyTwoFactor: UseMutationResult<VerifyTwoFactorResponse, ApiError, VerifyTwoFactorData, unknown>;
    disableTwoFactor: UseMutationResult<void, ApiError, string, unknown>;
    updateSecuritySettings: UseMutationResult<SecuritySettings, ApiError, Partial<SecuritySettings>, unknown>;
    checkEmailAvailability: UseMutationResult<EmailAvailabilityResponse, ApiError, string, unknown>;
    validateToken: UseMutationResult<TokenValidationResponse, ApiError, string, unknown>;
  };
  refreshAuthQueries: () => void;
  clearAuthCache: () => void;
}

/**
 * Primary authentication hook that wires every authApi endpoint into
 * React Query queries/mutations and keeps the cached user state in sync.
 */
export const useAuth = (options: UseAuthOptions = {}): UseAuthResult => {
  const queryClient = useQueryClient();
  const queryOptions = options.queries ?? {};
  const mutationOptions = options.mutations ?? {};

  const securitySettingsOptions = (queryOptions.securitySettings ?? {}) as AuthQueryConfig<SecuritySettings>;
  const { enabled: securityEnabled, ...securitySettingsRest } = securitySettingsOptions;

  const refreshAuthQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: authQueryKeys.profile() });
    void queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser() });
  }, [queryClient]);

  const clearAuthCache = useCallback(() => {
    void queryClient.removeQueries({ queryKey: authQueryKeys.profile(), exact: true });
    void queryClient.removeQueries({ queryKey: authQueryKeys.currentUser(), exact: true });
  }, [queryClient]);

  const syncUserCache = useCallback(
    (user?: AnyUser) => {
      if (user) {
        queryClient.setQueryData(authQueryKeys.profile(), user);
        queryClient.setQueryData(authQueryKeys.currentUser(), user);
        return;
      }
      refreshAuthQueries();
    },
    [queryClient, refreshAuthQueries]
  );

  const fetchAndSyncUser = useCallback(async () => {
    try {
      const user = await authApi.getProfile();
      syncUserCache(user);
    } catch (error) {
      syncUserCache();
    }
  }, [syncUserCache]);

  const profile = useQuery<AnyUser, ApiError>({
    queryKey: authQueryKeys.profile(),
    queryFn: authApi.getProfile,
    staleTime: 5 * 60 * 1000,
    ...(queryOptions.profile ?? {})
  });

  const currentUser = useQuery<AnyUser, ApiError>({
    queryKey: authQueryKeys.currentUser(),
    queryFn: authApi.getCurrentUser,
    staleTime: 5 * 60 * 1000,
    ...(queryOptions.currentUser ?? {})
  });

  const securitySettings = useQuery<SecuritySettings, ApiError>({
    queryKey: authQueryKeys.securitySettings(),
    queryFn: authApi.getSecuritySettings,
    enabled: securityEnabled ?? false,
    ...securitySettingsRest
  });

  const createAuthMutation = <TData, TVariables>(
    name: string,
    mutationFn: (variables: TVariables) => Promise<TData>,
    config?: AuthMutationConfig<TData, TVariables>,
    sideEffect?: (data: TData, variables: TVariables, context: unknown) => Promise<void> | void
  ) =>
    useMutation<TData, ApiError, TVariables>({
      mutationKey: authQueryKeys.mutation(name),
      mutationFn,
      ...config,
      onSuccess: async (data, variables, context) => {
        if (sideEffect) {
          await sideEffect(data, variables, context);
        }
        if (config?.onSuccess) {
          await config.onSuccess(data, variables, context);
        }
      }
    });

  const login = createAuthMutation<AuthResponse, LoginCredentials>(
    'login',
    authApi.login,
    mutationOptions.login,
    async () => fetchAndSyncUser()
  );

  const loginUser = createAuthMutation<AuthResponse, LoginCredentials>(
    'loginUser',
    authApi.loginUser,
    mutationOptions.loginUser,
    async () => fetchAndSyncUser()
  );

  const loginBusiness = createAuthMutation<AuthResponse, BusinessLoginCredentials>(
    'loginBusiness',
    authApi.loginBusiness,
    mutationOptions.loginBusiness,
    async () => fetchAndSyncUser()
  );

  const loginManufacturer = createAuthMutation<AuthResponse, LoginCredentials>(
    'loginManufacturer',
    authApi.loginManufacturer,
    mutationOptions.loginManufacturer,
    async () => fetchAndSyncUser()
  );

  const register = createAuthMutation<AuthResponse, RegisterUserData | RegisterBusinessData>(
    'register',
    authApi.register,
    mutationOptions.register,
    async () => fetchAndSyncUser()
  );

  const registerUser = createAuthMutation<AuthResponse, RegisterUserData>(
    'registerUser',
    authApi.registerUser,
    mutationOptions.registerUser,
    async () => fetchAndSyncUser()
  );

  const registerBusiness = createAuthMutation<AuthResponse, RegisterBusinessData>(
    'registerBusiness',
    authApi.registerBusiness,
    mutationOptions.registerBusiness,
    async () => fetchAndSyncUser()
  );

  const registerManufacturer = createAuthMutation<AuthResponse, RegisterManufacturerData>(
    'registerManufacturer',
    authApi.registerManufacturer,
    mutationOptions.registerManufacturer,
    async () => fetchAndSyncUser()
  );

  const verify = createAuthMutation<void, EmailVerificationData>(
    'verify',
    authApi.verify,
    mutationOptions.verify,
    async () => refreshAuthQueries()
  );

  const verifyUser = createAuthMutation<void, EmailVerificationData>(
    'verifyUser',
    authApi.verifyUser,
    mutationOptions.verifyUser,
    async () => refreshAuthQueries()
  );

  const verifyBusiness = createAuthMutation<void, EmailVerificationData>(
    'verifyBusiness',
    authApi.verifyBusiness,
    mutationOptions.verifyBusiness,
    async () => refreshAuthQueries()
  );

  const verifyManufacturer = createAuthMutation<void, EmailVerificationData>(
    'verifyManufacturer',
    authApi.verifyManufacturer,
    mutationOptions.verifyManufacturer,
    async () => refreshAuthQueries()
  );

  const forgotPassword = createAuthMutation<void, ForgotPasswordData>(
    'forgotPassword',
    authApi.forgotPassword,
    mutationOptions.forgotPassword
  );

  const resetPassword = createAuthMutation<void, ResetPasswordData>(
    'resetPassword',
    authApi.resetPassword,
    mutationOptions.resetPassword
  );

  const resendVerification = createAuthMutation<void, EmailVerificationData>(
    'resendVerification',
    authApi.resendVerification,
    mutationOptions.resendVerification
  );

  const logout = createAuthMutation<void, void>(
    'logout',
    (_?: void) => authApi.logout(),
    mutationOptions.logout,
    async () => clearAuthCache()
  );

  const refreshToken = createAuthMutation<TokenRefreshResponse, void>(
    'refreshToken',
    (_?: void) => authApi.refreshToken(),
    mutationOptions.refreshToken,
    async () => refreshAuthQueries()
  );

  const changePassword = createAuthMutation<void, ChangePasswordData>(
    'changePassword',
    authApi.changePassword,
    mutationOptions.changePassword,
    async () => refreshAuthQueries()
  );

  const setupTwoFactor = createAuthMutation<SetupTwoFactorResponse, SetupTwoFactorData>(
    'setupTwoFactor',
    authApi.setupTwoFactor,
    mutationOptions.setupTwoFactor,
    async () => refreshAuthQueries()
  );

  const verifyTwoFactor = createAuthMutation<VerifyTwoFactorResponse, VerifyTwoFactorData>(
    'verifyTwoFactor',
    authApi.verifyTwoFactor,
    mutationOptions.verifyTwoFactor,
    async () => refreshAuthQueries()
  );

  const disableTwoFactor = createAuthMutation<void, string>(
    'disableTwoFactor',
    authApi.disableTwoFactor,
    mutationOptions.disableTwoFactor,
    async () => refreshAuthQueries()
  );

  const updateSecuritySettings = createAuthMutation<SecuritySettings, Partial<SecuritySettings>>(
    'updateSecuritySettings',
    authApi.updateSecuritySettings,
    mutationOptions.updateSecuritySettings,
    async data => {
      queryClient.setQueryData(authQueryKeys.securitySettings(), data);
    }
  );

  const checkEmailAvailability = createAuthMutation<EmailAvailabilityResponse, string>(
    'checkEmailAvailability',
    authApi.checkEmailAvailability,
    mutationOptions.checkEmailAvailability
  );

  const validateToken = createAuthMutation<TokenValidationResponse, string>(
    'validateToken',
    authApi.validateToken,
    mutationOptions.validateToken,
    async data => syncUserCache(data.user)
  );

  return {
    queries: {
      profile,
      currentUser,
      securitySettings
    },
    mutations: {
      login,
      loginUser,
      loginBusiness,
      loginManufacturer,
      register,
      registerUser,
      registerBusiness,
      registerManufacturer,
      verify,
      verifyUser,
      verifyBusiness,
      verifyManufacturer,
      forgotPassword,
      resetPassword,
      resendVerification,
      logout,
      refreshToken,
      changePassword,
      setupTwoFactor,
      verifyTwoFactor,
      disableTwoFactor,
      updateSecuritySettings,
      checkEmailAvailability,
      validateToken
    },
    refreshAuthQueries,
    clearAuthCache
  };
};
