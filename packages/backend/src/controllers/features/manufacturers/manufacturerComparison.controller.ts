// src/controllers/features/manufacturers/manufacturerComparison.controller.ts
// Manufacturer comparison controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { ComparisonEngineService } from '../../../services/manufacturers/utils/comparisonEngine.service';

/**
 * Manufacturer comparison request interfaces
 */
interface CompareManufacturersRequest extends BaseRequest {
  validatedBody: {
    manufacturer1: any;
    manufacturer2: any;
  };
}

interface FindSimilarManufacturersRequest extends BaseRequest {
  validatedBody: {
    sourceManufacturer: any;
    candidates: any[];
    threshold?: number;
  };
}

interface MatchAgainstCriteriaRequest extends BaseRequest {
  validatedBody: {
    manufacturer: any;
    criteria: {
      industry?: string;
      services?: string[];
      moqRange?: { min?: number; max?: number };
      location?: string;
      certifications?: string[];
    };
  };
}

interface RankManufacturersRequest extends BaseRequest {
  validatedBody: {
    manufacturers: any[];
    weights?: {
      profileScore?: number;
      matchScore?: number;
      certificationCount?: number;
      servicesCount?: number;
    };
  };
}

/**
 * Manufacturer comparison controller
 */
export class ManufacturerComparisonController extends BaseController {
  private comparisonEngine = new ComparisonEngineService();

  /**
   * POST /api/manufacturers/comparison/compare-two
   * Compare two manufacturers and return similarity score
   */
  async compareManufacturers(req: CompareManufacturersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'COMPARE_TWO_MANUFACTURERS');

        const similarityScore = this.comparisonEngine.compareManufacturers(
          req.validatedBody.manufacturer1,
          req.validatedBody.manufacturer2
        );

        this.logAction(req, 'COMPARE_TWO_MANUFACTURERS_SUCCESS', {
          businessId: req.businessId,
          manufacturer1Id: req.validatedBody.manufacturer1._id || req.validatedBody.manufacturer1.id,
          manufacturer2Id: req.validatedBody.manufacturer2._id || req.validatedBody.manufacturer2.id,
          manufacturer1Name: req.validatedBody.manufacturer1.name,
          manufacturer2Name: req.validatedBody.manufacturer2.name,
          similarityScore
        });

        return { similarityScore };
      });
    }, res, 'Manufacturers compared successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/comparison/find-similar
   * Find similar manufacturers
   */
  async findSimilarManufacturers(req: FindSimilarManufacturersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'FIND_SIMILAR_MANUFACTURERS');

        const threshold = req.validatedBody.threshold || 50;
        const similarManufacturers = this.comparisonEngine.findSimilarManufacturers(
          req.validatedBody.sourceManufacturer,
          req.validatedBody.candidates,
          threshold
        );

        this.logAction(req, 'FIND_SIMILAR_MANUFACTURERS_SUCCESS', {
          businessId: req.businessId,
          sourceManufacturerId: req.validatedBody.sourceManufacturer._id || req.validatedBody.sourceManufacturer.id,
          sourceManufacturerName: req.validatedBody.sourceManufacturer.name,
          candidatesCount: req.validatedBody.candidates.length,
          threshold,
          similarCount: similarManufacturers.length,
          topMatchScore: similarManufacturers.length > 0 ? similarManufacturers[0].matchScore : 0
        });

        return { similarManufacturers };
      });
    }, res, 'Similar manufacturers found successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/comparison/match-criteria
   * Match manufacturer against criteria
   */
  async matchAgainstCriteria(req: MatchAgainstCriteriaRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'MATCH_AGAINST_CRITERIA');

        const matchScore = this.comparisonEngine.matchAgainstCriteria(
          req.validatedBody.manufacturer,
          req.validatedBody.criteria
        );

        this.logAction(req, 'MATCH_AGAINST_CRITERIA_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedBody.manufacturer._id || req.validatedBody.manufacturer.id,
          manufacturerName: req.validatedBody.manufacturer.name,
          criteria: Object.keys(req.validatedBody.criteria),
          hasIndustry: !!req.validatedBody.criteria.industry,
          hasServices: !!req.validatedBody.criteria.services,
          hasMoqRange: !!req.validatedBody.criteria.moqRange,
          hasLocation: !!req.validatedBody.criteria.location,
          hasCertifications: !!req.validatedBody.criteria.certifications,
          matchScore
        });

        return { matchScore };
      });
    }, res, 'Manufacturer matched against criteria successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/comparison/rank
   * Rank manufacturers
   */
  async rankManufacturers(req: RankManufacturersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'RANK_MANUFACTURERS');

        const weights = req.validatedBody.weights || {};
        const rankedManufacturers = this.comparisonEngine.rankManufacturers(
          req.validatedBody.manufacturers,
          weights
        );

        this.logAction(req, 'RANK_MANUFACTURERS_SUCCESS', {
          businessId: req.businessId,
          manufacturersCount: req.validatedBody.manufacturers.length,
          weights: Object.keys(weights),
          profileScoreWeight: weights.profileScore,
          matchScoreWeight: weights.matchScore,
          certificationCountWeight: weights.certificationCount,
          servicesCountWeight: weights.servicesCount,
          topRankedId: rankedManufacturers.length > 0 ? rankedManufacturers[0]._id || rankedManufacturers[0].id : null,
          topRankedName: rankedManufacturers.length > 0 ? rankedManufacturers[0].name : null
        });

        return { rankedManufacturers };
      });
    }, res, 'Manufacturers ranked successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerComparisonController = new ManufacturerComparisonController();
