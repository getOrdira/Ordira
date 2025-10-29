// src/controllers/features/certificates/certificateMinting.controller.ts
// Certificate minting controller using modular certificate services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { mintingService } from '../../../services/certificates/features/minting.service';

/**
 * Certificate minting request interfaces
 */
interface CreateCertificateRequest extends BaseRequest {
  validatedBody: {
    productId: string;
    recipient: string;
    contactMethod: 'email' | 'sms' | 'wallet';
    certificateImage?: Express.Multer.File;
    metadata?: {
      customMessage?: string;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
        display_type?: string;
      }>;
      certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
      expirationDate?: Date;
      imageUrl?: string;
      templateId?: string;
    };
    deliveryOptions?: {
      scheduleDate?: Date;
      priority?: 'standard' | 'priority' | 'urgent';
      notifyRecipient?: boolean;
    };
    web3Options?: {
      autoTransfer?: boolean;
      transferDelay?: number;
      brandWallet?: string;
      requireCustomerConfirmation?: boolean;
      gasOptimization?: boolean;
    };
  };
}

interface BatchCreateCertificatesRequest extends BaseRequest {
  validatedBody: {
    certificates: Array<{
      productId: string;
      recipient: string;
      contactMethod: 'email' | 'sms' | 'wallet';
      certificateImage?: Express.Multer.File;
      metadata?: {
        customMessage?: string;
        attributes?: Array<{
          trait_type: string;
          value: string | number;
          display_type?: string;
        }>;
        certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
        expirationDate?: Date;
        imageUrl?: string;
        templateId?: string;
      };
      deliveryOptions?: {
        scheduleDate?: Date;
        priority?: 'standard' | 'priority' | 'urgent';
        notifyRecipient?: boolean;
      };
      web3Options?: {
        autoTransfer?: boolean;
        transferDelay?: number;
        brandWallet?: string;
        requireCustomerConfirmation?: boolean;
        gasOptimization?: boolean;
      };
    }>;
  };
}

interface UpdateCertificateImageRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
  file?: Express.Multer.File;
}

interface DeleteCertificateAssetsRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
}

/**
 * Certificate minting controller
 */
export class CertificateMintingController extends BaseController {
  private mintingService = mintingService;

  /**
   * POST /api/certificates/create
   * Create certificate with S3 asset storage and automatic brand transfer
   */
  async createCertificate(req: CreateCertificateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CREATE_CERTIFICATE');

        const certificate = await this.mintingService.createCertificate(
          req.businessId!,
          req.validatedBody
        );

        this.logAction(req, 'CREATE_CERTIFICATE_SUCCESS', {
          businessId: req.businessId,
          certificateId: certificate._id,
          recipient: certificate.recipient,
          productId: certificate.product,
          tokenId: certificate.tokenId,
          status: certificate.status
        });

        return { certificate };
      });
    }, res, 'Certificate created successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/batch-create
   * Batch create certificates with S3 support
   */
  async createBatchCertificates(req: BatchCreateCertificatesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CREATE_BATCH_CERTIFICATES');

        const result = await this.mintingService.createBatchCertificates(
          req.businessId!,
          req.validatedBody.certificates
        );

        this.logAction(req, 'CREATE_BATCH_CERTIFICATES_SUCCESS', {
          businessId: req.businessId,
          totalRequested: req.validatedBody.certificates.length,
          successful: result.successful.length,
          failed: result.failed.length
        });

        return { result };
      });
    }, res, 'Batch certificates creation completed', this.getRequestMeta(req));
  }

  /**
   * PUT /api/certificates/:certificateId/image
   * Update certificate image (replace existing S3 asset)
   */
  async updateCertificateImage(req: UpdateCertificateImageRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        if (!req.file) {
          throw new Error('Certificate image file is required');
        }

        this.recordPerformance(req, 'UPDATE_CERTIFICATE_IMAGE');

        const result = await this.mintingService.updateCertificateImage(
          req.validatedParams.certificateId,
          req.businessId!,
          req.file
        );

        this.logAction(req, 'UPDATE_CERTIFICATE_IMAGE_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId,
          success: result.success,
          imageUrl: result.imageUrl
        });

        return { result };
      });
    }, res, 'Certificate image updated successfully', this.getRequestMeta(req));
  }

  /**
   * DELETE /api/certificates/:certificateId/assets
   * Cleanup certificate S3 assets when deleting certificate
   */
  async deleteCertificateAssets(req: DeleteCertificateAssetsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'DELETE_CERTIFICATE_ASSETS');

        await this.mintingService.deleteCertificateAssets(
          req.validatedParams.certificateId,
          req.businessId!
        );

        this.logAction(req, 'DELETE_CERTIFICATE_ASSETS_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId
        });

        return { message: 'Certificate assets deleted successfully' };
      });
    }, res, 'Certificate assets deleted successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const certificateMintingController = new CertificateMintingController();
