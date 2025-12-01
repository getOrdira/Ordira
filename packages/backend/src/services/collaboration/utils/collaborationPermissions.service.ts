// src/services/collaboration/utils/collaborationPermissions.service.ts

import { Types } from 'mongoose';
import { PlanKey } from '../../../constants/plans';
import { ManufacturerPlanKey } from '../../../constants/manufacturerPlans';
import {
  CollaborationFeatureKey,
  ICollaborationPermissionContext,
  WorkspaceMemberRole
} from '../../../models/collaboration/types';
import { featureAccessService } from '../validation/featureAccess.service';
import { connectionValidationService } from '../core/connectionValidation.service';

/**
 * Permission Check Result
 */
export interface IPermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiresUpgrade?: boolean;
  requiresConnection?: boolean;
  requiresRole?: WorkspaceMemberRole[];
  missingFeature?: CollaborationFeatureKey;
}

/**
 * Collaboration Permissions Service
 * High-level permission checking for collaboration features
 */
export class CollaborationPermissionsService {
  /**
   * Check if user can create a workspace
   */
  public async canCreateWorkspace(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Validate the actual connection status
    const connectionStatus = await connectionValidationService.validateConnection(
      context.brandId,
      context.manufacturerId
    );

    if (!connectionStatus.isConnected) {
      return {
        allowed: false,
        reason: connectionStatus.message || 'Active connection required to create workspace',
        requiresConnection: true
      };
    }

    // Check if connection can create workspace
    const canCreate = await connectionValidationService.canCreateWorkspace(
      context.brandId,
      context.manufacturerId
    );

    if (!canCreate.allowed) {
      return {
        allowed: false,
        reason: canCreate.reason || 'Connection does not allow workspace creation',
        requiresConnection: true
      };
    }

    // Workspaces can be created by any connected pair
    // Individual features inside workspaces will be gated by plan tier
    return {
      allowed: true
    };
  }

  /**
   * Check if user can upload files to workspace
   */
  public async canUploadFile(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Validate the actual connection status
    const connectionStatus = await connectionValidationService.validateConnection(
      context.brandId,
      context.manufacturerId
    );

    if (!connectionStatus.isConnected) {
      return {
        allowed: false,
        reason: connectionStatus.message || 'Active connection required',
        requiresConnection: true
      };
    }

    // Check feature access
    const featureAccess = featureAccessService.checkFeatureAccess(
      context.brandPlanTier as PlanKey,
      context.manufacturerPlanTier as ManufacturerPlanKey,
      'fileSharing'
    );

    if (!featureAccess.hasAccess) {
      return {
        allowed: false,
        reason: featureAccess.reason,
        requiresUpgrade: true,
        missingFeature: 'fileSharing'
      };
    }

    // Check workspace role (must be member or higher to upload)
    if (context.workspaceRole && context.workspaceRole === 'viewer') {
      return {
        allowed: false,
        reason: 'Viewers cannot upload files',
        requiresRole: ['member', 'admin', 'owner']
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Check if user can post production updates
   */
  public async canPostProductionUpdate(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Only manufacturers can post production updates
    if (context.userType !== 'manufacturer') {
      return {
        allowed: false,
        reason: 'Only manufacturers can post production updates'
      };
    }

    // Validate the actual connection status
    const connectionStatus = await connectionValidationService.validateConnection(
      context.brandId,
      context.manufacturerId
    );

    if (!connectionStatus.isConnected) {
      return {
        allowed: false,
        reason: connectionStatus.message || 'Active connection required',
        requiresConnection: true
      };
    }

    // Check feature access
    const featureAccess = featureAccessService.checkFeatureAccess(
      context.brandPlanTier as PlanKey,
      context.manufacturerPlanTier as ManufacturerPlanKey,
      'realTimeUpdates'
    );

    if (!featureAccess.hasAccess) {
      return {
        allowed: false,
        reason: featureAccess.reason,
        requiresUpgrade: true,
        missingFeature: 'realTimeUpdates'
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Check if user can create tasks
   */
  public async canCreateTask(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Validate the actual connection status
    const connectionStatus = await connectionValidationService.validateConnection(
      context.brandId,
      context.manufacturerId
    );

    if (!connectionStatus.isConnected) {
      return {
        allowed: false,
        reason: connectionStatus.message || 'Active connection required',
        requiresConnection: true
      };
    }

    // Check feature access
    const featureAccess = featureAccessService.checkFeatureAccess(
      context.brandPlanTier as PlanKey,
      context.manufacturerPlanTier as ManufacturerPlanKey,
      'taskManagement'
    );

    if (!featureAccess.hasAccess) {
      return {
        allowed: false,
        reason: featureAccess.reason,
        requiresUpgrade: true,
        missingFeature: 'taskManagement'
      };
    }

    // Check workspace role (viewers cannot create tasks)
    if (context.workspaceRole && context.workspaceRole === 'viewer') {
      return {
        allowed: false,
        reason: 'Viewers cannot create tasks',
        requiresRole: ['member', 'admin', 'owner']
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Check if user can approve/reject files
   */
  public async canApproveFile(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Validate the actual connection status
    const connectionStatus = await connectionValidationService.validateConnection(
      context.brandId,
      context.manufacturerId
    );

    if (!connectionStatus.isConnected) {
      return {
        allowed: false,
        reason: connectionStatus.message || 'Active connection required',
        requiresConnection: true
      };
    }

    // Check feature access (design review feature)
    const featureAccess = featureAccessService.checkFeatureAccess(
      context.brandPlanTier as PlanKey,
      context.manufacturerPlanTier as ManufacturerPlanKey,
      'designReview'
    );

    if (!featureAccess.hasAccess) {
      return {
        allowed: false,
        reason: featureAccess.reason,
        requiresUpgrade: true,
        missingFeature: 'designReview'
      };
    }

    // Check workspace role (only admin and owner can approve)
    if (context.workspaceRole && !['admin', 'owner'].includes(context.workspaceRole)) {
      return {
        allowed: false,
        reason: 'Only admins and owners can approve files',
        requiresRole: ['admin', 'owner']
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Check if user can add annotations to files
   */
  public async canAddAnnotation(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Validate the actual connection status
    const connectionStatus = await connectionValidationService.validateConnection(
      context.brandId,
      context.manufacturerId
    );

    if (!connectionStatus.isConnected) {
      return {
        allowed: false,
        reason: connectionStatus.message || 'Active connection required',
        requiresConnection: true
      };
    }

    // Check feature access (design review feature)
    const featureAccess = featureAccessService.checkFeatureAccess(
      context.brandPlanTier as PlanKey,
      context.manufacturerPlanTier as ManufacturerPlanKey,
      'designReview'
    );

    if (!featureAccess.hasAccess) {
      return {
        allowed: false,
        reason: featureAccess.reason,
        requiresUpgrade: true,
        missingFeature: 'designReview'
      };
    }

    // Viewers can't add annotations
    if (context.workspaceRole && context.workspaceRole === 'viewer') {
      return {
        allowed: false,
        reason: 'Viewers cannot add annotations',
        requiresRole: ['member', 'admin', 'owner']
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Check if user can upload video updates
   */
  public async canUploadVideo(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Validate the actual connection status
    const connectionStatus = await connectionValidationService.validateConnection(
      context.brandId,
      context.manufacturerId
    );

    if (!connectionStatus.isConnected) {
      return {
        allowed: false,
        reason: connectionStatus.message || 'Active connection required',
        requiresConnection: true
      };
    }

    // Check feature access
    const featureAccess = featureAccessService.checkFeatureAccess(
      context.brandPlanTier as PlanKey,
      context.manufacturerPlanTier as ManufacturerPlanKey,
      'videoUpdates'
    );

    if (!featureAccess.hasAccess) {
      return {
        allowed: false,
        reason: featureAccess.reason,
        requiresUpgrade: true,
        missingFeature: 'videoUpdates'
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Check if user can delete workspace
   */
  public async canDeleteWorkspace(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Only owners can delete workspaces
    if (context.workspaceRole !== 'owner') {
      return {
        allowed: false,
        reason: 'Only workspace owners can delete workspaces',
        requiresRole: ['owner']
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Check if user can manage workspace members
   */
  public async canManageMembers(
    context: ICollaborationPermissionContext
  ): Promise<IPermissionCheckResult> {
    // Only owners and admins can manage members
    if (!context.workspaceRole || !['owner', 'admin'].includes(context.workspaceRole)) {
      return {
        allowed: false,
        reason: 'Only owners and admins can manage members',
        requiresRole: ['admin', 'owner']
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Get all permissions for a user in a workspace context
   */
  public async getAllPermissions(
    context: ICollaborationPermissionContext
  ): Promise<Record<string, boolean>> {
    const permissions: Record<string, boolean> = {};

    const checks = [
      { name: 'canCreateWorkspace', fn: () => this.canCreateWorkspace(context) },
      { name: 'canUploadFile', fn: () => this.canUploadFile(context) },
      { name: 'canPostProductionUpdate', fn: () => this.canPostProductionUpdate(context) },
      { name: 'canCreateTask', fn: () => this.canCreateTask(context) },
      { name: 'canApproveFile', fn: () => this.canApproveFile(context) },
      { name: 'canAddAnnotation', fn: () => this.canAddAnnotation(context) },
      { name: 'canUploadVideo', fn: () => this.canUploadVideo(context) },
      { name: 'canDeleteWorkspace', fn: () => this.canDeleteWorkspace(context) },
      { name: 'canManageMembers', fn: () => this.canManageMembers(context) }
    ];

    for (const check of checks) {
      const result = await check.fn();
      permissions[check.name] = result.allowed;
    }

    return permissions;
  }

  /**
   * Create permission context helper
   */
  public createContext(params: {
    userId: string | Types.ObjectId;
    userType: 'brand' | 'manufacturer';
    workspaceId?: string | Types.ObjectId;
    brandId: string | Types.ObjectId;
    manufacturerId: string | Types.ObjectId;
    brandPlanTier: string;
    manufacturerPlanTier: string;
    isConnected: boolean;
    workspaceRole?: WorkspaceMemberRole;
  }): ICollaborationPermissionContext {
    return {
      userId: params.userId.toString(),
      userType: params.userType,
      workspaceId: params.workspaceId?.toString() || '',
      brandId: params.brandId.toString(),
      manufacturerId: params.manufacturerId.toString(),
      brandPlanTier: params.brandPlanTier,
      manufacturerPlanTier: params.manufacturerPlanTier,
      isConnected: params.isConnected,
      workspaceRole: params.workspaceRole
    };
  }
}

// Export singleton instance
export const collaborationPermissionsService = new CollaborationPermissionsService();
