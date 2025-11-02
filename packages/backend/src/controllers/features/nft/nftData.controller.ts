// src/controllers/features/nft/nftData.controller.ts
// Controller for NFT data operations

import { Response, NextFunction } from 'express';
import { NftBaseController, NftBaseRequest } from './nftBase.controller';

interface ListCertificatesRequest extends NftBaseRequest {
  validatedQuery?: {
    productId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
    page?: number;
  };
}

interface GetContractMetadataRequest extends NftBaseRequest {
  validatedParams?: {
    contractAddress: string;
  };
  validatedQuery?: {
    contractAddress?: string;
  };
}

interface GetTokenURIRequest extends NftBaseRequest {
  validatedParams: {
    contractAddress: string;
    tokenId: string;
  };
}

interface GetTokenOwnerRequest extends NftBaseRequest {
  validatedParams: {
    contractAddress: string;
    tokenId: string;
  };
}

interface VerifyNftRequest extends NftBaseRequest {
  validatedParams: {
    contractAddress: string;
    tokenId: string;
  };
}

/**
 * NftDataController exposes data operations aligned with NFT service.
 */
export class NftDataController extends NftBaseController {
  /**
   * List certificates (NFTs) for a business
   */
  async listCertificates(
    req: ListCertificatesRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const businessId = this.resolveBusinessId(req);
      this.ensureBusinessId(businessId);

      const pagination = this.parsePagination(req.validatedQuery, 20);
      const query = req.validatedQuery ?? {};

      const options = {
        productId: this.parseString(query.productId),
        status: this.parseString(query.status),
        sortBy: this.parseString(query.sortBy) || 'createdAt',
        sortOrder: (this.parseString(query.sortOrder) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
        limit: pagination.limit,
        offset: pagination.offset,
      };

      this.recordPerformance(req, 'LIST_CERTIFICATES');

      const result = await this.nftService.listCertificates(businessId, options);

      const paginationMeta = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.total
      );

      this.logAction(req, 'LIST_CERTIFICATES_SUCCESS', {
        businessId,
        total: result.total,
      });

      return {
        certificates: result.certificates,
        pagination: paginationMeta,
        total: result.total,
      };
    }, res, 'Certificates retrieved', this.getRequestMeta(req));
  }

  /**
   * List NFT contracts for a business
   */
  async listContracts(
    req: NftBaseRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const businessId = this.resolveBusinessId(req);
      this.ensureBusinessId(businessId);

      this.recordPerformance(req, 'LIST_CONTRACTS');

      const contracts = await this.nftService.listContracts(businessId, {});

      this.logAction(req, 'LIST_CONTRACTS_SUCCESS', {
        businessId,
        count: contracts.length,
      });

      return { contracts };
    }, res, 'Contracts retrieved', this.getRequestMeta(req));
  }

  /**
   * Get contract metadata
   */
  async getContractMetadata(
    req: GetContractMetadataRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const contractAddress =
        req.validatedParams?.contractAddress || req.validatedQuery?.contractAddress;
      if (!contractAddress) {
        throw { statusCode: 400, message: 'Contract address is required' };
      }
      this.validateAddress(contractAddress, 'contract address');

      const businessId = this.resolveBusinessId(req);

      this.recordPerformance(req, 'GET_CONTRACT_METADATA');

      const metadata = await this.nftService.getContractMetadata(
        contractAddress,
        businessId || undefined
      );

      this.logAction(req, 'GET_CONTRACT_METADATA_SUCCESS', {
        contractAddress,
        businessId,
      });

      return { metadata };
    }, res, 'Contract metadata retrieved', this.getRequestMeta(req));
  }

  /**
   * Get token URI
   */
  async getTokenURI(req: GetTokenURIRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const contractAddress = this.resolveContractAddress(req);
      const tokenId = this.resolveTokenId(req);

      this.recordPerformance(req, 'GET_TOKEN_URI');

      const tokenURI = await this.nftService.getTokenURI(contractAddress, tokenId);

      this.logAction(req, 'GET_TOKEN_URI_SUCCESS', {
        contractAddress,
        tokenId,
      });

      return { tokenURI };
    }, res, 'Token URI retrieved', this.getRequestMeta(req));
  }

  /**
   * Get token owner
   */
  async getTokenOwner(
    req: GetTokenOwnerRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const contractAddress = this.resolveContractAddress(req);
      const tokenId = this.resolveTokenId(req);

      this.recordPerformance(req, 'GET_TOKEN_OWNER');

      const owner = await this.nftService.getTokenOwner(contractAddress, tokenId);

      this.logAction(req, 'GET_TOKEN_OWNER_SUCCESS', {
        contractAddress,
        tokenId,
        owner,
      });

      return { owner };
    }, res, 'Token owner retrieved', this.getRequestMeta(req));
  }

  /**
   * Verify NFT authenticity
   */
  async verifyNft(req: VerifyNftRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const contractAddress = this.resolveContractAddress(req);
      const tokenId = this.resolveTokenId(req);

      this.recordPerformance(req, 'VERIFY_NFT');

      const verification = await this.nftService.verifyNftAuthenticity(contractAddress, tokenId);

      this.logAction(req, 'VERIFY_NFT_SUCCESS', {
        contractAddress,
        tokenId,
        isAuthentic: verification.isAuthentic,
      });

      return { verification };
    }, res, 'NFT verification completed', this.getRequestMeta(req));
  }
}

export const nftDataController = new NftDataController();

