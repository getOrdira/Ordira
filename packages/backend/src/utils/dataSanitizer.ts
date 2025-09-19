// src/utils/dataSanitizer.ts

/**
 * Comprehensive data sanitization utilities for secure logging
 * Prevents sensitive data exposure in logs and error messages
 */

// ===== SENSITIVE DATA PATTERNS =====

export interface SensitivePattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // API Keys and Tokens
  { pattern: /(api[_-]?key|apikey)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'API Keys' },
  { pattern: /(access[_-]?token|accesstoken)\s*[:=]\s*["']?([a-zA-Z0-9_.-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Access Tokens' },
  { pattern: /(refresh[_-]?token|refreshtoken)\s*[:=]\s*["']?([a-zA-Z0-9_.-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Refresh Tokens' },
  { pattern: /(bearer\s+)([a-zA-Z0-9_.-]{20,})/gi, replacement: '$1***REDACTED***', description: 'Bearer Tokens' },
  
  // Database and Connection Strings
  { pattern: /(mongodb[_-]?uri|mongo[_-]?uri)\s*[:=]\s*["']?(mongodb:\/\/[^"'\s]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'MongoDB URI' },
  { pattern: /(redis[_-]?url|redis[_-]?uri)\s*[:=]\s*["']?(redis:\/\/[^"'\s]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'Redis URL' },
  
  // Authentication Secrets
  { pattern: /(jwt[_-]?secret|jwtscret)\s*[:=]\s*["']?([a-zA-Z0-9_-]{32,})["']?/gi, replacement: '$1=***REDACTED***', description: 'JWT Secrets' },
  { pattern: /(secret[_-]?key|secretkey)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Secret Keys' },
  
  // Payment Processing
  { pattern: /(stripe[_-]?secret[_-]?key|stripesecretkey)\s*[:=]\s*["']?(sk_[a-zA-Z0-9_-]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'Stripe Secret Keys' },
  { pattern: /(stripe[_-]?webhook[_-]?secret|stripewebhooksecret)\s*[:=]\s*["']?(whsec_[a-zA-Z0-9_-]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'Stripe Webhook Secrets' },
  
  // Blockchain and Crypto
  { pattern: /(private[_-]?key|privatekey)\s*[:=]\s*["']?(0x[a-fA-F0-9]{64})["']?/gi, replacement: '$1=***REDACTED***', description: 'Private Keys' },
  { pattern: /(wallet[_-]?address|walletaddress)\s*[:=]\s*["']?(0x[a-fA-F0-9]{40})["']?/gi, replacement: '$1=***REDACTED***', description: 'Wallet Addresses' },
  
  // Email and SMS
  { pattern: /(postmark[_-]?api[_-]?key|postmarkapikey)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Postmark API Keys' },
  { pattern: /(twilio[_-]?token|twiliotoken)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Twilio Tokens' },
  { pattern: /(smtp[_-]?pass|smtppass)\s*[:=]\s*["']?([^"'\s]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'SMTP Passwords' },
  
  // AWS and Cloud Services
  { pattern: /(aws[_-]?access[_-]?key[_-]?id|awsaccesskeyid)\s*[:=]\s*["']?(AKIA[a-zA-Z0-9]{16})["']?/gi, replacement: '$1=***REDACTED***', description: 'AWS Access Key IDs' },
  { pattern: /(aws[_-]?secret[_-]?access[_-]?key|awssecretaccesskey)\s*[:=]\s*["']?([a-zA-Z0-9/+=]{40})["']?/gi, replacement: '$1=***REDACTED***', description: 'AWS Secret Access Keys' },
  
  // Generic patterns for common sensitive fields
  { pattern: /(password|passwd|pwd)\s*[:=]\s*["']?([^"'\s]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'Passwords' },
  { pattern: /(token|key|secret)\s*[:=]\s*["']?([a-zA-Z0-9_-]{16,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Generic Tokens/Keys' },
];

// ===== SENSITIVE FIELD NAMES =====

export const SENSITIVE_FIELD_NAMES = new Set([
  // Authentication
  'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'auth',
  'jwt_secret', 'jwt_secret_key', 'access_token', 'refresh_token',
  'bearer_token', 'api_key', 'apikey', 'client_secret',
  
  // Database
  'mongodb_uri', 'mongo_uri', 'database_url', 'db_url',
  'redis_url', 'redis_uri', 'connection_string',
  
  // Payment
  'stripe_secret_key', 'stripe_webhook_secret', 'payment_key',
  
  // Blockchain
  'private_key', 'wallet_address', 'deployer_key', 'relayer_wallet',
  
  // External Services
  'shopify_access_token', 'shopify_webhook_secret',
  'woo_consumer_key', 'woo_consumer_secret',
  'wix_api_key', 'wix_refresh_token',
  
  // Cloud Services
  'aws_access_key_id', 'aws_secret_access_key', 's3_bucket',
  'postmark_api_key', 'twilio_token', 'twilio_sid',
  'smtp_pass', 'smtp_password',
  
  // Monitoring
  'sentry_dsn', 'cloudflare_api_token',
]);

// ===== SANITIZATION FUNCTIONS =====

/**
 * Sanitize a string by applying all sensitive data patterns
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let sanitized = input;
  
  // Apply all sensitive patterns
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  
  return sanitized;
}

/**
 * Sanitize an object by recursively sanitizing all string values
 * and masking sensitive field names
 */
export function sanitizeObject(obj: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeFieldName(key);
      sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
    }
    
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize field names that might contain sensitive information
 */
export function sanitizeFieldName(fieldName: string): string {
  if (!fieldName || typeof fieldName !== 'string') {
    return fieldName;
  }

  const lowerFieldName = fieldName.toLowerCase();
  
  // Check if field name contains sensitive keywords
  for (const sensitiveField of SENSITIVE_FIELD_NAMES) {
    if (lowerFieldName.includes(sensitiveField.toLowerCase())) {
      return `[SENSITIVE_FIELD_${fieldName.toUpperCase()}]`;
    }
  }
  
  return fieldName;
}

/**
 * Sanitize environment variables for logging
 */
export function sanitizeEnvironmentVariables(env: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(env)) {
    const sanitizedKey = sanitizeFieldName(key);
    
    if (SENSITIVE_FIELD_NAMES.has(key.toLowerCase())) {
      sanitized[sanitizedKey] = '***REDACTED***';
    } else {
      sanitized[sanitizedKey] = sanitizeString(String(value));
    }
  }
  
  return sanitized;
}

/**
 * Sanitize error objects for logging
 */
export function sanitizeError(error: any): any {
  if (!error) return error;
  
  const sanitized: any = {
    name: error.name,
    message: sanitizeString(error.message),
    stack: error.stack ? sanitizeString(error.stack) : undefined,
    code: error.code,
    statusCode: error.statusCode,
  };
  
  // Sanitize additional error properties
  if (error.additionalData) {
    sanitized.additionalData = sanitizeObject(error.additionalData);
  }
  
  if (error.context) {
    sanitized.context = sanitizeObject(error.context);
  }
  
  return sanitized;
}

/**
 * Sanitize request/response data for logging
 */
export function sanitizeRequestData(data: any): any {
  if (!data) return data;
  
  const sanitized = sanitizeObject(data);
  
  // Additional sanitization for common request fields
  if (sanitized.headers) {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    for (const header of sensitiveHeaders) {
      if (sanitized.headers[header]) {
        sanitized.headers[header] = '***REDACTED***';
      }
    }
  }
  
  if (sanitized.body) {
    // Remove common sensitive fields from request body
    const sensitiveBodyFields = ['password', 'token', 'secret', 'key', 'apiKey'];
    for (const field of sensitiveBodyFields) {
      if (sanitized.body[field]) {
        sanitized.body[field] = '***REDACTED***';
      }
    }
  }
  
  return sanitized;
}

/**
 * Create a safe summary of sensitive data for logging
 */
export function createSafeSummary(data: any, maxLength: number = 200): string {
  const sanitized = sanitizeObject(data);
  const jsonString = JSON.stringify(sanitized);
  
  if (jsonString.length <= maxLength) {
    return jsonString;
  }
  
  return jsonString.substring(0, maxLength) + '...[TRUNCATED]';
}

/**
 * Check if a string contains sensitive data patterns
 */
export function containsSensitiveData(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  for (const { pattern } of SENSITIVE_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get a list of sensitive patterns found in a string
 */
export function getSensitivePatterns(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }
  
  const foundPatterns: string[] = [];
  
  for (const { pattern, description } of SENSITIVE_PATTERNS) {
    if (pattern.test(input)) {
      foundPatterns.push(description);
    }
  }
  
  return foundPatterns;
}

// ===== CONVENIENCE FUNCTIONS =====

export const sanitize = sanitizeString;
export const sanitizeLog = sanitizeObject;
export const sanitizeEnv = sanitizeEnvironmentVariables;
export const sanitizeErr = sanitizeError;
export const sanitizeReq = sanitizeRequestData;
export const safeSummary = createSafeSummary;
export const hasSensitiveData = containsSensitiveData;
export const getSensitivePatternsFound = getSensitivePatterns;
