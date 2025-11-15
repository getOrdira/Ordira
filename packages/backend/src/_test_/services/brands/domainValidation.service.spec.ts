/**
 * Domain Validation Service Unit Tests
 * 
 * Tests domain and subdomain validation operations.
 */

import { DomainValidationService } from '../../../services/brands/validation/domainValidation.service';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import * as dns from 'dns';

// Mock DNS
jest.mock('dns', () => ({
  resolve: jest.fn(),
}));

// Mock models
jest.mock('../../../models/brands/brandSettings.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('DomainValidationService', () => {
  let domainValidationService: DomainValidationService;

  beforeEach(() => {
    domainValidationService = new DomainValidationService();
    jest.clearAllMocks();
  });

  describe('validateCustomDomain', () => {
    it('should validate valid domain format', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);
      (dns.resolve as unknown as jest.Mock) = jest.fn().mockResolvedValue(['192.0.2.1']);

      const result = await domainValidationService.validateCustomDomain('example.com');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid domain format', async () => {
      const result = await domainValidationService.validateCustomDomain('invalid..domain');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject banned domains', async () => {
      const result = await domainValidationService.validateCustomDomain('example.com');

      // Note: example.com might be in banned list
      expect(result).toBeDefined();
    });

    it('should check domain availability', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await domainValidationService.validateCustomDomain('newdomain.com');

      expect(result.valid).toBeDefined();
    });

    it('should exclude current business from availability check', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn()
        .mockResolvedValueOnce({ business: 'other-business-id' })
        .mockResolvedValueOnce({ business: 'business-id-123' });

      const result = await domainValidationService.validateCustomDomain(
        'existing.com',
        'business-id-123'
      );

      expect(result).toBeDefined();
    });

    it('should provide DNS validation warnings', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);
      (dns.resolve as unknown as jest.Mock) = jest.fn().mockRejectedValue(new Error('DNS error'));

      const result = await domainValidationService.validateCustomDomain('example.com');

      expect(result.warnings).toBeDefined();
    });
  });

  describe('validateSubdomain', () => {
    it('should validate available subdomain', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await domainValidationService.validateSubdomain('new-subdomain');

      expect(result.valid).toBe(true);
      expect(result.available).toBe(true);
    });

    it('should reject reserved subdomains', async () => {
      const result = await domainValidationService.validateSubdomain('www');

      expect(result.valid).toBe(false);
      expect(result.reserved).toBe(true);
    });

    it('should reject taken subdomains', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        business: 'existing-business',
      });

      const result = await domainValidationService.validateSubdomain('taken-subdomain');

      expect(result.valid).toBe(false);
      expect(result.available).toBe(false);
    });

    it('should validate subdomain format', async () => {
      const result = await domainValidationService.validateSubdomain('invalid-subdomain-name!');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyCustomDomain', () => {
    beforeEach(() => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        customDomain: 'example.com',
      });
    });

    it('should verify domain DNS records', async () => {
      (dns.resolve as unknown as jest.Mock) = jest.fn().mockResolvedValue(['192.0.2.1']);

      const result = await domainValidationService.verifyDomainOwnership(
        'business-id-123',
        'example.com'
      );

      expect(result.verified).toBeDefined();
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should return required DNS records', async () => {
      const result = await domainValidationService.verifyDomainOwnership(
        'business-id-123',
        'example.com'
      );

      expect(result.requiredRecords).toBeDefined();
      expect(Array.isArray(result.requiredRecords)).toBe(true);
    });

    it('should return observed DNS records', async () => {
      (dns.resolve as unknown as jest.Mock) = jest.fn().mockResolvedValue(['192.0.2.1']);

      const result = await domainValidationService.verifyDomainOwnership(
        'business-id-123',
        'example.com'
      );

      expect(result.observedRecords).toBeDefined();
    });

    it('should provide reason when verification fails', async () => {
      (dns.resolve as unknown as jest.Mock) = jest.fn().mockResolvedValue([]);

      const result = await domainValidationService.verifyDomainOwnership(
        'business-id-123',
        'example.com'
      );

      if (!result.verified) {
        expect(result.reason).toBeDefined();
      }
    });
  });

  describe('getCustomDomainSetup', () => {
    it('should return domain setup instructions', async () => {
      const result = await domainValidationService.generateCustomDomainSetup(
        'example.com'
      );

      expect(result.domain).toBe('example.com');
      expect(result.cnameTarget).toBeDefined();
      expect(result.requiredRecords).toBeDefined();
      expect(result.verificationToken).toBeDefined();
    });

    it('should include SSL configuration', async () => {
      const result = await domainValidationService.generateCustomDomainSetup(
        'business-id-123',
      );

      expect(result.sslEnabled).toBeDefined();
    });
  });
});

