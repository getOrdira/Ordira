// src/controllers/features/apiKey/index.ts
// API Key controllers aggregation and exports

export {
  ApiKeyBaseController,
  type ApiKeyBaseRequest
} from './apiKeyBase.controller';

export {
  ApiKeyDataController,
  apiKeyDataController
} from './apiKeyData.controller';

export {
  ApiKeyUsageController,
  apiKeyUsageController
} from './apiKeyUsage.controller';

export {
  ApiKeyManagementController,
  apiKeyManagementController
} from './apiKeyManagement.controller';

import { apiKeyDataController } from './apiKeyData.controller';
import { apiKeyUsageController } from './apiKeyUsage.controller';
import { apiKeyManagementController } from './apiKeyManagement.controller';

export const apiKeyControllers = {
  data: apiKeyDataController,
  usage: apiKeyUsageController,
  management: apiKeyManagementController
};

