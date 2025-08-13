// src/stores/auth-store.ts
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { User, LoginCredentials, SignupData, AuthResponse } from '@/types/auth';
import { authService } from '@/lib/auth/auth-service';
import { tokenUtils, roleUtils, sessionUtils, authErrorUtils } from '@/lib/auth/auth-utils';

// Types
interface SessionInfo {
  isExpiringSoon: boolean;
  timeUntilExpiry: number;
  lastActivity: number;
}

interface AuthError {
  message: string;
  code?: string;
  field?: string;
  timestamp: number;
}

interface AuthState {
  // Core State
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  
  // Error Handling
  error: AuthError | null;
  validationErrors: Record<string, string>;
  
  // User Info (computed)
  userRole: string | null;
  userName: string | null;
  userEmail: string | null;
  businessName: string | null;
  permissions: string[];
  
  // Session Management
  session: SessionInfo;
  lastLoginTime: number | null;
  rememberMe: boolean;
  
  // Loading States
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isSigningUp: boolean;
  isRefreshing: boolean;
  
  // Core Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Error Management
  clearError: () => void;
  clearValidationErrors: () => void;
  setError: (error: string | AuthError, field?: string) => void;
  
  // Session Management
  checkSession: () => Promise<boolean>;
  extendSession: () => Promise<void>;
  updateLastActivity: () => void;
  
  // User Management
  setUser: (user: User | null) => void;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  
  // Role & Permission Helpers
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Convenience Getters
  isBrand: () => boolean;
  isManufacturer: () => boolean;
  isCreator: () => boolean;
  canAccessFeature: (feature: string) => boolean;
  
  // Auth Flow Helpers
  redirectAfterLogin: () => string;
  shouldRememberSession: () => boolean;
  getSessionTimeRemaining: () => number;
}

// Default session info
const defaultSessionInfo: SessionInfo = {
  isExpiringSoon: false,
  timeUntilExpiry: 0,
  lastActivity: Date.now(),
};

// Create the auth store
export const useAuthStore = create<AuthState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial State
          user: null,
          isLoading: false,
          isInitialized: false,
          isAuthenticated: false,
          
          // Error State
          error: null,
          validationErrors: {},
          
          // Computed State
          userRole: null,
          userName: null,
          userEmail: null,
          businessName: null,
          permissions: [],
          
          // Session State
          session: defaultSessionInfo,
          lastLoginTime: null,
          rememberMe: false,
          
          // Loading States
          isLoggingIn: false,
          isLoggingOut: false,
          isSigningUp: false,
          isRefreshing: false,

          // Initialize authentication state
          initialize: async () => {
            if (get().isInitialized) return;
            
            set({ isLoading: true });
            
            try {
              const token = tokenUtils.getToken();
              
              if (!token) {
                set({ 
                  isLoading: false, 
                  isInitialized: true,
                  user: null,
                  isAuthenticated: false,
                  userRole: null,
                  userName: null,
                  userEmail: null,
                  businessName: null,
                  permissions: [],
                  session: defaultSessionInfo
                });
                return;
              }

              // Check if token is expired
              if (tokenUtils.isTokenExpired(token)) {
                const refreshToken = tokenUtils.getRefreshToken();
                
                if (refreshToken && !tokenUtils.isTokenExpired(refreshToken)) {
                  try {
                    set({ isRefreshing: true });
                    const response = await authService.refreshToken();
                    tokenUtils.setTokens(response.token, response.refreshToken);
                    
                    // Update state with refreshed user data
                    const updatedState = get()._updateUserState(response.user);
                    set({ 
                      ...updatedState,
                      error: null,
                      isRefreshing: false
                    });
                  } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    tokenUtils.clearTokens();
                    set({ 
                      user: null,
                      isAuthenticated: false,
                      userRole: null,
                      userName: null,
                      userEmail: null,
                      businessName: null,
                      permissions: [],
                      session: defaultSessionInfo,
                      error: { 
                        message: 'Session expired. Please log in again.', 
                        timestamp: Date.now() 
                      },
                      isRefreshing: false
                    });
                  }
                } else {
                  // No valid refresh token
                  tokenUtils.clearTokens();
                  set({ 
                    user: null,
                    isAuthenticated: false,
                    userRole: null,
                    userName: null,
                    userEmail: null,
                    businessName: null,
                    permissions: [],
                    session: defaultSessionInfo
                  });
                }
              } else {
                // Token is valid, get user data
                try {
                  const userData = await authService.getCurrentUser();
                  const updatedState = get()._updateUserState(userData);
                  set({ 
                    ...updatedState,
                    error: null
                  });
                } catch (error) {
                  console.error('Failed to get current user:', error);
                  tokenUtils.clearTokens();
                  set({ 
                    user: null,
                    isAuthenticated: false,
                    userRole: null,
                    userName: null,
                    userEmail: null,
                    businessName: null,
                    permissions: [],
                    session: defaultSessionInfo,
                    error: { 
                      message: 'Failed to validate session', 
                      timestamp: Date.now() 
                    }
                  });
                }
              }
            } catch (error) {
              console.error('Auth initialization error:', error);
              set({ 
                error: { 
                  message: 'Failed to initialize authentication', 
                  timestamp: Date.now() 
                },
                user: null,
                isAuthenticated: false,
                userRole: null,
                userName: null,
                userEmail: null,
                businessName: null,
                permissions: [],
                session: defaultSessionInfo
              });
            } finally {
              set({ isLoading: false, isInitialized: true });
            }
          },

          // Login user
          login: async (email: string, password: string, rememberMe = false) => {
            set({ 
              isLoggingIn: true, 
              error: null, 
              validationErrors: {} 
            });
            
            try {
              const response = await authService.login({ email, password, rememberMe });
              
              // Store tokens
              tokenUtils.setTokens(response.token, response.refreshToken);
              
              // Update state
              const updatedState = get()._updateUserState(response.user);
              set({
                ...updatedState,
                lastLoginTime: Date.now(),
                rememberMe,
                isLoggingIn: false,
                error: null,
                validationErrors: {}
              });
              
              // Update last activity
              get().updateLastActivity();
              
            } catch (error: any) {
              console.error('Login error:', error);
              
              // Handle validation errors
              if (error.response?.data?.errors) {
                const validationErrors: Record<string, string> = {};
                error.response.data.errors.forEach((err: any) => {
                  if (err.field && err.message) {
                    validationErrors[err.field] = err.message;
                  }
                });
                set({ validationErrors });
              }
              
              const errorMessage = authErrorUtils.getErrorMessage(error);
              set({
                isLoggingIn: false,
                error: { 
                  message: errorMessage, 
                  code: error.response?.data?.code,
                  timestamp: Date.now() 
                },
                user: null,
                isAuthenticated: false,
                userRole: null,
                userName: null,
                userEmail: null,
                businessName: null,
                permissions: [],
                session: defaultSessionInfo
              });
              throw error;
            }
          },

          // Logout user
          logout: async (silent = false) => {
            if (!silent) {
              set({ isLoggingOut: true });
            }
            
            try {
              // Call logout endpoint if user is authenticated
              if (get().isAuthenticated) {
                await authService.logout();
              }
            } catch (error) {
              console.error('Logout error:', error);
              // Continue with logout even if server call fails
            } finally {
              // Always clear local state and tokens
              tokenUtils.clearTokens();
              set({
                user: null,
                isAuthenticated: false,
                userRole: null,
                userName: null,
                userEmail: null,
                businessName: null,
                permissions: [],
                session: defaultSessionInfo,
                lastLoginTime: null,
                rememberMe: false,
                isLoggingOut: false,
                error: null,
                validationErrors: {}
              });
            }
          },

          // Sign up user
          signup: async (data: SignupData) => {
            set({ 
              isSigningUp: true, 
              error: null, 
              validationErrors: {} 
            });
            
            try {
              const response = await authService.signup(data);
              
              // Some backends might auto-login after signup
              if (response.token && response.user) {
                tokenUtils.setTokens(response.token, response.refreshToken);
                const updatedState = get()._updateUserState(response.user);
                set({
                  ...updatedState,
                  lastLoginTime: Date.now(),
                  isSigningUp: false
                });
              } else {
                set({ isSigningUp: false });
              }
              
            } catch (error: any) {
              console.error('Signup error:', error);
              
              // Handle validation errors
              if (error.response?.data?.errors) {
                const validationErrors: Record<string, string> = {};
                error.response.data.errors.forEach((err: any) => {
                  if (err.field && err.message) {
                    validationErrors[err.field] = err.message;
                  }
                });
                set({ validationErrors });
              }
              
              const errorMessage = authErrorUtils.getErrorMessage(error);
              set({
                isSigningUp: false,
                error: { 
                  message: errorMessage, 
                  code: error.response?.data?.code,
                  timestamp: Date.now() 
                }
              });
              throw error;
            }
          },

          // Refresh user data
          refreshUser: async () => {
            const { user, isAuthenticated } = get();
            if (!user || !isAuthenticated) return;
            
            set({ isRefreshing: true });
            
            try {
              const userData = await authService.getCurrentUser();
              const updatedState = get()._updateUserState(userData);
              set({ 
                ...updatedState,
                error: null,
                isRefreshing: false
              });
            } catch (error) {
              console.error('Failed to refresh user:', error);
              set({ isRefreshing: false });
              
              // If refresh fails due to auth error, logout user
              if (authErrorUtils.isAuthError(error)) {
                get().logout(true);
              }
              throw error;
            }
          },

          // Error management
          clearError: () => {
            set({ error: null });
          },

          clearValidationErrors: () => {
            set({ validationErrors: {} });
          },

          setError: (error: string | AuthError, field?: string) => {
            if (typeof error === 'string') {
              if (field) {
                set({ 
                  validationErrors: { 
                    ...get().validationErrors, 
                    [field]: error 
                  } 
                });
              } else {
                set({ 
                  error: { 
                    message: error, 
                    timestamp: Date.now() 
                  } 
                });
              }
            } else {
              set({ error });
            }
          },

          // Session management
          checkSession: async () => {
            const token = tokenUtils.getToken();
            if (!token || tokenUtils.isTokenExpired(token)) {
              get().logout(true);
              return false;
            }
            
            try {
              await authService.getCurrentUser();
              get().updateLastActivity();
              return true;
            } catch (error) {
              if (authErrorUtils.isAuthError(error)) {
                get().logout(true);
              }
              return false;
            }
          },

          extendSession: async () => {
            try {
              set({ isRefreshing: true });
              const response = await authService.refreshToken();
              tokenUtils.setTokens(response.token, response.refreshToken);
              
              const updatedState = get()._updateUserState(response.user);
              set({ 
                ...updatedState,
                error: null,
                isRefreshing: false
              });
              
              get().updateLastActivity();
            } catch (error) {
              console.error('Failed to extend session:', error);
              set({ isRefreshing: false });
              get().logout(true);
              throw error;
            }
          },

          updateLastActivity: () => {
            const now = Date.now();
            set({ 
              session: { 
                ...get().session, 
                lastActivity: now 
              } 
            });
          },

          // User management
          setUser: (user: User | null) => {
            if (user) {
              const updatedState = get()._updateUserState(user);
              set(updatedState);
            } else {
              set({ 
                user: null,
                isAuthenticated: false,
                userRole: null,
                userName: null,
                userEmail: null,
                businessName: null,
                permissions: [],
                session: defaultSessionInfo
              });
            }
          },

          updateUserProfile: async (updates: Partial<User>) => {
            const { user } = get();
            if (!user) throw new Error('No user to update');
            
            try {
              // TODO: Implement profile update API call
              // const response = await authService.updateProfile(updates);
              // For now, optimistically update local state
              const updatedUser = { ...user, ...updates };
              const updatedState = get()._updateUserState(updatedUser);
              set(updatedState);
              
              // Refresh from server
              await get().refreshUser();
            } catch (error) {
              console.error('Failed to update profile:', error);
              throw error;
            }
          },

          // Role checking helpers
          hasRole: (role: string) => {
            const { user } = get();
            return roleUtils.hasRole(user, role);
          },

          hasAnyRole: (roles: string[]) => {
            const { user } = get();
            return roleUtils.hasAnyRole(user, roles);
          },

          hasPermission: (permission: string) => {
            const { user } = get();
            return roleUtils.hasPermission(user, permission);
          },

          hasAnyPermission: (permissions: string[]) => {
            const { user } = get();
            return roleUtils.hasAnyPermission(user, permissions);
          },

          hasAllPermissions: (permissions: string[]) => {
            const { user } = get();
            return roleUtils.hasAllPermissions(user, permissions);
          },

          // Convenience getters
          isBrand: () => get().userRole === 'Brand',
          isManufacturer: () => get().userRole === 'Manufacturer',
          isCreator: () => get().userRole === 'Creator',

          canAccessFeature: (feature: string) => {
            const { user, userRole } = get();
            if (!user) return false;
            
            // Feature access rules
            const featureAccess: Record<string, string[]> = {
              'voting': ['Brand'],
              'certificates': ['Brand'],
              'products': ['Brand', 'Manufacturer'],
              'analytics': ['Brand', 'Manufacturer'],
              'integrations': ['Brand'],
              'api-keys': ['Brand'],
              'domains': ['Brand'],
              'orders': ['Manufacturer'],
              'production': ['Manufacturer'],
            };
            
            const allowedRoles = featureAccess[feature] || [];
            return allowedRoles.includes(userRole || '');
          },

          // Auth flow helpers
          redirectAfterLogin: () => {
            const { userRole } = get();
            switch (userRole) {
              case 'Brand':
                return '/dashboard';
              case 'Manufacturer':
                return '/manufacturer/dashboard';
              case 'Creator':
                return '/creator/dashboard';
              default:
                return '/dashboard';
            }
          },

          shouldRememberSession: () => {
            return get().rememberMe;
          },

          getSessionTimeRemaining: () => {
            const token = tokenUtils.getToken();
            return sessionUtils.getTimeUntilExpiry(token);
          },

          // Private helper to update user state
          _updateUserState: (user: User) => {
            const permissions = (user as any).permissions || [];
            const now = Date.now();
            const token = tokenUtils.getToken();
            
            return {
              user,
              isAuthenticated: true,
              userRole: user.occupation,
              userName: user.fullName,
              userEmail: user.email,
              businessName: user.businessName,
              permissions,
              session: {
                isExpiringSoon: sessionUtils.willExpireSoon(token, 5),
                timeUntilExpiry: sessionUtils.getTimeUntilExpiry(token),
                lastActivity: now,
              }
            };
          },
        }),
        {
          name: 'auth-store',
          // Only persist non-sensitive data
          partialize: (state) => ({
            user: state.user,
            isAuthenticated: state.isAuthenticated,
            userRole: state.userRole,
            userName: state.userName,
            userEmail: state.userEmail,
            businessName: state.businessName,
            permissions: state.permissions,
            lastLoginTime: state.lastLoginTime,
            rememberMe: state.rememberMe,
          }),
          // Clear persisted data on logout
          onRehydrateStorage: () => (state) => {
            if (state && !tokenUtils.hasToken()) {
              // Clear persisted auth state if no token exists
              Object.assign(state, {
                user: null,
                isAuthenticated: false,
                userRole: null,
                userName: null,
                userEmail: null,
                businessName: null,
                permissions: [],
                session: defaultSessionInfo,
                lastLoginTime: null,
                rememberMe: false,
              });
            }
          },
        }
      )
    ),
    { name: 'auth-store' }
  )
);

// Enhanced hook for easy store usage
export const useAuth = () => {
  return useAuthStore((state) => ({
    // Core state
    user: state.user,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    isAuthenticated: state.isAuthenticated,
    
    // Error state
    error: state.error,
    validationErrors: state.validationErrors,
    
    // User info
    userRole: state.userRole,
    userName: state.userName,
    userEmail: state.userEmail,
    businessName: state.businessName,
    permissions: state.permissions,
    
    // Session info
    session: state.session,
    lastLoginTime: state.lastLoginTime,
    
    // Loading states
    isLoggingIn: state.isLoggingIn,
    isLoggingOut: state.isLoggingOut,
    isSigningUp: state.isSigningUp,
    isRefreshing: state.isRefreshing,
    
    // Actions
    initialize: state.initialize,
    login: state.login,
    logout: state.logout,
    signup: state.signup,
    refreshUser: state.refreshUser,
    
    // Error management
    clearError: state.clearError,
    clearValidationErrors: state.clearValidationErrors,
    setError: state.setError,
    
    // Session management
    checkSession: state.checkSession,
    extendSession: state.extendSession,
    updateLastActivity: state.updateLastActivity,
    
    // User management
    setUser: state.setUser,
    updateUserProfile: state.updateUserProfile,
    
    // Role helpers
    hasRole: state.hasRole,
    hasAnyRole: state.hasAnyRole,
    hasPermission: state.hasPermission,
    hasAnyPermission: state.hasAnyPermission,
    hasAllPermissions: state.hasAllPermissions,
    
    // Convenience getters
    isBrand: state.isBrand(),
    isManufacturer: state.isManufacturer(),
    isCreator: state.isCreator(),
    canAccessFeature: state.canAccessFeature,
    
    // Auth flow helpers
    redirectAfterLogin: state.redirectAfterLogin,
    shouldRememberSession: state.shouldRememberSession,
    getSessionTimeRemaining: state.getSessionTimeRemaining,
  }));
};

// Selectors for specific use cases
export const authSelectors = {
  // Basic selectors
  user: (state: AuthState) => state.user,
  isAuthenticated: (state: AuthState) => state.isAuthenticated,
  isLoading: (state: AuthState) => state.isLoading || state.isLoggingIn || state.isLoggingOut || state.isSigningUp,
  error: (state: AuthState) => state.error,
  
  // User info
  userName: (state: AuthState) => state.userName,
  userEmail: (state: AuthState) => state.userEmail,
  businessName: (state: AuthState) => state.businessName,
  userRole: (state: AuthState) => state.userRole,
  
  // Role checks
  isBrand: (state: AuthState) => state.userRole === 'Brand',
  isManufacturer: (state: AuthState) => state.userRole === 'Manufacturer',
  isCreator: (state: AuthState) => state.userRole === 'Creator',
  
  // Session info
  isSessionExpiringSoon: (state: AuthState) => state.session.isExpiringSoon,
  sessionTimeRemaining: (state: AuthState) => state.session.timeUntilExpiry,
};

// Initialize auth store on app startup
if (typeof window !== 'undefined') {
  // Initialize the store
  useAuthStore.getState().initialize();
  
  // Set up session monitoring
  setInterval(() => {
    const { isAuthenticated, updateLastActivity, checkSession } = useAuthStore.getState();
    if (isAuthenticated) {
      updateLastActivity();
      // Check session every 5 minutes
      checkSession();
    }
  }, 5 * 60 * 1000);
  
  // Set up session warning
  useAuthStore.subscribe(
    (state) => state.session.timeUntilExpiry,
    (timeUntilExpiry) => {
      const { isAuthenticated, session } = useAuthStore.getState();
      if (isAuthenticated && timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
        // Session expires in less than 5 minutes
        console.warn('Session expiring soon');
        // You could show a notification here
      }
    }
  );
}