// src/controllers/features/votes/votesProposalManagement.controller.ts
// Controller exposing voting proposal management operations

import { Response } from 'express';
import { VotesBaseController, VotesBaseRequest } from './votesBase.controller';
import type { DeployProposalResult, ProposalStatistics } from '../../../services/votes/features/votingProposalManagement.service';
import type { ProposalStatus } from '../../../services/votes/utils/types';

interface CreateProposalRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedBody?: {
    title?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    mediaIds?: string[] | string;
    productIds?: string[] | string;
    allowMultipleSelections?: boolean;
    maxSelections?: number;
    requireReason?: boolean;
    duration?: number;
    startTime?: string;
    endTime?: string;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[] | string;
    deployToBlockchain?: boolean;
  };
}

interface UpdateProposalRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
    proposalId?: string;
  };
  validatedBody?: {
    title?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    duration?: number;
    endTime?: string;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[] | string;
  };
}

interface ProposalActionRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
    proposalId?: string;
  };
}

interface ListProposalsRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  };
}

/**
 * VotesProposalManagementController maps HTTP requests to proposal management services.
 */
export class VotesProposalManagementController extends VotesBaseController {
  /**
   * Create a new proposal for a business.
   */
  async createProposal(req: CreateProposalRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_CREATE');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});

      const input = {
        title: this.parseString(body.title),
        description: this.parseString(body.description),
        category: this.parseString(body.category),
        imageUrl: this.parseString(body.imageUrl),
        mediaIds: this.parseStringArray(body.mediaIds),
        productIds: this.parseStringArray(body.productIds) ?? [],
        allowMultipleSelections: body.allowMultipleSelections === undefined ? undefined : this.parseBoolean(body.allowMultipleSelections),
        maxSelections: this.parseOptionalNumber(body.maxSelections, { min: 1 }),
        requireReason: body.requireReason === undefined ? undefined : this.parseBoolean(body.requireReason),
        duration: this.parseOptionalNumber(body.duration, { min: 60 }),
        startTime: this.parseDate(body.startTime ?? body.startTimeRaw ?? body.start_time),
        endTime: this.parseDate(body.endTime ?? body.end_time),
        priority: body.priority as 'low' | 'medium' | 'high' | undefined,
        tags: this.parseStringArray(body.tags),
        deployToBlockchain: body.deployToBlockchain === undefined ? undefined : this.parseBoolean(body.deployToBlockchain),
      };

      const proposal = await this.votingProposalManagementService.createProposal(businessId, input);
      const serialized = this.toPlainObject(proposal);

      this.logAction(req, 'VOTING_PROPOSAL_CREATE_SUCCESS', {
        businessId,
        proposalId: serialized?.proposalId,
      });

      return {
        proposal: serialized,
        createdAt: new Date().toISOString(),
      };
    }, res, 'Voting proposal created successfully', this.getRequestMeta(req));
  }

  /**
   * Update a draft proposal.
   */
  async updateProposal(req: UpdateProposalRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_UPDATE');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);
      const body = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});

      const updates = {
        title: body.title ? this.parseString(body.title) : undefined,
        description: body.description ? this.parseString(body.description) : undefined,
        category: body.category ? this.parseString(body.category) : undefined,
        imageUrl: body.imageUrl ? this.parseString(body.imageUrl) : undefined,
        duration: this.parseOptionalNumber(body.duration, { min: 60 }),
        endTime: this.parseDate(body.endTime ?? body.end_time),
        priority: body.priority as 'low' | 'medium' | 'high' | undefined,
        tags: body.tags !== undefined ? this.parseStringArray(body.tags) ?? [] : undefined,
      };

      const proposal = await this.votingProposalManagementService.updateProposal(
        businessId,
        proposalId,
        updates,
      );

      const serialized = this.toPlainObject(proposal);

      this.logAction(req, 'VOTING_PROPOSAL_UPDATE_SUCCESS', {
        businessId,
        proposalId,
      });

      return {
        proposal: serialized,
        updatedAt: new Date().toISOString(),
      };
    }, res, 'Voting proposal updated successfully', this.getRequestMeta(req));
  }

  /**
   * Activate a proposal.
   */
  async activateProposal(req: ProposalActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_ACTIVATE');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);

      const proposal = await this.votingProposalManagementService.activateProposal(businessId, proposalId);
      const serialized = this.toPlainObject(proposal);

      this.logAction(req, 'VOTING_PROPOSAL_ACTIVATE_SUCCESS', {
        businessId,
        proposalId,
      });

      return {
        proposal: serialized,
        activatedAt: new Date().toISOString(),
      };
    }, res, 'Voting proposal activated successfully', this.getRequestMeta(req));
  }

  /**
   * Deactivate a proposal.
   */
  async deactivateProposal(req: ProposalActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_DEACTIVATE');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);

      const proposal = await this.votingProposalManagementService.deactivateProposal(businessId, proposalId);
      const serialized = this.toPlainObject(proposal);

      this.logAction(req, 'VOTING_PROPOSAL_DEACTIVATE_SUCCESS', {
        businessId,
        proposalId,
      });

      return {
        proposal: serialized,
        deactivatedAt: new Date().toISOString(),
      };
    }, res, 'Voting proposal deactivated successfully', this.getRequestMeta(req));
  }

  /**
   * Mark a proposal as completed.
   */
  async completeProposal(req: ProposalActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_COMPLETE');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);

      const proposal = await this.votingProposalManagementService.completeProposal(businessId, proposalId);
      const serialized = this.toPlainObject(proposal);

      this.logAction(req, 'VOTING_PROPOSAL_COMPLETE_SUCCESS', {
        businessId,
        proposalId,
      });

      return {
        proposal: serialized,
        completedAt: new Date().toISOString(),
      };
    }, res, 'Voting proposal completed successfully', this.getRequestMeta(req));
  }

  /**
   * Cancel a proposal.
   */
  async cancelProposal(req: ProposalActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_CANCEL');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);

      const proposal = await this.votingProposalManagementService.cancelProposal(businessId, proposalId);
      const serialized = this.toPlainObject(proposal);

      this.logAction(req, 'VOTING_PROPOSAL_CANCEL_SUCCESS', {
        businessId,
        proposalId,
      });

      return {
        proposal: serialized,
        canceledAt: new Date().toISOString(),
      };
    }, res, 'Voting proposal canceled successfully', this.getRequestMeta(req));
  }

  /**
   * Deploy a proposal to the blockchain.
   */
  async deployProposalToBlockchain(req: ProposalActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_DEPLOY');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);

      const result: DeployProposalResult = await this.votingProposalManagementService.deployProposalToBlockchain(
        businessId,
        proposalId,
      );

      this.logAction(req, 'VOTING_PROPOSAL_DEPLOY_SUCCESS', {
        businessId,
        proposalId,
        contractAddress: result.contractAddress,
      });

      return {
        proposalId,
        deployment: result,
        deployedAt: new Date().toISOString(),
      };
    }, res, 'Voting proposal deployed to blockchain successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve proposal statistics.
   */
  async getProposalStatistics(req: ProposalActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_STATS');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);

      const stats: ProposalStatistics = await this.votingProposalManagementService.getProposalStatistics(
        businessId,
        proposalId,
      );

      this.logAction(req, 'VOTING_PROPOSAL_STATS_SUCCESS', {
        businessId,
        proposalId,
        totalVotes: stats.totalVotes,
      });

      return {
        businessId,
        stats,
      };
    }, res, 'Voting proposal statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a single proposal.
   */
  async getProposal(req: ProposalActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_GET');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);

      const proposal = await this.votingProposalManagementService.getProposal(businessId, proposalId);
      const serialized = this.toPlainObject(proposal);

      this.logAction(req, 'VOTING_PROPOSAL_GET_SUCCESS', {
        businessId,
        proposalId,
      });

      return {
        proposal: serialized,
      };
    }, res, 'Voting proposal retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * List proposals for a business.
   */
  async listProposals(req: ListProposalsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_LIST');

      const businessId = this.requireBusinessId(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const rawStatus = this.parseString(query.status);
      const allowedStatuses: ProposalStatus[] = [
        'draft',
        'active',
        'completed',
        'failed',
        'pending',
        'succeeded',
        'cancelled',
        'deactivated',
      ];
      const statusFilter = rawStatus && allowedStatuses.includes(rawStatus as ProposalStatus)
        ? (rawStatus as ProposalStatus)
        : undefined;

      const options = {
        status: statusFilter,
        category: this.parseString(query.category),
        limit: this.parseOptionalNumber(query.limit, { min: 1, max: 500 }),
        offset: this.parseOptionalNumber(query.offset, { min: 0 }),
      };

      const proposals = await this.votingProposalManagementService.listProposals(businessId, options);
      const serialized = proposals.map((proposal) => this.toPlainObject(proposal));

      this.logAction(req, 'VOTING_PROPOSAL_LIST_SUCCESS', {
        businessId,
        count: serialized.length,
        statusFilter: options.status,
      });

      return {
        proposals: serialized,
        total: serialized.length,
      };
    }, res, 'Voting proposals listed successfully', this.getRequestMeta(req));
  }

  /**
   * Delete a draft proposal.
   */
  async deleteProposal(req: ProposalActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSAL_DELETE');

      const businessId = this.requireBusinessId(req);
      const proposalId = this.requireProposalId(req);

      await this.votingProposalManagementService.deleteProposal(businessId, proposalId);

      this.logAction(req, 'VOTING_PROPOSAL_DELETE_SUCCESS', {
        businessId,
        proposalId,
      });

      return {
        proposalId,
        deleted: true,
        deletedAt: new Date().toISOString(),
      };
    }, res, 'Voting proposal deleted successfully', this.getRequestMeta(req));
  }
}

export const votesProposalManagementController = new VotesProposalManagementController();
