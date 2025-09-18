// Type-safe helpers to resolve Express Request property access issues
import { Request } from 'express';
import { 
  getRequestBody, 
  getRequestQuery, 
  getRequestParams, 
  getRequestHeaders,
  getRequestIp,
  getRequestHostname,
  getRequestPath,
  getRequestUrl
} from './typeGuards';

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
 * Type-safe helper for accessing specific request properties
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
 * Type-safe interface for Multer file properties
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

/**
 * Type-safe helper for Multer files with validation
 */
export function getMulterFile(file: unknown): MulterFile | null {
  if (!file || typeof file !== 'object') {
    return null;
  }
  
  const f = file as Record<string, any>;
  
  // Validate required properties
  if (
    typeof f.fieldname === 'string' &&
    typeof f.originalname === 'string' &&
    typeof f.encoding === 'string' &&
    typeof f.mimetype === 'string' &&
    typeof f.size === 'number' &&
    typeof f.destination === 'string' &&
    typeof f.filename === 'string' &&
    typeof f.path === 'string' &&
    Buffer.isBuffer(f.buffer)
  ) {
    return f as MulterFile;
  }
  
  return null;
}

/**
 * Type-safe helper for accessing request body with validation
 */
export function getValidatedBody<T = any>(req: Request): T | null {
  if ('validatedBody' in req && req.validatedBody) {
    return req.validatedBody as T;
  }
  return null;
}

/**
 * Type-safe helper for accessing request query with validation
 */
export function getValidatedQuery<T = any>(req: Request): T | null {
  if ('validatedQuery' in req && req.validatedQuery) {
    return req.validatedQuery as T;
  }
  return null;
}

/**
 * Type-safe helper for accessing request params with validation
 */
export function getValidatedParams<T = any>(req: Request): T | null {
  if ('validatedParams' in req && req.validatedParams) {
    return req.validatedParams as T;
  }
  return null;
}