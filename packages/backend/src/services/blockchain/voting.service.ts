// services/blockchain/voting.service.ts
import { Contract, getBytes } from 'ethers';
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
 * Custom error class for blockchain operations with status codes
 */
class BlockchainError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'BlockchainError';
    this.statusCode = statusCode;
  }
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
      throw new BlockchainError('VOTING_FACTORY_ADDRESS not configured', 500);
    }
    return BlockchainProviderService.getContract(factoryAddress, votingFactoryAbi);
  }

  /**
 * Deploy a new voting contract for a brand
 */
static async deployVotingContract(businessId: string): Promise<ContractDeployment> {
  try {
    const votingFactory = this.getVotingFactoryContract();
    const tx = await votingFactory.deployVoting();
    const receipt = await tx.wait();
    
    const evt = receipt.events?.find((e: any) => e.event === 'VotingDeployed');
    if (!evt) {
      throw new BlockchainError('VotingDeployed event not found in transaction receipt', 500);
    }

    const contractAddress = evt.args.votingAddress as string;
    
    return {
      address: contractAddress,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      businessId // This uses the businessId parameter passed to the method
    };
  } catch (error: any) {
    if (error instanceof BlockchainError) {
      throw error;
    }
    
    // Handle specific blockchain errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new BlockchainError('Insufficient funds for voting contract deployment', 400);
    }
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      throw new BlockchainError('Unable to estimate gas for voting contract deployment', 400);
    }
    if (error.code === 'NETWORK_ERROR') {
      throw new BlockchainError('Blockchain network error during voting contract deployment', 503);
    }
    
    throw new BlockchainError(`Failed to deploy voting contract: ${error.message}`, 500);
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
      // Validate input parameters
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!metadataUri?.trim()) {
        throw new BlockchainError('Metadata URI is required', 400);
      }
      
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      const votingContract = BlockchainProviderService.getContract(contractAddress, votingAbi);
      
      const tx = await votingContract.createProposal(metadataUri);
      const receipt = await tx.wait();
      
      const evt = receipt.events?.find((e: any) => e.event === 'ProposalCreated');
      if (!evt) {
        throw new BlockchainError('ProposalCreated event not found in transaction receipt', 500);
      }

      const proposalId = evt.args.proposalId.toString();
      
      return {
        proposalId,
        txHash: receipt.transactionHash
      };
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      // Handle specific blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new BlockchainError('Insufficient funds for proposal creation', 400);
      }
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new BlockchainError('Unable to estimate gas for proposal creation', 400);
      }
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Voting contract call failed - contract may not exist or method unavailable', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error during proposal creation', 503);
      }
      
      throw new BlockchainError(`Failed to create proposal: ${error.message}`, 500);
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
      // Validate input parameters
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
        throw new BlockchainError('Proposal IDs array is required and cannot be empty', 400);
      }
      if (!Array.isArray(voteIds) || voteIds.length === 0) {
        throw new BlockchainError('Vote IDs array is required and cannot be empty', 400);
      }
      if (!Array.isArray(signatures) || signatures.length === 0) {
        throw new BlockchainError('Signatures array is required and cannot be empty', 400);
      }
      
      // Validate array lengths match
      if (proposalIds.length !== voteIds.length || proposalIds.length !== signatures.length) {
        throw new BlockchainError('Proposal IDs, vote IDs, and signatures arrays must have the same length', 400);
      }
      
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      const votingContract = BlockchainProviderService.getContract(contractAddress, votingAbi);
      
      // Convert proposal IDs to BigInt for the contract
      const proposalIdsBigInt = proposalIds.map(id => {
        if (!id || isNaN(Number(id))) {
          throw new BlockchainError(`Invalid proposal ID: ${id}`, 400);
        }
        return BigInt(id);
      });
      
      // Convert signatures to bytes
      const signatureBytes = signatures.map((sig, index) => {
        try {
          return getBytes(sig);
        } catch {
          throw new BlockchainError(`Invalid signature format at index ${index}`, 400);
        }
      });
      
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
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      // Handle specific blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new BlockchainError('Insufficient funds for batch vote submission', 400);
      }
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new BlockchainError('Unable to estimate gas for batch vote submission', 400);
      }
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Voting contract call failed - contract may not exist or invalid vote data', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error during vote submission', 503);
      }
      
      throw new BlockchainError(`Failed to batch submit votes: ${error.message}`, 500);
    }
  }

  /**
   * Get all proposal events from a voting contract
   */
  static async getProposalEvents(contractAddress: string): Promise<ProposalEvent[]> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
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
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Voting contract not found or unable to query proposal events', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching proposal events', 503);
      }
      
      throw new BlockchainError(`Failed to get proposal events: ${error.message}`, 500);
    }
  }

  /**
   * Get all vote events from a voting contract
   */
  static async getVoteEvents(contractAddress: string): Promise<VoteEvent[]> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
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
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Voting contract not found or unable to query vote events', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching vote events', 503);
      }
      
      throw new BlockchainError(`Failed to get vote events: ${error.message}`, 500);
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
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      throw new BlockchainError(`Failed to get vote counts: ${error.message}`, 500);
    }
  }

  /**
   * Get voting contract information
   */
  static async getContractInfo(contractAddress: string): Promise<VotingContractInfo> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
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
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Voting contract not found or unable to retrieve contract info', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching contract info', 503);
      }
      
      throw new BlockchainError(`Failed to get contract info: ${error.message}`, 500);
    }
  }

  /**
   * Check if a voting contract address is valid
   */
  static async isValidVotingContract(contractAddress: string): Promise<boolean> {
    try {
      if (!contractAddress?.trim()) {
        return false;
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        return false;
      }
      
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
    } catch (error: any) {
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching gas price', 503);
      }
      
      throw new BlockchainError(`Failed to get gas price: ${error.message}`, 500);
    }
  }

  /**
   * Get proposal details from contract
   */
  static async getProposal(contractAddress: string, proposalId: string): Promise<ProposalInfo> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!proposalId?.trim()) {
        throw new BlockchainError('Proposal ID is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      if (isNaN(Number(proposalId))) {
        throw new BlockchainError('Invalid proposal ID format - must be a number', 400);
      }
      
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
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Proposal not found or voting contract unavailable', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching proposal', 503);
      }
      
      throw new BlockchainError(`Failed to get proposal: ${error.message}`, 500);
    }
  }
}