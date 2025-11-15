/**
 * Plan Validation Service Unit Tests
 * 
 * Tests plan feature validation and limitations.
 */

import { PlanValidationService } from '../../../services/brands/validation/planValidation.service';

describe('PlanValidationService', () => {
  let planValidationService: PlanValidationService;

  beforeEach(() => {
    planValidationService = new PlanValidationService();
  });

  describe('validateFeatureAccess', () => {
    it('should allow feature for foundation plan when allowed', () => {
      const result = planValidationService.validatePlanPermissions('foundation', 'Basic Profile');

      expect(result.valid).toBe(true);
    });

    it('should deny custom domain for foundation plan', () => {
      const result = planValidationService.validatePlanPermissions('foundation', 'customDomain');

      expect(result.valid).toBe(false);
      expect(result.requiredPlans).toContain('premium');
    });

    it('should allow custom domain for premium plan', () => {
      const result = planValidationService.validatePlanPermissions('premium', 'customDomain');

      expect(result.valid).toBe(true);
    });

    it('should allow advanced analytics for premium plan', () => {
      const result = planValidationService.validatePlanPermissions('premium', 'advancedAnalytics');

      expect(result.valid).toBe(true);
    });

    it('should require enterprise plan for white label', () => {
      const result = planValidationService.validatePlanPermissions('premium', 'whiteLabel');

      expect(result.valid).toBe(false);
      expect(result.requiredPlans).toContain('enterprise');
    });

    it('should provide message when feature is restricted', () => {
      const result = planValidationService.validatePlanPermissions('foundation', 'customDomain');

      expect(result.message).toBeDefined();
    });

    it('should list restricted features', () => {
      const result = planValidationService.validatePlanPermissions('foundation', 'customDomain');

      expect(result.restrictedFeatures).toBeDefined();
      expect(Array.isArray(result.restrictedFeatures)).toBe(true);
    });
  });

  describe('getPlanFeatures', () => {
    it('should return features for foundation plan', () => {
      const result = planValidationService.getPlanFeatures('foundation');

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.features.length).toBeGreaterThan(0);
    });

    it('should return features for growth plan', () => {
      const result = planValidationService.getPlanFeatures('growth');

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
    });

    it('should return features for premium plan', () => {
      const result = planValidationService.getPlanFeatures('premium');

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
    });

    it('should return features for enterprise plan', () => {
      const result = planValidationService.getPlanFeatures('enterprise');

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
    });
  });

  describe('getPlanLimitations', () => {
    it('should return limitations for foundation plan', () => {
      const result = planValidationService.getPlanLimitations('foundation');

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.foundation.length).toBeGreaterThan(0);
    });

    it('should return limitations for growth plan', () => {
      const result = planValidationService.getPlanLimitations('growth');

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
    });

    it('should return limitations for premium plan', () => {
      const result = planValidationService.getPlanLimitations('premium');

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
    });

    it('should return empty limitations for enterprise plan', () => {
      const result = planValidationService.getPlanLimitations('enterprise');

      expect(result.features).toBeDefined();
      expect(result.features.length).toBe(0);
    });
  });

  describe('isFeatureAvailable', () => {
    it('should return true for available feature', () => {
      const result = planValidationService.hasPlanPermission('premium', 'customDomain');

      expect(result).toBe(true);
    });

    it('should return false for unavailable feature', () => {
      const result = planValidationService.hasPlanPermission('foundation', 'customDomain');

      expect(result).toBe(false);
    });

    it('should check multiple plan levels', () => {
      const feature = 'customDomain';
      
      expect(planValidationService.hasPlanPermission('foundation', feature)).toBe(false);
      expect(planValidationService.hasPlanPermission('growth', feature)).toBe(false);
      expect(planValidationService.hasPlanPermission('premium', feature)).toBe(true);
      expect(planValidationService.hasPlanPermission('enterprise', feature)).toBe(true);
    });
  });

  describe('getRequiredPlanForFeature', () => {
    it('should return required plan for feature', () => {
      const result = planValidationService.getRequiredPlanForPermission('customDomain');

      expect(result).toBe('premium');
    });

    it('should return null for features available on all plans', () => {
      const result = planValidationService.getRequiredPlanForPermission('Basic Profile');

      expect(result).toBeNull();
    });

    it('should return enterprise for enterprise-only features', () => {
      const result = planValidationService.getRequiredPlanForPermission('whiteLabel');

      expect(result).toBe('enterprise');
    });
  });
});

