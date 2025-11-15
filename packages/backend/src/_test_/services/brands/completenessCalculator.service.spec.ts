/**
 * Completeness Calculator Service Unit Tests
 * 
 * Tests profile completeness calculation logic.
 */

import { CompletenessCalculatorService } from '../../../services/brands/utils/completenessCalculator.service';

describe('CompletenessCalculatorService', () => {
  let completenessCalculator: CompletenessCalculatorService;

  beforeEach(() => {
    completenessCalculator = new CompletenessCalculatorService();
  });

  describe('calculateBusinessProfileCompleteness', () => {
    const completeProfile = {
      businessName: 'Test Brand',
      email: 'test@brand.com',
      industry: 'Technology',
      description: 'Test description',
      contactEmail: 'contact@brand.com',
      profilePictureUrl: 'https://example.com/logo.jpg',
      socialUrls: ['https://twitter.com/brand'],
      website: 'https://brand.com',
      phoneNumber: '+1234567890',
    };

    it('should calculate completeness for complete profile', async () => {
      const result = await completenessCalculator.calculateBusinessProfileCompleteness(
        completeProfile,
        'premium'
      );

      expect(result.score).toBeGreaterThan(0);
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.percentage).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
    });

    it('should identify missing required fields', async () => {
      const incompleteProfile = {
        businessName: 'Test Brand',
        // Missing other required fields
      };

      const result = await completenessCalculator.calculateBusinessProfileCompleteness(
        incompleteProfile,
        'foundation'
      );

      expect(result.breakdown.required.missing.length).toBeGreaterThan(0);
    });

    it('should calculate scores by category', async () => {
      const result = await completenessCalculator.calculateBusinessProfileCompleteness(
        completeProfile,
        'premium'
      );

      expect(result.breakdown.required.score).toBeDefined();
      expect(result.breakdown.optional.score).toBeDefined();
      if (result.breakdown.premium) {
        expect(result.breakdown.premium.score).toBeDefined();
      }
    });

    it('should provide recommendations', async () => {
      const incompleteProfile = {
        businessName: 'Test Brand',
        email: 'test@brand.com',
      };

      const result = await completenessCalculator.calculateBusinessProfileCompleteness(
        incompleteProfile,
        'foundation'
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide next steps', async () => {
      const incompleteProfile = {
        businessName: 'Test Brand',
      };

      const result = await completenessCalculator.calculateBusinessProfileCompleteness(
        incompleteProfile,
        'foundation'
      );

      expect(result.nextSteps.length).toBeGreaterThan(0);
    });

    it('should handle different plan levels', async () => {
      const plans = ['foundation', 'growth', 'premium', 'enterprise'];

      for (const plan of plans) {
        const result = await completenessCalculator.calculateBusinessProfileCompleteness(
          completeProfile,
          plan
        );

        expect(result.score).toBeDefined();
        expect(result.percentage).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getBusinessProfileConfig', () => {
    it('should return config for foundation plan', () => {
      const result = completenessCalculator.getBusinessProfileConfig('foundation');

      expect(result.requiredFields).toBeDefined();
      expect(result.optionalFields).toBeDefined();
      expect(result.weights).toBeDefined();
    });

    it('should return config for premium plan', () => {
      const result = completenessCalculator.getBusinessProfileConfig('premium');

      expect(result.premiumFields).toBeDefined();
    });

    it('should return config for enterprise plan', () => {
      const result = completenessCalculator.getBusinessProfileConfig('enterprise');

      expect(result.enterpriseFields).toBeDefined();
    });
  });
});

