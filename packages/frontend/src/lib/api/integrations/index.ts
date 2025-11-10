// src/lib/api/integrations/index.ts
// Integrations API barrel export

import blockchainIntegrationApi from './blockchain';
import domainIntegrationApi from './domains';

export * from './blockchain';
export * from './domains';

export const integrationsApi = {
  blockchain: blockchainIntegrationApi,
  domains: domainIntegrationApi
};

export default integrationsApi;
