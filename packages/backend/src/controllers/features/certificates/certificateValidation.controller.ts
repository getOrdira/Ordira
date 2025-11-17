// src/controllers/features/certificates/certificateValidation.controller.ts
// Certificate validation controller using modular certificate services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getCertificatesServices } from '../../../services/container/container.getters';  

/**
 * Certificate validation request interfaces
 */
interface CheckDuplicateCertificateRequest extends BaseRequest {
  validatedBody: {
    productId: string;
    recipient: string;
  };
}

interface ValidateCertificateOwnershipRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
}

interface ValidateProductOwnershipRequest extends BaseRequest {
  validatedBody: {
    productId: string;
  };
}

interface ValidateTransferParametersRequest extends BaseRequest {
  validatedBody: {
    contractAddress: string;
    tokenId: string;
    brandWallet: string;
  };
}

interface ValidateWalletAddressRequest extends BaseRequest {
  validatedBody: {
    address: string;
  };
}

interface ValidateRelayerWalletRequest extends BaseRequest {
  validatedQuery?: {
    checkConfiguration?: boolean;
  };
}

interface ValidateCertificateTransferableRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
}

interface ValidateCertificateMetadataRequest extends BaseRequest {
  validatedBody: {
    metadata: Record<string, any>;
  };
}

interface ValidateBatchInputsRequest extends BaseRequest {
  validatedBody: {
    inputs: Array<{
      productId: string;
      recipient: string;
      contactMethod: string;
      metadata?: Record<string, any>;
    }>;
  };
}

/**
 * Certificate validation controller
 */
export class CertificateValidationController extends BaseController {
  private certificateValidationService = getCertificatesServices().certificate;

  /**
   * POST /api/certificates/check-duplicate
   * Check if certificate already exists for product and recipient
   */
  async checkDuplicateCertificate(req: CheckDuplicateCertificateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CHECK_DUPLICATE_CERTIFICATE');

        const existingCertificate = await this.certificateValidationService.checkDuplicateCertificate(
          req.businessId!,
          req.validatedBody.productId,
          req.validatedBody.recipient
        );

        const isDuplicate = existingCertificate !== null;

        this.logAction(req, 'CHECK_DUPLICATE_CERTIFICATE_SUCCESS', {
          businessId: req.businessId,
          productId: req.validatedBody.productId,
          recipient: req.validatedBody.recipient,
          isDuplicate
        });

        return { 
          isDuplicate,
          existingCertificate: existingCertificate ? {
            id: existingCertificate._id,
            createdAt: existingCertificate.createdAt,
            status: existingCertificate.status
          } : null
        };
      });
    }, res, 'Duplicate certificate check completed', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/:certificateId/validate-ownership
   * Validate certificate exists and belongs to business
   */
  async validateCertificateOwnership(req: ValidateCertificateOwnershipRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_CERTIFICATE_OWNERSHIP');

        const certificate = await this.certificateValidationService.validateCertificateOwnership(
          req.validatedParams.certificateId,
          req.businessId!
        );

        this.logAction(req, 'VALIDATE_CERTIFICATE_OWNERSHIP_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId,
          status: certificate.status
        });

        return { 
          isValid: true,
          certificate: {
            id: certificate._id,
            status: certificate.status,
            recipient: certificate.recipient,
            createdAt: certificate.createdAt
          }
        };
      });
    }, res, 'Certificate ownership validated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/validate-product-ownership
   * Validate product ownership by business
   */
  async validateProductOwnership(req: ValidateProductOwnershipRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_PRODUCT_OWNERSHIP');

        const isValid = await this.certificateValidationService.validateProductOwnership(
          req.businessId!,
          req.validatedBody.productId
        );

        this.logAction(req, 'VALIDATE_PRODUCT_OWNERSHIP_SUCCESS', {
          businessId: req.businessId,
          productId: req.validatedBody.productId,
          isValid
        });

        return { isValid };
      });
    }, res, 'Product ownership validation completed', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/validate-transfer-parameters
   * Validate transfer parameters
   */
  async validateTransferParameters(req: ValidateTransferParametersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_TRANSFER_PARAMETERS');

        const validation = this.certificateValidationService.validateTransferParameters(
          req.validatedBody.contractAddress,
          req.validatedBody.tokenId,
          req.validatedBody.brandWallet
        );

        this.logAction(req, 'VALIDATE_TRANSFER_PARAMETERS_SUCCESS', {
          businessId: req.businessId,
          contractAddress: req.validatedBody.contractAddress,
          tokenId: req.validatedBody.tokenId,
          valid: validation.valid
        });

        return { validation };
      });
    }, res, 'Transfer parameters validation completed', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/validate-wallet-address
   * Validate wallet address format
   */
  async validateWalletAddress(req: ValidateWalletAddressRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_WALLET_ADDRESS');

        const validation = this.certificateValidationService.validateWalletAddress(
          req.validatedBody.address
        );

        this.logAction(req, 'VALIDATE_WALLET_ADDRESS_SUCCESS', {
          businessId: req.businessId,
          address: req.validatedBody.address,
          valid: validation.valid
        });

        return { validation };
      });
    }, res, 'Wallet address validation completed', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/validate-relayer-wallet
   * Validate relayer wallet is configured
   */
  async validateRelayerWallet(req: ValidateRelayerWalletRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_RELAYER_WALLET');

        const validation = this.certificateValidationService.validateRelayerWallet();

        this.logAction(req, 'VALIDATE_RELAYER_WALLET_SUCCESS', {
          businessId: req.businessId,
          valid: validation.valid,
          hasAddress: !!validation.address
        });

        return { validation };
      });
    }, res, 'Relayer wallet validation completed', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/:certificateId/validate-transferable
   * Validate certificate can be transferred
   */
  async validateCertificateTransferable(req: ValidateCertificateTransferableRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_CERTIFICATE_TRANSFERABLE');

        // First get the certificate to validate transferability
        const { certificateDataService } = await import('../../../services/certificates/core/certificateData.service');
        const certificate = await certificateDataService.getCertificate(
          req.validatedParams.certificateId,
          req.businessId
        );

        const validation = this.certificateValidationService.validateCertificateTransferable(certificate);

        this.logAction(req, 'VALIDATE_CERTIFICATE_TRANSFERABLE_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId,
          valid: validation.valid,
          status: certificate.status
        });

        return { validation };
      });
    }, res, 'Certificate transferability validation completed', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/validate-metadata
   * Validate certificate metadata
   */
  async validateCertificateMetadata(req: ValidateCertificateMetadataRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_CERTIFICATE_METADATA');

        const validation = this.certificateValidationService.validateCertificateMetadata(
          req.validatedBody.metadata
        );

        this.logAction(req, 'VALIDATE_CERTIFICATE_METADATA_SUCCESS', {
          businessId: req.businessId,
          valid: validation.valid,
          errorCount: validation.errors.length
        });

        return { validation };
      });
    }, res, 'Certificate metadata validation completed', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/validate-batch-inputs
   * Validate batch certificate inputs
   */
  async validateBatchInputs(req: ValidateBatchInputsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_BATCH_INPUTS');

        const validation = this.certificateValidationService.validateBatchInputs(
          req.validatedBody.inputs
        );

        this.logAction(req, 'VALIDATE_BATCH_INPUTS_SUCCESS', {
          businessId: req.businessId,
          inputCount: req.validatedBody.inputs.length,
          valid: validation.valid,
          errorCount: validation.errors.length
        });

        return { validation };
      });
    }, res, 'Batch inputs validation completed', this.getRequestMeta(req));
  }
}

// Export controller instance
export const certificateValidationController = new CertificateValidationController();
