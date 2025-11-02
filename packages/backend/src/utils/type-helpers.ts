// src/utils/type-helpers.ts
/**
 * @deprecated Use imports from services/infrastructure/types instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 */

// Re-export request helpers
export {
  getRequestProps,
  reqProps,
  getValidatedBody,
  getValidatedQuery,
  getValidatedParams
} from '../services/infrastructure/types/features/requestGuards.service';

// Re-export request accessors
export {
  getRequestBody,
  getRequestQuery,
  getRequestParams,
  getRequestHeaders,
  getRequestIp,
  getRequestHostname,
  getRequestPath,
  getRequestUrl
} from '../services/infrastructure/types/core/typeGuards.service';

// Re-export Multer file utilities
export {
  MulterFile,
  isMulterFile,
  getMulterFile,
  isMulterFileArray,
  isImageFile,
  isDocumentFile,
  isFileSizeValid
} from '../services/infrastructure/types/utils/fileTypes';
