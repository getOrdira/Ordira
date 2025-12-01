// src/controllers/features/collaboration/collaborationBase.controller.ts
// Shared base controller utilities for collaboration feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import { workspaceManagementService } from '../../../services/collaboration/core/workspaceManagement.service';
import { fileManagementService } from '../../../services/collaboration/features/fileManagement.service';
import { productionUpdatesService } from '../../../services/collaboration/features/productionUpdates.service';
import { taskManagementService } from '../../../services/collaboration/features/taskManagement.service';
import { connectionValidationService } from '../../../services/collaboration/core/connectionValidation.service';
import { featureAccessService } from '../../../services/collaboration/validation/featureAccess.service';
import { Types } from 'mongoose';

/**
 * Extended Request with collaboration context
 */
export interface CollaborationRequest extends BaseRequest {
  collaboration?: {
    brandId: Types.ObjectId;
    manufacturerId: Types.ObjectId;
    userId: Types.ObjectId;
    userType: 'brand' | 'manufacturer';
    workspaceId?: Types.ObjectId;
  };
}

/**
 * Collaboration Service Registry
 */
export interface CollaborationServiceRegistry {
  core: {
    workspaceManagement: typeof workspaceManagementService;
    connectionValidation: typeof connectionValidationService;
  };
  features: {
    fileManagement: typeof fileManagementService;
    productionUpdates: typeof productionUpdatesService;
    taskManagement: typeof taskManagementService;
  };
  validation: {
    featureAccess: typeof featureAccessService;
  };
}

const registry: CollaborationServiceRegistry = {
  core: {
    workspaceManagement: workspaceManagementService,
    connectionValidation: connectionValidationService,
  },
  features: {
    fileManagement: fileManagementService,
    productionUpdates: productionUpdatesService,
    taskManagement: taskManagementService,
  },
  validation: {
    featureAccess: featureAccessService,
  },
};

export const getCollaborationServices = (): CollaborationServiceRegistry => registry;

/**
 * Base controller providing helpers shared across collaboration feature controllers.
 */
export abstract class CollaborationBaseController extends BaseController {
  protected collaborationServices = getCollaborationServices();

  /**
   * Resolve brand ID from request context or throw if missing.
   */
  protected resolveBrandId(req: CollaborationRequest): string {
    const brandId =
      req.businessId ||
      req.collaboration?.brandId?.toString() ||
      req.validatedParams?.brandId ||
      req.validatedBody?.brandId ||
      req.validatedQuery?.brandId;

    if (!brandId) {
      throw { statusCode: 400, message: 'Brand identifier is required.' };
    }

    return brandId;
  }

  /**
   * Resolve manufacturer ID from request context or throw if missing.
   */
  protected resolveManufacturerId(req: CollaborationRequest): string {
    const manufacturerId =
      req.manufacturerId ||
      req.collaboration?.manufacturerId?.toString() ||
      req.validatedParams?.manufacturerId ||
      req.validatedBody?.manufacturerId ||
      req.validatedQuery?.manufacturerId;

    if (!manufacturerId) {
      throw { statusCode: 400, message: 'Manufacturer identifier is required.' };
    }

    return manufacturerId;
  }

  /**
   * Resolve workspace ID from request context or throw if missing.
   */
  protected resolveWorkspaceId(req: CollaborationRequest): string {
    const workspaceId =
      req.collaboration?.workspaceId?.toString() ||
      req.validatedParams?.workspaceId ||
      req.validatedBody?.workspaceId ||
      req.validatedQuery?.workspaceId;

    if (!workspaceId) {
      throw { statusCode: 400, message: 'Workspace identifier is required.' };
    }

    return workspaceId;
  }

  /**
   * Resolve user ID from request context or throw if missing.
   */
  protected resolveUserId(req: CollaborationRequest): string {
    const userId =
      req.userId ||
      req.collaboration?.userId?.toString() ||
      req.validatedBody?.userId ||
      req.validatedParams?.userId;

    if (!userId) {
      throw { statusCode: 400, message: 'User identifier is required.' };
    }

    return userId;
  }

  /**
   * Resolve user type from request context or throw if missing.
   */
  protected resolveUserType(req: CollaborationRequest): 'brand' | 'manufacturer' {
    const userType =
      (req.userType === 'business' ? 'brand' : req.userType === 'manufacturer' ? 'manufacturer' : null) ||
      req.collaboration?.userType ||
      req.validatedBody?.userType;

    if (!userType || (userType !== 'brand' && userType !== 'manufacturer')) {
      throw { statusCode: 400, message: 'Valid user type (brand or manufacturer) is required.' };
    }

    return userType;
  }

  /**
   * Resolve both brand and manufacturer identifiers.
   */
  protected resolveConnectionPair(
    req: CollaborationRequest,
    overrides?: Partial<{ brandId: string; manufacturerId: string }>
  ): { brandId: string; manufacturerId: string } {
    const brandId = overrides?.brandId ?? this.resolveBrandId(req);
    const manufacturerId = overrides?.manufacturerId ?? this.resolveManufacturerId(req);

    return { brandId, manufacturerId };
  }

  /**
   * Ensure user has access to workspace.
   */
  protected async ensureWorkspaceAccess(
    req: CollaborationRequest,
    workspaceId: string,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): Promise<void> {
    const accessResult = await this.collaborationServices.core.connectionValidation.validateWorkspaceAccess(
      new Types.ObjectId(userId),
      new Types.ObjectId(workspaceId),
      userType
    );

    if (!accessResult.hasAccess) {
      throw {
        statusCode: 403,
        message: accessResult.reason || 'You do not have access to this workspace'
      };
    }
  }
}

