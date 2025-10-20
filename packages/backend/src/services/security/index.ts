import { securityEventDataService } from './core/securityEventData.service';
import { sessionDataService } from './core/sessionData.service';
import { tokenBlacklistDataService } from './core/tokenBlacklistData.service';
import { securityEventLoggerService } from './features/securityEventLogger.service';
import { sessionManagementService } from './features/sessionManagement.service';
import { tokenRevocationService } from './features/tokenRevocation.service';
import { securityAnalyticsService } from './features/securityAnalytics.service';
import { securityValidationService } from './validation/securityValidation.service';

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

export * from './utilities/securityTypes';
export * from './utilities/securityConfig';
export {
  shouldInvalidateSessions,
  extractTokenId,
  calculateRiskScore,
  resolveEventExpiry,
  resolveSessionExpiry
} from './utilities/securityHelpers';

export {
  SecurityValidationService,
  securityValidationService
} from './validation/securityValidation.service';

export const securityServices = {
  securityEventDataService,
  sessionDataService,
  tokenBlacklistDataService,
  securityEventLoggerService,
  sessionManagementService,
  tokenRevocationService,
  securityAnalyticsService,
  securityValidationService
};

export type SecurityServices = typeof securityServices;
