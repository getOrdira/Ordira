import { VotingRecord } from '../../models/votingRecord.model';
import { NftCertificate } from '../../models/nftCertificate.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { SubscriptionService } from './subscription.service';
import { BlockchainContractsService } from '../blockchain/contracts.service';

type VoteAnalytics = {
  totalOnChainVotes: number;
  byProposal: Record<string, number>;
  usedLast30d: number;
  voteLimit: number;
  remainingVotes: number | 'unlimited';
};

type NftAnalytics = {
  usedLast30d: number;
  nftLimit: number;
  remainingCertificates: number | 'unlimited';
};

type Analytics = {
  votes: VoteAnalytics;
  certificates: NftAnalytics;
};

export class AnalyticsBusinessService {
  private subscriptionService = new SubscriptionService();
  private contractsService = new BlockchainContractsService();

  async getVotingAnalytics(businessId: string): Promise<VoteAnalytics> {
    // Get on-chain data
    const settings = await BrandSettings.findOne({ business: businessId });
    let totalOnChainVotes = 0;
    let byProposal: Record<string, number> = {};

    if (settings?.voteContract) {
      const events = await this.contractsService.getVoteEventsFromContract(settings.voteContract);
      totalOnChainVotes = events.length;
      
      for (const event of events) {
        const evt = event as any;
        const pid = evt.args.proposalId.toString();
        byProposal[pid] = (byProposal[pid] || 0) + 1;
      }
    }

    // Get 30-day usage and limits
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usedLast30d = await VotingRecord.countDocuments({
      business: businessId,
      timestamp: { $gte: windowStart }
    });

    const limits = await this.subscriptionService.getVotingLimits(businessId);

    return {
      totalOnChainVotes,
      byProposal,
      usedLast30d,
      voteLimit: limits.voteLimit,
      remainingVotes: limits.remainingVotes
    };
  }

  async getNftAnalytics(businessId: string): Promise<NftAnalytics> {
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usedLast30d = await NftCertificate.countDocuments({
      business: businessId,
      mintedAt: { $gte: windowStart }
    });

    const limits = await this.subscriptionService.getNftLimits(businessId);

    return {
      usedLast30d,
      nftLimit: limits.nftLimit,
      remainingCertificates: limits.remainingCertificates
    };
  }

  async getTransactionAnalytics(businessId: string): Promise<any[]> {
    // TODO: Implement blockchain transaction analysis
    // This could involve parsing transaction logs for the business's contracts
    return [];
  }

  /**
   * Combined analytics for both votes and NFT certificates.
   */
  async getAnalytics(businessId: string): Promise<Analytics> {
    const [votes, certificates] = await Promise.all([
      this.getVotingAnalytics(businessId),
      this.getNftAnalytics(businessId)
    ]);
    return { votes, certificates };
  }
}