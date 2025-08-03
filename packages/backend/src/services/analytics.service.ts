// src/services/analytics.service.ts

import { JsonRpcProvider, Contract } from 'ethers';
import voteAbi               from '../abi/voteAbi.json';
import { Subscription }      from '../models/subscription.model';
import { VotingRecord }      from '../models/votingRecord.model';
import { NftCertificate }    from '../models/nftCertificate.model';
import { BrandSettings }     from '../models/brandSettings.model';

const provider = new JsonRpcProvider(process.env.BASE_RPC_URL!);

type VoteAnalytics = {
  totalOnChainVotes: number;
  byProposal:        Record<string, number>;
  usedLast30d:       number;
  voteLimit:         number;
  remainingVotes:    number | 'unlimited';
};

type NftAnalytics = {
  usedLast30d:             number;
  nftLimit:                number;
  remainingCertificates:   number | 'unlimited';
};

type Analytics = {
  votes:        VoteAnalytics;
  certificates: NftAnalytics;
};

/**
 * Aggregates vote counts per-proposal, restricted to the brand’s own contract,
 * plus subscription usage & remaining.
 */
export async function getVotesAnalytics(
  businessId: string
): Promise<VoteAnalytics> {
  // 1) Lookup this brand’s voting contract
  const settings = await BrandSettings.findOne({ business: businessId });
  if (!settings?.voteContract) {
    throw new Error('No voting contract deployed for this brand');
  }

  const voteContract = new Contract(
    settings.voteContract,
    voteAbi,
    provider
  );

  // 2) On-chain VoteCast events *only* from that contract
  const rawEvents = await voteContract.queryFilter(
    voteContract.filters.VoteCast()
  );

  const byProposal: Record<string, number> = {};
  for (const raw of rawEvents) {
    // cast each event so TS knows about .args.proposalId
    const evt = raw as unknown as { args: { proposalId: bigint } };
    const pid = evt.args.proposalId.toString();
    byProposal[pid] = (byProposal[pid] || 0) + 1;
  }

  const totalOnChainVotes = rawEvents.length;

  // 3) Off-chain 30-day usage
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const usedLast30d = await VotingRecord.countDocuments({
    business:  businessId,
    timestamp: { $gte: windowStart }
  });

  // 4) Subscription limits
  const sub = await Subscription.findOne({ business: businessId });
  if (!sub) {
    throw new Error('Subscription not found for this brand');
  }
  const voteLimit = sub.voteLimit;
  const remainingVotes =
    voteLimit >= 0
      ? Math.max(voteLimit - usedLast30d, 0)
      : 'unlimited';

  return { totalOnChainVotes, byProposal, usedLast30d, voteLimit, remainingVotes };
}

export async function getTransactionsAnalytics(
  businessId: string
): Promise<any[]> {
  // TODO: Query your blockchain indexer or logs filtered by business’s contract
  return [];
}

/**
 * Aggregates NFT mint usage and subscription remaining.
 */
export async function getNftAnalytics(
  businessId: string
): Promise<NftAnalytics> {
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const usedLast30d = await NftCertificate.countDocuments({
    business:  businessId,
    mintedAt:  { $gte: windowStart }
  });

  const sub = await Subscription.findOne({ business: businessId });
  if (!sub) {
    throw new Error('Subscription not found for this brand');
  }
  const nftLimit = sub.nftLimit;
  const remainingCertificates =
    nftLimit >= 0
      ? Math.max(nftLimit - usedLast30d, 0)
      : 'unlimited';

  return { usedLast30d, nftLimit, remainingCertificates };
}

/**
 * Combined analytics for both votes and NFT certificates.
 */
export async function getAnalytics(
  businessId: string
): Promise<Analytics> {
  const [votes, certificates] = await Promise.all([
    getVotesAnalytics(businessId),
    getNftAnalytics(businessId),
    getTransactionsAnalytics(businessId)
  ]);
  return { votes, certificates };
}


