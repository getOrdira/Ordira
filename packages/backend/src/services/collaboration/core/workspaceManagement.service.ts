// src/services/collaboration/core/workspaceManagement.service.ts

import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Workspace, IWorkspace } from '../../../models/collaboration/workspace.model';
import { ICreateWorkspaceInput, IWorkspaceFilterOptions, IPaginatedResponse, IWorkspaceSummary } from '../../../models/collaboration/types';
import { connectionValidationService } from './connectionValidation.service';
import { featureAccessService } from '../validation/featureAccess.service';
import { PlanKey } from '../../../constants/plans';
import { ManufacturerPlanKey } from '../../../constants/manufacturerPlans';
import { isBrandPlan, isManufacturerPlan } from '../../subscriptions/utils/planCatalog';
import { collaborationEventEmitter } from '../utils/collaborationEventEmitter.service';
import { subscriptionDataService } from '../../subscriptions/core/subscriptionData.service';
import { logger } from '../../../utils/logger';

/**
 * Workspace Management Service
 * Handles CRUD operations for collaboration workspaces
 */
export class WorkspaceManagementService {
  /**
   * Create a new collaboration workspace
   */
  public async createWorkspace(input: ICreateWorkspaceInput): Promise<IWorkspace> {
    try {
      // Verify connection exists and is active
      const connectionStatus = await connectionValidationService.validateConnection(
        input.brandId,
        input.manufacturerId
      );

      if (!connectionStatus.isConnected) {
        throw new Error(connectionStatus.message || 'Brand and manufacturer must have an active connection');
      }

      // Check if connection can create workspace
      const canCreate = await connectionValidationService.canCreateWorkspace(
        input.brandId,
        input.manufacturerId
      );

      if (!canCreate.allowed) {
        throw new Error(canCreate.reason || 'Connection does not allow workspace creation');
      }

      // Get subscription tiers to determine enabled features
      let brandPlanTier: PlanKey = 'foundation'; // Default fallback
      let manufacturerPlanTier: ManufacturerPlanKey = 'starter'; // Default fallback

      try {
        // Fetch brand subscription
        const brandSubscription = await subscriptionDataService.findByBusiness(input.brandId);
        if (brandSubscription && brandSubscription.status === 'active' && isBrandPlan(brandSubscription.tier)) {
          brandPlanTier = brandSubscription.tier as PlanKey;
        } else {
          logger.warn('Brand subscription not found or inactive, using default tier', {
            brandId: input.brandId,
            defaultTier: brandPlanTier
          });
        }
      } catch (error) {
        logger.error('Failed to fetch brand subscription', {
          brandId: input.brandId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with default tier
      }

      try {
        // Fetch manufacturer subscription
        const manufacturerSubscription = await subscriptionDataService.findByManufacturer(input.manufacturerId);
        if (manufacturerSubscription && manufacturerSubscription.status === 'active' && isManufacturerPlan(manufacturerSubscription.tier)) {
          manufacturerPlanTier = manufacturerSubscription.tier as ManufacturerPlanKey;
        } else {
          logger.warn('Manufacturer subscription not found or inactive, using default tier', {
            manufacturerId: input.manufacturerId,
            defaultTier: manufacturerPlanTier
          });
        }
      } catch (error) {
        logger.error('Failed to fetch manufacturer subscription', {
          manufacturerId: input.manufacturerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with default tier
      }

      // Get all available features for this connection based on actual subscription tiers
      // If enabledFeatures was explicitly provided (e.g., for testing), use those
      let availableFeatures: Record<string, boolean>;
      
      if (input.enabledFeatures) {
        // Use provided features, filling in defaults for any not specified
        const defaultFeatures = featureAccessService.getAvailableFeatures(
          brandPlanTier,
          manufacturerPlanTier
        );
        availableFeatures = {
          ...defaultFeatures,
          ...input.enabledFeatures
        };
        logger.info('Using provided enabledFeatures for workspace creation', {
          brandId: input.brandId,
          manufacturerId: input.manufacturerId,
          enabledFeatures: availableFeatures
        });
      } else {
        availableFeatures = featureAccessService.getAvailableFeatures(
          brandPlanTier,
          manufacturerPlanTier
        );
      }

      // Create workspace with UUID
      const workspaceId = uuidv4();

      const workspace = await Workspace.create({
        workspaceId,
        name: input.name,
        description: input.description,
        brandId: new Types.ObjectId(input.brandId),
        manufacturerId: new Types.ObjectId(input.manufacturerId),
        type: input.type,
        status: 'active',
        productionDetails: input.productionDetails,

        // Set enabled features based on both parties' subscription plans
        enabledFeatures: availableFeatures,

        // Add creator as owner in appropriate member array
        brandMembers: input.brandMembers?.map(m => ({
          userId: new Types.ObjectId(m.userId),
          role: m.role,
          addedAt: new Date(),
          addedBy: new Types.ObjectId(input.createdBy)
        })) || [{
          userId: new Types.ObjectId(input.createdBy),
          role: 'owner',
          addedAt: new Date(),
          addedBy: new Types.ObjectId(input.createdBy)
        }],

        manufacturerMembers: input.manufacturerMembers?.map(m => ({
          userId: new Types.ObjectId(m.userId),
          role: m.role,
          addedAt: new Date(),
          addedBy: new Types.ObjectId(input.createdBy)
        })) || [],

        lastActivity: new Date(),
        activityCount: 0,
        messageCount: 0,
        fileCount: 0,
        updateCount: 0,
        createdBy: new Types.ObjectId(input.createdBy)
      });

      // TODO: Send notification to manufacturer members
      // await notificationService.sendWorkspaceCreatedNotification(...)

      return workspace;
    } catch (error) {
      throw new Error(`Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get workspace by ID (supports both UUID and MongoDB ObjectId)
   */
  public async getWorkspaceById(workspaceId: string): Promise<IWorkspace | null> {
    try {
      // Check if it's a UUID (contains hyphens) or MongoDB ObjectId (24 hex chars)
      if (workspaceId.includes('-')) {
        // It's a UUID, look up by workspaceId field
        return await Workspace.findOne({ workspaceId });
      } else if (/^[a-fA-F0-9]{24}$/.test(workspaceId)) {
        // It's a MongoDB ObjectId, look up by _id
        return await Workspace.findById(workspaceId);
      } else {
        // Try UUID first, fallback to name or other identifier
        return await Workspace.findOne({ workspaceId });
      }
    } catch (error) {
      throw new Error(`Failed to get workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get workspace by MongoDB _id
   */
  public async getWorkspaceByMongoId(id: string): Promise<IWorkspace | null> {
    try {
      return await Workspace.findById(id);
    } catch (error) {
      throw new Error(`Failed to get workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all workspaces with filtering and pagination
   */
  public async getWorkspaces(
    filter: IWorkspaceFilterOptions
  ): Promise<IPaginatedResponse<IWorkspace>> {
    try {
      const query: any = {};

      // Apply filters
      if (filter.status) query.status = filter.status;
      if (filter.type) query.type = filter.type;
      if (filter.brandId) query.brandId = new Types.ObjectId(filter.brandId);
      if (filter.manufacturerId) query.manufacturerId = new Types.ObjectId(filter.manufacturerId);

      // Text search
      if (filter.searchQuery) {
        query.$text = { $search: filter.searchQuery };
      }

      // Pagination
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const sortField = filter.sortBy || 'lastActivity';
      const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
      const sort: any = { [sortField]: sortOrder };

      // Execute queries
      const [data, total] = await Promise.all([
        Workspace.find(query)
          .sort(sort)
          .limit(limit)
          .skip(skip)
          .populate('createdBy', 'name email')
          .lean(),
        Workspace.countDocuments(query)
      ]);

      return {
        data: data as IWorkspace[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get workspaces for a specific user
   */
  public async getUserWorkspaces(
    userId: string,
    userType: 'brand' | 'manufacturer',
    options?: { status?: string; limit?: number }
  ): Promise<IWorkspace[]> {
    try {
      const query: any = {
        status: options?.status || 'active'
      };

      // Check membership in appropriate array
      const memberField = userType === 'brand' ? 'brandMembers.userId' : 'manufacturerMembers.userId';
      query[memberField] = new Types.ObjectId(userId);

      return await Workspace.find(query)
        .sort({ lastActivity: -1 })
        .limit(options?.limit || 50)
        .populate('createdBy', 'name email');
    } catch (error) {
      throw new Error(`Failed to get user workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update workspace details
   */
  public async updateWorkspace(
    workspaceId: string,
    updates: {
      name?: string;
      description?: string;
      productionDetails?: any;
    }
  ): Promise<IWorkspace | null> {
    try {
      const workspace = await Workspace.findOneAndUpdate(
        { workspaceId },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (workspace) {
        collaborationEventEmitter.emitWorkspaceUpdated(
          workspaceId,
          updates,
          'system', // TODO: Add updatedBy parameter
          'brand'
        );
      }

      return workspace;
    } catch (error) {
      throw new Error(`Failed to update workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add member to workspace
   */
  public async addMember(
    workspaceId: string,
    memberData: {
      userId: string;
      userType: 'brand' | 'manufacturer';
      role: 'owner' | 'admin' | 'member' | 'viewer';
      addedBy: string;
    }
  ): Promise<IWorkspace | null> {
    try {
      const workspace = await Workspace.findOne({ workspaceId });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const memberArray = memberData.userType === 'brand'
        ? workspace.brandMembers
        : workspace.manufacturerMembers;

      // Check if user is already a member
      const existingMember = memberArray.find(
        m => m.userId.toString() === memberData.userId
      );

      if (existingMember) {
        throw new Error('User is already a member of this workspace');
      }

      // Add new member
      const newMember = {
        userId: new Types.ObjectId(memberData.userId),
        role: memberData.role,
        addedAt: new Date(),
        addedBy: new Types.ObjectId(memberData.addedBy)
      };

      if (memberData.userType === 'brand') {
        workspace.brandMembers.push(newMember);
      } else {
        workspace.manufacturerMembers.push(newMember);
      }

      await workspace.save();

      // Emit real-time event
      collaborationEventEmitter.emitWorkspaceMemberJoined(
        workspaceId,
        memberData.userId,
        memberData.userType,
        memberData.role,
        memberData.addedBy
      );

      return workspace;
    } catch (error) {
      throw new Error(`Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove member from workspace
   */
  public async removeMember(
    workspaceId: string,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): Promise<IWorkspace | null> {
    try {
      const workspace = await Workspace.findOne({ workspaceId });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      if (userType === 'brand') {
        workspace.brandMembers = workspace.brandMembers.filter(
          m => m.userId.toString() !== userId
        );
      } else {
        workspace.manufacturerMembers = workspace.manufacturerMembers.filter(
          m => m.userId.toString() !== userId
        );
      }

      await workspace.save();

      // Emit real-time event
      collaborationEventEmitter.emitWorkspaceMemberLeft(
        workspaceId,
        userId,
        userType
      );

      return workspace;
    } catch (error) {
      throw new Error(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archive workspace
   */
  public async archiveWorkspace(
    workspaceId: string,
    archivedBy: string
  ): Promise<IWorkspace | null> {
    try {
      const workspace = await Workspace.findOneAndUpdate(
        { workspaceId },
        {
          $set: {
            status: 'archived',
            archivedAt: new Date(),
            archivedBy: new Types.ObjectId(archivedBy)
          }
        },
        { new: true }
      );

      if (workspace) {
        collaborationEventEmitter.emitWorkspaceArchived(
          workspaceId,
          archivedBy,
          'brand' // TODO: Determine from user context
        );
      }

      return workspace;
    } catch (error) {
      throw new Error(`Failed to archive workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get workspace statistics
   */
  public async getWorkspaceStats(workspaceId: string): Promise<any> {
    try {
      return await Workspace.getWorkspaceStats(workspaceId);
    } catch (error) {
      throw new Error(`Failed to get workspace stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert workspace to summary format
   */
  public toSummary(workspace: IWorkspace): IWorkspaceSummary {
    return {
      id: workspace._id.toString(),
      workspaceId: workspace.workspaceId,
      name: workspace.name,
      description: workspace.description,
      brandId: workspace.brandId.toString(),
      manufacturerId: workspace.manufacturerId.toString(),
      type: workspace.type,
      status: workspace.status,
      totalMembers: workspace.brandMembers.length + workspace.manufacturerMembers.length,
      activityCount: workspace.activityCount,
      messageCount: workspace.messageCount,
      fileCount: workspace.fileCount,
      updateCount: workspace.updateCount,
      lastActivity: workspace.lastActivity,
      daysSinceActivity: Math.floor(
        (Date.now() - workspace.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      ),
      enabledFeatures: workspace.enabledFeatures,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt
    };
  }
}

// Export singleton instance
export const workspaceManagementService = new WorkspaceManagementService();
