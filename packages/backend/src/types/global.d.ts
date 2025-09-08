// Global type declarations to resolve Express and other type issues
import 'express';

declare global {
  // Extend Express Request interface
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
    }
    
    // Add Multer types
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

// Extend all custom interfaces to include Express Request properties
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
  }
}

export {};
