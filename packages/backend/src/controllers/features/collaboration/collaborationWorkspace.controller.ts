// src/controllers/features/collaboration/collaborationWorkspace.controller.ts
// Controller for workspace management operations

import { Response, NextFunction } from 'express';
import { CollaborationBaseController, CollaborationRequest } from './collaborationBase.controller';

interface WorkspaceQuery {
  brandId?: string;
  manufacturerId?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
}

interface WorkspaceRequest extends CollaborationRequest {
  validatedQuery?: WorkspaceQuery;
  validatedParams?: { workspaceId?: string; userId?: string };
  validatedBody?: any;
}

/**
 * CollaborationWorkspaceController handles workspace CRUD operations.
 */
export class CollaborationWorkspaceController extends CollaborationBaseController {
  /**
   * Create a new collaboration workspace.
   */
  async createWorkspace(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Validate auth - if fails, it will send response and return early
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'CREATE_WORKSPACE');

      // Use body values if provided, otherwise resolve from connection context
      const bodyBrandId = req.validatedBody?.brandId;
      const bodyManufacturerId = req.validatedBody?.manufacturerId;
      const { brandId, manufacturerId } = bodyBrandId && bodyManufacturerId
        ? { brandId: bodyBrandId, manufacturerId: bodyManufacturerId }
        : this.resolveConnectionPair(req);

      const userId = this.resolveUserId(req);
      const userType = this.resolveUserType(req);

      if (!req.validatedBody?.name) {
        throw { statusCode: 400, message: 'Workspace name is required' };
      }

      const input = {
        brandId,
        manufacturerId,
        name: req.validatedBody.name,
        description: req.validatedBody?.description,
        type: req.validatedBody?.type || 'general',
        createdBy: userId,
        productionDetails: req.validatedBody?.productionDetails,
        brandMembers: req.validatedBody?.brandMembers,
        manufacturerMembers: req.validatedBody?.manufacturerMembers,
        // Optional: Allow explicit feature enablement for testing or admin purposes
        enabledFeatures: req.validatedBody?.enabledFeatures,
      };

      const workspace = await this.collaborationServices.core.workspaceManagement.createWorkspace(input);

      this.logAction(req, 'CREATE_WORKSPACE_SUCCESS', {
        workspaceId: workspace.workspaceId,
        brandId,
        manufacturerId,
      });

      return { workspace };
    }, res, 'Workspace created successfully', this.getRequestMeta(req));
  }

  /**
   * Get workspace by UUID.
   */
  async getWorkspaceById(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_WORKSPACE_BY_ID');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const workspace = await this.collaborationServices.core.workspaceManagement.getWorkspaceById(workspaceId);

        if (!workspace) {
          throw { statusCode: 404, message: 'Workspace not found' };
        }

        this.logAction(req, 'GET_WORKSPACE_BY_ID_SUCCESS', {
          workspaceId,
        });

        return { workspace };
      });
    }, res, 'Workspace retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get workspaces with filtering and pagination.
   */
  async getWorkspaces(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Validate auth - if fails, it will send response and return early
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'GET_WORKSPACES');

      const query = req.validatedQuery || {};
      
      // Get brandId and manufacturerId from query params or user context
      const queryBrandId = query.brandId;
      const queryManufacturerId = query.manufacturerId;
      
      // Try to resolve from query params first
      let brandId = queryBrandId;
      let manufacturerId = queryManufacturerId;
      
      // If not in query, try to resolve from user context
      if (!brandId) {
        brandId = req.businessId || req.collaboration?.brandId?.toString();
      }
      if (!manufacturerId) {
        manufacturerId = req.manufacturerId || req.collaboration?.manufacturerId?.toString();
      }
      
      // If still missing, try resolveConnectionPair as last resort
      if (!brandId || !manufacturerId) {
        try {
          const resolved = this.resolveConnectionPair(req);
          brandId = brandId || resolved.brandId;
          manufacturerId = manufacturerId || resolved.manufacturerId;
        } catch (error) {
          // If resolveConnectionPair fails, require query params
          if (!queryBrandId || !queryManufacturerId) {
            throw { 
              statusCode: 400, 
              message: 'Both brandId and manufacturerId are required in query parameters or connection context' 
            };
          }
        }
      }

      const filter = {
        brandId,
        manufacturerId,
        status: query.status as 'active' | 'archived' | 'completed' | 'cancelled' | undefined,
        type: query.type as 'general' | 'production_run' | 'design_collaboration' | undefined,
        page: query.page || 1,
        limit: query.limit || 20,
        sortBy: query.sortBy || 'lastActivity',
        sortOrder: query.sortOrder || 'desc',
        searchQuery: query.searchQuery,
      };

      const result = await this.collaborationServices.core.workspaceManagement.getWorkspaces(filter);

      if (!result) {
        throw { statusCode: 500, message: 'Failed to retrieve workspaces' };
      }

      this.logAction(req, 'GET_WORKSPACES_SUCCESS', {
        brandId,
        manufacturerId,
        count: result.data?.length || 0,
      });

      return {
        workspaces: result.data || [],
        pagination: result.pagination || {
          page: filter.page,
          limit: filter.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
      };
    }, res, 'Workspaces retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get user's workspaces.
   */
  async getUserWorkspaces(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_USER_WORKSPACES');

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);
        const query = req.validatedQuery || {};

        const options = {
          status: query.status,
          limit: query.limit ? parseInt(query.limit.toString()) : undefined,
        };

        const workspaces = await this.collaborationServices.core.workspaceManagement.getUserWorkspaces(
          userId,
          userType,
          options
        );

        this.logAction(req, 'GET_USER_WORKSPACES_SUCCESS', {
          userId,
          userType,
          count: workspaces.length,
        });

        return { workspaces };
      });
    }, res, 'User workspaces retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Update workspace details.
   */
  async updateWorkspace(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Validate auth - if fails, it will send response and return early
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'UPDATE_WORKSPACE');

      const workspaceId = this.resolveWorkspaceId(req);
      const userId = this.resolveUserId(req);
      const userType = this.resolveUserType(req);

      // Ensure user has access to workspace
      await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

      const updates = {
        name: req.validatedBody?.name,
        description: req.validatedBody?.description,
        productionDetails: req.validatedBody?.productionDetails,
      };

      const workspace = await this.collaborationServices.core.workspaceManagement.updateWorkspace(
        workspaceId,
        updates
      );

      if (!workspace) {
        throw { statusCode: 404, message: 'Workspace not found' };
      }

      this.logAction(req, 'UPDATE_WORKSPACE_SUCCESS', {
        workspaceId,
      });

      return { workspace };
    }, res, 'Workspace updated successfully', this.getRequestMeta(req));
  }

  /**
   * Add member to workspace.
   */
  async addMember(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'ADD_WORKSPACE_MEMBER');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const memberData = {
          userId: req.validatedBody?.userId,
          userType: req.validatedBody?.userType,
          role: req.validatedBody?.role || 'member',
          addedBy: userId,
        };

        const workspace = await this.collaborationServices.core.workspaceManagement.addMember(
          workspaceId,
          memberData
        );

        if (!workspace) {
          throw { statusCode: 404, message: 'Workspace not found' };
        }

        this.logAction(req, 'ADD_WORKSPACE_MEMBER_SUCCESS', {
          workspaceId,
          memberUserId: memberData.userId,
        });

        return { workspace };
      });
    }, res, 'Member added to workspace successfully', this.getRequestMeta(req));
  }

  /**
   * Remove member from workspace.
   */
  async removeMember(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'REMOVE_WORKSPACE_MEMBER');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const memberUserId = req.validatedParams?.userId || req.validatedBody?.userId;
        const memberUserType = req.validatedBody?.userType || userType;

        if (!memberUserId) {
          throw { statusCode: 400, message: 'Member user ID is required' };
        }

        const workspace = await this.collaborationServices.core.workspaceManagement.removeMember(
          workspaceId,
          memberUserId,
          memberUserType
        );

        if (!workspace) {
          throw { statusCode: 404, message: 'Workspace not found' };
        }

        this.logAction(req, 'REMOVE_WORKSPACE_MEMBER_SUCCESS', {
          workspaceId,
          memberUserId,
        });

        return { workspace };
      });
    }, res, 'Member removed from workspace successfully', this.getRequestMeta(req));
  }

  /**
   * Archive workspace.
   */
  async archiveWorkspace(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'ARCHIVE_WORKSPACE');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const workspace = await this.collaborationServices.core.workspaceManagement.archiveWorkspace(
          workspaceId,
          userId
        );

        if (!workspace) {
          throw { statusCode: 404, message: 'Workspace not found' };
        }

        this.logAction(req, 'ARCHIVE_WORKSPACE_SUCCESS', {
          workspaceId,
        });

        return { workspace };
      });
    }, res, 'Workspace archived successfully', this.getRequestMeta(req));
  }

  /**
   * Get workspace statistics.
   */
  async getWorkspaceStats(req: WorkspaceRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_WORKSPACE_STATS');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const stats = await this.collaborationServices.core.workspaceManagement.getWorkspaceStats(workspaceId);

        this.logAction(req, 'GET_WORKSPACE_STATS_SUCCESS', {
          workspaceId,
        });

        return { stats };
      });
    }, res, 'Workspace statistics retrieved successfully', this.getRequestMeta(req));
  }
}

export const collaborationWorkspaceController = new CollaborationWorkspaceController();

