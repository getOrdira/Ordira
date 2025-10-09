/**
 * Certificate Validation Module
 
 */

import { CertificateValidationService } from './certificateValidation.service';
import { PlanValidationService } from './planValidation.service';
import { RecipientValidationService } from './recipientValidation.service';

// Certificate Validation - Core certificate validation
export {
  CertificateValidationService,
  certificateValidationService,
  checkDuplicateCertificate,
  validateCertificateOwnership,
  validateProductOwnership,
  validateTransferParameters,
  validateWalletAddress,
  validateRelayerWallet,
  validateCertificateTransferable,
  validateCertificateMetadata,
  validateBatchInputs
} from './certificateValidation.service';

// Plan Validation - Plan limits and quotas
export {
  PlanValidationService,
  planValidationService,
  getPlanLimits,
  getTransferLimits,
  getBatchLimits,
  planHasWeb3Features,
  planAllowsOverage,
  validateCertificateQuota,
  validateTransferQuota,
  validateBatchSize,
  validateWeb3Access,
  validateAutoTransferAccess,
  getUpgradeRecommendation,
  validateFeatureAccess,
  type PlanLimits,
  type TransferLimits,
  type BatchLimits
} from './planValidation.service';

// Recipient Validation - Recipient address validation
export {
  RecipientValidationService,
  recipientValidationService,
  validateEmail,
  validatePhoneNumber,
  validateWalletAddress as validateRecipientWallet,
  validateRecipient,
  validateContactMethod,
  validateBatchRecipients,
  checkDuplicateRecipients,
  sanitizeRecipient,
  validateRecipientNotBlacklisted,
  validateEmailDomain,
  detectContactMethod,
  type ContactMethod,
  type RecipientValidationResult,
  type BatchRecipientValidationResult
} from './recipientValidation.service';

// Re-export all service instances as a single object for convenience
export const certificateValidation = {
  certificate: CertificateValidationService,
  plan: PlanValidationService,
  recipient: RecipientValidationService
};
