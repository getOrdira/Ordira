// src/services/collaboration/features/fileManagement.service.ts

import { Types } from 'mongoose';
import { FileAttachment, IFileAttachment } from '../../../models/collaboration/fileAttachment.model';
import { Workspace } from '../../../models/collaboration/workspace.model';
import {
  IFileUploadInput,
  IFileFilterOptions,
  IPaginatedResponse,
  IFileAttachmentSummary,
  IAddAnnotationInput,
  ApprovalStatus,
  FileCategory
} from '../../../models/collaboration/types';
import { Business } from '../../../models/core/business.model';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { collaborationEventEmitter } from '../utils/collaborationEventEmitter.service';

/**
 * File Management Service
 * Handles file uploads, versioning, approvals, and annotations
 */
export class FileManagementService {
  /**
   * Upload a new file to workspace
   */
  public async uploadFile(input: IFileUploadInput): Promise<IFileAttachment> {
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

      // Check if workspace has fileSharing feature enabled
      if (!workspace.enabledFeatures.fileSharing) {
        throw new Error('File sharing feature not enabled for this workspace');
      }

      // Create file record
      const file = await FileAttachment.create({
        workspaceId: workspaceObjectId,
        uploadedBy: new Types.ObjectId(input.uploadedBy),
        uploaderType: 'brand', // TODO: Determine from user context
        fileName: input.fileName,
        fileCategory: input.fileCategory,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        s3Key: input.s3Key,
        s3Url: input.s3Url,
        description: input.description,
        tags: input.tags || [],
        version: 1,
        isLatestVersion: true,
        designMetadata: input.designMetadata,
        approvalStatus: input.requiresApproval ? 'pending' : 'approved',
        approvalHistory: [],
        annotations: [],
        versionHistory: [],
        uploadedAt: new Date(),
        lastModifiedAt: new Date()
      });

      // Update workspace file count
      workspace.fileCount += 1;
      workspace.lastActivity = new Date();
      await workspace.save();

      // Emit real-time event
      collaborationEventEmitter.emitFileUploaded(
        file,
        input.uploadedBy,
        'brand' // TODO: Determine from user context
      );

      return file;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file by ID
   */
  public async getFileById(fileId: string): Promise<IFileAttachment | null> {
    try {
      return await FileAttachment.findById(fileId)
        .populate('uploadedBy', 'name email');
    } catch (error) {
      throw new Error(`Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get files for a workspace
   */
  public async getWorkspaceFiles(
    workspaceId: string,
    options?: { category?: string; latestOnly?: boolean; limit?: number }
  ): Promise<IFileAttachment[]> {
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

      const query: any = {
        workspaceId: workspaceObjectId,
        deletedAt: null
      };

      if (options?.category) {
        query.fileCategory = options.category;
      }

      if (options?.latestOnly) {
        query.isLatestVersion = true;
      }

      return await FileAttachment.find(query)
        .sort({ uploadedAt: -1 })
        .limit(options?.limit || 50)
        .populate('uploadedBy', 'name email');
    } catch (error) {
      throw new Error(`Failed to get workspace files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get files with filtering and pagination
   */
  public async getFiles(
    filter: IFileFilterOptions
  ): Promise<IPaginatedResponse<IFileAttachment>> {
    try {
      const query: any = {};

      // Apply filters
      if (filter.workspaceId) query.workspaceId = new Types.ObjectId(filter.workspaceId);
      if (filter.fileCategory) query.fileCategory = filter.fileCategory;
      if (filter.approvalStatus) query.approvalStatus = filter.approvalStatus;
      if (filter.uploadedBy) query.uploadedBy = new Types.ObjectId(filter.uploadedBy);

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        query.tags = { $in: filter.tags };
      }

      // Latest versions only
      if (filter.latestVersionsOnly) {
        query.isLatestVersion = true;
      }

      // Exclude deleted
      if (filter.excludeDeleted) {
        query.deletedAt = null;
      }

      // Pagination
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const sortField = filter.sortBy || 'uploadedAt';
      const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
      const sort: any = { [sortField]: sortOrder };

      // Execute queries
      const [data, total] = await Promise.all([
        FileAttachment.find(query)
          .sort(sort)
          .limit(limit)
          .skip(skip)
          .populate('uploadedBy', 'name email')
          .lean(),
        FileAttachment.countDocuments(query)
      ]);

      return {
        data: data as IFileAttachment[],
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
      throw new Error(`Failed to get files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create new version of a file
   */
  public async createNewVersion(
    parentFileId: string,
    input: Omit<IFileUploadInput, 'workspaceId'>
  ): Promise<IFileAttachment> {
    try {
      const parentFile = await FileAttachment.findById(parentFileId);

      if (!parentFile) {
        throw new Error('Parent file not found');
      }

      // Mark parent as not latest
      parentFile.isLatestVersion = false;
      await parentFile.save();

      // Create new version
      const newVersion = await FileAttachment.create({
        workspaceId: parentFile.workspaceId,
        uploadedBy: new Types.ObjectId(input.uploadedBy),
        uploaderType: 'brand', // TODO: Determine from user context
        fileName: input.fileName,
        fileCategory: input.fileCategory,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        s3Key: input.s3Key,
        s3Url: input.s3Url,
        description: input.description,
        tags: input.tags || parentFile.tags,
        version: parentFile.version + 1,
        isLatestVersion: true,
        parentFileId: parentFile._id,
        designMetadata: input.designMetadata || parentFile.designMetadata,
        approvalStatus: input.requiresApproval ? 'pending' : 'approved',
        approvalHistory: [],
        annotations: [],
        versionHistory: [{
          version: parentFile.version,
          fileId: parentFile._id,
          uploadedAt: parentFile.uploadedAt,
          uploadedBy: parentFile.uploadedBy,
          changeDescription: 'Previous version'
        }],
        uploadedAt: new Date(),
        lastModifiedAt: new Date()
      });

      // Emit real-time event
      collaborationEventEmitter.emitFileVersionCreated(
        newVersion,
        input.uploadedBy,
        'brand' // TODO: Determine from user context
      );

      return newVersion;
    } catch (error) {
      throw new Error(`Failed to create new version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add annotation to file
   */
  public async addAnnotation(
    fileId: string,
    annotationData: IAddAnnotationInput
  ): Promise<IFileAttachment | null> {
    try {
      const file = await FileAttachment.findById(fileId);

      if (!file) {
        throw new Error('File not found');
      }

      // Map category to annotation type (default to 'comment' if not provided)
      const annotationTypeMap: Record<string, 'comment' | 'dimension' | 'revision' | 'highlight'> = {
        feedback: 'comment',
        issue: 'revision',
        question: 'comment',
        approval: 'comment'
      };

      const annotation = await file.addAnnotation({
        createdBy: new Types.ObjectId(annotationData.userId),
        creatorType: annotationData.userType,
        position: annotationData.coordinates,
        type: annotationData.category ? annotationTypeMap[annotationData.category] || 'comment' : 'comment',
        content: annotationData.comment
      });

      // Emit real-time event
      collaborationEventEmitter.emitFileAnnotated(
        fileId,
        file.workspaceId.toString(),
        annotation,
        annotationData.userId,
        annotationData.userType
      );

      return file;
    } catch (error) {
      throw new Error(`Failed to add annotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve annotation
   */
  public async resolveAnnotation(
    fileId: string,
    annotationId: string,
    resolvedBy: string
  ): Promise<IFileAttachment | null> {
    try {
      const file = await FileAttachment.findById(fileId);

      if (!file) {
        throw new Error('File not found');
      }

      await file.resolveAnnotation(annotationId, resolvedBy);
      return file;
    } catch (error) {
      throw new Error(`Failed to resolve annotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Approve file
   */
  public async approveFile(
    fileId: string,
    approvedBy: string,
    approverType: 'brand' | 'manufacturer',
    comments?: string
  ): Promise<IFileAttachment | null> {
    try {
      const file = await FileAttachment.findById(fileId);

      if (!file) {
        throw new Error('File not found');
      }

      await file.approve(approvedBy, approverType, comments);

      // Emit real-time event
      collaborationEventEmitter.emitFileApproved(
        fileId,
        file.workspaceId.toString(),
        approvedBy,
        approverType,
        comments
      );

      return file;
    } catch (error) {
      throw new Error(`Failed to approve file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reject file
   */
  public async rejectFile(
    fileId: string,
    rejectedBy: string,
    rejectorType: 'brand' | 'manufacturer',
    reason: string
  ): Promise<IFileAttachment | null> {
    try {
      const file = await FileAttachment.findById(fileId);

      if (!file) {
        throw new Error('File not found');
      }

      await file.reject(rejectedBy, rejectorType, reason);

      // Emit real-time event
      collaborationEventEmitter.emitFileRejected(
        fileId,
        file.workspaceId.toString(),
        rejectedBy,
        rejectorType,
        reason
      );

      return file;
    } catch (error) {
      throw new Error(`Failed to reject file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Soft delete file
   */
  public async deleteFile(
    fileId: string,
    deletedBy: string
  ): Promise<IFileAttachment | null> {
    try {
      const file = await FileAttachment.findById(fileId);

      if (!file) {
        throw new Error('File not found');
      }

      await file.softDelete(deletedBy);

      // Decrement workspace file count
      const workspace = await Workspace.findById(file.workspaceId);
      if (workspace && workspace.fileCount > 0) {
        workspace.fileCount -= 1;
        await workspace.save();
      }

      // Emit real-time event
      collaborationEventEmitter.emitFileDeleted(
        fileId,
        file.workspaceId.toString(),
        deletedBy,
        'brand' // TODO: Determine from user context
      );

      return file;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pending approvals for workspace
   */
  public async getPendingApprovals(workspaceId: string): Promise<IFileAttachment[]> {
    try {
      return await FileAttachment.getPendingApprovals(workspaceId);
    } catch (error) {
      throw new Error(`Failed to get pending approvals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file statistics
   */
  public async getFileStats(workspaceId: string): Promise<any> {
    try {
      return await FileAttachment.getFileStats(workspaceId);
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert file to summary format
   */
  public async toSummary(file: IFileAttachment): Promise<IFileAttachmentSummary> {
    const unresolvedAnnotations = file.annotations.filter(a => !a.resolvedAt);

    // Map model fileCategory to FileCategory type
    const categoryMap: Record<string, FileCategory> = {
      'design': 'design',
      'technical_drawing': 'technical_spec',
      'document': 'contract',
      'photo': 'sample_photo',
      'video': 'other',
      'other': 'other'
    };

    // Map approvalStatus
    const statusMap: Record<string, ApprovalStatus> = {
      'pending': 'pending',
      'approved': 'approved',
      'rejected': 'rejected',
      'revision_requested': 'needs_changes'
    };

    // Fetch uploader data (Business or Manufacturer based on uploaderType)
    let userName = 'Unknown';
    let userEmail = 'unknown@example.com';

    try {
      if (file.uploaderType === 'brand') {
        // Fetch Business (Brand) data
        const business = await Business.findById(file.uploadedBy)
          .select('businessName email contactEmail')
          .lean();
        
        if (business) {
          userName = business.businessName || 'Unknown Brand';
          userEmail = business.contactEmail || business.email || 'unknown@example.com';
        }
      } else if (file.uploaderType === 'manufacturer') {
        // Fetch Manufacturer data
        const manufacturer = await Manufacturer.findById(file.uploadedBy)
          .select('name email contactEmail')
          .lean();
        
        if (manufacturer) {
          userName = manufacturer.name || 'Unknown Manufacturer';
          userEmail = manufacturer.contactEmail || manufacturer.email || 'unknown@example.com';
        }
      }
    } catch (error) {
      // If lookup fails, use defaults (already set above)
      // Log error in production but don't throw
      console.error('Failed to fetch uploader data for file summary:', error);
    }

    return {
      id: file._id.toString(),
      workspaceId: file.workspaceId.toString(),
      fileName: file.fileName,
      fileCategory: categoryMap[file.fileCategory] || 'other',
      fileSize: file.fileSize,
      mimeType: file.fileType, // Model uses fileType, not mimeType
      s3Url: file.s3Url,
      thumbnailUrl: file.designMetadata?.renderUrl, // Use renderUrl from designMetadata
      version: file.version,
      isLatestVersion: file.isLatestVersion,
      approvalStatus: statusMap[file.approvalStatus] || 'pending',
      annotationCount: file.annotations.length,
      unresolvedAnnotationCount: unresolvedAnnotations.length,
      uploadedBy: {
        id: file.uploadedBy.toString(),
        name: userName,
        email: userEmail
      },
      uploadedAt: file.uploadedAt,
      tags: file.tags
    };
  }
}

// Export singleton instance
export const fileManagementService = new FileManagementService();
