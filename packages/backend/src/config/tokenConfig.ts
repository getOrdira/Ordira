// src/config/tokenConfig.ts

import { logger } from '../utils/logger';
/**
 * Token configuration management
 */

export interface TokenConfig {
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  maxTokenAge: number; // Maximum age in seconds before requiring refresh
  issuer: string;
  audience: string;
  algorithm: string;
  refreshThreshold: number; // Percentage of token lifetime when refresh should be triggered
}

/**
 * Default token configuration
 */
export const DEFAULT_TOKEN_CONFIG: TokenConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  maxTokenAge: 86400, // 24 hours
  issuer: 'Ordira-api',
  audience: 'ordira-app',
  algorithm: 'HS256',
  refreshThreshold: 0.8 // Refresh when 80% of token lifetime has passed
};

/**
 * Get token configuration from environment variables with fallbacks
 */
export function getTokenConfig(): TokenConfig {
  return {
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || DEFAULT_TOKEN_CONFIG.accessTokenExpiry,
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || DEFAULT_TOKEN_CONFIG.refreshTokenExpiry,
    maxTokenAge: parseInt(process.env.JWT_MAX_AGE || DEFAULT_TOKEN_CONFIG.maxTokenAge.toString()),
    issuer: process.env.JWT_ISSUER || DEFAULT_TOKEN_CONFIG.issuer,
    audience: process.env.JWT_AUDIENCE || DEFAULT_TOKEN_CONFIG.audience,
    algorithm: process.env.JWT_ALGORITHM || DEFAULT_TOKEN_CONFIG.algorithm,
    refreshThreshold: parseFloat(process.env.JWT_REFRESH_THRESHOLD || DEFAULT_TOKEN_CONFIG.refreshThreshold.toString())
  };
}

/**
 * Validate token configuration
 */
export function validateTokenConfig(config: TokenConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate access token expiry
  if (!config.accessTokenExpiry || config.accessTokenExpiry === '24h') {
    errors.push('Access token expiry should be 15m or less for security');
  }

  // Validate refresh token expiry
  if (!config.refreshTokenExpiry || config.refreshTokenExpiry === '30d') {
    errors.push('Refresh token expiry should be 7d or less for security');
  }

  // Validate max token age
  if (config.maxTokenAge > 86400) { // 24 hours
    errors.push('Max token age should not exceed 24 hours');
  }

  // Validate issuer and audience
  if (!config.issuer || config.issuer === 'your-issuer') {
    errors.push('JWT issuer must be properly configured');
  }

  if (!config.audience || config.audience === 'your-audience') {
    errors.push('JWT audience must be properly configured');
  }

  // Validate refresh threshold
  if (config.refreshThreshold < 0.5 || config.refreshThreshold > 1) {
    errors.push('Refresh threshold should be between 0.5 and 1.0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Parse time string to seconds
 */
export function parseTimeToSeconds(timeString: string): number {
  const units: { [key: string]: number } = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800
  };

  const match = timeString.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];
  
  return value * units[unit];
}

/**
 * Check if token needs refresh based on configuration
 */
export function shouldRefreshToken(tokenIat: number, config: TokenConfig): boolean {
  const tokenAge = Date.now() / 1000 - tokenIat;
  const maxAge = parseTimeToSeconds(config.accessTokenExpiry);
  const refreshThreshold = maxAge * config.refreshThreshold;
  
  return tokenAge >= refreshThreshold;
}

/**
 * Get token expiry timestamp
 */
export function getTokenExpiry(tokenIat: number, expiryString: string): number {
  const expirySeconds = parseTimeToSeconds(expiryString);
  return tokenIat + expirySeconds;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(tokenIat: number, expiryString: string): boolean {
  const expiry = getTokenExpiry(tokenIat, expiryString);
  return Date.now() / 1000 > expiry;
}

/**
 * Get remaining token lifetime in seconds
 */
export function getRemainingTokenLifetime(tokenIat: number, expiryString: string): number {
  const expiry = getTokenExpiry(tokenIat, expiryString);
  const remaining = expiry - (Date.now() / 1000);
  return Math.max(0, remaining);
}

/**
 * Token configuration validation middleware
 */
export function validateTokenConfigMiddleware(req: any, res: any, next: any): void {
  const config = getTokenConfig();
  const validation = validateTokenConfig(config);
  
  if (!validation.valid) {
    logger.error('Token configuration validation failed:', validation.errors);
    // In production, you might want to throw an error or use a fallback
  }
  
  req.tokenConfig = config;
  next();
}
