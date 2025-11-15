/**
 * Score Calculator Service Unit Tests
 * 
 * Tests manufacturer profile score calculation logic.
 */

import { ScoreCalculatorService } from '../../../services/manufacturers/utils/scoreCalculator.service';

describe('ScoreCalculatorService', () => {
  let scoreCalculatorService: ScoreCalculatorService;

  beforeEach(() => {
    scoreCalculatorService = new ScoreCalculatorService();
  });

  describe('calculateInitialProfileScore', () => {
    it('should calculate initial profile score for registration data', () => {
      const registrationData = {
        name: 'Test Manufacturer',
        description: 'Test description',
        industry: 'Technology',
        contactEmail: 'contact@manufacturer.com',
        servicesOffered: ['Production', 'Assembly'],
        moq: 100,
        headquarters: {
          country: 'US',
          city: 'New York',
        },
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(registrationData);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should award points for name', () => {
      const data = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'password',
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(10);
    });

    it('should award points for description', () => {
      const data = {
        name: 'Test Manufacturer',
        description: 'Test description',
        email: 'test@example.com',
        password: 'password',
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(25);
    });

    it('should award points for industry', () => {
      const data = {
        name: 'Test Manufacturer',
        industry: 'Technology',
        email: 'test@example.com',
        password: 'password',
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(20);
    });

    it('should award points for contact email', () => {
      const data = {
        name: 'Test Manufacturer',
        contactEmail: 'contact@example.com',
        email: 'test@example.com',
        password: 'password',
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(15);
    });

    it('should award points for services offered', () => {
      const data = {
        name: 'Test Manufacturer',
        servicesOffered: ['Production', 'Assembly'],
        email: 'test@example.com',
        password: 'password',
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('should award points for MOQ', () => {
      const data = {
        name: 'Test Manufacturer',
        moq: 100,
        email: 'test@example.com',
        password: 'password',
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(20);
    });

    it('should award points for headquarters country', () => {
      const data = {
        name: 'Test Manufacturer',
        headquarters: {
          country: 'US',
        },
        email: 'test@example.com',
        password: 'password',
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(20);
    });

    it('should calculate maximum score for complete profile', () => {
      const completeData = {
        name: 'Test Manufacturer',
        description: 'Comprehensive description',
        industry: 'Technology',
        contactEmail: 'contact@manufacturer.com',
        servicesOffered: ['Production', 'Assembly', 'Quality Control'],
        moq: 100,
        headquarters: {
          country: 'US',
          city: 'New York',
          address: '123 Main St',
        },
      };

      const score = scoreCalculatorService.calculateInitialProfileScore(completeData);

      expect(score).toBeGreaterThan(50);
    });
  });

  describe('calculateProfileScore', () => {
    it('should calculate comprehensive profile score', () => {
      const manufacturerData = {
        name: 'Test Manufacturer',
        description: 'A comprehensive description that is longer than 50 characters',
        industry: 'Technology',
        contactEmail: 'contact@manufacturer.com',
        servicesOffered: ['Production', 'Assembly'],
        moq: 100,
        headquarters: {
          country: 'US',
        },
        certifications: ['ISO 9001', 'ISO 14001'],
        isEmailVerified: true,
      };

      const score = scoreCalculatorService.calculateProfileScore(manufacturerData);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should award points for certifications', () => {
      const data = {
        name: 'Test Manufacturer',
        certifications: ['ISO 9001'],
      };

      const score = scoreCalculatorService.calculateProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(25);
    });

    it('should award points for email verification', () => {
      const data = {
        name: 'Test Manufacturer',
        isEmailVerified: true,
      };

      const score = scoreCalculatorService.calculateProfileScore(data);

      expect(score).toBeGreaterThanOrEqual(15);
    });

    it('should require description length over 50 characters', () => {
      const dataWithShortDesc = {
        name: 'Test Manufacturer',
        description: 'Short',
        industry: 'Technology',
      };

      const dataWithLongDesc = {
        name: 'Test Manufacturer',
        description: 'A comprehensive description that is longer than 50 characters',
        industry: 'Technology',
      };

      const shortScore = scoreCalculatorService.calculateProfileScore(dataWithShortDesc);
      const longScore = scoreCalculatorService.calculateProfileScore(dataWithLongDesc);

      expect(longScore).toBeGreaterThan(shortScore);
    });
  });

  describe('calculateProfileCompleteness', () => {
    it('should calculate profile completeness percentage', () => {
      const manufacturerData = {
        name: 'Test Manufacturer',
        description: 'Test description',
        industry: 'Technology',
        contactEmail: 'contact@manufacturer.com',
        servicesOffered: ['Production'],
        moq: 100,
        headquarters: {
          country: 'US',
        },
        certifications: ['ISO 9001'],
        isEmailVerified: true,
      };

      const completeness = scoreCalculatorService.calculateProfileCompleteness(manufacturerData);

      expect(completeness).toBeGreaterThanOrEqual(0);
      expect(completeness).toBeLessThanOrEqual(100);
    });

    it('should return 0% for empty profile', () => {
      const emptyData = {};

      const completeness = scoreCalculatorService.calculateProfileCompleteness(emptyData);

      expect(completeness).toBe(0);
    });

    it('should return 100% for complete profile', () => {
      const completeData = {
        name: 'Test Manufacturer',
        description: 'A comprehensive description that is longer than 50 characters',
        industry: 'Technology',
        contactEmail: 'contact@manufacturer.com',
        servicesOffered: ['Production', 'Assembly'],
        moq: 100,
        headquarters: {
          country: 'US',
          city: 'New York',
        },
        certifications: ['ISO 9001', 'ISO 14001'],
        isEmailVerified: true,
      };

      const completeness = scoreCalculatorService.calculateProfileCompleteness(completeData);

      expect(completeness).toBeGreaterThan(0);
    });

    it('should round completeness to nearest integer', () => {
      const manufacturerData = {
        name: 'Test Manufacturer',
      };

      const completeness = scoreCalculatorService.calculateProfileCompleteness(manufacturerData);

      expect(Number.isInteger(completeness)).toBe(true);
    });
  });
});

