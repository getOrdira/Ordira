// src/lib/security/audit.ts

/**
 * Security audit utilities aligned with backend audit/event models.
 * Provides helpers to produce standardized audit events, results, and reports.
 */

import type { SerializedError } from '../errors/errors';
import { createSafeSummary } from './sensitiveData';

type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type AuditEventType =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'configuration'
  | 'token'
  | 'session'
  | 'error'
  | 'anomaly';

export interface AuditIssue {
  id?: string;
  severity: AuditSeverity;
  title: string;
  description: string;
  recommendation?: string;
  detectedAt?: string;
  context?: Record<string, unknown>;
}

export interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  timestamp: string;
  actor?: {
    userId?: string;
    email?: string;
    role?: string;
    ip?: string;
  };
  resource?: {
    type?: string;
    id?: string;
    path?: string;
    method?: string;
  };
  statusCode?: number;
  success: boolean;
  severity: AuditSeverity;
  message: string;
  details?: Record<string, unknown>;
  issues?: AuditIssue[];
  requestId?: string;
  correlationId?: string;
}

export interface AuditResult {
  id: string;
  timestamp: string;
  passed: boolean;
  score: number;
  issues: AuditIssue[];
  recommendations: string[];
  metadata?: Record<string, unknown>;
}

export interface AuditReportSection {
  title: string;
  description?: string;
  issues: AuditIssue[];
  recommendations?: string[];
}

export interface AuditReport {
  id: string;
  generatedAt: string;
  generatedBy?: string;
  summary: {
    score: number;
    passed: boolean;
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  sections: AuditReportSection[];
  overview?: string;
}

export interface CreateAuditEventOptions {
  eventType: AuditEventType;
  message: string;
  severity?: AuditSeverity;
  success?: boolean;
  actor?: AuditEvent['actor'];
  resource?: AuditEvent['resource'];
  statusCode?: number;
  requestId?: string;
  correlationId?: string;
  details?: Record<string, unknown>;
  issues?: AuditIssue[];
}

export const createAuditEvent = (options: CreateAuditEventOptions): AuditEvent => {
  const now = new Date().toISOString();
  return {
    eventId: `${options.eventType}:${now}:${Math.random().toString(36).slice(2)}`,
    eventType: options.eventType,
    timestamp: now,
    actor: options.actor,
    resource: options.resource,
    statusCode: options.statusCode,
    success:
      options.success ??
      (options.severity !== 'critical' && options.severity !== 'high'),
    severity: options.severity ?? 'info',
    message: options.message,
    details: options.details,
    issues: options.issues,
    requestId: options.requestId,
    correlationId: options.correlationId
  };
};

export const createAuditIssue = (
  severity: AuditSeverity,
  title: string,
  description: string,
  recommendation?: string,
  context?: Record<string, unknown>
): AuditIssue => ({
  id: `${severity}-${Math.random().toString(36).slice(2)}`,
  severity,
  title,
  description,
  recommendation,
  detectedAt: new Date().toISOString(),
  context
});

export const analyseIssues = (issues: AuditIssue[]) => {
  const stats = {
    total: issues.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };

  issues.forEach((issue) => {
    stats[issue.severity]++;
  });

  return stats;
};

export const calculateScore = (issues: AuditIssue[]): number => {
  if (!issues.length) {
    return 100;
  }

  const weights: Record<AuditSeverity, number> = {
    critical: 40,
    high: 25,
    medium: 15,
    low: 5,
    info: 0
  };

  const totalDeduction = issues.reduce((sum, issue) => sum + (weights[issue.severity] ?? 0), 0);
  const score = 100 - totalDeduction;
  return Math.max(0, score);
};

export interface CreateAuditResultOptions {
  issues?: AuditIssue[];
  recommendations?: string[];
  metadata?: Record<string, unknown>;
  id?: string;
}

export const createAuditResult = (options: CreateAuditResultOptions = {}): AuditResult => {
  const issues = options.issues ?? [];
  const score = calculateScore(issues);

  return {
    id: options.id ?? `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    passed: score >= 80 && issues.every((issue) => issue.severity !== 'critical'),
    score,
    issues,
    recommendations: options.recommendations ?? [],
    metadata: options.metadata
  };
};

export interface AuditReportOptions {
  title?: string;
  issues?: AuditIssue[];
  recommendations?: string[];
  sections?: AuditReportSection[];
  generatedBy?: string;
}

export const createAuditReport = (options: AuditReportOptions = {}): AuditReport => {
  const issues = options.issues ?? [];
  const stats = analyseIssues(issues);
  const score = calculateScore(issues);

  const defaultSection: AuditReportSection = {
    title: options.title ?? 'Security Audit Summary',
    issues,
    recommendations: options.recommendations
  };

  return {
    id: `report-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    generatedBy: options.generatedBy,
    summary: {
      score,
      passed: score >= 80 && stats.critical === 0,
      totalIssues: stats.total,
      critical: stats.critical,
      high: stats.high,
      medium: stats.medium,
      low: stats.low
    },
    sections: options.sections?.length ? options.sections : [defaultSection]
  };
};

export interface AuditLogEntry {
  event: AuditEvent;
  error?: SerializedError;
  meta?: Record<string, unknown>;
}

export const buildAuditLogEntry = (
  event: AuditEvent,
  error?: SerializedError,
  meta?: Record<string, unknown>
): AuditLogEntry => ({
  event,
  error,
  meta
});

export const summarizeAudit = (result: AuditResult): string => {
  const line = (label: string, value: string | number) => `${label}: ${value}\n`;
  let summary = `Security Audit Result (${result.id})\n`;
  summary += line('Timestamp', result.timestamp);
  summary += line('Score', result.score);
  summary += line('Passed', result.passed ? 'Yes' : 'No');
  summary += line('Issues', result.issues.length);

  if (result.issues.length > 0) {
    summary += '\nTop Issues:\n';
    result.issues.slice(0, 5).forEach((issue) => {
      summary += `- [${issue.severity.toUpperCase()}] ${issue.title}\n`;
    });
  }

  if (result.recommendations.length > 0) {
    summary += '\nRecommendations:\n';
    result.recommendations.slice(0, 5).forEach((rec) => {
      summary += `- ${rec}\n`;
    });
  }

  return summary;
};

export const sanitizeAuditDetails = (details: unknown, maxLength = 500): string => {
  return createSafeSummary(details, maxLength);
};


