
// src/controllers/nfts.controller.ts

import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { NftService } from '../services/blockchain/nft.service';

// Initialize service
const nftService = new NftService();

/**
 * Extended request interfaces for type safety
 */
interface TenantNFTRequest extends Request, UnifiedAuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface DeployNFTRequest extends TenantNFTRequest, ValidatedRequest {
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

interface MintNFTRequest extends TenantNFTRequest, ValidatedRequest {
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
  };
}

interface NFTListRequest extends TenantNFTRequest, ValidatedRequest {
  validatedQuery: {
    productId?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'tokenId' | 'mintedAt';
    sortOrder?: 'asc' | 'desc';
  };
}

interface TransferNFTRequest extends TenantNFTRequest, ValidatedRequest {
  validatedBody: {
    tokenId: string;
    fromAddress: string;
    toAddress: string;
    contractAddress: string;
  };
}

/**
 * Deploy a new NFT contract for the business
 * POST /api/nfts/deploy
 * 
 * @requires authentication & tenant context
 * @requires validation: contract deployment parameters
 * @returns { contract, deploymentTransaction, estimatedGas }
 */
export const deployNft = asyncHandler(async (
  req: DeployNFTRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract validated deployment parameters
  const deploymentParams = req.validatedBody;

  // Check if business already has an active NFT contract
  const existingContracts = await nftService.listContracts(businessId);
  const activeContracts = existingContracts.filter(contract => contract.status === 'active');
  
  if (activeContracts.length >= 5) { // Limit per business
    throw createAppError('Maximum number of active NFT contracts reached', 400, 'CONTRACT_LIMIT_EXCEEDED');
  }

  // Deploy contract through service
  const deploymentResult = await nftService.deployContract(deploymentParams, businessId);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'NFT contract deployed successfully',
    data: {
              contract: {
        id: deploymentResult.contractId,
        address: deploymentResult.contractAddress,
        name: deploymentResult.name,
        symbol: deploymentResult.symbol,
        baseUri: deploymentResult.baseUri,
        maxSupply: deploymentResult.maxSupply,
        status: deploymentResult.status,
        deployedAt: deploymentResult.deployedAt
      },
      transaction: {
        hash: deploymentResult.transactionHash,
        blockNumber: deploymentResult.blockNumber,
        gasUsed: deploymentResult.gasUsed,
        gasPrice: deploymentResult.gasPrice
      },
      estimatedCosts: {
        deploymentCost: deploymentResult.deploymentCost,
        estimatedMintCost: deploymentResult.estimatedMintCost
      }
    }
  });
});

/**
 * List all NFT contracts for the business
 * GET /api/nfts/contracts
 * 
 * @requires authentication & tenant context
 * @optional query: filtering and pagination
 * @returns { contracts[], stats, blockchain }
 */
export const listNftContracts = asyncHandler(async (
  req: TenantNFTRequest & { query: { status?: string; page?: string; limit?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract query parameters
  const status = req.query.status;
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);

  // Get contracts through service
  const contracts = await nftService.listContracts(businessId, { status, page, limit });
  const contractStats = await NftService.getContractStatistics(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'NFT contracts retrieved successfully',
    data: {
      contracts: contracts.map(contract => ({
        id: contract._id?.toString(),
        address: contract.contractAddress,
        name: contract.name,
        symbol: contract.symbol,
        status: contract.status,
        totalSupply: contract.totalSupply,
        maxSupply: contract.maxSupply,
        deployedAt: contract.deployedAt,
        lastMintedAt: contract.lastMintedAt
      })),
      stats: contractStats,
      pagination: {
        page,
        limit,
        total: contracts.length
      },
      blockchain: {
        network: process.env.BLOCKCHAIN_NETWORK || 'ethereum',
        chainId: process.env.CHAIN_ID || '1'
      }
    }
  });
});

/**
 * Mint a new NFT certificate
 * POST /api/nfts/mint
 * 
 * @requires authentication & tenant context
 * @requires validation: minting parameters
 * @returns { nft, transaction, certificate }
 */
export const mintNft = asyncHandler(async (
  req: MintNFTRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract validated minting parameters
  const mintingParams = req.validatedBody;

  // Validate product ownership
  const productOwnership = await NftService.verifyProductOwnership(
    mintingParams.productId, 
    businessId
  );
  
  if (!productOwnership.isOwner) {
    throw createAppError('Product not found or access denied', 403, 'PRODUCT_ACCESS_DENIED');
  }

  // Check minting limits and permissions
  const mintingEligibility = await NftService.checkMintingEligibility(
    businessId,
    mintingParams.productId
  );
  
  if (!mintingEligibility.canMint) {
    throw createAppError(
      mintingEligibility.reason || 'Minting not allowed', 
      400, 
      'MINTING_NOT_ALLOWED'
    );
  }

  // Mint NFT through service
  const mintResult = await nftService.mintNft(businessId, mintingParams);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'NFT minted successfully',
    data: {
      nft: {
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        recipient: mintResult.recipient,
        metadata: mintResult.metadata,
        mintedAt: mintResult.mintedAt
      },
      transaction: {
        hash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        gasUsed: mintResult.gasUsed,
        gasPrice: mintResult.gasPrice,
        totalCost: mintResult.totalCost
      },
      certificate: {
        id: mintResult.certificateId,
        productId: mintingParams.productId,
        certificationDate: mintResult.mintedAt,
        verificationUrl: mintResult.verificationUrl
      }
    }
  });
});

/**
 * List NFT certificates with filtering
 * GET /api/nfts/certificates
 * 
 * @requires authentication & tenant context
 * @optional query: productId, status, pagination
 * @returns { certificates[], analytics, verification }
 */
export const listCertificates = asyncHandler(async (
  req: NFTListRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract query parameters
  const queryParams = req.validatedQuery || {};
  const page = queryParams.page || 1;
  const limit = Math.min(queryParams.limit || 20, 100);
  const offset = (page - 1) * limit;

  // Build filter options
  const filterOptions = {
    productId: queryParams.productId,
    status: queryParams.status,
    sortBy: queryParams.sortBy || 'createdAt',
    sortOrder: queryParams.sortOrder || 'desc',
    limit,
    offset
  };

  // Get certificates through service
  const result = await nftService.listCertificates(businessId, filterOptions);
  const certificateAnalytics = await nftService.getCertificateAnalytics(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'NFT certificates retrieved successfully',
    data: {
      certificates: result.certificates.map(cert => ({
        id: cert._id?.toString(),
        tokenId: cert.tokenId,
        contractAddress: cert.contractAddress,
        productId: cert.productId,
        recipient: cert.recipient,
        status: cert.status,
        metadata: cert.metadata,
        mintedAt: cert.mintedAt,
        verificationUrl: cert.verificationUrl,
        transactionHash: cert.transactionHash
      })),
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1
      },
      analytics: certificateAnalytics,
      filters: {
        productId: queryParams.productId,
        status: queryParams.status
      }
    }
  });
});

/**
 * Transfer NFT ownership
 * POST /api/nfts/transfer
 * 
 * @requires authentication & tenant context
 * @requires validation: transfer parameters
 * @returns { transfer, transaction, newOwnership }
 */
export const transferNft = asyncHandler(async (
  req: TransferNFTRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract validated transfer parameters
  const transferParams = req.validatedBody;

  // Verify ownership and transfer eligibility
  const transferEligibility = await NftService.verifyTransferEligibility(
    transferParams.tokenId,
    transferParams.contractAddress,
    transferParams.fromAddress,
    businessId
  );

  if (!transferEligibility.canTransfer) {
    throw createAppError(
      transferEligibility.reason || 'Transfer not allowed',
      403,
      'TRANSFER_NOT_ALLOWED'
    );
  }

  // Execute transfer through service
  const transferResult = await nftService.transferNft(businessId, transferParams);

  // Return standardized response
  res.json({
    success: true,
    message: 'NFT transferred successfully',
    data: {
      transfer: {
        tokenId: transferParams.tokenId,
        contractAddress: transferParams.contractAddress,
        fromAddress: transferParams.fromAddress,
        toAddress: transferParams.toAddress,
        transferredAt: transferResult.transferredAt
      },
      transaction: {
        hash: transferResult.transactionHash,
        blockNumber: transferResult.blockNumber,
        gasUsed: transferResult.gasUsed,
        gasPrice: transferResult.gasPrice
      },
      newOwnership: {
        owner: transferParams.toAddress,
        verificationUrl: transferResult.verificationUrl,
        ownershipProof: transferResult.ownershipProof
      }
    }
  });
});

/**
 * Get NFT analytics and insights
 * GET /api/nfts/analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range, metrics
 * @returns { analytics, trends, performance }
 */
export const getNftAnalytics = asyncHandler(async (
  req: TenantNFTRequest & {
    query: {
      startDate?: string;
      endDate?: string;
      metrics?: string;
      contractAddress?: string;
    };
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
  const metrics = req.query.metrics?.split(',') || ['mints', 'transfers', 'revenue'];
  const contractAddress = req.query.contractAddress;

  // Get analytics through service
  const analytics = await nftService.getAnalytics(businessId, {
    startDate,
    endDate,
    metrics,
    contractAddress
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'NFT analytics retrieved successfully',
    data: {
      summary: analytics.summary,
      trends: analytics.trends,
      performance: analytics.performance,
      topProducts: analytics.topProducts,
      recentActivity: analytics.recentActivity,
      dateRange: {
        from: startDate?.toISOString(),
        to: endDate?.toISOString()
      },
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Verify NFT authenticity
 * GET /api/nfts/verify/:tokenId
 * 
 * @requires authentication & tenant context
 * @requires params: { tokenId: string }
 * @returns { verification, authenticity, metadata }
 */
export const verifyNft = asyncHandler(async (
  req: TenantNFTRequest & { params: { tokenId: string }; query: { contractAddress?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { tokenId } = req.params;
  const contractAddress = req.query.contractAddress;

  if (!contractAddress) {
    throw createAppError('Contract address is required for verification', 400, 'MISSING_CONTRACT_ADDRESS');
  }

  // Verify NFT through service
  const verification = await nftService.verifyNftAuthenticity(tokenId, contractAddress);

  // Return standardized response
  res.json({
    success: true,
    message: 'NFT verification completed',
    data: {
      verification: {
        isAuthentic: verification.isAuthentic,
        tokenId,
        contractAddress,
        owner: verification.owner,
        mintedAt: verification.mintedAt,
        verifiedAt: new Date().toISOString()
      },
      metadata: verification.metadata,
      blockchain: {
        network: verification.network,
        blockNumber: verification.blockNumber,
        transactionHash: verification.transactionHash
      },
      certificate: verification.certificate
    }
  });
});

/**
 * Burn/destroy an NFT
 * DELETE /api/nfts/:tokenId
 * 
 * @requires authentication & tenant context
 * @requires params: { tokenId: string }
 * @returns { burned, transaction, reclaimed }
 */
export const burnNft = asyncHandler(async (
  req: TenantNFTRequest & { 
    params: { tokenId: string }; 
    body: { contractAddress: string; reason?: string } 
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { tokenId } = req.params;
  const { contractAddress, reason } = req.body;

  // Verify burn eligibility
  const burnEligibility = await NftService.verifyBurnEligibility(
    tokenId,
    contractAddress,
    businessId
  );

  if (!burnEligibility.canBurn) {
    throw createAppError(
      burnEligibility.reason || 'Burn not allowed',
      403,
      'BURN_NOT_ALLOWED'
    );
  }

  // Execute burn through service
  const burnResult = await NftService.burnNft(businessId, {
    tokenId,
    contractAddress,
    reason
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'NFT burned successfully',
    data: {
      burned: {
        tokenId,
        contractAddress,
        burnedAt: burnResult.burnedAt,
        reason: reason || 'No reason provided'
      },
      transaction: {
        hash: burnResult.transactionHash,
        blockNumber: burnResult.blockNumber,
        gasUsed: burnResult.gasUsed
      },
      reclaimed: {
        storageReclaimed: burnResult.storageReclaimed,
        costsRecovered: burnResult.costsRecovered
      }
    }
  });
});
