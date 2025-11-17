// services/infrastructure/types/declarations/index.ts
/**
 * Type Declarations Module
 * 
 * Global TypeScript declaration files for Express, Multer, and framework augmentations
 * These files augment global namespaces and module declarations at compile time
 */

// Note: .d.ts files are automatically included by TypeScript
// This index file is for documentation and potential re-exports of non-global types

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

// MulterError class comes from multer.ts (runtime code)
export { MulterError } from './multer';
