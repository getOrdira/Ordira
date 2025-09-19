// services/business/votes.service.ts
import { BrandSettings } from '../../models/brandSettings.model';
import { logger } from '../../utils/logger'; 
import { VotingRecord } from '../../models/votingRecord.model';
import { PendingVote } from '../../models/pendingVote.model';
import { VotingService } from '../blockchain/voting.service';
import { NotificationsService } from '../external/notifications.service';
import { BillingService } from '../external/billing.service';
import { SubscriptionService } from './subscription.service';
import { createAppError } from '../../middleware/error.middleware';

// ===== INTERFACES =====

export interface DeployContractResult {
  votingAddress: string;
  txHash: string;
  blockNumber?: number;
  gasUsed?: string;
  deploymentCost?: string;
}

export interface CreateProposalResult {
  proposalId: string;
  txHash: string;
  blockNumber?: number;
  createdAt: Date;
}

export interface ProposalDetails {
  proposalId: string;
  description: string;
  status?: 'active' | 'completed' | 'failed';
  createdAt?: Date;
  txHash?: string;
  voteCount?: number;
  category?: string;
  duration?: number;
}

export interface VoteRecord {
  voter: string;
  proposalId: string;
  txHash: string;
  createdAt?: Date;
  blockNumber?: number;
  selectedProductId: string; 
  productName?: string;
  voterAddress?: string; 
  gasUsed?: string; 
}

export interface VotingStats {
  totalProposals: number;
  totalVotes: number;
  pendingVotes: number;
  contractAddress?: string;
  activeProposals?: number;
  participationRate?: string;
}

export interface ProcessPendingResult {
  txHash: string;
  totalVotes: number;
  submittedAt: Date;
  gasUsed?: string;
  blockNumber?: number;
}

export interface PendingVoteRecord {
   businessId: string;
  proposalId: string; 
  userId: string;
  voteId: string;
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  createdAt: Date;
}

export interface VotingAnalytics {
  overview: {
    totalProposals: number;
    totalVotes: number;
    pendingVotes: number;
    participationRate: string;
    contractAddress?: string;
  };
  trends: {
    dailyActivity: Record<string, number>;
    totalActivityInPeriod: number;
    dateRange: {
      from: string;
      to: string;
    };
  };
  proposalStats?: {
    proposalId: string;
    totalVotes: number;
    pendingVotes: number;
    participation: string;
  };
}

/**
 * Enhanced Voting Business Service class
 * Handles all voting-related business logic with full alignment to controller expectations
 */
export class VotingBusinessService {
  private notificationService = new NotificationsService();
  private billingService = new BillingService();
  private subscriptionService = new SubscriptionService();

  // ===== CONTRACT DEPLOYMENT =====
  

  async deployVotingContractForBusiness(businessId: string): Promise<DeployContractResult> {
    try {
      // Validate input
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      // Check if business already has a contract
      const existingSettings = await BrandSettings.findOne({ business: businessId });
      if (existingSettings.web3Settings?.voteContract) {
        throw createAppError('Business already has a voting contract deployed', 409, 'CONTRACT_ALREADY_EXISTS');
      }

      // Deploy contract on blockchain using static method
      const deploymentResult = await VotingService.deployVotingContract(businessId);
      
      // Save contract address to business settings
      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          $set: { 
            'web3Settings.voteContract': deploymentResult.address,
            'votingSettings.contractDeployedAt': new Date(),
            'votingSettings.networkId': process.env.CHAIN_ID || '8453'
          }
        },
        { new: true, upsert: true }
      );

      if (!updatedSettings) {
        throw createAppError('Failed to save voting contract address to business settings', 500, 'SETTINGS_UPDATE_FAILED');
      }

      // Send deployment notification
      try {
        await this.notificationService.sendVotingContractDeployedNotification(businessId, {
          contractAddress: deploymentResult.address,
          txHash: deploymentResult.txHash
        });
      } catch (notificationError) {
        // Log but don't fail the deployment
        logger.warn('Failed to send deployment notification for business ${businessId}:', notificationError);
      }

      return {
        votingAddress: deploymentResult.address,
        txHash: deploymentResult.txHash,
        blockNumber: deploymentResult.blockNumber,
        gasUsed: deploymentResult.gasUsed,
        deploymentCost: 'estimated' // Would calculate based on gas
      };
    } catch (error: any) {
      logger.error('Deploy voting contract error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw createAppError('Insufficient funds for contract deployment', 400, 'INSUFFICIENT_FUNDS');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error during deployment', 503, 'NETWORK_ERROR');
      }
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw createAppError('Database error while deploying voting contract', 503, 'DATABASE_ERROR');
      }

      throw createAppError(`Failed to deploy voting contract for business: ${error.message}`, 500, 'DEPLOYMENT_FAILED');
    }
  }

  // ===== PROPOSAL MANAGEMENT =====

  async createProposalForBusiness(businessId: string, description: string, options: {
    category?: string;
    duration?: number;
    requiresQuorum?: boolean;
  } = {}): Promise<CreateProposalResult> {
    try {
      // Validate inputs
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }
      if (!description?.trim()) {
        throw createAppError('Proposal description is required', 400, 'MISSING_DESCRIPTION');
      }
      if (description.length < 10) {
        throw createAppError('Proposal description must be at least 10 characters', 400, 'DESCRIPTION_TOO_SHORT');
      }
      if (description.length > 1000) {
        throw createAppError('Proposal description too long (max 1000 characters)', 400, 'DESCRIPTION_TOO_LONG');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings.web3Settings?.voteContract) {
        throw createAppError('No voting contract deployed for this business', 404, 'NO_VOTING_CONTRACT');
      }

      // Create metadata URI (you might implement a metadata service)
      const metadataUri = `${process.env.METADATA_BASE_URL || 'https://api.example.com/metadata'}/proposals/${businessId}/${Date.now()}`;

      // Create proposal using static method
      const proposalResult = await VotingService.createProposal(settings.web3Settings?.voteContract, metadataUri, businessId);

      // Store proposal metadata in database (optional)
      try {
        // You might have a Proposal model to store additional metadata
        const proposalData = {
          business: businessId,
          proposalId: proposalResult.proposalId,
          description: description.trim(),
          category: options.category || 'general',
          duration: options.duration || 7 * 24 * 60 * 60, // 7 days in seconds
          requiresQuorum: options.requiresQuorum || false,
          createdAt: new Date(),
          status: 'active',
          txHash: proposalResult.txHash,
          metadataUri
        };
        
        // If you have a Proposal model, save it here
        // await Proposal.create(proposalData);
      } catch (dbError) {
        // Log but don't fail the proposal creation
        logger.warn('Failed to store proposal metadata for ${proposalResult.proposalId}:', dbError);
      }

      // Send notification
      try {
        await this.notificationService.sendProposalCreatedNotification(businessId, {
          proposalId: proposalResult.proposalId,
          description: description.trim()
        });
      } catch (notificationError) {
        logger.warn('Failed to send proposal notification:', notificationError);
      }

      return {
        proposalId: proposalResult.proposalId,
        txHash: proposalResult.txHash,
        createdAt: new Date()
      };
    } catch (error: any) {
      logger.error('Create proposal error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw createAppError('Insufficient funds for proposal creation', 400, 'INSUFFICIENT_FUNDS');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error during proposal creation', 503, 'NETWORK_ERROR');
      }

      throw createAppError(`Failed to create proposal for business: ${error.message}`, 500, 'PROPOSAL_CREATION_FAILED');
    }
  }

  async getBusinessProposals(businessId: string): Promise<ProposalDetails[]> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings.web3Settings?.voteContract) {
        return [];
      }

      // Get proposals using static method
      const proposalEvents = await VotingService.getProposalEvents(settings.web3Settings?.voteContract);

      // Transform the data to match expected format
      return proposalEvents.map(event => ({
        proposalId: event.proposalId,
        description: event.description,
        status: 'active' as const, // You might determine this from blockchain state
        createdAt: new Date(), // You might get this from blockchain timestamp
        txHash: event.txHash,
        voteCount: 0, // Would need to calculate from vote events
        category: 'general', // Would need to store/retrieve this separately
        duration: 7 * 24 * 60 * 60 // Default 7 days
      }));
    } catch (error: any) {
      logger.error('Get business proposals error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error while fetching proposals', 503, 'NETWORK_ERROR');
      }

      throw createAppError(`Failed to get business proposals: ${error.message}`, 500, 'GET_PROPOSALS_FAILED');
    }
  }

  async getProposalDetails(businessId: string, proposalId: string): Promise<ProposalDetails | null> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }
      if (!proposalId?.trim()) {
        throw createAppError('Proposal ID is required', 400, 'MISSING_PROPOSAL_ID');
      }

      const proposals = await this.getBusinessProposals(businessId);
      return proposals.find(p => p.proposalId === proposalId) || null;
    } catch (error: any) {
      logger.error('Get proposal details error:', error);
      throw error; // Re-throw as it's already handled in getBusinessProposals
    }
  }

  // ===== VOTING MANAGEMENT =====

  async checkBusinessVotingEligibility(businessId: string): Promise<{
  canVote: boolean;
  remainingVotes: number;
  reason?: string;
}> {
  try {
    const limits = await this.subscriptionService.getVotingLimits(businessId);
    
    const canVote = Number(limits.remainingVotes) > 0 || limits.voteLimit === -1; // -1 = unlimited
    
    return {
      canVote,
      remainingVotes: limits.remainingVotes === "unlimited" ? -1 : limits.remainingVotes,
      reason: canVote ? undefined : 'Monthly voting limit exceeded'
    };
  } catch (error: any) {
    return {
      canVote: false,
      remainingVotes: 0,
      reason: `Unable to check voting eligibility: ${error.message}`
    };
  }
}

  async recordPendingVote(
  businessId: string, 
  proposalId: string, 
  userId: string, 
  selectedProductId: string, // This is a separate parameter
  options: {
    productName?: string;
    productImageUrl?: string;
    selectionReason?: string;
    voteId?: string;
  } = {} // This object does NOT contain selectedProductId
): Promise<PendingVoteRecord> {
  try {
    // Validate inputs
    if (!businessId?.trim()) {
      throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
    }
    if (!proposalId?.trim()) {
      throw createAppError('Selection round ID is required', 400, 'MISSING_PROPOSAL_ID');
    }
    if (!userId?.trim()) {
      throw createAppError('User ID is required', 400, 'MISSING_USER_ID');
    }
    if (!selectedProductId?.trim()) { // ✅ Use the parameter directly
      throw createAppError('Selected product ID is required', 400, 'MISSING_PRODUCT_ID');
    }

    // Check subscription limits
    try {
      await this.subscriptionService.checkVotingLimits(businessId, 1);
    } catch (limitError) {
      throw createAppError(`Selection limit exceeded: ${limitError.message}`, 403, 'VOTING_LIMIT_EXCEEDED');
    }

    const voteId = options.voteId || new Date().getTime().toString();
    
    // Validate the product selection data
    this.validateProductSelection({
      businessId,
      proposalId,
      voteId,
      selectedProductId, 
      userId
    });

    const pendingVoteData = {
      businessId,
      proposalId,
      userId,
      voteId,
      selectedProductId, 
      productName: options.productName?.trim(),
      productImageUrl: options.productImageUrl?.trim(),
      selectionReason: options.selectionReason?.trim()
    };

    const pendingVote = await PendingVote.create(pendingVoteData);

    return {
      businessId,
      proposalId,
      userId,
      voteId,
      selectedProductId, 
      productName: options.productName,
      productImageUrl: options.productImageUrl,
      selectionReason: options.selectionReason,
      createdAt: pendingVote.createdAt
    };
  } catch (error: any) {
    logger.error('Record product selection error:', error);
    
    if (error.statusCode) {
      throw error;
    }

    // Handle duplicate selection error
    if (error.code === 11000) {
      throw createAppError(`User has already selected this product in this round`, 409, 'DUPLICATE_SELECTION');
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      throw createAppError(`Validation failed: ${validationErrors.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    throw createAppError(`Failed to record product selection: ${error.message}`, 500, 'RECORD_SELECTION_FAILED');
  }
}

  async processPendingVotes(businessId: string, forceSubmit: boolean = false): Promise<ProcessPendingResult | null> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const THRESHOLD = parseInt(process.env.VOTE_BATCH_THRESHOLD || '20');
      const pending = await PendingVote.find({ businessId, isProcessed: false }).sort({ createdAt: 1 });
      
      if (!forceSubmit && pending.length < THRESHOLD) {
        return null;
      }

      if (pending.length === 0) {
        throw createAppError('No pending votes to process', 400, 'NO_PENDING_VOTES');
      }

      // Check subscription limits
      try {
        await this.subscriptionService.checkVotingLimits(businessId, pending.length);
      } catch (limitError) {
        throw createAppError(`Voting limit exceeded: ${limitError.message}`, 403, 'VOTING_LIMIT_EXCEEDED');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings.web3Settings?.voteContract) {
        throw createAppError('No voting contract deployed for this business', 404, 'NO_VOTING_CONTRACT');
      }

      const selectedProposalsArray = pending.map(v => [v.proposalId]); // Convert to array of arrays
      const voteIds = pending.map(v => v.voteId);
      const voterEmails = pending.map(v => v.userId); // Map userId to voterEmail
      const signatures = voteIds.map(() => ''); // Generate signatures as needed

      // Validate arrays have content
      if (selectedProposalsArray.length === 0 || voteIds.length === 0) {
        throw createAppError('No valid votes to process', 400, 'NO_VALID_VOTES');
      }

      // Submit votes on blockchain using static method
      const batchResult = await VotingService.batchSubmitVotes(
        settings.web3Settings?.voteContract,
        selectedProposalsArray,
        voteIds,
        voterEmails,
        signatures
      );

      // Record votes in database
      const voteRecords = [];
      for (const vote of pending) {
        try {

          this.validateVoteData({
          businessId: vote.businessId,
          proposalId: vote.proposalId,
          voteId: vote.voteId,
          voteChoice: vote.selectedProductId ,
          voterAddress: vote.userId // You might want to map this to actual wallet address
         });

         const votingRecord = await VotingRecord.create({
          business: businessId,
          proposalId: vote.proposalId,
          voteId: vote.voteId,
          timestamp: new Date(),
          voteChoice: vote.selectedProductId || 'for', // ✓ Correctly mapped
          voterAddress: vote.userId, // Consider mapping to actual wallet address
          });

          voteRecords.push(votingRecord);

           try {
          await this.billingService.trackVoteUsage(businessId, vote.voteId);
        } catch (billingError: any) {
          logger.warn('Failed to track billing for vote ${vote.voteId}:', billingError.message);
        }

          // Mark pending vote as processed
          await PendingVote.updateOne({ _id: vote._id }, { $set: { isProcessed: true } });

          // Send notification
          try {
            await this.notificationService.notifyBrandOfNewVote(businessId, vote.proposalId);
          } catch (notificationError: any) {
            logger.warn('Failed to send notification for vote ${vote.voteId}:', notificationError.message);
          }
        } catch (recordError) {
          logger.error('Failed to record vote ${vote.voteId}:', recordError);
          // Continue with other votes
        }
      }

      // Clear processed pending votes
      await PendingVote.deleteMany({ 
        businessId, 
        _id: { $in: pending.map(v => v._id) }
      });

      return {
        txHash: batchResult.txHash,
        totalVotes: batchResult.voteCount,
        submittedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Process pending votes error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw createAppError('Insufficient funds for batch vote submission', 400, 'INSUFFICIENT_FUNDS');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error during vote submission', 503, 'NETWORK_ERROR');
      }
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw createAppError('Database error while processing pending votes', 503, 'DATABASE_ERROR');
      }

      throw createAppError(`Failed to process pending votes: ${error.message}`, 500, 'PROCESS_VOTES_FAILED');
    }
  }

  async getBusinessVotes(businessId: string): Promise<VoteRecord[]> {
  try {
    if (!businessId?.trim()) {
      throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
    }

    // Get from database first (more reliable than blockchain events)
    const dbVotes = await VotingRecord.find({ business: businessId })
      .sort({ timestamp: -1 })
      .lean();

    if (dbVotes.length > 0) {
      return dbVotes.map(vote => ({
        voter: vote.voterAddress || vote.voteId, // Map appropriately
        proposalId: vote.proposalId,
        txHash: '', // Would need to store this in the model
        createdAt: vote.timestamp,
        blockNumber: vote.blockNumber,
        selectedProductId: vote.selectedProductId, // ✅ ADD THIS - required for product selection
        productName: vote.productName, // ✅ ADD THIS - from updated model
        voterAddress: vote.voterAddress,
        gasUsed: vote.gasUsed
      }));
    }

    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.web3Settings?.voteContract) { // ✅ FIX: Check if contract doesn't exist
      return [];
    }

    // Get votes using static method
    const voteEvents = await VotingService.getVoteEvents(settings.web3Settings.voteContract); // ✅ FIX: Use non-optional access

    // Transform the data to match expected format
    return voteEvents.map(event => ({
      voter: event.voter,
      proposalId: event.proposalId,
      txHash: event.txHash,
      createdAt: new Date(event.timestamp || Date.now()),
      blockNumber: event.blockNumber,
      selectedProductId: undefined, // Not available from blockchain events
      productName: undefined, // Product name not available from blockchain events
      voterAddress: event.voter,
      gasUsed: undefined
    }));
  } catch (error: any) {
    logger.error('Get business votes error:', error);
    
    if (error.statusCode) {
      throw error;
    }

    // Handle blockchain errors
    if (error.code === 'NETWORK_ERROR') {
      throw createAppError('Blockchain network error while fetching votes', 503, 'NETWORK_ERROR');
    }

    throw createAppError(`Failed to get business votes: ${error.message}`, 500, 'GET_VOTES_FAILED');
  }
}

  async getPendingVotes(businessId: string, filters: {
    proposalId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PendingVoteRecord[]> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const query: any = { businessId, isProcessed: false };
      if (filters.proposalId) query.proposalId = filters.proposalId;
      if (filters.userId) query.userId = filters.userId;

      const pendingVotes = await PendingVote.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
        .skip(filters.offset || 0)
        .lean();

      return pendingVotes.map(vote => ({
        businessId: vote.businessId,
        proposalId: vote.proposalId,
        userId: vote.userId,
        voteId: vote.voteId,
        selectedProductId: vote.selectedProductId,
        productName: vote.productName,
        productImageUrl: vote.productImageUrl,
        selectionReason: vote.selectionReason,
        createdAt: vote.createdAt
      }));
    } catch (error: any) {
      logger.error('Get pending votes error:', error);
      throw createAppError(`Failed to get pending votes: ${error.message}`, 500, 'GET_PENDING_VOTES_FAILED');
    }
  }

  // ===== STATISTICS AND ANALYTICS =====

  async getVotingStats(businessId: string): Promise<VotingStats> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const [settings, votingRecords, pendingVotes] = await Promise.all([
        BrandSettings.findOne({ business: businessId }),
        VotingRecord.countDocuments({ business: businessId }),
        PendingVote.countDocuments({ businessId, isProcessed: false })
      ]);

      let totalProposals = 0;
      let totalVotes = 0;
      let activeProposals = 0;

      if (settings.web3Settings?.voteContract) {
        try {
          const contractInfo = await VotingService.getContractInfo(settings.web3Settings?.voteContract);
          totalProposals = contractInfo.totalProposals;
          totalVotes = contractInfo.totalVotes;
          activeProposals = contractInfo.activeProposals || 0;
        } catch (blockchainError) {
          // If blockchain call fails, use database records
          logger.warn('Failed to get blockchain voting stats, using database records');
          totalVotes = votingRecords;
        }
      }

      const participationRate = totalProposals > 0 
        ? `${Math.round((totalVotes / totalProposals) * 100)}%` 
        : '0%';

      return {
        totalProposals,
        totalVotes: Math.max(totalVotes, votingRecords),
        pendingVotes,
        contractAddress: settings.web3Settings?.voteContract,
        activeProposals,
        participationRate
      };
    } catch (error: any) {
      logger.error('Get voting stats error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to get voting stats: ${error.message}`, 500, 'GET_STATS_FAILED');
    }
  }

  async getVotingAnalytics(businessId: string, options: {
    startDate?: Date;
    endDate?: Date;
    proposalId?: string;
  } = {}): Promise<VotingAnalytics> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const { startDate, endDate, proposalId } = options;
      
      // Default to last 30 days if no dates provided
      const fromDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = endDate || new Date();

      // Get basic stats
      const votingStats = await this.getVotingStats(businessId);

      // Get recent activity
      const recentPendingVotes = await PendingVote.find({
        businessId,
        createdAt: { $gte: fromDate, $lte: toDate }
      }).lean();

      // Calculate daily activity
      const dailyVoteActivity: Record<string, number> = {};
      recentPendingVotes.forEach(vote => {
        const day = vote.createdAt.toISOString().split('T')[0];
        dailyVoteActivity[day] = (dailyVoteActivity[day] || 0) + 1;
      });

      // Get proposal-specific stats if requested
      let proposalStats = undefined;
      if (proposalId) {
        const pendingVotesForProposal = await PendingVote.countDocuments({ 
          businessId, 
          proposalId,
          isProcessed: false
        });
        
        proposalStats = {
          proposalId,
          totalVotes: 0, // Would need blockchain data
          pendingVotes: pendingVotesForProposal,
          participation: '0%' // Would need total eligible voters
        };
      }

      return {
        overview: {
          totalProposals: votingStats.totalProposals,
          totalVotes: votingStats.totalVotes,
          pendingVotes: votingStats.pendingVotes,
          participationRate: votingStats.participationRate || '0%',
          contractAddress: votingStats.contractAddress
        },
        trends: {
          dailyActivity: dailyVoteActivity,
          totalActivityInPeriod: recentPendingVotes.length,
          dateRange: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
          }
        },
        proposalStats
      };
    } catch (error: any) {
      logger.error('Get voting analytics error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to get voting analytics: ${error.message}`, 500, 'GET_ANALYTICS_FAILED');
    }
  }

  // ===== UTILITY METHODS =====

  async hasVotingContract(businessId: string): Promise<boolean> {
    try {
      if (!businessId?.trim()) {
        return false;
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      return !!(settings.web3Settings?.voteContract);
    } catch (error) {
      logger.error('Check voting contract error:', error);
      return false;
    }
  }

  async getContractAddress(businessId: string): Promise<string | null> {
    try {
      if (!businessId?.trim()) {
        return null;
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      return settings.web3Settings?.voteContract || null;
    } catch (error) {
      logger.error('Get contract address error:', error);
      return null;
    }
  }

  async validateProposalExists(businessId: string, proposalId: string): Promise<boolean> {
    try {
      const proposals = await this.getBusinessProposals(businessId);
      return proposals.some(p => p.proposalId === proposalId);
    } catch (error) {
      logger.error('Validate proposal exists error:', error);
      return false;
    }
  }

  async getUserVoteForProposal(businessId: string, proposalId: string, userId: string): Promise<PendingVoteRecord | null> {
    try {
      const pendingVote = await PendingVote.findOne({
        businessId,
        proposalId,
        userId
      }).lean();

      if (!pendingVote) {
        return null;
      }

      return {
        businessId: pendingVote.businessId,
        proposalId: pendingVote.proposalId,
        userId: pendingVote.userId,
        voteId: pendingVote.voteId,
        selectedProductId: pendingVote.selectedProductId,
        productName: pendingVote.productName,
        productImageUrl: pendingVote.productImageUrl,
        selectionReason: pendingVote.selectionReason,
        createdAt: pendingVote.createdAt
      };
    } catch (error) {
      logger.error('Get user vote for proposal error:', error);
      return null;
    }
  }

  async getBusinessVotingHealth(businessId: string): Promise<{
    health: 'excellent' | 'good' | 'poor' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const stats = await this.getVotingStats(businessId);
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      let score = 100;

      // Check if contract is deployed
      if (!stats.contractAddress) {
        score -= 50;
        issues.push('No voting contract deployed');
        recommendations.push('Deploy a voting contract to enable voting');
      }

      // Check activity levels
      if (stats.totalProposals === 0) {
        score -= 30;
        issues.push('No proposals created');
        recommendations.push('Create proposals to engage your community');
      }

      // Check participation
      const participationNum = parseInt(stats.participationRate?.replace('%', '') || '0');
      if (participationNum < 10) {
        score -= 20;
        issues.push('Low participation rate');
        recommendations.push('Encourage more community participation in voting');
      }

      // Check pending votes accumulation
      if (stats.pendingVotes > 50) {
        score -= 10;
        issues.push('High number of pending votes');
        recommendations.push('Consider processing pending votes to maintain system efficiency');
      }

      // Determine health level
      let health: 'excellent' | 'good' | 'poor' | 'critical';
      if (score >= 90) health = 'excellent';
      else if (score >= 70) health = 'good';
      else if (score >= 50) health = 'poor';
      else health = 'critical';

      return {
        health,
        score: Math.max(0, score),
        issues,
        recommendations
      };
    } catch (error) {
      logger.error('Get voting health error:', error);
      return {
        health: 'critical',
        score: 0,
        issues: ['Unable to assess voting health'],
        recommendations: ['Check system configuration and try again']
      };
    }
  }

  // ===== BATCH OPERATIONS =====

  async batchCreateProposals(businessId: string, proposals: Array<{
    description: string;
    category?: string;
    duration?: number;
  }>): Promise<CreateProposalResult[]> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      if (!Array.isArray(proposals) || proposals.length === 0) {
        throw createAppError('Proposals array is required and cannot be empty', 400, 'MISSING_PROPOSALS');
      }

      if (proposals.length > 10) {
        throw createAppError('Maximum 10 proposals can be created at once', 400, 'TOO_MANY_PROPOSALS');
      }

      const results: CreateProposalResult[] = [];
      const errors: string[] = [];

      for (const [index, proposal] of proposals.entries()) {
        try {
          const result = await this.createProposalForBusiness(businessId, proposal.description, {
            category: proposal.category,
            duration: proposal.duration
          });
          results.push(result);
        } catch (error: any) {
          errors.push(`Proposal ${index + 1}: ${error.message}`);
          // Continue with other proposals
        }
      }

      if (errors.length > 0) {
        logger.warn('Batch proposal creation completed with ${errors.length} errors:', errors);
      }

      return results;
    } catch (error: any) {
      logger.error('Batch create proposals error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to batch create proposals: ${error.message}`, 500, 'BATCH_CREATE_FAILED');
    }
  }

  async batchRecordVotes(businessId: string, votes: Array<{
    proposalId: string;
    userId: string;
    voteType?: 'for' | 'against' | 'abstain';
    reason?: string;
  }>): Promise<PendingVoteRecord[]> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      if (!Array.isArray(votes) || votes.length === 0) {
        throw createAppError('Votes array is required and cannot be empty', 400, 'MISSING_VOTES');
      }

      if (votes.length > 50) {
        throw createAppError('Maximum 50 votes can be recorded at once', 400, 'TOO_MANY_VOTES');
      }

      const results: PendingVoteRecord[] = [];
      const errors: string[] = [];

      for (const [index, vote] of votes.entries()) {
        try {

            const voteId = new Date().getTime().toString() + '-' + index;
            const voteChoice = vote.voteType || 'for';

              this.validateVoteData({
              businessId,
              proposalId: vote.proposalId,
              voteId,
              voteChoice,
              voterAddress: vote.userId
              });
          const selectedProductId = vote.voteType || 'for'; // Map voteType to a product ID
          const result = await this.recordPendingVote(businessId, vote.proposalId, vote.userId, selectedProductId, {
            selectionReason: vote.reason
          });
          results.push(result);
        } catch (error: any) {
          if (error.code === 'DUPLICATE_VOTE') {
            // Skip duplicate votes but don't count as error
            continue;
          }
          errors.push(`Vote ${index + 1}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        logger.warn('Batch vote recording completed with ${errors.length} errors:', errors);
      }

      return results;
    } catch (error: any) {
      logger.error('Batch record votes error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to batch record votes: ${error.message}`, 500, 'BATCH_RECORD_FAILED');
    }
  }

  // ===== CLEANUP AND MAINTENANCE =====

  async cleanupExpiredPendingVotes(businessId: string, maxAgeHours: number = 24): Promise<{
    deletedCount: number;
    remainingCount: number;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      
      const deleteResult = await PendingVote.deleteMany({
        businessId,
        createdAt: { $lt: cutoffDate },
        isProcessed: false
      });

      const remainingCount = await PendingVote.countDocuments({
        businessId,
        isProcessed: false
      });

      return {
        deletedCount: deleteResult.deletedCount || 0,
        remainingCount
      };
    } catch (error: any) {
      logger.error('Cleanup expired pending votes error:', error);
      throw createAppError(`Failed to cleanup expired pending votes: ${error.message}`, 500, 'CLEANUP_FAILED');
    }
  }

  async resetPendingVotes(businessId: string): Promise<{
    deletedCount: number;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const deleteResult = await PendingVote.deleteMany({
        businessId,
        isProcessed: false
      });

      return {
        deletedCount: deleteResult.deletedCount || 0
      };
    } catch (error: any) {
      logger.error('Reset pending votes error:', error);
      throw createAppError(`Failed to reset pending votes: ${error.message}`, 500, 'RESET_FAILED');
    }
  }

  // ===== EXPORT AND REPORTING =====

  async exportVotingData(businessId: string, options: {
    format?: 'json' | 'csv';
    includeProposals?: boolean;
    includeVotes?: boolean;
    includePending?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    data: any;
    format: string;
    generatedAt: Date;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const {
        format = 'json',
        includeProposals = true,
        includeVotes = true,
        includePending = true,
        startDate,
        endDate
      } = options;

      const exportData: any = {
        businessId,
        exportedAt: new Date(),
        dateRange: {
          from: startDate?.toISOString(),
          to: endDate?.toISOString()
        }
      };

      // Include proposals if requested
      if (includeProposals) {
        exportData.proposals = await this.getBusinessProposals(businessId);
      }

      // Include votes if requested
      if (includeVotes) {
        exportData.votes = await this.getBusinessVotes(businessId);
      }

      // Include pending votes if requested
      if (includePending) {
        exportData.pendingVotes = await this.getPendingVotes(businessId);
      }

      // Include statistics
      exportData.statistics = await this.getVotingStats(businessId);

      return {
        data: exportData,
        format,
        generatedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Export voting data error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to export voting data: ${error.message}`, 500, 'EXPORT_FAILED');
    }
  }

  private validateVoteData(voteData: {
  businessId: string;
  proposalId: string;
  voteId: string;
  voteChoice: string;
  voterAddress?: string;
}): void {
  // Validate voteChoice enum
  const validChoices = ['for', 'against', 'abstain'];
  if (!validChoices.includes(voteData.voteChoice)) {
    throw createAppError(`Invalid vote choice. Must be one of: ${validChoices.join(', ')}`, 400, 'INVALID_VOTE_CHOICE');
  }

  // Validate voterAddress format if provided
  if (voteData.voterAddress && !/^0x[a-fA-F0-9]{40}$/.test(voteData.voterAddress)) {
    throw createAppError('Invalid voter address format', 400, 'INVALID_VOTER_ADDRESS');
  }

  // Validate required fields
  if (!voteData.businessId?.trim()) {
    throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
  }
  if (!voteData.proposalId?.trim()) {
    throw createAppError('Proposal ID is required', 400, 'MISSING_PROPOSAL_ID');
  }
  if (!voteData.voteId?.trim()) {
    throw createAppError('Vote ID is required', 400, 'MISSING_VOTE_ID');
  }
}

/**
 * Validate product selection data against model constraints
 */
private validateProductSelection(selectionData: {
  businessId: string;
  proposalId: string;
  voteId: string;
  selectedProductId: string;
  userId: string;
}): void {
  // Validate required fields
  if (!selectionData.businessId?.trim()) {
    throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
  }
  if (!selectionData.proposalId?.trim()) {
    throw createAppError('Selection round ID is required', 400, 'MISSING_PROPOSAL_ID');
  }
  if (!selectionData.voteId?.trim()) {
    throw createAppError('Selection ID is required', 400, 'MISSING_VOTE_ID');
  }
  if (!selectionData.selectedProductId?.trim()) {
    throw createAppError('Product ID is required', 400, 'MISSING_PRODUCT_ID');
  }
  if (!selectionData.userId?.trim()) {
    throw createAppError('User ID is required', 400, 'MISSING_USER_ID');
  }

  // Validate field lengths
  if (selectionData.businessId.length > 100) {
    throw createAppError('Business ID cannot exceed 100 characters', 400, 'BUSINESS_ID_TOO_LONG');
  }
  if (selectionData.proposalId.length > 100) {
    throw createAppError('Proposal ID cannot exceed 100 characters', 400, 'PROPOSAL_ID_TOO_LONG');
  }
  if (selectionData.voteId.length > 100) {
    throw createAppError('Vote ID cannot exceed 100 characters', 400, 'VOTE_ID_TOO_LONG');
  }
  if (selectionData.userId.length > 100) {
    throw createAppError('User ID cannot exceed 100 characters', 400, 'USER_ID_TOO_LONG');
  }

  // Validate product ID format (adjust regex based on your product ID format)
  // This assumes alphanumeric with hyphens and underscores - adjust as needed
  if (!/^[a-zA-Z0-9_-]+$/.test(selectionData.selectedProductId)) {
    throw createAppError('Invalid product ID format. Only letters, numbers, hyphens and underscores allowed.', 400, 'INVALID_PRODUCT_ID');
  }

  // Validate product ID length
  if (selectionData.selectedProductId.length > 50) {
    throw createAppError('Product ID cannot exceed 50 characters', 400, 'PRODUCT_ID_TOO_LONG');
  }
}
}