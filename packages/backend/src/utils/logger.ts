// src/utils/logger.ts
/**
 * @deprecated Use imports from services/infrastructure/logging instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 */

export {
  logger,
  logError,
  logInfo,
  logWarn,
  logDebug,
  LogLevel,
  LogContext,
  StructuredLog,
  PerformanceTimer,
  withErrorLogging,
  requestLoggingMiddleware,
  logSafe,
  logSafeInfo,
  logSafeWarn,
  logSafeError,
  logConfigSafe
} from '../services/infrastructure/logging';
