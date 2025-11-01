/**
 * Authentication & Authorization Middleware Module
 * 
 * Exports unified authentication, API keys, and CAPTCHA verification middleware
 */

// Main authentication - Unified Auth
export {
  authenticate,
  optionalAuthenticate,
  requireUserType,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  requireOwnership,
  requireManufacturer,
  requireVerifiedManufacturer,
  requireBrandAccess,
  requireBusiness,
  requireUser,
  generateToken,
  generateRefreshToken,
  validateRefreshToken,
  decodeTokenUnsafe,
  refreshToken,
  TOKEN_CONFIG,
  type UnifiedAuthRequest,
  type JWTPayload
} from './unifiedAuth.middleware';

// API key authentication
export {
  authenticateApiKey,
  requireApiKeyPermission,
  requireApiKeyScope,
  type ApiKeyRequest
} from './apiKey.middleware';

// CAPTCHA verification
export {
  createCaptchaMiddleware,
  captchaMiddleware,
  type CaptchaMiddlewareOptions
} from './captcha.middleware';

// CAPTCHA rate limiting
export {
  createCaptchaRateLimitMiddleware,
  captchaRateLimitMiddleware,
  type CaptchaRateLimitOptions
} from './captchaRateLimit.middleware';

// Email gating
export {
  checkEmailGating,
  logEmailGatingAttempt,
  type EmailGatingResult,
  type EmailGatingRequest
} from './emailGating.middleware';

