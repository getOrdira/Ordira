// src/lib/api/features/blockchain/index.ts
// Blockchain API barrel export

import blockchainContractsApi from './blockchainContracts.api';

export * from './blockchainContracts.api';

export { blockchainContractsApi };

export const blockchainApi = {
  contracts: blockchainContractsApi,
};

export default blockchainApi;

