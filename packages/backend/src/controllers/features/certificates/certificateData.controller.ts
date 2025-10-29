// src/controllers/features/certificates/certificateData.controller.ts
// Certificate data controller using modular certificate services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { certificateDataService } from '../../../services/certificates/core/certificateData.service';
import { certificateValidationService } from '../../../services/certificates/validation/certificateValidation.service';

/**
 * Certificate data request interfaces
 */
interface GetCertificateRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
}

interface ListCertificatesRequest extends BaseRequest {
  validatedQuery?: {
    status?: string;
    transferStatus?: 'relayer' | 'brand' | 'failed';
    page?: number;
    limit?: number;
    productId?: string;
    recipient?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    ownershipType?: 'relayer' | 'brand' | 'all';
    hasWeb3?: boolean;
  };
}

interface UpdateCertificateRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
  validatedBody: {
    status?: 'revoked' | 'minted' | 'pending_transfer' | 'transferred_to_brand' | 'transfer_failed';
    metadata?: Record<string, any>;
    transferScheduled?: boolean;
    nextTransferAttempt?: Date;
    transferAttempts?: number;
    transferFailed?: boolean;
    transferredToBrand?: boolean;
    transferredAt?: Date;
    revoked?: boolean;
    revokedAt?: Date;
    revokedReason?: string;
  };
}

interface DeleteCertificateRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
}

interface GetCertificatesByProductRequest extends BaseRequest {
  validatedParams: {
    productId: string;
  };
  validatedQuery?: {
    limit?: number;
    offset?: number;
  };
}

interface GetCertificatesByRecipientRequest extends BaseRequest {
  validatedQuery: {
    recipient: string;
    limit?: number;
    offset?: number;
  };
}

interface GetCertificatesByBatchRequest extends BaseRequest {
  validatedQuery: {
    batchId: string;
  };
}

interface SearchCertificatesRequest extends BaseRequest {
  validatedQuery: {
    searchTerm: string;
    limit?: number;
  };
}

interface BulkUpdateRequest extends BaseRequest {
  validatedBody: {
    certificateIds: string[];
    updates: Record<string, any>;
  };
}

/**
 * Certificate data controller
 */
export class CertificateDataController extends BaseController {
  private certificateDataService = certificateDataService;
  private certificateValidationService = certificateValidationService;

  /**
   * GET /api/certificates/:certificateId
   * Get single certificate with full details
   */
  async getCertificate(req: GetCertificateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATE');

        const certificate = await this.certificateDataService.getCertificate(
          req.validatedParams.certificateId,
          req.businessId
        );

        this.logAction(req, 'GET_CERTIFICATE_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId
        });

        return { certificate };
      });
    }, res, 'Certificate retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates
   * List certificates with enhanced filtering
   */
  async listCertificates(req: ListCertificatesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'LIST_CERTIFICATES');

        const options = {
          status: req.validatedQuery?.status,
          transferStatus: req.validatedQuery?.transferStatus,
          page: req.validatedQuery?.page || 1,
          limit: req.validatedQuery?.limit || 20,
          productId: req.validatedQuery?.productId,
          recipient: req.validatedQuery?.recipient,
          dateFrom: req.validatedQuery?.dateFrom ? new Date(req.validatedQuery.dateFrom) : undefined,
          dateTo: req.validatedQuery?.dateTo ? new Date(req.validatedQuery.dateTo) : undefined,
          search: req.validatedQuery?.search,
          sortBy: req.validatedQuery?.sortBy || 'createdAt',
          sortOrder: req.validatedQuery?.sortOrder || 'desc',
          ownershipType: req.validatedQuery?.ownershipType || 'all',
          hasWeb3: req.validatedQuery?.hasWeb3
        };

        const result = await this.certificateDataService.listCertificates(req.businessId!, options);

        this.logAction(req, 'LIST_CERTIFICATES_SUCCESS', {
          businessId: req.businessId,
          total: result.total,
          page: options.page,
          limit: options.limit
        });

        return result;
      });
    }, res, 'Certificates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/certificates/:certificateId
   * Update certificate data
   */
  async updateCertificate(req: UpdateCertificateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_CERTIFICATE');

        const sanitizedData = this.sanitizeInput(req.validatedBody);
        
        const updatedCertificate = await this.certificateDataService.updateCertificate(
          req.validatedParams.certificateId,
          req.businessId!,
          sanitizedData
        );

        this.logAction(req, 'UPDATE_CERTIFICATE_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId,
          updatedFields: Object.keys(sanitizedData)
        });

        return { certificate: updatedCertificate };
      });
    }, res, 'Certificate updated successfully', this.getRequestMeta(req));
  }

  /**
   * DELETE /api/certificates/:certificateId
   * Delete certificate (soft delete)
   */
  async deleteCertificate(req: DeleteCertificateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'DELETE_CERTIFICATE');

        await this.certificateDataService.deleteCertificate(
          req.validatedParams.certificateId,
          req.businessId!
        );

        this.logAction(req, 'DELETE_CERTIFICATE_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId
        });

        return { message: 'Certificate deleted successfully' };
      });
    }, res, 'Certificate deleted successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/product/:productId
   * Get certificates by product ID
   */
  async getCertificatesByProduct(req: GetCertificatesByProductRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATES_BY_PRODUCT');

        const certificates = await this.certificateDataService.getCertificatesByProduct(
          req.businessId!,
          req.validatedParams.productId,
          {
            limit: req.validatedQuery?.limit || 20,
            offset: req.validatedQuery?.offset || 0
          }
        );

        this.logAction(req, 'GET_CERTIFICATES_BY_PRODUCT_SUCCESS', {
          businessId: req.businessId,
          productId: req.validatedParams.productId,
          count: certificates.length
        });

        return { certificates };
      });
    }, res, 'Product certificates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/recipient
   * Get certificates by recipient
   */
  async getCertificatesByRecipient(req: GetCertificatesByRecipientRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATES_BY_RECIPIENT');

        const certificates = await this.certificateDataService.getCertificatesByRecipient(
          req.businessId!,
          req.validatedQuery.recipient,
          {
            limit: req.validatedQuery.limit || 20,
            offset: req.validatedQuery.offset || 0
          }
        );

        this.logAction(req, 'GET_CERTIFICATES_BY_RECIPIENT_SUCCESS', {
          businessId: req.businessId,
          recipient: req.validatedQuery.recipient,
          count: certificates.length
        });

        return { certificates };
      });
    }, res, 'Recipient certificates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/batch/:batchId
   * Get certificates by batch ID
   */
  async getCertificatesByBatch(req: GetCertificatesByBatchRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATES_BY_BATCH');

        const certificates = await this.certificateDataService.getCertificatesByBatch(
          req.businessId!,
          req.validatedQuery.batchId
        );

        this.logAction(req, 'GET_CERTIFICATES_BY_BATCH_SUCCESS', {
          businessId: req.businessId,
          batchId: req.validatedQuery.batchId,
          count: certificates.length
        });

        return { certificates };
      });
    }, res, 'Batch certificates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/search
   * Search certificates by token ID or recipient
   */
  async searchCertificates(req: SearchCertificatesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SEARCH_CERTIFICATES');

        const certificates = await this.certificateDataService.searchCertificates(
          req.businessId!,
          req.validatedQuery.searchTerm,
          req.validatedQuery.limit || 20
        );

        this.logAction(req, 'SEARCH_CERTIFICATES_SUCCESS', {
          businessId: req.businessId,
          searchTerm: req.validatedQuery.searchTerm,
          count: certificates.length
        });

        return { certificates };
      });
    }, res, 'Certificate search completed successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/certificates/bulk-update
   * Bulk update certificates
   */
  async bulkUpdateCertificates(req: BulkUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'BULK_UPDATE_CERTIFICATES');

        const sanitizedUpdates = this.sanitizeInput(req.validatedBody.updates);
        
        const modifiedCount = await this.certificateDataService.bulkUpdateCertificates(
          req.validatedBody.certificateIds,
          sanitizedUpdates
        );

        this.logAction(req, 'BULK_UPDATE_CERTIFICATES_SUCCESS', {
          businessId: req.businessId,
          certificateIds: req.validatedBody.certificateIds,
          modifiedCount
        });

        return { modifiedCount };
      });
    }, res, 'Certificates updated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/count-by-status
   * Get certificate count by status
   */
  async getCertificateCountByStatus(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATE_COUNT_BY_STATUS');

        const counts = await this.certificateDataService.getCertificateCountByStatus(req.businessId!);

        this.logAction(req, 'GET_CERTIFICATE_COUNT_BY_STATUS_SUCCESS', {
          businessId: req.businessId,
          statusCounts: Object.keys(counts).length
        });

        return { counts };
      });
    }, res, 'Certificate counts retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/date-range
   * Get certificates created in date range
   */
  async getCertificatesInDateRange(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

        this.recordPerformance(req, 'GET_CERTIFICATES_IN_DATE_RANGE');

        const certificates = await this.certificateDataService.getCertificatesInDateRange(
          req.businessId!,
          startDate,
          endDate
        );

        this.logAction(req, 'GET_CERTIFICATES_IN_DATE_RANGE_SUCCESS', {
          businessId: req.businessId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          count: certificates.length
        });

        return { certificates };
      });
    }, res, 'Date range certificates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/failed-transfers
   * Get failed transfer certificates
   */
  async getFailedTransferCertificates(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        this.recordPerformance(req, 'GET_FAILED_TRANSFER_CERTIFICATES');

        const certificates = await this.certificateDataService.getFailedTransferCertificates(
          req.businessId!,
          limit
        );

        this.logAction(req, 'GET_FAILED_TRANSFER_CERTIFICATES_SUCCESS', {
          businessId: req.businessId,
          count: certificates.length
        });

        return { certificates };
      });
    }, res, 'Failed transfer certificates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/pending-transfers
   * Get pending transfer certificates
   */
  async getPendingTransferCertificates(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        this.recordPerformance(req, 'GET_PENDING_TRANSFER_CERTIFICATES');

        const certificates = await this.certificateDataService.getPendingTransferCertificates(
          req.businessId!,
          limit
        );

        this.logAction(req, 'GET_PENDING_TRANSFER_CERTIFICATES_SUCCESS', {
          businessId: req.businessId,
          count: certificates.length
        });

        return { certificates };
      });
    }, res, 'Pending transfer certificates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/certificates/:certificateId/status
   * Update certificate status
   */
  async updateCertificateStatus(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const certificateId = req.params.certificateId;
        const status = req.body.status;
        const additionalData = req.body.additionalData;

        this.recordPerformance(req, 'UPDATE_CERTIFICATE_STATUS');

        const updatedCertificate = await this.certificateDataService.updateCertificateStatus(
          certificateId,
          status,
          additionalData
        );

        this.logAction(req, 'UPDATE_CERTIFICATE_STATUS_SUCCESS', {
          businessId: req.businessId,
          certificateId,
          status
        });

        return { certificate: updatedCertificate };
      });
    }, res, 'Certificate status updated successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const certificateDataController = new CertificateDataController();
