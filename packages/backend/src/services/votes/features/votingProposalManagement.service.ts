import { createAppError } from '../../../middleware/error.middleware';
import { Proposal } from '../../../models/proposal.model';
import { Product } from '../../../models/product.model';
import { logger } from '../../../utils/logger';
import { VotingService as BlockchainVotingService } from '../../blockchain/voting.service';
import { enhancedCacheService } from '../../external/enhanced-cache.service';
import { votingDataService } from '../core/votingData.service';
import { getVotingCacheTags } from '../utils/cache';
import type { ProposalStatus } from '../utils/types';
import { votingValidationService } from '../validation/votingValidation.service';

/**
 * Interface for creating a new proposal
 */
export interface CreateProposalInput {
  title: string;
  description: string;
  category?: string;
  imageUrl?: string;
  mediaIds?: string[]; // Media file IDs
  productIds: string[]; // Products to vote on
  allowMultipleSelections?: boolean;
  maxSelections?: number;
  requireReason?: boolean;
  duration?: number; // Duration in seconds
  startTime?: Date;
  endTime?: Date;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  deployToBlockchain?: boolean; // Whether to immediately deploy to blockchain
}

/**
 * Interface for updating a proposal
 */
export interface UpdateProposalInput {
  title?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  duration?: number;
  endTime?: Date;
}

/**
 * Interface for deployment result
 */
export interface DeployProposalResult {
  proposalId: string;
  blockchainProposalId: string;
  txHash: string;
  blockNumber?: number;
  contractAddress?: string;
}

/**
 * Interface for proposal statistics
 */
export interface ProposalStatistics {
  proposalId: string;
  totalVotes: number;
  participantCount: number;
  viewCount: number;
  engagementRate: number;
  votesByProduct: {
    productId: string;
    productName: string;
    voteCount: number;
    percentage: number;
  }[];
  status: ProposalStatus;
  isActive: boolean;
  timeRemaining?: number;
}

export class VotingProposalManagementService {
  constructor(
    private readonly dataService = votingDataService,
    private readonly validation = votingValidationService
  ) {}

  /**
   * Create a new voting proposal
   */
  async createProposal(
    businessId: string,
    input: CreateProposalInput
  ): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    // Validate input
    if (!input.title || input.title.trim().length < 3) {
      throw createAppError('Proposal title must be at least 3 characters', 400, 'INVALID_TITLE');
    }

    if (!input.description || input.description.trim().length < 10) {
      throw createAppError('Proposal description must be at least 10 characters', 400, 'INVALID_DESCRIPTION');
    }

    if (!input.productIds || input.productIds.length === 0) {
      throw createAppError('Proposal must include at least one product', 400, 'NO_PRODUCTS');
    }

    if (input.productIds.length > 100) {
      throw createAppError('Proposal cannot have more than 100 products', 400, 'TOO_MANY_PRODUCTS');
    }

    // Verify products exist and belong to the business
    const products = await Product.find({
      _id: { $in: input.productIds },
      business: validatedBusinessId
    });

    if (products.length !== input.productIds.length) {
      throw createAppError('Some products do not exist or do not belong to your business', 400, 'INVALID_PRODUCTS');
    }

    // Generate unique proposal ID
    const proposalId = `prop-${validatedBusinessId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create proposal document
    const proposal = new Proposal({
      proposalId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category?.trim(),
      businessId: validatedBusinessId,
      imageUrl: input.imageUrl?.trim(),
      media: input.mediaIds || [],
      productIds: input.productIds,
      allowMultipleSelections: input.allowMultipleSelections || false,
      maxSelections: input.maxSelections,
      requireReason: input.requireReason || false,
      duration: input.duration,
      startTime: input.startTime,
      endTime: input.endTime,
      priority: input.priority || 'medium',
      tags: input.tags || [],
      status: 'draft'
    });

    await proposal.save();

    logger.info('Proposal created successfully', {
      businessId: validatedBusinessId,
      proposalId: proposal.proposalId,
      productCount: input.productIds.length
    });

    // Optionally deploy to blockchain
    if (input.deployToBlockchain) {
      try {
        await this.deployProposalToBlockchain(validatedBusinessId, proposal.proposalId);
      } catch (error: any) {
        logger.warn('Failed to deploy proposal to blockchain during creation', {
          proposalId: proposal.proposalId,
          error: error.message
        });
        // Don't fail the entire operation if blockchain deployment fails
      }
    }

    // Clear caches
    await this.clearProposalCaches(validatedBusinessId);

    return proposal;
  }

  /**
   * Update an existing proposal (only if not yet active)
   */
  async updateProposal(
    businessId: string,
    proposalId: string,
    updates: UpdateProposalInput
  ): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    });

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    // Only allow updates if proposal is in draft status
    if (proposal.status !== 'draft') {
      throw createAppError('Cannot update proposal that is not in draft status', 400, 'PROPOSAL_NOT_DRAFT');
    }

    // Apply updates
    if (updates.title !== undefined) {
      proposal.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      proposal.description = updates.description.trim();
    }
    if (updates.category !== undefined) {
      proposal.category = updates.category.trim();
    }
    if (updates.imageUrl !== undefined) {
      proposal.imageUrl = updates.imageUrl.trim();
    }
    if (updates.priority !== undefined) {
      proposal.priority = updates.priority;
    }
    if (updates.tags !== undefined) {
      proposal.tags = updates.tags;
    }
    if (updates.duration !== undefined) {
      proposal.duration = updates.duration;
    }
    if (updates.endTime !== undefined) {
      proposal.endTime = updates.endTime;
    }

    await proposal.save();

    logger.info('Proposal updated successfully', {
      businessId: validatedBusinessId,
      proposalId: proposal.proposalId
    });

    await this.clearProposalCaches(validatedBusinessId);

    return proposal;
  }

  /**
   * Activate a proposal to start voting
   */
  async activateProposal(businessId: string, proposalId: string): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    });

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    if (proposal.status === 'active') {
      throw createAppError('Proposal is already active', 400, 'ALREADY_ACTIVE');
    }

    if (proposal.status !== 'draft' && proposal.status !== 'deactivated') {
      throw createAppError('Can only activate proposals that are in draft or deactivated status', 400, 'INVALID_STATUS');
    }

    // Verify products still exist
    const productCount = await Product.countDocuments({
      _id: { $in: proposal.productIds },
      business: validatedBusinessId
    });

    if (productCount !== proposal.productIds.length) {
      throw createAppError('Some products in this proposal no longer exist', 400, 'INVALID_PRODUCTS');
    }

    // Activate the proposal
    await proposal.activate();

    logger.info('Proposal activated successfully', {
      businessId: validatedBusinessId,
      proposalId: proposal.proposalId,
      startTime: proposal.startTime,
      endTime: proposal.endTime
    });

    await this.clearProposalCaches(validatedBusinessId);

    return proposal;
  }

  /**
   * Deactivate a proposal to stop voting
   */
  async deactivateProposal(businessId: string, proposalId: string): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    });

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    if (proposal.status !== 'active') {
      throw createAppError('Can only deactivate active proposals', 400, 'NOT_ACTIVE');
    }

    // Deactivate the proposal
    await proposal.deactivate();

    logger.info('Proposal deactivated successfully', {
      businessId: validatedBusinessId,
      proposalId: proposal.proposalId
    });

    await this.clearProposalCaches(validatedBusinessId);

    return proposal;
  }

  /**
   * Complete a proposal (mark as finished)
   */
  async completeProposal(businessId: string, proposalId: string): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    });

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    if (proposal.status === 'completed') {
      throw createAppError('Proposal is already completed', 400, 'ALREADY_COMPLETED');
    }

    await proposal.complete();

    logger.info('Proposal completed successfully', {
      businessId: validatedBusinessId,
      proposalId: proposal.proposalId
    });

    await this.clearProposalCaches(validatedBusinessId);

    return proposal;
  }

  /**
   * Cancel a proposal
   */
  async cancelProposal(businessId: string, proposalId: string): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    });

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    if (proposal.status === 'completed') {
      throw createAppError('Cannot cancel a completed proposal', 400, 'ALREADY_COMPLETED');
    }

    await proposal.cancel();

    logger.info('Proposal cancelled successfully', {
      businessId: validatedBusinessId,
      proposalId: proposal.proposalId
    });

    await this.clearProposalCaches(validatedBusinessId);

    return proposal;
  }

  /**
   * Deploy a proposal to the blockchain
   */
  async deployProposalToBlockchain(
    businessId: string,
    proposalId: string
  ): Promise<DeployProposalResult> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    });

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    if (proposal.blockchainProposalId) {
      throw createAppError('Proposal already deployed to blockchain', 400, 'ALREADY_DEPLOYED');
    }

    // Get voting contract address
    const contractAddress = await this.dataService.getVoteContractAddress(validatedBusinessId);
    if (!contractAddress) {
      throw createAppError('No voting contract deployed for this business', 400, 'NO_CONTRACT');
    }

    // Create metadata URI (simplified - in production, upload to IPFS)
    const metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify({
      title: proposal.title,
      description: proposal.description,
      category: proposal.category,
      imageUrl: proposal.imageUrl,
      proposalId: proposal.proposalId
    }))}`;

    // Deploy to blockchain
    const result = await BlockchainVotingService.createProposal(
      contractAddress,
      metadataUri,
      validatedBusinessId
    );

    // Update proposal with blockchain info
    proposal.blockchainProposalId = result.proposalId;
    proposal.contractAddress = contractAddress;
    proposal.metadataUri = metadataUri;
    proposal.txHash = result.txHash;
    await proposal.save();

    logger.info('Proposal deployed to blockchain successfully', {
      businessId: validatedBusinessId,
      proposalId: proposal.proposalId,
      blockchainProposalId: result.proposalId,
      txHash: result.txHash
    });

    await this.clearProposalCaches(validatedBusinessId);

    return {
      proposalId: proposal.proposalId,
      blockchainProposalId: result.proposalId,
      txHash: result.txHash,
      blockNumber: undefined,
      contractAddress
    };
  }

  /**
   * Get detailed statistics for a specific proposal
   */
  async getProposalStatistics(
    businessId: string,
    proposalId: string
  ): Promise<ProposalStatistics> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    }).populate('productIds', 'title _id');

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    // Get vote distribution by product from PendingVote collection
    const { PendingVote } = await import('../../../models/pendingVote.model');
    const votesByProduct = await PendingVote.aggregate([
      {
        $match: {
          businessId: validatedBusinessId,
          proposalId: proposal.proposalId
        }
      },
      {
        $group: {
          _id: '$selectedProductId',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get product names
    const productMap = new Map();
    const products: any[] = proposal.productIds as any;
    products.forEach((product: any) => {
      productMap.set(product._id.toString(), product.title);
    });

    const totalVotes = votesByProduct.reduce((sum, item) => sum + item.count, 0);

    const statistics: ProposalStatistics = {
      proposalId: proposal.proposalId,
      totalVotes: proposal.voteCount,
      participantCount: proposal.participantCount,
      viewCount: proposal.viewCount,
      engagementRate: proposal.viewCount > 0 
        ? Math.round((proposal.participantCount / proposal.viewCount) * 100)
        : 0,
      votesByProduct: votesByProduct.map(item => ({
        productId: item._id,
        productName: productMap.get(item._id) || 'Unknown Product',
        voteCount: item.count,
        percentage: totalVotes > 0 ? Math.round((item.count / totalVotes) * 100) : 0
      })),
      status: proposal.status,
      isActive: proposal.isActive(),
      timeRemaining: (proposal as any).timeRemaining || undefined
    };

    return statistics;
  }

  /**
   * Get a single proposal by ID
   */
  async getProposal(businessId: string, proposalId: string): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    }).populate('productIds', 'title description imageUrl media voteCount');

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    return proposal;
  }

  /**
   * List all proposals for a business
   */
  async listProposals(
    businessId: string,
    options: {
      status?: ProposalStatus;
      category?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const query: any = { businessId: validatedBusinessId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.category) {
      query.category = options.category;
    }

    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    const proposals = await Proposal.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .populate('productIds', 'title imageUrl');

    return proposals;
  }

  /**
   * Delete a proposal (only if in draft status)
   */
  async deleteProposal(businessId: string, proposalId: string): Promise<void> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const proposal = await Proposal.findOne({
      proposalId: proposalId.trim(),
      businessId: validatedBusinessId
    });

    if (!proposal) {
      throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
    }

    if (proposal.status !== 'draft') {
      throw createAppError('Can only delete proposals in draft status', 400, 'NOT_DRAFT');
    }

    await proposal.deleteOne();

    logger.info('Proposal deleted successfully', {
      businessId: validatedBusinessId,
      proposalId: proposal.proposalId
    });

    await this.clearProposalCaches(validatedBusinessId);
  }

  /**
   * Clear all proposal-related caches
   */
  private async clearProposalCaches(businessId: string): Promise<void> {
    await enhancedCacheService.invalidateByTags(getVotingCacheTags(businessId));
  }
}

export const votingProposalManagementService = new VotingProposalManagementService();

