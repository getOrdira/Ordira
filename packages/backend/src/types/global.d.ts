// Global type declarations for Express and Multer
import 'express';

declare global {
  namespace Express {
    interface Request {
      params: any;
      body: any;
      query: any;
      headers: any;
      ip: string;
      hostname: string;
      path: string;
      url: string;
      method: string;
      files?: any;
      file?: any;
      get: (name: string) => string | string[] | undefined;
      code?: any;
      validatedBody?: any;
      validatedQuery?: any;
      validatedParams?: any;
      validationErrors?: string[];
    }
    
    namespace Multer {
      interface File {
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
    }
  }
}

// Extend the base Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    params: any;
    body: any;
    query: any;
    headers: any;
    ip: string;
    hostname: string;
    path: string;
    url: string;
    method: string;
    files?: any;
    file?: any;
    get: (name: string) => string | string[] | undefined;
    code?: any;
    validatedBody?: any;
    validatedQuery?: any;
    validatedParams?: any;
    validationErrors?: string[];
  }
}

// Make all custom interfaces extend Express Request
declare module 'express' {
  interface Request {
    params: any;
    body: any;
    query: any;
    headers: any;
    ip: string;
    hostname: string;
    path: string;
    url: string;
    method: string;
    files?: any;
    file?: any;
    get: (name: string) => string | string[] | undefined;
    code?: any;
    validatedBody?: any;
    validatedQuery?: any;
    validatedParams?: any;
    validationErrors?: string[];
  }
}

export {};
