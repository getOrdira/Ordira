// src/controllers/features/nft/nftMinting.controller.ts
// Controller for NFT minting operations

import { Response, NextFunction } from 'express';
import { NftBaseController, NftBaseRequest } from './nftBase.controller';

interface MintNftRequest extends NftBaseRequest {
  validatedBody: {
    productId: string;
    recipient: string;
    quantity?: number;
    metadata?: {
      name?: string;
      description?: string;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
        display_type?: string;
      }>;
    };
    certificateTemplate?: string;
    customMessage?: string;
  };
}

/**
 * NftMintingController exposes minting operations aligned with NFT service.
 */
export class NftMintingController extends NftBaseController {
  /**
   * Mint an NFT (certificate)
   */
  async mintNft(req: MintNftRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureAuthenticated(req, ['business']);

      const businessId = this.resolveBusinessId(req);
      this.ensureBusinessId(businessId);

      const params = req.validatedBody;

      // Validate required fields
      if (!params.productId?.trim()) {
        throw { statusCode: 400, message: 'Product ID is required' };
      }
      if (!params.recipient?.trim()) {
        throw { statusCode: 400, message: 'Recipient address is required' };
      }

      // Validate recipient address format
      this.validateAddress(params.recipient, 'recipient address');

      this.recordPerformance(req, 'MINT_NFT');

      const mintResult = await this.nftService.mintNft(businessId, params);

      this.logAction(req, 'MINT_NFT_SUCCESS', {
        businessId,
        tokenId: mintResult.tokenId,
        recipient: mintResult.recipient,
        contractAddress: mintResult.contractAddress,
      });

      this.sendSuccess(res, { mint: mintResult }, 'NFT minted successfully', this.getRequestMeta(req), 201);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  }
}

export const nftMintingController = new NftMintingController();

