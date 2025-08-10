// src/controllers/votes.controller.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { VotingBusinessService } from '../services/business/votes.service';
import { PendingVote } from '../models/pendingVote.model';
import mongoose from 'mongoose';

// Initialize service
const votingBusinessService = new VotingBusinessService();

/**
 * Extended request interfaces for type safety
 */
interface TenantVotingRequest extends AuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface DeployContractRequest extends TenantVotingRequest, ValidatedRequest {
  validatedBody: {
    contractName?: string;
    description?: string;
  };
}

interface CreateProposalRequest extends TenantVotingRequest, ValidatedRequest {
  validatedBody: {
    description: string;
    category?: string;
    duration?: number;
    requiresQuorum?: boolean;
  };
}

interface SubmitVoteRequest extends TenantVotingRequest, ValidatedRequest {
  validatedBody: {
    proposalIds: string[];
    voteType?: 'for' | 'against' | 'abstain';
    reason?: string;
  };
}

interface VotingStatsRequest extends TenantVotingRequest, ValidatedRequest {
  validatedQuery: {
    startDate?: string;
    endDate?: string;
    proposalId?: string;
  };
}

/**
 * Deploy a new voting contract for the business
 * POST /api/votes/deploy
 * 
 * @requires authentication & tenant context
 * @requires validation: contract deployment parameters
 * @returns { contract, deployment, blockchain }
 */
export const deployVotingContract = asyncHandler(async (
  req: DeployContractRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Check if business already has a voting contract
  const hasContract = await votingBusinessService.hasVotingContract(businessId);
  if (hasContract) {
    throw createAppError('Business already has a voting contract deployed', 409, 'CONTRACT_ALREADY_EXISTS');
  }

  // Extract deployment configuration
  const deploymentConfig = req.validatedBody || {};

  // Deploy voting contract through service
  const deploymentResult = await votingBusinessService.deployVotingContractForBusiness(businessId);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Voting contract deployed successfully',
    data: {
      contract: {
        address: deploymentResult.votingAddress,
        businessId,
        deployedAt: new Date().toISOString(),
        name: deploymentConfig.contractName || 'Business Voting Contract',
        description: deploymentConfig.description
      },
      deployment: {
        transactionHash: deploymentResult.txHash,
        networkId: process.env.CHAIN_ID || '5453',
        gasUsed: 'estimated', // Would need blockchain service to get actual gas
        deploymentCost: 'estimated' // Would need gas price calculation
      },
      blockchain: {
        network: process.env.BLOCKCHAIN_NETWORK || 'base',
        explorer: `https://basescan.org/tx/${deploymentResult.txHash}`
      }
    }
  });
});

/**
 * Create a new proposal for voting
 * POST /api/votes/proposals
 * 
 * @requires authentication & tenant context
 * @requires validation: proposal creation data
 * @returns { proposal, blockchain, metadata }
 */
export const createProposal = asyncHandler(async (
  req: CreateProposalRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract validated proposal data
  const { description, category, duration, requiresQuorum } = req.validatedBody;

  // Validate description
  if (!description || description.trim().length < 10) {
    throw createAppError('Proposal description must be at least 10 characters', 400, 'INVALID_DESCRIPTION');
  }

  if (description.length > 1000) {
    throw createAppError('Proposal description cannot exceed 1000 characters', 400, 'DESCRIPTION_TOO_LONG');
  }

  // Create proposal through service
  const proposalResult = await votingBusinessService.createProposalForBusiness(businessId, description.trim());

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Proposal created successfully',
    data: {
      proposal: {
        id: proposalResult.proposalId,
        description: description.trim(),
        category: category || 'general',
        businessId,
        createdAt: new Date().toISOString(),
        duration: duration || 7 * 24 * 60 * 60, // 7 days in seconds
        requiresQuorum: requiresQuorum || false,
        status: 'active'
      },
      blockchain: {
        transactionHash: proposalResult.txHash,
        blockchainId: proposalResult.proposalId,
        network: process.env.BLOCKCHAIN_NETWORK || 'base',
        explorer: `https://basescan.org/tx/${proposalResult.txHash}`
      },
      metadata: {
        votingStarted: true,
        votingEndsAt: new Date(Date.now() + (duration || 7 * 24 * 60 * 60) * 1000).toISOString()
      }
    }
  });
});

/**
 * List all proposals for the business
 * GET /api/votes/proposals
 * 
 * @requires authentication & tenant context
 * @optional query: filtering and pagination
 * @returns { proposals[], stats, pagination }
 */
export const listProposals = asyncHandler(async (
  req: TenantVotingRequest & { query: { status?: string; page?: string; limit?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract query parameters
  const status = req.query.status;
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);

  // Get proposals through service
  const proposals = await votingBusinessService.getBusinessProposals(businessId);

  // Filter by status if provided
  const filteredProposals = status 
    ? proposals.filter(p => p.status === status)
    : proposals;

  // Apply pagination
  const total = filteredProposals.length;
  const startIndex = (page - 1) * limit;
  const paginatedProposals = filteredProposals.slice(startIndex, startIndex + limit);

  // Get voting statistics
  const votingStats = await votingBusinessService.getVotingStats(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Proposals retrieved successfully',
    data: {
      proposals: paginatedProposals.map(proposal => ({
        id: proposal.proposalId,
        description: proposal.description,
        status: proposal.status || 'active',
        createdAt: proposal.createdAt,
        transactionHash: proposal.txHash,
        voteCount: 0, // Would need to calculate from blockchain
        category: 'general' // Would need to store this in database
      })),
      stats: {
        total: votingStats.totalProposals,
        active: filteredProposals.filter(p => p.status === 'active').length,
        completed: filteredProposals.filter(p => p.status === 'completed').length,
        pending: votingStats.pendingVotes
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      contractAddress: votingStats.contractAddress
    }
  });
});

/**
 * Submit votes for proposals (with batching logic)
 * POST /api/votes
 * 
 * @requires authentication & tenant context
 * @requires validation: voting data
 * @returns { votes, batch, pending }
 */
export const submitVote = asyncHandler(async (
  req: SubmitVoteRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID and user ID from context
  const businessId = req.tenant?.business?.toString();
  const userId = req.userId;

  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  if (!userId) {
    throw createAppError('User ID not found in request', 401, 'MISSING_USER_ID');
  }

  // Extract validated voting data
  const { proposalIds, voteType, reason } = req.validatedBody;

  // Validate proposal IDs
  if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
    throw createAppError('At least one proposal ID is required', 400, 'MISSING_PROPOSAL_IDS');
  }

  if (proposalIds.length > 10) {
    throw createAppError('Maximum 10 proposals can be voted on at once', 400, 'TOO_MANY_PROPOSALS');
  }

  // Record pending votes and check for duplicate votes
  const voteRecords = [];
  for (const proposalId of proposalIds) {
    try {
      const voteId = new mongoose.Types.ObjectId().toString();
      await PendingVote.create({ 
        businessId, 
        proposalId, 
        userId, 
        voteId,
        voteType: voteType || 'for',
        reason: reason?.trim()
      });
      
      voteRecords.push({
        proposalId,
        voteId,
        voteType: voteType || 'for',
        recordedAt: new Date().toISOString()
      });
    } catch (error: any) {
      if (error.code === 11000) {
        throw createAppError(`You have already voted for proposal ${proposalId}`, 409, 'DUPLICATE_VOTE');
      }
      throw error;
    }
  }

  // Check if we've reached the batching threshold
  const allPendingVotes = await PendingVote.find({ businessId });
  const BATCH_THRESHOLD = parseInt(process.env.VOTE_BATCH_THRESHOLD || '20');
  
  let batchSubmitted = false;
  let batchResult = null;

  if (allPendingVotes.length >= BATCH_THRESHOLD) {
    try {
      // Process pending votes through service
      batchResult = await votingBusinessService.processPendingVotes(businessId);
      
      if (batchResult) {
        // Clear pending votes after successful batch submission
        await PendingVote.deleteMany({ businessId });
        batchSubmitted = true;
      }
    } catch (error: any) {
      console.error('Failed to submit batch votes:', error);
      // Continue with individual vote recording even if batch fails
    }
  }

  // Return standardized response
  if (batchSubmitted && batchResult) {
    res.status(201).json({
      success: true,
      message: 'Votes recorded and batch submitted to blockchain',
      data: {
        votes: voteRecords,
        batch: {
          submitted: true,
          transactionHash: batchResult.txHash,
          totalVotes: allPendingVotes.length,
          submittedAt: new Date().toISOString()
        },
        blockchain: {
          network: process.env.BLOCKCHAIN_NETWORK || 'base',
          explorer: `https://basescan.org/tx/${batchResult.txHash}`
        }
      }
    });
  } else {
    res.status(202).json({
      success: true,
      message: 'Votes recorded. Will be submitted to blockchain when threshold is reached.',
      data: {
        votes: voteRecords,
        pending: {
          totalPending: allPendingVotes.length,
          threshold: BATCH_THRESHOLD,
          remaining: BATCH_THRESHOLD - allPendingVotes.length
        },
        batch: {
          submitted: false,
          willSubmitWhen: `${BATCH_THRESHOLD} votes are collected`
        }
      }
    });
  }
});

/**
 * List all votes for the business
 * GET /api/votes
 * 
 * @requires authentication & tenant context
 * @optional query: filtering options
 * @returns { votes[], pending[], stats }
 */
export const listVotes = asyncHandler(async (
  req: TenantVotingRequest & { query: { proposalId?: string; userId?: string; page?: string; limit?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract query parameters
  const { proposalId, userId, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);

  // Get votes through service
  const votes = await votingBusinessService.getBusinessVotes(businessId);

  // Get pending votes
  const pendingVotesQuery: any = { businessId };
  if (proposalId) pendingVotesQuery.proposalId = proposalId;
  if (userId) pendingVotesQuery.userId = userId;

  const pendingVotes = await PendingVote.find(pendingVotesQuery)
    .sort({ createdAt: -1 })
    .lean();

  // Filter submitted votes if needed
  const filteredVotes = votes.filter(vote => {
    if (proposalId && vote.proposalId !== proposalId) return false;
    if (userId && vote.voter !== userId) return false;
    return true;
  });

  // Apply pagination to submitted votes
  const total = filteredVotes.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedVotes = filteredVotes.slice(startIndex, startIndex + limitNum);

  // Get voting statistics
  const votingStats = await votingBusinessService.getVotingStats(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Votes retrieved successfully',
    data: {
      submittedVotes: paginatedVotes.map(vote => ({
        id: vote.proposalId,
        proposalId: vote.proposalId,
        voter: vote.voter,
        transactionHash: vote.txHash,
        submittedAt: vote.createdAt || new Date().toISOString(),
        status: 'confirmed'
      })),
      pendingVotes: pendingVotes.map(vote => ({
        id: vote._id.toString(),
        proposalId: vote.proposalId,
        userId: vote.userId,
        voteId: vote.voteId,
        voteType: vote.voteType || 'for',
        reason: vote.reason,
        recordedAt: vote.createdAt,
        status: 'pending'
      })),
      stats: {
        totalSubmitted: votingStats.totalVotes,
        totalPending: votingStats.pendingVotes,
        totalProposals: votingStats.totalProposals,
        batchThreshold: parseInt(process.env.VOTE_BATCH_THRESHOLD || '20')
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      filters: {
        proposalId,
        userId
      }
    }
  });
});

/**
 * Get voting statistics and analytics
 * GET /api/votes/stats
 * 
 * @requires authentication & tenant context
 * @optional query: date range and filters
 * @returns { stats, analytics, trends }
 */
export const getVotingStats = asyncHandler(async (
  req: VotingStatsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract query parameters
  const { startDate, endDate, proposalId } = req.validatedQuery || {};
  
  // Parse dates
  const fromDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const toDate = endDate ? new Date(endDate) : new Date();

  // Get comprehensive voting statistics
  const votingStats = await votingBusinessService.getVotingStats(businessId);

  // Get proposal-specific stats if requested
  let proposalStats = null;
  if (proposalId) {
    const pendingVotesForProposal = await PendingVote.countDocuments({ 
      businessId, 
      proposalId 
    });
    
    proposalStats = {
      proposalId,
      pendingVotes: pendingVotesForProposal,
      // Would need blockchain service to get actual vote counts
      totalVotes: 0,
      participation: '0%'
    };
  }

  // Calculate trends (simplified)
  const recentPendingVotes = await PendingVote.find({
    businessId,
    createdAt: { $gte: fromDate, $lte: toDate }
  });

  const dailyVoteActivity = {};
  recentPendingVotes.forEach(vote => {
    const day = vote.createdAt.toISOString().split('T')[0];
    dailyVoteActivity[day] = (dailyVoteActivity[day] || 0) + 1;
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'Voting statistics retrieved successfully',
    data: {
      overview: {
        totalProposals: votingStats.totalProposals,
        totalVotes: votingStats.totalVotes,
        pendingVotes: votingStats.pendingVotes,
        contractAddress: votingStats.contractAddress,
        hasVotingContract: !!votingStats.contractAddress
      },
      proposalStats,
      analytics: {
        participationRate: votingStats.totalProposals > 0 
          ? `${Math.round((votingStats.totalVotes / votingStats.totalProposals) * 100)}%`
          : '0%',
        averageVotesPerProposal: votingStats.totalProposals > 0 
          ? Math.round(votingStats.totalVotes / votingStats.totalProposals) 
          : 0,
        batchEfficiency: votingStats.pendingVotes > 0 
          ? `${Math.round((votingStats.pendingVotes / parseInt(process.env.VOTE_BATCH_THRESHOLD || '20')) * 100)}%`
          : '0%'
      },
      trends: {
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        },
        dailyActivity: dailyVoteActivity,
        totalActivityInPeriod: recentPendingVotes.length
      },
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Force submit pending votes (admin action)
 * POST /api/votes/force-submit
 * 
 * @requires authentication & tenant context
 * @returns { batch, submission, blockchain }
 */
export const forceSubmitPendingVotes = asyncHandler(async (
  req: TenantVotingRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Check if there are pending votes
  const pendingVotes = await PendingVote.find({ businessId });
  if (pendingVotes.length === 0) {
    throw createAppError('No pending votes to submit', 400, 'NO_PENDING_VOTES');
  }

  // Force submit pending votes through service
  const batchResult = await votingBusinessService.processPendingVotes(businessId);

  if (!batchResult) {
    throw createAppError('Failed to submit pending votes', 500, 'BATCH_SUBMISSION_FAILED');
  }

  // Clear pending votes after successful submission
  await PendingVote.deleteMany({ businessId });

  // Return standardized response
  res.json({
    success: true,
    message: 'Pending votes force-submitted successfully',
    data: {
      batch: {
        totalVotes: pendingVotes.length,
        submitted: true,
        forcedSubmission: true
      },
      submission: {
        transactionHash: batchResult.txHash,
        submittedAt: new Date().toISOString(),
        gasUsed: 'estimated', // Would need blockchain service
        cost: 'estimated' // Would need gas price calculation
      },
      blockchain: {
        network: process.env.BLOCKCHAIN_NETWORK || 'ethereum',
        explorer: `https://etherscan.io/tx/${batchResult.txHash}`,
        confirmations: 'pending'
      }
    }
  });
});

/**
 * Get proposal details by ID
 * GET /api/votes/proposals/:proposalId
 * 
 * @requires authentication & tenant context
 * @requires params: { proposalId: string }
 * @returns { proposal, votes, analytics }
 */
export const getProposalDetails = asyncHandler(async (
  req: TenantVotingRequest & { params: { proposalId: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { proposalId } = req.params;

  // Validate proposal ID
  if (!proposalId || proposalId.trim().length === 0) {
    throw createAppError('Proposal ID is required', 400, 'MISSING_PROPOSAL_ID');
  }

  // Get all proposals for the business
  const proposals = await votingBusinessService.getBusinessProposals(businessId);
  
  // Find the specific proposal
  const proposal = proposals.find(p => p.proposalId === proposalId);
  if (!proposal) {
    throw createAppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
  }

  // Get votes for this proposal
  const allVotes = await votingBusinessService.getBusinessVotes(businessId);
  const proposalVotes = allVotes.filter(vote => vote.proposalId === proposalId);

  // Get pending votes for this proposal
  const pendingVotes = await PendingVote.find({ businessId, proposalId }).lean();

  // Return standardized response
  res.json({
    success: true,
    message: 'Proposal details retrieved successfully',
    data: {
      proposal: {
        id: proposal.proposalId,
        description: proposal.description,
        status: proposal.status || 'active',
        createdAt: proposal.createdAt,
        transactionHash: proposal.txHash,
        businessId
      },
      votes: {
        submitted: proposalVotes.map(vote => ({
          voter: vote.voter,
          transactionHash: vote.txHash,
          submittedAt: vote.createdAt || new Date().toISOString()
        })),
        pending: pendingVotes.map(vote => ({
          userId: vote.userId,
          voteType: vote.voteType || 'for',
          reason: vote.reason,
          recordedAt: vote.createdAt
        }))
      },
      analytics: {
        totalVotes: proposalVotes.length + pendingVotes.length,
        submittedVotes: proposalVotes.length,
        pendingVotes: pendingVotes.length,
        participationRate: '0%', // Would need total eligible voters
        voteDistribution: {
          for: pendingVotes.filter(v => v.voteType === 'for').length,
          against: pendingVotes.filter(v => v.voteType === 'against').length,
          abstain: pendingVotes.filter(v => v.voteType === 'abstain').length
        }
      },
      retrievedAt: new Date().toISOString()
    }
  });
});
