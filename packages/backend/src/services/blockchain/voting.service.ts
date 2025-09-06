// services/blockchain/voting.service.ts
import { Contract, getBytes } from 'ethers';
import { BlockchainProviderService } from './provider.service';
import { VoteEvent, ContractDeployment, VotingContractInfo, ProposalInfo } from '../types/blockchain.types';
import votingFactoryAbi from '../../abi/votingFactoryAbi.json';
import votingAbi from '../../abi/votingAbi.json';

export interface CreateProposalResult {
  proposalId: string;
  txHash: string;
  businessId?: string;
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

export interface ProductProposalData {
  productId: string;
  title: string;
  description: string;
  images: string[];
  brandId: string;
  category?: string;
  price?: number;
  features?: string[];
}

export interface VoteSubmissionData {
  proposalId: string;
  voterEmail: string;
  voteId: string;
  signature: string;
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
   * Deploy a new voting contract for a business with proper business attribution
   */
  static async deployVotingContract(
    businessId: string,
    votingSettings?: {
      votingDelay?: number;
      votingPeriod?: number;
      quorumPercentage?: number;
    }
  ): Promise<ContractDeployment> {
    try {
      if (!businessId?.trim()) {
        throw new BlockchainError('Business ID is required', 400);
      }
      
      // Validate business ID format (MongoDB ObjectId)
      if (!/^[0-9a-fA-F]{24}$/.test(businessId)) {
        throw new BlockchainError('Invalid business ID format', 400);
      }
      
      const votingFactory = this.getVotingFactoryContract();
      
      // Use default settings if not provided
      const settings = {
        votingDelay: votingSettings?.votingDelay || 1, // 1 second delay
        votingPeriod: votingSettings?.votingPeriod || 259200, // 3 days
        quorumPercentage: votingSettings?.quorumPercentage || 4 // 4% quorum
      };
      
      // Deploy voting contract with relayer as owner (relayer will manage for the business)
      const tx = await votingFactory.deployVotingForSelf(
        settings.votingDelay,
        settings.votingPeriod,
        settings.quorumPercentage
      );
      const receipt = await tx.wait();
      
      const evt = receipt.events?.find((e: any) => e.event === 'VotingDeployed');
      if (!evt) {
        throw new BlockchainError('VotingDeployed event not found in transaction receipt', 500);
      }

      const contractAddress = evt.args.votingAddress as string;
      
      // Store business-contract mapping in database
      await this.storeBusinessContractMapping(businessId, contractAddress, 'voting');
      
      return {
        address: contractAddress,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        businessId,
        votingSettings: settings
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
   * Create a new proposal on a specific voting contract with business validation
   */
  static async createProposal(
    contractAddress: string,
    metadataUri: string,
    businessId: string
  ): Promise<CreateProposalResult> {
    try {
      // Validate input parameters
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!metadataUri?.trim()) {
        throw new BlockchainError('Metadata URI is required', 400);
      }
      if (!businessId?.trim()) {
        throw new BlockchainError('Business ID is required', 400);
      }
      
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      // Validate business ID format (MongoDB ObjectId)
      if (!/^[0-9a-fA-F]{24}$/.test(businessId)) {
        throw new BlockchainError('Invalid business ID format', 400);
      }
      
      // Validate business association with the contract
      await this.validateBusinessContractAssociation(contractAddress, businessId);
      
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
        txHash: receipt.transactionHash,
        businessId
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
    selectedProposalsArray: string[][],
    voteIds: string[],
    voterEmails: string[],
    signatures: string[]
  ): Promise<BatchVoteResult> {
    try {
      // Validate input parameters
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!Array.isArray(selectedProposalsArray) || selectedProposalsArray.length === 0) {
        throw new BlockchainError('Selected proposals array is required and cannot be empty', 400);
      }
      if (!Array.isArray(voteIds) || voteIds.length === 0) {
        throw new BlockchainError('Vote IDs array is required and cannot be empty', 400);
      }
      if (!Array.isArray(voterEmails) || voterEmails.length === 0) {
        throw new BlockchainError('Voter emails array is required and cannot be empty', 400);
      }
      if (!Array.isArray(signatures) || signatures.length === 0) {
        throw new BlockchainError('Signatures array is required and cannot be empty', 400);
      }
      
      // Validate array lengths match
      if (selectedProposalsArray.length !== voteIds.length || 
          selectedProposalsArray.length !== voterEmails.length || 
          selectedProposalsArray.length !== signatures.length) {
        throw new BlockchainError('All arrays must have the same length', 400);
      }
      
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      const votingContract = BlockchainProviderService.getContract(contractAddress, votingAbi);
      
      // Convert selected proposals to BigInt arrays
      const selectedProposalsBigInt = selectedProposalsArray.map(proposals => {
        return proposals.map(id => {
          if (!id || isNaN(Number(id))) {
            throw new BlockchainError(`Invalid proposal ID: ${id}`, 400);
          }
          return BigInt(id);
        });
      });
      
      // Convert vote IDs to BigInt for the contract
      const voteIdsBigInt = voteIds.map(id => {
        if (!id || isNaN(Number(id))) {
          throw new BlockchainError(`Invalid vote ID: ${id}`, 400);
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
        selectedProposalsBigInt,
        voteIdsBigInt,
        voterEmails,
        signatureBytes
      );
      
      const receipt = await tx.wait();
      
      return {
        txHash: receipt.transactionHash,
        voteCount: selectedProposalsArray.length
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
   * Create a product proposal with images and business validation
   */
  static async createProductProposal(
    contractAddress: string,
    proposalData: ProductProposalData,
    businessId: string
  ): Promise<CreateProposalResult> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!proposalData?.productId?.trim()) {
        throw new BlockchainError('Product ID is required', 400);
      }
      if (!proposalData?.title?.trim()) {
        throw new BlockchainError('Proposal title is required', 400);
      }
      if (!proposalData?.description?.trim()) {
        throw new BlockchainError('Proposal description is required', 400);
      }
      if (!proposalData?.brandId?.trim()) {
        throw new BlockchainError('Brand ID is required', 400);
      }
      if (!businessId?.trim()) {
        throw new BlockchainError('Business ID is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      // Validate business ID format (MongoDB ObjectId)
      if (!/^[0-9a-fA-F]{24}$/.test(businessId)) {
        throw new BlockchainError('Invalid business ID format', 400);
      }
      
      // Validate business association with the contract
      await this.validateBusinessContractAssociation(contractAddress, businessId);
      
      // Validate that the proposal's brandId matches the businessId
      if (proposalData.brandId !== businessId) {
        throw new BlockchainError(
          `Proposal brand ID ${proposalData.brandId} does not match business ID ${businessId}`,
          403
        );
      }
      
      // Create metadata URI for the product proposal
      const metadataUri = await this.createProductProposalMetadata(proposalData);
      
      // Create the proposal on the blockchain with business validation
      return await this.createProposal(contractAddress, metadataUri, businessId);
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      throw new BlockchainError(`Failed to create product proposal: ${error.message}`, 500);
    }
  }

  /**
   * Create metadata URI for product proposal
   */
  private static async createProductProposalMetadata(proposalData: ProductProposalData): Promise<string> {
    const metadata = {
      name: proposalData.title,
      description: proposalData.description,
      image: proposalData.images[0] || '', // Primary image
      images: proposalData.images,
      attributes: [
        {
          trait_type: 'Product ID',
          value: proposalData.productId
        },
        {
          trait_type: 'Brand ID',
          value: proposalData.brandId
        },
        {
          trait_type: 'Category',
          value: proposalData.category || 'General'
        },
        {
          trait_type: 'Price',
          value: proposalData.price || 0
        }
      ],
      properties: {
        productId: proposalData.productId,
        brandId: proposalData.brandId,
        category: proposalData.category,
        price: proposalData.price,
        features: proposalData.features || []
      }
    };

    // In a real implementation, you would upload this to IPFS or your metadata service
    // For now, we'll return a placeholder URI
    const metadataJson = JSON.stringify(metadata);
    const metadataHash = Buffer.from(metadataJson).toString('base64');
    
    return `${process.env.METADATA_BASE_URL}/proposals/${metadataHash}`;
  }

  /**
   * Store business-contract mapping in database
   */
  static async storeBusinessContractMapping(
    businessId: string,
    contractAddress: string,
    contractType: 'voting' | 'nft'
  ): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { BrandSettings } = await import('../../models/brandSettings.model');
      
      const updateField = contractType === 'voting' 
        ? 'web3Settings.votingContract' 
        : 'web3Settings.nftContract';
      
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          $set: { 
            [updateField]: contractAddress,
            'web3Settings.networkName': process.env.BLOCKCHAIN_NETWORK || 'base',
            'web3Settings.chainId': parseInt(process.env.CHAIN_ID || '8453')
          }
        },
        { upsert: true }
      );
    } catch (error: any) {
      throw new BlockchainError(`Failed to store business-contract mapping: ${error.message}`, 500);
    }
  }

  /**
   * Validate that a business ID is associated with a specific contract
   */
  static async validateBusinessContractAssociation(
    contractAddress: string,
    businessId: string
  ): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { BrandSettings } = await import('../../models/brandSettings.model');
      
      // Check if business ID is associated with this contract
      const brandSettings = await BrandSettings.findOne({
        business: businessId,
        $or: [
          { 'web3Settings.votingContract': contractAddress },
          { 'web3Settings.nftContract': contractAddress }
        ]
      });
      
      if (!brandSettings) {
        throw new BlockchainError(
          `Business ${businessId} is not associated with contract ${contractAddress}`,
          403
        );
      }
      
      // Additional validation: Check if the contract exists in factory
      const votingFactory = this.getVotingFactoryContract();
      const contractBrand = await votingFactory.getContractBrand(contractAddress);
      
      if (contractBrand === '0x0000000000000000000000000000000000000000') {
        throw new BlockchainError('Contract not found in factory registry', 404);
      }
      
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      throw new BlockchainError(`Failed to validate business contract association: ${error.message}`, 500);
    }
  }

  /**
   * Generate a unique vote ID for a voter
   */
  static generateVoteId(voterEmail: string, proposalId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const voteData = `${voterEmail}-${proposalId}-${timestamp}-${random}`;
    
    // Create a simple hash (in production, use a proper hash function)
    let hash = 0;
    for (let i = 0; i < voteData.length; i++) {
      const char = voteData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString();
  }

  /**
   * Submit a single vote with selected proposals
   */
  static async submitVote(
    contractAddress: string,
    selectedProposals: string[],
    voterEmail: string,
    voteId: string,
    signature: string
  ): Promise<{ txHash: string; voteId: string }> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!Array.isArray(selectedProposals) || selectedProposals.length === 0) {
        throw new BlockchainError('Selected proposals array is required and cannot be empty', 400);
      }
      if (!voterEmail?.trim()) {
        throw new BlockchainError('Voter email is required', 400);
      }
      if (!voteId?.trim()) {
        throw new BlockchainError('Vote ID is required', 400);
      }
      if (!signature?.trim()) {
        throw new BlockchainError('Signature is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      // Validate proposal IDs
      for (const proposalId of selectedProposals) {
        if (isNaN(Number(proposalId))) {
          throw new BlockchainError(`Invalid proposal ID format: ${proposalId}`, 400);
        }
      }
      
      const votingContract = BlockchainProviderService.getContract(contractAddress, votingAbi);
      
      // Convert proposal IDs to BigInt
      const proposalIdsBigInt = selectedProposals.map(id => BigInt(id));
      
      const tx = await votingContract.submitVote(
        proposalIdsBigInt,
        voterEmail,
        BigInt(voteId),
        getBytes(signature)
      );
      
      const receipt = await tx.wait();
      
      return {
        txHash: receipt.transactionHash,
        voteId
      };
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new BlockchainError('Insufficient funds for vote submission', 400);
      }
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new BlockchainError('Unable to estimate gas for vote submission', 400);
      }
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Voting contract call failed - contract may not exist or invalid vote data', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error during vote submission', 503);
      }
      
      throw new BlockchainError(`Failed to submit vote: ${error.message}`, 500);
    }
  }

  /**
   * Check if an email has already voted
   */
  static async hasVoted(
    contractAddress: string,
    voterEmail: string
  ): Promise<boolean> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!voterEmail?.trim()) {
        throw new BlockchainError('Voter email is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      const votingContract = BlockchainProviderService.getReadOnlyContract(contractAddress, votingAbi);
      
      const hasVoted = await votingContract.hasVotedByEmail(voterEmail);
      return hasVoted;
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Voting contract not found or unable to check vote status', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while checking vote status', 503);
      }
      
      throw new BlockchainError(`Failed to check vote status: ${error.message}`, 500);
    }
  }
  
  /**
   * Get email voter's selected proposals
   */
  static async getVoterSelections(
    contractAddress: string,
    voterEmail: string
  ): Promise<string[]> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!voterEmail?.trim()) {
        throw new BlockchainError('Voter email is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      const votingContract = BlockchainProviderService.getReadOnlyContract(contractAddress, votingAbi);
      
      const selections = await votingContract.getEmailVoterSelections(voterEmail);
      return selections.map(id => id.toString());
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Voting contract not found or unable to get voter selections', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while getting voter selections', 503);
      }
      
      throw new BlockchainError(`Failed to get voter selections: ${error.message}`, 500);
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
      
      // Get proposal data from contract
      const proposal = await votingContract.proposals(BigInt(proposalId));
      
      // Get proposal URI for metadata
      const proposalUri = await votingContract.proposalUri(BigInt(proposalId));
      
      return {
        id: proposalId,
        title: proposalUri || 'Untitled Proposal',
        description: proposalUri || '',
        startBlock: parseInt(proposal.startTime?.toString() || '0'),
        endBlock: parseInt(proposal.endTime?.toString() || '0'),
        forVotes: parseInt(proposal.selectionCount?.toString() || '0'),
        againstVotes: 0, // Not used in selection-based voting
        abstainVotes: 0, // Not used in selection-based voting
        status: this.determineProposalStatus(proposal),
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

  /**
   * Determine proposal status based on contract data
   */
  private static determineProposalStatus(proposal: any): 'pending' | 'active' | 'succeeded' | 'failed' | 'executed' {
    const currentTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const startTime = parseInt(proposal.startTime?.toString() || '0');
    const endTime = parseInt(proposal.endTime?.toString() || '0');
    
    if (currentTime < startTime) {
      return 'pending';
    }
    
    if (currentTime <= endTime) {
      return 'active';
    }
    
    // Proposal has ended, determine if it succeeded or failed
    const selectionCount = parseInt(proposal.selectionCount?.toString() || '0');
    
    if (selectionCount > 0) {
      return 'succeeded';
    } else {
      return 'failed';
    }
  }
}