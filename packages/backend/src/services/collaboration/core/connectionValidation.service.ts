// src/services/collaboration/core/connectionValidation.service.ts

import { Types } from 'mongoose';
import { IFeatureAccessCheck } from '../../../models/collaboration/types';
import { Invitation } from '../../../models/infrastructure/invitation.model';
import { Workspace } from '../../../models/collaboration/workspace.model';

/**
 * Connection Status Interface
 */
export interface IConnectionStatus {
  isConnected: boolean;
  connectionId?: string;
  status?: 'active' | 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'disconnected';
  connectedAt?: Date;
  message?: string;
}

/**
 * Connection Validation Result
 */
export interface IConnectionValidationResult {
  isValid: boolean;
  isConnected: boolean;
  hasFeatureAccess: boolean;
  reason?: string;
  connectionStatus?: IConnectionStatus;
  featureAccess?: IFeatureAccessCheck;
}

/**
 * Connection Validation Service
 * Validates that brand-manufacturer connections exist and are active
 */
export class ConnectionValidationService {
  /**
   * Check if a brand-manufacturer connection exists and is active
   * Uses the Invitation model where status 'accepted' = active connection
   */
  public async validateConnection(
    brandId: string | Types.ObjectId,
    manufacturerId: string | Types.ObjectId
  ): Promise<IConnectionStatus> {
    try {
      const brandObjectId = new Types.ObjectId(brandId);
      const manufacturerObjectId = new Types.ObjectId(manufacturerId);

      // Find invitation between brand and manufacturer
      const invitation = await Invitation.findOne({
        brand: brandObjectId,
        manufacturer: manufacturerObjectId
      });

      if (!invitation) {
        return {
          isConnected: false,
          message: 'No connection request found between brand and manufacturer'
        };
      }

      // Check if connection is accepted (active)
      if (invitation.status !== 'accepted') {
        return {
          isConnected: false,
          status: invitation.status,
          message: `Connection exists but is not active (status: ${invitation.status})`,
          connectionId: invitation._id.toString()
        };
      }

      // Check if invitation has expired
      if (invitation.isExpired()) {
        return {
          isConnected: false,
          status: 'expired',
          message: 'Connection has expired',
          connectionId: invitation._id.toString()
        };
      }

      return {
        isConnected: true,
        connectionId: invitation._id.toString(),
        status: 'active',
        connectedAt: invitation.respondedAt || invitation.createdAt
      };
    } catch (error) {
      throw new Error(`Connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate connection and feature access together
   */
  public async validateConnectionAndFeature(
    brandId: string | Types.ObjectId,
    manufacturerId: string | Types.ObjectId,
    featureAccess: IFeatureAccessCheck
  ): Promise<IConnectionValidationResult> {
    const connectionStatus = await this.validateConnection(brandId, manufacturerId);

    if (!connectionStatus.isConnected) {
      return {
        isValid: false,
        isConnected: false,
        hasFeatureAccess: featureAccess.hasAccess,
        reason: 'Brand and manufacturer must have an active connection to use collaboration features',
        connectionStatus,
        featureAccess
      };
    }

    if (!featureAccess.hasAccess) {
      return {
        isValid: false,
        isConnected: true,
        hasFeatureAccess: false,
        reason: featureAccess.reason || 'One or both parties do not have the required subscription plan',
        connectionStatus,
        featureAccess
      };
    }

    return {
      isValid: true,
      isConnected: true,
      hasFeatureAccess: true,
      connectionStatus,
      featureAccess
    };
  }

  /**
   * Batch validate multiple connections
   */
  public async validateMultipleConnections(
    connections: Array<{
      brandId: string | Types.ObjectId;
      manufacturerId: string | Types.ObjectId;
    }>
  ): Promise<Map<string, IConnectionStatus>> {
    const results = new Map<string, IConnectionStatus>();

    for (const { brandId, manufacturerId } of connections) {
      const key = `${brandId.toString()}-${manufacturerId.toString()}`;
      const status = await this.validateConnection(brandId, manufacturerId);
      results.set(key, status);
    }

    return results;
  }

  /**
   * Check if connection allows workspace creation
   */
  public async canCreateWorkspace(
    brandId: string | Types.ObjectId,
    manufacturerId: string | Types.ObjectId
  ): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const connectionStatus = await this.validateConnection(brandId, manufacturerId);

    if (!connectionStatus.isConnected) {
      return {
        allowed: false,
        reason: 'An active connection is required to create a workspace'
      };
    }

    if (connectionStatus.status !== 'active') {
      return {
        allowed: false,
        reason: `Connection status must be active (current: ${connectionStatus.status})`
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * Get connection requirements message
   */
  public getConnectionRequirementsMessage(): string {
    return 'Collaboration features are only available for connected brand-manufacturer pairs. ' +
           'Please ensure you have an active connection before using workspaces, file sharing, ' +
           'production updates, or task management features.';
  }

  /**
   * Validate workspace access
   */
  public async validateWorkspaceAccess(
    userId: string | Types.ObjectId,
    workspaceId: string | Types.ObjectId,
    userType: 'brand' | 'manufacturer'
  ): Promise<{
    hasAccess: boolean;
    reason?: string;
    role?: 'owner' | 'admin' | 'member' | 'viewer';
  }> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const workspaceObjectId = new Types.ObjectId(workspaceId);

      // Find the workspace
      const workspace = await Workspace.findById(workspaceObjectId);

      if (!workspace) {
        return {
          hasAccess: false,
          reason: 'Workspace not found'
        };
      }

      // Check if workspace is archived
      if (workspace.archivedAt) {
        return {
          hasAccess: false,
          reason: 'Workspace has been archived'
        };
      }

      // Special case: If this is a manufacturer and they are the workspace's manufacturer,
      // grant them access even if not explicitly in manufacturerMembers
      if (userType === 'manufacturer' && workspace.manufacturerId.toString() === userObjectId.toString()) {
        return {
          hasAccess: true,
          role: 'owner' // The workspace's manufacturer has owner-level access
        };
      }

      // Special case: If this is a brand and they are the workspace's brand,
      // grant them access even if not explicitly in brandMembers
      if (userType === 'brand' && workspace.brandId.toString() === userObjectId.toString()) {
        return {
          hasAccess: true,
          role: 'owner' // The workspace's brand has owner-level access
        };
      }

      // Get the appropriate member array based on user type
      const memberArray = userType === 'brand'
        ? workspace.brandMembers
        : workspace.manufacturerMembers;

      // Find the user in the member array
      const member = memberArray.find(
        m => m.userId.toString() === userObjectId.toString()
      );

      if (!member) {
        return {
          hasAccess: false,
          reason: 'User is not a member of this workspace'
        };
      }

      return {
        hasAccess: true,
        role: member.role
      };
    } catch (error) {
      throw new Error(`Workspace access validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const connectionValidationService = new ConnectionValidationService();
