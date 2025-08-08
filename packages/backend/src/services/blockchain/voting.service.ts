// services/blockchain/voting.service.ts
import { getBytes } from 'ethers';
import { BlockchainProviderService } from './provider.service';
import { VoteEvent, ContractDeployment, VotingContractInfo, ProposalInfo } from '../types/blockchain.types';
import votingFactoryAbi from '../../abi/votingFactoryAbi.json';
import votingAbi from '../../abi/votingAbi.json';

export interface CreateProposalResult {
  proposalId: string;
  txHash: string;
}

export interface BatchVoteResult {
  txHash: string;
  voteCount: number;
}

export interface ProposalEvent {
  proposalId: string;
  description: string;
  txHash: string;
}

/**
 * Pure blockchain service for voting operations
 * No business logic, no database operations - just blockchain interactions
 */
export class VotingService {

  /**
   * Get the voting factory contract instance
   */
  private static getVotingFactoryContract() {
    const factoryAddress = process.env.VOTING_FACTORY_ADDRESS;
    if (!factoryAddress) {
      throw new Error('VOTING_FACTORY_ADDRESS not configured');
    }
    return BlockchainProviderService.getContract(factoryAddress, votingFactoryAbi);
  }

  /**
   * Deploy a new voting contract for a brand
   */
  static async deployVotingContract(): Promise<ContractDeployment> {
    try {
      const votingFactory = this.getVotingFactoryContract();
      const tx = await votingFactory.deployVoting();
      const receipt = await tx.wait();
      
      const evt = receipt.events?.find((e: any) => e.event === 'VotingDeployed');
      if (!evt) {
        throw new Error('VotingDeployed event not found in transaction receipt');
      }

      const contractAddress = evt.args.votingAddress as string;
      
      return {
        address: contractAddress,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      throw new Error(`Failed to deploy voting contract: ${error.message}`);
    }
  }

  /**
   * Create a new proposal on a specific voting contract
   */
  static async createProposal(
    contractAddress: string,
    metadataUri: string
  ): Promise<CreateProposalResult> {
    try {
      const votingContract = BlockchainProviderService.getContract(contractAddress, votingAbi);
      
      const tx = await votingContract.createProposal(metadataUri);
      const receipt = await tx.wait();
      
      const evt = receipt.events?.find((e: any) => e.event === 'ProposalCreated');
      if (!evt) {
        throw new Error('ProposalCreated event not found in transaction receipt');
      }

      const proposalId = evt.args.proposalId.toString();
      
      return {
        proposalId,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      throw new Error(`Failed to create proposal: ${error.message}`);
    }
  }

  /**
   * Submit a batch of votes to a voting contract
   */
  static async batchSubmitVotes(
    contractAddress: string,
    proposalIds: string[],
    voteIds: string[],
    signatures: string[]
  ): Promise<BatchVoteResult> {
    try {
      const votingContract = BlockchainProviderService.getContract(contractAddress, votingAbi);
      
      // Convert proposal IDs to BigInt for the contract
      const proposalIdsBigInt = proposalIds.map(id => BigInt(id));
      
      // Convert signatures to bytes
      const signatureBytes = signatures.map(sig => getBytes(sig));
      
      const tx = await votingContract.batchSubmitVote(
        proposalIdsBigInt,
        voteIds,
        signatureBytes
      );
      
      const receipt = await tx.wait();
      
      return {
        txHash: receipt.transactionHash,
        voteCount: proposalIds.length
      };
    } catch (error) {
      throw new Error(`Failed to batch submit votes: ${error.message}`);
    }
  }

  /**
   * Get all proposal events from a voting contract
   */
  static async getProposalEvents(contractAddress: string): Promise<ProposalEvent[]> {
    try {
      const votingContract = BlockchainProviderService.getReadOnlyContract(contractAddress, votingAbi);
      
      const rawEvents = await votingContract.queryFilter(
        votingContract.filters.ProposalCreated()
      );

      return rawEvents.map((event) => {
        const evt = event as unknown as {
          args: { proposalId: bigint; metadataUri: string };
          transactionHash: string;
        };
        
        return {
          proposalId: evt.args.proposalId.toString(),
          description: evt.args.metadataUri,
          txHash: evt.transactionHash
        };
      });
    } catch (error) {
      throw new Error(`Failed to get proposal events: ${error.message}`);
    }
  }

  /**
   * Get all vote events from a voting contract
   */
  static async getVoteEvents(contractAddress: string): Promise<VoteEvent[]> {
    try {
      const votingContract = BlockchainProviderService.getReadOnlyContract(contractAddress, votingAbi);
      
      const rawEvents = await votingContract.queryFilter(
        votingContract.filters.VoteCast()
      );

      return rawEvents.map((event) => {
        const evt = event as unknown as {
          args: { voteId: string; voter: string; proposalId: bigint };
          transactionHash: string;
        };
        
        return {
          proposalId: evt.args.proposalId.toString(),
          voter: evt.args.voter,
          support: true, // You might need to adjust this based on your contract
          blockNumber: event.blockNumber,
          txHash: evt.transactionHash,
          timestamp: Date.now() // You might want to get actual block timestamp
        };
      });
    } catch (error) {
      throw new Error(`Failed to get vote events: ${error.message}`);
    }
  }

  /**
   * Get vote count for each proposal from blockchain events
   */
  static async getVoteCountsByProposal(contractAddress: string): Promise<Record<string, number>> {
    try {
      const voteEvents = await this.getVoteEvents(contractAddress);
      
      const voteCounts: Record<string, number> = {};
      
      for (const event of voteEvents) {
        const proposalId = event.proposalId;
        voteCounts[proposalId] = (voteCounts[proposalId] || 0) + 1;
      }
      
      return voteCounts;
    } catch (error) {
      throw new Error(`Failed to get vote counts: ${error.message}`);
    }
  }

  /**
   * Get voting contract information
   */
  static async getContractInfo(contractAddress: string): Promise<VotingContractInfo> {
    try {
      const votingContract = BlockchainProviderService.getReadOnlyContract(contractAddress, votingAbi);
      
      const [proposalCount, voteEvents] = await Promise.all([
        votingContract.proposalCount(),
        this.getVoteEvents(contractAddress)
      ]);

      // Count active proposals (you'll need to implement this based on your contract)
      const activeProposals = 0; // Placeholder - implement based on your contract logic

      return {
        contractAddress,
        totalProposals: parseInt(proposalCount.toString()),
        totalVotes: voteEvents.length,
        activeProposals,
        businessId: '' // This would be populated by business layer
      };
    } catch (error) {
      throw new Error(`Failed to get contract info: ${error.message}`);
    }
  }

  /**
   * Check if a voting contract address is valid
   */
  static async isValidVotingContract(contractAddress: string): Promise<boolean> {
    try {
      const votingContract = BlockchainProviderService.getReadOnlyContract(contractAddress, votingAbi);
      
      // Try to call a read-only function to verify it's a valid voting contract
      await votingContract.proposalCount();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current gas price with optimization
   */
  static async getOptimizedGasPrice(): Promise<string> {
    try {
      const feeData = await BlockchainProviderService.getGasPrice();
      // Add 10% to ensure transaction goes through
      const gasPrice = feeData.gasPrice! * BigInt(110) / BigInt(100);
      return gasPrice.toString();
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  /**
   * Get proposal details from contract
   */
  static async getProposal(contractAddress: string, proposalId: string): Promise<ProposalInfo> {
    try {
      const votingContract = BlockchainProviderService.getReadOnlyContract(contractAddress, votingAbi);
      
      // This is a placeholder - implement based on your actual contract structure
      const proposal = await votingContract.proposals(proposalId);
      
      return {
        id: proposalId,
        title: proposal.metadataUri || 'Untitled Proposal',
        description: proposal.metadataUri || '',
        startBlock: parseInt(proposal.startBlock?.toString() || '0'),
        endBlock: parseInt(proposal.endBlock?.toString() || '0'),
        forVotes: parseInt(proposal.forVotes?.toString() || '0'),
        againstVotes: parseInt(proposal.againstVotes?.toString() || '0'),
        abstainVotes: parseInt(proposal.abstainVotes?.toString() || '0'),
        status: 'active', // Implement status logic based on your contract
        creator: proposal.creator || ''
      };
    } catch (error) {
      throw new Error(`Failed to get proposal: ${error.message}`);
    }
  }
}