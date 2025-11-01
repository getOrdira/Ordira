/**
 * File Upload Middleware Module
 * 
 * Exports file upload, validation, S3 integration, and processing middleware
 */

export {
  createUploadMiddleware,
  uploadMiddleware,
  safeUploadMiddleware,
  cleanupOnError,
  validateUploadOrigin,
  uploadRateLimit,
  validateS3Config,
  checkStorageHealth,
  extractUploadResults,
  type UploadedFile,
  type UploadRequest
} from './upload.middleware';

