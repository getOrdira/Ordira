// src/controllers/features/nft/nftTransfer.controller.ts
// Controller for NFT transfer operations

import { Response, NextFunction } from 'express';
import { NftBaseController, NftBaseRequest } from './nftBase.controller';

interface TransferNftRequest extends NftBaseRequest {
  validatedBody: {
    tokenId: string;
    fromAddress: string;
    toAddress: string;
    contractAddress: string;
  };
}

/**
 * NftTransferController exposes transfer operations aligned with NFT service.
 */
export class NftTransferController extends NftBaseController {
  /**
   * Transfer an NFT
   */
  async transferNft(req: TransferNftRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business']);

      const businessId = this.resolveBusinessId(req);
      this.ensureBusinessId(businessId);

      const params = req.validatedBody;

      // Validate addresses
      this.validateAddress(params.contractAddress, 'contract address');
      this.validateAddress(params.fromAddress, 'from address');
      this.validateAddress(params.toAddress, 'to address');

      if (!params.tokenId?.trim()) {
        throw { statusCode: 400, message: 'Token ID is required' };
      }

      this.recordPerformance(req, 'TRANSFER_NFT');

      const transferResult = await this.nftService.transferNft(businessId, params);

      this.logAction(req, 'TRANSFER_NFT_SUCCESS', {
        businessId,
        tokenId: params.tokenId,
        from: params.fromAddress,
        to: params.toAddress,
        txHash: transferResult.transactionHash,
      });

      return { transfer: transferResult };
    }, res, 'NFT transferred successfully', this.getRequestMeta(req));
  }
}

export const nftTransferController = new NftTransferController();

