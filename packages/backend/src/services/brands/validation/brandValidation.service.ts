// src/services/brands/validation/brand-validation.service.ts
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { logger } from '../../../utils/logger';
import { ethers } from 'ethers';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface WalletValidationResult {
  valid: boolean;
  verified?: boolean;
  errors?: string[];
  address?: string;
}

export interface BrandDataValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  missingFields?: string[];
}

export interface MediaUploadValidationResult extends FileValidationResult {
  fileSize?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
}

export class BrandValidationService {
  private readonly allowedMimeTypes = {
    logo: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    banner: ['image/jpeg', 'image/png', 'image/webp'],
    general: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'],
    document: ['application/pdf', 'image/jpeg', 'image/png']
  };

  private readonly maxFileSizes = {
    logo: 2 * 1024 * 1024,      // 2MB
    banner: 5 * 1024 * 1024,    // 5MB
    document: 10 * 1024 * 1024, // 10MB
    general: 5 * 1024 * 1024    // 5MB
  };

  private readonly requiredFields = {
    basic: ['businessName', 'email'],
    profile: ['businessName', 'email', 'industry', 'description'],
    complete: ['businessName', 'email', 'industry', 'description', 'contactEmail']
  };

  /**
   * Validate file upload
   */
  validateFileUpload(
    file: any,
    category: 'logo' | 'banner' | 'general' | 'document' = 'general'
  ): FileValidationResult {
    if (!file) {
      return { valid: false, error: 'No file uploaded' };
    }

    // Check file type
    const allowedTypes = this.allowedMimeTypes[category];
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    const maxSize = this.maxFileSizes[category];
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${this.formatFileSize(maxSize)}`
      };
    }

    // Additional validations for images
    if (file.mimetype.startsWith('image/')) {
      return this.validateImageFile(file, category);
    }

    return { valid: true };
  }

  /**
   * Validate image file with additional checks
   */
  private validateImageFile(file: any, category: string): MediaUploadValidationResult {
    const result: MediaUploadValidationResult = {
      valid: true,
      fileSize: file.size,
      mimeType: file.mimetype
    };

    // Category-specific validations
    if (category === 'logo') {
      // Recommend square images for logos
      result.warnings = ['For best results, use a square image (1:1 aspect ratio)'];
    }

    if (category === 'banner') {
      // Recommend wide images for banners
      result.warnings = ['For best results, use a wide image (16:9 or similar aspect ratio)'];
    }

    return result;
  }

  /**
   * Validate wallet address
   */
  async validateWalletAddress(
    address: string,
    options: {
      requireSignature?: boolean;
      signature?: string;
      message?: string;
      businessId?: string;
      checkOwnership?: boolean;
    } = {}
  ): Promise<WalletValidationResult> {
    try {
      // Basic format validation
      if (!this.isValidEthereumAddress(address)) {
        return {
          valid: false,
          errors: ['Invalid wallet address format']
        };
      }

      // Normalize address
      const normalizedAddress = ethers.getAddress(address);

      // Check if wallet is already in use by another business
      if (options.businessId) {
        const isInUse = await this.isWalletInUse(normalizedAddress, options.businessId);
        if (isInUse) {
          return {
            valid: false,
            errors: ['Wallet address is already in use by another brand']
          };
        }
      }

      // Signature verification for ownership proof
      if (options.requireSignature || options.signature) {
        if (!options.signature || !options.message) {
          return {
            valid: false,
            errors: ['Signature and message are required for wallet verification']
          };
        }

        const ownershipVerified = await this.verifyWalletSignature(
          normalizedAddress,
          options.message,
          options.signature
        );

        return {
          valid: true,
          verified: ownershipVerified,
          address: normalizedAddress,
          errors: ownershipVerified ? [] : ['Wallet signature verification failed']
        };
      }

      return {
        valid: true,
        verified: false,
        address: normalizedAddress
      };
    } catch (error: any) {
      logger.error('Wallet validation error:', error);
      return {
        valid: false,
        errors: [error.message || 'Wallet validation failed']
      };
    }
  }

  /**
   * Validate brand profile data
   */
  validateBrandData(
    data: any,
    level: 'basic' | 'profile' | 'complete' = 'basic'
  ): BrandDataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    const requiredFields = this.requiredFields[level];

    // Check required fields
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} is required`);
        missingFields.push(field);
      }
    });

    // Validate email format
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (data.contactEmail && !this.isValidEmail(data.contactEmail)) {
      errors.push('Invalid contact email format');
    }

    // Validate business name
    if (data.businessName) {
      if (data.businessName.length < 2) {
        errors.push('Business name must be at least 2 characters long');
      }
      if (data.businessName.length > 100) {
        errors.push('Business name cannot exceed 100 characters');
      }
    }

    // Validate description
    if (data.description) {
      if (data.description.length < 10) {
        warnings.push('Business description should be at least 10 characters for better SEO');
      }
      if (data.description.length > 1000) {
        errors.push('Description cannot exceed 1000 characters');
      }
    }

    // Validate industry
    if (data.industry && !this.isValidIndustry(data.industry)) {
      warnings.push('Industry should be from the predefined list for better categorization');
    }

    // Validate social URLs
    if (data.socialUrls) {
      this.validateSocialUrls(data.socialUrls, errors, warnings);
    }

    // Validate website URL
    if (data.website && !this.isValidUrl(data.website)) {
      errors.push('Invalid website URL format');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined
    };
  }

  /**
   * Validate theme color
   */
  validateThemeColor(color: string): { valid: boolean; error?: string; normalized?: string } {
    if (!color) {
      return { valid: false, error: 'Theme color is required' };
    }

    // Remove whitespace
    const cleanColor = color.trim();

    // Validate hex color format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(cleanColor)) {
      // Normalize to 6-digit hex
      const normalized = cleanColor.length === 4
        ? '#' + cleanColor.slice(1).split('').map(c => c + c).join('')
        : cleanColor;

      return {
        valid: true,
        normalized
      };
    }

    // Validate named colors (basic support)
    const namedColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'gray'];
    if (namedColors.includes(cleanColor.toLowerCase())) {
      return {
        valid: true,
        normalized: cleanColor.toLowerCase()
      };
    }

    return {
      valid: false,
      error: 'Invalid color format. Use hex format (#RRGGBB) or named colors.'
    };
  }

  /**
   * Validate CSS content
   */
  validateCustomCss(css: string): { valid: boolean; errors?: string[]; warnings?: string[] } {
    if (!css || css.trim() === '') {
      return { valid: true }; // Empty CSS is valid
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check length
    if (css.length > 50000) { // 50KB limit
      errors.push('Custom CSS cannot exceed 50KB');
    }

    // Basic security checks - prevent dangerous CSS
    const dangerousPatterns = [
      /@import/gi,           // Prevent external imports
      /javascript:/gi,       // Prevent JavaScript URLs
      /expression\(/gi,      // Prevent IE expressions
      /behavior:/gi,         // Prevent IE behaviors
      /binding:/gi,          // Prevent XML binding
      /-moz-binding:/gi,     // Prevent Mozilla bindings
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(css)) {
        errors.push(`Potentially unsafe CSS pattern detected: ${pattern.source}`);
      }
    });

    // Check for basic CSS syntax (very basic validation)
    const openBraces = (css.match(/{/g) || []).length;
    const closeBraces = (css.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      warnings.push('CSS appears to have mismatched braces');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Check if wallet is already in use
   */
  private async isWalletInUse(address: string, excludeBusinessId?: string): Promise<boolean> {
    const query: any = { certificateWallet: address };
    if (excludeBusinessId) {
      query.business = { $ne: excludeBusinessId };
    }

    const existing = await BrandSettings.findOne(query);
    return !!existing;
  }

  /**
   * Verify wallet signature
   */
  private async verifyWalletSignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      const normalizedAddress = ethers.getAddress(walletAddress);
      const messageHash = ethers.hashMessage(message);
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);

      const isValid = normalizedAddress.toLowerCase() === recoveredAddress.toLowerCase();

      if (isValid) {
        logger.info(`Signature verification successful for wallet: ${walletAddress}`);
      } else {
        logger.warn(`Signature verification failed - Expected: ${normalizedAddress}, Got: ${recoveredAddress}`);
      }

      return isValid;
    } catch (error) {
      logger.error('Wallet signature verification error:', error);
      return false;
    }
  }

  /**
   * Validate Ethereum address format
   */
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate industry against predefined list
   */
  private isValidIndustry(industry: string): boolean {
    const validIndustries = [
      'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
      'Retail', 'Food & Beverage', 'Transportation', 'Energy', 'Real Estate',
      'Media & Entertainment', 'Agriculture', 'Construction', 'Automotive',
      'Telecommunications', 'Hospitality', 'Legal', 'Consulting', 'Other'
    ];

    return validIndustries.includes(industry);
  }

  /**
   * Validate social media URLs
   */
  private validateSocialUrls(socialUrls: any, errors: string[], warnings: string[]): void {
    if (typeof socialUrls !== 'object' || Array.isArray(socialUrls)) {
      errors.push('Social URLs must be an object');
      return;
    }

    const validPlatforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'];
    const socialDomains = {
      twitter: ['twitter.com', 'x.com'],
      facebook: ['facebook.com', 'fb.com'],
      instagram: ['instagram.com'],
      linkedin: ['linkedin.com'],
      youtube: ['youtube.com', 'youtu.be'],
      tiktok: ['tiktok.com']
    };

    Object.entries(socialUrls).forEach(([platform, url]) => {
      if (!validPlatforms.includes(platform)) {
        warnings.push(`Unknown social platform: ${platform}`);
        return;
      }

      if (typeof url !== 'string' || !this.isValidUrl(url)) {
        errors.push(`Invalid URL for ${platform}`);
        return;
      }

      // Check if URL matches the platform
      const expectedDomains = socialDomains[platform as keyof typeof socialDomains];
      const urlObj = new URL(url);
      const isValidDomain = expectedDomains.some(domain =>
        urlObj.hostname === domain || urlObj.hostname === `www.${domain}`
      );

      if (!isValidDomain) {
        warnings.push(`URL for ${platform} should be from ${expectedDomains.join(' or ')}`);
      }
    });
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get field validation messages
   */
  getValidationMessages(): {
    businessName: string;
    email: string;
    description: string;
    themeColor: string;
    socialUrls: string;
  } {
    return {
      businessName: 'Business name must be 2-100 characters long',
      email: 'Please provide a valid email address',
      description: 'Description should be 10-1000 characters for best results',
      themeColor: 'Use hex format (#RRGGBB) or named colors',
      socialUrls: 'Provide valid URLs for social media platforms'
    };
  }

  /**
   * Get allowed file types for category
   */
  getAllowedMimeTypes(category: 'logo' | 'banner' | 'general' | 'document' = 'general'): string[] {
    return this.allowedMimeTypes[category];
  }

  /**
   * Get max file size for category
   */
  getMaxFileSize(category: 'logo' | 'banner' | 'general' | 'document' = 'general'): number {
    return this.maxFileSizes[category];
  }

  /**
   * Batch validate multiple brand profiles
   */
  async batchValidateBrandData(
    brands: Array<{ businessId: string; data: any }>,
    level: 'basic' | 'profile' | 'complete' = 'basic'
  ): Promise<Array<{ businessId: string; validation: BrandDataValidationResult }>> {
    return brands.map(brand => ({
      businessId: brand.businessId,
      validation: this.validateBrandData(brand.data, level)
    }));
  }
}
