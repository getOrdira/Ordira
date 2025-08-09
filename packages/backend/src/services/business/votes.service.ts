import { BrandSettings } from '../../models/brandSettings.model';
import { VotingRecord } from '../../models/votingRecord.model';
import { PendingVote } from '../../models/pendingVote.model';
import { VotingService } from '../blockchain/voting.service';
import { NotificationsService } from '../external/notifications.service';
import { BillingService } from '../external/billing.service';
import { SubscriptionService } from './subscription.service';

/**
 * Custom error class for voting business operations with status codes
 */
class VotingBusinessError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'VotingBusinessError';
    this.statusCode = statusCode;
  }
}

export class VotingBusinessService {
  private notificationService = new NotificationsService();
  private billingService = new BillingService();
  private subscriptionService = new SubscriptionService();

  async deployVotingContractForBusiness(businessId: string): Promise<{ votingAddress: string; txHash: string }> {
    try {
      // Validate input
      if (!businessId?.trim()) {
        throw new VotingBusinessError('Business ID is required', 400);
      }

      // Deploy contract on blockchain using static method
      const { address, txHash } = await VotingService.deployVotingContract();
      
      // Save contract address to business settings
      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { voteContract: address },
        { new: true, upsert: true }
      );

      if (!updatedSettings) {
        throw new VotingBusinessError('Failed to save voting contract address to business settings', 500);
      }

      return { votingAddress: address, txHash };
    } catch (error: any) {
      if (error instanceof VotingBusinessError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.statusCode) {
        throw new VotingBusinessError(`Failed to deploy voting contract: ${error.message}`, error.statusCode);
      }

      // Handle database errors
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw new VotingBusinessError('Database error while deploying voting contract', 503);
      }

      throw new VotingBusinessError(`Failed to deploy voting contract for business: ${error.message}`, 500);
    }
  }

  async createProposalForBusiness(businessId: string, description: string): Promise<{ proposalId: string; txHash: string }> {
    try {
      // Validate inputs
      if (!businessId?.trim()) {
        throw new VotingBusinessError('Business ID is required', 400);
      }
      if (!description?.trim()) {
        throw new VotingBusinessError('Proposal description is required', 400);
      }
      if (description.length > 1000) {
        throw new VotingBusinessError('Proposal description too long (max 1000 characters)', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.voteContract) {
        throw new VotingBusinessError('No voting contract deployed for this business', 404);
      }

      // Create proposal using static method
      return await VotingService.createProposal(settings.voteContract, description);
    } catch (error: any) {
      if (error instanceof VotingBusinessError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.statusCode) {
        throw new VotingBusinessError(`Failed to create proposal: ${error.message}`, error.statusCode);
      }

      throw new VotingBusinessError(`Failed to create proposal for business: ${error.message}`, 500);
    }
  }

  async processPendingVotes(businessId: string): Promise<{ txHash: string } | null> {
    try {
      if (!businessId?.trim()) {
        throw new VotingBusinessError('Business ID is required', 400);
      }

      const THRESHOLD = 20;
      const pending = await PendingVote.find({ businessId });
      
      if (pending.length < THRESHOLD) {
        return null;
      }

      // Check subscription limits
      await this.subscriptionService.checkVotingLimits(businessId, pending.length);

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.voteContract) {
        throw new VotingBusinessError('No voting contract deployed for this business', 404);
      }

      const proposalIds = pending.map(v => v.proposalId);
      const voteIds = pending.map(v => v.voteId);
      const signatures = voteIds.map(() => ''); // Generate signatures as needed

      // Validate arrays have content
      if (proposalIds.length === 0 || voteIds.length === 0) {
        throw new VotingBusinessError('No valid votes to process', 400);
      }

      // Submit votes on blockchain using static method
      const { txHash } = await VotingService.batchSubmitVotes(
        settings.voteContract,
        proposalIds,
        voteIds,
        signatures
      );

      // Record votes in database
      for (const vote of pending) {
        try {
          await VotingRecord.create({
            business: businessId,
            proposalId: vote.proposalId,
            voteId: vote.voteId,
            timestamp: new Date()
          });

          // Send notification
          await this.notificationService.notifyBrandOfNewVote(businessId, vote.proposalId);
        } catch (notificationError: any) {
          // Log notification errors but don't fail the process
          console.warn(`Failed to send notification for vote ${vote.voteId}:`, notificationError.message);
        }
      }

      // Clear pending votes
      await PendingVote.deleteMany({ businessId });

      return { txHash };
    } catch (error: any) {
      if (error instanceof VotingBusinessError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.statusCode) {
        throw new VotingBusinessError(`Failed to process pending votes: ${error.message}`, error.statusCode);
      }

      // Handle database errors
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw new VotingBusinessError('Database error while processing pending votes', 503);
      }

      throw new VotingBusinessError(`Failed to process pending votes: ${error.message}`, 500);
    }
  }

  async getBusinessProposals(businessId: string): Promise<Array<{ proposalId: string; description: string }>> {
    try {
      if (!businessId?.trim()) {
        throw new VotingBusinessError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.voteContract) {
        return [];
      }

      // Get proposals using static method
      return await VotingService.getProposalEvents(settings.voteContract);
    } catch (error: any) {
      if (error instanceof VotingBusinessError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.statusCode) {
        throw new VotingBusinessError(`Failed to get business proposals: ${error.message}`, error.statusCode);
      }

      throw new VotingBusinessError(`Failed to get business proposals: ${error.message}`, 500);
    }
  }

  async getBusinessVotes(businessId: string): Promise<Array<{ voter: string; proposalId: string; txHash: string }>> {
    try {
      if (!businessId?.trim()) {
        throw new VotingBusinessError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.voteContract) {
        return [];
      }

      // Get votes using static method
      const voteEvents = await VotingService.getVoteEvents(settings.voteContract);
      
      // Transform the data to match expected format
      return voteEvents.map(event => ({
        voter: event.voter,
        proposalId: event.proposalId,
        txHash: event.txHash
      }));
    } catch (error: any) {
      if (error instanceof VotingBusinessError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.statusCode) {
        throw new VotingBusinessError(`Failed to get business votes: ${error.message}`, error.statusCode);
      }

      throw new VotingBusinessError(`Failed to get business votes: ${error.message}`, 500);
    }
  }

  async recordPendingVote(businessId: string, proposalId: string, userId: string): Promise<void> {
    try {
      // Validate inputs
      if (!businessId?.trim()) {
        throw new VotingBusinessError('Business ID is required', 400);
      }
      if (!proposalId?.trim()) {
        throw new VotingBusinessError('Proposal ID is required', 400);
      }
      if (!userId?.trim()) {
        throw new VotingBusinessError('User ID is required', 400);
      }

      const voteId = new Date().getTime().toString();
      
      await PendingVote.create({ businessId, proposalId, userId, voteId });
    } catch (error: any) {
      if (error instanceof VotingBusinessError) {
        throw error;
      }

      // Handle duplicate vote error
      if (error.code === 11000) {
        throw new VotingBusinessError(`User has already voted for proposal ${proposalId}`, 409);
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new VotingBusinessError(`Validation failed: ${validationErrors.join(', ')}`, 400);
      }

      throw new VotingBusinessError(`Failed to record pending vote: ${error.message}`, 500);
    }
  }

  /**
   * Get voting statistics for a business
   */
  async getVotingStats(businessId: string): Promise<{
    totalProposals: number;
    totalVotes: number;
    pendingVotes: number;
    contractAddress?: string;
  }> {
    try {
      if (!businessId?.trim()) {
        throw new VotingBusinessError('Business ID is required', 400);
      }

      const [settings, votingRecords, pendingVotes] = await Promise.all([
        BrandSettings.findOne({ business: businessId }),
        VotingRecord.countDocuments({ business: businessId }),
        PendingVote.countDocuments({ businessId })
      ]);

      let totalProposals = 0;
      let totalVotes = 0;

      if (settings?.voteContract) {
        try {
          const contractInfo = await VotingService.getContractInfo(settings.voteContract);
          totalProposals = contractInfo.totalProposals;
          totalVotes = contractInfo.totalVotes;
        } catch (blockchainError) {
          // If blockchain call fails, use database records
          console.warn('Failed to get blockchain voting stats, using database records');
        }
      }

      return {
        totalProposals,
        totalVotes: Math.max(totalVotes, votingRecords), // Use the higher of blockchain or DB count
        pendingVotes,
        contractAddress: settings?.voteContract
      };
    } catch (error: any) {
      if (error instanceof VotingBusinessError) {
        throw error;
      }

      throw new VotingBusinessError(`Failed to get voting stats: ${error.message}`, 500);
    }
  }

  /**
   * Check if a business has a voting contract deployed
   */
  async hasVotingContract(businessId: string): Promise<boolean> {
    try {
      if (!businessId?.trim()) {
        return false;
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      return !!(settings?.voteContract);
    } catch (error) {
      return false;
    }
  }
}