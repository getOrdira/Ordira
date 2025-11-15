// src/services/supplyChain/features/qrCode.service.ts
import { logger } from '../../../utils/logger';
import { QrCodeService } from '../../external/qrCode.service';
import { SupplyChainValidationService } from '../validation/supplyChainValidation.service';
import { ContractReadService } from '../core/contractRead.service';
import type { ICertificateQrCodeData, IQrCodeData, IQrCodeOptions, ISupplyChainQrCodeData, IVotingQrCodeData, IApiResponse } from '@ordira/shared/src/types/features/supplyChain/types';
import { QrCodeType } from '@ordira/shared/src/types/features/supplyChain/types';
import type { ISupplyChainQrCodeRequest, ICertificateQrCodeRequest, IVotingQrCodeRequest, IQrCodeGenerationRequest, IQrCodeGenerationResult } from '@ordira/shared/src/types/features/supplyChain/qr-code';

// ===== INTERFACES =====

// ===== ERROR CLASS =====

class QrCodeFeatureError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'QrCodeFeatureError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class SupplyChainQrCodeService {
  private static instance: SupplyChainQrCodeService;
  private qrCodeService: QrCodeService;
  private validationService: SupplyChainValidationService;
  private contractReadService: ContractReadService;

  private constructor() {
    this.qrCodeService = new QrCodeService();
    this.validationService = SupplyChainValidationService.getInstance();
    this.contractReadService = ContractReadService.getInstance();
  }

  public static getInstance(): SupplyChainQrCodeService {
    if (!SupplyChainQrCodeService.instance) {
      SupplyChainQrCodeService.instance = new SupplyChainQrCodeService();
    }
    return SupplyChainQrCodeService.instance;
  }

  /**
   * Generate QR code for supply chain tracking
   */
  async generateSupplyChainQrCode(
    request: ISupplyChainQrCodeRequest
  ): Promise<IQrCodeGenerationResult> {
    try {
      // Validate input
      const validation = await this.validationService.validateAll({
        contractAddress: request.contractAddress,
        businessId: request.businessId,
        product: {
          productId: request.productId,
          name: request.productName,
          description: ''
        }
      });

      if (!validation.valid) {
        throw new QrCodeFeatureError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Verify product exists in contract
      const productResult = await this.contractReadService.getProducts(
        request.contractAddress,
        request.businessId
      );

      if (!productResult.success || !productResult.data) {
        throw new QrCodeFeatureError('Failed to verify product in contract', 404);
      }

      const productExists = productResult.data.some(
        product => product.productId === request.productId
      );

      if (!productExists) {
        throw new QrCodeFeatureError('Product not found in contract', 404);
      }

      // Create QR code data
      const qrCodeData: ISupplyChainQrCodeData = {
        type: QrCodeType.SUPPLY_CHAIN_TRACKING,
        productId: request.productId,
        productName: request.productName,
        manufacturerId: request.manufacturerId,
        timestamp: new Date().toISOString(),
        trackingUrl: `${process.env.FRONTEND_URL}/supply-chain/track/${request.productId}`
      };

      // Generate QR code
      const qrCode = await this.qrCodeService.generateQrCode(
        JSON.stringify(qrCodeData),
        {
          ...request.options,
          size: request.options?.size || 300, // Larger size for supply chain QR codes
          errorCorrectionLevel: 'H' // High error correction for durability
        }
      );

      logger.info('Supply chain QR code generated successfully', {
        productId: request.productId,
        manufacturerId: request.manufacturerId,
        contractAddress: request.contractAddress
      });

      return {
        success: true,
        qrCode,
        metadata: {
          type: QrCodeType.SUPPLY_CHAIN_TRACKING,
          size: request.options?.size || 300,
          format: request.options?.format || 'png',
          errorCorrectionLevel: 'H'
        }
      };

    } catch (error: any) {
      logger.error('Generate supply chain QR code error:', error);
      
      if (error instanceof QrCodeFeatureError) {
        throw error;
      }

      throw new QrCodeFeatureError(`Failed to generate supply chain QR code: ${error.message}`, 500);
    }
  }

  /**
   * Generate QR code for certificate verification
   */
  async generateCertificateQrCode(
    request: ICertificateQrCodeRequest
  ): Promise<IQrCodeGenerationResult> {
    try {
      // Validate input
      const validation = await this.validationService.validateContractAddress(request.contractAddress);
      if (!validation.valid) {
        throw new QrCodeFeatureError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Create QR code data
      const qrCodeData: ICertificateQrCodeData = {
        type: QrCodeType.CERTIFICATE_VERIFICATION,
        certificateId: request.certificateId,
        tokenId: request.tokenId,
        contractAddress: request.contractAddress,
        verificationUrl: `${process.env.FRONTEND_URL}/verify/${request.certificateId}`,
        timestamp: new Date().toISOString()
      };

      // Generate QR code
      const qrCode = await this.qrCodeService.generateQrCode(
        JSON.stringify(qrCodeData),
        request.options
      );

      logger.info('Certificate QR code generated successfully', {
        certificateId: request.certificateId,
        tokenId: request.tokenId,
        contractAddress: request.contractAddress
      });

      return {
        success: true,
        qrCode,
        metadata: {
          type: QrCodeType.CERTIFICATE_VERIFICATION,
          size: request.options?.size || 256,
          format: request.options?.format || 'png',
          errorCorrectionLevel: request.options?.errorCorrectionLevel || 'M'
        }
      };

    } catch (error: any) {
      logger.error('Generate certificate QR code error:', error);
      
      if (error instanceof QrCodeFeatureError) {
        throw error;
      }

      throw new QrCodeFeatureError(`Failed to generate certificate QR code: ${error.message}`, 500);
    }
  }

  /**
   * Generate QR code for voting
   */
  async generateVotingQrCode(
    request: IVotingQrCodeRequest
  ): Promise<IQrCodeGenerationResult> {
    try {
      // Validate input
      const validation = await this.validationService.validateAll({
        qrCodeData: {
          type: 'voting',
          proposalId: request.proposalId,
          voterEmail: request.voterEmail
        }
      });

      if (!validation.valid) {
        throw new QrCodeFeatureError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Create QR code data
      const qrCodeData: IVotingQrCodeData = {
        type: QrCodeType.VOTING,
        proposalId: request.proposalId,
        voterEmail: request.voterEmail,
        votingUrl: `${process.env.FRONTEND_URL}/vote/${request.proposalId}`,
        timestamp: new Date().toISOString()
      };

      // Generate QR code
      const qrCode = await this.qrCodeService.generateQrCode(
        JSON.stringify(qrCodeData),
        request.options
      );

      logger.info('Voting QR code generated successfully', {
        proposalId: request.proposalId,
        voterEmail: request.voterEmail
      });

      return {
        success: true,
        qrCode,
        metadata: {
          type: QrCodeType.VOTING,
          size: request.options?.size || 256,
          format: request.options?.format || 'png',
          errorCorrectionLevel: request.options?.errorCorrectionLevel || 'M'
        }
      };

    } catch (error: any) {
      logger.error('Generate voting QR code error:', error);
      
      if (error instanceof QrCodeFeatureError) {
        throw error;
      }

      throw new QrCodeFeatureError(`Failed to generate voting QR code: ${error.message}`, 500);
    }
  }

  /**
   * Generate QR code with logo overlay
   */
  async generateQrCodeWithLogo(
    request: IQrCodeGenerationRequest,
    logoUrl: string
  ): Promise<IQrCodeGenerationResult> {
    try {
      // Validate QR code data
      const validation = await this.validationService.validateQrCodeData(request.data);
      if (!validation.valid) {
        throw new QrCodeFeatureError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Generate QR code with logo
      const qrCode = await this.qrCodeService.generateQrCodeWithLogo(
        JSON.stringify(request.data),
        logoUrl,
        request.options
      );

      logger.info('QR code with logo generated successfully', {
        type: request.type,
        logoUrl
      });

      return {
        success: true,
        qrCode,
        metadata: {
          type: request.type,
          size: request.options?.size || 256,
          format: request.options?.format || 'png',
          errorCorrectionLevel: request.options?.errorCorrectionLevel || 'M'
        }
      };

    } catch (error: any) {
      logger.error('Generate QR code with logo error:', error);
      
      if (error instanceof QrCodeFeatureError) {
        throw error;
      }

      throw new QrCodeFeatureError(`Failed to generate QR code with logo: ${error.message}`, 500);
    }
  }

  /**
   * Generate multiple QR codes in batch
   */
  async generateBatchQrCodes(
    requests: IQrCodeGenerationRequest[]
  ): Promise<IQrCodeGenerationResult[]> {
    try {
      const results: IQrCodeGenerationResult[] = [];

      for (const request of requests) {
        try {
          let result: IQrCodeGenerationResult;

          switch (request.type) {
            case QrCodeType.SUPPLY_CHAIN_TRACKING:
              result = await this.generateSupplyChainQrCode(request.data);
              break;
            case QrCodeType.CERTIFICATE_VERIFICATION:
              result = await this.generateCertificateQrCode(request.data);
              break;
            case QrCodeType.VOTING:
              result = await this.generateVotingQrCode(request.data);
              break;
            default:
              result = {
                success: false,
                error: `Unknown QR code type: ${request.type}`
              };
          }

          results.push(result);
        } catch (error: any) {
          results.push({
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error: any) {
      logger.error('Generate batch QR codes error:', error);
      throw new QrCodeFeatureError(`Failed to generate batch QR codes: ${error.message}`, 500);
    }
  }

    /**
   * Parse QR code data
   */
    async parseQrCodeData(qrCodeData: string): Promise<IQrCodeData | null> {
      try {
        const parsed = JSON.parse(qrCodeData);
        
        // Validate the parsed data
        const validation = await this.validationService.validateQrCodeData(parsed);
        if (!validation.valid) {
          logger.warn('Invalid QR code data format', { errors: validation.errors });
          return null;
        }
  
        return parsed as IQrCodeData;
  
      } catch (error: any) {
        logger.error('Failed to parse QR code data:', error);
        return null;
      }
    }

  /**
   * Validate QR code data
   */
  async validateQrCodeData(data: any): Promise<boolean> {
    try {
      const validation = await this.validationService.validateQrCodeData(data);
      return validation.valid;
    } catch (error: any) {
      logger.error('Failed to validate QR code data:', error);
      return false;
    }
  }

  /**
   * Get QR code statistics for a business
   */
  async getQrCodeStatistics(
    businessId: string,
    contractAddress: string
  ): Promise<{
    totalQrCodes: number;
    qrCodesByType: Record<QrCodeType, number>;
    lastGenerated?: Date;
  }> {
    try {
      // This would typically query a QR code tracking table
      // For now, return mock data
      return {
        totalQrCodes: 0,
        qrCodesByType: {
          [QrCodeType.SUPPLY_CHAIN_TRACKING]: 0,
          [QrCodeType.CERTIFICATE_VERIFICATION]: 0,
          [QrCodeType.VOTING]: 0
        }
      };

    } catch (error: any) {
      logger.error('Failed to get QR code statistics:', error);
      throw new QrCodeFeatureError(`Failed to get QR code statistics: ${error.message}`, 500);
    }
  }

  /**
   * Regenerate QR code (idempotent operation)
   */
  async regenerateQrCode(
    request: IQrCodeGenerationRequest
  ): Promise<IQrCodeGenerationResult> {
    try {
      // This is essentially the same as generating a new QR code
      // but with additional logging for regeneration
      logger.info('Regenerating QR code', { type: request.type });

      let result: IQrCodeGenerationResult;

      switch (request.type) {
        case QrCodeType.SUPPLY_CHAIN_TRACKING:
          result = await this.generateSupplyChainQrCode(request.data);
          break;
        case QrCodeType.CERTIFICATE_VERIFICATION:
          result = await this.generateCertificateQrCode(request.data);
          break;
        case QrCodeType.VOTING:
          result = await this.generateVotingQrCode(request.data);
          break;
        default:
          result = {
            success: false,
            error: `Unknown QR code type: ${request.type}`
          };
      }

      return result;

    } catch (error: any) {
      logger.error('Regenerate QR code error:', error);
      throw new QrCodeFeatureError(`Failed to regenerate QR code: ${error.message}`, 500);
    }
  }

  /**
   * Deactivate QR code (mark as inactive in tracking)
   */
  async deactivateQrCode(
    qrCodeId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This would typically update a QR code tracking table
      // For now, just log the deactivation
      logger.info('QR code deactivated', { qrCodeId, reason });

      return { success: true };

    } catch (error: any) {
      logger.error('Deactivate QR code error:', error);
      return {
        success: false,
        error: `Failed to deactivate QR code: ${error.message}`
      };
    }
  }
}
