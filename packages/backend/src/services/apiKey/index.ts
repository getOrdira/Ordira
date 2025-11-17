// src/services/apiKey/index.ts
// API Key services aggregation and exports

import { apiKeyDataService } from './core/apiKeyData.service';
import { apiKeyUsageService } from './features/apiKeyUsage.service';
import { apiKeyManagementService } from './features/apiKeyManagement.service';
import { apiKeyValidationService } from './validation/apiKeyValidation.service';

export {
  ApiKeyDataService,
  apiKeyDataService
} from './core/apiKeyData.service';
export {
  ApiKeyUsageService,
  apiKeyUsageService
} from './features/apiKeyUsage.service';
export {
  ApiKeyManagementService,
  apiKeyManagementService
} from './features/apiKeyManagement.service';
export {
  ApiKeyValidationService,
  apiKeyValidationService
} from './validation/apiKeyValidation.service';

export * from './utils/types';

export { getApiKeyLimits, getPlanPermissions } from './utils/planHelpers';
export {
  generateCSV,
  formatApiKeyForExport,
  performApiKeyTests,
  generateTestRecommendations,
  calculateDailyAverage,
  convertToCSV
} from './utils/exportHelpers';

export const apiKeyServices = {
  core: {
    data: apiKeyDataService
  },
  features: {
    usage: apiKeyUsageService,
    management: apiKeyManagementService
  },
  validation: apiKeyValidationService
};

