/**
 * File Validation Service
 *
 * Handles validation for file uploads including images, documents,
 * and other media files for manufacturers
 */

export interface FileValidationOptions {
  allowedTypes?: string[];
  maxSizeInMB?: number;
  minSizeInMB?: number;
  allowedExtensions?: string[];
  requireImageDimensions?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class FileValidationService {
  // Default configurations for different file types
  private readonly DEFAULT_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  private readonly DEFAULT_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  private readonly TRUSTED_IMAGE_HOSTS = [
    'amazonaws.com',
    'cloudinary.com',
    'imgix.com',
    'googleapis.com',
    'github.com',
    'linkedin.com'
  ];

  private readonly MAX_FILE_SIZE_MB = 10; // 10MB default
  private readonly MAX_IMAGE_SIZE_MB = 5; // 5MB for images
  private readonly MAX_DOCUMENT_SIZE_MB = 20; // 20MB for documents

  /**
   * Validate file upload data
   */
  validateFile(
    file: { size: number; mimeType: string; originalName: string },
    options: FileValidationOptions = {}
  ): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate file size
    const maxSize = options.maxSizeInMB || this.MAX_FILE_SIZE_MB;
    const fileSizeInMB = file.size / (1024 * 1024);

    if (fileSizeInMB > maxSize) {
      errors.push(`File size (${fileSizeInMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSize}MB)`);
    }

    if (options.minSizeInMB && fileSizeInMB < options.minSizeInMB) {
      errors.push(`File size (${fileSizeInMB.toFixed(2)}MB) is below minimum required size (${options.minSizeInMB}MB)`);
    }

    // Validate MIME type
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimeType)) {
      errors.push(`File type '${file.mimeType}' is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
    }

    // Validate file extension
    const extension = this.getFileExtension(file.originalName);
    if (options.allowedExtensions && !options.allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`);
    }

    // Check for suspicious file names
    if (this.hasSuspiciousFileName(file.originalName)) {
      warnings.push('File name contains potentially suspicious characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate image file
   */
  validateImage(
    file: { size: number; mimeType: string; originalName: string },
    options: FileValidationOptions = {}
  ): FileValidationResult {
    const imageOptions: FileValidationOptions = {
      allowedTypes: options.allowedTypes || this.DEFAULT_IMAGE_TYPES,
      maxSizeInMB: options.maxSizeInMB || this.MAX_IMAGE_SIZE_MB,
      ...options
    };

    return this.validateFile(file, imageOptions);
  }

  /**
   * Validate document file
   */
  validateDocument(
    file: { size: number; mimeType: string; originalName: string },
    options: FileValidationOptions = {}
  ): FileValidationResult {
    const documentOptions: FileValidationOptions = {
      allowedTypes: options.allowedTypes || this.DEFAULT_DOCUMENT_TYPES,
      maxSizeInMB: options.maxSizeInMB || this.MAX_DOCUMENT_SIZE_MB,
      ...options
    };

    return this.validateFile(file, documentOptions);
  }

  /**
   * Validate profile picture URL
   */
  validateProfilePictureUrl(url: string): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check URL format
    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
      return { isValid: false, errors, warnings };
    }

    // Check for valid image formats in URL
    const imageFormats = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidFormat = imageFormats.some(format =>
      url.toLowerCase().includes(format)
    );

    if (!hasValidFormat) {
      warnings.push('URL does not contain a recognizable image format');
    }

    // Check for trusted hosting platforms
    const isTrustedHost = this.TRUSTED_IMAGE_HOSTS.some(host =>
      url.toLowerCase().includes(host)
    );

    if (!isTrustedHost) {
      warnings.push('Image is not hosted on a recognized trusted platform');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate certificate/verification document
   */
  validateCertificateDocument(
    file: { size: number; mimeType: string; originalName: string }
  ): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Certificate documents should primarily be PDFs or images
    const allowedTypes = [
      ...this.DEFAULT_IMAGE_TYPES,
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.mimeType)) {
      errors.push('Certificate documents must be PDF or image files');
    }

    // Size validation (max 15MB for certificates)
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > 15) {
      errors.push('Certificate file size cannot exceed 15MB');
    }

    // Name validation - should be descriptive
    if (file.originalName.length < 5) {
      warnings.push('Certificate file name should be more descriptive');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate multiple files (batch upload)
   */
  validateMultipleFiles(
    files: Array<{ size: number; mimeType: string; originalName: string }>,
    options: FileValidationOptions = {},
    maxFiles: number = 10
  ): { overallValid: boolean; results: FileValidationResult[] } {
    if (files.length > maxFiles) {
      return {
        overallValid: false,
        results: [{
          isValid: false,
          errors: [`Cannot upload more than ${maxFiles} files at once`],
          warnings: []
        }]
      };
    }

    const results = files.map(file => this.validateFile(file, options));
    const overallValid = results.every(result => result.isValid);

    return { overallValid, results };
  }

  /**
   * Validate gallery images
   */
  validateGalleryImages(
    images: Array<{ size: number; mimeType: string; originalName: string }>,
    maxImages: number = 20
  ): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (images.length > maxImages) {
      errors.push(`Cannot upload more than ${maxImages} images to gallery`);
    }

    // Validate each image
    images.forEach((image, index) => {
      const validation = this.validateImage(image);
      if (!validation.isValid) {
        errors.push(`Image ${index + 1} (${image.originalName}): ${validation.errors.join(', ')}`);
      }
      if (validation.warnings.length > 0) {
        warnings.push(`Image ${index + 1} (${image.originalName}): ${validation.warnings.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate facility photos for verification
   */
  validateFacilityPhotos(
    photos: string[],
    minPhotos: number = 1,
    maxPhotos: number = 10
  ): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (photos.length < minPhotos) {
      errors.push(`At least ${minPhotos} facility photo(s) required`);
    }

    if (photos.length > maxPhotos) {
      errors.push(`Cannot upload more than ${maxPhotos} facility photos`);
    }

    // Validate each photo URL
    photos.forEach((url, index) => {
      const validation = this.validateProfilePictureUrl(url);
      if (!validation.isValid) {
        errors.push(`Photo ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Private helper methods
   */

  private getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
  }

  private hasSuspiciousFileName(filename: string): boolean {
    // Check for potentially malicious patterns
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.sh$/i,
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i,
      /\.\./,  // Directory traversal
      /[<>:"|?*]/  // Invalid Windows filename characters
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Check if file type is image
   */
  isImageFile(mimeType: string): boolean {
    return this.DEFAULT_IMAGE_TYPES.includes(mimeType);
  }

  /**
   * Check if file type is document
   */
  isDocumentFile(mimeType: string): boolean {
    return this.DEFAULT_DOCUMENT_TYPES.includes(mimeType);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const fileValidationService = new FileValidationService();
