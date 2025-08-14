// src/routes/nfts.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as nftsCtrl from '../controllers/nfts.controller';
import {
  deployNftSchema,
  mintNftSchema,
  batchMintNftSchema,
  nftContractParamsSchema,
  listNftsQuerySchema,
  transferNftSchema,
  updateNftMetadataSchema
} from '../validation/nfts.validation';

const router = Router();

// Apply dynamic rate limiting to all NFT routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// ===== NFT CONTRACT MANAGEMENT =====

// Deploy new NFT contract (strict rate limiting to prevent spam)
router.post(
  '/deploy',
  strictRateLimiter(), // Prevent contract deployment spam
  validateBody(deployNftSchema),
  nftsCtrl.deployNft
);

// List all NFT contracts for the brand
router.get(
  '/contracts',
  validateQuery(listNftsQuerySchema),
  nftsCtrl.listNftContracts
);

// Get specific NFT contract details
router.get(
  '/contracts/:contractId',
  validateParams(nftContractParamsSchema),
  nftsCtrl.getNftContractDetails
);

// Update NFT contract settings
router.put(
  '/contracts/:contractId',
  validateParams(nftContractParamsSchema),
  validateBody(deployNftSchema.extract(['baseUri', 'royaltyPercentage'])),
  nftsCtrl.updateNftContract
);

// ===== NFT MINTING =====

// Mint single NFT certificate (strict rate limiting)
router.post(
  '/mint',
  strictRateLimiter(), // Prevent minting spam
  validateBody(mintNftSchema),
  nftsCtrl.mintNft
);

// Batch mint NFT certificates (extra strict rate limiting)
router.post(
  '/mint/batch',
  strictRateLimiter(), // Very strict for batch operations
  validateBody(batchMintNftSchema),
  nftsCtrl.batchMintNfts
);

// ===== CERTIFICATE MANAGEMENT =====

// List all issued certificates with filtering
router.get(
  '/certificates',
  validateQuery(listNftsQuerySchema),
  nftsCtrl.listCertificates
);

// Get specific certificate details
router.get(
  '/certificates/:tokenId',
  validateParams(nftContractParamsSchema.extract(['tokenId'])),
  nftsCtrl.getCertificateDetails
);

// Update certificate metadata
router.put(
  '/certificates/:tokenId',
  validateParams(nftContractParamsSchema.extract(['tokenId'])),
  validateBody(updateNftMetadataSchema),
  nftsCtrl.updateCertificateMetadata
);

// Transfer certificate to new owner (strict rate limiting)
router.post(
  '/certificates/:tokenId/transfer',
  strictRateLimiter(), // Security for transfers
  validateParams(nftContractParamsSchema.extract(['tokenId'])),
  validateBody(transferNftSchema),
  nftsCtrl.transferCertificate
);

// Revoke certificate (admin only, extra strict rate limiting)
router.delete(
  '/certificates/:tokenId',
  strictRateLimiter(), // Security for revocation
  validateParams(nftContractParamsSchema.extract(['tokenId'])),
  nftsCtrl.revokeCertificate
);

// ===== ANALYTICS & REPORTING =====

// Get NFT contract analytics
router.get(
  '/analytics/contracts',
  validateQuery(listNftsQuerySchema),
  nftsCtrl.getContractAnalytics
);

// Get certificate issuance analytics
router.get(
  '/analytics/certificates',
  validateQuery(listNftsQuerySchema),
  nftsCtrl.getCertificateAnalytics
);

// Get royalty earnings
router.get(
  '/analytics/royalties',
  validateQuery(listNftsQuerySchema),
  nftsCtrl.getRoyaltyAnalytics
);

// ===== VERIFICATION & VALIDATION =====

// Verify certificate authenticity
router.post(
  '/verify',
  validateBody(mintNftSchema.extract(['tokenId', 'contractAddress'])),
  nftsCtrl.verifyCertificate
);

// Validate certificate ownership
router.post(
  '/validate-ownership',
  validateBody(transferNftSchema),
  nftsCtrl.validateOwnership
);

// ===== MARKETPLACE INTEGRATION =====

// List certificates available for sale
router.get(
  '/marketplace',
  validateQuery(listNftsQuerySchema),
  nftsCtrl.getMarketplaceCertificates
);

// Set certificate for sale
router.post(
  '/certificates/:tokenId/list',
  validateParams(nftContractParamsSchema.extract(['tokenId'])),
  validateBody(transferNftSchema.extract(['price'])),
  nftsCtrl.listCertificateForSale
);

// Remove certificate from sale
router.delete(
  '/certificates/:tokenId/unlist',
  validateParams(nftContractParamsSchema.extract(['tokenId'])),
  nftsCtrl.unlistCertificate
);

export default router;



