// src/lib/auth/session.ts

import { jwtDecode } from 'jwt-decode';

// Storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';
const TOKEN_EXPIRES_KEY = 'token_expires';

// Session configuration
const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const MAX_STORAGE_ATTEMPTS = 3;

interface TokenPayload {
  exp?: number;
  iat?: number;
  userId?: string;
  role?: string;
  email?: string;
  plan?: string;
  tenant?: string;
}

interface StoredUserData {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  plan?: string;
  tenant?: any;
  lastActivity?: number;
}

/**
 * Safely access localStorage with error handling.
 * @param operation The operation to perform ('get', 'set', 'remove').
 * @param key The storage key.
 * @param value The value to store (for 'set' operation).
 * @returns The stored value (for 'get' operation) or boolean success (for others).
 */
const safeStorage = (
  operation: 'get' | 'set' | 'remove',
  key: string,
  value?: string
): string | boolean | null => {
  if (typeof window === 'undefined') {
    return operation === 'get' ? null : false;
  }

  try {
    switch (operation) {
      case 'get':
        return localStorage.getItem(key);
      case 'set':
        if (value !== undefined) {
          localStorage.setItem(key, value);
          return true;
        }
        return false;
      case 'remove':
        localStorage.removeItem(key);
        return true;
      default:
        return false;
    }
  } catch (error) {
    console.error(`Storage operation '${operation}' failed for key '${key}':`, error);
    return operation === 'get' ? null : false;
  }
};

/**
 * Retrieves the auth token from storage.
 * @returns The token string, or null if not found or invalid.
 */
export const getToken = (): string | null => {
  const token = safeStorage('get', AUTH_TOKEN_KEY) as string | null;
  
  if (token && isTokenExpired(token)) {
    // Clean up expired token
    clearTokens();
    return null;
  }
  
  return token;
};

/**
 * Retrieves the refresh token from storage.
 * @returns The refresh token string, or null if not found.
 */
export const getRefreshToken = (): string | null => {
  return safeStorage('get', REFRESH_TOKEN_KEY) as string | null;
};

/**
 * Saves the auth token and refresh token to storage with retry logic.
 * @param token The access token string to save.
 * @param refreshToken The refresh token string to save.
 * @param userData Optional user data to store.
 * @returns True if successful, false otherwise.
 */
export const setTokens = (
  token: string, 
  refreshToken: string, 
  userData?: StoredUserData
): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    // Validate tokens before storing
    if (!token || !refreshToken) {
      console.error('Invalid tokens provided');
      return false;
    }

    // Decode token to get expiration
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      console.error('Invalid token format');
      return false;
    }

    let attempts = 0;
    const maxAttempts = MAX_STORAGE_ATTEMPTS;

    while (attempts < maxAttempts) {
      try {
        safeStorage('set', AUTH_TOKEN_KEY, token);
        safeStorage('set', REFRESH_TOKEN_KEY, refreshToken);
        safeStorage('set', TOKEN_EXPIRES_KEY, (decoded.exp * 1000).toString());
        
        if (userData) {
          safeStorage('set', USER_DATA_KEY, JSON.stringify({
            ...userData,
            lastActivity: Date.now()
          }));
        }

        return true;
      } catch (error) {
        attempts++;
        console.warn(`Storage attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          console.error('Failed to store tokens after maximum attempts');
          return false;
        }
      }
    }
  } catch (error) {
    console.error('Error setting tokens:', error);
    return false;
  }

  return false;
};

/**
 * Updates only the access token (keeping refresh token).
 * @param newToken The new access token.
 * @returns True if successful, false otherwise.
 */
export const updateToken = (newToken: string): boolean => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.error('No refresh token found for token update');
    return false;
  }

  return setTokens(newToken, refreshToken);
};

/**
 * Removes all authentication data from storage.
 * @param reason Optional reason for clearing tokens (for logging).
 */
export const clearTokens = (reason?: string): void => {
  if (reason) {
    console.log(`Clearing tokens: ${reason}`);
  }

  safeStorage('remove', AUTH_TOKEN_KEY);
  safeStorage('remove', REFRESH_TOKEN_KEY);
  safeStorage('remove', USER_DATA_KEY);
  safeStorage('remove', TOKEN_EXPIRES_KEY);
};

/**
 * Decodes a JWT token safely.
 * @param token The token to decode.
 * @returns The decoded payload or null if invalid.
 */
export const decodeToken = (token: string | null): TokenPayload | null => {
  if (!token) return null;

  try {
    return jwtDecode<TokenPayload>(token);
  } catch (error) {
    console.error('Invalid token format:', error);
    return null;
  }
};

/**
 * Checks if a token is expired by decoding its JWT payload.
 * @param token The token string to check.
 * @returns True if the token is expired or invalid, false otherwise.
 */
export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;

  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;

  // Add small buffer (30 seconds) to account for clock skew
  const bufferTime = 30 * 1000;
  return Date.now() >= (decoded.exp * 1000 - bufferTime);
};

/**
 * Checks if token will expire soon (within warning threshold).
 * @param token The token to check.
 * @returns True if token expires within the warning threshold.
 */
export const isTokenExpiringSoon = (token: string | null): boolean => {
  if (!token) return false;

  const decoded = decodeToken(token);
  if (!decoded?.exp) return false;

  return Date.now() >= (decoded.exp * 1000 - SESSION_WARNING_THRESHOLD);
};

/**
 * Gets the token expiration time.
 * @param token The token to check.
 * @returns Expiration timestamp or null if invalid.
 */
export const getTokenExpiration = (token: string | null): number | null => {
  if (!token) return null;

  const decoded = decodeToken(token);
  return decoded?.exp ? decoded.exp * 1000 : null;
};

/**
 * Gets time until token expiration.
 * @param token The token to check.
 * @returns Milliseconds until expiration, or 0 if expired/invalid.
 */
export const getTimeUntilExpiration = (token: string | null): number => {
  const expTime = getTokenExpiration(token);
  if (!expTime) return 0;

  const timeLeft = expTime - Date.now();
  return Math.max(0, timeLeft);
};

/**
 * Retrieves stored user data.
 * @returns The stored user data or null if not found.
 */
export const getStoredUserData = (): StoredUserData | null => {
  const data = safeStorage('get', USER_DATA_KEY) as string | null;
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing stored user data:', error);
    safeStorage('remove', USER_DATA_KEY);
    return null;
  }
};

/**
 * Updates stored user data.
 * @param userData The user data to store.
 * @returns True if successful, false otherwise.
 */
export const updateStoredUserData = (userData: Partial<StoredUserData>): boolean => {
  const currentData = getStoredUserData();
  const updatedData = {
    ...currentData,
    ...userData,
    lastActivity: Date.now()
  };

  try {
    return safeStorage('set', USER_DATA_KEY, JSON.stringify(updatedData)) as boolean;
  } catch (error) {
    console.error('Error updating user data:', error);
    return false;
  }
};

/**
 * Updates last activity timestamp.
 */
export const updateLastActivity = (): void => {
  const userData = getStoredUserData();
  if (userData) {
    updateStoredUserData({ lastActivity: Date.now() });
  }
};

/**
 * Checks if the session is still valid based on last activity.
 * @param maxInactivityMs Maximum inactivity time in milliseconds (default: 30 minutes).
 * @returns True if session is still active, false otherwise.
 */
export const isSessionActive = (maxInactivityMs = 30 * 60 * 1000): boolean => {
  const userData = getStoredUserData();
  if (!userData?.lastActivity) return false;

  return (Date.now() - userData.lastActivity) < maxInactivityMs;
};

/**
 * Gets session information.
 * @returns Object with session details.
 */
export const getSessionInfo = () => {
  const token = getToken();
  const userData = getStoredUserData();
  const decoded = token ? decodeToken(token) : null;

  return {
    isAuthenticated: !!token && !isTokenExpired(token),
    tokenExists: !!token,
    isExpired: token ? isTokenExpired(token) : true,
    isExpiringSoon: token ? isTokenExpiringSoon(token) : false,
    expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : null,
    timeUntilExpiry: token ? getTimeUntilExpiration(token) : 0,
    userData,
    tokenPayload: decoded,
    lastActivity: userData?.lastActivity ? new Date(userData.lastActivity) : null,
    sessionActive: isSessionActive()
  };
};

/**
 * Validates the current session and cleans up if invalid.
 * @returns True if session is valid, false otherwise.
 */
export const validateSession = (): boolean => {
  const token = getToken();
  
  if (!token) {
    clearTokens('no_token');
    return false;
  }

  if (isTokenExpired(token)) {
    clearTokens('token_expired');
    return false;
  }

  if (!isSessionActive()) {
    clearTokens('session_inactive');
    return false;
  }

  // Update activity on validation
  updateLastActivity();
  return true;
};

/**
 * Creates a session monitor that can be used to track session state.
 * @returns Object with session monitoring methods.
 */
export const createSessionMonitor = () => {
  let warningShown = false;
  let checkInterval: NodeJS.Timeout | null = null;

  const startMonitoring = (
    onExpiringSoon?: () => void,
    onExpired?: () => void,
    checkIntervalMs = 60000
  ) => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    checkInterval = setInterval(() => {
      const token = getToken();
      
      if (!token || isTokenExpired(token)) {
        onExpired?.();
        stopMonitoring();
        return;
      }

      if (!warningShown && isTokenExpiringSoon(token)) {
        warningShown = true;
        onExpiringSoon?.();
      }
    }, checkIntervalMs);
  };

  const stopMonitoring = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    warningShown = false;
  };

  const resetWarning = () => {
    warningShown = false;
  };

  return {
    startMonitoring,
    stopMonitoring,
    resetWarning,
    isMonitoring: () => !!checkInterval
  };
};

/**
 * Export session configuration for external use.
 */
export const sessionConfig = {
  SESSION_WARNING_THRESHOLD,
  MAX_STORAGE_ATTEMPTS,
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DATA_KEY,
  TOKEN_EXPIRES_KEY
} as const;
