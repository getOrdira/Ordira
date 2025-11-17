// services/infrastructure/types/declarations/global.d.ts
// Global type declarations for Express and Multer

import 'express';

declare global {
  namespace Express {
    interface Request {
      files?: any;
      file?: any;
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
    files?: any;
    file?: any;
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
    files?: any;
    file?: any;
    code?: any;
    validatedBody?: any;
    validatedQuery?: any;
    validatedParams?: any;
    validationErrors?: string[];
  }
}

export {};

