/**
 * QR Code Generator Utility
 * 
 * Core QR code generation functionality for supply chain tracking.
 * This utility handles the low-level QR code generation using the qrcode library.
 */

import * as QRCode from 'qrcode';
import { logger } from '../../../utils/logger';
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
}

export interface QrCodeResult {
  data: string; // Base64 encoded image or SVG string
  format: string;
  size: number;
  errorCorrectionLevel: string;
}

/**
 * Generate QR code with custom options
 */
export async function generateQrCode(
  data: string,
  options: QrCodeOptions = {}
): Promise<string> {
  try {
    const defaultOptions: QrCodeOptions = {
      size: 256,
      format: 'png',
      errorCorrectionLevel: 'M',
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const config = { ...defaultOptions, ...options };

    // Validate input data
    if (!data || data.trim().length === 0) {
      throw new Error('QR code data cannot be empty');
    }

    // Check data length limits
    const maxLength = getMaxDataLength(config.errorCorrectionLevel!);
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
export async function generateQrCodeWithLogo(
  data: string,
  logoUrl: string,
  options: QrCodeOptions = {}
): Promise<string> {
  try {
    const defaultOptions: QrCodeOptions = {
      size: 256,
      format: 'png',
      errorCorrectionLevel: 'M',
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const config = { ...defaultOptions, ...options };

    // Generate base QR code
    const qrCodeDataUrl = await generateQrCode(data, {
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
 * Get maximum data length for error correction level
 */
function getMaxDataLength(errorCorrectionLevel: string): number {
  const limits = {
    'L': 2953, // Low
    'M': 2331, // Medium
    'Q': 1663, // Quartile
    'H': 1273  // High
  };
  return limits[errorCorrectionLevel as keyof typeof limits] || 2331;
}

