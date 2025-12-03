// src/models/collaboration/types.ts

import { Types } from 'mongoose';
import { IWorkspace } from './workspace.model';
import { IProductionUpdate } from './productionUpdate.model';
import { IFileAttachment } from './fileAttachment.model';
import { ITaskThread } from './taskThread.model';

/**
 * Collaboration Feature Keys
 * Maps to plan-based features in subscription model
 */
export type CollaborationFeatureKey =
  | 'fileSharing'
  | 'realTimeUpdates'
  | 'taskManagement'
  | 'designReview'
  | 'supplyChainTracking'
  | 'videoUpdates'
  | 'automatedNotifications';

/**
 * User Type in Collaboration Context
 */
export type CollaborationUserType = 'brand' | 'manufacturer';

/**
 * Workspace Member Role
 */
export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Thread Type
 */
export type ThreadType = 'task' | 'discussion' | 'approval' | 'question';

/**
 * Task Status
 */
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled';

/**
 * Task Priority
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Approval Status
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes';

/**
 * File Category
 */
export type FileCategory =
  | 'design'
  | 'technical_spec'
  | 'sample_photo'
  | 'production_photo'
  | 'contract'
  | 'certificate'
  | 'other';

/**
 * Production Update Type
 */
export type ProductionUpdateType = 'status' | 'milestone' | 'delay' | 'quality' | 'general';

/**
 * Delay Severity
 */
export type DelaySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Feature Access Check Result
 */
export interface IFeatureAccessCheck {
  hasAccess: boolean;
  reason?: string;
  brandPlanTier?: string;
  manufacturerPlanTier?: string;
  requiredTier?: string;
  blockedBy?: 'brand' | 'manufacturer' | 'connection';
}

/**
 * Workspace Creation Input
 */
export interface ICreateWorkspaceInput {
  name: string;
  description?: string;
  brandId: string;
  manufacturerId: string;
  type: 'production_run' | 'design_collaboration' | 'general';
  createdBy: string;
  brandMembers?: Array<{
    userId: string;
    role: WorkspaceMemberRole;
  }>;
  manufacturerMembers?: Array<{
    userId: string;
    role: WorkspaceMemberRole;
  }>;
  productionDetails?: {
    productName?: string;
    quantity?: number;
    targetDeliveryDate?: Date;
    productionStartDate?: Date;
  };
  /**
   * Optional: Override enabled features for the workspace.
   * If provided, these will be used instead of subscription-based features.
   * Useful for testing or admin-created workspaces.
   */
  enabledFeatures?: Partial<Record<CollaborationFeatureKey, boolean>>;
}

/**
 * Production Update Creation Input
 */
export interface ICreateProductionUpdateInput {
  workspaceId: string;
  manufacturerId: string;
  createdBy: string;
  title: string;
  message: string;
  updateType: ProductionUpdateType;
  currentStatus?: string;
  completionPercentage?: number;
  milestoneReached?: {
    name: string;
    targetDate: Date;
    actualDate: Date;
  };
  delayInfo?: {
    reason: string;
    estimatedDelay: number;
    newEstimatedDelivery: Date;
    actionPlan?: string;
    severity: DelaySeverity;
  };
  photos?: Array<{
    url: string;
    s3Key: string;
    caption?: string;
  }>;
  videos?: Array<{
    url: string;
    s3Key: string;
    caption?: string;
    duration?: number;
    thumbnail?: string;
  }>;
  recipientIds?: string[];
}

/**
 * File Upload Input
 */
export interface IFileUploadInput {
  workspaceId: string;
  uploadedBy: string;
  fileName: string;
  fileCategory: FileCategory;
  s3Key: string;
  s3Url: string;
  s3Bucket?: string;
  s3Region?: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  tags?: string[];
  designMetadata?: {
    dimensions?: string;
    colorProfile?: string;
    software?: string;
    fileVersion?: string;
  };
  requiresApproval?: boolean;
}

/**
 * Task Thread Creation Input
 */
export interface ICreateTaskThreadInput {
  workspaceId: string;
  createdBy: string;
  threadType: ThreadType;
  title: string;
  description?: string;
  taskDetails?: {
    assignees: string[];
    dueDate?: Date;
    priority: TaskPriority;
    estimatedHours?: number;
    tags?: string[];
    checklist?: Array<{
      text: string;
    }>;
  };
  relatedEntities?: Array<{
    entityType: 'file' | 'update' | 'workspace' | 'task';
    entityId: string;
  }>;
  visibleToBrand?: boolean;
  visibleToManufacturer?: boolean;
}

/**
 * Comment Input
 */
export interface IAddCommentInput {
  userId: string;
  userType: CollaborationUserType;
  message: string;
}

/**
 * Annotation Input
 */
export interface IAddAnnotationInput {
  userId: string;
  userType: CollaborationUserType;
  coordinates: {
    x: number;
    y: number;
  };
  comment: string;
  category?: 'feedback' | 'issue' | 'question' | 'approval';
}

/**
 * Workspace Summary for API Responses
 */
export interface IWorkspaceSummary {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  brandId: string;
  manufacturerId: string;
  type: string;
  status: string;
  totalMembers: number;
  activityCount: number;
  messageCount: number;
  fileCount: number;
  updateCount: number;
  lastActivity: Date;
  daysSinceActivity: number;
  enabledFeatures: {
    fileSharing: boolean;
    realTimeUpdates: boolean;
    taskManagement: boolean;
    designReview: boolean;
    supplyChainTracking: boolean;
    videoUpdates: boolean;
    automatedNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Production Update Summary
 */
export interface IProductionUpdateSummary {
  id: string;
  workspaceId: string;
  manufacturerId: string;
  title: string;
  message: string;
  updateType: ProductionUpdateType;
  currentStatus?: string;
  completionPercentage?: number;
  photoCount: number;
  videoCount: number;
  viewCount: number;
  commentCount: number;
  hasDelayInfo: boolean;
  hasMilestone: boolean;
  isViewed: boolean;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
}

/**
 * File Attachment Summary
 */
export interface IFileAttachmentSummary {
  id: string;
  workspaceId: string;
  fileName: string;
  fileCategory: FileCategory;
  fileSize: number;
  mimeType: string;
  s3Url: string;
  thumbnailUrl?: string;
  version: number;
  isLatestVersion: boolean;
  approvalStatus: ApprovalStatus;
  annotationCount: number;
  unresolvedAnnotationCount: number;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  uploadedAt: Date;
  tags: string[];
}

/**
 * Task Thread Summary
 */
export interface ITaskThreadSummary {
  id: string;
  workspaceId: string;
  threadType: ThreadType;
  title: string;
  description?: string;
  isResolved: boolean;
  isPinned: boolean;
  commentCount: number;
  participantCount: number;
  taskStatus?: TaskStatus;
  taskPriority?: TaskPriority;
  taskDueDate?: Date;
  isOverdue?: boolean;
  taskCompletionPercentage?: number;
  assigneeCount?: number;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  lastActivityAt: Date;
  createdAt: Date;
}

/**
 * Workspace Activity Event
 * For real-time updates and activity feeds
 */
export interface IWorkspaceActivity {
  id: string;
  workspaceId: string;
  activityType:
    | 'workspace_created'
    | 'member_added'
    | 'member_removed'
    | 'update_posted'
    | 'file_uploaded'
    | 'file_approved'
    | 'file_rejected'
    | 'task_created'
    | 'task_assigned'
    | 'task_completed'
    | 'comment_added'
    | 'annotation_added'
    | 'milestone_reached'
    | 'delay_reported';
  performedBy: {
    id: string;
    name: string;
    userType: CollaborationUserType;
  };
  entityType?: 'workspace' | 'update' | 'file' | 'task' | 'comment';
  entityId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Notification Payload
 */
export interface ICollaborationNotification {
  recipientId: string;
  workspaceId: string;
  notificationType:
    | 'new_update'
    | 'new_comment'
    | 'task_assigned'
    | 'file_approved'
    | 'file_rejected'
    | 'milestone_reached'
    | 'delay_alert'
    | 'mention'
    | 'approval_requested';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Workspace Analytics
 */
export interface IWorkspaceAnalytics {
  workspaceId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalUpdates: number;
    totalFiles: number;
    totalTasks: number;
    totalComments: number;
    activeMembers: number;
    averageResponseTime: number; // hours
    onTimeDeliveryRate: number; // percentage
    tasksCompleted: number;
    tasksOverdue: number;
  };
  trends: {
    updatesPerWeek: number[];
    filesPerWeek: number[];
    tasksPerWeek: number[];
  };
}

/**
 * Collaboration Permission Context
 * Used for access control checks
 */
export interface ICollaborationPermissionContext {
  userId: string;
  userType: CollaborationUserType;
  workspaceId: string;
  brandId: string;
  manufacturerId: string;
  brandPlanTier: string;
  manufacturerPlanTier: string;
  isConnected: boolean;
  workspaceRole?: WorkspaceMemberRole;
}

/**
 * File Version Comparison
 */
export interface IFileVersionComparison {
  currentVersion: {
    version: number;
    uploadedAt: Date;
    uploadedBy: string;
    fileSize: number;
  };
  previousVersion?: {
    version: number;
    uploadedAt: Date;
    uploadedBy: string;
    fileSize: number;
  };
  changes: {
    sizeChange: number; // bytes
    timeElapsed: number; // hours
  };
}

/**
 * Bulk Operation Result
 */
export interface IBulkOperationResult<T = any> {
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
    data?: T;
  }>;
}

/**
 * Pagination Options
 */
export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Response
 */
export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Filter Options for Queries
 */
export interface IWorkspaceFilterOptions extends IPaginationOptions {
  status?: 'active' | 'archived' | 'completed' | 'cancelled';
  type?: 'production_run' | 'design_collaboration' | 'general';
  brandId?: string;
  manufacturerId?: string;
  searchQuery?: string;
}

export interface IProductionUpdateFilterOptions extends IPaginationOptions {
  workspaceId?: string;
  manufacturerId?: string;
  updateType?: ProductionUpdateType;
  unviewedOnly?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface IFileFilterOptions extends IPaginationOptions {
  workspaceId?: string;
  fileCategory?: FileCategory;
  approvalStatus?: ApprovalStatus;
  uploadedBy?: string;
  tags?: string[];
  latestVersionsOnly?: boolean;
  excludeDeleted?: boolean;
}

export interface ITaskFilterOptions extends IPaginationOptions {
  workspaceId?: string;
  threadType?: ThreadType;
  assignedTo?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  isResolved?: boolean;
  overdueOnly?: boolean;
  dueDateFrom?: Date;
  dueDateTo?: Date;
}

/**
 * Export all model interfaces for convenience
 */
export type {
  IWorkspace,
  IProductionUpdate,
  IFileAttachment,
  ITaskThread
};
