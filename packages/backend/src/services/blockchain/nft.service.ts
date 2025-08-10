// services/blockchain/nft.service.ts
import { BlockchainProviderService } from './provider.service';
import { NftMintResult, ContractDeployment, NftContractInfo, TransferResult } from '../types/blockchain.types';
import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import { Certificate, ICertificate } from '../../models/certificate.model';
import nftFactoryAbi from '../../abi/nftFactoryAbi.json';
import erc721Abi from '../../abi/erc721Abi.json';

export interface NFTDeployParams {
  name: string;
  symbol: string;
  baseUri: string;
  businessId: string; // Added for business context
}

export interface NFTMintParams {
  contractAddress: string;
  recipient: string;
  tokenUri: string;
  businessId: string; // Added for business context
  productId: string; // Added for certificate tracking
}

export interface NFTTransferParams {
  contractAddress: string;
  tokenId: string;
  fromAddress: string;
  toAddress: string;
  timeout?: number;
}

export interface MintWithTransferResult extends NftMintResult {
  transferScheduled: boolean;
  brandWallet?: string;
  transferDelay?: number;
  certificateId?: string;
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
 * Enhanced NFT service with automatic transfer capabilities
 * Integrates with brand settings and certificate management
 */
export class NftService {
  
  /**
   * Get the NFT factory contract instance
   */
  private static getNftFactoryContract() {
    const factoryAddress = process.env.NFT_FACTORY_ADDRESS;
    if (!factoryAddress) {
      throw new BlockchainError('NFT_FACTORY_ADDRESS not configured', 500);
    }
    return BlockchainProviderService.getContract(factoryAddress, nftFactoryAbi);
  }

  /**
   * Get the relayer wallet address from environment
   */
  private static getRelayerWallet(): string {
    const relayerWallet = process.env.RELAYER_WALLET_ADDRESS;
    if (!relayerWallet) {
      throw new BlockchainError('RELAYER_WALLET_ADDRESS not configured', 500);
    }
    return relayerWallet;
  }

  /**
   * Deploy a new ERC721 NFT contract with business context
   */
  static async deployNFTContract(params: NFTDeployParams): Promise<ContractDeployment> {
    try {
      const { name, symbol, baseUri, businessId } = params;
      
      // Validate input parameters
      if (!name?.trim()) {
        throw new BlockchainError('Contract name is required', 400);
      }
      if (!symbol?.trim()) {
        throw new BlockchainError('Contract symbol is required', 400);
      }
      if (!baseUri?.trim()) {
        throw new BlockchainError('Base URI is required', 400);
      }
      if (!businessId?.trim()) {
        throw new BlockchainError('Business ID is required', 400);
      }
      
      const nftFactory = this.getNftFactoryContract();
      
      const tx = await nftFactory.deployNFT(name, symbol, baseUri);
      const receipt = await tx.wait();

      const evt = receipt.events?.find((e: any) => e.event === 'NFTDeployed');
      if (!evt) {
        throw new BlockchainError('NFTDeployed event not found in transaction receipt', 500);
      }

      const contractAddress = evt.args.contractAddress as string;

      // Update brand settings with the new contract address
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          $set: { 
            'web3Settings.nftContract': contractAddress,
            'web3Settings.networkName': process.env.BLOCKCHAIN_NETWORK || 'base',
            'web3Settings.chainId': parseInt(process.env.CHAIN_ID || '1')
          }
        },
        { upsert: true }
      );

      return {
        address: contractAddress,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        businessId
      };
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      // Handle specific blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new BlockchainError('Insufficient funds for contract deployment', 400);
      }
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new BlockchainError('Unable to estimate gas for deployment transaction', 400);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error during deployment', 503);
      }
      
      throw new BlockchainError(`Failed to deploy NFT contract: ${error.message}`, 500);
    }
  }

  /**
   * Mint an NFT with automatic transfer capabilities
   */
  static async mintNFTWithAutoTransfer(params: NFTMintParams): Promise<MintWithTransferResult> {
    try {
      const { contractAddress, recipient, tokenUri, businessId, productId } = params;
      
      // Validate input parameters
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!recipient?.trim()) {
        throw new BlockchainError('Recipient address is required', 400);
      }
      if (!tokenUri?.trim()) {
        throw new BlockchainError('Token URI is required', 400);
      }
      if (!businessId?.trim()) {
        throw new BlockchainError('Business ID is required', 400);
      }
      if (!productId?.trim()) {
        throw new BlockchainError('Product ID is required', 400);
      }
      
      // Validate Base address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        throw new BlockchainError('Invalid recipient address format', 400);
      }

      // Get brand settings to determine transfer preferences
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      const relayerWallet = this.getRelayerWallet();
      
      // Always mint to relayer wallet first
      const nftContract = BlockchainProviderService.getContract(contractAddress, erc721Abi);
      const tx = await nftContract.safeMint(relayerWallet, tokenUri);
      const receipt = await tx.wait();

      // Find the Transfer event to get the token ID
      const transferEvent = receipt.events?.find((e: any) => e.event === 'Transfer');
      if (!transferEvent) {
        throw new BlockchainError('Transfer event not found in transaction receipt', 500);
      }

      const tokenId = transferEvent.args.tokenId.toString();

      // Create certificate record
      const certificateData = {
        business: businessId,
        product: productId,
        recipient,
        tokenId,
        txHash: receipt.transactionHash,
        contractAddress,
        status: 'minted',
        mintedToRelayer: true,
        autoTransferEnabled: brandSettings?.shouldAutoTransfer() || false,
        transferDelayMinutes: brandSettings?.getTransferSettings().transferDelay || 5,
        maxTransferAttempts: brandSettings?.getTransferSettings().maxRetryAttempts || 3,
        transferTimeout: brandSettings?.getTransferSettings().transferTimeout || 300000
      };

      const certificate = new Certificate(certificateData);
      await certificate.save();

      const result: MintWithTransferResult = {
        tokenId,
        txHash: receipt.transactionHash,
        recipient,
        blockNumber: receipt.blockNumber,
        contractAddress,
        certificateId: certificate._id.toString(),
        transferScheduled: false
      };

      // Check if brand has Web3 wallet configured for auto-transfer
      if (brandSettings?.shouldAutoTransfer()) {
        const brandWallet = brandSettings.web3Settings?.certificateWallet;
        if (brandWallet) {
          result.transferScheduled = true;
          result.brandWallet = brandWallet;
          result.transferDelay = brandSettings.getTransferSettings().transferDelay;
          
          // The certificate's post-save hook will handle scheduling the transfer
          console.log(`Auto-transfer scheduled for certificate ${certificate._id} to wallet ${brandWallet}`);
        }
      } else {
        // Keep in relayer wallet, update analytics
        console.log(`Certificate ${certificate._id} will remain in relayer wallet for business ${businessId}`);
      }

      return result;
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      // Handle specific blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new BlockchainError('Insufficient funds for minting transaction', 400);
      }
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new BlockchainError('Unable to estimate gas for minting transaction', 400);
      }
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Contract call failed - contract may not exist or method unavailable', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error during minting', 503);
      }
      
      throw new BlockchainError(`Failed to mint NFT: ${error.message}`, 500);
    }
  }

  /**
   * Transfer NFT from relayer to brand wallet
   */
  static async transferNft(params: NFTTransferParams): Promise<TransferResult> {
    try {
      const { contractAddress, tokenId, fromAddress, toAddress, timeout = 300000 } = params;
      
      // Validate input parameters
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!tokenId?.trim()) {
        throw new BlockchainError('Token ID is required', 400);
      }
      if (!fromAddress?.trim()) {
        throw new BlockchainError('From address is required', 400);
      }
      if (!toAddress?.trim()) {
        throw new BlockchainError('To address is required', 400);
      }
      
      // Validate Ethereum address formats
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(fromAddress)) {
        throw new BlockchainError('Invalid from address format', 400);
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
        throw new BlockchainError('Invalid to address format', 400);
      }

      // Verify ownership before transfer
      const currentOwner = await this.getTokenOwner(contractAddress, tokenId);
      if (currentOwner.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new BlockchainError(`Token ${tokenId} is not owned by ${fromAddress}`, 403);
      }

      const nftContract = BlockchainProviderService.getContract(contractAddress, erc721Abi);
      
      // Use timeout for the transaction
      const transferPromise = nftContract.transferFrom(fromAddress, toAddress, tokenId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout')), timeout)
      );
      
      const tx = await Promise.race([transferPromise, timeoutPromise]) as any;
      const receipt = await tx.wait();

      // Verify the transfer was successful
      const newOwner = await this.getTokenOwner(contractAddress, tokenId);
      if (newOwner.toLowerCase() !== toAddress.toLowerCase()) {
        throw new BlockchainError('Transfer completed but ownership verification failed', 500);
      }

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        from: fromAddress,
        to: toAddress,
        tokenId,
        contractAddress,
        success: true
      };
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      // Handle specific blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new BlockchainError('Insufficient funds for transfer transaction', 400);
      }
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new BlockchainError('Unable to estimate gas for transfer transaction', 400);
      }
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Transfer failed - token may not exist or not authorized', 403);
      }
      if (error.message?.includes('timeout')) {
        throw new BlockchainError('Transfer transaction timed out', 408);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error during transfer', 503);
      }
      
      throw new BlockchainError(`Failed to transfer NFT: ${error.message}`, 500);
    }
  }

  /**
   * Batch transfer multiple NFTs (for brands with batch processing enabled)
   */
  static async batchTransferNfts(transfers: NFTTransferParams[]): Promise<TransferResult[]> {
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

  /**
   * Get certificates analytics for a business (Web3 enabled or relayer-held)
   */
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
      // Get certificate statistics
      const stats = await Certificate.getStatistics(businessId);
      
      // Get brand settings for context
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      const hasWeb3 = brandSettings?.hasWeb3Features() || false;
      
      // Get recent transfer activity
      const recentActivity = await Certificate.find({ business: businessId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select('tokenId status transferredAt transferTxHash createdAt')
        .lean();

      return {
        total: stats.total,
        minted: stats.minted,
        transferred: stats.transferred,
        failed: stats.failed,
        relayerHeld: hasWeb3 ? stats.minted + stats.failed : stats.total - stats.revoked,
        brandOwned: hasWeb3 ? stats.transferred : 0,
        transferSuccessRate: stats.transferSuccessRate,
        gasUsed: brandSettings?.transferAnalytics?.totalGasUsed || '0',
        recentActivity: recentActivity.map(cert => ({
          tokenId: cert.tokenId,
          status: cert.status,
          transferredAt: cert.transferredAt,
          txHash: cert.transferTxHash,
          createdAt: cert.createdAt
        }))
      };
    } catch (error: any) {
      throw new BlockchainError(`Failed to get certificate analytics: ${error.message}`, 500);
    }
  }

  /**
   * Get certificates by ownership (relayer vs brand wallet)
   */
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
      throw new BlockchainError(`Failed to get certificates by ownership: ${error.message}`, 500);
    }
  }

  /**
   * Retry failed transfers for a business
   */
  static async retryFailedTransfers(businessId: string, limit: number = 10): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const failedCertificates = await Certificate.findFailedTransfers(businessId).limit(limit);
      
      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const cert of failedCertificates) {
        try {
          results.processed++;
          const success = await cert.retryTransfer();
          if (success) {
            results.successful++;
          } else {
            results.failed++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Certificate ${cert._id}: ${error.message}`);
        }
      }

      return results;
    } catch (error: any) {
      throw new BlockchainError(`Failed to retry transfers: ${error.message}`, 500);
    }
  }

  /**
   * Get pending transfers for a business
   */
  static async getPendingTransfers(businessId: string) {
    try {
      return await Certificate.findPendingTransfers(businessId);
    } catch (error: any) {
      throw new BlockchainError(`Failed to get pending transfers: ${error.message}`, 500);
    }
  }

  // ===== EXISTING METHODS (Enhanced) =====

  /**
   * Get all NFT contracts deployed by a specific user/factory
   */
  static async getUserContracts(userAddress: string): Promise<string[]> {
    try {
      if (!userAddress?.trim()) {
        throw new BlockchainError('User address is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        throw new BlockchainError('Invalid user address format', 400);
      }
      
      const nftFactory = this.getNftFactoryContract();
      const count = await nftFactory.getUserContractCount(userAddress);
      const contracts: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const contractAddress = await nftFactory.userContracts(userAddress, i);
        contracts.push(contractAddress);
      }
      
      return contracts;
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Unable to retrieve user contracts - factory contract may be unavailable', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching user contracts', 503);
      }
      
      throw new BlockchainError(`Failed to get user contracts: ${error.message}`, 500);
    }
  }

  /**
   * Get NFT contract metadata with business context
   */
  static async getContractMetadata(contractAddress: string, businessId?: string): Promise<NftContractInfo> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      
      const [name, symbol, totalSupply, owner] = await Promise.all([
        nftContract.name(),
        nftContract.symbol(),
        nftContract.totalSupply?.() || '0',
        nftContract.owner?.() || 'Unknown'
      ]);

      // Get additional business context if available
      let businessContext = {};
      if (businessId) {
        const brandSettings = await BrandSettings.findOne({ business: businessId });
        const certificateCount = await Certificate.countDocuments({ 
          business: businessId, 
          contractAddress 
        });
        
        businessContext = {
          hasWeb3: brandSettings?.hasWeb3Features() || false,
          autoTransferEnabled: brandSettings?.shouldAutoTransfer() || false,
          certificateCount,
          transferSettings: brandSettings?.getTransferSettings()
        };
      }

      return {
        contractAddress,
        totalSupply: parseInt(totalSupply.toString()),
        name,
        symbol,
        owner,
        businessId: businessId || '',
        ...businessContext
      };
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Contract not found or not a valid ERC721 contract', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching contract metadata', 503);
      }
      
      throw new BlockchainError(`Failed to get contract metadata: ${error.message}`, 500);
    }
  }

  /**
   * Get token URI for a specific NFT
   */
  static async getTokenURI(contractAddress: string, tokenId: string): Promise<string> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!tokenId?.trim()) {
        throw new BlockchainError('Token ID is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      return await nftContract.tokenURI(tokenId);
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Token not found or contract unavailable', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching token URI', 503);
      }
      
      throw new BlockchainError(`Failed to get token URI: ${error.message}`, 500);
    }
  }

  /**
   * Get owner of a specific NFT
   */
  static async getTokenOwner(contractAddress: string, tokenId: string): Promise<string> {
    try {
      if (!contractAddress?.trim()) {
        throw new BlockchainError('Contract address is required', 400);
      }
      if (!tokenId?.trim()) {
        throw new BlockchainError('Token ID is required', 400);
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw new BlockchainError('Invalid contract address format', 400);
      }
      
      const nftContract = BlockchainProviderService.getReadOnlyContract(contractAddress, erc721Abi);
      return await nftContract.ownerOf(tokenId);
    } catch (error: any) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new BlockchainError('Token not found or contract unavailable', 404);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching token owner', 503);
      }
      
      throw new BlockchainError(`Failed to get token owner: ${error.message}`, 500);
    }
  }

  /**
   * Check if a contract address is a valid ERC721 contract
   */
  static async isValidNFTContract(contractAddress: string): Promise<boolean> {
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

  /**
   * Get current gas price with optimization for NFT operations
   */
  static async getOptimizedGasPrice(): Promise<string> {
    try {
      const feeData = await BlockchainProviderService.getGasPrice();
      // NFT operations might need higher gas, add 15%
      const gasPrice = feeData.gasPrice! * BigInt(115) / BigInt(100);
      return gasPrice.toString();
    } catch (error: any) {
      if (error.code === 'NETWORK_ERROR') {
        throw new BlockchainError('Blockchain network error while fetching gas price', 503);
      }
      
      throw new BlockchainError(`Failed to get gas price: ${error.message}`, 500);
    }
  }

  /**
   * Legacy method for compatibility with existing certificate service
   */
  async mintNft(businessId: string, params: { productId: string; recipient: string }): Promise<{
    tokenId: string;
    txHash: string;
  }> {
    // Get business contract address
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const contractAddress = brandSettings?.web3Settings?.nftContract;
    
    if (!contractAddress) {
      throw new BlockchainError('No NFT contract found for this business. Please deploy a contract first.', 404);
    }

    // Create token URI (this should be customizable based on your metadata service)
    const tokenUri = `${process.env.METADATA_BASE_URL}/${businessId}/${params.productId}`;
    
    const result = await NftService.mintNFTWithAutoTransfer({
      contractAddress,
      recipient: params.recipient,
      tokenUri,
      businessId,
      productId: params.productId
    });

    return {
      tokenId: result.tokenId,
      txHash: result.txHash
    };
  }
}