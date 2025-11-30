// src/controllers/features/connections/connectionsPermissions.controller.ts
// Controller mediating access to connection feature permissions

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { ConnectionsBaseController } from './connectionsBase.controller';
import { ConnectionFeature } from '../../../services/connections/features/permissions.service';

interface FeatureRequestBody {
  brandId?: string;
  manufacturerId?: string;
  feature: ConnectionFeature;
}

interface FeatureRequest extends BaseRequest {
  validatedBody?: FeatureRequestBody;
  validatedParams?: Partial<FeatureRequestBody>;
  validatedQuery?: Partial<FeatureRequestBody>;
}

/**
 * ConnectionsPermissionsController wraps permission checks across connections.
 */
export class ConnectionsPermissionsController extends ConnectionsBaseController {
  /**
   * Retrieve feature access matrix for the connection pair.
   */
  async getFeatureAccess(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await new Promise((resolve, reject) => {
        this.validateAuth(req, res, async () => {
          try {
            const { brandId, manufacturerId } = this.resolveConnectionPair(req);

            this.recordPerformance(req, 'CONNECTION_GET_FEATURE_ACCESS');

            const access = await this.connectionsServices.features.permissions.getFeatureAccess(brandId, manufacturerId);

            this.logAction(req, 'CONNECTION_GET_FEATURE_ACCESS_SUCCESS', {
              brandId,
              manufacturerId,
            });

            resolve({ access });
          } catch (error) {
            reject(error);
          }
        });
      });
    }, res, 'Connection feature access retrieved', this.getRequestMeta(req));
  }

  /**
   * Determine whether a specific feature may be used for this connection pair.
   */
  async canUseFeature(req: FeatureRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await new Promise((resolve, reject) => {
        this.validateAuth(req, res, async () => {
          try {
            const feature = this.extractFeatureKey(req);
            const { brandId, manufacturerId } = this.resolveConnectionPair(req, this.extractOverrides(req));

            const validation = await this.connectionsServices.validation.permission.validateFeatureRequest({
              brandId,
              manufacturerId,
              feature,
            });

            if (!validation.isValid) {
              throw {
                statusCode: 403,
                message: 'Feature access denied',
                details: validation.errors,
              };
            }

            this.recordPerformance(req, 'CONNECTION_CAN_USE_FEATURE');

            const allowed = await this.connectionsServices.features.permissions.canUseFeature(
              brandId,
              manufacturerId,
              feature,
              false,
            );

            this.logAction(req, 'CONNECTION_CAN_USE_FEATURE_SUCCESS', {
              brandId,
              manufacturerId,
              feature,
              allowed,
            });

            resolve({ allowed });
          } catch (error) {
            reject(error);
          }
        });
      });
    }, res, 'Feature access evaluated', this.getRequestMeta(req));
  }

  /**
   * Provide a descriptive explanation for feature availability.
   */
  async explainFeatureAccess(req: FeatureRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await new Promise((resolve, reject) => {
        this.validateAuth(req, res, async () => {
          try {
            const feature = this.extractFeatureKey(req);
            const { brandId, manufacturerId } = this.resolveConnectionPair(req, this.extractOverrides(req));

            this.recordPerformance(req, 'CONNECTION_EXPLAIN_FEATURE_ACCESS');

            const explanation = await this.connectionsServices.features.permissions.explainFeatureAccess(
              brandId,
              manufacturerId,
              feature,
            );

            this.logAction(req, 'CONNECTION_EXPLAIN_FEATURE_ACCESS_SUCCESS', {
              brandId,
              manufacturerId,
              feature,
              allowed: explanation.allowed,
            });

            resolve({ explanation });
          } catch (error) {
            reject(error);
          }
        });
      });
    }, res, 'Feature access explanation generated', this.getRequestMeta(req));
  }

  /**
   * Validate a feature toggle payload (utility endpoint for forms).
   */
  async validateFeatureTogglePayload(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await new Promise((resolve, reject) => {
        this.validateAuth(req, res, async () => {
          try {
            const rawPayload = req.validatedBody ?? {};
            const togglePayload = Object.entries(rawPayload).reduce<Partial<Record<ConnectionFeature, boolean>>>(
              (acc, [key, value]) => {
                if (['analytics', 'supplyChain', 'productData', 'messaging', 'fileSharing', 'recommendations'].includes(key)) {
                  acc[key as ConnectionFeature] = Boolean(value);
                }
                return acc;
              },
              {},
            );

            this.recordPerformance(req, 'CONNECTION_VALIDATE_FEATURE_TOGGLE');

            const validation = this.connectionsServices.validation.permission.validateFeatureTogglePayload(togglePayload);

            if (!validation.isValid) {
              throw {
                statusCode: 400,
                message: 'Invalid feature toggle payload',
                details: validation.errors,
              };
            }

            this.logAction(req, 'CONNECTION_VALIDATE_FEATURE_TOGGLE_SUCCESS', {
              brandId: rawPayload?.brandId,
              manufacturerId: rawPayload?.manufacturerId,
            });

            resolve({ valid: true });
          } catch (error) {
            reject(error);
          }
        });
      });
    }, res, 'Feature toggle payload validated', this.getRequestMeta(req));
  }

  private extractFeatureKey(req: FeatureRequest): ConnectionFeature {
    return this.resolveFeatureKey(req, 'body');
  }

  private extractOverrides(req: FeatureRequest): Partial<{ brandId: string; manufacturerId: string }> {
    return {
      brandId: req.validatedBody?.brandId ?? req.validatedParams?.brandId ?? req.validatedQuery?.brandId,
      manufacturerId: req.validatedBody?.manufacturerId ?? req.validatedParams?.manufacturerId ?? req.validatedQuery?.manufacturerId,
    };
  }
}

export const connectionsPermissionsController = new ConnectionsPermissionsController();
