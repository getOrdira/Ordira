// src/services/external/qrCode.service.ts
import * as QRCode from 'qrcode';
import { logger } from '../../utils/logger'; 
const { createCanvas, loadImage } = require('canvas');

export interface QrCodeOptions {
  size?: number;
  format?: 'png' | 'svg' | 'pdf';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  logo?: {
    url: string;
    size: number;
  };
}

export interface QrCodeResult {
  data: string; // Base64 encoded image or SVG string
  format: string;
  size: number;
  errorCorrectionLevel: string;
}

export class QrCodeService {
  private defaultOptions: QrCodeOptions = {
    size: 256,
    format: 'png',
    errorCorrectionLevel: 'M',
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  /**
   * Generate QR code with custom options
   */
  async generateQrCode(
    data: string, 
    options: QrCodeOptions = {}
  ): Promise<string> {
    try {
      const config = { ...this.defaultOptions, ...options };
      
      // Validate input data
      if (!data || data.trim().length === 0) {
        throw new Error('QR code data cannot be empty');
      }

      // Check data length limits
      const maxLength = this.getMaxDataLength(config.errorCorrectionLevel!);
      if (data.length > maxLength) {
        throw new Error(`QR code data exceeds maximum length of ${maxLength} characters`);
      }

      let result: string;

      switch (config.format) {
        case 'svg':
          result = await QRCode.toString(data, {
            type: 'svg',
            width: config.size,
            margin: config.margin,
            color: config.color,
            errorCorrectionLevel: config.errorCorrectionLevel
          });
          break;

        case 'png':
        default:
          result = await QRCode.toDataURL(data, {
            width: config.size,
            margin: config.margin,
            color: config.color,
            errorCorrectionLevel: config.errorCorrectionLevel
          });
          break;
      }

      return result;

    } catch (error: any) {
      logger.error('QR code generation failed:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code with logo overlay
   */
  async generateQrCodeWithLogo(
    data: string,
    logoUrl: string,
    options: QrCodeOptions = {}
  ): Promise<string> {
    try {
      const config = { ...this.defaultOptions, ...options };
      
      // Generate base QR code
      const qrCodeDataUrl = await this.generateQrCode(data, {
        ...config,
        format: 'png'
      });

      // Load logo image
      const logo = await loadImage(logoUrl);
      
      // Create canvas for combining QR code and logo
      const canvas = createCanvas(config.size!, config.size!);
      const ctx = canvas.getContext('2d');

      // Draw QR code
      const qrImage = await loadImage(qrCodeDataUrl);
      ctx.drawImage(qrImage, 0, 0, config.size!, config.size!);

      // Calculate logo size and position
      const logoSize = Math.floor(config.size! * 0.2); // 20% of QR code size
      const logoX = (config.size! - logoSize) / 2;
      const logoY = (config.size! - logoSize) / 2;

      // Draw white background for logo
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);

      // Draw logo
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

      return canvas.toDataURL('image/png');

    } catch (error: any) {
      logger.error('QR code with logo generation failed:', error);
      throw new Error(`Failed to generate QR code with logo: ${error.message}`);
    }
  }

  /**
   * Generate multiple QR codes in batch
   */
  async generateBatchQrCodes(
    dataArray: Array<{ data: string; options?: QrCodeOptions }>
  ): Promise<Array<{ data: string; qrCode: string; error?: string }>> {
    const results = await Promise.allSettled(
      dataArray.map(async ({ data, options }) => {
        const qrCode = await this.generateQrCode(data, options);
        return { data, qrCode };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          data: dataArray[index].data,
          qrCode: '',
          error: result.reason.message
        };
      }
    });
  }

  /**
   * Generate QR code for supply chain tracking
   */
  async generateSupplyChainQrCode(
    productId: string,
    productName: string,
    manufacturerId: string,
    options: QrCodeOptions = {}
  ): Promise<string> {
    const trackingData = {
      type: 'supply_chain_tracking',
      productId,
      productName,
      manufacturerId,
      timestamp: new Date().toISOString(),
      trackingUrl: `${process.env.FRONTEND_URL}/supply-chain/track/${productId}`
    };

    return this.generateQrCode(JSON.stringify(trackingData), {
      ...options,
      size: options.size || 300, // Larger size for supply chain QR codes
      errorCorrectionLevel: 'H' // High error correction for durability
    });
  }

  /**
   * Generate QR code for certificate verification
   */
  async generateCertificateQrCode(
    certificateId: string,
    tokenId: string,
    contractAddress: string,
    options: QrCodeOptions = {}
  ): Promise<string> {
    const verificationData = {
      type: 'certificate_verification',
      certificateId,
      tokenId,
      contractAddress,
      verificationUrl: `${process.env.FRONTEND_URL}/verify/${certificateId}`,
      timestamp: new Date().toISOString()
    };

    return this.generateQrCode(JSON.stringify(verificationData), options);
  }

  /**
   * Generate QR code for voting
   */
  async generateVotingQrCode(
    proposalId: string,
    voterEmail: string,
    options: QrCodeOptions = {}
  ): Promise<string> {
    const votingData = {
      type: 'voting',
      proposalId,
      voterEmail,
      votingUrl: `${process.env.FRONTEND_URL}/vote/${proposalId}`,
      timestamp: new Date().toISOString()
    };

    return this.generateQrCode(JSON.stringify(votingData), options);
  }

  /**
   * Parse QR code data
   */
  parseQrCodeData(qrCodeData: string): any {
    try {
      return JSON.parse(qrCodeData);
    } catch (error) {
      throw new Error('Invalid QR code data format');
    }
  }

  /**
   * Validate QR code data
   */
  validateQrCodeData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for required fields based on type
    switch (data.type) {
      case 'supply_chain_tracking':
        return !!(data.productId && data.manufacturerId);
      case 'certificate_verification':
        return !!(data.certificateId && data.tokenId);
      case 'voting':
        return !!(data.proposalId && data.voterEmail);
      default:
        return true; // Allow custom types
    }
  }

  /**
   * Get maximum data length for error correction level
   */
  private getMaxDataLength(errorCorrectionLevel: string): number {
    const limits = {
      'L': 2953, // Low
      'M': 2331, // Medium
      'Q': 1663, // Quartile
      'H': 1273  // High
    };
    return limits[errorCorrectionLevel as keyof typeof limits] || 2331;
  }

  /**
   * Generate QR code with custom styling
   */
  async generateStyledQrCode(
    data: string,
    style: {
      backgroundColor?: string;
      foregroundColor?: string;
      logoUrl?: string;
      logoSize?: number;
      borderColor?: string;
      borderWidth?: number;
    },
    options: QrCodeOptions = {}
  ): Promise<string> {
    const config = {
      ...this.defaultOptions,
      ...options,
      color: {
        dark: style.foregroundColor || '#000000',
        light: style.backgroundColor || '#FFFFFF'
      }
    };

    let qrCode: string;

    if (style.logoUrl) {
      qrCode = await this.generateQrCodeWithLogo(data, style.logoUrl, config);
    } else {
      qrCode = await this.generateQrCode(data, config);
    }

    // Add border if specified
    if (style.borderColor && style.borderWidth) {
      qrCode = await this.addBorderToQrCode(qrCode, {
        color: style.borderColor,
        width: style.borderWidth,
        size: config.size!
      });
    }

    return qrCode;
  }

  /**
   * Add border to QR code
   */
  private async addBorderToQrCode(
    qrCodeDataUrl: string,
    borderOptions: {
      color: string;
      width: number;
      size: number;
    }
  ): Promise<string> {
    const canvas = createCanvas(
      borderOptions.size + (borderOptions.width * 2),
      borderOptions.size + (borderOptions.width * 2)
    );
    const ctx = canvas.getContext('2d');

    // Draw border
    ctx.fillStyle = borderOptions.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw QR code in center
    const qrImage = await loadImage(qrCodeDataUrl);
    ctx.drawImage(
      qrImage,
      borderOptions.width,
      borderOptions.width,
      borderOptions.size,
      borderOptions.size
    );

    return canvas.toDataURL('image/png');
  }
}
