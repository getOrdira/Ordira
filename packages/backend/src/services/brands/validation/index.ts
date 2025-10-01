// src/services/brands/validation/index.ts

export { PlanValidationService } from './planValidation.service';
export { DomainValidationService } from './domainValidation.service';
export { BrandValidationService } from './brandValidation.service';

export type {
  PlanFeatures,
  PlanValidationResult,
  PlanLimitations
} from './planValidation.service';

export type {
  DomainValidationResult,
  SubdomainValidationResult,
  DnsRecord,
  DomainVerificationResult,
  CustomDomainSetup
} from './domainValidation.service';

export type {
  FileValidationResult,
  WalletValidationResult,
  BrandDataValidationResult,
  MediaUploadValidationResult
} from './brandValidation.service';