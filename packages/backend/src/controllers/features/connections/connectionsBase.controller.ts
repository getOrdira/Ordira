// src/controllers/features/connections/connectionsBase.controller.ts
// Shared base controller utilities for connections feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import {
  InvitationsService,
  invitationsService,
} from '../../../services/connections/features/invitations.service';
import {
  AnalyticsSharingService,
  analyticsSharingService,
} from '../../../services/connections/features/analyticsSharing.service';
import {
  CollaborationService,
  collaborationService,
} from '../../../services/connections/features/collaboration.service';
import {
  PermissionsService,
  permissionsService,
  ConnectionFeature,
} from '../../../services/connections/features/permissions.service';
import {
  RecommendationsService,
  recommendationsService,
} from '../../../services/connections/features/recommendations.service';
import {
  invitationDataService,
  InvitationDataService,
} from '../../../services/connections/core/invitationData.service';
import {
  connectionDataService,
  ConnectionDataService,
} from '../../../services/connections/core/connectionData.service';
import {
  connectionHelpersService,
  ConnectionHelpersService,
} from '../../../services/connections/utils/connectionHelpers.service';
import {
  matchingEngineService,
  MatchingEngineService,
} from '../../../services/connections/utils/matchingEngine.service';
import {
  invitationValidationService,
  InvitationValidationService,
} from '../../../services/connections/validation/invitationValidation.service';
import {
  permissionValidationService,
  PermissionValidationService,
} from '../../../services/connections/validation/permissionValidation.service';

export interface ConnectionsServiceRegistry {
  core: {
    invitationData: InvitationDataService;
    connectionData: ConnectionDataService;
  };
  features: {
    invitations: InvitationsService;
    analytics: AnalyticsSharingService;
    collaboration: CollaborationService;
    permissions: PermissionsService;
    recommendations: RecommendationsService;
  };
  validation: {
    invitation: InvitationValidationService;
    permission: PermissionValidationService;
  };
  utils: {
    helpers: ConnectionHelpersService;
    matching: MatchingEngineService;
  };
}

const registry: ConnectionsServiceRegistry = {
  core: {
    invitationData: invitationDataService,
    connectionData: connectionDataService,
  },
  features: {
    invitations: invitationsService,
    analytics: analyticsSharingService,
    collaboration: collaborationService,
    permissions: permissionsService,
    recommendations: recommendationsService,
  },
  validation: {
    invitation: invitationValidationService,
    permission: permissionValidationService,
  },
  utils: {
    helpers: connectionHelpersService,
    matching: matchingEngineService,
  },
};

export const getConnectionsServices = (): ConnectionsServiceRegistry => registry;

/**
 * Base controller providing helpers shared across connections feature controllers.
 */
export abstract class ConnectionsBaseController extends BaseController {
  protected connectionsServices = getConnectionsServices();

  /**
   * Resolve a brand identifier from request context or throw if missing.
   */
  protected resolveBrandId(req: BaseRequest): string {
    const brandId =
      req.businessId ||
      req.validatedParams?.brandId ||
      req.validatedBody?.brandId ||
      req.validatedQuery?.brandId;

    if (!brandId) {
      throw { statusCode: 400, message: 'Brand identifier is required.' };
    }

    return brandId;
  }

  /**
   * Resolve a manufacturer identifier from request context or throw if missing.
   */
  protected resolveManufacturerId(req: BaseRequest): string {
    const manufacturerId =
      req.manufacturerId ||
      req.validatedParams?.manufacturerId ||
      req.validatedBody?.manufacturerId ||
      req.validatedQuery?.manufacturerId;

    if (!manufacturerId) {
      throw { statusCode: 400, message: 'Manufacturer identifier is required.' };
    }

    return manufacturerId;
  }

  /**
   * Resolve both brand and manufacturer identifiers, allowing overrides via payload.
   */
  protected resolveConnectionPair(
    req: BaseRequest,
    overrides?: Partial<{ brandId: string; manufacturerId: string }>
  ): { brandId: string; manufacturerId: string } {
    const brandId = overrides?.brandId ?? this.resolveBrandId(req);
    const manufacturerId = overrides?.manufacturerId ?? this.resolveManufacturerId(req);

    return { brandId, manufacturerId };
  }

  /**
   * Guard helper ensuring a request includes a valid feature key.
   */
  protected resolveFeatureKey(
    req: BaseRequest,
    source: 'body' | 'params' | 'query' = 'body'
  ): ConnectionFeature {
    const value =
      source === 'body'
        ? req.validatedBody?.feature
        : source === 'params'
          ? req.validatedParams?.feature
          : req.validatedQuery?.feature;

    if (!value) {
      throw { statusCode: 400, message: 'Feature key is required.' };
    }

    return value as ConnectionFeature;
  }
}
