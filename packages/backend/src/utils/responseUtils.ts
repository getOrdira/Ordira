// src/utils/responseUtils.ts
import { Response } from 'express';

/**
 * Standardized API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Send standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  requestId?: string
): void {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  };

  res.status(statusCode).json(response);
}

/**
 * Send standardized error response
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string,
  details?: any,
  requestId?: string
): void {
  const response: ErrorResponse = {
    success: false,
    error,
    code,
    details,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  };

  res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: any,
  requestId?: string
): void {
  sendError(res, message, 400, 'VALIDATION_ERROR', details, requestId);
}

/**
 * Send unauthorized error response
 */
export function sendUnauthorizedError(
  res: Response,
  message: string = 'Unauthorized',
  requestId?: string
): void {
  sendError(res, message, 401, 'UNAUTHORIZED', undefined, requestId);
}

/**
 * Send forbidden error response
 */
export function sendForbiddenError(
  res: Response,
  message: string = 'Forbidden',
  requestId?: string
): void {
  sendError(res, message, 403, 'FORBIDDEN', undefined, requestId);
}

/**
 * Send not found error response
 */
export function sendNotFoundError(
  res: Response,
  resource: string = 'Resource',
  requestId?: string
): void {
  sendError(res, `${resource} not found`, 404, 'NOT_FOUND', undefined, requestId);
}

/**
 * Send conflict error response
 */
export function sendConflictError(
  res: Response,
  message: string,
  details?: any,
  requestId?: string
): void {
  sendError(res, message, 409, 'CONFLICT', details, requestId);
}

/**
 * Send rate limit error response
 */
export function sendRateLimitError(
  res: Response,
  message: string = 'Too many requests',
  requestId?: string
): void {
  sendError(res, message, 429, 'RATE_LIMIT_EXCEEDED', undefined, requestId);
}

/**
 * Send internal server error response
 */
export function sendInternalError(
  res: Response,
  message: string = 'Internal server error',
  requestId?: string
): void {
  sendError(res, message, 500, 'INTERNAL_ERROR', undefined, requestId);
}

/**
 * Send created response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string,
  requestId?: string
): void {
  sendSuccess(res, data, message, 201, requestId);
}

/**
 * Send accepted response (202)
 */
export function sendAccepted<T>(
  res: Response,
  data?: T,
  message?: string,
  requestId?: string
): void {
  sendSuccess(res, data, message, 202, requestId);
}

/**
 * Send no content response (204)
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message?: string,
  requestId?: string
): void {
  const response: SuccessResponse<{
    items: T[];
    pagination: typeof pagination;
  }> = {
    success: true,
    message,
    data: {
      items: data,
      pagination
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  };

  res.status(200).json(response);
}

/**
 * Send file download response
 */
export function sendFileDownload(
  res: Response,
  filePath: string,
  fileName: string,
  contentType: string = 'application/octet-stream'
): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.download(filePath, fileName);
}

/**
 * Send streaming response
 */
export function sendStreaming(
  res: Response,
  contentType: string = 'application/json'
): Response {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Transfer-Encoding', 'chunked');
  return res;
}

/**
 * Response helper class for more complex scenarios
 */
export class ResponseHelper {
  private requestId: string;
  private res: Response;

  constructor(res: Response, requestId?: string) {
    this.res = res;
    this.requestId = requestId || generateRequestId();
  }

  success<T>(data?: T, message?: string, statusCode: number = 200): void {
    sendSuccess(this.res, data, message, statusCode, this.requestId);
  }

  error(error: string, statusCode: number = 500, code?: string, details?: any): void {
    sendError(this.res, error, statusCode, code, details, this.requestId);
  }

  validationError(message: string, details?: any): void {
    sendValidationError(this.res, message, details, this.requestId);
  }

  unauthorized(message: string = 'Unauthorized'): void {
    sendUnauthorizedError(this.res, message, this.requestId);
  }

  forbidden(message: string = 'Forbidden'): void {
    sendForbiddenError(this.res, message, this.requestId);
  }

  notFound(resource: string = 'Resource'): void {
    sendNotFoundError(this.res, resource, this.requestId);
  }

  conflict(message: string, details?: any): void {
    sendConflictError(this.res, message, details, this.requestId);
  }

  rateLimit(message: string = 'Too many requests'): void {
    sendRateLimitError(this.res, message, this.requestId);
  }

  internalError(message: string = 'Internal server error'): void {
    sendInternalError(this.res, message, this.requestId);
  }

  created<T>(data: T, message?: string): void {
    sendCreated(this.res, data, message, this.requestId);
  }

  accepted<T>(data?: T, message?: string): void {
    sendAccepted(this.res, data, message, this.requestId);
  }

  noContent(): void {
    sendNoContent(this.res);
  }

  paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    message?: string
  ): void {
    sendPaginated(this.res, data, pagination, message, this.requestId);
  }

  getRequestId(): string {
    return this.requestId;
  }
}

/**
 * Middleware to add response helper to request object
 */
export function responseHelperMiddleware(req: any, res: Response, next: any): void {
  req.responseHelper = new ResponseHelper(res);
  next();
}

/**
 * Sanitize error details for production
 */
export function sanitizeErrorDetails(details: any, isProduction: boolean = false): any {
  if (!isProduction) {
    return details;
  }

  // Remove sensitive information in production
  if (typeof details === 'object' && details !== null) {
    const sanitized = { ...details };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'apiKey', 'privateKey'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  return details;
}

/**
 * Create standardized error response from AppError
 */
export function createErrorResponse(
  error: any,
  requestId?: string,
  isProduction: boolean = false
): ErrorResponse {
  const sanitizedDetails = sanitizeErrorDetails(error.details, isProduction);

  return {
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    details: sanitizedDetails,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  };
}
