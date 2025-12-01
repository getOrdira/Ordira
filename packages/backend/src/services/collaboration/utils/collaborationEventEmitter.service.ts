// src/services/collaboration/utils/collaborationEventEmitter.service.ts

import {
  realTimeCollaborationService,
  CollaborationEventType
} from '../core/realTimeCollaboration.service';
import { IProductionUpdate } from '../../../models/collaboration/productionUpdate.model';
import { IFileAttachment } from '../../../models/collaboration/fileAttachment.model';
import { ITaskThread } from '../../../models/collaboration/taskThread.model';
import { IWorkspace } from '../../../models/collaboration/workspace.model';
import { logger } from '../../../utils/logger';

/**
 * Collaboration Event Emitter Service
 * Bridges business logic services with real-time WebSocket broadcasting
 */
export class CollaborationEventEmitterService {
  /**
   * Emit production update created event
   */
  public emitProductionUpdateCreated(
    update: IProductionUpdate,
    createdBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        update.workspaceId.toString(),
        CollaborationEventType.PRODUCTION_UPDATE_CREATED,
        {
          updateId: update._id.toString(),
          title: update.title,
          updateType: update.updateType,
          currentStatus: update.currentStatus,
          completionPercentage: update.completionPercentage,
          userId: createdBy,
          userType,
          createdAt: update.createdAt
        }
      );

      logger.info('Production update created event emitted', {
        updateId: update._id.toString(),
        workspaceId: update.workspaceId.toString()
      });
    } catch (error) {
      logger.error('Failed to emit production update created event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit production update viewed event
   */
  public emitProductionUpdateViewed(
    updateId: string,
    workspaceId: string,
    viewedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.PRODUCTION_UPDATE_VIEWED,
        {
          updateId,
          userId: viewedBy,
          userType,
          viewedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit production update viewed event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit production update commented event
   */
  public emitProductionUpdateCommented(
    updateId: string,
    workspaceId: string,
    comment: any,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.PRODUCTION_UPDATE_COMMENTED,
        {
          updateId,
          commentId: comment._id?.toString(),
          message: comment.message,
          userId,
          userType,
          createdAt: comment.createdAt
        }
      );
    } catch (error) {
      logger.error('Failed to emit production update commented event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit file uploaded event
   */
  public emitFileUploaded(
    file: IFileAttachment,
    uploadedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        file.workspaceId.toString(),
        CollaborationEventType.FILE_UPLOADED,
        {
          fileId: file._id.toString(),
          fileName: file.fileName,
          fileCategory: file.fileCategory,
          fileSize: file.fileSize,
          version: file.version,
          userId: uploadedBy,
          userType,
          uploadedAt: file.uploadedAt
        }
      );

      logger.info('File uploaded event emitted', {
        fileId: file._id.toString(),
        workspaceId: file.workspaceId.toString()
      });
    } catch (error) {
      logger.error('Failed to emit file uploaded event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit file new version created event
   */
  public emitFileVersionCreated(
    file: IFileAttachment,
    uploadedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        file.workspaceId.toString(),
        CollaborationEventType.FILE_VERSION_CREATED,
        {
          fileId: file._id.toString(),
          fileName: file.fileName,
          version: file.version,
          parentFileId: file.parentFileId?.toString(),
          userId: uploadedBy,
          userType,
          uploadedAt: file.uploadedAt
        }
      );
    } catch (error) {
      logger.error('Failed to emit file version created event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit file annotated event
   */
  public emitFileAnnotated(
    fileId: string,
    workspaceId: string,
    annotation: any,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.FILE_ANNOTATED,
        {
          fileId,
          annotationId: annotation._id?.toString(),
          type: annotation.type,
          content: annotation.content,
          userId,
          userType,
          createdAt: annotation.createdAt
        }
      );
    } catch (error) {
      logger.error('Failed to emit file annotated event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit file approved event
   */
  public emitFileApproved(
    fileId: string,
    workspaceId: string,
    approvedBy: string,
    userType: 'brand' | 'manufacturer',
    comments?: string
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.FILE_APPROVED,
        {
          fileId,
          userId: approvedBy,
          userType,
          comments,
          approvedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit file approved event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit file rejected event
   */
  public emitFileRejected(
    fileId: string,
    workspaceId: string,
    rejectedBy: string,
    userType: 'brand' | 'manufacturer',
    reason: string
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.FILE_REJECTED,
        {
          fileId,
          userId: rejectedBy,
          userType,
          reason,
          rejectedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit file rejected event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit file deleted event
   */
  public emitFileDeleted(
    fileId: string,
    workspaceId: string,
    deletedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.FILE_DELETED,
        {
          fileId,
          userId: deletedBy,
          userType,
          deletedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit file deleted event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit task created event
   */
  public emitTaskCreated(
    task: ITaskThread,
    createdBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        task.workspaceId.toString(),
        CollaborationEventType.TASK_CREATED,
        {
          taskId: task._id.toString(),
          threadType: task.threadType,
          title: task.title,
          status: task.taskDetails?.status,
          priority: task.taskDetails?.priority,
          assignees: task.taskDetails?.assignees.map(a => a.toString()),
          userId: createdBy,
          userType,
          createdAt: task.createdAt
        }
      );

      logger.info('Task created event emitted', {
        taskId: task._id.toString(),
        workspaceId: task.workspaceId.toString()
      });
    } catch (error) {
      logger.error('Failed to emit task created event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit task updated event
   */
  public emitTaskUpdated(
    taskId: string,
    workspaceId: string,
    updates: any,
    updatedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.TASK_UPDATED,
        {
          taskId,
          updates,
          userId: updatedBy,
          userType,
          updatedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit task updated event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit task assigned event
   */
  public emitTaskAssigned(
    taskId: string,
    workspaceId: string,
    assigneeId: string,
    assignedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      // Broadcast to workspace
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.TASK_ASSIGNED,
        {
          taskId,
          assigneeId,
          userId: assignedBy,
          userType,
          assignedAt: new Date()
        }
      );

      // Also notify the assignee directly
      realTimeCollaborationService.broadcastToUser(
        assigneeId,
        CollaborationEventType.TASK_ASSIGNED,
        {
          taskId,
          workspaceId,
          userId: assignedBy,
          userType,
          assignedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit task assigned event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit task commented event
   */
  public emitTaskCommented(
    taskId: string,
    workspaceId: string,
    comment: any,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.TASK_COMMENTED,
        {
          taskId,
          commentId: comment._id?.toString(),
          message: comment.message,
          userId,
          userType,
          createdAt: comment.createdAt
        }
      );
    } catch (error) {
      logger.error('Failed to emit task commented event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit task resolved event
   */
  public emitTaskResolved(
    taskId: string,
    workspaceId: string,
    resolvedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.TASK_RESOLVED,
        {
          taskId,
          userId: resolvedBy,
          userType,
          resolvedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit task resolved event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit task status changed event
   */
  public emitTaskStatusChanged(
    taskId: string,
    workspaceId: string,
    oldStatus: string,
    newStatus: string,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.TASK_STATUS_CHANGED,
        {
          taskId,
          oldStatus,
          newStatus,
          userId,
          userType,
          changedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit task status changed event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit checklist item toggled event
   */
  public emitChecklistItemToggled(
    taskId: string,
    workspaceId: string,
    itemId: string,
    completed: boolean,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.CHECKLIST_ITEM_TOGGLED,
        {
          taskId,
          itemId,
          completed,
          userId,
          userType,
          toggledAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit checklist item toggled event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit workspace member joined event
   */
  public emitWorkspaceMemberJoined(
    workspaceId: string,
    memberId: string,
    memberType: 'brand' | 'manufacturer',
    role: string,
    addedBy: string
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.WORKSPACE_MEMBER_JOINED,
        {
          memberId,
          memberType,
          role,
          userId: addedBy,
          userType: memberType,
          joinedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit workspace member joined event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit workspace member left event
   */
  public emitWorkspaceMemberLeft(
    workspaceId: string,
    memberId: string,
    memberType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.WORKSPACE_MEMBER_LEFT,
        {
          memberId,
          memberType,
          userId: memberId,
          userType: memberType,
          leftAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit workspace member left event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit workspace updated event
   */
  public emitWorkspaceUpdated(
    workspaceId: string,
    updates: any,
    updatedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.WORKSPACE_UPDATED,
        {
          updates,
          userId: updatedBy,
          userType,
          updatedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit workspace updated event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit workspace archived event
   */
  public emitWorkspaceArchived(
    workspaceId: string,
    archivedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToWorkspace(
        workspaceId,
        CollaborationEventType.WORKSPACE_ARCHIVED,
        {
          userId: archivedBy,
          userType,
          archivedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit workspace archived event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==================
  // MESSAGING EVENTS
  // ==================

  /**
   * Emit message sent event
   */
  public emitMessageSent(
    conversationId: string,
    message: any,
    excludeSenderId?: string
  ): void {
    try {
      realTimeCollaborationService.broadcastMessage(
        conversationId,
        message,
        excludeSenderId
      );

      logger.info('Message sent event emitted', {
        messageId: message.messageId,
        conversationId
      });
    } catch (error) {
      logger.error('Failed to emit message sent event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit message edited event
   */
  public emitMessageEdited(
    conversationId: string,
    messageId: string,
    userId: string,
    userType: 'brand' | 'manufacturer',
    newText: string
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.MESSAGE_EDITED,
        {
          messageId,
          userId,
          userType,
          newText,
          editedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit message edited event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit message deleted event
   */
  public emitMessageDeleted(
    conversationId: string,
    messageId: string,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.MESSAGE_DELETED,
        {
          messageId,
          userId,
          userType,
          deletedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit message deleted event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit message read event
   */
  public emitMessageRead(
    conversationId: string,
    messageId: string,
    userId: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.MESSAGE_READ,
        {
          messageId,
          userId,
          userType,
          readAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit message read event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit message reaction added event
   */
  public emitMessageReactionAdded(
    conversationId: string,
    messageId: string,
    userId: string,
    userType: 'brand' | 'manufacturer',
    emoji: string
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.MESSAGE_REACTION_ADDED,
        {
          messageId,
          userId,
          userType,
          emoji,
          createdAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit message reaction added event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit message reaction removed event
   */
  public emitMessageReactionRemoved(
    conversationId: string,
    messageId: string,
    userId: string,
    userType: 'brand' | 'manufacturer',
    emoji: string
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.MESSAGE_REACTION_REMOVED,
        {
          messageId,
          userId,
          userType,
          emoji,
          removedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit message reaction removed event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit conversation created event
   */
  public emitConversationCreated(
    conversationId: string,
    conversation: any,
    createdBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      // Notify the creator
      realTimeCollaborationService.broadcastToUser(
        createdBy,
        CollaborationEventType.CONVERSATION_CREATED,
        {
          conversationId,
          conversation,
          userId: createdBy,
          userType,
          createdAt: new Date()
        }
      );

      // Notify other participants
      for (const participant of conversation.participants || []) {
        if (participant.userId.toString() !== createdBy) {
          realTimeCollaborationService.broadcastToUser(
            participant.userId.toString(),
            CollaborationEventType.CONVERSATION_CREATED,
            {
              conversationId,
              conversation,
              userId: createdBy,
              userType,
              createdAt: new Date()
            }
          );
        }
      }

      logger.info('Conversation created event emitted', {
        conversationId
      });
    } catch (error) {
      logger.error('Failed to emit conversation created event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit conversation updated event
   */
  public emitConversationUpdated(
    conversationId: string,
    updates: any,
    updatedBy: string,
    userType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.CONVERSATION_UPDATED,
        {
          updates,
          userId: updatedBy,
          userType,
          updatedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit conversation updated event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit conversation participant added event
   */
  public emitConversationParticipantAdded(
    conversationId: string,
    participantId: string,
    participantType: 'brand' | 'manufacturer',
    addedBy: string,
    addedByType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.CONVERSATION_PARTICIPANT_ADDED,
        {
          participantId,
          participantType,
          userId: addedBy,
          userType: addedByType,
          addedAt: new Date()
        }
      );

      // Also notify the new participant
      realTimeCollaborationService.broadcastToUser(
        participantId,
        CollaborationEventType.CONVERSATION_PARTICIPANT_ADDED,
        {
          conversationId,
          participantId,
          participantType,
          userId: addedBy,
          userType: addedByType,
          addedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit conversation participant added event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit conversation participant removed event
   */
  public emitConversationParticipantRemoved(
    conversationId: string,
    participantId: string,
    removedBy: string,
    removedByType: 'brand' | 'manufacturer'
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.CONVERSATION_PARTICIPANT_REMOVED,
        {
          participantId,
          userId: removedBy,
          userType: removedByType,
          removedAt: new Date()
        }
      );

      // Also notify the removed participant
      realTimeCollaborationService.broadcastToUser(
        participantId,
        CollaborationEventType.CONVERSATION_PARTICIPANT_REMOVED,
        {
          conversationId,
          participantId,
          userId: removedBy,
          userType: removedByType,
          removedAt: new Date()
        }
      );
    } catch (error) {
      logger.error('Failed to emit conversation participant removed event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Emit typing indicator for messaging
   */
  public emitMessageTyping(
    conversationId: string,
    userId: string,
    userType: 'brand' | 'manufacturer',
    isTyping: boolean
  ): void {
    try {
      realTimeCollaborationService.broadcastToConversation(
        conversationId,
        CollaborationEventType.MESSAGE_TYPING,
        {
          userId,
          userType,
          isTyping
        }
      );
    } catch (error) {
      logger.error('Failed to emit message typing event', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const collaborationEventEmitter = new CollaborationEventEmitterService();
