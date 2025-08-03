// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  // Handle Multer-specific errors
  if (err instanceof multer.MulterError) {
    // e.g. 'LIMIT_FILE_SIZE' or 'LIMIT_UNEXPECTED_FILE'
    return res.status(400).json({ error: err.message });
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
}
