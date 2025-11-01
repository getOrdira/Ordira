// src/controllers/integrations/blockchain/blockchainIntegrationBase.controller.ts
// Shared helpers for blockchain integration controllers

import { IntegrationsBaseController, IntegrationsBaseRequest } from '../integrationsBase.controller';

export abstract class BlockchainIntegrationBaseController extends IntegrationsBaseController {
  protected requireAddress(value: unknown): string {
    const address = this.parseString(value);
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      throw { statusCode: 400, message: 'A valid hex-encoded address is required' };
    }
    return address;
  }

  protected requireTransactionHash(value: unknown): string {
    const hash = this.parseString(value);
    if (!hash || !hash.startsWith('0x') || hash.length !== 66) {
      throw { statusCode: 400, message: 'A valid transaction hash is required' };
    }
    return hash;
  }
}

export type BlockchainIntegrationBaseRequest = IntegrationsBaseRequest;

