/**
 * AWS S3 Storage Service
 * 
 * Handles all S3 operations for file storage.
 * Moved from external/s3.service.ts to media/core/ for better organization.
 * Migrated to AWS SDK v3 for better performance and tree-shaking.
 */

import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
  type DeleteObjectsCommandInput,
  type ListObjectsV2CommandInput,
  type CopyObjectCommandInput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { logger } from '../../../utils/logger'; 
import { Readable } from 'stream';
import path from 'path';
import crypto from 'crypto';

// Configure AWS SDK v3 S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

if (!BUCKET_NAME) {
  throw new Error('AWS_S3_BUCKET environment variable is required');
}

export interface S3UploadOptions {
  businessId: string;
  resourceId?: string;
  filename: string;
  mimeType: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
  cacheControl?: string;
}

export interface S3UploadResult {
  key: string;
  url: string;
  etag: string;
  location: string;
  bucket: string;
  size?: number;
}

export interface S3FileInfo {
  key: string;
  url: string;
  size: number;
  lastModified: Date;
  etag: string;
  metadata?: Record<string, string>;
}

export interface S3ListOptions {
  prefix?: string;
  maxKeys?: number;
  delimiter?: string;
  continuationToken?: string;
}

export interface S3ListResult {
  files: S3FileInfo[];
  isTruncated: boolean;
  nextContinuationToken?: string;
  totalSize: number;
  totalFiles: number;
}

/**
 * AWS S3 Storage Service
 * Handles all S3 operations for file storage
 */
export class S3Service {

  /**
   * Upload file buffer to S3
   */
  static async uploadFile(
    fileBuffer: Buffer,
    options: S3UploadOptions
  ): Promise<S3UploadResult> {
    try {
      const key = this.buildS3Key(options.businessId, options.resourceId, options.filename);
      
      const uploadParams: PutObjectCommandInput = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: options.mimeType,
        CacheControl: options.cacheControl || 'max-age=31536000', // 1 year default
        Metadata: options.metadata || {},
      };

      // Set ACL based on public/private setting
      if (options.isPublic) {
        uploadParams.ACL = 'public-read';
      }

      const command = new PutObjectCommand(uploadParams);
      const result = await s3Client.send(command);

      // Build URL manually since v3 doesn't return Location
      const region = process.env.AWS_REGION || 'us-east-2';
      const location = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

      return {
        key,
        url: location,
        etag: result.ETag?.replace(/"/g, '') || '',
        location,
        bucket: BUCKET_NAME,
        size: fileBuffer.length
      };
    } catch (error: any) {
      // Log detailed error for debugging but don't expose sensitive info
      logger.error('S3 upload failed:', {
        businessId: options.businessId,
        filename: options.filename,
        error: error.message,
        code: error.name || error.Code
      });
      
      // Return generic error message to prevent configuration exposure
      throw new Error('File upload failed. Please try again.');
    }
  }

  /**
   * Upload file stream to S3
   */
  static async uploadStream(
    stream: Readable,
    options: S3UploadOptions
  ): Promise<S3UploadResult> {
    try {
      const key = this.buildS3Key(options.businessId, options.resourceId, options.filename);
      
      const uploadParams: PutObjectCommandInput = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: stream,
        ContentType: options.mimeType,
        CacheControl: options.cacheControl || 'max-age=31536000',
        Metadata: options.metadata || {},
      };

      if (options.isPublic) {
        uploadParams.ACL = 'public-read';
      }

      // Use Upload class for streaming uploads
      const upload = new Upload({
        client: s3Client,
        params: uploadParams
      });

      const result = await upload.done();

      const region = process.env.AWS_REGION || 'us-east-2';
      const location = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

      return {
        key,
        url: location,
        etag: result.ETag?.replace(/"/g, '') || '',
        location,
        bucket: BUCKET_NAME
      };
    } catch (error: any) {
      // Log detailed error for debugging but don't expose sensitive info
      logger.error('S3 stream upload failed:', {
        businessId: options.businessId,
        filename: options.filename,
        error: error.message,
        code: error.name || error.Code
      });
      
      // Return generic error message to prevent configuration exposure
      throw new Error('File upload failed. Please try again.');
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
      await s3Client.send(command);
    } catch (error: any) {
      throw new Error(`S3 delete failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple files from S3
   */
  static async deleteFiles(keys: string[]): Promise<{ 
    deleted: string[]; 
    errors: Array<{ key: string; error: string }> 
  }> {
    if (keys.length === 0) {
      return { deleted: [], errors: [] };
    }

    try {
      const deleteParams: DeleteObjectsCommandInput = {
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
          Quiet: false
        }
      };

      const command = new DeleteObjectsCommand(deleteParams);
      const result = await s3Client.send(command);

      const deleted = result.Deleted?.map(obj => obj.Key!).filter(Boolean) || [];
      const errors = result.Errors?.map(err => ({
        key: err.Key!,
        error: `${err.Code}: ${err.Message}`
      })) || [];

      return { deleted, errors };
    } catch (error: any) {
      throw new Error(`S3 batch delete failed: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
      await s3Client.send(command);
      return true;
    } catch (error: any) {
      // In v3, NotFound is indicated by name === 'NotFound' or statusCode === 404
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw new Error(`S3 file check failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata from S3
   */
  static async getFileInfo(key: string): Promise<S3FileInfo> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
      const result = await s3Client.send(command);

      return {
        key,
        url: this.getPublicUrl(key),
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
        etag: result.ETag?.replace(/"/g, '') || '',
        metadata: result.Metadata
      };
    } catch (error: any) {
      throw new Error(`S3 file info failed: ${error.message}`);
    }
  }

  /**
   * List files in S3 with prefix
   */
  static async listFiles(options: S3ListOptions = {}): Promise<S3ListResult> {
    try {
      const listParams: ListObjectsV2CommandInput = {
        Bucket: BUCKET_NAME,
        Prefix: options.prefix,
        MaxKeys: options.maxKeys || 1000,
        Delimiter: options.delimiter,
        ContinuationToken: options.continuationToken
      };

      const command = new ListObjectsV2Command(listParams);
      const result = await s3Client.send(command);

      const files: S3FileInfo[] = (result.Contents || []).map(obj => ({
        key: obj.Key!,
        url: this.getPublicUrl(obj.Key!),
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag?.replace(/"/g, '') || ''
      }));

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        files,
        isTruncated: result.IsTruncated || false,
        nextContinuationToken: result.NextContinuationToken,
        totalSize,
        totalFiles: files.length
      };
    } catch (error: any) {
      throw new Error(`S3 list files failed: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for temporary access
   */
  static async getSignedUrl(
    key: string, 
    operation: 'getObject' | 'putObject' = 'getObject',
    expiresIn: number = 3600 // 1 hour default
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });

      // For putObject, use PutObjectCommand
      if (operation === 'putObject') {
        const putCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key
        });
        return await getSignedUrl(s3Client, putCommand, { expiresIn });
      }

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error: any) {
      throw new Error(`S3 signed URL generation failed: ${error.message}`);
    }
  }

  /**
   * Copy file within S3
   */
  static async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const copyParams: CopyObjectCommandInput = {
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${sourceKey}`,
        Key: destinationKey
      };
      const command = new CopyObjectCommand(copyParams);
      await s3Client.send(command);
    } catch (error: any) {
      throw new Error(`S3 copy failed: ${error.message}`);
    }
  }

  /**
   * Get file as buffer
   */
  static async getFileBuffer(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
      const result = await s3Client.send(command);

      // In v3, Body is a Readable stream, need to convert to Buffer
      if (result.Body) {
        const chunks: Uint8Array[] = [];
        const stream = result.Body as Readable;
        
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
      }
      
      throw new Error('No body returned from S3');
    } catch (error: any) {
      throw new Error(`S3 file download failed: ${error.message}`);
    }
  }

  /**
   * Get file as stream
   * Note: This is now async in v3. For synchronous stream access, 
   * use getFileBuffer() or make this method async.
   */
  static async getFileStream(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
      const result = await s3Client.send(command);
      
      if (!result.Body) {
        throw new Error('No body returned from S3');
      }
      
      return result.Body as Readable;
    } catch (error: any) {
      throw new Error(`S3 file stream failed: ${error.message}`);
    }
  }

  /**
   * Update file metadata
   */
  static async updateMetadata(
    key: string, 
    metadata: Record<string, string>
  ): Promise<void> {
    try {
      // Get current object to preserve other properties
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
      const currentObject = await s3Client.send(headCommand);

      // Copy object with new metadata
      const copyParams: CopyObjectCommandInput = {
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${key}`,
        Key: key,
        Metadata: metadata,
        MetadataDirective: 'REPLACE',
        ContentType: currentObject.ContentType
      };
      const copyCommand = new CopyObjectCommand(copyParams);
      await s3Client.send(copyCommand);
    } catch (error: any) {
      throw new Error(`S3 metadata update failed: ${error.message}`);
    }
  }

  /**
   * Build S3 key from business structure
   */
  static buildS3Key(businessId: string, resourceId?: string, filename?: string): string {
    const parts = [businessId];
    
    if (resourceId) {
      parts.push(resourceId);
    }
    
    if (filename) {
      parts.push(filename);
    }
    
    return parts.join('/');
  }

  /**
   * Extract parts from S3 key
   */
  static parseS3Key(key: string): { 
    businessId: string; 
    resourceId?: string; 
    filename?: string 
  } {
    const parts = key.split('/');
    
    return {
      businessId: parts[0],
      resourceId: parts.length > 2 ? parts[1] : undefined,
      filename: parts[parts.length - 1]
    };
  }

  /**
   * Get public URL for S3 object
   */
  static getPublicUrl(key: string): string {
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;
  }

  /**
   * Generate secure filename
   */
  static generateSecureFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const safeName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9\-_]/g, '_');
    
    return `${timestamp}-${random}-${safeName}${ext}`;
  }

  /**
   * Get storage statistics for business
   */
  static async getStorageStats(businessId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    sizeFormatted: string;
  }> {
    try {
      const result = await this.listFiles({ 
        prefix: `${businessId}/`,
        maxKeys: 1000 
      });

      const sizeInMB = (result.totalSize / (1024 * 1024)).toFixed(2);
      
      return {
        totalFiles: result.totalFiles,
        totalSize: result.totalSize,
        sizeFormatted: `${sizeInMB} MB`
      };
    } catch (error: any) {
      throw new Error(`Storage stats failed: ${error.message}`);
    }
  }

  /**
   * Validate S3 configuration
   */
  static async validateConfiguration(): Promise<{
    configured: boolean;
    canConnect: boolean;
    bucketExists: boolean;
    hasPermissions: boolean;
    errors: string[];
  }> {
    const result = {
      configured: false,
      canConnect: false,
      bucketExists: false,
      hasPermissions: false,
      errors: [] as string[]
    };

    // Check configuration
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !BUCKET_NAME) {
      result.errors.push('Storage service configuration incomplete');
      return result;
    }

    result.configured = true;

    try {
      // Test connection
      const listCommand = new ListObjectsV2Command({ 
        Bucket: BUCKET_NAME, 
        MaxKeys: 1 
      });
      await s3Client.send(listCommand);
      result.canConnect = true;
      result.bucketExists = true;

      // Test upload permission
      const testKey = `test-permissions-${Date.now()}.txt`;
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: testKey,
        Body: 'test'
      });
      await s3Client.send(putCommand);

      // Test delete permission
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: testKey
      });
      await s3Client.send(deleteCommand);

      result.hasPermissions = true;

    } catch (error: any) {
      // Log detailed error for debugging
      logger.error('S3 validation failed:', {
        error: error.message,
        code: error.name || error.Code,
        statusCode: error.$metadata?.httpStatusCode
      });
      
      // Return generic error message
      result.errors.push('Storage service validation failed');
    }

    return result;
  }
}
