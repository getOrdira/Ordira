// src/utils/responseUtils.ts
/**
 * @deprecated Use imports from services/infrastructure/http instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 * 
 * Note: This was merged with errorResponse into http/core/response.service.ts
 */

export {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  generateRequestId,
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorizedError,
  sendForbiddenError,
  sendNotFoundError,
  sendConflictError,
  sendRateLimitError,
  sendInternalError,
  sendCreated,
  sendAccepted,
  sendNoContent,
  sendPaginated,
  sendFileDownload,
  sendStreaming,
  ResponseHelper,
  responseHelperMiddleware,
  createErrorResponse as createErrorResponseFromAppError,
  // Also export merged error utilities
  StandardErrorResponse,
  StandardSuccessResponse,
  ErrorCodes,
  createStandardError,
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  sendErrorResponse,
  sendSuccessResponse
} from '../services/infrastructure/http/core/response.service';
