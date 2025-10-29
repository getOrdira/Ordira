// src/controllers/features/connections/connectionsRecommendations.controller.ts
// Controller exposing recommendation and compatibility endpoints

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { ConnectionsBaseController } from './connectionsBase.controller';

interface RecommendationQuery {
  limit?: number | string;
  requireVerified?: boolean | string;
  excludeConnected?: boolean | string;
  excludePending?: boolean | string;
}

interface BrandRecommendationRequest extends BaseRequest {
  validatedQuery?: RecommendationQuery;
}

interface ManufacturerRecommendationRequest extends BaseRequest {
  validatedQuery?: RecommendationQuery;
}

interface CompatibilityRequest extends BaseRequest {
  validatedQuery?: { brandId?: string; manufacturerId?: string };
  validatedParams?: { brandId?: string; manufacturerId?: string };
}

/**
 * ConnectionsRecommendationsController delivers recommendation insights.
 */
export class ConnectionsRecommendationsController extends ConnectionsBaseController {
  /**
   * Recommend manufacturers suited for the authenticated brand.
   */
  async getManufacturerRecommendations(req: BrandRecommendationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const brandId = this.resolveBrandId(req);
        const options = this.parseRecommendationOptions(req.validatedQuery);

        this.recordPerformance(req, 'GET_MANUFACTURER_RECOMMENDATIONS');

        const recommendations = await this.connectionsServices.features.recommendations.getManufacturerRecommendationsForBrand(
          brandId,
          options,
        );

        this.logAction(req, 'GET_MANUFACTURER_RECOMMENDATIONS_SUCCESS', {
          brandId,
          count: recommendations.length,
          options,
        });

        return { recommendations };
      });
    }, res, 'Manufacturer recommendations retrieved', this.getRequestMeta(req));
  }

  /**
   * Recommend brands for the authenticated manufacturer.
   */
  async getBrandRecommendations(req: ManufacturerRecommendationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        const manufacturerId = this.resolveManufacturerId(req);
        const limit = this.parseLimit(req.validatedQuery?.limit, 5);

        this.recordPerformance(req, 'GET_BRAND_RECOMMENDATIONS');

        const recommendations = await this.connectionsServices.features.recommendations.getBrandRecommendationsForManufacturer(
          manufacturerId,
          limit,
        );

        this.logAction(req, 'GET_BRAND_RECOMMENDATIONS_SUCCESS', {
          manufacturerId,
          count: recommendations.length,
          limit,
        });

        return { recommendations };
      });
    }, res, 'Brand recommendations retrieved', this.getRequestMeta(req));
  }

  /**
   * Generate compatibility report for a brand/manufacturer pair.
   */
  async getCompatibilityReport(req: CompatibilityRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateAuth(req, res, async () => {
        const overrides = {
          brandId: req.validatedParams?.brandId ?? req.validatedQuery?.brandId,
          manufacturerId: req.validatedParams?.manufacturerId ?? req.validatedQuery?.manufacturerId,
        };
        const { brandId, manufacturerId } = this.resolveConnectionPair(req, overrides);

        this.recordPerformance(req, 'GET_COMPATIBILITY_REPORT');

        const report = await this.connectionsServices.features.recommendations.getCompatibilityReport(
          brandId,
          manufacturerId,
        );

        if (!report) {
          throw { statusCode: 404, message: 'Compatibility report unavailable for the provided pair' };
        }

        this.logAction(req, 'GET_COMPATIBILITY_REPORT_SUCCESS', {
          brandId,
          manufacturerId,
          score: report.score,
        });

        return { report };
      });
    }, res, 'Compatibility report generated', this.getRequestMeta(req));
  }

  private parseRecommendationOptions(options?: RecommendationQuery) {
    return {
      limit: this.parseLimit(options?.limit, 5),
      requireVerified: this.parseBoolean(options?.requireVerified, false),
      excludeConnected: this.parseBoolean(options?.excludeConnected, true),
      excludePending: this.parseBoolean(options?.excludePending, true),
    };
  }

  private parseLimit(value: number | string | undefined, fallback: number): number {
    if (value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.min(50, Math.max(1, Math.floor(parsed)));
  }

  private parseBoolean(value: boolean | string | undefined, fallback: boolean): boolean {
    if (value === undefined) {
      return fallback;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
}

export const connectionsRecommendationsController = new ConnectionsRecommendationsController();
