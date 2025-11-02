// src/utils/errorResponse.util.ts
/**
 * @deprecated Use imports from services/infrastructure/http instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 * 
 * Note: This was merged with responseUtils into http/core/response.service.ts
 */

export {
  StandardErrorResponse,
  StandardSuccessResponse,
  ErrorCodes,
  createErrorResponse,
  createSuccessResponse,
  sendErrorResponse,
  sendSuccessResponse,
  createStandardError,
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError
} from '../services/infrastructure/http/core/response.service';
