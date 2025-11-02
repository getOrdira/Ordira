// src/utils/errorUtils.service.ts
/**
 * @deprecated Use imports from services/infrastructure/errors instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 */

export {
  getErrorMessage,
  getErrorStack,
  getErrorCode,
  getErrorStatusCode,
  isError,
  hasErrorProperty,
  logError as logErrorWithContext,
  extractErrorInfo
} from '../services/infrastructure/errors/core/errorExtractor.service';
