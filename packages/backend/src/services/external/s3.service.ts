/**
 * @deprecated This file has been moved to services/media/core/s3.service.ts
 * Please update imports to use: import { S3Service } from '../media/core/s3.service'
 * or: import { S3Service } from '../media'
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

// Re-export from new location
export { S3Service } from '../media/core/s3.service';
export type {
  S3UploadOptions,
  S3UploadResult,
  S3FileInfo,
  S3ListOptions,
  S3ListResult
} from '../media/core/s3.service';
