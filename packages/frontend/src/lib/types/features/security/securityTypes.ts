/**
 * Security Feature Types
 *
 * Re-export backend security types as the single source of truth while
 * defining frontend-specific response envelopes used by the security APIs.
 */

import type {
  CaptchaVerificationContext,
  CaptchaVerificationResult
} from '@backend/services/security/captcha/captcha.types';
import type {
  SecurityAuditResult,
  SecurityIssue
} from '@backend/services/security/securityAudit.service';
import type {
  SecurityActorType,
  SecurityEvent,
  SecurityAuditSummary,
  SystemSecurityMetrics,
  SessionInfo,
  SessionCreateInput,
  SecurityEventCreateInput,
  SecurityScanResult,
  SecurityScanMetrics,
  SecurityVulnerability
} from '@backend/services/infrastructure/security/utils/securityTypes';
import {
  SecurityEventType,
  SecuritySeverity
} from '@backend/services/infrastructure/security/utils/securityTypes';

export type {
  CaptchaVerificationContext,
  CaptchaVerificationResult,
  SecurityAuditResult,
  SecurityIssue,
  SecurityActorType,
  SecurityEvent,
  SecurityAuditSummary,
  SystemSecurityMetrics,
  SessionInfo,
  SessionCreateInput,
  SecurityEventCreateInput,
  SecurityScanResult,
  SecurityScanMetrics,
  SecurityVulnerability
};

export { SecurityEventType, SecuritySeverity };

/**
 * Captcha status returned from the backend configuration endpoint.
 */
export interface CaptchaStatus {
  enabled: boolean;
  enterprise?: boolean;
  environment?: string;
  minimumScore?: number;
  scoreThresholds?: Record<string, number>;
  timeoutMs?: number;
  requiredActions?: string[];
}

/**
 * Payload returned when verifying captcha responses.
 */
export interface CaptchaVerificationResponse extends CaptchaVerificationResult {
  config: CaptchaStatus;
}

export interface SuspiciousActivityResponse {
  userId: string;
  suspicious: boolean;
}

export interface SecurityAuditReportResponse {
  userId: string;
  days: number;
  report: SecurityAuditSummary;
}

export interface SystemSecurityMetricsResponse {
  days: number;
  metrics: SystemSecurityMetrics;
}

export interface SecurityAuditHistoryResponse {
  history: SecurityScanResult[];
  retrievedAt: string;
}

export interface SecurityAuditMetricsResponse {
  metrics: SystemSecurityMetrics;
  windowDays: number;
  generatedAt: string;
}

export interface SecurityAuditRequestResponse {
  issues: SecurityIssue[];
  requestId?: string | string[] | null;
  timestamp: string;
}

export interface SecurityScanExecutionResponse {
  result: SecurityScanResult;
  startedBy?: string;
}

export interface SecurityScanHistoryResponse {
  history: SecurityScanResult[];
  limit: number;
}

export interface SecurityScanMetricsResponse {
  metrics: SecurityScanMetrics;
  generatedAt: string;
}

export interface SecurityVulnerabilitiesResponse {
  vulnerabilities: SecurityVulnerability[];
  count: number;
}

export interface SecurityScanStatusResponse {
  inProgress: boolean;
  lastScanTime: string | null;
}

export interface SecurityEventLogResponse {
  logged: boolean;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
}

export interface SecurityAuthAttemptResponse {
  logged: boolean;
  userId: string;
  success: boolean;
}

export interface SecurityEventsEnvelope {
  events: SecurityEvent[];
  userId?: string;
  limit?: number;
  since?: string;
  total?: number;
}

export interface SessionCreationResponse {
  sessionId: string;
  createdAt: string;
}

export interface SessionActivityUpdateResponse {
  sessionId: string;
  updatedAt: string;
}

export interface SessionRevokeResponse {
  sessionId: string;
  revoked: boolean;
}

export interface SessionsRevokeAllResponse {
  userId: string;
  revoked: number;
}

export interface SessionCleanupResponse {
  cleaned: number;
  referenceDate: string;
}

export interface SessionCountResponse {
  userId: string;
  count: number;
  since: string;
}

export interface TokenBlacklistResponse {
  blacklisted: boolean;
  userId?: string;
}

export interface TokenBlacklistStatusResponse {
  tokenHashPreview: string;
  blacklisted: boolean;
}


