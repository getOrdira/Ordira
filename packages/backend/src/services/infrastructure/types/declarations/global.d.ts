// services/infrastructure/types/declarations/global.d.ts
// Global type declarations for Express and Multer

import 'express';

declare global {
  namespace Express {
    interface Request {
      ip?: string;
      headers: import('http').IncomingHttpHeaders;
      path: string;
      hostname: string;
      method: string;
      url: string;
      params: import('express-serve-static-core').ParamsDictionary;
      query: import('qs').ParsedQs;
      body: any;
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
    ip?: string;
    headers: import('http').IncomingHttpHeaders;
    path: string;
    hostname: string;
    method: string;
    url: string;
    params: import('express-serve-static-core').ParamsDictionary;
    query: import('qs').ParsedQs;
    body: any;
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
    ip?: string;
    headers: import('http').IncomingHttpHeaders;
    path: string;
    hostname: string;
    method: string;
    url: string;
    params: import('express-serve-static-core').ParamsDictionary;
    query: import('qs').ParsedQs;
    body: any;
    files?: any;
    file?: any;
    code?: any;
    validatedBody?: any;
    validatedQuery?: any;
    validatedParams?: any;
    validationErrors?: string[];
  }
}

// Fallback socket.io types (socket.io 4.x bundles its own types, but this is a fallback)
declare module 'socket.io' {
  import { Server as HTTPServer } from 'http';
  import { Server as HTTPSServer } from 'https';
  
  export interface ServerOptions {
    cors?: {
      origin?: string | string[] | boolean;
      methods?: string[];
      credentials?: boolean;
    };
    path?: string;
    serveClient?: boolean;
    adapter?: any;
    pingTimeout?: number;
    pingInterval?: number;
    connectTimeout?: number;
    maxHttpBufferSize?: number;
    transports?: string[];
  }

  export interface BroadcastOperator {
    emit(event: string, ...args: any[]): boolean;
    except(socketId: string): BroadcastOperator;
    to(room: string): BroadcastOperator;
  }

  export interface Socket {
    id: string;
    handshake: {
      headers: {
        authorization?: string;
        [key: string]: string | undefined;
      };
      query: Record<string, string>;
      auth: Record<string, any>;
    };
    data: Record<string, any>;
    rooms: Set<string>;
    join(room: string | string[]): Promise<void>;
    leave(room: string): Promise<void>;
    to(room: string): BroadcastOperator;
    emit(event: string, ...args: any[]): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
    disconnect(close?: boolean): this;
  }

  export class Server {
    constructor(httpServer?: HTTPServer | HTTPSServer | number, options?: ServerOptions);
    
    on(event: 'connection', listener: (socket: Socket) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    
    to(room: string): BroadcastOperator;
    
    emit(event: string, ...args: any[]): boolean;
    
    use(middleware: (socket: Socket, next: (err?: Error) => void) => void): this;
    
    close(callback?: (err?: Error) => void): void;
  }
}

export {};

