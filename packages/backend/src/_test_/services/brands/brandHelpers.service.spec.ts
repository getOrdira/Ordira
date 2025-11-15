/**
 * Brand Helpers Service Unit Tests
 * 
 * Tests brand helper utilities.
 */

import { BrandHelpersService } from '../../../services/brands/utils/brandHelpers.service';

describe('BrandHelpersService', () => {
  let brandHelpersService: BrandHelpersService;

  beforeEach(() => {
    brandHelpersService = new BrandHelpersService();
  });

  describe('getPlanFeatures', () => {
    it('should return features for foundation plan', () => {
      const result = brandHelpersService.getPlanFeatures('foundation');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Basic Profile');
    });

    it('should return features for growth plan', () => {
      const result = brandHelpersService.getPlanFeatures('growth');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Enhanced Profile');
    });

    it('should return features for premium plan', () => {
      const result = brandHelpersService.getPlanFeatures('premium');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Custom Domain');
    });

    it('should return features for enterprise plan', () => {
      const result = brandHelpersService.getPlanFeatures('enterprise');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('White-label');
    });

    it('should return foundation features for invalid plan', () => {
      const result = brandHelpersService.getPlanFeatures('invalid' as any);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPlanLimitations', () => {
    it('should return limitations for foundation plan', () => {
      const result = brandHelpersService.getPlanLimitations('foundation');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return limitations for growth plan', () => {
      const result = brandHelpersService.getPlanLimitations('growth');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return limitations for premium plan', () => {
      const result = brandHelpersService.getPlanLimitations('premium');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty limitations for enterprise plan', () => {
      const result = brandHelpersService.getPlanLimitations('enterprise');

      expect(result).toEqual(['No limitations']);
    });
  });

  describe('getAvailableIntegrations', () => {
    it('should return integrations for foundation plan', () => {
      const result = brandHelpersService.getAvailableIntegrations('foundation');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('webhooks');
    });

    it('should return integrations for growth plan', () => {
      const result = brandHelpersService.getAvailableIntegrations('growth');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('shopify');
    });

    it('should return integrations for premium plan', () => {
      const result = brandHelpersService.getAvailableIntegrations('premium');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('slack');
    });

    it('should return integrations for enterprise plan', () => {
      const result = brandHelpersService.getAvailableIntegrations('enterprise');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('custom_api');
    });
  });

  describe('getWeb3Features', () => {
    it('should return empty array for foundation plan', () => {
      const result = brandHelpersService.getWeb3Features('foundation');

      expect(result).toEqual([]);
    });

    it('should return empty array for growth plan', () => {
      const result = brandHelpersService.getWeb3Features('growth');

      expect(result).toEqual([]);
    });

    it('should return Web3 features for premium plan', () => {
      const result = brandHelpersService.getWeb3Features('premium');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Wallet Integration');
    });

    it('should return Web3 features for enterprise plan', () => {
      const result = brandHelpersService.getWeb3Features('enterprise');

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getNftCapabilities', () => {
    it('should return empty array for foundation plan', () => {
      const result = brandHelpersService.getNftCapabilities('foundation');

      expect(result).toEqual([]);
    });

    it('should return NFT capabilities for premium plan', () => {
      const result = brandHelpersService.getNftCapabilities('premium');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Standard NFT Minting');
    });

    it('should return NFT capabilities for enterprise plan', () => {
      const result = brandHelpersService.getNftCapabilities('enterprise');

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Custom Contracts');
    });
  });
});

