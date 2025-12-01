// src/controllers/features/collaboration/collaborationFile.controller.ts
// Controller for file management operations

import { Response, NextFunction } from 'express';
import { CollaborationBaseController, CollaborationRequest } from './collaborationBase.controller';
import { Types } from 'mongoose';

interface FileQuery {
  workspaceId?: string;
  category?: string;
  approvalStatus?: string;
  latestOnly?: boolean;
  uploadedBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
}

interface FileRequest extends CollaborationRequest {
  validatedQuery?: FileQuery;
  validatedParams?: { workspaceId?: string; fileId?: string; annotationId?: string };
  validatedBody?: any;
}

/**
 * CollaborationFileController handles file upload, versioning, and approval operations.
 */
export class CollaborationFileController extends CollaborationBaseController {
  /**
   * Upload a new file to workspace.
   */
  async uploadFile(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'UPLOAD_FILE');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const input = {
          workspaceId,
          uploadedBy: userId,
          fileName: req.validatedBody?.fileName,
          fileCategory: req.validatedBody?.fileCategory,
          fileSize: req.validatedBody?.fileSize,
          mimeType: req.validatedBody?.mimeType,
          s3Key: req.validatedBody?.s3Key,
          s3Url: req.validatedBody?.s3Url,
          description: req.validatedBody?.description,
          tags: req.validatedBody?.tags || [],
          requiresApproval: req.validatedBody?.requiresApproval || false,
          designMetadata: req.validatedBody?.designMetadata,
        };

        const file = await this.collaborationServices.features.fileManagement.uploadFile(input);

        this.logAction(req, 'UPLOAD_FILE_SUCCESS', {
          fileId: file._id.toString(),
          workspaceId,
        });

        return { file };
      });
    }, res, 'File uploaded successfully', this.getRequestMeta(req));
  }

  /**
   * Get file by ID.
   */
  async getFileById(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_FILE_BY_ID');

        const fileId = req.validatedParams?.fileId;
        if (!fileId) {
          throw { statusCode: 400, message: 'File ID is required' };
        }

        const file = await this.collaborationServices.features.fileManagement.getFileById(fileId);

        if (!file) {
          throw { statusCode: 404, message: 'File not found' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, file.workspaceId.toString(), userId, userType);

        this.logAction(req, 'GET_FILE_BY_ID_SUCCESS', {
          fileId,
        });

        return { file };
      });
    }, res, 'File retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get files for a workspace.
   */
  async getWorkspaceFiles(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_WORKSPACE_FILES');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const query = req.validatedQuery || {};
        const latestOnlyValue = typeof query.latestOnly === 'boolean'
          ? query.latestOnly
          : query.latestOnly === 'true';
        const options = {
          category: query.category,
          latestOnly: latestOnlyValue,
          limit: query.limit ? parseInt(query.limit.toString()) : undefined,
        };

        const files = await this.collaborationServices.features.fileManagement.getWorkspaceFiles(
          workspaceId,
          options
        );

        this.logAction(req, 'GET_WORKSPACE_FILES_SUCCESS', {
          workspaceId,
          count: files.length,
        });

        return { files };
      });
    }, res, 'Workspace files retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get files with filtering and pagination.
   */
  async getFiles(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_FILES');

        const query = req.validatedQuery || {};
        const latestOnlyValue = typeof query.latestOnly === 'boolean'
          ? query.latestOnly
          : query.latestOnly === 'true';
        const filter = {
          workspaceId: query.workspaceId,
          fileCategory: query.category as 'design' | 'technical_spec' | 'sample_photo' | 'production_photo' | 'contract' | 'certificate' | 'other' | undefined,
          approvalStatus: query.approvalStatus as 'pending' | 'approved' | 'rejected' | 'needs_changes' | undefined,
          uploadedBy: query.uploadedBy,
          tags: query.tags,
          latestVersionsOnly: latestOnlyValue,
          excludeDeleted: true,
          page: query.page || 1,
          limit: query.limit || 20,
          sortBy: query.sortBy || 'uploadedAt',
          sortOrder: query.sortOrder || 'desc',
        };

        const result = await this.collaborationServices.features.fileManagement.getFiles(filter);

        this.logAction(req, 'GET_FILES_SUCCESS', {
          count: result.data.length,
        });

        return {
          files: result.data,
          pagination: result.pagination,
        };
      });
    }, res, 'Files retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Create new version of a file.
   */
  async createNewVersion(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'CREATE_FILE_VERSION');

        const fileId = req.validatedParams?.fileId;
        if (!fileId) {
          throw { statusCode: 400, message: 'File ID is required' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Get parent file to check workspace access
        const parentFile = await this.collaborationServices.features.fileManagement.getFileById(fileId);
        if (!parentFile) {
          throw { statusCode: 404, message: 'Parent file not found' };
        }

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, parentFile.workspaceId.toString(), userId, userType);

        const input = {
          uploadedBy: userId,
          fileName: req.validatedBody?.fileName,
          fileCategory: req.validatedBody?.fileCategory,
          fileSize: req.validatedBody?.fileSize,
          mimeType: req.validatedBody?.mimeType,
          s3Key: req.validatedBody?.s3Key,
          s3Url: req.validatedBody?.s3Url,
          description: req.validatedBody?.description,
          tags: req.validatedBody?.tags,
          requiresApproval: req.validatedBody?.requiresApproval || false,
          designMetadata: req.validatedBody?.designMetadata,
        };

        const newVersion = await this.collaborationServices.features.fileManagement.createNewVersion(
          fileId,
          input
        );

        this.logAction(req, 'CREATE_FILE_VERSION_SUCCESS', {
          fileId,
          newVersionId: newVersion._id.toString(),
        });

        return { file: newVersion };
      });
    }, res, 'File version created successfully', this.getRequestMeta(req));
  }

  /**
   * Add annotation to file.
   */
  async addAnnotation(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'ADD_FILE_ANNOTATION');

        const fileId = req.validatedParams?.fileId;
        if (!fileId) {
          throw { statusCode: 400, message: 'File ID is required' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Get file to check workspace access
        const file = await this.collaborationServices.features.fileManagement.getFileById(fileId);
        if (!file) {
          throw { statusCode: 404, message: 'File not found' };
        }

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, file.workspaceId.toString(), userId, userType);

        const annotationData = {
          userId,
          userType,
          coordinates: req.validatedBody?.coordinates || req.validatedBody?.position,
          comment: req.validatedBody?.comment || req.validatedBody?.content,
          category: req.validatedBody?.category,
        };

        const updatedFile = await this.collaborationServices.features.fileManagement.addAnnotation(
          fileId,
          annotationData
        );

        this.logAction(req, 'ADD_FILE_ANNOTATION_SUCCESS', {
          fileId,
        });

        return { file: updatedFile };
      });
    }, res, 'Annotation added successfully', this.getRequestMeta(req));
  }

  /**
   * Resolve annotation.
   */
  async resolveAnnotation(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'RESOLVE_FILE_ANNOTATION');

        const fileId = req.validatedParams?.fileId;
        const annotationId = req.validatedParams?.annotationId || req.validatedBody?.annotationId;

        if (!fileId || !annotationId) {
          throw { statusCode: 400, message: 'File ID and annotation ID are required' };
        }

        const userId = this.resolveUserId(req);

        // Get file to check workspace access
        const file = await this.collaborationServices.features.fileManagement.getFileById(fileId);
        if (!file) {
          throw { statusCode: 404, message: 'File not found' };
        }

        const userType = this.resolveUserType(req);
        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, file.workspaceId.toString(), userId, userType);

        const updatedFile = await this.collaborationServices.features.fileManagement.resolveAnnotation(
          fileId,
          annotationId,
          userId
        );

        this.logAction(req, 'RESOLVE_FILE_ANNOTATION_SUCCESS', {
          fileId,
          annotationId,
        });

        return { file: updatedFile };
      });
    }, res, 'Annotation resolved successfully', this.getRequestMeta(req));
  }

  /**
   * Approve file.
   */
  async approveFile(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'APPROVE_FILE');

        const fileId = req.validatedParams?.fileId;
        if (!fileId) {
          throw { statusCode: 400, message: 'File ID is required' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Get file to check workspace access
        const file = await this.collaborationServices.features.fileManagement.getFileById(fileId);
        if (!file) {
          throw { statusCode: 404, message: 'File not found' };
        }

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, file.workspaceId.toString(), userId, userType);

        const comments = req.validatedBody?.comments;

        const updatedFile = await this.collaborationServices.features.fileManagement.approveFile(
          fileId,
          userId,
          userType,
          comments
        );

        this.logAction(req, 'APPROVE_FILE_SUCCESS', {
          fileId,
        });

        return { file: updatedFile };
      });
    }, res, 'File approved successfully', this.getRequestMeta(req));
  }

  /**
   * Reject file.
   */
  async rejectFile(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'REJECT_FILE');

        const fileId = req.validatedParams?.fileId;
        if (!fileId) {
          throw { statusCode: 400, message: 'File ID is required' };
        }

        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Get file to check workspace access
        const file = await this.collaborationServices.features.fileManagement.getFileById(fileId);
        if (!file) {
          throw { statusCode: 404, message: 'File not found' };
        }

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, file.workspaceId.toString(), userId, userType);

        const reason = req.validatedBody?.reason || req.validatedBody?.comments;
        if (!reason) {
          throw { statusCode: 400, message: 'Rejection reason is required' };
        }

        const updatedFile = await this.collaborationServices.features.fileManagement.rejectFile(
          fileId,
          userId,
          userType,
          reason
        );

        this.logAction(req, 'REJECT_FILE_SUCCESS', {
          fileId,
        });

        return { file: updatedFile };
      });
    }, res, 'File rejected successfully', this.getRequestMeta(req));
  }

  /**
   * Delete file (soft delete).
   */
  async deleteFile(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'DELETE_FILE');

        const fileId = req.validatedParams?.fileId;
        if (!fileId) {
          throw { statusCode: 400, message: 'File ID is required' };
        }

        const userId = this.resolveUserId(req);

        // Get file to check workspace access
        const file = await this.collaborationServices.features.fileManagement.getFileById(fileId);
        if (!file) {
          throw { statusCode: 404, message: 'File not found' };
        }

        const userType = this.resolveUserType(req);
        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, file.workspaceId.toString(), userId, userType);

        const deletedFile = await this.collaborationServices.features.fileManagement.deleteFile(
          fileId,
          userId
        );

        this.logAction(req, 'DELETE_FILE_SUCCESS', {
          fileId,
        });

        return { file: deletedFile };
      });
    }, res, 'File deleted successfully', this.getRequestMeta(req));
  }

  /**
   * Get pending approvals for workspace.
   */
  async getPendingApprovals(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_PENDING_APPROVALS');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const files = await this.collaborationServices.features.fileManagement.getPendingApprovals(workspaceId);

        this.logAction(req, 'GET_PENDING_APPROVALS_SUCCESS', {
          workspaceId,
          count: files.length,
        });

        return { files };
      });
    }, res, 'Pending approvals retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get file statistics for workspace.
   */
  async getFileStats(req: FileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      await this.validateAuth(req, res, async () => {
        this.recordPerformance(req, 'GET_FILE_STATS');

        const workspaceId = this.resolveWorkspaceId(req);
        const userId = this.resolveUserId(req);
        const userType = this.resolveUserType(req);

        // Ensure user has access to workspace
        await this.ensureWorkspaceAccess(req, workspaceId, userId, userType);

        const stats = await this.collaborationServices.features.fileManagement.getFileStats(workspaceId);

        this.logAction(req, 'GET_FILE_STATS_SUCCESS', {
          workspaceId,
        });

        return { stats };
      });
    }, res, 'File statistics retrieved successfully', this.getRequestMeta(req));
  }
}

export const collaborationFileController = new CollaborationFileController();

