// src/services/utils/index.ts
/**
 * Backward Compatibility Shim
 *
 * This file provides backward compatibility for existing imports
 * from the /services/utils folder. All utilities have been migrated to
 * /services/infrastructure/ following the modular architecture.
 *
 * @deprecated Use imports from services/infrastructure/ instead
 */

// Re-export bootstrap services for backward compatibility
export {
  AppBootstrapService
} from '../infrastructure/bootstrap/core/appBootstrap.service';

export {
  ServerStartupService
} from '../infrastructure/bootstrap/core/serverStartup.service';

export {
  DatabaseInitService
} from '../infrastructure/bootstrap/core/databaseInit.service';

// Re-export configuration service for backward compatibility
export {
  ConfigService,
  configService
} from '../infrastructure/config/core/config.service';

// Re-export dependency injection for backward compatibility
export {
  DIContainer,
  container,
  SERVICE_TOKENS,
  type ServiceToken,
  type ServiceConstructor,
  type ServiceFactory,
  type ServiceInstance
} from '../infrastructure/dependency-injection/core/diContainer.service';

// Re-export pagination service for backward compatibility
export {
  PaginationService,
  paginationService,
  type CursorPaginationOptions,
  type CursorPaginationResult,
  type OffsetPaginationOptions,
  type OffsetPaginationResult
} from '../infrastructure/database/features/pagination.service';

// Re-export shared utilities for backward compatibility
export {
  UtilsService,
  generateCode,
  formatFileSize
} from '../infrastructure/shared/core/utils.service';

