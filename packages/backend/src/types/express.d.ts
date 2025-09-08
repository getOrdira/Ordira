// Global Express type extensions to resolve property access issues
import 'express';

declare global {
  namespace Express {
    interface Request {
      // Ensure all commonly used properties are available
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
}
