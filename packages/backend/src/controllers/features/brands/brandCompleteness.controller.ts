// src/controllers/features/brands/brandCompleteness.controller.ts
// Brand completeness controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getBrandsServices } from '../../../services/container.service';

/**
 * Brand completeness request interfaces
 */
interface CalculateCompletenessRequest extends BaseRequest {
  validatedQuery?: {
    plan?: string;
    includeRecommendations?: boolean;
  };
}

interface GetConfigRequest extends BaseRequest {
  validatedQuery: {
    plan: string;
  };
}

/**
 * Brand completeness controller
 */
export class BrandCompletenessController extends BaseController {
  private brandServices = getBrandsServices();

  /**
   * Calculate business profile completeness
   */
  async calculateBusinessProfileCompleteness(req: CalculateCompletenessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_BUSINESS_PROFILE_COMPLETENESS');

        const plan = req.validatedQuery?.plan || 'foundation';
        const profile = await this.brandServices.profile.getBrandProfile(req.businessId!);
        const result = this.brandServices.completeness.calculateBusinessProfileCompleteness(profile, plan);
        
        this.logAction(req, 'CALCULATE_BUSINESS_PROFILE_COMPLETENESS_SUCCESS', {
          businessId: req.businessId,
          plan,
          score: result.score
        });

        return { result };
      });
    }, res, 'Business profile completeness calculated', this.getRequestMeta(req));
  }

  /**
   * Calculate brand settings completeness
   */
  async calculateBrandSettingsCompleteness(req: CalculateCompletenessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_BRAND_SETTINGS_COMPLETENESS');

        const plan = req.validatedQuery?.plan || 'foundation';
        const settings = await this.brandServices.settings.getSettings(req.businessId!);
        const result = this.brandServices.completeness.calculateBrandSettingsCompleteness(settings, plan);
        
        this.logAction(req, 'CALCULATE_BRAND_SETTINGS_COMPLETENESS_SUCCESS', {
          businessId: req.businessId,
          plan,
          score: result.score
        });

        return { result };
      });
    }, res, 'Brand settings completeness calculated', this.getRequestMeta(req));
  }

  /**
   * Calculate integration completeness
   */
  async calculateIntegrationCompleteness(req: CalculateCompletenessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_INTEGRATION_COMPLETENESS');

        const plan = req.validatedQuery?.plan || 'foundation';
        const settings = await this.brandServices.settings.getSettings(req.businessId!);
        const integrations = {};
        const result = this.brandServices.completeness.calculateIntegrationCompleteness(integrations, plan);
        
        this.logAction(req, 'CALCULATE_INTEGRATION_COMPLETENESS_SUCCESS', {
          businessId: req.businessId,
          plan,
          score: result.score
        });

        return { result };
      });
    }, res, 'Integration completeness calculated', this.getRequestMeta(req));
  }

  /**
   * Calculate overall completeness
   */
  async calculateOverallCompleteness(req: CalculateCompletenessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_OVERALL_COMPLETENESS');

        const plan = req.validatedQuery?.plan || 'foundation';
        const profile = await this.brandServices.profile.getBrandProfile(req.businessId!);
        const settings = await this.brandServices.settings.getSettings(req.businessId!);
        const integrations = {};
        const result = this.brandServices.completeness.calculateOverallCompleteness(profile, settings, integrations, plan);
        
        this.logAction(req, 'CALCULATE_OVERALL_COMPLETENESS_SUCCESS', {
          businessId: req.businessId,
          plan,
          score: result.score
        });

        return { result };
      });
    }, res, 'Overall completeness calculated', this.getRequestMeta(req));
  }

  /**
   * Get business profile configuration
   */
  async getBusinessProfileConfig(req: GetConfigRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_BUSINESS_PROFILE_CONFIG');

        const config = this.brandServices.completeness.getBusinessProfileConfig(req.validatedQuery.plan);
        
        this.logAction(req, 'GET_BUSINESS_PROFILE_CONFIG_SUCCESS', {
          businessId: req.businessId,
          plan: req.validatedQuery.plan,
          fieldCount: config.requiredFields.length + config.optionalFields.length
        });

        return { config };
      });
    }, res, 'Business profile configuration retrieved', this.getRequestMeta(req));
  }

  /**
   * Get brand settings configuration
   */
  async getBrandSettingsConfig(req: GetConfigRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_BRAND_SETTINGS_CONFIG');

        const config = this.brandServices.completeness.getBrandSettingsConfig(req.validatedQuery.plan);
        
        this.logAction(req, 'GET_BRAND_SETTINGS_CONFIG_SUCCESS', {
          businessId: req.businessId,
          plan: req.validatedQuery.plan,
          fieldCount: config.requiredFields.length + config.optionalFields.length
        });

        return { config };
      });
    }, res, 'Brand settings configuration retrieved', this.getRequestMeta(req));
  }

  /**
   * Get integration configuration
   */
  async getIntegrationConfig(req: GetConfigRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_INTEGRATION_CONFIG');

        const config = this.brandServices.completeness.getIntegrationConfig(req.validatedQuery.plan);
        
        this.logAction(req, 'GET_INTEGRATION_CONFIG_SUCCESS', {
          businessId: req.businessId,
          plan: req.validatedQuery.plan,
          fieldCount: config.requiredFields.length + config.optionalFields.length
        });

        return { config };
      });
    }, res, 'Integration configuration retrieved', this.getRequestMeta(req));
  }

  /**
   * Calculate simple profile completeness (legacy support)
   */
  async calculateSimpleProfileCompleteness(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_SIMPLE_PROFILE_COMPLETENESS');

        const profile = await this.brandServices.profile.getBrandProfile(req.businessId!);
        const score = this.brandServices.completeness.calculateSimpleProfileCompleteness(profile);
        
        this.logAction(req, 'CALCULATE_SIMPLE_PROFILE_COMPLETENESS_SUCCESS', {
          businessId: req.businessId,
          score
        });

        return { score };
      });
    }, res, 'Simple profile completeness calculated', this.getRequestMeta(req));
  }

  /**
   * Calculate simple setup completeness (legacy support)
   */
  async calculateSimpleSetupCompleteness(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_SIMPLE_SETUP_COMPLETENESS');

        const settings = await this.brandServices.settings.getSettings(req.businessId!);
        const score = this.brandServices.completeness.calculateSimpleSetupCompleteness(settings);
        
        this.logAction(req, 'CALCULATE_SIMPLE_SETUP_COMPLETENESS_SUCCESS', {
          businessId: req.businessId,
          score
        });

        return { score };
      });
    }, res, 'Simple setup completeness calculated', this.getRequestMeta(req));
  }
}

// Export controller instance
export const brandCompletenessController = new BrandCompletenessController();