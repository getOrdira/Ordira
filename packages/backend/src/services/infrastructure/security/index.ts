import { securityEventDataService } from './core/securityEventData.service';
import { sessionDataService } from './core/sessionData.service';
import { tokenBlacklistDataService } from './core/tokenBlacklistData.service';
import { securityScanDataService } from './core/securityScanData.service';
import { securityEventLoggerService } from './features/securityEventLogger.service';
import { sessionManagementService } from './features/sessionManagement.service';
import { tokenRevocationService } from './features/tokenRevocation.service';
import { securityAnalyticsService } from './features/securityAnalytics.service';
import { securityScanningService } from './features/securityScanning.service';
import { securityValidationService } from './validation/securityValidation.service';
import { securityScanValidationService } from './validation/securityScanValidation.service';

export {
  SecurityEventDataService,
  securityEventDataService
} from './core/securityEventData.service';
export {
  SessionDataService,
  sessionDataService
} from './core/sessionData.service';
export {
  TokenBlacklistDataService,
  tokenBlacklistDataService
} from './core/tokenBlacklistData.service';
export {
  SecurityScanDataService,
  securityScanDataService
} from './core/securityScanData.service';

export {
  SecurityEventLoggerService,
  securityEventLoggerService
} from './features/securityEventLogger.service';
export {
  SessionManagementService,
  sessionManagementService
} from './features/sessionManagement.service';
export {
  TokenRevocationService,
  tokenRevocationService
} from './features/tokenRevocation.service';
export {
  SecurityAnalyticsService,
  securityAnalyticsService
} from './features/securityAnalytics.service';
export {
  SecurityScanningService,
  securityScanningService
} from './features/securityScanning.service';

export * from './utils/securityTypes';
export * from './utils/securityConfig';
export {
  shouldInvalidateSessions,
  extractTokenId,
  calculateRiskScore,
  resolveEventExpiry,
  resolveSessionExpiry
} from './utils/securityHelpers';

export {
  SecurityValidationService,
  securityValidationService
} from './validation/securityValidation.service';
export {
  SecurityScanValidationService,
  securityScanValidationService
} from './validation/securityScanValidation.service';

export const securityServices = {
  securityEventDataService,
  sessionDataService,
  tokenBlacklistDataService,
  securityScanDataService,
  securityEventLoggerService,
  sessionManagementService,
  tokenRevocationService,
  securityAnalyticsService,
  securityScanningService,
  securityValidationService,
  securityScanValidationService
};

export type SecurityServices = typeof securityServices;

