// src/utils/index.ts
/**
 * Backward Compatibility Shim
 *
 * This file provides backward compatibility for existing imports
 * from the utils folder. All utilities have been migrated to
 * /services/infrastructure/ following the modular architecture.
 *
 * @deprecated Use imports from services/infrastructure/ instead
 */

// Re-export logging utilities for backward compatibility
export { logger, logError, logInfo, logWarn, logDebug, LogLevel, LogContext, StructuredLog, PerformanceTimer, withErrorLogging, requestLoggingMiddleware, logSafe, logSafeInfo, logSafeWarn, logSafeError, logConfigSafe } from '../services/infrastructure/logging';
export * from '../services/infrastructure/logging/utils/dataSanitizer.util';

// Re-export HTTP utilities for backward compatibility
export * from '../services/infrastructure/http/core/response.service';
export * from '../services/infrastructure/http/features/routeHelpers.service';

// Re-export error utilities for backward compatibility
export * from '../services/infrastructure/errors/core/errorExtractor.service';
export * from '../services/infrastructure/errors/features/errorHandler.service';
export * from '../services/infrastructure/errors/utils/errorTypes';

// Re-export type utilities for backward compatibility
export * from '../services/infrastructure/types/core/typeGuards.service';
export * from '../services/infrastructure/types/features/requestGuards.service';
export * from '../services/infrastructure/types/features/domainGuards.service';
export * from '../services/infrastructure/types/utils/fileTypes';

