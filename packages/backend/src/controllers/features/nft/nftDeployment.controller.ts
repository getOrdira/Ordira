// src/controllers/features/nft/nftDeployment.controller.ts
// Controller for NFT contract deployment operations

import { Response, NextFunction } from 'express';
import { NftBaseController, NftBaseRequest } from './nftBase.controller';

interface DeployContractRequest extends NftBaseRequest {
  validatedBody: {
    name: string;
    symbol: string;
    baseUri: string;
    description?: string;
    royaltyPercentage?: number;
    maxSupply?: number;
    mintPrice?: number;
    enablePublicMint?: boolean;
  };
}

/**
 * NftDeploymentController exposes deployment operations aligned with NFT service.
 */
export class NftDeploymentController extends NftBaseController {
  /**
   * Deploy a new NFT contract
   */
  async deployContract(
    req: DeployContractRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      this.ensureAuthenticated(req, ['business']);

      const businessId = this.resolveBusinessId(req);
      this.ensureBusinessId(businessId);

      const params = req.validatedBody;

      // Validate required fields
      if (!params.name?.trim()) {
        throw { statusCode: 400, message: 'Contract name is required' };
      }
      if (!params.symbol?.trim()) {
        throw { statusCode: 400, message: 'Contract symbol is required' };
      }
      if (!params.baseUri?.trim()) {
        throw { statusCode: 400, message: 'Base URI is required' };
      }

      // Check if business already has contracts
      const existingContracts = await this.nftService.listContracts(businessId);
      if (existingContracts.length >= 5) {
        throw {
          statusCode: 400,
          message: 'Maximum number of active NFT contracts reached',
        };
      }

      this.recordPerformance(req, 'DEPLOY_NFT_CONTRACT');

      const deployment = await this.nftService.deployContract(params, businessId);

      this.logAction(req, 'DEPLOY_NFT_CONTRACT_SUCCESS', {
        businessId,
        contractAddress: deployment.contractAddress,
        contractId: deployment.contractId,
      });

      this.sendSuccess(res, { deployment }, 'NFT contract deployed successfully', this.getRequestMeta(req), 201);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  }
}

export const nftDeploymentController = new NftDeploymentController();

