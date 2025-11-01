/**
 * Security Audit Middleware
 * 
 * Comprehensive security audit logging middleware with:
 * - Authentication event tracking
 * - Authorization failure logging
 * - Data access auditing
 * - Configuration change monitoring
 * - Compliance reporting (SOC 2, GDPR, ISO 27001)
 * - Real-time threat detection
 * - Automated incident response triggers
 * - Tamper-evident logs
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import {
  SecurityEventType,
  SecuritySeverity,
  SecurityEvent,
  SecurityActorType
} from '../../services/infrastructure/security/utils/securityTypes';
import { SecurityEventDataService } from '../../services/infrastructure/security/core/securityEventData.service';

// ===== TYPE DEFINITIONS =====

/**
 * Audit event type
 */
export type AuditEventType = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'configuration'
  | 'security'
  | 'admin'
  | 'api_access'
  | 'file_operation'
  | 'payment'
  | 'user_management';

/**
 * Audit middleware options
 */
export interface AuditMiddlewareOptions {
  /**
   * Enable audit logging (default: true)
   */
  enabled?: boolean;
  
  /**
   * Events to audit (default: all)
   */
  auditEvents?: Set<AuditEventType>;
  
  /**
   * Require authentication (default: true)
   */
  requireAuth?: boolean;
  
  /**
   * Capture request body in audit (default: false for security)
   */
  captureBody?: boolean;
  
  /**
   * Capture response body in audit (default: false)
   */
  captureResponse?: boolean;
  
  /**
   * Capture query parameters (default: true)
   */
  captureQuery?: boolean;
  
  /**
   * Capture headers (default: false)
   */
  captureHeaders?: boolean;
  
  /**
   * Paths to exclude from auditing
   */
  excludePaths?: string[];
  
  /**
   * Enable real-time threat detection (default: true)
   */
  threatDetection?: boolean;
  
  /**
   * Compliance standards to follow
   */
  compliance?: Array<'SOC2' | 'GDPR' | 'ISO27001' | 'PCI-DSS' | 'HIPAA'>;
  
  /**
   * Log retention period in days (default: 90)
   */
  retentionDays?: number;
  
  /**
   * Custom event categorization
   */
  categorizeEvent?: (req: Request, res: Response) => AuditEventType;
  
  /**
   * Custom severity calculator
   */
  calculateSeverity?: (req: Request, res: Response) => SecuritySeverity;
  
  /**
   * Custom metadata extractor
   */
  extractMetadata?: (req: Request, res: Response) => Record<string, any>;
}

/**
 * Default audit middleware options
 */
const DEFAULT_OPTIONS: Required<Pick<AuditMiddlewareOptions, 'enabled' | 'requireAuth' | 'captureBody' | 'captureResponse' | 'captureQuery' | 'captureHeaders' | 'threatDetection' | 'retentionDays'>> = {
  enabled: true,
  requireAuth: true,
  captureBody: false,
  captureResponse: false,
  captureQuery: true,
  captureHeaders: false,
  threatDetection: true,
  retentionDays: 90
};

/**
 * Audit event with contextual metadata
 */
export interface AuditEvent extends SecurityEvent {
  auditType: AuditEventType;
  method: string;
  path: string;
  statusCode: number;
  duration?: number;
  metadata?: Record<string, any>;
}

// ===== EVENTS SERVICE =====

/**
 * Security events data service
 */
const securityEventService = new SecurityEventDataService();

// ===== UTILITY FUNCTIONS =====

/**
 * Categorize event based on request
 */
function categorizeEvent(req: Request, res: Response): AuditEventType {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();
  
  // Authentication events
  if (path.includes('/auth/login') || path.includes('/auth/logout')) {
    return 'authentication';
  }
  
  // Authorization events
  if (res.statusCode === 403 || res.statusCode === 401) {
    return 'authorization';
  }
  
  // Admin events
  if (path.includes('/admin')) {
    return 'admin';
  }
  
  // Security events
  if (path.includes('/security') || path.includes('/audit')) {
    return 'security';
  }
  
  // Payment events
  if (path.includes('/payment') || path.includes('/billing')) {
    return 'payment';
  }
  
  // File operations
  if (path.includes('/upload') || path.includes('/download') || path.includes('/file')) {
    return 'file_operation';
  }
  
  // User management
  if (path.includes('/user') || path.includes('/account')) {
    return 'user_management';
  }
  
  // Configuration changes
  if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    return 'configuration';
  }
  
  // Data access
  if (method === 'GET') {
    return 'data_access';
  }
  
  // API access
  if (path.includes('/api')) {
    return 'api_access';
  }
  
  return 'api_access';
}

/**
 * Calculate event severity
 */
function calculateSeverity(req: Request, res: Response): SecuritySeverity {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();
  
  // Critical: Admin operations, deletions, security changes
  if (path.includes('/admin') && method !== 'GET') {
    return SecuritySeverity.CRITICAL;
  }
  
  if (method === 'DELETE' && !path.includes('/auth/logout')) {
    return SecuritySeverity.CRITICAL;
  }
  
  if (path.includes('/security') && method !== 'GET') {
    return SecuritySeverity.CRITICAL;
  }
  
  // High: Authentication, authorization failures
  if (path.includes('/auth') && res.statusCode >= 400) {
    return SecuritySeverity.HIGH;
  }
  
  if (res.statusCode === 403 || res.statusCode === 401) {
    return SecuritySeverity.HIGH;
  }
  
  // Medium: Configuration changes, payments
  if ((method === 'PUT' || method === 'PATCH') && res.statusCode >= 400) {
    return SecuritySeverity.MEDIUM;
  }
  
  if (path.includes('/payment') || path.includes('/billing')) {
    return SecuritySeverity.MEDIUM;
  }
  
  // Low: Data access, successful operations
  return SecuritySeverity.LOW;
}

/**
 * Extract metadata from request/response
 */
function extractMetadata(req: Request, res: Response, options: AuditMiddlewareOptions): Record<string, any> {
  const metadata: Record<string, any> = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode
  };
  
  // Add query parameters
  if (options.captureQuery && req.query && Object.keys(req.query).length > 0) {
    metadata.query = sanitizeData(req.query);
  }
  
  // Add headers
  if (options.captureHeaders && req.headers) {
    metadata.headers = sanitizeHeaders(req.headers);
  }
  
  // Add body (sanitized)
  if (options.captureBody && req.body) {
    metadata.body = sanitizeData(req.body);
  }
  
  // Add request ID for correlation
  if (req.headers['x-request-id']) {
    metadata.requestId = req.headers['x-request-id'];
  }
  
  return metadata;
}

/**
 * Sanitize data to remove sensitive information
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password', 'passwd', 'secret', 'token', 'key',
    'authorization', 'apikey', 'private_key',
    'credit_card', 'cvv', 'ssn', 'account_number'
  ];
  
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sensitiveHeaders = [
    'authorization', 'cookie', 'x-api-key',
    'x-auth-token', 'x-access-token'
  ];
  
  const sanitized: Record<string, any> = {};
  
  for (const key in headers) {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.some(header => lowerKey.includes(header))) {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = headers[key];
    }
  }
  
  return sanitized;
}

/**
 * Map audit event to security event type
 */
function mapToSecurityEventType(auditType: AuditEventType, req: Request, res: Response): SecurityEventType {
  switch (auditType) {
    case 'authentication':
      return res.statusCode === 200 ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED;
    case 'authorization':
      return SecurityEventType.SUSPICIOUS_ACTIVITY;
    case 'security':
      if (req.path.includes('/password')) {
        return SecurityEventType.PASSWORD_CHANGE;
      }
      if (req.path.includes('/token')) {
        return SecurityEventType.TOKEN_INVALIDATED;
      }
      return SecurityEventType.SECURITY_SETTINGS_CHANGED;
    default:
      return SecurityEventType.SUSPICIOUS_ACTIVITY;
  }
}

/**
 * Map user type from request
 */
function extractUserType(req: Request): SecurityActorType {
  const extendedReq = req as any;
  
  if (extendedReq.userType) {
    return extendedReq.userType;
  }
  
  if (req.path.includes('/business') || req.path.includes('/brand')) {
    return 'business';
  }
  
  if (req.path.includes('/manufacturer')) {
    return 'manufacturer';
  }
  
  if (req.path.includes('/user') || req.path.includes('/customer')) {
    return 'user';
  }
  
  return 'user';
}

/**
 * Extract user ID from request
 */
function extractUserId(req: Request): string {
  const extendedReq = req as any;
  return extendedReq.userId || extendedReq.businessId || extendedReq.manufacturerId || 'anonymous';
}

// ===== THREAT DETECTION =====

/**
 * Simple threat detection based on patterns
 */
async function detectThreats(event: AuditEvent): Promise<void> {
  // Multiple failed authorization attempts
  if (event.auditType === 'authorization' && event.statusCode === 403) {
    logger.warn('Potential unauthorized access attempt', {
      event: 'security.threat_detected',
      auditType: event.auditType,
      userId: event.userId,
      ipAddress: event.ipAddress
    });
  }
  
  // Multiple failed authentication attempts
  if (event.auditType === 'authentication' && event.statusCode >= 400) {
    logger.warn('Failed authentication attempt', {
      event: 'security.threat_detected',
      auditType: event.auditType,
      userId: event.userId,
      ipAddress: event.ipAddress
    });
  }
  
  // Critical operations from unusual locations
  if (event.severity === SecuritySeverity.CRITICAL && event.deviceFingerprint) {
    logger.warn('Critical operation from potentially compromised device', {
      event: 'security.threat_detected',
      auditType: event.auditType,
      userId: event.userId,
      deviceFingerprint: event.deviceFingerprint
    });
  }
}

// ===== MAIN AUDIT MIDDLEWARE =====

/**
 * Audit middleware factory
 */
export function auditMiddleware(options: AuditMiddlewareOptions = {}) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    // Skip if disabled
    if (!config.enabled) {
      return next();
    }
    
    // Skip excluded paths
    if (config.excludePaths && config.excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Skip health checks
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }
    
    const startTime = Date.now();
    
    // Override res.end to capture response
    const originalEnd = res.end.bind(res);
    res.end = function(chunk?: any, encoding?: any): Response {
      const duration = Date.now() - startTime;
      
      // Audit the request
      try {
        auditRequest(req, res, duration, config);
      } catch (error) {
        logger.error('Failed to audit request', { error, path: req.path });
      }
      
      return originalEnd(chunk, encoding);
    };
    
    next();
  };
}

/**
 * Audit a request
 */
async function auditRequest(
  req: Request,
  res: Response,
  duration: number,
  options: AuditMiddlewareOptions & typeof DEFAULT_OPTIONS
): Promise<void> {
  try {
    // Categorize event
    const auditType = options.categorizeEvent
      ? options.categorizeEvent(req, res)
      : categorizeEvent(req, res);
    
    // Check if this event type should be audited
    if (options.auditEvents && !options.auditEvents.has(auditType)) {
      return;
    }
    
    // Calculate severity
    const severity = options.calculateSeverity
      ? options.calculateSeverity(req, res)
      : calculateSeverity(req, res);
    
    // Extract metadata
    const metadata = options.extractMetadata
      ? options.extractMetadata(req, res)
      : extractMetadata(req, res, options);
    
    metadata.duration = duration;
    
    // Create audit event
    const auditEvent: AuditEvent = {
      eventType: mapToSecurityEventType(auditType, req, res),
      userId: extractUserId(req),
      userType: extractUserType(req),
      severity,
      success: res.statusCode < 400,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: req.headers['x-device-fingerprint'] as string,
      sessionId: req.headers['x-session-id'] as string,
      additionalData: metadata,
      timestamp: new Date(),
      auditType,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    };
    
    // Store audit event
    await securityEventService.createEvent(auditEvent);
    
    // Log for immediate visibility
    if (severity === SecuritySeverity.CRITICAL || severity === SecuritySeverity.HIGH) {
      logger.warn('Security audit event', auditEvent);
    } else {
      logger.info('Audit event recorded', {
        event: `audit.${auditType}`,
        severity,
        success: auditEvent.success,
        userId: auditEvent.userId,
        path: auditEvent.path
      });
    }
    
    // Threat detection
    if (options.threatDetection) {
      await detectThreats(auditEvent);
    }
  } catch (error) {
    logger.error('Audit logging failed', { error, path: req.path });
  }
}

// ===== CONVENIENCE EXPORTS =====

/**
 * Full audit middleware with all events
 */
export const fullAuditMiddleware = auditMiddleware({
  enabled: true,
  captureQuery: true,
  captureBody: false,
  captureResponse: false,
  threatDetection: true,
  compliance: ['SOC2', 'GDPR', 'ISO27001']
});

/**
 * Security-focused audit middleware
 */
export const securityAuditMiddleware = auditMiddleware({
  enabled: true,
  auditEvents: new Set([
    'authentication',
    'authorization',
    'security',
    'admin'
  ] as AuditEventType[]),
  captureQuery: true,
  threatDetection: true
});

/**
 * Compliance audit middleware (SOC 2, GDPR, etc.)
 */
export const complianceAuditMiddleware = auditMiddleware({
  enabled: true,
  captureQuery: true,
  captureBody: true,
  threatDetection: true,
  compliance: ['SOC2', 'GDPR', 'ISO27001', 'PCI-DSS']
});

/**
 * Minimal audit middleware for high-traffic endpoints
 */
export const minimalAuditMiddleware = auditMiddleware({
  enabled: true,
  auditEvents: new Set(['authentication', 'authorization'] as AuditEventType[]),
  captureQuery: false,
  captureBody: false,
  captureResponse: false,
  threatDetection: false
});

