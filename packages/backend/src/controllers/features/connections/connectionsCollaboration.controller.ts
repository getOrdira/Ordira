// src/controllers/features/connections/connectionsCollaboration.controller.ts
// Controller surfacing collaboration insights between connected entities

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { ConnectionsBaseController } from './connectionsBase.controller';

interface CollaborationQuery {
  brandId?: string;
  manufacturerId?: string;
  limit?: number;
}

interface CollaborationRequest extends BaseRequest {
  validatedQuery?: CollaborationQuery;
  validatedParams?: CollaborationQuery;
}

/**
 * ConnectionsCollaborationController wraps collaboration service operations.
 */
export class ConnectionsCollaborationController extends ConnectionsBaseController {
  /**
   * Retrieve collaboration overview for a brand/manufacturer pair.
   */
  async getCollaborationOverview(req: CollaborationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateAuth(req, res, async () => {
        const { brandId, manufacturerId } = this.resolvePair(req);

        this.recordPerformance(req, 'GET_COLLABORATION_OVERVIEW');

        const overview = await this.connectionsServices.features.collaboration.getCollaborationOverview(
          brandId,
          manufacturerId,
        );

        this.logAction(req, 'GET_COLLABORATION_OVERVIEW_SUCCESS', {
          brandId,
          manufacturerId,
        });

        return { overview };
      });
    }, res, 'Collaboration overview retrieved', this.getRequestMeta(req));
  }

  /**
   * Fetch shared product catalog snapshot.
   */
  async getSharedProductCatalog(req: CollaborationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateAuth(req, res, async () => {
        const { brandId, manufacturerId, limit } = this.resolvePair(req);
        const pageSize = limit ?? 20;

        this.recordPerformance(req, 'GET_SHARED_PRODUCT_CATALOG');

        const products = await this.connectionsServices.features.collaboration.getSharedProductCatalog(
          brandId,
          manufacturerId,
          pageSize,
        );

        this.logAction(req, 'GET_SHARED_PRODUCT_CATALOG_SUCCESS', {
          brandId,
          manufacturerId,
          count: products.length,
        });

        return { products };
      });
    }, res, 'Shared product catalog retrieved', this.getRequestMeta(req));
  }

  /**
   * Suggest next collaboration steps based on current state.
   */
  async suggestNextSteps(req: CollaborationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateAuth(req, res, async () => {
        const { brandId, manufacturerId } = this.resolvePair(req);

        this.recordPerformance(req, 'SUGGEST_COLLABORATION_NEXT_STEPS');

        const suggestions = await this.connectionsServices.features.collaboration.suggestNextSteps(
          brandId,
          manufacturerId,
        );

        this.logAction(req, 'SUGGEST_COLLABORATION_NEXT_STEPS_SUCCESS', {
          brandId,
          manufacturerId,
          suggestions,
        });

        return { suggestions };
      });
    }, res, 'Collaboration suggestions generated', this.getRequestMeta(req));
  }

  private resolvePair(req: CollaborationRequest): { brandId: string; manufacturerId: string; limit?: number } {
    const brandOverride = req.validatedParams?.brandId ?? req.validatedQuery?.brandId;
    const manufacturerOverride = req.validatedParams?.manufacturerId ?? req.validatedQuery?.manufacturerId;
    const limitCandidate = req.validatedParams?.limit ?? req.validatedQuery?.limit;

    const { brandId, manufacturerId } = this.resolveConnectionPair(req, {
      brandId: brandOverride,
      manufacturerId: manufacturerOverride,
    });

    let limit: number | undefined;
    if (limitCandidate !== undefined) {
      const parsed = Number(limitCandidate);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(100, Math.max(1, Math.floor(parsed)));
      }
    }

    return { brandId, manufacturerId, limit };
  }
}

export const connectionsCollaborationController = new ConnectionsCollaborationController();
