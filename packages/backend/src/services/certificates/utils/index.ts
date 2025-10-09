/**
 * Certificate Utils Module
 *
 * Centralized exports for all certificate utility functions
 */

import { CertificateHelpersService } from './certificateHelpers.service';
import { ImageGeneratorService } from './imageGenerator.service';
import { MetadataGeneratorService } from './metadataGenerator.service';

// Certificate Helpers - Validation & Plan Limits
export {
  CertificateHelpersService,
  certificateHelpersService,
  validateRecipient,
  validateProductOwnership,
  getOwnershipStatus,
  getTransferHealth,
  getCertificateNextSteps,
  getTransferUsage,
  getTransferLimits,
  getPlanLimits,
  calculateEstimatedGasCost,
  calculateMonthlyGrowth,
  generateWeb3Insights,
  generateWeb3Recommendations
} from './certificateHelpers.service';

// Metadata Generator - NFT Metadata Creation
export {
  MetadataGeneratorService,
  metadataGeneratorService,
  generateNFTMetadata,
  storeNFTMetadataInS3,
  getMetadataUri,
  updateMetadataImage,
  addMetadataAttributes,
  type MetadataOptions,
  type NFTMetadata
} from './metadataGenerator.service';

// Image Generator - Certificate Image Creation
export {
  ImageGeneratorService,
  imageGeneratorService,
  generateCertificateSVG,
  generateDefaultCertificateImage,
  generateCustomCertificate,
  getCertificateLevelColor,
  isValidCertificateLevel,
  getAvailableTemplates,
  generateCertificatePreviewUrl,
  type ImageGenerationOptions,
  type CertificateImageResult
} from './imageGenerator.service';

// Re-export all service instances as a single object for convenience
export const certificateUtils = {
  helpers: CertificateHelpersService,
  metadata: MetadataGeneratorService,
  images: ImageGeneratorService
};
