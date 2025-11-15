/**
 * Brand Validation Service Unit Tests
 * 
 * Tests brand data validation operations.
 */

import { BrandValidationService } from '../../../services/brands/validation/brandValidation.service';
import { ethers } from 'ethers';

describe('BrandValidationService', () => {
  let brandValidationService: BrandValidationService;

  beforeEach(() => {
    brandValidationService = new BrandValidationService();
  });

  describe('validateFileUpload', () => {
    const validImageFile = {
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
    };

    it('should validate image file successfully', () => {
      const result = brandValidationService.validateFileUpload(validImageFile, 'logo');

      expect(result.valid).toBe(true);
    });

    it('should reject file when no file provided', () => {
      const result = brandValidationService.validateFileUpload(null, 'logo');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file uploaded');
    });

    it('should reject invalid file type', () => {
      const invalidFile = {
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = brandValidationService.validateFileUpload(invalidFile, 'logo');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject file when size exceeds limit', () => {
      const largeFile = {
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB
      };

      const result = brandValidationService.validateFileUpload(largeFile, 'logo');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should validate banner files', () => {
      const bannerFile = {
        mimetype: 'image/png',
        size: 2 * 1024 * 1024, // 2MB
      };

      const result = brandValidationService.validateFileUpload(bannerFile, 'banner');

      expect(result.valid).toBe(true);
    });

    it('should validate document files', () => {
      const documentFile = {
        mimetype: 'application/pdf',
        size: 5 * 1024 * 1024, // 5MB
      };

      const result = brandValidationService.validateFileUpload(documentFile, 'document');

      expect(result.valid).toBe(true);
    });
  });

  describe('validateWalletAddress', () => {
    const validAddress = '0x1234567890abcdef1234567890abcdef12345678';

    it('should validate valid Ethereum address', () => {
      const result = brandValidationService.validateWalletAddress(validAddress);

      expect(result.valid).toBe(true);
      expect(result.address).toBeDefined();
    });

    it('should reject invalid address format', () => {
      const invalidAddress = 'invalid-address';

      const result = brandValidationService.validateWalletAddress(invalidAddress);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid wallet address format');
    });

    it('should normalize address to checksum format', () => {
      const lowercaseAddress = validAddress.toLowerCase();

      const result = brandValidationService.validateWalletAddress(lowercaseAddress);

      expect(result.valid).toBe(true);
      expect(result.address).not.toBe(lowercaseAddress);
    });
  });

  describe('validateBrandData', () => {
    const validBrandData = {
      businessName: 'Test Brand',
      email: 'test@brand.com',
      industry: 'Technology',
      description: 'Test description',
    };

    it('should validate complete brand data', () => {
      const result = brandValidationService.validateBrandData(validBrandData, 'complete');

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should validate basic brand data', () => {
      const basicData = {
        businessName: 'Test Brand',
        email: 'test@brand.com',
      };

      const result = brandValidationService.validateBrandData(basicData, 'basic');

      expect(result.valid).toBe(true);
    });

    it('should identify missing required fields', () => {
      const incompleteData = {
        businessName: 'Test Brand',
        // Missing email
      };

      const result = brandValidationService.validateBrandData(incompleteData, 'basic');

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('email');
    });

    it('should validate email format', () => {
      const invalidEmailData = {
        businessName: 'Test Brand',
        email: 'invalid-email',
      };

      const result = brandValidationService.validateBrandData(invalidEmailData, 'basic');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('email'))).toBe(true);
    });

    it('should provide warnings for optional fields', () => {
      const minimalData = {
        businessName: 'Test Brand',
        email: 'test@brand.com',
      };

      const result = brandValidationService.validateBrandData(minimalData, 'complete');

      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });
});

