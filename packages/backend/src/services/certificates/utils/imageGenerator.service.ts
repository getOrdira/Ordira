/**
 * Image Generator Service
 *
 * Handles certificate image generation including:
 * - Generate default certificate images
 * - Create SVG certificates
 * - Upload images to S3
 * - Support multiple certificate levels and templates
 */

import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { Business } from '../../../models/core/business.model';
import { S3Service } from '../../media/core/s3.service';
import { logger } from '../../../utils/logger';

export interface ImageGenerationOptions {
  productId: string;
  certificateLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  recipient: string;
  brandName?: string;
  customTemplate?: string;
}

export interface CertificateImageResult {
  url: string;
  s3Key: string;
  format: 'svg' | 'png' | 'jpg';
}

/**
 * Certificate level colors
 */
const LEVEL_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2'
} as const;

/**
 * Generate simple SVG certificate
 */
export function generateCertificateSVG(
  brandName: string,
  options: {
    productId: string;
    certificateLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
    recipient: string;
  }
): string {
  const { productId, certificateLevel, recipient } = options;
  const color = LEVEL_COLORS[certificateLevel] || LEVEL_COLORS.bronze;

  return `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="white" stroke="${color}" stroke-width="10"/>
      <text x="400" y="100" font-family="serif" font-size="48" font-weight="bold" text-anchor="middle" fill="${color}">
        CERTIFICATE
      </text>
      <text x="400" y="150" font-family="serif" font-size="24" text-anchor="middle" fill="#333">
        of Authenticity
      </text>
      <text x="400" y="250" font-family="serif" font-size="32" text-anchor="middle" fill="#333">
        ${productId}
      </text>
      <text x="400" y="320" font-family="serif" font-size="18" text-anchor="middle" fill="#666">
        Issued to: ${recipient}
      </text>
      <text x="400" y="380" font-family="serif" font-size="18" text-anchor="middle" fill="#666">
        Level: ${certificateLevel.toUpperCase()}
      </text>
      <text x="400" y="450" font-family="serif" font-size="24" text-anchor="middle" fill="#333">
        ${brandName}
      </text>
      <text x="400" y="520" font-family="serif" font-size="14" text-anchor="middle" fill="#999">
        ${new Date().toLocaleDateString()}
      </text>
    </svg>
  `;
}

/**
 * Generate default certificate image using template
 */
export async function generateDefaultCertificateImage(
  businessId: string,
  options: ImageGenerationOptions
): Promise<CertificateImageResult> {
  try {
    const business = await Business.findById(businessId).select('businessName');
    const brandName = options.brandName || business?.businessName || 'Brand';

    // Generate SVG certificate
    const svgContent = generateCertificateSVG(brandName, {
      productId: options.productId,
      certificateLevel: options.certificateLevel,
      recipient: options.recipient
    });

    const svgBuffer = Buffer.from(svgContent, 'utf8');
    const filename = `certificate-${options.productId}-${Date.now()}.svg`;

    const uploadResult = await S3Service.uploadFile(svgBuffer, {
      businessId,
      resourceId: 'certificates',
      filename,
      mimeType: 'image/svg+xml',
      metadata: {
        type: 'certificate-image',
        productId: options.productId,
        level: options.certificateLevel
      },
      isPublic: true
    });

    return {
      url: uploadResult.url,
      s3Key: uploadResult.key,
      format: 'svg'
    };
  } catch (error: any) {
    logger.warn('Default certificate image generation failed:', error);

    // Return a fallback placeholder
    const fallbackUrl = `${process.env.FRONTEND_URL}/api/certificates/placeholder/${options.certificateLevel}`;

    return {
      url: fallbackUrl,
      s3Key: '',
      format: 'svg'
    };
  }
}

/**
 * Generate certificate with custom template
 */
export async function generateCustomCertificate(
  businessId: string,
  templateId: string,
  options: ImageGenerationOptions
): Promise<CertificateImageResult> {
  // TODO: Implement template-based generation
  // For now, fall back to default generation
  return generateDefaultCertificateImage(businessId, options);
}

/**
 * Get certificate level color
 */
export function getCertificateLevelColor(
  level: 'bronze' | 'silver' | 'gold' | 'platinum'
): string {
  return LEVEL_COLORS[level] || LEVEL_COLORS.bronze;
}

/**
 * Validate certificate level
 */
export function isValidCertificateLevel(
  level: string
): level is 'bronze' | 'silver' | 'gold' | 'platinum' {
  return ['bronze', 'silver', 'gold', 'platinum'].includes(level);
}

/**
 * Get available certificate templates
 */
export function getAvailableTemplates(): string[] {
  return ['default', 'modern', 'classic', 'minimal'];
}

/**
 * Generate certificate preview URL
 */
export function generateCertificatePreviewUrl(
  certificateLevel: string,
  productId: string
): string {
  return `${process.env.FRONTEND_URL}/api/certificates/preview?level=${certificateLevel}&product=${productId}`;
}

export class ImageGeneratorService {
  generateCertificateSVG = generateCertificateSVG;
  generateDefaultCertificateImage = generateDefaultCertificateImage;
  generateCustomCertificate = generateCustomCertificate;
  getCertificateLevelColor = getCertificateLevelColor;
  isValidCertificateLevel = isValidCertificateLevel;
  getAvailableTemplates = getAvailableTemplates;
  generateCertificatePreviewUrl = generateCertificatePreviewUrl;
}

export const imageGeneratorService = new ImageGeneratorService();
