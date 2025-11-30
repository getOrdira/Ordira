// src/controllers/features/connections/connectionsAnalytics.controller.ts
// Controller surfacing shared analytics endpoints for connections

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { ConnectionsBaseController } from './connectionsBase.controller';
import { proposalSharingService } from '../../../services/connections/features/proposalSharing.service';

interface SharedAnalyticsQuery {
  brandId?: string;
  manufacturerId?: string;
  includeBrand?: boolean;
  includeManufacturer?: boolean;
  start?: string;
  end?: string;
}

interface SharedAnalyticsRequest extends BaseRequest {
  validatedQuery?: SharedAnalyticsQuery;
  validatedBody?: SharedAnalyticsQuery;
}

/**
 * ConnectionsAnalyticsController provides access to analytics sharing flows.
 */
export class ConnectionsAnalyticsController extends ConnectionsBaseController {
  /**
   * Check whether analytics can be shared for the connection pair.
   */
  async canShareAnalytics(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await new Promise((resolve, reject) => {
        this.validateAuth(req, res, async () => {
          try {
            const { brandId, manufacturerId } = this.resolveConnectionPair(req);

            this.recordPerformance(req, 'CONNECTION_CAN_SHARE_ANALYTICS');

            const allowed = await this.connectionsServices.features.analytics.canShare(brandId, manufacturerId);

            this.logAction(req, 'CONNECTION_CAN_SHARE_ANALYTICS_SUCCESS', {
              brandId,
              manufacturerId,
              allowed,
            });

            resolve({ allowed });
          } catch (error) {
            reject(error);
          }
        });
      });
    }, res, 'Analytics sharing capability retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve combined analytics for a connection pair.
   */
  async getSharedAnalytics(req: SharedAnalyticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await new Promise((resolve, reject) => {
        this.validateAuth(req, res, async () => {
          try {
            const overrides = this.extractOverrides(req);
            const { brandId, manufacturerId } = this.resolveConnectionPair(req, overrides);
            const { includeBrand = true, includeManufacturer = true, start, end } = {
              includeBrand: overrides.includeBrand ?? true,
              includeManufacturer: overrides.includeManufacturer ?? true,
              start: overrides.start,
              end: overrides.end,
            };

            const timeRange = this.buildTimeRange(start, end);

            this.recordPerformance(req, 'CONNECTION_GET_SHARED_ANALYTICS');

            const analytics = await this.connectionsServices.features.analytics.getSharedAnalytics(
              brandId,
              manufacturerId,
              {
                includeBrand,
                includeManufacturer,
                timeRange: timeRange ?? undefined,
              },
            );

            this.logAction(req, 'CONNECTION_GET_SHARED_ANALYTICS_SUCCESS', {
              brandId,
              manufacturerId,
              includeBrand,
              includeManufacturer,
              hasBrand: !!analytics.brand,
              hasManufacturer: !!analytics.manufacturer,
            });

            resolve({ analytics });
          } catch (error) {
            reject(error);
          }
        });
      });
    }, res, 'Shared analytics retrieved', this.getRequestMeta(req));
  }

  /**
 * Get shared proposals for connected manufacturer
 */
async getSharedProposals(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
  await this.handleAsync(async () => {
    return await new Promise((resolve, reject) => {
      this.validateAuth(req, res, async () => {
        try {
          const { brandId, manufacturerId } = this.resolveConnectionPair(req);
          const { includeCompleted, includeDraft, limit } = req.validatedQuery || {};

          this.recordPerformance(req, 'CONNECTION_GET_SHARED_PROPOSALS');

          const proposals = await proposalSharingService.getSharedProposals(
            brandId,
            manufacturerId,
            { includeCompleted, includeDraft, limit }
          );

          this.logAction(req, 'CONNECTION_GET_SHARED_PROPOSALS_SUCCESS', {
            brandId,
            manufacturerId,
            proposalCount: proposals.proposals.length
          });

          resolve({ proposals });
        } catch (error) {
          reject(error);
        }
      });
    });
  }, res, 'Shared proposals retrieved', this.getRequestMeta(req));
}

/**
 * Get live proposal data
 */
async getLiveProposalData(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
  await this.handleAsync(async () => {
    return await new Promise((resolve, reject) => {
      this.validateAuth(req, res, async () => {
        try {
          const { brandId, manufacturerId } = this.resolveConnectionPair(req);
          const { proposalId } = req.params;

          this.recordPerformance(req, 'CONNECTION_GET_LIVE_PROPOSAL');

          const proposal = await proposalSharingService.getLiveProposalData(
            brandId,
            manufacturerId,
            proposalId
          );

          this.logAction(req, 'CONNECTION_GET_LIVE_PROPOSAL_SUCCESS', {
            brandId,
            manufacturerId,
            proposalId
          });

          resolve({ proposal });
        } catch (error) {
          reject(error);
        }
      });
    });
  }, res, 'Live proposal data retrieved', this.getRequestMeta(req));
}

  /**
   * Retrieve shared KPI snapshot for dashboards.
   */
  async getSharedKpis(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await new Promise((resolve, reject) => {
        this.validateAuth(req, res, async () => {
          try {
            const { brandId, manufacturerId } = this.resolveConnectionPair(req);

            this.recordPerformance(req, 'CONNECTION_GET_SHARED_KPIS');

            const kpis = await this.connectionsServices.features.analytics.getSharedKpis(brandId, manufacturerId);

            this.logAction(req, 'CONNECTION_GET_SHARED_KPIS_SUCCESS', {
              brandId,
              manufacturerId,
            });

            resolve({ kpis });
          } catch (error) {
            reject(error);
          }
        });
      });
    }, res, 'Shared KPIs retrieved', this.getRequestMeta(req));
  }

  /**
   * Share brand analytics with connected manufacturer.
   */
  async getBrandAnalytics(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await this.validateBusinessUser(req, res, async () => {
        const brandId = this.resolveBrandId(req);
        const manufacturerId = this.resolveManufacturerId(req);

        this.recordPerformance(req, 'CONNECTION_GET_BRAND_ANALYTICS');

        const analytics = await this.connectionsServices.features.analytics.getBrandAnalyticsForManufacturer(
          brandId,
          manufacturerId,
        );

        this.logAction(req, 'CONNECTION_GET_BRAND_ANALYTICS_SUCCESS', {
          brandId,
          manufacturerId,
        });

        return { analytics };
      });
    }, res, 'Brand analytics shared', this.getRequestMeta(req));
  }

  /**
   * Share manufacturer analytics with connected brand.
   */
  async getManufacturerAnalytics(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await this.validateManufacturerUser(req, res, async () => {
        const manufacturerId = this.resolveManufacturerId(req);
        const brandId = this.resolveBrandId(req);

        this.recordPerformance(req, 'CONNECTION_GET_MANUFACTURER_ANALYTICS');

        const analytics = await this.connectionsServices.features.analytics.getManufacturerAnalyticsForBrand(
          manufacturerId,
          brandId,
        );

        this.logAction(req, 'CONNECTION_GET_MANUFACTURER_ANALYTICS_SUCCESS', {
          brandId,
          manufacturerId,
        });

        return { analytics };
      });
    }, res, 'Manufacturer analytics shared', this.getRequestMeta(req));
  }

  private extractOverrides(req: SharedAnalyticsRequest): SharedAnalyticsQuery {
    return {
      ...(req.validatedQuery ?? {}),
      ...(req.validatedBody ?? {}),
    };
  }

  private buildTimeRange(
    start?: string,
    end?: string,
  ): { start: Date; end: Date } | null {
    if (!start && !end) {
      return null;
    }

    const parsedStart = start ? new Date(start) : undefined;
    const parsedEnd = end ? new Date(end) : undefined;

    if (parsedStart && Number.isNaN(parsedStart.getTime())) {
      throw { statusCode: 400, message: 'Invalid start date provided' };
    }

    if (parsedEnd && Number.isNaN(parsedEnd.getTime())) {
      throw { statusCode: 400, message: 'Invalid end date provided' };
    }

    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      throw { statusCode: 400, message: 'Start date cannot be after end date' };
    }

    return {
      start: parsedStart ?? new Date(parsedEnd!.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: parsedEnd ?? new Date(),
    };
  }
}

export const connectionsAnalyticsController = new ConnectionsAnalyticsController();
