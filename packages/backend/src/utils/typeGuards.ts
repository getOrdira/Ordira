// src/utils/typeGuards.ts
/**
 * @deprecated Use imports from services/infrastructure/types instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 */

// Re-export core type guards
export {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isNullOrUndefined,
  isDefined,
  isObjectId,
  isEmail,
  isUrl,
  isDateString,
  isISODateString,
  isUUID,
  isHexColor,
  isStringArray,
  isNumberArray,
  isObjectArray,
  isNonEmptyArray,
  hasMongoDocumentProperties,
  hasCreatedAt,
  hasUpdatedAt,
  safeString,
  safeNumber,
  safeInteger,
  safeBoolean,
  safeDate,
  safeGet,
  safeArrayAccess,
  hasProperty,
  hasAllProperties,
  hasAnyProperty,
  getRequestBody,
  getRequestQuery,
  getRequestParams,
  getRequestHeaders,
  getRequestIp,
  getRequestHostname,
  getRequestPath,
  getRequestUrl
} from '../services/infrastructure/types/core/typeGuards.service';

// Re-export request guards
export {
  isUnifiedAuthRequest,
  hasValidatedBody,
  hasValidatedQuery,
  hasValidatedParams,
  hasTenantContext,
  hasUserId,
  hasBusinessId,
  hasPerformanceTracking,
  getRequestProps,
  reqProps,
  getValidatedBody,
  getValidatedQuery,
  getValidatedParams
} from '../services/infrastructure/types/features/requestGuards.service';

// Re-export domain guards
export {
  isApiKeyObject,
  hasPriority,
  hasViewCount,
  hasShopifyAccessToken,
  hasSupplyChainSettings,
  hasPagination,
  hasTimestamps
} from '../services/infrastructure/types/features/domainGuards.service';

// Re-export error type guards (from errors module for consistency)
export {
  isOperationalError as isOperationalErrorType,
  hasStatusCode as hasErrorStatusCode
} from '../services/infrastructure/errors/utils/errorTypes';

// hasErrorMessage type guard - recreated for backward compatibility
export function hasErrorMessage(error: unknown): error is { message: string } {
  return error !== null && typeof error === 'object' && 'message' in error;
}
