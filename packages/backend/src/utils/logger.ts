// src/utils/logger.ts
import { Request, Response } from 'express';
import { sanitizeObject, sanitizeString, sanitizeError, sanitizeRequestData, createSafeSummary } from './dataSanitizer';

// ===== TYPE DEFINITIONS =====

// Extended Error interface for custom error properties
interface ExtendedError extends Error {
  code?: string | number;
  statusCode?: number;
}

// Extended Request interface for custom request properties
interface ExtendedRequest extends Request {
  userId?: string;
  businessId?: string;
  tenant?: {
    business?: {
      toString(): string;
    };
  };
}

// ===== LOG LEVELS =====
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

// ===== LOG CONTEXT INTERFACES =====
export interface LogContext {
  userId?: string;
  businessId?: string;
  tenantId?: string;
  requestId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  event?: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  service: string;
  version: string;
  environment: string;
}

// ===== LOGGER CLASS =====
class StructuredLogger {
  private service: string;
  private version: string;
  private environment: string;

  constructor() {
    this.service = 'b2b-backend';
    this.version = process.env.npm_package_version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }

  // ===== CORE LOGGING METHODS =====

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizeString(message),
      context: context ? sanitizeObject(context) : undefined,
      service: this.service,
      version: this.version,
      environment: this.environment
    };

    // Add error details if provided
    if (error) {
      const sanitizedError = sanitizeError(error);
      logEntry.error = {
        name: sanitizedError.name,
        message: sanitizedError.message,
        stack: sanitizedError.stack,
        code: sanitizedError.code || sanitizedError.statusCode
      };
    }

    // Output in JSON format for production, pretty format for development
    if (this.environment === 'development') {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    if (this.environment === 'development' || process.env.DEBUG_LOGS === 'true') {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  trace(message: string, context?: LogContext): void {
    if (this.environment === 'development' || process.env.TRACE_LOGS === 'true') {
      this.log(LogLevel.TRACE, message, context);
    }
  }

  // ===== REQUEST/RESPONSE LOGGING =====

  logRequest(req: Request, context?: LogContext): void {
    const sanitizedReq = sanitizeRequestData({
      method: req.method,
      endpoint: req.path,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
      headers: req.headers,
      body: req.body
    });

    this.info('HTTP Request', {
      ...context,
      ...sanitizedReq
    });
  }

  logResponse(req: Request, res: Response, duration: number, context?: LogContext): void {
    const level = res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, 'HTTP Response', {
      ...context,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      duration,
      requestId: req.headers['x-request-id'] as string
    });
  }

  // ===== BUSINESS EVENT LOGGING =====

  logAuthEvent(event: string, context?: LogContext): void {
    this.info(`Auth Event: ${event}`, {
      ...context,
      event: `auth.${event.toLowerCase().replace(/\s+/g, '.')}`
    });
  }

  logBusinessEvent(event: string, context?: LogContext): void {
    this.info(`Business Event: ${event}`, {
      ...context,
      event: `business.${event.toLowerCase().replace(/\s+/g, '.')}`
    });
  }

  logApiEvent(event: string, context?: LogContext): void {
    this.info(`API Event: ${event}`, {
      ...context,
      event: `api.${event.toLowerCase().replace(/\s+/g, '.')}`
    });
  }

  logSecurityEvent(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      event: `security.${event.toLowerCase().replace(/\s+/g, '.')}`
    });
  }

  // ===== PERFORMANCE LOGGING =====

  logPerformance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Performance: ${operation}`, {
      ...context,
      event: 'performance.operation',
      duration,
      operation
    });
  }

  // ===== DATABASE LOGGING =====

  logDatabaseOperation(operation: string, collection: string, duration: number, context?: LogContext): void {
    this.debug(`Database ${operation}`, {
      ...context,
      event: 'database.operation',
      operation,
      collection,
      duration
    });
  }

  // ===== ERROR LOGGING WITH CONTEXT =====

  logError(error: Error, context?: LogContext): void {
    this.error('Application Error', context, error);
  }

  logValidationError(field: string, value: any, context?: LogContext): void {
    this.warn('Validation Error', {
      ...context,
      event: 'validation.error',
      field: sanitizeString(field),
      value: createSafeSummary(value, 100) // Safe truncation with sanitization
    });
  }

  // ===== UTILITY METHODS =====

  createContext(req?: Request): LogContext {
    if (!req) return {};

    const extendedReq = req as ExtendedRequest;
    return {
      requestId: req.headers['x-request-id'] as string,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.path,
      method: req.method,
      userId: extendedReq.userId,
      businessId: extendedReq.businessId,
      tenantId: extendedReq.tenant?.business?.toString()
    };
  }

  /**
   * Log with automatic sanitization of sensitive data
   */
  logSafe(level: LogLevel, message: string, data?: any, context?: LogContext): void {
    const sanitizedData = data ? sanitizeObject(data) : undefined;
    const logContext = {
      ...context,
      ...(sanitizedData && { data: sanitizedData })
    };
    
    this.log(level, message, logContext);
  }

  /**
   * Log configuration data safely (for config service)
   */
  logConfigSafe(message: string, configData?: any, context?: LogContext): void {
    const sanitizedConfig = configData ? sanitizeObject(configData) : undefined;
    const logContext = {
      ...context,
      ...(sanitizedConfig && { config: sanitizedConfig })
    };
    
    this.info(message, logContext);
  }

  // ===== BATCH LOGGING =====

  logBatch(level: LogLevel, messages: Array<{ message: string; context?: LogContext }>): void {
    messages.forEach(({ message, context }) => {
      this.log(level, message, context);
    });
  }
}

// ===== SINGLETON INSTANCE =====
export const logger = new StructuredLogger();

// ===== CONVENIENCE FUNCTIONS =====
export const logError = (error: Error, context?: LogContext) => logger.logError(error, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);

// ===== SAFE LOGGING CONVENIENCE FUNCTIONS =====
export const logSafe = (level: LogLevel, message: string, data?: any, context?: LogContext) => 
  logger.logSafe(level, message, data, context);
export const logSafeInfo = (message: string, data?: any, context?: LogContext) => 
  logger.logSafe(LogLevel.INFO, message, data, context);
export const logSafeWarn = (message: string, data?: any, context?: LogContext) => 
  logger.logSafe(LogLevel.WARN, message, data, context);
export const logSafeError = (message: string, data?: any, context?: LogContext) => 
  logger.logSafe(LogLevel.ERROR, message, data, context);
export const logConfigSafe = (message: string, configData?: any, context?: LogContext) => 
  logger.logConfigSafe(message, configData, context);

// ===== REQUEST LOGGING MIDDLEWARE =====
export const requestLoggingMiddleware = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  const context = logger.createContext(req);

  // Log incoming request
  logger.logRequest(req, context);

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    logger.logResponse(req, res, duration, context);
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// ===== PERFORMANCE TIMER =====
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private context?: LogContext;

  constructor(operation: string, context?: LogContext) {
    this.operation = operation;
    this.context = context;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    logger.logPerformance(this.operation, duration, this.context);
    return duration;
  }
}

// ===== ASYNC WRAPPER FOR ERROR LOGGING =====
export const withErrorLogging = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: LogContext
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.logError(error as Error, context);
      throw error;
    }
  };
};
