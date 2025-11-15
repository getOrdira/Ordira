// src/controllers/features/supplyChain/supplyChainQrCode.controller.ts
// Controller exposing QR code operations for supply chain workflows

import { Response } from 'express';
import { SupplyChainBaseController, SupplyChainBaseRequest } from './supplyChainBase.controller';
import {
  QrCodeType,
  type IQrCodeOptions,
  type IQrCodeData,
  type IQrCodeGenerationRequest,
  type ISupplyChainQrCodeRequest,
  type ICertificateQrCodeRequest,
  type IVotingQrCodeRequest,
} from '../../../services/supplyChain/utils/types';

interface QrCodeRequest extends SupplyChainBaseRequest {
  validatedBody?: any;
  validatedParams?: {
    businessId?: string;
    contractAddress?: string;
    qrCodeId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    contractAddress?: string;
    qrCodeId?: string;
  };
}

/**
 * SupplyChainQrCodeController maps QR code requests to the QR code service.
 */
export class SupplyChainQrCodeController extends SupplyChainBaseController {
  /**
   * Generate supply chain tracking QR code.
   */
  async generateSupplyChainQrCode(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_GENERATE_SUPPLY');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const request: ISupplyChainQrCodeRequest = {
        productId: this.parseString(body.productId) ?? '',
        productName: this.parseString(body.productName) ?? '',
        manufacturerId: this.parseString(body.manufacturerId) ?? '',
        contractAddress: this.parseString(body.contractAddress) ?? this.requireContractAddress(req),
        businessId: this.parseString(body.businessId) ?? this.requireBusinessId(req),
        options: this.parseQrCodeOptions(body.options),
      };

      const result = await this.qrCodeService.generateSupplyChainQrCode(request);

      this.logAction(req, 'SUPPLY_CHAIN_QR_GENERATE_SUPPLY_SUCCESS', {
        productId: request.productId,
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        success: result.success,
      });

      return {
        request,
        result,
      };
    }, res, 'Supply chain QR code generated successfully', this.getRequestMeta(req));
  }

  /**
   * Generate certificate verification QR code.
   */
  async generateCertificateQrCode(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_GENERATE_CERTIFICATE');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const request: ICertificateQrCodeRequest = {
        certificateId: this.parseString(body.certificateId) ?? '',
        tokenId: this.parseString(body.tokenId) ?? '',
        contractAddress: this.parseString(body.contractAddress) ?? '',
        options: this.parseQrCodeOptions(body.options),
      };

      const result = await this.qrCodeService.generateCertificateQrCode(request);

      this.logAction(req, 'SUPPLY_CHAIN_QR_GENERATE_CERTIFICATE_SUCCESS', {
        certificateId: request.certificateId,
        tokenId: request.tokenId,
        success: result.success,
      });

      return {
        request,
        result,
      };
    }, res, 'Certificate QR code generated successfully', this.getRequestMeta(req));
  }

  /**
   * Generate voting QR code.
   */
  async generateVotingQrCode(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_GENERATE_VOTING');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const request: IVotingQrCodeRequest = {
        proposalId: this.parseString(body.proposalId) ?? '',
        voterEmail: this.parseString(body.voterEmail) ?? '',
        options: this.parseQrCodeOptions(body.options),
      };

      const result = await this.qrCodeService.generateVotingQrCode(request);

      this.logAction(req, 'SUPPLY_CHAIN_QR_GENERATE_VOTING_SUCCESS', {
        proposalId: request.proposalId,
        success: result.success,
      });

      return {
        request,
        result,
      };
    }, res, 'Voting QR code generated successfully', this.getRequestMeta(req));
  }

  /**
   * Generate QR code with logo overlay.
   */
  async generateQrCodeWithLogo(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_GENERATE_WITH_LOGO');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const request: IQrCodeGenerationRequest = {
        type: this.parseQrCodeType(body.type) ?? QrCodeType.SUPPLY_CHAIN_TRACKING,
        data: body.data ?? {},
        options: this.parseQrCodeOptions(body.options),
      };
      const logoUrl = this.parseString(body.logoUrl ?? body.logo_url);

      if (!logoUrl) {
        throw { statusCode: 400, message: 'logoUrl is required to generate QR code with logo' };
      }

      const result = await this.qrCodeService.generateQrCodeWithLogo(request, logoUrl);

      this.logAction(req, 'SUPPLY_CHAIN_QR_GENERATE_WITH_LOGO_SUCCESS', {
        type: request.type,
        logoUrl,
        success: result.success,
      });

      return {
        request,
        logoUrl,
        result,
      };
    }, res, 'QR code with logo generated successfully', this.getRequestMeta(req));
  }

  /**
   * Generate multiple QR codes in batch.
   */
  async generateBatchQrCodes(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_GENERATE_BATCH');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const requestsRaw = Array.isArray(body.requests) ? body.requests : body;
      const requests: IQrCodeGenerationRequest[] = (requestsRaw as any[] ?? []).map((entry) => ({
        type: this.parseQrCodeType(entry.type) ?? QrCodeType.SUPPLY_CHAIN_TRACKING,
        data: entry.data ?? {},
        options: this.parseQrCodeOptions(entry.options),
      }));

      const results = await this.qrCodeService.generateBatchQrCodes(requests);

      this.logAction(req, 'SUPPLY_CHAIN_QR_GENERATE_BATCH_SUCCESS', {
        total: results.length,
      });

      return {
        requests,
        results,
      };
    }, res, 'QR codes generated in batch successfully', this.getRequestMeta(req));
  }

  /**
   * Parse QR code data string.
   */
  async parseQrCodeData(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_PARSE');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const qrDataString = this.parseString(body.qrCodeData ?? body.data);

      if (!qrDataString) {
        throw { statusCode: 400, message: 'qrCodeData is required to parse' };
      }

      const parsed = await this.qrCodeService.parseQrCodeData(qrDataString);

      this.logAction(req, 'SUPPLY_CHAIN_QR_PARSE_SUCCESS', {
        valid: Boolean(parsed),
      });

      return {
        parsed,
      };
    }, res, 'QR code data parsed successfully', this.getRequestMeta(req));
  }

  /**
   * Validate QR code data payload.
   */
  async validateQrCodeData(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_VALIDATE');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const isValid = await this.qrCodeService.validateQrCodeData(body.data ?? body);

      this.logAction(req, 'SUPPLY_CHAIN_QR_VALIDATE_SUCCESS', {
        isValid,
      });

      return {
        valid: isValid,
      };
    }, res, 'QR code data validation completed', this.getRequestMeta(req));
  }

  /**
   * Retrieve QR code statistics for a business and contract.
   */
  async getQrCodeStatistics(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_STATS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const stats = await this.qrCodeService.getQrCodeStatistics(businessId, contractAddress);

      this.logAction(req, 'SUPPLY_CHAIN_QR_STATS_SUCCESS', {
        businessId,
        contractAddress,
        totalQrCodes: stats.totalQrCodes,
      });

      return {
        businessId,
        contractAddress,
        stats,
      };
    }, res, 'QR code statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Regenerate a QR code.
   */
  async regenerateQrCode(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_REGENERATE');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const request: IQrCodeGenerationRequest = {
        type: this.parseQrCodeType(body.type) ?? QrCodeType.SUPPLY_CHAIN_TRACKING,
        data: body.data ?? {},
        options: this.parseQrCodeOptions(body.options),
      };

      const result = await this.qrCodeService.regenerateQrCode(request);

      this.logAction(req, 'SUPPLY_CHAIN_QR_REGENERATE_SUCCESS', {
        type: request.type,
        success: result.success,
      });

      return {
        request,
        result,
      };
    }, res, 'QR code regenerated successfully', this.getRequestMeta(req));
  }

  /**
   * Deactivate a QR code.
   */
  async deactivateQrCode(req: QrCodeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_QR_DEACTIVATE');

      const qrCodeId =
        this.parseString(req.validatedParams?.qrCodeId ?? req.validatedQuery?.qrCodeId) ??
        this.parseString((req.params as any)?.qrCodeId) ??
        this.parseString((req.query as any)?.qrCodeId) ??
        this.parseString((req.validatedBody ?? req.body)?.qrCodeId);

      if (!qrCodeId) {
        throw { statusCode: 400, message: 'qrCodeId is required to deactivate QR code' };
      }

      const reason = this.parseString((req.validatedBody ?? req.body)?.reason);

      const result = await this.qrCodeService.deactivateQrCode(qrCodeId, reason);

      this.logAction(req, 'SUPPLY_CHAIN_QR_DEACTIVATE_SUCCESS', {
        qrCodeId,
        success: result.success,
      });

      return {
        qrCodeId,
        result,
      };
    }, res, 'QR code deactivated successfully', this.getRequestMeta(req));
  }

  private parseQrCodeOptions(raw: any): IQrCodeOptions | undefined {
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }

    const options: IQrCodeOptions = {
      size: this.parseOptionalNumber(raw.size, { min: 64, max: 2048 }),
      format: this.parseString(raw.format) as IQrCodeOptions['format'],
      errorCorrectionLevel: this.parseString(raw.errorCorrectionLevel) as IQrCodeOptions['errorCorrectionLevel'],
      margin: this.parseOptionalNumber(raw.margin, { min: 0, max: 20 }),
      color: raw.color,
      logo: raw.logo,
    };

    return options;
  }

  private parseQrCodeType(value: unknown): QrCodeType | undefined {
    const type = this.parseString(value);
    if (!type) {
      return undefined;
    }
    if (
      type === 'supply_chain_tracking' ||
      type === 'certificate_verification' ||
      type === 'voting'
    ) {
      return type as QrCodeType;
    }
    return undefined;
  }
}

export const supplyChainQrCodeController = new SupplyChainQrCodeController();

