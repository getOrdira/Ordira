// src/services/utils/pagination.service.ts
/**
 * @deprecated Use imports from services/infrastructure/database instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 */

export {
  PaginationService,
  paginationService,
  type CursorPaginationOptions,
  type CursorPaginationResult,
  type OffsetPaginationOptions,
  type OffsetPaginationResult
} from '../infrastructure/database/features/pagination.service';
