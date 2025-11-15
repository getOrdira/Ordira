/**
 * Manufacturer Validation Service Unit Tests
 * 
 * Tests manufacturer validation for registration and profile updates.
 */

import { ManufacturerValidationService } from '../../../services/manufacturers/validation/manufacturerValidation.service';
import { UtilsService } from '../../../services/infrastructure/shared';

// Mock infrastructure services
const mockUtilsService = {
  isValidEmail: jest.fn(),
};

// Mock the infrastructure shared services
jest.mock('../../../services/infrastructure/shared', () => ({
  UtilsService: mockUtilsService,
}));

describe('ManufacturerValidationService', () => {
  let manufacturerValidationService: ManufacturerValidationService;

  beforeEach(() => {
    manufacturerValidationService = new ManufacturerValidationService();
    jest.clearAllMocks();
    
    mockUtilsService.isValidEmail.mockReturnValue(true);
  });

  describe('validateRegistration', () => {
    it('should validate registration data successfully with all valid fields', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = manufacturerValidationService.validateRegistration({
        name: 'Test Manufacturer',
        email: 'test@manufacturer.com',
        password: 'SecurePass123!',
        industry: 'Automotive Manufacturing',
        contactEmail: 'contact@manufacturer.com',
        description: 'A professional manufacturing company with years of experience in automotive manufacturing and production.',
        servicesOffered: ['Custom Manufacturing', 'CNC Machining'],
        moq: 100,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toBeDefined();
    });

    it('should return error when name is too short', () => {
      const result = manufacturerValidationService.validateRegistration({
        name: 'T',
        email: 'test@manufacturer.com',
        password: 'SecurePass123!',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Manufacturer name must be at least 2 characters long');
    });

    it('should return error when name exceeds maximum length', () => {
      const result = manufacturerValidationService.validateRegistration({
        name: 'A'.repeat(101),
        email: 'test@manufacturer.com',
        password: 'SecurePass123!',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Manufacturer name cannot exceed 100 characters');
    });

    it('should return error when email is invalid', () => {
      mockUtilsService.isValidEmail.mockReturnValue(false);

      const result = manufacturerValidationService.validateRegistration({
        name: 'Test Manufacturer',
        email: 'invalid-email',
        password: 'SecurePass123!',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should return warning when using personal email domain', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = manufacturerValidationService.validateRegistration({
        name: 'Test Manufacturer',
        email: 'test@gmail.com',
        password: 'SecurePass123!',
      });

      expect(result.warnings).toContain('Consider using a business email address instead of a personal email');
    });

    it('should return error when password is too short', () => {
      const result = manufacturerValidationService.validateRegistration({
        name: 'Test Manufacturer',
        email: 'test@manufacturer.com',
        password: '1234567',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return error when password lacks required characters', () => {
      const result = manufacturerValidationService.validateRegistration({
        name: 'Test Manufacturer',
        email: 'test@manufacturer.com',
        password: 'simplepassword',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    });

    it('should return error when industry is invalid', () => {
      const result = manufacturerValidationService.validateRegistration({
        name: 'Test Manufacturer',
        email: 'test@manufacturer.com',
        password: 'SecurePass123!',
        industry: 'Invalid Industry',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid industry selection');
    });

    it('should accept valid industries', () => {
      const result = manufacturerValidationService.validateRegistration({
        name: 'Test Manufacturer',
        email: 'test@manufacturer.com',
        password: 'SecurePass123!',
        industry: 'Automotive Manufacturing',
      });

      expect(result.errors.filter(e => e.includes('industry'))).toHaveLength(0);
    });

    it('should return error when description exceeds maximum length', () => {
      const result = manufacturerValidationService.validateRegistration({
        name: 'Test Manufacturer',
        email: 'test@manufacturer.com',
        password: 'SecurePass123!',
        description: 'A'.repeat(2001),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description cannot exceed 2000 characters');
    });
  });

  describe('validateServices', () => {
    it('should validate services array successfully', () => {
      const result = manufacturerValidationService.validateServices([
        'Custom Manufacturing',
        'CNC Machining',
        'Assembly Services',
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when services is not an array', () => {
      const result = manufacturerValidationService.validateServices('not an array' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Services must be an array');
    });

    it('should return warning when services array is empty', () => {
      const result = manufacturerValidationService.validateServices([]);

      expect(result.warnings).toContain('Consider adding at least one service for better visibility');
    });

    it('should return error when too many services provided', () => {
      const services = Array(21).fill('Service');
      const result = manufacturerValidationService.validateServices(services);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot offer more than 20 services');
    });

    it('should return error when duplicate services found', () => {
      const result = manufacturerValidationService.validateServices([
        'Custom Manufacturing',
        'custom manufacturing',
        'CNC Machining',
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate services are not allowed');
    });

    it('should return error when service is too short', () => {
      const result = manufacturerValidationService.validateServices(['AB']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service at position 1 must be at least 3 characters');
    });

    it('should return error when service exceeds maximum length', () => {
      const result = manufacturerValidationService.validateServices(['A'.repeat(101)]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service at position 1 cannot exceed 100 characters');
    });
  });

  describe('validateMOQ', () => {
    it('should validate valid MOQ', () => {
      const result = manufacturerValidationService.validateMOQ(100);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when MOQ is not a number', () => {
      const result = manufacturerValidationService.validateMOQ('100' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MOQ must be a number');
    });

    it('should return error when MOQ is not an integer', () => {
      const result = manufacturerValidationService.validateMOQ(100.5);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MOQ must be a whole number');
    });

    it('should return error when MOQ is less than 1', () => {
      const result = manufacturerValidationService.validateMOQ(0);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MOQ must be at least 1');
    });

    it('should return error when MOQ is unusually high', () => {
      const result = manufacturerValidationService.validateMOQ(2000000);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MOQ seems unusually high, please verify');
    });

    it('should return warning for very low MOQ', () => {
      const result = manufacturerValidationService.validateMOQ(5);

      expect(result.warnings).toContain('Very low MOQ - ensure this is accurate for your business model');
    });

    it('should return warning for very high MOQ', () => {
      const result = manufacturerValidationService.validateMOQ(200000);

      expect(result.warnings).toContain('Very high MOQ - this may limit potential customers');
    });
  });

  describe('validateDescription', () => {
    it('should validate description with sufficient length', () => {
      const longDescription = 'A professional manufacturing company with years of experience in automotive manufacturing and production. We specialize in high-quality custom manufacturing services.';
      const result = manufacturerValidationService.validateDescription(longDescription);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return warning when description is too short', () => {
      const result = manufacturerValidationService.validateDescription('Short description');

      expect(result.warnings).toContain('Description should be at least 50 characters for better visibility');
    });

    it('should return error when description exceeds maximum length', () => {
      const result = manufacturerValidationService.validateDescription('A'.repeat(2001));

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description cannot exceed 2000 characters');
    });

    it('should return warning when word count is too low', () => {
      const result = manufacturerValidationService.validateDescription('A'.repeat(60));

      expect(result.warnings).toContain('Description should contain at least 20 words for meaningful content');
    });

    it('should return error when spam patterns detected', () => {
      const result = manufacturerValidationService.validateDescription('Cheap prices now! Discount sale today!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description contains unprofessional or promotional language');
    });
  });

  describe('validateCertifications', () => {
    it('should validate valid certifications', () => {
      const result = manufacturerValidationService.validateCertifications([
        'ISO 9001',
        'ISO 14001',
        'FDA Approved',
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when certifications is not an array', () => {
      const result = manufacturerValidationService.validateCertifications('not array' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Certifications must be an array');
    });

    it('should return error when too many certifications provided', () => {
      const certs = Array(21).fill('ISO 9001');
      const result = manufacturerValidationService.validateCertifications(certs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot have more than 20 certifications');
    });

    it('should validate certification object format', () => {
      const result = manufacturerValidationService.validateCertifications([
        {
          name: 'ISO 9001',
          issuer: 'ISO',
          issueDate: new Date(),
        },
      ]);

      expect(result.isValid).toBe(true);
    });

    it('should return warning for expired certification', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const result = manufacturerValidationService.validateCertifications([
        {
          name: 'ISO 9001',
          issuer: 'ISO',
          issueDate: pastDate,
          expiryDate: pastDate,
        },
      ]);

      expect(result.warnings.some(w => w.includes('expired'))).toBe(true);
    });
  });

  describe('validateHeadquarters', () => {
    it('should validate valid headquarters', () => {
      const result = manufacturerValidationService.validateHeadquarters({
        country: 'United States',
        city: 'New York',
        address: '123 Main Street, New York, NY 10001',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when headquarters is not an object', () => {
      const result = manufacturerValidationService.validateHeadquarters('not object' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Headquarters must be an object');
    });

    it('should validate coordinates', () => {
      const result = manufacturerValidationService.validateHeadquarters({
        country: 'United States',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      });

      expect(result.isValid).toBe(true);
    });

    it('should return error for invalid latitude', () => {
      const result = manufacturerValidationService.validateHeadquarters({
        coordinates: {
          latitude: 100,
          longitude: -74.0060,
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Latitude must be between -90 and 90');
    });

    it('should return error for invalid longitude', () => {
      const result = manufacturerValidationService.validateHeadquarters({
        coordinates: {
          latitude: 40.7128,
          longitude: 200,
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Longitude must be between -180 and 180');
    });
  });

  describe('utility methods', () => {
    it('should check if industry is valid', () => {
      expect(manufacturerValidationService.isValidIndustry('Automotive Manufacturing')).toBe(true);
      expect(manufacturerValidationService.isValidIndustry('Invalid Industry')).toBe(false);
    });

    it('should check if service is recognized', () => {
      expect(manufacturerValidationService.isRecognizedService('Custom Manufacturing')).toBe(true);
      expect(manufacturerValidationService.isRecognizedService('Unknown Service')).toBe(false);
    });

    it('should check if certification is recognized', () => {
      expect(manufacturerValidationService.isRecognizedCertification('ISO 9001')).toBe(true);
      expect(manufacturerValidationService.isRecognizedCertification('Unknown Cert')).toBe(false);
    });

    it('should get valid industries list', () => {
      const industries = manufacturerValidationService.getValidIndustries();
      expect(Array.isArray(industries)).toBe(true);
      expect(industries.length).toBeGreaterThan(0);
      expect(industries).toContain('Automotive Manufacturing');
    });

    it('should get valid services list', () => {
      const services = manufacturerValidationService.getValidServices();
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      expect(services).toContain('Custom Manufacturing');
    });

    it('should get recognized certifications list', () => {
      const certs = manufacturerValidationService.getRecognizedCertifications();
      expect(Array.isArray(certs)).toBe(true);
      expect(certs.length).toBeGreaterThan(0);
      expect(certs).toContain('ISO 9001');
    });
  });
});

