import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '15728640'); // 15MB default
const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_FILES_PER_REQUEST || '10');
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];

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
  maxSize: 25 * 1024 * 1024, // 25MB (changed from 100MB)
  processOptions: {
    codec: 'libx264',
    bitrate: '1000k',
    resolution: '1280x720'
  }
},
document: {
  extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
  mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf'],
  maxSize: 10 * 1024 * 1024 // 10MB (changed from 25MB)
},
certificate: {
  extensions: ['.pdf', '.jpg', '.jpeg', '.png'],
  mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxSize: 5 * 1024 * 1024 // 5MB (changed from 10MB)
}
};

/**
 * Extended multer file interface with additional metadata
 */
export interface UploadedFile extends Express.Multer.File {
  processedPath?: string;
  thumbnailPath?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    hash: string;
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
  };
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Generate secure filename
 */
function generateSecureFilename(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
}

/**
 * Calculate file hash for deduplication
 */
async function calculateFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
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
 * Process uploaded image
 */
async function processImage(filePath: string, outputPath: string): Promise<{ width: number; height: number }> {
  const config = FILE_TYPE_CONFIGS.image.processOptions;
  
  const info = await sharp(filePath)
    .resize(config.resize.width, config.resize.height, { fit: config.resize.fit })
    .webp({ quality: config.quality })
    .toFile(outputPath);

  return { width: info.width, height: info.height };
}

/**
 * Generate video thumbnail
 */
async function generateVideoThumbnail(filePath: string, thumbnailPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .screenshots({
        timestamps: ['50%'],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '320x240'
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
}

/**
 * Create custom storage engine
 */
function createStorage(uploadType: string, allowedTypes: string[]) {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const uploadPath = path.resolve(process.cwd(), UPLOAD_DIR, uploadType);
        await ensureUploadDir(uploadPath);
        cb(null, uploadPath);
      } catch (error) {
        cb(error as Error, '');
      }
    },
    filename: (req, file, cb) => {
      const validation = validateFile(file, allowedTypes);
      if (!validation.valid) {
        return cb(new Error(validation.error), '');
      }
      
      const filename = generateSecureFilename(file.originalname);
      cb(null, filename);
    }
  });
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

    cb(null, true);
  };
}

/**
 * Post-upload processing middleware
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

      // Calculate file hash
      const buffer = await fs.readFile(file.path);
      const hash = await calculateFileHash(buffer);

      // Initialize metadata
      file.metadata = {
        size: file.size,
        hash
      };

      // Process based on file type
      if (file.mimetype.startsWith('image/')) {
        try {
          const processedPath = file.path.replace(/\.[^/.]+$/, '.webp');
          const dimensions = await processImage(file.path, processedPath);
          
          file.processedPath = processedPath;
          file.metadata.width = dimensions.width;
          file.metadata.height = dimensions.height;
        } catch (error) {
          console.error('Image processing error:', error);
        }
      } else if (file.mimetype.startsWith('video/')) {
        try {
          const thumbnailPath = file.path.replace(/\.[^/.]+$/, '_thumb.jpg');
          await generateVideoThumbnail(file.path, thumbnailPath);
          file.thumbnailPath = thumbnailPath;
        } catch (error) {
          console.error('Video thumbnail generation error:', error);
        }
      }
    }

    // Add upload metadata to request
    req.uploadMetadata = {
      totalSize,
      fileCount: files.length,
      uploadId: crypto.randomBytes(16).toString('hex')
    };

    next();
  } catch (error) {
    console.error('File processing error:', error);
    next(error);
  }
}

/**
 * Create upload middleware for different contexts
 */
export function createUploadMiddleware(
  uploadType: 'image' | 'video' | 'document' | 'certificate' | 'mixed',
  options: {
    maxFiles?: number;
    maxSize?: number;
    fieldName?: string;
    multiple?: boolean;
  } = {}
) {
  const allowedTypes = uploadType === 'mixed' 
    ? ['image', 'video', 'document'] 
    : [uploadType];

  const storage = createStorage(uploadType, allowedTypes);
  const fileFilter = createFileFilter(allowedTypes);

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

  if (options.multiple) {
    return [
      upload.array(fieldName, options.maxFiles),
      processUploadedFiles
    ];
  } else {
    return [
      upload.single(fieldName),
      processUploadedFiles
    ];
  }
}

/**
 * Predefined upload middleware configurations
 */
export const uploadMiddleware = {
  // Single image upload
  singleImage: createUploadMiddleware('image', { 
    fieldName: 'image', 
    multiple: false, 
    maxSize: 10 * 1024 * 1024 
  }),

  // Multiple images
  multipleImages: createUploadMiddleware('image', { 
    fieldName: 'images', 
    multiple: true, 
    maxFiles: 10 
  }),

  // Single video upload
  singleVideo: createUploadMiddleware('video', { 
    fieldName: 'video', 
    multiple: false, 
    maxSize: 100 * 1024 * 1024 
  }),

  // Document upload
  document: createUploadMiddleware('document', { 
    fieldName: 'document', 
    multiple: false, 
    maxSize: 25 * 1024 * 1024 
  }),

  // Certificate uploads
  certificate: createUploadMiddleware('certificate', { 
    fieldName: 'certificate', 
    multiple: false, 
    maxSize: 10 * 1024 * 1024 
  }),

  // Mixed file types
  mixed: createUploadMiddleware('mixed', { 
    fieldName: 'files', 
    multiple: true, 
    maxFiles: 5 
  })
};

/**
 * Cleanup middleware to remove temporary files on error
 */
export function cleanupOnError(req: UploadRequest, res: Response, next: NextFunction): void {
  const originalNext = next;
  
  next = (error?: any) => {
    if (error && req.files) {
      // Clean up uploaded files on error
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      
      files.forEach(async (file: UploadedFile) => {
        try {
          await fs.unlink(file.path);
          if (file.processedPath) await fs.unlink(file.processedPath);
          if (file.thumbnailPath) await fs.unlink(file.thumbnailPath);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
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
 * Rate limiting for uploads (can be combined with main rate limiter)
 */
export function uploadRateLimit(req: Request, res: Response, next: NextFunction): void | Response {
  // This would integrate with your main rate limiter
  // For now, just a placeholder that could check upload-specific limits
  next();
}
