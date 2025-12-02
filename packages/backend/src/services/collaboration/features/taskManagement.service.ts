// src/services/collaboration/features/taskManagement.service.ts

import { Types } from 'mongoose';
import { TaskThread, ITaskThread } from '../../../models/collaboration/taskThread.model';
import { Workspace } from '../../../models/collaboration/workspace.model';
import {
  ICreateTaskThreadInput,
  ITaskFilterOptions,
  IPaginatedResponse,
  ITaskThreadSummary,
  IAddCommentInput,
  TaskStatus,
  ThreadType
} from '../../../models/collaboration/types';
import { collaborationEventEmitter } from '../utils/collaborationEventEmitter.service';

/**
 * Task Management Service
 * Handles task creation, assignments, and thread discussions
 */
export class TaskManagementService {
  /**
   * Create a new task or discussion thread
   */
  public async createThread(input: ICreateTaskThreadInput): Promise<ITaskThread> {
    try {
      // Verify workspace exists and get ObjectId
      let workspace: any;
      let workspaceObjectId: Types.ObjectId;

      // Check if workspaceId is a UUID (contains hyphens) or ObjectId (24 hex chars)
      if (input.workspaceId.includes('-')) {
        // It's a UUID, need to look up workspace
        workspace = await Workspace.findOne({ workspaceId: input.workspaceId });
        if (!workspace) {
          throw new Error('Workspace not found');
        }
        workspaceObjectId = workspace._id;
      } else {
        // It's an ObjectId
        workspace = await Workspace.findById(input.workspaceId);
        if (!workspace) {
          throw new Error('Workspace not found');
        }
        workspaceObjectId = new Types.ObjectId(input.workspaceId);
      }

      // Check if workspace has taskManagement feature enabled
      if (input.threadType === 'task' && !workspace.enabledFeatures.taskManagement) {
        throw new Error('Task management feature not enabled for this workspace');
      }

      // Create thread
      const thread = await TaskThread.create({
        workspaceId: workspaceObjectId,
        createdBy: new Types.ObjectId(input.createdBy),
        threadType: input.threadType,
        title: input.title,
        description: input.description,
        taskDetails: input.taskDetails ? {
          assignees: input.taskDetails.assignees.map(id => new Types.ObjectId(id)),
          dueDate: input.taskDetails.dueDate,
          priority: input.taskDetails.priority,
          status: 'todo',
          estimatedHours: input.taskDetails.estimatedHours,
          tags: input.taskDetails.tags || [],
          checklist: input.taskDetails.checklist?.map(item => ({
            text: item.text,
            completed: false
          })) || []
        } : undefined,
        participants: [],
        comments: [],
        relatedEntities: input.relatedEntities?.map(e => ({
          entityType: e.entityType,
          entityId: new Types.ObjectId(e.entityId),
          addedAt: new Date(),
          addedBy: new Types.ObjectId(input.createdBy)
        })) || [],
        isResolved: false,
        isPinned: false,
        isLocked: false,
        visibleToBrand: input.visibleToBrand !== false,
        visibleToManufacturer: input.visibleToManufacturer !== false,
        notifyOnNewComment: [],
        lastActivityAt: new Date(),
        commentCount: 0,
        viewCount: 0
      });

      // Update workspace activity
      workspace.lastActivity = new Date();
      await workspace.save();

      // Emit real-time event
      collaborationEventEmitter.emitTaskCreated(
        thread,
        input.createdBy,
        'brand' // TODO: Determine from user context
      );

      // Notify assignees if task has assignees
      if (input.taskDetails?.assignees && input.taskDetails.assignees.length > 0) {
        input.taskDetails.assignees.forEach(assigneeId => {
          collaborationEventEmitter.emitTaskAssigned(
            thread._id.toString(),
            thread.workspaceId.toString(),
            assigneeId,
            input.createdBy,
            'brand' // TODO: Determine from user context
          );
        });
      }

      return thread;
    } catch (error) {
      throw new Error(`Failed to create thread: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get thread by ID
   */
  public async getThreadById(threadId: string): Promise<ITaskThread | null> {
    try {
      return await TaskThread.findById(threadId)
        .populate('createdBy', 'name email')
        .populate('participants.userId', 'name email')
        .populate('taskDetails.assignees', 'name email');
    } catch (error) {
      throw new Error(`Failed to get thread: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get threads for a workspace
   */
  public async getWorkspaceThreads(
    workspaceId: string,
    options?: { threadType?: ThreadType; isResolved?: boolean; limit?: number }
  ): Promise<ITaskThread[]> {
    try {
      // Resolve workspace by UUID or ObjectId
      let workspaceObjectId: Types.ObjectId;

      // Check if workspaceId is a UUID (contains hyphens) or ObjectId (24 hex chars)
      if (workspaceId.includes('-')) {
        // It's a UUID, need to look up workspace
        const workspace = await Workspace.findOne({ workspaceId });
        if (!workspace) {
          throw new Error('Workspace not found');
        }
        workspaceObjectId = workspace._id;
      } else {
        // It's an ObjectId
        workspaceObjectId = new Types.ObjectId(workspaceId);
      }

      return await TaskThread.findByWorkspace(workspaceObjectId.toString(), options);
    } catch (error) {
      throw new Error(`Failed to get workspace threads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get threads with filtering and pagination
   */
  public async getThreads(
    filter: ITaskFilterOptions
  ): Promise<IPaginatedResponse<ITaskThread>> {
    try {
      const query: any = {};

      // Only include non-archived threads
      query.archivedAt = null;

      // Apply filters
      if (filter.workspaceId) query.workspaceId = new Types.ObjectId(filter.workspaceId);
      if (filter.threadType) query.threadType = filter.threadType;
      if (typeof filter.isResolved === 'boolean') query.isResolved = filter.isResolved;

      // Task-specific filters
      if (filter.status) {
        query['taskDetails.status'] = filter.status;
      }

      if (filter.priority) {
        query['taskDetails.priority'] = filter.priority;
      }

      if (filter.assignedTo) {
        query['taskDetails.assignees'] = new Types.ObjectId(filter.assignedTo);
      }

      // Overdue tasks
      if (filter.overdueOnly) {
        query['taskDetails.dueDate'] = { $lt: new Date() };
        query['taskDetails.status'] = { $nin: ['completed', 'cancelled'] };
      }

      // Due date range
      if (filter.dueDateFrom || filter.dueDateTo) {
        query['taskDetails.dueDate'] = {};
        if (filter.dueDateFrom) query['taskDetails.dueDate'].$gte = filter.dueDateFrom;
        if (filter.dueDateTo) query['taskDetails.dueDate'].$lte = filter.dueDateTo;
      }

      // Pagination
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const sortField = filter.sortBy || 'lastActivityAt';
      const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
      const sort: any = { [sortField]: sortOrder };

      // Execute queries
      const [data, total] = await Promise.all([
        TaskThread.find(query)
          .sort(sort)
          .limit(limit)
          .skip(skip)
          .populate('createdBy', 'name email')
          .populate('taskDetails.assignees', 'name email')
          .lean(),
        TaskThread.countDocuments(query)
      ]);

      return {
        data: data as ITaskThread[],
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
      throw new Error(`Failed to get threads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's assigned tasks
   */
  public async getUserTasks(
    userId: string,
    status?: TaskStatus
  ): Promise<ITaskThread[]> {
    try {
      return await TaskThread.findUserTasks(userId, status);
    } catch (error) {
      throw new Error(`Failed to get user tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update task status
   */
  public async updateTaskStatus(
    threadId: string,
    status: TaskStatus,
    userId?: string
  ): Promise<ITaskThread | null> {
    try {
      const thread = await TaskThread.findById(threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      const oldStatus = thread.taskDetails?.status;
      await thread.updateTaskStatus(status, userId);

      // Emit real-time event
      if (oldStatus && oldStatus !== status) {
        collaborationEventEmitter.emitTaskStatusChanged(
          threadId,
          thread.workspaceId.toString(),
          oldStatus,
          status,
          userId || 'system',
          'brand' // TODO: Determine from user context
        );
      }

      return thread;
    } catch (error) {
      throw new Error(`Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add comment to thread
   */
  public async addComment(
    threadId: string,
    commentData: IAddCommentInput
  ): Promise<ITaskThread | null> {
    try {
      const thread = await TaskThread.findById(threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      if (thread.isLocked) {
        throw new Error('Thread is locked and cannot accept new comments');
      }

      const comment = await thread.addComment(
        commentData.userId,
        commentData.userType,
        commentData.message
      );

      // Emit real-time event
      collaborationEventEmitter.emitTaskCommented(
        threadId,
        thread.workspaceId.toString(),
        comment,
        commentData.userId,
        commentData.userType
      );

      return thread;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add participant to thread
   */
  public async addParticipant(
    threadId: string,
    userId: string,
    userType: 'brand' | 'manufacturer',
    role: 'owner' | 'assignee' | 'viewer' | 'commenter' = 'commenter'
  ): Promise<ITaskThread | null> {
    try {
      const thread = await TaskThread.findById(threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      await thread.addParticipant(userId, userType, role);
      return thread;
    } catch (error) {
      throw new Error(`Failed to add participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve thread
   */
  public async resolveThread(
    threadId: string,
    resolvedBy: string
  ): Promise<ITaskThread | null> {
    try {
      const thread = await TaskThread.findById(threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      await thread.resolve(resolvedBy);

      // Emit real-time event
      collaborationEventEmitter.emitTaskResolved(
        threadId,
        thread.workspaceId.toString(),
        resolvedBy,
        'brand' // TODO: Determine from user context
      );

      return thread;
    } catch (error) {
      throw new Error(`Failed to resolve thread: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Toggle checklist item
   */
  public async toggleChecklistItem(
    threadId: string,
    itemId: string,
    userId: string
  ): Promise<ITaskThread | null> {
    try {
      const thread = await TaskThread.findById(threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      const item = thread.taskDetails?.checklist?.find((i: any) => i._id?.toString() === itemId);
      await thread.toggleChecklistItem(itemId, userId);

      // Emit real-time event
      if (item) {
        collaborationEventEmitter.emitChecklistItemToggled(
          threadId,
          thread.workspaceId.toString(),
          itemId,
          !item.completed, // Toggled state
          userId,
          'brand' // TODO: Determine from user context
        );
      }

      return thread;
    } catch (error) {
      throw new Error(`Failed to toggle checklist item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get overdue tasks
   */
  public async getOverdueTasks(workspaceId?: string): Promise<ITaskThread[]> {
    try {
      return await TaskThread.findOverdueTasks(workspaceId);
    } catch (error) {
      throw new Error(`Failed to get overdue tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get thread statistics
   */
  public async getThreadStats(workspaceId: string): Promise<any> {
    try {
      return await TaskThread.getThreadStats(workspaceId);
    } catch (error) {
      throw new Error(`Failed to get thread stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert thread to summary format
   */
  public toSummary(thread: ITaskThread): ITaskThreadSummary {
    return {
      id: thread._id.toString(),
      workspaceId: thread.workspaceId.toString(),
      threadType: thread.threadType,
      title: thread.title,
      description: thread.description,
      isResolved: thread.isResolved,
      isPinned: thread.isPinned,
      commentCount: thread.commentCount,
      participantCount: thread.participants.length,
      taskStatus: thread.taskDetails?.status,
      taskPriority: thread.taskDetails?.priority,
      taskDueDate: thread.taskDetails?.dueDate,
      isOverdue: thread.threadType === 'task' ? (thread as any).isOverdue : false,
      taskCompletionPercentage: thread.threadType === 'task' ? (thread as any).taskCompletionPercentage : undefined,
      assigneeCount: thread.taskDetails?.assignees.length,
      createdBy: {
        id: thread.createdBy.toString(),
        name: 'User', // TODO: Populate from user data
        email: 'user@example.com' // TODO: Populate from user data
      },
      lastActivityAt: thread.lastActivityAt,
      createdAt: thread.createdAt
    };
  }
}

// Export singleton instance
export const taskManagementService = new TaskManagementService();
