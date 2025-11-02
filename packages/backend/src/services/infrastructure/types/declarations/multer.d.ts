// services/infrastructure/types/declarations/multer.d.ts
// Custom multer types compatible with Express 4

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: 
        | { [fieldname: string]: Multer.File[] }
        | Multer.File[];
    }

    namespace Multer {
      interface File {
        /** Name of the form field associated with this file. */
        fieldname: string;
        /** Name of the file on the uploader's computer. */
        originalname: string;
        /** Encoding type of the file. */
        encoding: string;
        /** Mime type of the file. */
        mimetype: string;
        /** Size of the file in bytes. */
        size: number;
        /** DiskStorage only: Directory to which the file has been saved. */
        destination?: string;
        /** DiskStorage only: Name of the file within the destination. */
        filename?: string;
        /** DiskStorage only: Full path to the uploaded file. */
        path?: string;
        /** MemoryStorage only: A Buffer containing the entire file. */
        buffer?: Buffer;
      }
    }
  }
}

// Re-export express types for consistency
export { Request, Response, NextFunction } from 'express';

// Multer interfaces that match Express 4 patterns
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

export interface MulterRequest extends Request {
  file?: MulterFile;
  files?: { [fieldname: string]: MulterFile[] } | MulterFile[];
}

// Storage engines compatible with Express 4
export interface StorageEngine {
  _handleFile(
    req: Request,
    file: MulterFile,
    cb: (error?: any, info?: Partial<MulterFile>) => void
  ): void;
  _removeFile(
    req: Request,
    file: MulterFile,
    cb: (error: Error | null) => void
  ): void;
}

export interface DiskStorageOptions {
  destination?: string | ((req: Request, file: MulterFile, cb: (error: Error | null, destination: string) => void) => void);
  filename?: (req: Request, file: MulterFile, cb: (error: Error | null, filename: string) => void) => void;
}

export interface MemoryStorageOptions {}

// Multer options compatible with Express 4 Request type
export interface MulterOptions {
  dest?: string;
  storage?: StorageEngine;
  limits?: {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    parts?: number;
    headerPairs?: number;
  };
  preservePath?: boolean;
  fileFilter?: (
    req: Request,
    file: MulterFile,
    cb: FileFilterCallback
  ) => void;
}

export type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

// Request handler type that matches Express 4
export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export interface Field {
  name: string;
  maxCount?: number;
}

// Main multer interface compatible with Express 4
export interface Multer {
  (options?: MulterOptions): RequestHandler;
  single(fieldname: string): RequestHandler;
  array(fieldname: string, maxCount?: number): RequestHandler;
  fields(fields: Field[]): RequestHandler;
  none(): RequestHandler;
  any(): RequestHandler;
  memoryStorage(options?: MemoryStorageOptions): StorageEngine;
  diskStorage(options?: DiskStorageOptions): StorageEngine;
}

// Multer error class
export class MulterError extends Error {
  code: string;
  field?: string;
  
  constructor(code: string, field?: string) {
    super();
    this.name = 'MulterError';
    this.code = code;
    this.field = field;
    
    switch (code) {
      case 'LIMIT_PART_COUNT':
        this.message = 'Too many parts';
        break;
      case 'LIMIT_FILE_SIZE':
        this.message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        this.message = 'Too many files';
        break;
      case 'LIMIT_FIELD_KEY':
        this.message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        this.message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        this.message = 'Too many fields';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        this.message = 'Unexpected field';
        break;
      case 'MISSING_FIELD_NAME':
        this.message = 'Field name missing';
        break;
      default:
        this.message = 'Unknown multer error';
    }
  }
}

// Default export - the main multer function
declare const multer: Multer;
export default multer;

