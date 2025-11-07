// src/lib/validation/schemas/features/security.ts
// Frontend validation schemas for security and auditing operations.

import Joi from 'joi';

import type {
  SecurityActorType,
  SecurityEventCreateInput,
  SecuritySeverity,
  SessionCreateInput,
  SecurityVulnerability,
  SecurityVulnerabilityCreateInput,
  SecurityScanResult,
  SecurityScanResultCreateInput,
  SecurityScanMetrics
} from '@backend/services/infrastructure/security/utils/securityTypes';

const SECURITY_ACTOR_TYPES: SecurityActorType[] = ['business', 'user', 'manufacturer'];

const SECURITY_EVENT_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET',
  'TOKEN_REFRESH',
  'TOKEN_INVALIDATED',
  'SESSION_REVOKED',
  'ALL_SESSIONS_REVOKED',
  'SUSPICIOUS_ACTIVITY',
  'ACCOUNT_LOCKED',
  'ACCOUNT_UNLOCKED',
  'EMAIL_VERIFIED',
  'PHONE_VERIFIED',
  'TWO_FACTOR_ENABLED',
  'TWO_FACTOR_DISABLED',
  'API_KEY_CREATED',
  'API_KEY_REVOKED',
  'SECURITY_SETTINGS_CHANGED'
] as const;

const SECURITY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

const VULNERABILITY_TYPES = [
  'sql_injection',
  'xss',
  'csrf',
  'insecure_direct_object_reference',
  'security_misconfiguration',
  'sensitive_data_exposure',
  'missing_function_level_access_control',
  'known_vulnerable_components',
  'unvalidated_redirects_forwards',
  'other'
] as const;

const actorSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'string.empty': 'User identifier is required for security operations',
      'any.required': 'User identifier is required for security operations'
    }),
  userType: Joi.string()
    .valid(...SECURITY_ACTOR_TYPES)
    .required()
    .messages({
      'any.only': 'Unsupported security actor type',
      'any.required': 'Security actor type is required'
    })
});

const severitySchema = Joi.string()
  .valid(...SECURITY_SEVERITIES)
  .messages({
    'any.only': 'Unsupported security event severity'
  });

const eventTypeSchema = Joi.string()
  .valid(...SECURITY_EVENT_TYPES)
  .messages({
    'any.only': 'Unsupported security event type'
  });

const securityEventSchema: Joi.ObjectSchema<SecurityEventCreateInput> = Joi.object({
  eventType: eventTypeSchema.required(),
  userId: Joi.string().trim().min(1).required(),
  userType: Joi.string().valid(...SECURITY_ACTOR_TYPES).required(),
  severity: severitySchema.required(),
  success: Joi.boolean().required(),
  ipAddress: Joi.string().trim().max(100).optional(),
  userAgent: Joi.string().trim().max(500).optional(),
  deviceFingerprint: Joi.string().trim().max(200).optional(),
  sessionId: Joi.string().trim().max(100).optional(),
  tokenId: Joi.string().trim().max(200).optional(),
  additionalData: Joi.object().unknown(true).optional(),
  timestamp: Joi.date().optional(),
  expiresAt: Joi.date().optional()
}).messages({
  'any.required': 'Security event payload is required'
});

const sessionCreateSchema: Joi.ObjectSchema<SessionCreateInput> = Joi.object({
  userId: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Session user ID is required'
  }),
  userType: Joi.string().valid(...SECURITY_ACTOR_TYPES).required().messages({
    'any.only': 'Unsupported security actor type for session'
  }),
  tokenId: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Session token identifier is required'
  }),
  ipAddress: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Session IP address is required'
  }),
  userAgent: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Session user agent is required'
  }),
  deviceFingerprint: Joi.string().trim().max(200).optional(),
  expiresAt: Joi.date().required().messages({
    'date.base': 'Session expiry is invalid'
  })
});

const tokenSchema = Joi.string()
  .trim()
  .min(1)
  .required()
  .messages({
    'string.empty': 'Token is required for blacklist operations',
    'any.required': 'Token is required for blacklist operations'
  });

const vulnerabilityTypeSchema = Joi.string()
  .valid(...VULNERABILITY_TYPES)
  .required()
  .messages({ 'any.only': 'Unsupported vulnerability type' });

const vulnerabilitySeveritySchema = Joi.string()
  .valid(...SECURITY_SEVERITIES)
  .required()
  .messages({ 'any.only': 'Unsupported vulnerability severity' });

const securityVulnerabilitySchema: Joi.ObjectSchema<SecurityVulnerability> = Joi.object({
  id: Joi.string().trim().min(1).max(100).required(),
  type: vulnerabilityTypeSchema,
  severity: vulnerabilitySeveritySchema,
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().min(1).max(1000).required(),
  recommendation: Joi.string().trim().min(1).max(1000).required(),
  detectedAt: Joi.date().required(),
  resolved: Joi.date().optional(),
  metadata: Joi.object().optional()
});

const securityVulnerabilityCreateSchema: Joi.ObjectSchema<SecurityVulnerabilityCreateInput> = Joi.object({
  id: Joi.string().trim().min(1).max(100).optional(),
  type: vulnerabilityTypeSchema,
  severity: vulnerabilitySeveritySchema,
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().min(1).max(1000).required(),
  recommendation: Joi.string().trim().min(1).max(1000).required(),
  detectedAt: Joi.date().optional(),
  resolved: Joi.date().optional(),
  metadata: Joi.object().optional()
});

const vulnerabilitySummarySchema = Joi.object({
  total: Joi.number().integer().min(0).required(),
  critical: Joi.number().integer().min(0).required(),
  high: Joi.number().integer().min(0).required(),
  medium: Joi.number().integer().min(0).required(),
  low: Joi.number().integer().min(0).required()
});

const scanStatusSchema = Joi.string().valid('completed', 'failed', 'in_progress').required();

const securityScanResultSchema: Joi.ObjectSchema<SecurityScanResult> = Joi.object({
  scanId: Joi.string().trim().min(1).max(100).required(),
  timestamp: Joi.date().required(),
  vulnerabilities: Joi.array().items(securityVulnerabilitySchema).required(),
  summary: vulnerabilitySummarySchema.required(),
  status: scanStatusSchema
});

const securityScanResultCreateSchema: Joi.ObjectSchema<SecurityScanResultCreateInput> = Joi.object({
  scanId: Joi.string().trim().min(1).max(100).optional(),
  timestamp: Joi.date().optional(),
  vulnerabilities: Joi.array().items(securityVulnerabilityCreateSchema).required(),
  summary: vulnerabilitySummarySchema.required(),
  status: scanStatusSchema
});

const securityScanMetricsSchema: Joi.ObjectSchema<SecurityScanMetrics> = Joi.object({
  totalScans: Joi.number().integer().min(0).required(),
  vulnerabilitiesFound: Joi.number().integer().min(0).required(),
  vulnerabilitiesResolved: Joi.number().integer().min(0).required(),
  averageScanTime: Joi.number().integer().min(0).required(),
  lastScanDate: Joi.date().optional(),
  riskScore: Joi.number().min(0).max(100).required()
});

const vulnerabilityFiltersSchema = Joi.object({
  type: Joi.string().optional(),
  severity: Joi.string().valid(...SECURITY_SEVERITIES).optional(),
  resolved: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(1000).optional()
});

const scanHistoryLimitSchema = Joi.number().integer().min(1).max(100).optional();

const vulnerabilityIdSchema = Joi.string().trim().min(1).max(100).required();

const scanIdSchema = Joi.string().trim().min(1).max(100).required();

/**
 * Security feature specific Joi schemas mirroring backend validation behaviour.
 */
export const securityFeatureSchemas = {
  actorContext: actorSchema,
  eventInput: securityEventSchema,
  sessionCreate: sessionCreateSchema,
  token: tokenSchema,
  vulnerability: securityVulnerabilitySchema,
  vulnerabilityCreate: securityVulnerabilityCreateSchema,
  scanResult: securityScanResultSchema,
  scanResultCreate: securityScanResultCreateSchema,
  scanMetrics: securityScanMetricsSchema,
  vulnerabilityFilters: vulnerabilityFiltersSchema,
  scanHistoryLimit: scanHistoryLimitSchema,
  vulnerabilityId: vulnerabilityIdSchema,
  scanId: scanIdSchema,
  severity: severitySchema,
  eventType: eventTypeSchema,
  vulnerabilityType: vulnerabilityTypeSchema
} as const;
