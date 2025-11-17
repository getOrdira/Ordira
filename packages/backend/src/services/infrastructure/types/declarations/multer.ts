// services/infrastructure/types/declarations/multer.ts
// Runtime code for multer types (classes and implementations)

/**
 * Multer error class for handling file upload errors
 * This class is used at runtime, so it must be in a .ts file (not .d.ts)
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

