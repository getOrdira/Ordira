// src/controllers/features/platform/platformManagement.controller.ts
// Controller for voting platform management operations

import { Response } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { votingPlatformManagementService } from '../../../services/platform/features/votingPlatformManagement.service';

interface PlatformManagementRequest extends BaseRequest {
  validatedParams?: {
    platformId?: string;
  };
  validatedQuery?: {
    businessId?: string;
  };
  validatedBody?: {
    // Create platform fields
    title?: string;
    slug?: string;
    description?: string;
    templateId?: string;
    visibility?: 'public' | 'private' | 'unlisted';
    timezone?: string;
    startTime?: Date;
    endTime?: Date;
    emailGatingEnabled?: boolean;
    allowedDomains?: string[];
    allowedEmails?: string[];
    blockDisposableEmails?: boolean;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    // Blockchain fields
    blockchainEnabled?: boolean;
    blockchainMode?: 'off-chain' | 'on-chain';
    createProposal?: boolean;
    proposalDuration?: number;
    batchThreshold?: number;
    // Toggle blockchain fields
    enabled?: boolean;
    mode?: 'off-chain' | 'on-chain';
    // Business ID (sometimes passed in body)
    businessId?: string;
  };
}

/**
 * Controller for voting platform management operations
 */
export class PlatformManagementController extends BaseController {
  /**
   * Resolve business ID from request
   */
  private resolveBusinessId(req: PlatformManagementRequest): string {
    const businessId = req.businessId || 
      req.validatedQuery?.businessId || 
      req.validatedBody?.businessId as string | undefined;

    if (!businessId) {
      throw {
        statusCode: 400,
        message: 'Business ID is required for this operation',
        code: 'MISSING_BUSINESS_ID'
      };
    }

    return businessId;
  }

  /**
   * Create a new voting platform
   */
  async createPlatform(req: PlatformManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const input = req.validatedBody || {};

      const platform = await votingPlatformManagementService.createPlatform(businessId, {
        title: input.title!,
        slug: input.slug,
        description: input.description,
        templateId: input.templateId,
        visibility: input.visibility,
        timezone: input.timezone,
        startTime: input.startTime,
        endTime: input.endTime,
        emailGatingEnabled: input.emailGatingEnabled,
        allowedDomains: input.allowedDomains,
        allowedEmails: input.allowedEmails,
        blockDisposableEmails: input.blockDisposableEmails,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        backgroundColor: input.backgroundColor,
        textColor: input.textColor,
        fontFamily: input.fontFamily,
        // Blockchain configuration
        blockchainEnabled: input.blockchainEnabled,
        blockchainMode: input.blockchainMode,
        createProposal: input.createProposal,
        proposalDuration: input.proposalDuration,
        batchThreshold: input.batchThreshold
      });

      this.logger.info('Voting platform created', {
        businessId,
        platformId: platform._id.toString(),
        blockchainEnabled: platform.blockchainIntegration?.enabled,
        blockchainMode: platform.blockchainIntegration?.mode
      });

      return {
        platform,
        blockchainEnabled: platform.blockchainIntegration?.enabled || false,
        mode: platform.blockchainIntegration?.mode || 'off-chain'
      };
    }, res, 'Voting platform created successfully');
  }

  /**
   * Toggle blockchain mode for a platform
   */
  async toggleBlockchainMode(req: PlatformManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const platformId = req.validatedParams?.platformId;

      if (!platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      const { enabled, mode } = req.validatedBody || {};

      if (enabled === undefined) {
        throw {
          statusCode: 400,
          message: 'Enabled field is required',
          code: 'MISSING_ENABLED_FIELD'
        };
      }

      const platform = await votingPlatformManagementService.toggleBlockchainMode(
        businessId,
        platformId,
        enabled,
        mode
      );

      this.logger.info('Blockchain mode toggled for platform', {
        businessId,
        platformId,
        enabled,
        mode: platform.blockchainIntegration?.mode
      });

      return {
        platform,
        blockchainEnabled: platform.blockchainIntegration?.enabled || false,
        mode: platform.blockchainIntegration?.mode || 'off-chain',
        proposalId: platform.blockchainIntegration?.proposalId,
        autoDeployVotes: platform.blockchainIntegration?.autoDeployVotes,
        batchThreshold: platform.blockchainIntegration?.batchThreshold
      };
    }, res, 'Blockchain mode updated successfully');
  }

  /**
   * Update a platform
   */
  async updatePlatform(req: PlatformManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const platformId = req.validatedParams?.platformId;

      if (!platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      const updates = req.validatedBody || {};

      const platform = await votingPlatformManagementService.updatePlatform(
        businessId,
        platformId,
        updates
      );

      this.logger.info('Voting platform updated', {
        businessId,
        platformId
      });

      return { platform };
    }, res, 'Voting platform updated successfully');
  }

  /**
   * Publish a platform (make it live)
   */
  async publishPlatform(req: PlatformManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const platformId = req.validatedParams?.platformId;

      if (!platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      const platform = await votingPlatformManagementService.publishPlatform(
        businessId,
        platformId
      );

      this.logger.info('Voting platform published', {
        businessId,
        platformId
      });

      return { platform };
    }, res, 'Voting platform published successfully');
  }

  /**
   * Pause a platform
   */
  async pausePlatform(req: PlatformManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const platformId = req.validatedParams?.platformId;

      if (!platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      const platform = await votingPlatformManagementService.pausePlatform(
        businessId,
        platformId
      );

      this.logger.info('Voting platform paused', {
        businessId,
        platformId
      });

      return { platform };
    }, res, 'Voting platform paused successfully');
  }

  /**
   * Archive a platform
   */
  async archivePlatform(req: PlatformManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const platformId = req.validatedParams?.platformId;

      if (!platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      const platform = await votingPlatformManagementService.archivePlatform(
        businessId,
        platformId
      );

      this.logger.info('Voting platform archived', {
        businessId,
        platformId
      });

      return { platform };
    }, res, 'Voting platform archived successfully');
  }

  /**
   * Delete a platform
   */
  async deletePlatform(req: PlatformManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const platformId = req.validatedParams?.platformId;

      if (!platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      await votingPlatformManagementService.deletePlatform(
        businessId,
        platformId
      );

      this.logger.info('Voting platform deleted', {
        businessId,
        platformId
      });

      return { deleted: true, platformId };
    }, res, 'Voting platform deleted successfully');
  }
}

export const platformManagementController = new PlatformManagementController();

