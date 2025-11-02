// src/controllers/features/nft/nftBurning.controller.ts
// Controller for NFT burning operations

import { Response, NextFunction } from 'express';
import { NftBaseController, NftBaseRequest } from './nftBase.controller';

interface BurnNftRequest extends NftBaseRequest {
  validatedBody: {
    tokenId: string;
    contractAddress: string;
    reason?: string;
  };
}

/**
 * NftBurningController exposes burning operations aligned with NFT service.
 */
export class NftBurningController extends NftBaseController {
  /**
   * Burn an NFT
   */
  async burnNft(req: BurnNftRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business']);

      const businessId = this.resolveBusinessId(req);
      this.ensureBusinessId(businessId);

      const params = req.validatedBody;

      // Validate addresses
      this.validateAddress(params.contractAddress, 'contract address');

      if (!params.tokenId?.trim()) {
        throw { statusCode: 400, message: 'Token ID is required' };
      }

      this.recordPerformance(req, 'BURN_NFT');

      // Use static method for burning
      const { NftService } = await import('../../../services/blockchain/nft.service');
      const burnResult = await NftService.burnNft(businessId, {
        tokenId: params.tokenId,
        contractAddress: params.contractAddress,
        reason: params.reason,
      });

      this.logAction(req, 'BURN_NFT_SUCCESS', {
        businessId,
        tokenId: params.tokenId,
        contractAddress: params.contractAddress,
      });

      return { burn: burnResult };
    }, res, 'NFT burned successfully', this.getRequestMeta(req));
  }
}

export const nftBurningController = new NftBurningController();

