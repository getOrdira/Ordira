/**
 * Security Validation Middleware
 *
 * Provides comprehensive input validation and security checks for API endpoints.
 * Implements OWASP security best practices for input validation.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

export interface SecurityValidationOptions {
  sanitizeBody?: boolean;
  sanitizeQuery?: boolean;
  sanitizeParams?: boolean;
  maxBodySize?: number;
}

export interface SecurityEvent {
  type: 'validation_failure' | 'injection_attempt' | 'suspicious_input' | 'rate_limit_exceeded';
  ip: string;
  userAgent: string;
  path: string;
  payload?: any;
  timestamp: Date;
}

/**
 * Security validation middleware class
 */
export class SecurityValidationMiddleware {
  private suspiciousIPs: Map<string, { count: number; lastSeen: Date }> = new Map();
  private readonly maxSuspiciousEvents = 5;
  private readonly suspiciousWindowMs = 15 * 60 * 1000; // 15 minutes

  /**
   * Log security event
   */
  private logSecurityEvent(event: SecurityEvent): void {
    // Sanitize event data for logging
    const sanitizedEvent = {
      type: event.type,
      ip: event.ip,
      userAgent: event.userAgent ? event.userAgent.substring(0, 200) : 'unknown',
      path: event.path,
      timestamp: event.timestamp.toISOString()
    };

    logger.warn('Security event detected:', sanitizedEvent);

    // Track suspicious IPs
    const ipData = this.suspiciousIPs.get(event.ip) || { count: 0, lastSeen: new Date() };
    ipData.count++;
    ipData.lastSeen = new Date();
    this.suspiciousIPs.set(event.ip, ipData);

    // Clean old entries
    this.cleanupSuspiciousIPs();
  }

  /**
   * Clean up old suspicious IP entries
   */
  private cleanupSuspiciousIPs(): void {
    const now = new Date();
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (now.getTime() - data.lastSeen.getTime() > this.suspiciousWindowMs) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  /**
   * Check if IP is suspicious
   */
  private isSuspiciousIP(ip: string): boolean {
    const ipData = this.suspiciousIPs.get(ip);
    if (!ipData) return false;

    const isRecent = new Date().getTime() - ipData.lastSeen.getTime() <= this.suspiciousWindowMs;
    return isRecent && ipData.count >= this.maxSuspiciousEvents;
  }

  /**
   * Check for suspicious patterns that might indicate injection attempts
   */
  private containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(\b(UNION|JOIN|WHERE|HAVING|GROUP BY|ORDER BY)\b)/i,
      /(--|#|\/\*|\*\/)/,

      // NoSQL injection patterns
      /(\$where|\$regex|\$ne|\$gt|\$lt|\$in|\$nin)/i,

      // Script injection patterns
      /<script[^>]*>.*?<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,

      // Command injection patterns
      /[;&|`$(){}[\]]/,
      /\b(wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/i,

      // Path traversal patterns
      /\.\.[\/\\]/,
      /(\/etc\/passwd|\/etc\/shadow|\/windows\/system32)/i,

      // LDAP injection patterns
      /[\(\)\*&|!]/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Create input validation middleware
   */
  public createValidationMiddleware(options: SecurityValidationOptions = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

        if (this.isSuspiciousIP(clientIP)) {
          this.logSecurityEvent({
            type: 'suspicious_input',
            ip: clientIP,
            userAgent: (() => {
              const userAgent = req.get('User-Agent');
              return Array.isArray(userAgent) ? userAgent[0] : userAgent || '';
            })(),
            path: req.path,
            timestamp: new Date()
          });

          return res.status(429).json({
            error: 'Request blocked due to suspicious activity',
            code: 'SUSPICIOUS_IP'
          });
        }

        if (options.sanitizeBody !== false) {
          req.body = mongoSanitize.sanitize(req.body);
        }
        if (options.sanitizeQuery !== false) {
          req.query = mongoSanitize.sanitize(req.query);
        }
        if (options.sanitizeParams !== false) {
          req.params = mongoSanitize.sanitize(req.params);
        }

        const bodySize = JSON.stringify(req.body || {}).length;
        if (bodySize > (options.maxBodySize || 10000)) {
          throw new Error('Request body too large');
        }

        const suspicious: string[] = [];
        this.collectSuspiciousPatterns((req as any).validatedBody ?? req.body, 'body', suspicious);
        this.collectSuspiciousPatterns((req as any).validatedQuery ?? req.query, 'query', suspicious);
        this.collectSuspiciousPatterns((req as any).validatedParams ?? req.params, 'params', suspicious);

        if (suspicious.length > 0) {
          this.logSecurityEvent({
            type: 'suspicious_input',
            ip: clientIP,
            userAgent: (() => {
              const userAgent = req.get('User-Agent');
              return Array.isArray(userAgent) ? userAgent[0] : userAgent || '';
            })(),
            path: req.path,
            payload: suspicious,
            timestamp: new Date()
          });

          return res.status(400).json({
            error: 'Potentially malicious input detected',
            details: suspicious,
            code: 'SUSPICIOUS_INPUT'
          });
        }

        next();

      } catch (error) {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

        this.logSecurityEvent({
          type: 'validation_failure',
          ip: clientIP,
          userAgent: (() => {
            const userAgent = req.get('User-Agent');
            return Array.isArray(userAgent) ? userAgent[0] : userAgent || '';
          })(),
          path: req.path,
          timestamp: new Date()
        });

        res.status(400).json({
          error: 'Invalid input data',
          message: error instanceof Error ? error.message : 'Validation failed'
        });
      }
    };
  }

  private collectSuspiciousPatterns(value: any, path: string, accumulator: string[], depth: number = 0): void {
    if (value === null || value === undefined || depth > 5) {
      return;
    }

    if (typeof value === 'string') {
      if (value.length > 1000) {
        accumulator.push(`${path} exceeds maximum length`);
      }

      if (this.containsSuspiciousPatterns(value)) {
        accumulator.push(`${path} contains suspicious content`);
      }
      return;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        accumulator.push(`${path} contains invalid numeric value`);
      }
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 100) {
        accumulator.push(`${path} array exceeds maximum allowed size`);
      }

      value.forEach((item, index) =>
        this.collectSuspiciousPatterns(item, `${path}[${index}]`, accumulator, depth + 1)
      );
      return;
    }

    if (typeof value === 'boolean') {
      return;
    }

    if (typeof value === 'object') {
      for (const [key, nestedValue] of Object.entries(value)) {
        this.collectSuspiciousPatterns(nestedValue, `${path}.${key}`, accumulator, depth + 1);
      }
    }
  }

  /**
   * Create security headers middleware
   */
  public createSecurityHeadersMiddleware() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * Create rate limiting middleware
   */
  public createRateLimitMiddleware(options: {
    windowMs?: number;
    max?: number;
    skipSuccessfulRequests?: boolean;
  } = {}) {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100, // limit each IP to 100 requests per windowMs
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

        this.logSecurityEvent({
          type: 'rate_limit_exceeded',
          ip: clientIP,
          userAgent: (() => {
            const userAgent = req.get('User-Agent');
            return Array.isArray(userAgent) ? userAgent[0] : userAgent || '';
          })(),
          path: req.path,
          timestamp: new Date()
        });

        res.status(429).json({
          error: 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
        });
      }
    });
  }

  /**
   * Create slow down middleware for progressive delays
   */
  public createSlowDownMiddleware(options: {
    windowMs?: number;
    delayAfter?: number;
    delayMs?: number;
  } = {}): any {
    return slowDown({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      delayAfter: options.delayAfter || 50, // allow 50 requests per 15 minutes, then...
      delayMs: options.delayMs || 500 // begin adding 500ms of delay per request above 50
    });
  }

  /**
   * Get security statistics
   */
  public getSecurityStats() {
    return {
      suspiciousIPs: this.suspiciousIPs.size,
      totalSuspiciousEvents: Array.from(this.suspiciousIPs.values())
        .reduce((sum, data) => sum + data.count, 0),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear security data (for testing)
   */
  public clearSecurityData(): void {
    this.suspiciousIPs.clear();
  }
}

// Singleton instance
export const securityValidationMiddleware = new SecurityValidationMiddleware();

// Convenience functions for common use cases
export const validateJSON = (options?: SecurityValidationOptions) =>
  securityValidationMiddleware.createValidationMiddleware(options);

export const securityHeaders = () =>
  securityValidationMiddleware.createSecurityHeadersMiddleware();

export const apiRateLimit = (options?: { windowMs?: number; max?: number }) =>
  securityValidationMiddleware.createRateLimitMiddleware(options);

export const progressiveSlowDown = (options?: { windowMs?: number; delayAfter?: number; delayMs?: number }) =>
  securityValidationMiddleware.createSlowDownMiddleware(options);

