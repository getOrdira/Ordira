import { Subscription } from '../../models/subscription.model';
import { VotingRecord } from '../../models/votingRecord.model';
import { NftCertificate } from '../../models/nftCertificate.model';
import { BillingService } from '../external/billing.service';

export class SubscriptionService {
  private billingService = new BillingService();

  async checkVotingLimits(businessId: string, votesToAdd: number = 1): Promise<void> {
    const sub = await Subscription.findOne({ business: businessId });
    if (!sub) throw new Error('Subscription not found');

    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usedVotes = await VotingRecord.countDocuments({
      business: businessId,
      timestamp: { $gte: windowStart }
    });

    if (sub.voteLimit >= 0) {
      const projected = usedVotes + votesToAdd;
      if (projected > sub.voteLimit) {
        const overage = projected - sub.voteLimit;
        if (!sub.allowOverage) {
          throw new Error(`Monthly vote limit of ${sub.voteLimit} exceeded by ${overage}`);
        }
        await this.billingService.chargeOverage(businessId, overage * sub.surchargePerVote, 'vote overage');
      }
    }
  }

  async checkNftLimits(businessId: string, nftsToMint: number = 1): Promise<void> {
    const sub = await Subscription.findOne({ business: businessId });
    if (!sub) throw new Error('Subscription not found');

    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usedMints = await NftCertificate.countDocuments({
      business: businessId,
      mintedAt: { $gte: windowStart }
    });

    if (sub.nftLimit >= 0) {
      const projected = usedMints + nftsToMint;
      if (projected > sub.nftLimit) {
        const overage = projected - sub.nftLimit;
        if (!sub.allowOverage) {
          throw new Error(`NFT limit of ${sub.nftLimit} per 30 days exceeded`);
        }
        await this.billingService.chargeOverage(businessId, overage * sub.surchargePerNft, 'nft overage');
      }
    }
  }

  async getVotingLimits(businessId: string) {
    const sub = await Subscription.findOne({ business: businessId });
    if (!sub) throw new Error('Subscription not found');

    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usedLast30d = await VotingRecord.countDocuments({
      business: businessId,
      timestamp: { $gte: windowStart }
    });

    return {
      voteLimit: sub.voteLimit,
      usedLast30d,
      remainingVotes: sub.voteLimit >= 0 ? Math.max(sub.voteLimit - usedLast30d, 0) : 'unlimited'
    };
  }

  async getNftLimits(businessId: string) {
    const sub = await Subscription.findOne({ business: businessId });
    if (!sub) throw new Error('Subscription not found');

    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usedLast30d = await NftCertificate.countDocuments({
      business: businessId,
      mintedAt: { $gte: windowStart }
    });

    return {
      nftLimit: sub.nftLimit,
      usedLast30d,
      remainingCertificates: sub.nftLimit >= 0 ? Math.max(sub.nftLimit - usedLast30d, 0) : 'unlimited'
    };
  }
}