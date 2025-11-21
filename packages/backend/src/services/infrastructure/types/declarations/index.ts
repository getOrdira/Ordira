// services/infrastructure/types/declarations/index.ts
/**
 * Type Declarations Module
 * 
 * Global TypeScript declaration files for Express, Multer, and framework augmentations
 * These files augment global namespaces and module declarations at compile time
 */

// Note: .d.ts files are automatically included by TypeScript
// This index file is for documentation and potential re-exports of non-global types

/**
 * Runtime MulterError implementation.
 * Keeping this class co-located prevents bundler/runtime mismatches where
 * the compiled JS fails to emit ./multer when only declarations exist.
 */
export class MulterError extends Error {
  code: string;
  field?: string;

  constructor(code: string, field?: string) {
    super();
    this.name = 'MulterError';
    this.code = code;
    this.field = field;

    switch (code) {
      case 'LIMIT_PART_COUNT':
        this.message = 'Too many parts';
        break;
      case 'LIMIT_FILE_SIZE':
        this.message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        this.message = 'Too many files';
        break;
      case 'LIMIT_FIELD_KEY':
        this.message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        this.message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        this.message = 'Too many fields';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        this.message = 'Unexpected field';
        break;
      case 'MISSING_FIELD_NAME':
        this.message = 'Field name missing';
        break;
      default:
        this.message = 'Unknown multer error';
    }
  }
}

// Re-export exported types from multer declarations (non-global types)
// Types come from multer-types.d.ts (declaration file)
export type {
  MulterFile,
  MulterRequest,
  StorageEngine,
  DiskStorageOptions,
  MemoryStorageOptions,
  MulterOptions,
  FileFilterCallback,
  RequestHandler,
  Field,
  Multer
} from './multer-types';
