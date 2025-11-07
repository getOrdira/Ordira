// src/lib/security/sensitiveData.ts
// Shared sensitive-data masking utilities aligned with backend dataSanitizer patterns.

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

  // Database URIs
  { pattern: /(mongodb[_-]?uri|mongo[_-]?uri)\s*[:=]\s*["']?(mongodb:\/\/[^"'\s]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'MongoDB URI' },
  { pattern: /(redis[_-]?url|redis[_-]?uri)\s*[:=]\s*["']?(redis:\/\/[^"'\s]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'Redis URL' },

  // Authentication secrets
  { pattern: /(jwt[_-]?secret|jwtsecret)\s*[:=]\s*["']?([a-zA-Z0-9_-]{32,})["']?/gi, replacement: '$1=***REDACTED***', description: 'JWT Secrets' },
  { pattern: /(secret[_-]?key|secretkey)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Secret Keys' },

  // Payment processing
  { pattern: /(stripe[_-]?secret[_-]?key|stripesecretkey)\s*[:=]\s*["']?(sk_[a-zA-Z0-9_-]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'Stripe Secret Keys' },
  { pattern: /(stripe[_-]?webhook[_-]?secret|stripewebhooksecret)\s*[:=]\s*["']?(whsec_[a-zA-Z0-9_-]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'Stripe Webhook Secrets' },

  // Blockchain
  { pattern: /(private[_-]?key|privatekey)\s*[:=]\s*["']?(0x[a-fA-F0-9]{64})["']?/gi, replacement: '$1=***REDACTED***', description: 'Private Keys' },
  { pattern: /(wallet[_-]?address|walletaddress)\s*[:=]\s*["']?(0x[a-fA-F0-9]{40})["']?/gi, replacement: '$1=***REDACTED***', description: 'Wallet Addresses' },

  // Email/SMS providers
  { pattern: /(postmark[_-]?api[_-]?key|postmarkapikey)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Postmark API Keys' },
  { pattern: /(twilio[_-]?token|twiliotoken)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Twilio Tokens' },
  { pattern: /(smtp[_-]?pass|smtppass)\s*[:=]\s*["']?([^"'\s]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'SMTP Passwords' },

  // Cloud providers
  { pattern: /(aws[_-]?access[_-]?key[_-]?id|awsaccesskeyid)\s*[:=]\s*["']?(AKIA[a-zA-Z0-9]{16})["']?/gi, replacement: '$1=***REDACTED***', description: 'AWS Access Key IDs' },
  { pattern: /(aws[_-]?secret[_-]?access[_-]?key|awssecretaccesskey)\s*[:=]\s*["']?([a-zA-Z0-9/+=]{40})["']?/gi, replacement: '$1=***REDACTED***', description: 'AWS Secret Access Keys' },

  // Generic tokens/keys/passwords
  { pattern: /(password|passwd|pwd)\s*[:=]\s*["']?([^"'\s]+)["']?/gi, replacement: '$1=***REDACTED***', description: 'Passwords' },
  { pattern: /(token|key|secret)\s*[:=]\s*["']?([a-zA-Z0-9_-]{16,})["']?/gi, replacement: '$1=***REDACTED***', description: 'Generic Tokens' },
  { pattern: /(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g, replacement: '***JWT_TOKEN***', description: 'JWT Tokens' }
];

export const SENSITIVE_FIELD_NAMES = new Set<string>([
  'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'auth',
  'jwt_secret', 'jwt_secret_key', 'access_token', 'refresh_token',
  'bearer_token', 'api_key', 'apikey', 'client_secret',
  'mongodb_uri', 'mongo_uri', 'database_url', 'db_url',
  'redis_url', 'redis_uri', 'connection_string',
  'stripe_secret_key', 'stripe_webhook_secret', 'payment_key',
  'private_key', 'wallet_address', 'deployer_key', 'relayer_wallet',
  'shopify_access_token', 'shopify_webhook_secret',
  'woo_consumer_key', 'woo_consumer_secret',
  'wix_api_key', 'wix_refresh_token',
  'aws_access_key_id', 'aws_secret_access_key', 's3_bucket',
  'postmark_api_key', 'twilio_token', 'twilio_sid',
  'smtp_pass', 'smtp_password', 'sentry_dsn', 'cloudflare_api_token'
]);

export const sanitizeSensitiveString = (input: unknown): string => {
  if (input === undefined || input === null) {
    return '';
  }

  const value = typeof input === 'string' ? input : JSON.stringify(input);
  return SENSITIVE_PATTERNS.reduce(
    (sanitized, { pattern, replacement }) => sanitized.replace(pattern, replacement),
    value
  );
};

export const sanitizeSensitiveFieldName = (fieldName: string): string => {
  if (!fieldName) {
    return fieldName;
  }

  const lower = fieldName.toLowerCase();
  for (const sensitive of SENSITIVE_FIELD_NAMES) {
    if (lower.includes(sensitive.toLowerCase())) {
      return `[SENSITIVE_FIELD_${fieldName.toUpperCase()}]`;
    }
  }
  return fieldName;
};

export const sanitizeSensitiveObject = <T>(value: T, depth = 0, maxDepth = 10): T => {
  if (depth > maxDepth) {
    return '[MAX_DEPTH_REACHED]' as unknown as T;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeSensitiveString(value) as unknown as T;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveObject(item, depth + 1, maxDepth)) as unknown as T;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => {
      const sanitizedKey = sanitizeSensitiveFieldName(key);
      const sanitizedValue = sanitizeSensitiveObject(val, depth + 1, maxDepth);
      return [sanitizedKey, sanitizedValue];
    });
    return Object.fromEntries(entries) as T;
  }

  return value;
};

export const sanitizeEnvironmentForLogging = (env: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(env)) {
    const maskedKey = sanitizeSensitiveFieldName(key);
    sanitized[maskedKey] = SENSITIVE_FIELD_NAMES.has(key.toLowerCase())
      ? '***REDACTED***'
      : sanitizeSensitiveString(value);
  }
  return sanitized;
};

export const sanitizeRequestDataForLogging = <T extends Record<string, unknown>>(
  data: T | null | undefined
): T | undefined => {
  if (!data) {
    return undefined;
  }

  const sanitized = sanitizeSensitiveObject(data) as Record<string, unknown>;

  if ('headers' in sanitized) {
    const headers = sanitized.headers as Record<string, unknown> | undefined;
    if (headers) {
      const forbiddenHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
      for (const header of forbiddenHeaders) {
        if (header in headers) {
          headers[header] = '***REDACTED***';
        }
      }
    }
  }

  if ('body' in sanitized) {
    const body = sanitized.body as Record<string, unknown> | undefined;
    if (body) {
      const sensitiveBodyFields = ['password', 'token', 'secret', 'key', 'apiKey'];
      for (const field of sensitiveBodyFields) {
        if (field in body) {
          body[field] = '***REDACTED***';
        }
      }
    }
  }

  return sanitized as T;
};

export const sanitizeErrorForLogging = (error: unknown): unknown => {
  if (!(error instanceof Error)) {
    return sanitizeSensitiveObject(error);
  }

  const base: Record<string, unknown> = {
    name: error.name,
    message: sanitizeSensitiveString(error.message),
    stack: error.stack ? sanitizeSensitiveString(error.stack) : undefined,
    code: (error as { code?: unknown }).code,
    statusCode: (error as { statusCode?: unknown }).statusCode
  };

  if ((error as { additionalData?: unknown }).additionalData) {
    base.additionalData = sanitizeSensitiveObject((error as { additionalData?: unknown }).additionalData);
  }

  if ((error as { context?: unknown }).context) {
    base.context = sanitizeSensitiveObject((error as { context?: unknown }).context);
  }

  return base;
};

export const createSafeSummary = (data: unknown, maxLength = 200): string => {
  const sanitized = sanitizeSensitiveObject(data);
  const summary = JSON.stringify(sanitized);
  return summary.length <= maxLength ? summary : `${summary.substring(0, maxLength)}...[TRUNCATED]`;
};

export const hasSensitiveData = (input: string): boolean => {
  if (!input) {
    return false;
  }
  return SENSITIVE_PATTERNS.some(({ pattern }) => pattern.test(input));
};

export const getSensitivePatterns = (input: string): string[] => {
  if (!input) {
    return [];
  }
  return SENSITIVE_PATTERNS.filter(({ pattern }) => pattern.test(input)).map(({ description }) => description);
};


