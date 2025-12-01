// src/controllers/features/collaboration/collaborationProductionUpdate.controller.ts
// Controller for production update operations

import { Response, NextFunction } from 'express';
import { CollaborationBaseController, CollaborationRequest } from './collaborationBase.controller';

interface ProductionUpdateQuery {
  workspaceId?: string;
  manufacturerId?: string;
  updateType?: string;
  unviewedOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

interface ProductionUpdateRequest extends CollaborationRequest {
  validatedQuery?: ProductionUpdateQuery;
  validatedParams?: { workspaceId?: string; updateId?: string };
  validatedBody?: any;
}

/**
 * CollaborationProductionUpdateController handles production update operations.
 */
export class CollaborationProductionUpdateController extends CollaborationBaseController {
  /**
   * Create a new production update.
   */
  async createUpdate(req: ProductionUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'CREATE_PRODUCTION_UPDATE');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        // For production updates, manufacturerId should come from workspace or be the current user's manufacturer
        const manufacturerId = req.manufacturerId || this.resolveManufacturerId(req);

        const input = {
          workspaceId,
          manufacturerId,
          createdBy: userId,
          title: req.validatedBody?.title,
          message: req.validatedBody?.message,
          updateType: req.validatedBody?.updateType || 'general',
          currentStatus: req.validatedBody?.currentStatus,
          completionPercentage: req.validatedBody?.completionPercentage,
          milestoneReached: req.validatedBody?.milestoneReached,
          delayInfo: req.validatedBody?.delayInfo,
          photos: req.validatedBody?.photos || [],
          videos: req.validatedBody?.videos || [],
          recipientIds: req.validatedBody?.recipientIds || [],
        };

        const update = await this.collaborationServices.features.productionUpdates.createUpdate(input);

        this.logAction(req, 'CREATE_PRODUCTION_UPDATE_SUCCESS', {
          updateId: update._id.toString(),
          workspaceId,
        });

        return { update };
      });
    }, res, 'Production update created successfully', this.getRequestMeta(req));
  }

  /**
   * Get update by ID.
   */
  async getUpdateById(req: ProductionUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_PRODUCTION_UPDATE_BY_ID');

        const updateId = req.validatedParams?.updateId;
        if (!updateId) {
          throw { statusCode: 400, message: 'Update ID is required' };
        }

        const update = await this.collaborationServices.features.productionUpdates.getUpdateById(updateId);

        if (!update) {
          throw { statusCode: 404, message: 'Update not found' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, update.workspaceId.toString(), userId, userType);

        this.logAction(req, 'GET_PRODUCTION_UPDATE_BY_ID_SUCCESS', {
          updateId,
        });

        return { update };
      });
    }, res, 'Production update retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get updates for a workspace.
   */
  async getWorkspaceUpdates(req: ProductionUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_WORKSPACE_UPDATES');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const query = req.validatedQuery || {};
        const options = {
          limit: query.limit ? parseInt(query.limit.toString()) : undefined,
          updateType: query.updateType,
        };

        const updates = await this.collaborationServices.features.productionUpdates.getWorkspaceUpdates(
          workspaceId,
          options
        );

        this.logAction(req, 'GET_WORKSPACE_UPDATES_SUCCESS', {
          workspaceId,
          count: updates.length,
        });

        return { updates };
      });
    }, res, 'Workspace updates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get updates with filtering and pagination.
   */
  async getUpdates(req: ProductionUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_PRODUCTION_UPDATES');

        const query = req.validatedQuery || {};
        const unviewedOnlyValue = typeof query.unviewedOnly === 'boolean'
          ? query.unviewedOnly
          : query.unviewedOnly === 'true';
        const filter = {
          workspaceId: query.workspaceId,
          manufacturerId: query.manufacturerId,
          updateType: query.updateType as 'status' | 'milestone' | 'delay' | 'quality' | 'general' | undefined,
          unviewedOnly: unviewedOnlyValue,
          page: query.page || 1,
          limit: query.limit || 20,
          sortBy: query.sortBy || 'createdAt',
          sortOrder: query.sortOrder || 'desc',
          dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
          dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        };

        const result = await this.collaborationServices.features.productionUpdates.getUpdates(filter);

        this.logAction(req, 'GET_PRODUCTION_UPDATES_SUCCESS', {
          count: result.data.length,
        });

        return {
          updates: result.data,
          pagination: result.pagination,
        };
      });
    }, res, 'Production updates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Mark update as viewed by user.
   */
  async markAsViewed(req: ProductionUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'MARK_UPDATE_AS_VIEWED');

        const updateId = req.validatedParams?.updateId;
        if (!updateId) {
          throw { statusCode: 400, message: 'Update ID is required' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Get update to check workspace access
        const update = await this.collaborationServices.features.productionUpdates.getUpdateById(updateId);
        if (!update) {
          throw { statusCode: 404, message: 'Update not found' };
        }

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, update.workspaceId.toString(), userId, userType);

        await this.collaborationServices.features.productionUpdates.markAsViewed(updateId, userId, userType);

        this.logAction(req, 'MARK_UPDATE_AS_VIEWED_SUCCESS', {
          updateId,
        });

        return { success: true };
      });
    }, res, 'Update marked as viewed successfully', this.getRequestMeta(req));
  }

  /**
   * Add comment to update.
   */
  async addComment(req: ProductionUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'ADD_UPDATE_COMMENT');

        const updateId = req.validatedParams?.updateId;
        if (!updateId) {
          throw { statusCode: 400, message: 'Update ID is required' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Get update to check workspace access
        const update = await this.collaborationServices.features.productionUpdates.getUpdateById(updateId);
        if (!update) {
          throw { statusCode: 404, message: 'Update not found' };
        }

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, update.workspaceId.toString(), userId, userType);

        const commentData = {
          userId,
          userType,
          message: req.validatedBody?.message || req.validatedBody?.comment,
        };

        const updatedUpdate = await this.collaborationServices.features.productionUpdates.addComment(
          updateId,
          commentData
        );

        this.logAction(req, 'ADD_UPDATE_COMMENT_SUCCESS', {
          updateId,
        });

        return { update: updatedUpdate };
      });
    }, res, 'Comment added successfully', this.getRequestMeta(req));
  }

  /**
   * Get unviewed updates for a user.
   */
  async getUnviewedUpdates(req: ProductionUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_UNVIEWED_UPDATES');

        const userId = this.resolveUserId(req);

        const updates = await this.collaborationServices.features.productionUpdates.getUnviewedUpdates(userId);

        this.logAction(req, 'GET_UNVIEWED_UPDATES_SUCCESS', {
          userId,
          count: updates.length,
        });

        return { updates };
      });
    }, res, 'Unviewed updates retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get update statistics for workspace.
   */
  async getUpdateStats(req: ProductionUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_UPDATE_STATS');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const stats = await this.collaborationServices.features.productionUpdates.getUpdateStats(workspaceId);

        this.logAction(req, 'GET_UPDATE_STATS_SUCCESS', {
          workspaceId,
        });

        return { stats };
      });
    }, res, 'Update statistics retrieved successfully', this.getRequestMeta(req));
  }
}

export const collaborationProductionUpdateController = new CollaborationProductionUpdateController();

