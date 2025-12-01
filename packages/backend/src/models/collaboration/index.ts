// src/models/collaboration/index.ts

/**
 * Collaboration Models Barrel Export
 *
 * This file exports all collaboration-related models and types
 * for the brand-manufacturer collaboration system.
 *
 * Features:
 * - Project Workspaces (Growth+, Professional+)
 * - Real-Time Production Updates (Professional+)
 * - Design File Management with version control (Growth+, Professional+)
 * - Task assignment and tracking
 * - Plan-based feature gating
 */

// ====================
// MODELS
// ====================

export { Workspace } from './workspace.model';
export { ProductionUpdate } from './productionUpdate.model';
export { FileAttachment } from './fileAttachment.model';
export { TaskThread } from './taskThread.model';

// ====================
// MODEL INTERFACES
// ====================

export type {
  IWorkspace,
  IWorkspaceMember,
  IProductionDetails,
  IEnabledFeatures,
  IWorkspaceModel
} from './workspace.model';

export type {
  IProductionUpdate,
  IPhotoAttachment,
  IVideoAttachment,
  IMilestoneReached,
  IDelayInfo,
  IUpdateViewer,
  IUpdateComment,
  IProductionUpdateModel
} from './productionUpdate.model';

export type {
  IFileAttachment,
  IVersionHistoryEntry,
  IDesignMetadata,
  IApprovalHistoryEntry,
  IAnnotation,
  IFileAttachmentModel
} from './fileAttachment.model';

export type {
  ITaskThread,
  IChecklistItem,
  ICommentReaction,
  IThreadComment,
  IThreadParticipant,
  IRelatedEntity,
  ITaskDetails,
  ITaskThreadModel
} from './taskThread.model';

// ====================
// TYPES & INTERFACES
// ====================

export type {
  // Feature & Access Types
  CollaborationFeatureKey,
  CollaborationUserType,
  WorkspaceMemberRole,
  ThreadType,
  TaskStatus,
  TaskPriority,
  ApprovalStatus,
  FileCategory,
  ProductionUpdateType,
  DelaySeverity,
  IFeatureAccessCheck,

  // Input Types
  ICreateWorkspaceInput,
  ICreateProductionUpdateInput,
  IFileUploadInput,
  ICreateTaskThreadInput,
  IAddCommentInput,
  IAddAnnotationInput,

  // Summary Types
  IWorkspaceSummary,
  IProductionUpdateSummary,
  IFileAttachmentSummary,
  ITaskThreadSummary,

  // Activity & Notifications
  IWorkspaceActivity,
  ICollaborationNotification,

  // Analytics & Metrics
  IWorkspaceAnalytics,

  // Permissions & Access Control
  ICollaborationPermissionContext,

  // Utilities
  IFileVersionComparison,
  IBulkOperationResult,
  IPaginationOptions,
  IPaginatedResponse,

  // Filter Options
  IWorkspaceFilterOptions,
  IProductionUpdateFilterOptions,
  IFileFilterOptions,
  ITaskFilterOptions
} from './types';

// ====================
// RE-EXPORTS FOR CONVENIENCE
// ====================

// Re-export commonly used interfaces for easier imports
export type {
  IWorkspace as WorkspaceDocument,
  IProductionUpdate as ProductionUpdateDocument,
  IFileAttachment as FileAttachmentDocument,
  ITaskThread as TaskThreadDocument
} from './types';
