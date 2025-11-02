// services/infrastructure/types/utils/fileTypes.ts

/**
 * Import MulterFile from declarations to use here
 */
import type { MulterFile } from '../declarations';

/**
 * Re-export for convenience
 */
export type { MulterFile };

/**
 * Type guard to check if value is a valid Multer file
 */
export function isMulterFile(file: unknown): file is MulterFile {
  if (!file || typeof file !== 'object') {
    return false;
  }
  
  const f = file as Record<string, any>;
  
  // Validate required properties
  return (
    typeof f.fieldname === 'string' &&
    typeof f.originalname === 'string' &&
    typeof f.encoding === 'string' &&
    typeof f.mimetype === 'string' &&
    typeof f.size === 'number' &&
    typeof f.destination === 'string' &&
    typeof f.filename === 'string' &&
    typeof f.path === 'string' &&
    Buffer.isBuffer(f.buffer)
  );
}

/**
 * Type-safe helper for Multer files with validation
 * Returns null if file is not valid
 */
export function getMulterFile(file: unknown): MulterFile | null {
  return isMulterFile(file) ? file : null;
}

/**
 * Type guard to check if value is an array of Multer files
 */
export function isMulterFileArray(files: unknown): files is MulterFile[] {
  if (!Array.isArray(files)) {
    return false;
  }
  return files.every(file => isMulterFile(file));
}

/**
 * Check if file has valid image MIME type
 */
export function isImageFile(file: MulterFile | unknown): boolean {
  if (!isMulterFile(file)) return false;
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return imageTypes.includes(file.mimetype.toLowerCase());
}

/**
 * Check if file has valid document MIME type
 */
export function isDocumentFile(file: MulterFile | unknown): boolean {
  if (!isMulterFile(file)) return false;
  const docTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ];
  return docTypes.includes(file.mimetype.toLowerCase());
}

/**
 * Check if file size is within limit (in bytes)
 */
export function isFileSizeValid(file: MulterFile | unknown, maxSize: number): boolean {
  if (!isMulterFile(file)) return false;
  return file.size > 0 && file.size <= maxSize;
}

