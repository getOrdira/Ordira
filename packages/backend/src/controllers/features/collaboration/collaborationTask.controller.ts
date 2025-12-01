// src/controllers/features/collaboration/collaborationTask.controller.ts
// Controller for task management operations

import { Response, NextFunction } from 'express';
import { CollaborationBaseController, CollaborationRequest } from './collaborationBase.controller';

interface TaskQuery {
  workspaceId?: string;
  threadType?: 'task' | 'discussion' | 'approval' | 'question';
  isResolved?: boolean;
  status?: string;
  priority?: string;
  assignedTo?: string;
  overdueOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dueDateFrom?: string;
  dueDateTo?: string;
}

interface TaskRequest extends CollaborationRequest {
  validatedQuery?: TaskQuery;
  validatedParams?: { workspaceId?: string; taskId?: string; itemId?: string };
  validatedBody?: any;
}

/**
 * CollaborationTaskController handles task and thread management operations.
 */
export class CollaborationTaskController extends CollaborationBaseController {
  /**
   * Create a new task or discussion thread.
   */
  async createThread(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'CREATE_TASK_THREAD');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const input = {
          workspaceId,
          createdBy: userId,
          threadType: req.validatedBody?.threadType || 'task',
          title: req.validatedBody?.title,
          description: req.validatedBody?.description,
          taskDetails: req.validatedBody?.taskDetails ? {
            assignees: req.validatedBody.taskDetails.assignees || [],
            dueDate: req.validatedBody.taskDetails.dueDate ? new Date(req.validatedBody.taskDetails.dueDate) : undefined,
            priority: req.validatedBody.taskDetails.priority || 'medium',
            estimatedHours: req.validatedBody.taskDetails.estimatedHours,
            tags: req.validatedBody.taskDetails.tags || [],
            checklist: req.validatedBody.taskDetails.checklist || [],
          } : undefined,
          relatedEntities: req.validatedBody?.relatedEntities || [],
          visibleToBrand: req.validatedBody?.visibleToBrand !== false,
          visibleToManufacturer: req.validatedBody?.visibleToManufacturer !== false,
        };

        const thread = await this.collaborationServices.features.taskManagement.createThread(input);

        this.logAction(req, 'CREATE_TASK_THREAD_SUCCESS', {
          taskId: thread._id.toString(),
          workspaceId,
        });

        return { task: thread };
      });
    }, res, 'Task thread created successfully', this.getRequestMeta(req));
  }

  /**
   * Get thread by ID.
   */
  async getThreadById(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_TASK_THREAD_BY_ID');

        const taskId = req.validatedParams?.taskId;
        if (!taskId) {
          throw { statusCode: 400, message: 'Task ID is required' };
        }

        const thread = await this.collaborationServices.features.taskManagement.getThreadById(taskId);

        if (!thread) {
          throw { statusCode: 404, message: 'Thread not found' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, thread.workspaceId.toString(), userId, userType);

        this.logAction(req, 'GET_TASK_THREAD_BY_ID_SUCCESS', {
          taskId,
        });

        return { task: thread };
      });
    }, res, 'Task thread retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get threads for a workspace.
   */
  async getWorkspaceThreads(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_WORKSPACE_THREADS');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const query = req.validatedQuery || {};
        const isResolvedValue = typeof query.isResolved === 'boolean' 
          ? query.isResolved 
          : query.isResolved === 'true' ? true 
          : query.isResolved === 'false' ? false 
          : undefined;
        const options = {
          threadType: query.threadType,
          isResolved: isResolvedValue,
          limit: query.limit ? parseInt(query.limit.toString()) : undefined,
        };

        const threads = await this.collaborationServices.features.taskManagement.getWorkspaceThreads(
          workspaceId,
          options
        );

        this.logAction(req, 'GET_WORKSPACE_THREADS_SUCCESS', {
          workspaceId,
          count: threads.length,
        });

        return { tasks: threads };
      });
    }, res, 'Workspace threads retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get threads with filtering and pagination.
   */
  async getThreads(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_TASK_THREADS');

        const query = req.validatedQuery || {};
        const isResolvedValue = typeof query.isResolved === 'boolean' 
          ? query.isResolved 
          : query.isResolved === 'true' ? true 
          : query.isResolved === 'false' ? false 
          : undefined;
        const overdueOnlyValue = typeof query.overdueOnly === 'boolean'
          ? query.overdueOnly
          : query.overdueOnly === 'true';
        const filter = {
          workspaceId: query.workspaceId,
          threadType: query.threadType,
          isResolved: isResolvedValue,
          status: query.status as 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled' | undefined,
          priority: query.priority as 'low' | 'medium' | 'high' | 'critical' | undefined,
          assignedTo: query.assignedTo,
          overdueOnly: overdueOnlyValue,
          page: query.page || 1,
          limit: query.limit || 20,
          sortBy: query.sortBy || 'lastActivityAt',
          sortOrder: query.sortOrder || 'desc',
          dueDateFrom: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
          dueDateTo: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
        };

        const result = await this.collaborationServices.features.taskManagement.getThreads(filter);

        this.logAction(req, 'GET_TASK_THREADS_SUCCESS', {
          count: result.data.length,
        });

        return {
          tasks: result.data,
          pagination: result.pagination,
        };
      });
    }, res, 'Task threads retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get user's assigned tasks.
   */
  async getUserTasks(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_USER_TASKS');

        const userId = this.resolveUserId(req);
        const query = req.validatedQuery || {};
        const status = query.status as 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled' | undefined;

        const tasks = await this.collaborationServices.features.taskManagement.getUserTasks(userId, status);

        this.logAction(req, 'GET_USER_TASKS_SUCCESS', {
          userId,
          count: tasks.length,
        });

        return { tasks };
      });
    }, res, 'User tasks retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Update task status.
   */
  async updateTaskStatus(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_TASK_STATUS');

        const taskId = req.validatedParams?.taskId;
        if (!taskId) {
          throw { statusCode: 400, message: 'Task ID is required' };
        }

        const userId = this.resolveUserId(req);
        const status = req.validatedBody?.status as 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled';

        if (!status) {
          throw { statusCode: 400, message: 'Status is required' };
        }

        // Get thread to check workspace access
        const thread = await this.collaborationServices.features.taskManagement.getThreadById(taskId);
        if (!thread) {
          throw { statusCode: 404, message: 'Thread not found' };
        }

        const userType = this.resolveUserType(req);
        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, thread.workspaceId.toString(), userId, userType);

        const updatedThread = await this.collaborationServices.features.taskManagement.updateTaskStatus(
          taskId,
          status,
          userId
        );

        this.logAction(req, 'UPDATE_TASK_STATUS_SUCCESS', {
          taskId,
          status,
        });

        return { task: updatedThread };
      });
    }, res, 'Task status updated successfully', this.getRequestMeta(req));
  }

  /**
   * Add comment to thread.
   */
  async addComment(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'ADD_TASK_COMMENT');

        const taskId = req.validatedParams?.taskId;
        if (!taskId) {
          throw { statusCode: 400, message: 'Task ID is required' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Get thread to check workspace access
        const thread = await this.collaborationServices.features.taskManagement.getThreadById(taskId);
        if (!thread) {
          throw { statusCode: 404, message: 'Thread not found' };
        }

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, thread.workspaceId.toString(), userId, userType);

        const commentData = {
          userId,
          userType,
          message: req.validatedBody?.message || req.validatedBody?.comment,
        };

        const updatedThread = await this.collaborationServices.features.taskManagement.addComment(
          taskId,
          commentData
        );

        this.logAction(req, 'ADD_TASK_COMMENT_SUCCESS', {
          taskId,
        });

        return { task: updatedThread };
      });
    }, res, 'Comment added successfully', this.getRequestMeta(req));
  }

  /**
   * Add participant to thread.
   */
  async addParticipant(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'ADD_TASK_PARTICIPANT');

        const taskId = req.validatedParams?.taskId;
        if (!taskId) {
          throw { statusCode: 400, message: 'Task ID is required' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Get thread to check workspace access
        const thread = await this.collaborationServices.features.taskManagement.getThreadById(taskId);
        if (!thread) {
          throw { statusCode: 404, message: 'Thread not found' };
        }

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, thread.workspaceId.toString(), userId, userType);

        const participantUserId = req.validatedBody?.userId;
        const participantUserType = req.validatedBody?.userType || userType;
        const role = req.validatedBody?.role || 'commenter';

        if (!participantUserId) {
          throw { statusCode: 400, message: 'Participant user ID is required' };
        }

        const updatedThread = await this.collaborationServices.features.taskManagement.addParticipant(
          taskId,
          participantUserId,
          participantUserType,
          role
        );

        this.logAction(req, 'ADD_TASK_PARTICIPANT_SUCCESS', {
          taskId,
          participantUserId,
        });

        return { task: updatedThread };
      });
    }, res, 'Participant added successfully', this.getRequestMeta(req));
  }

  /**
   * Resolve thread.
   */
  async resolveThread(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'RESOLVE_TASK_THREAD');

        const taskId = req.validatedParams?.taskId;
        if (!taskId) {
          throw { statusCode: 400, message: 'Task ID is required' };
        }

        const userId = this.resolveUserId(req);

        // Get thread to check workspace access
        const thread = await this.collaborationServices.features.taskManagement.getThreadById(taskId);
        if (!thread) {
          throw { statusCode: 404, message: 'Thread not found' };
        }

        const userType = this.resolveUserType(req);
        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, thread.workspaceId.toString(), userId, userType);

        const updatedThread = await this.collaborationServices.features.taskManagement.resolveThread(
          taskId,
          userId
        );

        this.logAction(req, 'RESOLVE_TASK_THREAD_SUCCESS', {
          taskId,
        });

        return { task: updatedThread };
      });
    }, res, 'Thread resolved successfully', this.getRequestMeta(req));
  }

  /**
   * Toggle checklist item.
   */
  async toggleChecklistItem(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'TOGGLE_CHECKLIST_ITEM');

        const taskId = req.validatedParams?.taskId;
        const itemId = req.validatedParams?.itemId || req.validatedBody?.itemId;

        if (!taskId || !itemId) {
          throw { statusCode: 400, message: 'Task ID and item ID are required' };
        }

        const userId = this.resolveUserId(req);

        // Get thread to check workspace access
        const thread = await this.collaborationServices.features.taskManagement.getThreadById(taskId);
        if (!thread) {
          throw { statusCode: 404, message: 'Thread not found' };
        }

        const userType = this.resolveUserType(req);
        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, thread.workspaceId.toString(), userId, userType);

        const updatedThread = await this.collaborationServices.features.taskManagement.toggleChecklistItem(
          taskId,
          itemId,
          userId
        );

        this.logAction(req, 'TOGGLE_CHECKLIST_ITEM_SUCCESS', {
          taskId,
          itemId,
        });

        return { task: updatedThread };
      });
    }, res, 'Checklist item toggled successfully', this.getRequestMeta(req));
  }

  /**
   * Get overdue tasks.
   */
  async getOverdueTasks(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_OVERDUE_TASKS');

        const query = req.validatedQuery || {};
        const workspaceId = query.workspaceId;

        const tasks = await this.collaborationServices.features.taskManagement.getOverdueTasks(workspaceId);

        this.logAction(req, 'GET_OVERDUE_TASKS_SUCCESS', {
          workspaceId,
          count: tasks.length,
        });

        return { tasks };
      });
    }, res, 'Overdue tasks retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get thread statistics for workspace.
   */
  async getThreadStats(req: TaskRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_THREAD_STATS');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const stats = await this.collaborationServices.features.taskManagement.getThreadStats(workspaceId);

        this.logAction(req, 'GET_THREAD_STATS_SUCCESS', {
          workspaceId,
        });

        return { stats };
      });
    }, res, 'Thread statistics retrieved successfully', this.getRequestMeta(req));
  }
}

export const collaborationTaskController = new CollaborationTaskController();

