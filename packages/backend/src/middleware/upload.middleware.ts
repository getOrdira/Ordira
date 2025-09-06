// src/middleware/upload.middleware.ts

import multer from 'multer';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { S3Service } from '../services/external/s3.service';

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '15728640'); // 15MB default
const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_FILES_PER_REQUEST || '10');
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];
const USE_S3 = process.env.STORAGE_PROVIDER === 's3' && process.env.AWS_S3_BUCKET;

// File type configurations
const FILE_TYPE_CONFIGS = {
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    processOptions: {
      resize: { width: 1920, height: 1080, fit: 'inside' as const },
      quality: 85,
      format: 'webp' as const
    }
  },
  video: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
    mimeTypes: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm'],
    maxSize: 25 * 1024 * 1024, // 25MB
    processOptions: {
      codec: 'libx264',
      bitrate: '1000k',
      resolution: '1280x720'
    }
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  certificate: {
    extensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 5 * 1024 * 1024 // 5MB
  }
};

/**
 * Extended multer file interface with S3 metadata
 */
export interface UploadedFile extends Express.Multer.File {
  s3Key?: string;
  s3Url?: string;
  processedBuffer?: Buffer;
  thumbnailBuffer?: Buffer;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    hash: string;
    checksum?: string;
    processed?: boolean;
    thumbnailS3Key?: string;  // Added
    thumbnailUrl?: string;
  };
}

/**
 * Upload request interface
 */
export interface UploadRequest extends Request {
  files?: UploadedFile[] | { [fieldname: string]: UploadedFile[] };
  uploadMetadata?: {
    totalSize: number;
    fileCount: number;
    uploadId: string;
    storageProvider: 'local' | 's3';
  };
}

/**
 * Generate secure filename using S3Service
 */
function generateSecureFilename(originalname: string): string {
  return S3Service.generateSecureFilename(originalname);
}

/**
 * Calculate file hash for deduplication and integrity
 */
function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate MD5 checksum for S3 ETag comparison
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Validate file type and size
 */
function validateFile(file: Express.Multer.File, allowedTypes: string[]): { valid: boolean; error?: string } {
  // Check file type
  const fileTypeValid = allowedTypes.some(type => {
    const config = FILE_TYPE_CONFIGS[type as keyof typeof FILE_TYPE_CONFIGS];
    return config && (
      config.mimeTypes.includes(file.mimetype) ||
      config.extensions.some(ext => file.originalname.toLowerCase().endsWith(ext))
    );
  });

  if (!fileTypeValid) {
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }

  // Check file size
  const typeConfig = Object.values(FILE_TYPE_CONFIGS).find(config =>
    config.mimeTypes.includes(file.mimetype)
  );

  if (typeConfig && file.size > typeConfig.maxSize) {
    return { valid: false, error: `File too large. Maximum size: ${typeConfig.maxSize / (1024 * 1024)}MB` };
  }

  return { valid: true };
}

/**
 * Process uploaded image with sharp
 */
async function processImage(buffer: Buffer): Promise<{ 
  processedBuffer: Buffer; 
  width: number; 
  height: number 
}> {
  const config = FILE_TYPE_CONFIGS.image.processOptions;
  
  const result = await sharp(buffer)
    .resize(config.resize.width, config.resize.height, { fit: config.resize.fit })
    .webp({ quality: config.quality })
    .toBuffer({ resolveWithObject: true });

  return { 
    processedBuffer: result.data, 
    width: result.info.width, 
    height: result.info.height 
  };
}

/**
 * Generate video thumbnail (placeholder - would need ffmpeg setup for full implementation)
 */
async function generateVideoThumbnail(buffer: Buffer): Promise<Buffer> {
  // For now, return a placeholder thumbnail
  // In production, you'd use ffmpeg to extract frame from video buffer
  console.warn('Video thumbnail generation not implemented - returning placeholder');
  
  // Create a simple placeholder thumbnail
  return await sharp({
    create: {
      width: 320,
      height: 240,
      channels: 3,
      background: { r: 128, g: 128, b: 128 }
    }
  })
  .png()
  .toBuffer();
}

/**
 * Create memory storage for S3 uploads
 */
function createMemoryStorage(allowedTypes: string[]) {
  return multer.memoryStorage();
}

/**
 * Custom file filter with enhanced validation
 */
function createFileFilter(allowedTypes: string[]) {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const validation = validateFile(file, allowedTypes);
    
    if (!validation.valid) {
      return cb(new Error(validation.error));
    }

    // Additional security checks
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      return cb(new Error('Invalid filename'));
    }

    // Check for malicious file signatures
    if (file.originalname.match(/\.(exe|bat|cmd|scr|pif|com|jar)$/i)) {
      return cb(new Error('Executable files not allowed'));
    }

    cb(null, true);
  };
}

/**
 * Post-upload processing middleware with S3 integration
 */
async function processUploadedFiles(req: UploadRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.files) {
    return next();
  }

  try {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    let totalSize = 0;

    for (const file of files as UploadedFile[]) {
      totalSize += file.size;

      // Calculate file hash and checksum
      const hash = calculateFileHash(file.buffer);
      const checksum = calculateChecksum(file.buffer);

      // Initialize metadata
      file.metadata = {
        size: file.size,
        hash,
        checksum,
        processed: false
      };

      // Process based on file type
      if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
        try {
          const processed = await processImage(file.buffer);
          file.processedBuffer = processed.processedBuffer;
          file.metadata.width = processed.width;
          file.metadata.height = processed.height;
          file.metadata.processed = true;
        } catch (error) {
          console.error('Image processing error:', error);
          // Continue with original buffer if processing fails
          file.processedBuffer = file.buffer;
        }
      } else if (file.mimetype.startsWith('video/')) {
        try {
          file.thumbnailBuffer = await generateVideoThumbnail(file.buffer);
        } catch (error) {
          console.error('Video thumbnail generation error:', error);
        }
      }

      // Generate secure filename
      file.filename = generateSecureFilename(file.originalname);
    }

    // Add upload metadata to request
    req.uploadMetadata = {
      totalSize,
      fileCount: files.length,
      uploadId: crypto.randomBytes(16).toString('hex'),
      storageProvider: USE_S3 ? 's3' : 'local'
    };

    next();
  } catch (error) {
    console.error('File processing error:', error);
    next(error);
  }
}

/**
 * Upload files to S3 after processing
 */
async function uploadToS3(req: UploadRequest, res: Response, next: NextFunction): Promise<void> {
  if (!USE_S3 || !req.files) {
    return next();
  }

  try {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    
    // Extract business context (this should be set by auth/tenant middleware)
    const businessId = (req as any).userId || (req as any).tenant?.business?.toString();
    
    if (!businessId) {
      console.warn('No business ID found for S3 upload - skipping automatic upload');
      return next();
    }

    for (const file of files as UploadedFile[]) {
      try {
        // Use processed buffer if available, otherwise original
        const uploadBuffer = file.processedBuffer || file.buffer;
        
        // Upload main file to S3
        const uploadResult = await S3Service.uploadFile(uploadBuffer, {
          businessId,
          filename: file.filename,
          mimeType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            hash: file.metadata?.hash || '',
            checksum: file.metadata?.checksum || '',
            processed: file.metadata?.processed ? 'true' : 'false',
            ...(file.metadata?.width && { width: file.metadata.width.toString() }),
            ...(file.metadata?.height && { height: file.metadata.height.toString() })
          },
          isPublic: false // Default to private, can be overridden by service layer
        });

        // Store S3 information in file object
        file.s3Key = uploadResult.key;
        file.s3Url = uploadResult.url;

        // Upload thumbnail if available
        if (file.thumbnailBuffer) {
          try {
            const thumbnailFilename = file.filename.replace(/\.[^/.]+$/, '_thumb.jpg');
            const thumbnailResult = await S3Service.uploadFile(file.thumbnailBuffer, {
              businessId,
              filename: thumbnailFilename,
              mimeType: 'image/jpeg',
              metadata: {
                type: 'thumbnail',
                parentFile: file.filename,
                originalName: file.originalname
              },
              isPublic: false
            });

            // Store thumbnail S3 info in metadata
            if (!file.metadata) {
              file.metadata = {
                size: file.size,
                hash: '',
                checksum: ''
              };
            }
            file.metadata.thumbnailS3Key = thumbnailResult.key;
            file.metadata.thumbnailUrl = thumbnailResult.url;
          } catch (thumbError) {
            console.error('Thumbnail upload error:', thumbError);
          }
        }

      } catch (error) {
        console.error(`S3 upload error for file ${file.originalname}:`, error);
        // Continue processing other files even if one fails
      }
    }

    next();
  } catch (error) {
    console.error('S3 upload processing error:', error);
    next(error);
  }
}

/**
 * Create upload middleware for different contexts with S3 support
 */
export function createUploadMiddleware(
  uploadType: 'image' | 'video' | 'document' | 'certificate' | 'mixed',
  options: {
    maxFiles?: number;
    maxSize?: number;
    fieldName?: string;
    multiple?: boolean;
    autoUploadToS3?: boolean;
  } = {}
) {
  const allowedTypes = uploadType === 'mixed' 
    ? ['image', 'video', 'document'] 
    : [uploadType];

  const storage = createMemoryStorage(allowedTypes);
  const fileFilter = createFileFilter(allowedTypes) as any;

  const multerConfig: multer.Options = {
    storage,
    fileFilter,
    limits: {
      fileSize: options.maxSize || MAX_FILE_SIZE,
      files: options.maxFiles || MAX_FILES_PER_REQUEST
    }
  };

  const upload = multer(multerConfig);
  const fieldName = options.fieldName || 'files';

  // Build middleware chain
  const middlewareChain = [];

  // Add multer upload
  if (options.multiple) {
    middlewareChain.push(upload.array(fieldName, options.maxFiles));
  } else {
    middlewareChain.push(upload.single(fieldName));
  }

  // Add file processing
  middlewareChain.push(processUploadedFiles);

  // Add S3 upload if enabled and configured
  if (options.autoUploadToS3 !== false && USE_S3) {
    middlewareChain.push(uploadToS3);
  }

  return middlewareChain;
}

/**
 * Predefined upload middleware configurations with S3 support
 */
export const uploadMiddleware = {
  // Single image upload
  singleImage: createUploadMiddleware('image', { 
    fieldName: 'image', 
    multiple: false, 
    maxSize: 10 * 1024 * 1024,
    autoUploadToS3: true
  }),

  // Multiple images
  multipleImages: createUploadMiddleware('image', { 
    fieldName: 'images', 
    multiple: true, 
    maxFiles: 10,
    autoUploadToS3: true
  }),

  // Single video upload
  singleVideo: createUploadMiddleware('video', { 
    fieldName: 'video', 
    multiple: false, 
    maxSize: 100 * 1024 * 1024,
    autoUploadToS3: true
  }),

  // Document upload
  document: createUploadMiddleware('document', { 
    fieldName: 'document', 
    multiple: false, 
    maxSize: 25 * 1024 * 1024,
    autoUploadToS3: true
  }),

  // Certificate uploads
  certificate: createUploadMiddleware('certificate', { 
    fieldName: 'certificate', 
    multiple: false, 
    maxSize: 10 * 1024 * 1024,
    autoUploadToS3: true
  }),

  // Mixed file types
  mixed: createUploadMiddleware('mixed', { 
    fieldName: 'files', 
    multiple: true, 
    maxFiles: 5,
    autoUploadToS3: true
  }),

  // Memory-only (no auto S3 upload)
  memoryOnly: {
    singleFile: createUploadMiddleware('mixed', {
      fieldName: 'file',
      multiple: false,
      autoUploadToS3: false
    }),
    multipleFiles: createUploadMiddleware('mixed', {
      fieldName: 'files',
      multiple: true,
      maxFiles: 10,
      autoUploadToS3: false
    })
  }
};

/**
 * Cleanup middleware - now handles S3 upload failures
 */
export function cleanupOnError(req: UploadRequest, res: Response, next: NextFunction): void {
  const originalNext = next;
  
  next = (error?: any) => {
    if (error && req.files) {
      // For S3 failures, attempt cleanup of partially uploaded files
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      
      files.forEach(async (file: UploadedFile) => {
        try {
          // If file was uploaded to S3 but database save failed, clean it up
          if (file.s3Key && USE_S3) {
            try {
              await S3Service.deleteFile(file.s3Key);
              console.log(`Cleaned up S3 file: ${file.s3Key}`);
            } catch (cleanupError) {
              console.error('S3 cleanup error:', cleanupError);
            }
          }

          // Clean up thumbnail if it exists
          if (file.metadata?.thumbnailS3Key && USE_S3) {
            try {
              await S3Service.deleteFile(file.metadata.thumbnailS3Key);
            } catch (cleanupError) {
              console.error('S3 thumbnail cleanup error:', cleanupError);
            }
          }
        } catch (cleanupError) {
          console.error('File cleanup error:', cleanupError);
        }
      });
    }
    
    originalNext(error);
  };

  next();
}

/**
 * Validate upload request origin
 */
export function validateUploadOrigin(req: Request, res: Response, next: NextFunction): void | Response {
  if (ALLOWED_ORIGINS.length === 0) {
    return next(); // Skip validation if no origins configured
  }

  const origin = req.get('Origin') || req.get('Referer');
  
  if (!origin || !ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
    return res.status(403).json({ 
      error: 'Upload not allowed from this origin',
      code: 'INVALID_ORIGIN'
    });
  }

  next();
}

/**
 * Rate limiting for uploads
 */
export function uploadRateLimit(req: Request, res: Response, next: NextFunction): void | Response {
  // This integrates with your main rate limiter
  // Check for upload-specific rate limits (e.g., MB per hour)
  const uploadSize = parseInt(req.get('Content-Length') || '0');
  
  if (uploadSize > MAX_FILE_SIZE * MAX_FILES_PER_REQUEST) {
    return res.status(413).json({
      error: 'Upload size too large',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  next();
}

/**
 * Validate S3 configuration middleware
 */
export function validateS3Config(req: Request, res: Response, next: NextFunction): void | Response {
  if (USE_S3) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) {
      return res.status(500).json({
        error: 'S3 storage not properly configured',
        code: 'S3_CONFIG_ERROR'
      });
    }
  }

  next();
}

/**
 * Middleware to check storage health before uploads
 */
export async function checkStorageHealth(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  if (USE_S3) {
    try {
      const validation = await S3Service.validateConfiguration();
      if (!validation.canConnect || !validation.bucketExists || !validation.hasPermissions) {
        return res.status(503).json({
          error: 'Storage service unavailable',
          code: 'STORAGE_UNAVAILABLE',
          details: validation.errors
        });
      }
    } catch (error) {
      return res.status(503).json({
        error: 'Storage health check failed',
        code: 'STORAGE_HEALTH_CHECK_FAILED'
      });
    }
  }

  next();
}

/**
 * Helper function to extract upload results for service layer
 */
export function extractUploadResults(req: UploadRequest): {
  files: UploadedFile[];
  metadata: typeof req.uploadMetadata;
} {
  const files = req.files ? 
    (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [];
  
  return {
    files: files as UploadedFile[],
    metadata: req.uploadMetadata
  };
}

/**
 * Safe upload middleware that includes error handling and S3 health checks
 */
export const safeUploadMiddleware = {
  singleImage: [
    validateUploadOrigin,
    validateS3Config,
    checkStorageHealth,
    ...uploadMiddleware.singleImage,
    cleanupOnError
  ],
  
  multipleImages: [
    validateUploadOrigin,
    validateS3Config,
    checkStorageHealth,
    ...uploadMiddleware.multipleImages,
    cleanupOnError
  ],

  document: [
    validateUploadOrigin,
    validateS3Config,
    checkStorageHealth,
    ...uploadMiddleware.document,
    cleanupOnError
  ],

  certificate: [
    validateUploadOrigin,
    validateS3Config,
    checkStorageHealth,
    ...uploadMiddleware.certificate,
    cleanupOnError
  ],

  mixed: [
    validateUploadOrigin,
    validateS3Config,
    checkStorageHealth,
    ...uploadMiddleware.mixed,
    cleanupOnError
  ]
};