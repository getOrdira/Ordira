// src/controllers/features/manufacturers/manufacturerScore.controller.ts
// Manufacturer score controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { ScoreCalculatorService } from '../../../services/manufacturers/utils/scoreCalculator.service';

/**
 * Manufacturer score request interfaces
 */
interface CalculateInitialProfileScoreRequest extends BaseRequest {
  validatedBody: {
    name: string;
    email: string;
    password: string;
    industry?: string;
    contactEmail?: string;
    description?: string;
    servicesOffered?: string[];
    moq?: number;
    headquarters?: {
      country?: string;
      city?: string;
      address?: string;
    };
  };
}

interface CalculateProfileScoreRequest extends BaseRequest {
  validatedBody: {
    manufacturerData: any;
  };
}

interface CalculateProfileCompletenessRequest extends BaseRequest {
  validatedBody: {
    manufacturerData: any;
  };
}

/**
 * Manufacturer score controller
 */
export class ManufacturerScoreController extends BaseController {
  private scoreCalculator = new ScoreCalculatorService();

  /**
   * POST /api/manufacturers/score/calculate-initial
   * Calculate initial profile score for new manufacturer registration
   */
  async calculateInitialProfileScore(req: CalculateInitialProfileScoreRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_INITIAL_PROFILE_SCORE');

        const registrationData = {
          name: req.validatedBody.name,
          email: req.validatedBody.email,
          password: req.validatedBody.password,
          industry: req.validatedBody.industry,
          contactEmail: req.validatedBody.contactEmail,
          description: req.validatedBody.description,
          servicesOffered: req.validatedBody.servicesOffered,
          moq: req.validatedBody.moq,
          headquarters: req.validatedBody.headquarters
        };

        const initialScore = this.scoreCalculator.calculateInitialProfileScore(registrationData);

        this.logAction(req, 'CALCULATE_INITIAL_PROFILE_SCORE_SUCCESS', {
          businessId: req.businessId,
          name: registrationData.name,
          email: registrationData.email,
          industry: registrationData.industry,
          hasContactEmail: !!registrationData.contactEmail,
          hasDescription: !!registrationData.description,
          servicesCount: registrationData.servicesOffered?.length || 0,
          hasMoq: registrationData.moq !== undefined,
          hasHeadquarters: !!registrationData.headquarters,
          initialScore
        });

        return { initialScore };
      });
    }, res, 'Initial profile score calculated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/score/calculate-profile
   * Calculate profile score
   */
  async calculateProfileScore(req: CalculateProfileScoreRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_PROFILE_SCORE');

        const profileScore = this.scoreCalculator.calculateProfileScore(req.validatedBody.manufacturerData);

        this.logAction(req, 'CALCULATE_PROFILE_SCORE_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedBody.manufacturerData._id || req.validatedBody.manufacturerData.id,
          manufacturerName: req.validatedBody.manufacturerData.name,
          industry: req.validatedBody.manufacturerData.industry,
          hasDescription: !!req.validatedBody.manufacturerData.description,
          hasContactEmail: !!req.validatedBody.manufacturerData.contactEmail,
          servicesCount: req.validatedBody.manufacturerData.servicesOffered?.length || 0,
          hasMoq: req.validatedBody.manufacturerData.moq !== undefined,
          hasHeadquarters: !!req.validatedBody.manufacturerData.headquarters,
          certificationsCount: req.validatedBody.manufacturerData.certifications?.length || 0,
          isEmailVerified: req.validatedBody.manufacturerData.isEmailVerified,
          profileScore
        });

        return { profileScore };
      });
    }, res, 'Profile score calculated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/score/calculate-completeness
   * Calculate profile completeness
   */
  async calculateProfileCompleteness(req: CalculateProfileCompletenessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_PROFILE_COMPLETENESS');

        const completeness = this.scoreCalculator.calculateProfileCompleteness(req.validatedBody.manufacturerData);

        this.logAction(req, 'CALCULATE_PROFILE_COMPLETENESS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedBody.manufacturerData._id || req.validatedBody.manufacturerData.id,
          manufacturerName: req.validatedBody.manufacturerData.name,
          industry: req.validatedBody.manufacturerData.industry,
          hasName: !!req.validatedBody.manufacturerData.name,
          hasEmail: !!req.validatedBody.manufacturerData.email,
          hasDescription: !!req.validatedBody.manufacturerData.description,
          hasIndustry: !!req.validatedBody.manufacturerData.industry,
          hasServicesOffered: !!req.validatedBody.manufacturerData.servicesOffered,
          hasMoq: req.validatedBody.manufacturerData.moq !== undefined,
          hasContactEmail: !!req.validatedBody.manufacturerData.contactEmail,
          completeness
        });

        return { completeness };
      });
    }, res, 'Profile completeness calculated successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerScoreController = new ManufacturerScoreController();
