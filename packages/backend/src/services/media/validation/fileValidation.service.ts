import { MediaUploadOptions } from '../utils/types';
import { formatFileSize } from '../utils/helpers';
import { logger } from '../../../utils/logger';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * File validation service for media uploads
 */
export class FileValidationService {
  /**
   * Validate file upload against constraints
   */
  validateFileUpload(
    file: Express.Multer.File,
    options: MediaUploadOptions = {}
  ): ValidationResult {
    try {
      if (!file) {
        return { valid: false, error: 'No file provided' };
      }

      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        return {
          valid: false,
          error: `File type ${file.mimetype} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
        };
      }

      // Check file size
      if (options.maxFileSize && file.size > options.maxFileSize) {
        return {
          valid: false,
          error: `File size ${formatFileSize(file.size)} exceeds limit of ${formatFileSize(options.maxFileSize)}`
        };
      }

      // Check if file is empty
      if (file.size <= 0) {
        return { valid: false, error: 'File appears to be empty' };
      }

      // Check filename
      if (!file.filename && !file.originalname) {
        return { valid: false, error: 'File must have a valid filename' };
      }

      // Additional security checks
      const securityCheck = this.performSecurityChecks(file);
      if (!securityCheck.valid) {
        return securityCheck;
      }

      return { valid: true };
    } catch (error: any) {
      logger.error('File validation error', { error: error.message, filename: file?.originalname });
      return { valid: false, error: `File validation error: ${error.message}` };
    }
  }

  /**
   * Perform security checks on uploaded files
   */
  private performSecurityChecks(file: Express.Multer.File): ValidationResult {
    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.dll', '.so'];
    const filename = file.originalname?.toLowerCase() || '';
    
    for (const ext of suspiciousExtensions) {
      if (filename.endsWith(ext)) {
        return { valid: false, error: `File type ${ext} is not allowed for security reasons` };
      }
    }

    // Check for double extensions (e.g., file.pdf.exe)
    const parts = filename.split('.');
    if (parts.length > 2) {
      const lastTwo = parts.slice(-2);
      for (const ext of suspiciousExtensions) {
        if (lastTwo.some(part => ext.includes(part))) {
          return { valid: false, error: 'Suspicious file extension detected' };
        }
      }
    }

    // Check MIME type consistency with extension
    const mimeValidation = this.validateMimeTypeConsistency(file);
    if (!mimeValidation.valid) {
      return mimeValidation;
    }

    return { valid: true };
  }

  /**
   * Validate MIME type consistency with file extension
   */
  private validateMimeTypeConsistency(file: Express.Multer.File): ValidationResult {
    const filename = file.originalname?.toLowerCase() || '';
    const mimeType = file.mimetype?.toLowerCase() || '';

    // Common MIME type to extension mappings
    const mimeToExtension: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/mpeg': ['.mpeg', '.mpg'],
      'video/quicktime': ['.mov'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/json': ['.json']
    };

    const expectedExtensions = mimeToExtension[mimeType];
    if (expectedExtensions) {
      const hasValidExtension = expectedExtensions.some(ext => filename.endsWith(ext));
      if (!hasValidExtension) {
        logger.warn('MIME type mismatch detected', {
          filename,
          mimeType,
          expectedExtensions
        });
        // Warning only - don't fail validation as some legitimate files may have mismatches
      }
    }

    return { valid: true };
  }

  /**
   * Validate batch upload constraints
   */
  validateBatchUpload(files: Express.Multer.File[], maxFiles: number = 50): ValidationResult {
    if (!files || files.length === 0) {
      return { valid: false, error: 'No files provided for batch upload' };
    }

    if (files.length > maxFiles) {
      return {
        valid: false,
        error: `Too many files. Maximum ${maxFiles} files allowed per batch upload.`
      };
    }

    return { valid: true };
  }
}

export const fileValidationService = new FileValidationService();

