// src/services/collaboration/features/productionUpdates.service.ts

import { Types } from 'mongoose';
import { ProductionUpdate, IProductionUpdate } from '../../../models/collaboration/productionUpdate.model';
import { Workspace } from '../../../models/collaboration/workspace.model';
import {
  ICreateProductionUpdateInput,
  IProductionUpdateFilterOptions,
  IPaginatedResponse,
  IProductionUpdateSummary,
  IAddCommentInput
} from '../../../models/collaboration/types';
import { collaborationEventEmitter } from '../utils/collaborationEventEmitter.service';

/**
 * Production Updates Service
 * Handles real-time production updates from manufacturers to brands
 */
export class ProductionUpdatesService {
  /**
   * Create a new production update
   */
  public async createUpdate(input: ICreateProductionUpdateInput): Promise<IProductionUpdate> {
    try {
      // Verify workspace exists
      const workspace = await Workspace.findById(input.workspaceId);

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Verify manufacturer matches workspace
      if (workspace.manufacturerId.toString() !== input.manufacturerId) {
        throw new Error('Manufacturer ID does not match workspace');
      }

      // Check if workspace has realTimeUpdates feature enabled
      if (!workspace.enabledFeatures.realTimeUpdates) {
        throw new Error('Real-time updates feature not enabled for this workspace');
      }

      // Create the update
      const update = await ProductionUpdate.create({
        workspaceId: new Types.ObjectId(input.workspaceId),
        manufacturerId: new Types.ObjectId(input.manufacturerId),
        createdBy: new Types.ObjectId(input.createdBy),
        title: input.title,
        message: input.message,
        updateType: input.updateType,
        currentStatus: input.currentStatus,
        completionPercentage: input.completionPercentage,
        milestoneReached: input.milestoneReached,
        delayInfo: input.delayInfo,
        photos: input.photos || [],
        videos: input.videos || [],
        viewedBy: [],
        comments: [],
        notificationSent: false,
        recipientIds: input.recipientIds?.map(id => new Types.ObjectId(id)) || [],
        isAutomated: false
      });

      // Update workspace update count
      workspace.updateCount += 1;
      workspace.lastActivity = new Date();
      await workspace.save();

      // Emit real-time event
      collaborationEventEmitter.emitProductionUpdateCreated(
        update,
        input.createdBy,
        'manufacturer'
      );

      return update;
    } catch (error) {
      throw new Error(`Failed to create production update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get update by ID
   */
  public async getUpdateById(updateId: string): Promise<IProductionUpdate | null> {
    try {
      return await ProductionUpdate.findById(updateId)
        .populate('createdBy', 'name email');
    } catch (error) {
      throw new Error(`Failed to get update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get updates for a workspace
   */
  public async getWorkspaceUpdates(
    workspaceId: string,
    options?: { limit?: number; updateType?: string }
  ): Promise<IProductionUpdate[]> {
    try {
      const query: any = { workspaceId: new Types.ObjectId(workspaceId) };

      if (options?.updateType) {
        query.updateType = options.updateType;
      }

      return await ProductionUpdate.find(query)
        .sort({ createdAt: -1 })
        .limit(options?.limit || 50)
        .populate('createdBy', 'name email');
    } catch (error) {
      throw new Error(`Failed to get workspace updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get updates with filtering and pagination
   */
  public async getUpdates(
    filter: IProductionUpdateFilterOptions
  ): Promise<IPaginatedResponse<IProductionUpdate>> {
    try {
      const query: any = {};

      // Apply filters
      if (filter.workspaceId) query.workspaceId = new Types.ObjectId(filter.workspaceId);
      if (filter.manufacturerId) query.manufacturerId = new Types.ObjectId(filter.manufacturerId);
      if (filter.updateType) query.updateType = filter.updateType;

      // Unviewed filter
      if (filter.unviewedOnly && filter.dateFrom) {
        query['viewedBy.userId'] = { $ne: filter.dateFrom }; // Placeholder - needs userId
      }

      // Date range
      if (filter.dateFrom || filter.dateTo) {
        query.createdAt = {};
        if (filter.dateFrom) query.createdAt.$gte = filter.dateFrom;
        if (filter.dateTo) query.createdAt.$lte = filter.dateTo;
      }

      // Pagination
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const sortField = filter.sortBy || 'createdAt';
      const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
      const sort: any = { [sortField]: sortOrder };

      // Execute queries
      const [data, total] = await Promise.all([
        ProductionUpdate.find(query)
          .sort(sort)
          .limit(limit)
          .skip(skip)
          .populate('createdBy', 'name email')
          .lean(),
        ProductionUpdate.countDocuments(query)
      ]);

      return {
        data: data as IProductionUpdate[],
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
      throw new Error(`Failed to get updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark update as viewed by user
   */
  public async markAsViewed(
    updateId: string,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): Promise<void> {
    try {
      const update = await ProductionUpdate.findById(updateId);
      if (!update) {
        throw new Error('Update not found');
      }

      await ProductionUpdate.markAsViewed(updateId, userId, userType);

      // Emit real-time event
      collaborationEventEmitter.emitProductionUpdateViewed(
        updateId,
        update.workspaceId.toString(),
        userId,
        userType
      );
    } catch (error) {
      throw new Error(`Failed to mark update as viewed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add comment to update
   */
  public async addComment(
    updateId: string,
    commentData: IAddCommentInput
  ): Promise<IProductionUpdate | null> {
    try {
      const update = await ProductionUpdate.findById(updateId);

      if (!update) {
        throw new Error('Update not found');
      }

      const comment = await update.addComment(
        commentData.userId,
        commentData.userType,
        commentData.message
      );

      // Emit real-time event
      collaborationEventEmitter.emitProductionUpdateCommented(
        updateId,
        update.workspaceId.toString(),
        comment,
        commentData.userId,
        commentData.userType
      );

      return update;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get unviewed updates for a user
   */
  public async getUnviewedUpdates(userId: string): Promise<IProductionUpdate[]> {
    try {
      return await ProductionUpdate.findUnviewedByUser(userId);
    } catch (error) {
      throw new Error(`Failed to get unviewed updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get update statistics
   */
  public async getUpdateStats(workspaceId: string): Promise<any> {
    try {
      return await ProductionUpdate.getUpdateStats(workspaceId);
    } catch (error) {
      throw new Error(`Failed to get update stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert update to summary format
   */
  public toSummary(update: IProductionUpdate, userId?: string): IProductionUpdateSummary {
    return {
      id: update._id.toString(),
      workspaceId: update.workspaceId.toString(),
      manufacturerId: update.manufacturerId.toString(),
      title: update.title,
      message: update.message,
      updateType: update.updateType,
      currentStatus: update.currentStatus,
      completionPercentage: update.completionPercentage,
      photoCount: update.photos.length,
      videoCount: update.videos.length,
      viewCount: update.viewedBy.length,
      commentCount: update.comments.length,
      hasDelayInfo: !!update.delayInfo,
      hasMilestone: !!update.milestoneReached,
      isViewed: userId ? update.isViewedBy(userId) : false,
      createdBy: {
        id: update.createdBy.toString(),
        name: 'User', // TODO: Populate from user data
        email: 'user@example.com' // TODO: Populate from user data
      },
      createdAt: update.createdAt
    };
  }
}

// Export singleton instance
export const productionUpdatesService = new ProductionUpdatesService();
