import { Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { getServices } from '../services/container.service';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { Certificate } from '../models/certificate.model';
import { BrandSettings } from '../models/brandSettings.model';
import { NftService } from '../services/blockchain/nft.service';

type ControllerRequest<B = unknown, Q = unknown, P = unknown> = UnifiedAuthRequest &
  TenantRequest &
  ValidatedRequest & {
    validatedBody?: B;
    validatedQuery?: Q;
    validatedParams?: P;
  };

type CreateCertificateBody = {
  productId: string;
  recipient: string;
  contactMethod?: 'email' | 'wallet';
  certificateData?: Record<string, unknown>;
};

type BatchCreateBody = {
  certificates: CreateCertificateBody[];
};

type ListCertificatesQuery = {
  page?: number;
  limit?: number;
  status?: string;
  recipient?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

type TransferCertificatesBody = {
  certificateIds: string[];
  brandWallet?: string;
};

type RevokeCertificateBody = {
  reason: string;
  notifyRecipient?: boolean;
  burnNft?: boolean;
};

type Web3AnalyticsQuery = {
  timeframe?: '7d' | '30d' | '90d' | '180d' | '1y';
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  includeGasMetrics?: 'true' | 'false';
  includeTransferMetrics?: 'true' | 'false';
};

interface CertificateResponse {
  id: string;
  productId?: string;
  recipient: string;
  status: string;
  tokenId?: string;
  contractAddress?: string;
  autoTransferEnabled: boolean;
  transferScheduled: boolean;
  transferredToBrand: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  metadata?: unknown;
  deliveryOptions?: unknown;
  web3Options?: unknown;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const TIMEFRAME_TO_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '1y': 365
};

function ensureValidatedBody<T>(
  req: ValidatedRequest,
  res: Response,
  errorCode: string
): T | null {
  if (!req.validatedBody) {
    res.status(400).json({
      error: 'Request body failed validation',
      code: errorCode
    });
    return null;
  }
  return req.validatedBody as T;
}

function ensureValidatedParams<T>(
  req: ValidatedRequest,
  res: Response,
  errorCode: string
): T | null {
  if (!req.validatedParams) {
    res.status(400).json({
      error: 'Request parameters failed validation',
      code: errorCode
    });
    return null;
  }
  return req.validatedParams as T;
}

function getValidatedQuery<T>(req: ValidatedRequest): T {
  return (req.validatedQuery ?? {}) as T;
}

function mapCertificateResponse(doc: any): CertificateResponse {
  const data = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

  return {
    id: data._id?.toString?.() ?? data.id,
    productId: data.product?.toString?.() ?? data.product,
    recipient: data.recipient,
    status: data.status,
    tokenId: data.tokenId,
    contractAddress: data.contractAddress,
    autoTransferEnabled: Boolean(data.autoTransferEnabled),
    transferScheduled: Boolean(data.transferScheduled),
    transferredToBrand: Boolean(data.transferredToBrand),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    metadata: data.metadata,
    deliveryOptions: data.deliveryOptions,
    web3Options: data.web3Options
  };
}

function parsePositiveNumber(value: number | string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

function toDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function resolveBusinessId(req: UnifiedAuthRequest & TenantRequest): string | null {
  if (req.userId) {
    return req.userId;
  }

  if (req.tenant?.business) {
    return req.tenant.business.toString();
  }

  if (req.business?._id) {
    return req.business._id.toString();
  }

  return null;
}

export async function createCertificate(
  req: ControllerRequest<CreateCertificateBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = ensureValidatedBody<CreateCertificateBody>(req, res, 'CERTIFICATE_VALIDATION_FAILED');
    if (!body) {
      return;
    }

    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const { certificate: certificateService, usageTracking: usageTrackingService } = getServices();

    const certificate = await certificateService.createCertificate(businessId, {
      productId: body.productId,
      recipient: body.recipient,
      contactMethod: body.contactMethod ?? 'email',
      metadata: body.certificateData
    });

    trackManufacturerAction('create_certificate');

    usageTrackingService?.updateUsage(businessId, { certificates: 1 }).catch(error => {
      logger.warn('Failed to record certificate usage', {
        businessId,
        error: error?.message ?? error
      });
    });

    res.status(201).json({
      success: true,
      certificate: mapCertificateResponse(certificate)
    });
  } catch (error) {
    logger.error('Create certificate error:', error);
    next(error);
  }
}

export async function createBatchCertificates(
  req: ControllerRequest<BatchCreateBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = ensureValidatedBody<BatchCreateBody>(req, res, 'CERTIFICATE_BATCH_VALIDATION_FAILED');
    if (!body) {
      return;
    }

    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const { certificate: certificateService, usageTracking: usageTrackingService } = getServices();

    const inputs = body.certificates.map(item => ({
      productId: item.productId,
      recipient: item.recipient,
      contactMethod: item.contactMethod ?? 'email',
      metadata: item.certificateData
    }));

    const result = await certificateService.createBatchCertificates(businessId, inputs);

    trackManufacturerAction('create_batch_certificates');

    if (result.successful.length > 0) {
      usageTrackingService?.updateUsage(businessId, {
        certificates: result.successful.length
      }).catch(error => {
        logger.warn('Failed to record batch certificate usage', {
          businessId,
          error: error?.message ?? error
        });
      });
    }

    res.status(202).json({
      success: true,
      results: {
        successful: result.successful.map(mapCertificateResponse),
        failed: result.failed.map(({ input, error: failure }) => ({
          productId: input.productId,
          recipient: input.recipient,
          contactMethod: input.contactMethod,
          error: failure
        })),
        statistics: {
          total: result.successful.length + result.failed.length,
          successful: result.successful.length,
          failed: result.failed.length
        }
      }
    });
  } catch (error) {
    logger.error('Create batch certificates error:', error);
    next(error);
  }
}

export async function listCertificates(
  req: ControllerRequest<unknown, ListCertificatesQuery>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = getValidatedQuery<ListCertificatesQuery>(req);
    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const page = parsePositiveNumber(query.page, DEFAULT_PAGE);
    const limit = parsePositiveNumber(query.limit, DEFAULT_LIMIT);

    const { certificate: certificateService } = getServices();

    const [listResult, statistics] = await Promise.all([
      certificateService.listCertificates(businessId, {
        page,
        limit,
        status: query.status,
        productId: query.productId,
        recipient: query.recipient,
        search: query.search,
        dateFrom: toDate(query.startDate),
        dateTo: toDate(query.endDate)
      }),
      certificateService.getCertificateStats(businessId)
    ]);

    trackManufacturerAction('view_certificates');

    res.json({
      certificates: listResult.certificates.map(mapCertificateResponse),
      pagination: listResult.pagination,
      statistics
    });
  } catch (error) {
    logger.error('List certificates error:', error);
    next(error);
  }
}

export async function getCertificate(
  req: ControllerRequest<unknown, unknown, { id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = ensureValidatedParams<{ id: string }>(req, res, 'CERTIFICATE_ID_REQUIRED');
    if (!params) {
      return;
    }

    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const { certificate: certificateService } = getServices();

    const certificate = await certificateService.getCertificate(params.id, businessId);
    const response = mapCertificateResponse(certificate);

    const ownershipStatus = certificate.transferredToBrand
      ? 'brand'
      : certificate.transferFailed
      ? 'failed'
      : 'relayer';

    res.json({
      certificate: response,
      ownershipStatus,
      metadata: {
        hasWeb3: Boolean(response.contractAddress),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    if ((error as Error)?.message === 'Certificate not found') {
      res.status(404).json({
        error: 'Certificate not found',
        code: 'CERTIFICATE_NOT_FOUND'
      });
      return;
    }

    logger.error('Get certificate error:', error);
    next(error);
  }
}

export async function transferCertificates(
  req: ControllerRequest<TransferCertificatesBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = ensureValidatedBody<TransferCertificatesBody>(req, res, 'TRANSFER_VALIDATION_FAILED');
    if (!body) {
      return;
    }

    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings || !brandSettings.hasWeb3Features()) {
      res.status(403).json({
        error: 'Web3 features are not enabled for this tenant',
        code: 'WEB3_NOT_ENABLED'
      });
      return;
    }

    if (!brandSettings.canTransferToBrand() && !body.brandWallet) {
      res.status(400).json({
        error: 'Brand wallet not configured or verified',
        code: 'WALLET_NOT_CONFIGURED'
      });
      return;
    }

    const certificates = await Certificate.find({
      _id: { $in: body.certificateIds },
      business: businessId
    });

    if (certificates.length !== body.certificateIds.length) {
      res.status(404).json({
        error: 'Some certificates could not be found',
        code: 'CERTIFICATES_NOT_FOUND'
      });
      return;
    }

    const transfers: Array<{ certificateId: string; tokenId?: string }> = [];
    const errors: Array<{ certificateId: string; error: string }> = [];

    for (const certificate of certificates) {
      try {
        if (!certificate.canBeTransferred()) {
          errors.push({
            certificateId: certificate._id.toString(),
            error: 'Certificate cannot be transferred in its current state'
          });
          continue;
        }

        if (body.brandWallet && certificate.brandWallet !== body.brandWallet) {
          certificate.brandWallet = body.brandWallet;
          await certificate.save();
        }

        const success = await certificate.executeTransfer();
        if (success) {
          transfers.push({
            certificateId: certificate._id.toString(),
            tokenId: certificate.tokenId
          });
        } else {
          errors.push({
            certificateId: certificate._id.toString(),
            error: 'Transfer execution failed'
          });
        }
      } catch (error) {
        errors.push({
          certificateId: certificate._id.toString(),
          error: (error as Error).message
        });
      }
    }

    trackManufacturerAction('manual_transfer_certificates');

    res.json({
      success: errors.length === 0,
      results: {
        total: body.certificateIds.length,
        successful: transfers.length,
        failed: errors.length,
        transfers,
        errors
      }
    });
  } catch (error) {
    logger.error('Transfer certificates error:', error);
    next(error);
  }
}

export async function retryFailedTransfers(
  req: ControllerRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings || !brandSettings.hasWeb3Features()) {
      res.status(403).json({
        error: 'Web3 features are not enabled for this tenant',
        code: 'WEB3_NOT_ENABLED'
      });
      return;
    }

    const limit = parsePositiveNumber(
      typeof req.query?.limit === 'string' ? req.query.limit : undefined,
      10
    );

    const retryResults = await NftService.retryFailedTransfers(businessId, limit);

    trackManufacturerAction('retry_failed_transfers');

    res.json({
      success: true,
      retryResults
    });
  } catch (error) {
    logger.error('Retry failed transfers error:', error);
    next(error);
  }
}

export async function revokeCertificate(
  req: ControllerRequest<RevokeCertificateBody, unknown, { id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = ensureValidatedParams<{ id: string }>(req, res, 'CERTIFICATE_ID_REQUIRED');
    if (!params) {
      return;
    }

    const body = ensureValidatedBody<RevokeCertificateBody>(req, res, 'REVOKE_VALIDATION_FAILED');
    if (!body) {
      return;
    }

    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const certificate = await Certificate.findOne({
      _id: params.id,
      business: businessId
    });

    if (!certificate) {
      res.status(404).json({
        error: 'Certificate not found',
        code: 'CERTIFICATE_NOT_FOUND'
      });
      return;
    }

    if (!['minted', 'transferred_to_brand', 'pending_transfer'].includes(certificate.status)) {
      res.status(400).json({
        error: 'Certificate cannot be revoked in its current status',
        code: 'INVALID_STATUS_FOR_REVOCATION'
      });
      return;
    }

    certificate.revoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedReason = body.reason;
    certificate.status = 'revoked';

    await certificate.save();

    trackManufacturerAction('revoke_certificate');

    const { notifications: notificationsService } = getServices();
    if (body.notifyRecipient) {
      notificationsService?.sendCertificateRevocationNotification(businessId, {
        certificateId: params.id,
        tokenId: certificate.tokenId,
        reason: body.reason,
        revokedAt: certificate.revokedAt
      }).catch(error => {
        logger.warn('Failed to send certificate revocation notification', {
          certificateId: params.id,
          error: error?.message ?? error
        });
      });
    }

    res.json({
      success: true,
      revocation: {
        certificateId: params.id,
        tokenId: certificate.tokenId,
        revokedAt: certificate.revokedAt,
        reason: certificate.revokedReason,
        blockchainRevocation: body.burnNft ? 'not_supported' : null
      }
    });
  } catch (error) {
    logger.error('Revoke certificate error:', error);
    next(error);
  }
}

export async function getPendingTransfers(
  req: ControllerRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings || !brandSettings.hasWeb3Features()) {
      res.status(403).json({
        error: 'Web3 features are not enabled for this tenant',
        code: 'WEB3_NOT_ENABLED'
      });
      return;
    }

    const pendingTransfers = await NftService.getPendingTransfers(businessId);

    res.json({
      success: true,
      pendingTransfers: pendingTransfers.map(transfer => ({
        id: transfer._id?.toString?.() ?? transfer.id,
        tokenId: transfer.tokenId,
        recipient: transfer.recipient,
        nextTransferAttempt: transfer.nextTransferAttempt,
        transferAttempts: transfer.transferAttempts,
        maxTransferAttempts: transfer.maxTransferAttempts,
        transferError: transfer.transferError,
        createdAt: transfer.createdAt
      })),
      summary: {
        total: pendingTransfers.length,
        canTransferNow: brandSettings.canTransferNow(),
        transferSettings: brandSettings.getTransferSettings()
      }
    });
  } catch (error) {
    logger.error('Get pending transfers error:', error);
    next(error);
  }
}

export async function getBatchProgress(
  req: ControllerRequest<unknown, unknown, { batchId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(501).json({
      error: 'Batch progress tracking is not available in the optimized certificate service',
      code: 'BATCH_PROGRESS_UNSUPPORTED'
    });
  } catch (error) {
    logger.error('Get batch progress error:', error);
    next(error);
  }
}

export async function getWeb3Analytics(
  req: ControllerRequest<unknown, Web3AnalyticsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = getValidatedQuery<Web3AnalyticsQuery>(req);
    const businessId = resolveBusinessId(req);
    if (!businessId) {
      res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const brandSettings = await BrandSettings.findOne({ business: businessId });
    if (!brandSettings || !brandSettings.hasWeb3Features()) {
      res.status(403).json({
        error: 'Web3 features are not enabled for this tenant',
        code: 'WEB3_NOT_ENABLED'
      });
      return;
    }

    const { certificate: certificateService } = getServices();

    const timeframe = query.timeframe ?? '30d';
    const days = TIMEFRAME_TO_DAYS[timeframe] ?? 30;

    const analytics = await certificateService.getCertificateUsage(businessId);

    trackManufacturerAction('view_web3_analytics');

    res.json({
      timeframe,
      groupBy: query.groupBy ?? 'day',
      includeGasMetrics: query.includeGasMetrics !== 'false',
      includeTransferMetrics: query.includeTransferMetrics !== 'false',
      analytics
    });
  } catch (error) {
    logger.error('Get Web3 analytics error:', error);
    next(error);
  }
}
