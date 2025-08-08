// src/services/votes.service.ts

import { Contract, getBytes } from 'ethers';
import votingFactoryAbi from '../abi/votingFactoryAbi.json';
import votingAbi        from '../abi/votingAbi.json';
import { BrandSettings } from '../models/brandSettings.model';
import { Subscription }  from '../models/subscription.model';
import { VotingRecord }  from '../models/votingRecord.model';
import * as billingService from './billing.service';
import { notifyBrandOfNewVote } from './notification.service';
import { getProvider, getSigner } from './blockchain/provider.service';

const VOTING_FACTORY_ADDRESS = process.env.VOTING_FACTORY_ADDRESS!;

const provider = getProvider();
const signer   = getSigner();


/** Factory used only to deploy new brand contracts */
const factory  = new Contract(
  VOTING_FACTORY_ADDRESS,
  votingFactoryAbi,
  signer
);

type Proposal   = { proposalId: string; description: string };
type VoteResult = { voter: string; proposalId: string; txHash: string };

/**
 * Deploy a new Voting contract for a brand and record its address.
 */
export async function deployVotingContract(
  businessId: string
): Promise<{ votingAddress: string; txHash: string }> {
  const tx      = await factory.deployVoting();
  const receipt = await tx.wait();
  const evt     = receipt.events?.find((e: any) => e.event === 'VotingDeployed');
  if (!evt) throw new Error('VotingDeployed event missing');

  const votingAddress = evt.args.votingAddress as string;
  await BrandSettings.findOneAndUpdate(
    { business: businessId },
    { voteContract: votingAddress },
    { new: true, upsert: true }
  );
  return { votingAddress, txHash: receipt.transactionHash };
}

/**
 * Create a new proposal on the brand's own Voting contract.
 */
export async function createProposal(
  businessId: string,
  description: string
): Promise<Proposal & { txHash: string }> {
  const settings = await BrandSettings.findOne({ business: businessId });
  if (!settings?.voteContract) {
    throw new Error('No voting contract deployed for this brand');
  }

  const voteContract = new Contract(
    settings.voteContract,
    votingAbi,
    signer
  );
  const tx      = await voteContract.createProposal(description);
  const receipt = await tx.wait();
  const evt     = receipt.events?.find((e: any) => e.event === 'ProposalCreated');
  if (!evt) throw new Error('ProposalCreated event missing');

  const pid = evt.args.proposalId.toString();
  return { proposalId: pid, description, txHash: receipt.transactionHash };
}

/**
 * Batch‐submit a group of votes for a brand, enforcing subscription limits.
 */
export async function batchSubmitVotes(
  businessId: string,
  proposalIds: string[],
  voteIds:     string[],
  signatures:  string[]
): Promise<{ txHash: string }> {

  // 1) enforce subscription quota
  const sub = await Subscription.findOne({ business: businessId });
  if (!sub) throw new Error('Subscription not found');

  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const usedVotes   = await VotingRecord.countDocuments({
    business:  businessId,
    timestamp: { $gte: windowStart }
  });
  const batchSize = proposalIds.length;

  if (sub.voteLimit >= 0) {
    const projected = usedVotes + batchSize;
    if (projected > sub.voteLimit) {
      const overage = projected - sub.voteLimit;
      if (!sub.allowOverage) {
        throw { statusCode: 402, message: `Monthly vote limit of ${sub.voteLimit} exceeded by ${overage}` };
      }
      await billingService.charge(businessId, overage * sub.surchargePerVote, 'vote overage');
    }
  }

  // 2) look up brand's voting contract
  const settings = await BrandSettings.findOne({ business: businessId });
  if (!settings?.voteContract) throw new Error('No voting contract deployed');
  
  const voteContract = new Contract(
    settings.voteContract,
    votingAbi,
    signer
  );

  // 3) send batch on‐chain
   const tx = await voteContract.batchSubmitVote(
    proposalIds.map(id => BigInt(id)),
    voteIds,
    signatures.map(sig => getBytes(sig))   // ← getBytes for hex → bytes
  );
  const { transactionHash } = await tx.wait();

  // 4) record each vote & notify brand
  for (let i = 0; i < proposalIds.length; i++) {
    await VotingRecord.create({
      business:   businessId,
      proposalId: proposalIds[i],
      timestamp:  new Date()
    });
    await notifyBrandOfNewVote(businessId, proposalIds[i]);
  }

  return { txHash: transactionHash };
}

/**
 * List all proposals for this brand.
 */
export async function listProposals(
  businessId: string
): Promise<Array<{ proposalId: string; description: string }>> {
  const settings = await BrandSettings.findOne({ business: businessId });
  if (!settings?.voteContract) throw new Error('No voting contract deployed');

  const voteContract = new Contract(
    settings.voteContract,
    votingAbi,
    provider
  );

  // fetch raw event logs
  const rawEvents = await voteContract.queryFilter(
    voteContract.filters.ProposalCreated()
  );

  // cast each event to your expected shape
  return rawEvents.map((e) => {
    const evt = e as unknown as {
      args: { proposalId: bigint; metadataUri: string };
    };
    return {
      proposalId: evt.args.proposalId.toString(),
      description: evt.args.metadataUri
    };
  });
}

/**
 * List all votes cast for this brand.
 */
export async function listVotes(
  businessId: string
): Promise<Array<{ voter: string; proposalId: string; txHash: string }>> {
  const settings = await BrandSettings.findOne({ business: businessId });
  if (!settings?.voteContract) throw new Error('No voting contract deployed');

  const voteContract = new Contract(
    settings.voteContract,
    votingAbi,
    provider
  );

  const rawEvents = await voteContract.queryFilter(
    voteContract.filters.VoteCast()
  );

  return rawEvents.map((e) => {
    const evt = e as unknown as {
      args: { voter: string; proposalId: bigint };
      transactionHash: string;
    };
    return {
      voter:      evt.args.voter,
      proposalId: evt.args.proposalId.toString(),
      txHash:     evt.transactionHash
    };
  });
}






