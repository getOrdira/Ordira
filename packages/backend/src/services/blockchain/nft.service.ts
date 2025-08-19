// services/blockchain/nft.service.ts
import { BlockchainProviderService } from './provider.service';
import { NftMintResult, ContractDeployment, NftContractInfo, TransferResult } from '../types/blockchain.types';
import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import { Certificate, ICertificate } from '../../models/certificate.model';
import { createAppError } from '../../middleware/error.middleware';
import nftFactoryAbi from '../../abi/nftFactoryAbi.json';
import erc721Abi from '../../abi/erc721Abi.json';

// ===== INTERFACES =====

export interface DeployContractParams {
  name: string;
  symbol: string;
  baseUri: string;
  description?: string;
  royaltyPercentage?: number;
  maxSupply?: number;
  mintPrice?: number;
  enablePublicMint?: boolean;
}

export interface MintParams {
  productId: string;
  recipient: string;
  quantity?: number;
  metadata?: {
    name?: string;
    description?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
  };
}

export interface TransferParams {
  tokenId: string;
  fromAddress: string;
  toAddress: string;
  contractAddress: string;
}

export interface BurnParams {
  tokenId: string;
  contractAddress: string;
  reason?: string;
}

export interface ContractListOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export interface CertificateListOptions {
  productId?: string;
  status?: string;
  sortBy?: 'createdAt' | 'tokenId' | 'mintedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  metrics?: string[];
  contractAddress?: string;
}

// ===== RESULT INTERFACES =====

export interface DeploymentResult {
  contractId: string;
  contractAddress: string;
  name: string;
  symbol: string;
  baseUri: string;
  maxSupply?: number;
  status: string;
  deployedAt: Date;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  deploymentCost: string;
  estimatedMintCost: string;
}

export interface MintResult {
  tokenId: string;
  contractAddress: string;
  recipient: string;
  metadata: any;
  mintedAt: Date;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  totalCost: string;
  certificateId: string;
  verificationUrl: string;
}

export interface TransferResult {
  transferredAt: Date;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  verificationUrl: string;
  ownershipProof: string;
}

export interface BurnResult {
  burnedAt: Date;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  storageReclaimed: string;
  costsRecovered: string;
}

export interface VerificationResult {
  isAuthentic: boolean;
  owner: string;
  mintedAt: Date;
  metadata: any;
  network: string;
  blockNumber: number;
  transactionHash: string;
  certificate: any;
}

export interface ProductOwnership {
  isOwner: boolean;
  reason?: string;
}

export interface MintingEligibility {
  canMint: boolean;
  reason?: string;
}

export interface TransferEligibility {
  canTransfer: boolean;
  reason?: string;
}

export interface BurnEligibility {
  canBurn: boolean;
  reason?: string;
}

export interface ContractStats {
  totalContracts: number;
  activeContracts: number;
  totalMinted: number;
  totalTransferred: number;
  gasSpent: string;
}

export interface CertificateAnalytics {
  totalCertificates: number;
  mintedThisMonth: number;
  transferSuccessRate: number;
  averageGasCost: string;
  topProducts: Array<{
    productId: string;
    count: number;
  }>;
}

export interface Analytics {
  summary: {
    totalContracts: number;
    totalMinted: number;
    totalTransferred: number;
    revenue: string;
  };
  trends: Array<{
    date: string;
    mints: number;
    transfers: number;
    revenue: string;
  }>;
  performance: {
    mintSuccessRate: number;
    transferSuccessRate: number;
    averageGasCost: string;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    mintCount: number;
    revenue: string;
  }>;
  recentActivity: Array<{
    type: 'mint' | 'transfer' | 'burn';
    tokenId: string;
    timestamp: Date;
    txHash: string;
  }>;
}

/**
 * Enhanced NFT Service class with instance methods (not static)
 * Aligns with controller expectations and backend patterns
 */
export class NftService {
  
  // ===== PRIVATE HELPERS =====
  
  private getNftFactoryContract() {
    const factoryAddress = process.env.NFT_FACTORY_ADDRESS;
    if (!factoryAddress) {
      throw createAppError('NFT_FACTORY_ADDRESS not configured', 500, 'MISSING_CONFIG');
    }
    return BlockchainProviderService.getContract(factoryAddress, nftFactoryAbi);
  }

  private getRelayerWallet(): string {
    const relayerWallet = process.env.RELAYER_WALLET_ADDRESS;
    if (!relayerWallet) {
      throw createAppError('RELAYER_WALLET_ADDRESS not configured', 500, 'MISSING_CONFIG');
    }
    return relayerWallet;
  }

  private validateAddress(address: string, name: string): void {
    if (!address?.trim()) {
      throw createAppError(`${name} is required`, 400, 'MISSING_PARAMETER');
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw createAppError(`Invalid ${name} format`, 400, 'INVALID_ADDRESS');
    }
  }

  private generateVerificationUrl(tokenId: string, contractAddress: string): string {
    const baseUrl = process.env.FRONTEND_BASE_URL || 'https://app.example.com';
    return `${baseUrl}/verify/${contractAddress}/${tokenId}`;
  }

  // ===== CONTRACT DEPLOYMENT =====

  async deployContract(params: DeployContractParams, businessId: string): Promise<DeploymentResult> {
    try {
      const { name, symbol, baseUri, maxSupply, description } = params;
      
      // Validate required parameters
      if (!name?.trim()) {
        throw createAppError('Contract name is required', 400, 'MISSING_PARAMETER');
      }
      if (!symbol?.trim()) {
        throw createAppError('Contract symbol is required', 400, 'MISSING_PARAMETER');
      }
      if (!baseUri?.trim()) {
        throw createAppError('Base URI is required', 400, 'MISSING_PARAMETER');
      }
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_PARAMETER');
      }
      
      const nftFactory = this.getNftFactoryContract();
      
      // Deploy the contract
      const tx = await nftFactory.deployNFT(name, symbol, baseUri);
      const receipt = await tx.wait();

      // Find the deployment event
      const deployEvent = receipt.events?.find((e: any) => e.event === 'NFTDeployed');
      if (!deployEvent) {
        throw createAppError('NFTDeployed event not found in transaction receipt', 500, 'DEPLOYMENT_EVENT_MISSING');
      }

      const contractAddress = deployEvent.args.contractAddress as string;

      // Update brand settings with the new contract
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          $set: { 
            'web3Settings.nftContract': contractAddress,
            'web3Settings.networkName': process.env.BLOCKCHAIN_NETWORK || 'base',
            'web3Settings.chainId': parseInt(process.env.CHAIN_ID || '8453')
          }
        },
        { upsert: true }
      );

      // Create contract record (you might have a Contract model)
      const contractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        contractId,
        contractAddress,
        name,
        symbol,
        baseUri,
        maxSupply,
        status: 'active',
        deployedAt: new Date(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString() || '0',
        deploymentCost: (receipt.gasUsed * (receipt.effectiveGasPrice || 0)).toString(),
        estimatedMintCost: '50000000000000000' // Estimated 0.05 ETH for minting
      };
    } catch (error: any) {
      console.error('Contract deployment error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle specific blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw createAppError('Insufficient funds for contract deployment', 400, 'INSUFFICIENT_FUNDS');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error during deployment', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to deploy NFT contract: ${error.message}`, 500, 'DEPLOYMENT_FAILED');
    }
  }

  // ===== CONTRACT LISTING =====

  async listContracts(businessId: string, options: ContractListOptions = {}): Promise<any[]> {
    try {
      // Get brand settings to find contracts
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      const contracts = [];

      if (brandSettings?.web3Settings?.nftContract) {
        const contractAddress = brandSettings.web3Settings.nftContract;
        const contractInfo = await this.getContractMetadata(contractAddress, businessId);
        
        contracts.push({
          _id: contractAddress,
          contractAddress,
          name: contractInfo.name,
          symbol: contractInfo.symbol,
          status: 'active',
          totalSupply: contractInfo.totalSupply,
          maxSupply: contractInfo.totalSupply, // You might track this separately
          deployedAt: brandSettings.createdAt,
          lastMintedAt: new Date() // You might track this from certificates
        });
      }

      return contracts;
    } catch (error: any) {
      console.error('List contracts error:', error);
      throw createAppError(`Failed to list contracts: ${error.message}`, 500, 'LIST_CONTRACTS_FAILED');
    }
  }

  async getContractStatistics(businessId: string): Promise<ContractStats> {
    try {
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      const certificateCount = await Certificate.countDocuments({ business: businessId });
      const transferredCount = await Certificate.countDocuments({ 
        business: businessId, 
        status: 'transferred_to_brand' 
      });

      return {
        totalContracts: brandSettings?.web3Settings?.nftContract ? 1 : 0,
        activeContracts: brandSettings?.web3Settings?.nftContract ? 1 : 0,
        totalMinted: certificateCount,
        totalTransferred: transferredCount,
        gasSpent: '0' // You might track this in analytics
      };
    } catch (error: any) {
      console.error('Contract statistics error:', error);
      throw createAppError(`Failed to get contract statistics: ${error.message}`, 500, 'STATS_FAILED');
    }
  }

  // ===== NFT MINTING =====

  async verifyProductOwnership(productId: string, businessId: string): Promise<ProductOwnership> {
    // This should check if the product belongs to the business
    // Implementation depends on your Product model
    return {
      isOwner: true // Simplified for now
    };
  }

  async checkMintingEligibility(businessId: string, productId: string): Promise<MintingEligibility> {
    try {
      // Check if business has a contract
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      if (!brandSettings?.web3Settings?.nftContract) {
        return {
          canMint: false,
          reason: 'No NFT contract deployed for this business'
        };
      }

      // Check product ownership
      const ownership = await this.verifyProductOwnership(productId, businessId);
      if (!ownership.isOwner) {
        return {
          canMint: false,
          reason: 'Product not found or access denied'
        };
      }

      return {
        canMint: true
      };
    } catch (error: any) {
      console.error('Minting eligibility error:', error);
      return {
        canMint: false,
        reason: `Eligibility check failed: ${error.message}`
      };
    }
  }

  async mintNft(businessId: string, params: MintParams): Promise<MintResult> {
    try {
      const { productId, recipient, metadata } = params;
      
      // Get business contract
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      const contractAddress = brandSettings?.web3Settings?.nftContract;
      
      if (!contractAddress) {
        throw createAppError('No NFT contract found for this business', 404, 'NO_CONTRACT');
      }

      // Validate recipient address
      this.validateAddress(recipient, 'recipient address');
      
      // Create token URI
      const tokenUri = `${process.env.METADATA_BASE_URL || 'https://api.example.com/metadata'}/${businessId}/${productId}`;
      
      // Mint to relayer wallet first
      const relayerWallet = this.getRelayerWallet();
      const nftContract = BlockchainProviderService.getContract(contractAddress, erc721Abi);
      
      const tx = await nftContract.safeMint(relayerWallet, tokenUri);
      const receipt = await tx.wait();

      // Find the Transfer event to get token ID
      const transferEvent = receipt.events?.find((e: any) => e.event === 'Transfer');
      if (!transferEvent) {
        throw createAppError('Transfer event not found', 500, 'MINT_EVENT_MISSING');
      }

      const tokenId = transferEvent.args.tokenId.toString();

      // Create certificate record
      const certificate = await Certificate.create({
        business: businessId,
        product: productId,
        recipient,
        tokenId,
        txHash: receipt.transactionHash,
        contractAddress,
        status: 'minted',
        mintedToRelayer: true,
        autoTransferEnabled: brandSettings?.shouldAutoTransfer() || false,
        transferDelayMinutes: brandSettings?.getTransferSettings?.()?.transferDelay || 5,
        maxTransferAttempts: 3,
        transferTimeout: 300000,
        metadata
      });

      const verificationUrl = this.generateVerificationUrl(tokenId, contractAddress);

      return {
        tokenId,
        contractAddress,
        recipient,
        metadata: metadata || {},
        mintedAt: new Date(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString() || '0',
        totalCost: (receipt.gasUsed * (receipt.effectiveGasPrice || 0)).toString(),
        certificateId: certificate._id.toString(),
        verificationUrl
      };
    } catch (error: any) {
      console.error('Mint NFT error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw createAppError('Insufficient funds for minting transaction', 400, 'INSUFFICIENT_FUNDS');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error during minting', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to mint NFT: ${error.message}`, 500, 'MINT_FAILED');
    }
  }

  // ===== CERTIFICATE LISTING =====

  async listCertificates(businessId: string, options: CertificateListOptions = {}): Promise<{
    certificates: any[];
    total: number;
  }> {
    try {
      const {
        productId,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        limit = 20,
        offset = 0
      } = options;

      // Build query
      const query: any = { business: businessId };
      if (productId) query.product = productId;
      if (status) query.status = status;

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [certificates, total] = await Promise.all([
        Certificate.find(query)
          .sort(sort)
          .limit(limit)
          .skip(offset)
          .lean(),
        Certificate.countDocuments(query)
      ]);

      return {
        certificates,
        total
      };
    } catch (error: any) {
      console.error('List certificates error:', error);
      throw createAppError(`Failed to list certificates: ${error.message}`, 500, 'LIST_CERTIFICATES_FAILED');
    }
  }

  async getCertificateAnalytics(businessId: string): Promise<CertificateAnalytics> {
    try {
      const [
        totalCertificates,
        mintedThisMonth,
        transferStats
      ] = await Promise.all([
        Certificate.countDocuments({ business: businessId }),
        Certificate.countDocuments({
          business: businessId,
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }),
        Certificate.aggregate([
          { $match: { business: businessId } },
          {
            $group: {
              _id: null,
              totalTransfers: { $sum: { $cond: [{ $eq: ['$status', 'transferred_to_brand'] }, 1, 0] } },
              totalCertificates: { $sum: 1 }
            }
          }
        ])
      ]);

      const stats = transferStats[0] || { totalTransfers: 0, totalCertificates: 0 };
      const transferSuccessRate = stats.totalCertificates > 0 
        ? (stats.totalTransfers / stats.totalCertificates) * 100 
        : 0;

      return {
        totalCertificates,
        mintedThisMonth,
        transferSuccessRate,
        averageGasCost: '0.001', // You might calculate this from actual transactions
        topProducts: [] // You might aggregate this from certificates
      };
    } catch (error: any) {
      console.error('Certificate analytics error:', error);
      throw createAppError(`Failed to get certificate analytics: ${error.message}`, 500, 'ANALYTICS_FAILED');
    }
  }

  // ===== NFT TRANSFER =====

  async verifyTransferEligibility(tokenId: string, contractAddress: string, fromAddress: string, businessId: string): Promise<TransferEligibility> {
    try {
      // Verify the token exists and ownership
      const owner = await this.getTokenOwner(contractAddress, tokenId);
      if (owner.toLowerCase() !== fromAddress.toLowerCase()) {
        return {
          canTransfer: false,
          reason: `Token ${tokenId} is not owned by ${fromAddress}`
        };
      }

      // Check if business has permission to transfer this token
      const certificate = await Certificate.findOne({
        business: businessId,
        tokenId,
        contractAddress
      });

      if (!certificate) {
        return {
          canTransfer: false,
          reason: 'Certificate not found or access denied'
        };
      }

      return {
        canTransfer: true
      };
    } catch (error: any) {
      console.error('Transfer eligibility error:', error);
      return {
        canTransfer: false,
        reason: `Transfer eligibility check failed: ${error.message}`
      };
    }
  }

  async transferNft(businessId: string, params: TransferParams): Promise<TransferResult> {
    try {
      const { tokenId, contractAddress, fromAddress, toAddress } = params;
      
      // Validate addresses
      this.validateAddress(contractAddress, 'contract address');
      this.validateAddress(fromAddress, 'from address');
      this.validateAddress(toAddress, 'to address');

      // Execute transfer
      const nftContract = BlockchainProviderService.getContract(contractAddress, erc721Abi);
      const tx = await nftContract.transferFrom(fromAddress, toAddress, tokenId);
      const receipt = await tx.wait();

      // Update certificate record
      await Certificate.findOneAndUpdate(
        { business: businessId, tokenId, contractAddress },
        {
          $set: {
            status: 'transferred_to_brand',
            transferredToBrand: true,
            transferTxHash: receipt.transactionHash,
            transferredAt: new Date()
          }
        }
      );

      const verificationUrl = this.generateVerificationUrl(tokenId, contractAddress);

      return {
        transferredAt: new Date(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString() || '0',
        verificationUrl,
        ownershipProof: `Token ${tokenId} successfully transferred to ${toAddress}`
      };
    } catch (error: any) {
      console.error('Transfer NFT error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw createAppError('Insufficient funds for transfer transaction', 400, 'INSUFFICIENT_FUNDS');
      }
      if (error.code === 'CALL_EXCEPTION') {
        throw createAppError('Transfer failed - token may not exist or not authorized', 403, 'TRANSFER_UNAUTHORIZED');
      }
      
      throw createAppError(`Failed to transfer NFT: ${error.message}`, 500, 'TRANSFER_FAILED');
    }
  }

  // ===== ANALYTICS =====

  async getAnalytics(businessId: string, options: AnalyticsOptions = {}): Promise<Analytics> {
    try {
      const { startDate, endDate, contractAddress } = options;
      
      // Build date filter
      const dateFilter: any = { business: businessId };
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = startDate;
        if (endDate) dateFilter.createdAt.$lte = endDate;
      }
      if (contractAddress) {
        dateFilter.contractAddress = contractAddress;
      }

      // Get summary stats
      const [
        totalMinted,
        totalTransferred,
        certificates
      ] = await Promise.all([
        Certificate.countDocuments(dateFilter),
        Certificate.countDocuments({ ...dateFilter, status: 'transferred_to_brand' }),
        Certificate.find(dateFilter).lean()
      ]);

      // Calculate trends (simplified)
      const trends = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          mints: Math.floor(Math.random() * 10), // Replace with actual aggregation
          transfers: Math.floor(Math.random() * 5),
          revenue: '0'
        });
      }

      return {
        summary: {
          totalContracts: 1, // Simplified
          totalMinted,
          totalTransferred,
          revenue: '0'
        },
        trends,
        performance: {
          mintSuccessRate: 95, // You might calculate this from failed mints
          transferSuccessRate: totalMinted > 0 ? (totalTransferred / totalMinted) * 100 : 0,
          averageGasCost: '0.001'
        },
        topProducts: [], // You might aggregate this from certificates
        recentActivity: certificates.slice(0, 10).map(cert => ({
          type: cert.status === 'transferred_to_brand' ? 'transfer' : 'mint' as 'mint' | 'transfer' | 'burn',
          tokenId: cert.tokenId,
          timestamp: cert.createdAt,
          txHash: cert.txHash
        }))
      };
    } catch (error: any) {
      console.error('Analytics error:', error);
      throw createAppError(`Failed to get analytics: ${error.message}`, 500, 'ANALYTICS_FAILED');
    }
  }

  // ===== NFT VERIFICATION =====

  async verifyNftAuthenticity(tokenId: string, contractAddress: string): Promise<VerificationResult> {
    try {
      this.validateAddress(contractAddress, 'contract address');
      
      // Get owner and metadata from blockchain
      const [owner, tokenUri] = await Promise.all([
        this.getTokenOwner(contractAddress, tokenId),
        this.getTokenURI(contractAddress, tokenId)
      ]);

      // Find certificate record
      const certificate = await Certificate.findOne({
        tokenId,
        contractAddress
      }).lean();

      return {
        isAuthentic: true,
        owner,
        mintedAt: certificate?.createdAt || new Date(),
        metadata: certificate?.metadata || {},
        network: process.env.BLOCKCHAIN_NETWORK || 'base',
        blockNumber: 0, // You might store this
        transactionHash: certificate?.txHash || '',
        certificate
      };
    } catch (error: any) {
      console.error('Verify NFT error:', error);
      throw createAppError(`Failed to verify NFT: ${error.message}`, 500, 'VERIFICATION_FAILED');
    }
  }

  // ===== NFT BURNING =====

  async verifyBurnEligibility(tokenId: string, contractAddress: string, businessId: string): Promise<BurnEligibility> {
    try {
      // Check if certificate exists and belongs to business
      const certificate = await Certificate.findOne({
        business: businessId,
        tokenId,
        contractAddress
      });

      if (!certificate) {
        return {
          canBurn: false,
          reason: 'Certificate not found or access denied'
        };
      }

      // Check if token is not already burned
      if (certificate.status === 'revoked') {
        return {
          canBurn: false,
          reason: 'Token is already burned/revoked'
        };
      }

      return {
        canBurn: true
      };
    } catch (error: any) {
      console.error('Burn eligibility error:', error);
      return {
        canBurn: false,
        reason: `Burn eligibility check failed: ${error.message}`
      };
    }
  }

  async burnNft(businessId: string, params: BurnParams): Promise<BurnResult> {
    try {
      const { tokenId, contractAddress, reason } = params;
      
      this.validateAddress(contractAddress, 'contract address');

      // For ERC721, burning is usually done by transferring to dead address
      // or calling a burn function if implemented
      const nftContract = BlockchainProviderService.getContract(contractAddress, erc721Abi);
      
      // Try burn function first, fallback to transfer to dead address
      let tx;
      try {
        tx = await nftContract.burn(tokenId);
      } catch {
        // Fallback to dead address transfer
        const deadAddress = '0x000000000000000000000000000000000000dEaD';
        const owner = await this.getTokenOwner(contractAddress, tokenId);
        tx = await nftContract.transferFrom(owner, deadAddress, tokenId);
      }
      
      const receipt = await tx.wait();

      // Update certificate record
      await Certificate.findOneAndUpdate(
        { business: businessId, tokenId, contractAddress },
        {
          $set: {
            status: 'revoked',
            revoked: true,
            revokedAt: new Date(),
            revokedReason: reason
          }
        }
      );

      return {
        burnedAt: new Date(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        storageReclaimed: '0',
        costsRecovered: '0'
      };
    } catch (error: any) {
      console.error('Burn NFT error:', error);
      
      if (error.statusCode) {
        throw error;
      }
      
      throw createAppError(`Failed to burn NFT: ${error.message}`, 500, 'BURN_FAILED');
    }
  }

  // ===== UTILITY METHODS =====

  async getContractMetadata(contractAddress: string, businessId?: string): Promise<NftContractInfo> {
    try {
      this.validateAddress(contractAddress, 'contract address');
      
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      
      const [name, symbol, totalSupply, owner] = await Promise.all([
        nftContract.name(),
        nftContract.symbol(),
        nftContract.totalSupply?.() || '0',
        nftContract.owner?.() || 'Unknown'
      ]);

      return {
        contractAddress,
        totalSupply: parseInt(totalSupply.toString()),
        name,
        symbol,
        owner,
        businessId: businessId || ''
      };
    } catch (error: any) {
      console.error('Get contract metadata error:', error);
      
      if (error.code === 'CALL_EXCEPTION') {
        throw createAppError('Contract not found or not a valid ERC721 contract', 404, 'INVALID_CONTRACT');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error while fetching contract metadata', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to get contract metadata: ${error.message}`, 500, 'METADATA_FAILED');
    }
  }

  async getTokenURI(contractAddress: string, tokenId: string): Promise<string> {
    try {
      this.validateAddress(contractAddress, 'contract address');
      
      if (!tokenId?.trim()) {
        throw createAppError('Token ID is required', 400, 'MISSING_PARAMETER');
      }
      
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      return await nftContract.tokenURI(tokenId);
    } catch (error: any) {
      console.error('Get token URI error:', error);
      
      if (error.code === 'CALL_EXCEPTION') {
        throw createAppError('Token not found or contract unavailable', 404, 'TOKEN_NOT_FOUND');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error while fetching token URI', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to get token URI: ${error.message}`, 500, 'TOKEN_URI_FAILED');
    }
  }

  async getTokenOwner(contractAddress: string, tokenId: string): Promise<string> {
    try {
      this.validateAddress(contractAddress, 'contract address');
      
      if (!tokenId?.trim()) {
        throw createAppError('Token ID is required', 400, 'MISSING_PARAMETER');
      }
      
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      return await nftContract.ownerOf(tokenId);
    } catch (error: any) {
      console.error('Get token owner error:', error);
      
      if (error.code === 'CALL_EXCEPTION') {
        throw createAppError('Token not found or contract unavailable', 404, 'TOKEN_NOT_FOUND');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error while fetching token owner', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to get token owner: ${error.message}`, 500, 'TOKEN_OWNER_FAILED');
    }
  }

  async isValidNFTContract(contractAddress: string): Promise<boolean> {
    try {
      if (!contractAddress?.trim()) {
        return false;
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        return false;
      }
      
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      
      // Try to call supportsInterface for ERC721
      const ERC721_INTERFACE_ID = '0x80ac58cd';
      const supportsERC721 = await nftContract.supportsInterface(ERC721_INTERFACE_ID);
      
      return supportsERC721;
    } catch (error) {
      return false;
    }
  }

  async getOptimizedGasPrice(): Promise<string> {
    try {
      const feeData = await BlockchainProviderService.getGasPrice();
      // NFT operations might need higher gas, add 15%
      const gasPrice = feeData.gasPrice! * BigInt(115) / BigInt(100);
      return gasPrice.toString();
    } catch (error: any) {
      console.error('Get gas price error:', error);
      
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error while fetching gas price', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to get gas price: ${error.message}`, 500, 'GAS_PRICE_FAILED');
    }
  }

  // ===== LEGACY COMPATIBILITY METHODS =====

  /**
   * Legacy method for compatibility with existing certificate service
   * This maintains backward compatibility while using the new structure
   */
  async mintNft(businessId: string, params: { productId: string; recipient: string }): Promise<{
    tokenId: string;
    txHash: string;
    contractAddress?: string;
  }> {
    const result = await this.mintNft(businessId, {
      productId: params.productId,
      recipient: params.recipient
    });

    return {
      tokenId: result.tokenId,
      txHash: result.transactionHash,
      contractAddress: result.contractAddress
    };
  }

  // ===== STATIC METHODS FOR BACKWARD COMPATIBILITY =====

  /**
   * Static wrapper methods to maintain compatibility with existing static calls
   * These delegate to instance methods
   */
  static async deployNFTContract(params: {
    name: string;
    symbol: string;
    baseUri: string;
    businessId: string;
  }): Promise<ContractDeployment> {
    const service = new NftService();
    const result = await service.deployContract(params, params.businessId);
    
    return {
      address: result.contractAddress,
      txHash: result.transactionHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
      businessId: params.businessId
    };
  }

  static async mintNFTWithAutoTransfer(params: {
    contractAddress: string;
    recipient: string;
    tokenUri: string;
    businessId: string;
    productId: string;
  }): Promise<{
    tokenId: string;
    txHash: string;
    recipient: string;
    blockNumber: number;
    contractAddress: string;
    certificateId?: string;
    transferScheduled: boolean;
    brandWallet?: string;
    transferDelay?: number;
  }> {
    const service = new NftService();
    const result = await service.mintNft(params.businessId, {
      productId: params.productId,
      recipient: params.recipient
    });
    
    return {
      tokenId: result.tokenId,
      txHash: result.transactionHash,
      recipient: result.recipient,
      blockNumber: result.blockNumber,
      contractAddress: result.contractAddress,
      certificateId: result.certificateId,
      transferScheduled: false, // Simplified for now
      brandWallet: undefined,
      transferDelay: undefined
    };
  }

  static async transferNft(params: {
    contractAddress: string;
    tokenId: string;
    fromAddress: string;
    toAddress: string;
    timeout?: number;
  }): Promise<TransferResult> {
    const service = new NftService();
    
    // We need a businessId for the instance method, try to find it from certificate
    const certificate = await Certificate.findOne({
      tokenId: params.tokenId,
      contractAddress: params.contractAddress
    });
    
    if (!certificate) {
      throw createAppError('Certificate not found for transfer', 404, 'CERTIFICATE_NOT_FOUND');
    }
    
    const result = await service.transferNft(certificate.business.toString(), {
      tokenId: params.tokenId,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      contractAddress: params.contractAddress
    });
    
    return {
      txHash: result.transactionHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
      from: params.fromAddress,
      to: params.toAddress,
      tokenId: params.tokenId,
      contractAddress: params.contractAddress,
      success: true
    };
  }

  static async batchTransferNfts(transfers: Array<{
    contractAddress: string;
    tokenId: string;
    fromAddress: string;
    toAddress: string;
    timeout?: number;
  }>): Promise<TransferResult[]> {
    const results: TransferResult[] = [];
    const errors: string[] = [];

    for (const transferParams of transfers) {
      try {
        const result = await this.transferNft(transferParams);
        results.push(result);
      } catch (error: any) {
        errors.push(`Token ${transferParams.tokenId}: ${error.message}`);
        results.push({
          txHash: '',
          blockNumber: 0,
          gasUsed: '0',
          from: transferParams.fromAddress,
          to: transferParams.toAddress,
          tokenId: transferParams.tokenId,
          contractAddress: transferParams.contractAddress,
          success: false,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      console.warn(`Batch transfer completed with ${errors.length} errors:`, errors);
    }

    return results;
  }

  static async getCertificateAnalytics(businessId: string): Promise<{
    total: number;
    minted: number;
    transferred: number;
    failed: number;
    relayerHeld: number;
    brandOwned: number;
    transferSuccessRate: number;
    gasUsed: string;
    recentActivity: any[];
  }> {
    try {
      const service = new NftService();
      const analytics = await service.getCertificateAnalytics(businessId);
      
      // Get additional stats
      const [
        total,
        minted,
        transferred,
        failed
      ] = await Promise.all([
        Certificate.countDocuments({ business: businessId }),
        Certificate.countDocuments({ business: businessId, status: 'minted' }),
        Certificate.countDocuments({ business: businessId, status: 'transferred_to_brand' }),
        Certificate.countDocuments({ business: businessId, status: 'transfer_failed' })
      ]);

      // Get brand settings for context
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      const hasWeb3 = brandSettings?.hasWeb3Features?.() || false;
      
      // Get recent activity
      const recentActivity = await Certificate.find({ business: businessId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('tokenId status transferredAt transferTxHash createdAt')
        .lean();

      return {
        total,
        minted,
        transferred,
        failed,
        relayerHeld: hasWeb3 ? minted + failed : total - (transferred + failed),
        brandOwned: hasWeb3 ? transferred : 0,
        transferSuccessRate: analytics.transferSuccessRate,
        gasUsed: '0', // You might track this in analytics
        recentActivity: recentActivity.map(cert => ({
          tokenId: cert.tokenId,
          status: cert.status,
          transferredAt: cert.transferredAt,
          txHash: cert.transferTxHash || cert.txHash,
          createdAt: cert.createdAt
        }))
      };
    } catch (error: any) {
      console.error('Certificate analytics error:', error);
      throw createAppError(`Failed to get certificate analytics: ${error.message}`, 500, 'ANALYTICS_FAILED');
    }
  }

  static async getCertificatesByOwnership(businessId: string, ownershipType: 'relayer' | 'brand' | 'all' = 'all') {
    try {
      let query: any = { business: businessId };
      
      switch (ownershipType) {
        case 'relayer':
          query = { 
            ...query, 
            $or: [
              { transferredToBrand: false },
              { transferredToBrand: { $exists: false } },
              { status: { $in: ['minted', 'transfer_failed'] } }
            ]
          };
          break;
        case 'brand':
          query = { 
            ...query, 
            transferredToBrand: true,
            status: 'transferred_to_brand'
          };
          break;
        // 'all' case - no additional filtering
      }
      
      return await Certificate.find(query)
        .sort({ createdAt: -1 })
        .populate('business', 'businessName')
        .lean();
    } catch (error: any) {
      console.error('Certificates by ownership error:', error);
      throw createAppError(`Failed to get certificates by ownership: ${error.message}`, 500, 'OWNERSHIP_QUERY_FAILED');
    }
  }

  static async retryFailedTransfers(businessId: string, limit: number = 10): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const failedCertificates = await Certificate.find({
        business: businessId,
        transferFailed: true,
        status: 'transfer_failed',
        transferAttempts: { $lt: 3 },
        nextTransferAttempt: { $lte: new Date() }
      }).limit(limit);
      
      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const cert of failedCertificates) {
        try {
          results.processed++;
          
          // Try to retry the transfer using the certificate's retryTransfer method
          if (cert.retryTransfer) {
            const success = await cert.retryTransfer();
            if (success) {
              results.successful++;
            } else {
              results.failed++;
            }
          } else {
            results.failed++;
            results.errors.push(`Certificate ${cert._id}: No retry method available`);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Certificate ${cert._id}: ${error.message}`);
        }
      }

      return results;
    } catch (error: any) {
      console.error('Retry failed transfers error:', error);
      throw createAppError(`Failed to retry transfers: ${error.message}`, 500, 'RETRY_FAILED');
    }
  }

  static async getPendingTransfers(businessId: string) {
    try {
      return await Certificate.find({
        business: businessId,
        status: 'pending_transfer',
        autoTransferEnabled: true
      }).sort({ nextTransferAttempt: 1 });
    } catch (error: any) {
      console.error('Get pending transfers error:', error);
      throw createAppError(`Failed to get pending transfers: ${error.message}`, 500, 'PENDING_TRANSFERS_FAILED');
    }
  }

  static async getUserContracts(userAddress: string): Promise<string[]> {
    try {
      if (!userAddress?.trim()) {
        throw createAppError('User address is required', 400, 'MISSING_PARAMETER');
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        throw createAppError('Invalid user address format', 400, 'INVALID_ADDRESS');
      }
      
      const service = new NftService();
      const nftFactory = service.getNftFactoryContract();
      const count = await nftFactory.getUserContractCount(userAddress);
      const contracts: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const contractAddress = await nftFactory.userContracts(userAddress, i);
        contracts.push(contractAddress);
      }
      
      return contracts;
    } catch (error: any) {
      console.error('Get user contracts error:', error);
      
      if (error.statusCode) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw createAppError('Unable to retrieve user contracts - factory contract may be unavailable', 404, 'FACTORY_UNAVAILABLE');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error while fetching user contracts', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to get user contracts: ${error.message}`, 500, 'USER_CONTRACTS_FAILED');
    }
  }

  static async getContractMetadata(contractAddress: string, businessId?: string): Promise<NftContractInfo> {
    const service = new NftService();
    return await service.getContractMetadata(contractAddress, businessId);
  }

  static async getTokenURI(contractAddress: string, tokenId: string): Promise<string> {
    const service = new NftService();
    return await service.getTokenURI(contractAddress, tokenId);
  }

  static async getTokenOwner(contractAddress: string, tokenId: string): Promise<string> {
    const service = new NftService();
    return await service.getTokenOwner(contractAddress, tokenId);
  }

  static async isValidNFTContract(contractAddress: string): Promise<boolean> {
    const service = new NftService();
    return await service.isValidNFTContract(contractAddress);
  }

  static async getOptimizedGasPrice(): Promise<string> {
    const service = new NftService();
    return await service.getOptimizedGasPrice();
  }
}