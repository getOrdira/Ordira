// services/infrastructure/types/features/requestGuards.service.ts
import { Request } from 'express';
import { UnifiedAuthRequest } from '../../../../middleware/auth/unifiedAuth.middleware';
import {
  getRequestBody,
  getRequestQuery,
  getRequestParams,
  getRequestHeaders,
  getRequestIp,
  getRequestHostname,
  getRequestPath,
  getRequestUrl
} from '../core';

/**
 * Request type guards for Express requests
 */

/**
 * Type guard to check if request has UnifiedAuthRequest properties
 */
export function isUnifiedAuthRequest(req: Request): req is UnifiedAuthRequest {
  return 'userId' in req && 'userType' in req;
}

/**
 * Type guard to check if request has validated body
 */
export function hasValidatedBody(req: Request): req is Request & { validatedBody: any } {
  return 'validatedBody' in req && req.validatedBody !== undefined;
}

/**
 * Type guard to check if request has validated query
 */
export function hasValidatedQuery(req: Request): req is Request & { validatedQuery: any } {
  return 'validatedQuery' in req && req.validatedQuery !== undefined;
}

/**
 * Type guard to check if request has validated params
 */
export function hasValidatedParams(req: Request): req is Request & { validatedParams: any } {
  return 'validatedParams' in req && req.validatedParams !== undefined;
}

/**
 * Type guard to check if request has tenant context
 */
export function hasTenantContext(req: Request): req is Request & { tenant: { business: { toString: () => string } } } {
  return (
    'tenant' in req &&
    req.tenant !== null &&
    req.tenant !== undefined &&
    typeof req.tenant === 'object' &&
    'business' in req.tenant
  );
}

/**
 * Type guard to check if request has userId property
 */
export function hasUserId(req: Request): req is Request & { userId: string } {
  return 'userId' in req && typeof req.userId === 'string';
}

/**
 * Type guard to check if request has businessId property
 */
export function hasBusinessId(req: Request): req is Request & { businessId: string } {
  return 'businessId' in req && typeof req.businessId === 'string';
}

/**
 * Type guard to check if request has performance tracking properties
 */
export function hasPerformanceTracking(req: Request): req is Request & { __sizeChecked?: boolean } {
  return '__sizeChecked' in req;
}

/**
 * Type-safe helper to access Express Request properties safely
 */
export function getRequestProps(req: Request) {
  return {
    params: getRequestParams(req),
    body: getRequestBody(req),
    query: getRequestQuery(req),
    headers: getRequestHeaders(req),
    ip: getRequestIp(req),
    hostname: getRequestHostname(req),
    path: getRequestPath(req),
    url: getRequestUrl(req),
    get: req.get?.bind(req),
    files: 'files' in req ? req.files : undefined,
    file: 'file' in req ? req.file : undefined
  };
}

/**
 * Type-safe helper object for accessing specific request properties
 */
export const reqProps = {
  params: getRequestParams,
  body: getRequestBody,
  query: getRequestQuery,
  headers: getRequestHeaders,
  ip: getRequestIp,
  hostname: getRequestHostname,
  path: getRequestPath,
  url: getRequestUrl,
  get: (req: Request) => req.get?.bind(req),
  files: (req: Request) => 'files' in req ? req.files : undefined,
  file: (req: Request) => 'file' in req ? req.file : undefined
};

/**
 * Type-safe helper for accessing request body with validation
 */
export function getValidatedBody<T = any>(req: Request): T | null {
  if (hasValidatedBody(req)) {
    return req.validatedBody as T;
  }
  return null;
}

/**
 * Type-safe helper for accessing request query with validation
 */
export function getValidatedQuery<T = any>(req: Request): T | null {
  if (hasValidatedQuery(req)) {
    return req.validatedQuery as T;
  }
  return null;
}

/**
 * Type-safe helper for accessing request params with validation
 */
export function getValidatedParams<T = any>(req: Request): T | null {
  if (hasValidatedParams(req)) {
    return req.validatedParams as T;
  }
  return null;
}

