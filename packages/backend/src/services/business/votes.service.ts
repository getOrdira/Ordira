import { BrandSettings } from '../../models/brandSettings.model';
import { VotingRecord } from '../../models/votingRecord.model';
import { PendingVote } from '../../models/pendingVote.model';
import { BlockchainVotingService } from '../blockchain/voting.service';
import { NotificationService } from '../external/notifications.service';
import { BillingService } from '../external/billing.service';
import { SubscriptionService } from './subscription.service';

export class VotingBusinessService {
  private blockchainVoting = new BlockchainVotingService();
  private notificationService = new NotificationService();
  private billingService = new BillingService();
  private subscriptionService = new SubscriptionService();

  async deployVotingContractForBusiness(businessId: string): Promise<{ votingAddress: string; txHash: string }> {
    // Deploy contract on blockchain
    const { address, txHash } = await this.blockchainVoting.deployVotingContract();
    
    // Save contract address to business settings
    await BrandSettings.findOneAndUpdate(
      { business: businessId },
      { voteContract: address },
      { new: true, upsert: true }
    );

    return { votingAddress: address, txHash };
  }

  async createProposalForBusiness(businessId: string, description: string): Promise<{ proposalId: string; txHash: string }> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.voteContract) {
      throw new Error('No voting contract deployed for this business');
    }

    return await this.blockchainVoting.createProposal(settings.voteContract, description);
  }

  async processPendingVotes(businessId: string): Promise<{ txHash: string } | null> {
    const THRESHOLD = 20;
    const pending = await PendingVote.find({ businessId });
    
    if (pending.length < THRESHOLD) {
      return null;
    }

    // Check subscription limits
    await this.subscriptionService.checkVotingLimits(businessId, pending.length);

    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.voteContract) {
      throw new Error('No voting contract deployed');
    }

    const proposalIds = pending.map(v => v.proposalId);
    const voteIds = pending.map(v => v.voteId);
    const signatures = voteIds.map(() => ''); // Generate signatures as needed

    // Submit votes on blockchain
    const { txHash } = await this.blockchainVoting.batchSubmitVotes(
      settings.voteContract,
      proposalIds,
      voteIds,
      signatures
    );

    // Record votes in database
    for (const vote of pending) {
      await VotingRecord.create({
        business: businessId,
        proposalId: vote.proposalId,
        voteId: vote.voteId,
        timestamp: new Date()
      });

      // Send notification
      await this.notificationService.notifyBrandOfNewVote(businessId, vote.proposalId);
    }

    // Clear pending votes
    await PendingVote.deleteMany({ businessId });

    return { txHash };
  }

  async getBusinessProposals(businessId: string): Promise<Array<{ proposalId: string; description: string }>> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.voteContract) {
      return [];
    }

    return await this.blockchainVoting.getProposalsFromContract(settings.voteContract);
  }

  async getBusinessVotes(businessId: string): Promise<Array<{ voter: string; proposalId: string; txHash: string }>> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.voteContract) {
      return [];
    }

    return await this.blockchainVoting.getVotesFromContract(settings.voteContract);
  }

  async recordPendingVote(businessId: string, proposalId: string, userId: string): Promise<void> {
    const voteId = new Date().getTime().toString();
    
    try {
      await PendingVote.create({ businessId, proposalId, userId, voteId });
    } catch (e: any) {
      if (e.code === 11000) {
        throw new Error(`Already voted for proposal ${proposalId}`);
      }
      throw e;
    }
  }
}