// Type assertion helpers to resolve Express Request property access issues
import { Request } from 'express';

/**
 * Type assertion helper to access Express Request properties safely
 */
export function getRequestProps(req: Request) {
  return {
    params: (req as any).params,
    body: (req as any).body,
    query: (req as any).query,
    headers: (req as any).headers,
    ip: (req as any).ip,
    hostname: (req as any).hostname,
    path: (req as any).path,
    url: (req as any).url,
    get: (req as any).get,
    files: (req as any).files,
    file: (req as any).file
  };
}

/**
 * Type assertion helper for accessing specific request properties
 */
export const reqProps = {
  params: (req: Request) => (req as any).params,
  body: (req: Request) => (req as any).body,
  query: (req: Request) => (req as any).query,
  headers: (req: Request) => (req as any).headers,
  ip: (req: Request) => (req as any).ip,
  hostname: (req: Request) => (req as any).hostname,
  path: (req: Request) => (req as any).path,
  url: (req: Request) => (req as any).url,
  get: (req: Request) => (req as any).get,
  files: (req: Request) => (req as any).files,
  file: (req: Request) => (req as any).file
};

/**
 * Type assertion for Multer file properties
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
 * Type assertion helper for Multer files
 */
export function getMulterFile(file: any): MulterFile {
  return file as MulterFile;
}
