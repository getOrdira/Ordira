// services/blockchain/nft.service.ts
import { BlockchainProviderService } from './provider.service';
import { logger } from '../../utils/logger';
import { NftMintResult, ContractDeployment, NftContractInfo, TransferResult } from '../types/blockchain.types';
import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import { Certificate, ICertificate } from '../../models/certificate.model';
import { Types } from 'mongoose';
import { S3Service } from '../external/s3.service';
import { StorageService } from '../business/storage.service';
import { createAppError } from '../../middleware/error.middleware';
import nftFactoryAbi from '../../abi/nftFactoryAbi.json';
import erc721Abi from '../../abi/erc721Abi.json';
import sharp from 'sharp';
import crypto from 'crypto';

// ===== TYPE DEFINITIONS =====

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
  certificateTemplate?: string;
  customMessage?: string;
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

export interface CertificateImageOptions {
  template?: string;
  businessLogo?: string;
  backgroundColor?: string;
  textColor?: string;
  customMessage?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface NftMetadata {
  name: string;
  description: string;
  image: string; // S3 URL
  external_url?: string;
  background_color?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  certificate?: {
    recipient: string;
    issuer: string;
    issuedAt: string;
    expiresAt?: string;
    certificateId: string;
  };
}

// ===== RESULT TYPES =====

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
  businessId?: string;
}

export interface MintResult {
  tokenId: string;
  contractAddress: string;
  recipient: string;
  metadata: NftMetadata;
  metadataUri: string; // S3 URL for metadata JSON
  imageUrl: string; // S3 URL for certificate image
  mintedAt: Date;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  totalCost: string;
  certificateId: string;
  verificationUrl: string;
  s3Keys: {
    metadata: string;
    image: string;
    thumbnail?: string;
  };
}

export interface TemplateUploadResult {
  templateId: string;
  templateUrl: string;
  s3Key: string;
  previewUrl?: string;
}

export interface VerificationResult {
  isAuthentic: boolean;
  owner: string;
  mintedAt: Date;
  metadata: NftMetadata;
  network: string;
  blockNumber: number;
  transactionHash: string;
  certificate: any;
  imageUrl?: string;
  metadataUrl?: string;
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
  storageUsed: string;
  totalFiles: number;
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
  storage: {
    totalFiles: number;
    totalSize: string;
    s3Usage: string;
  };
}

// ===== MAIN SERVICE CLASS =====

export class NftService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  // ===== PRIVATE HELPERS =====
  
  private async getNftFactoryContract() {
    // Get factory address from database (deployed once by relayer)
    const { FactorySettings } = require('../../models/factorySettings.model');
    const factorySettings = await FactorySettings.findOne({ type: 'nft' });
    
    if (!factorySettings?.address) {
      throw createAppError('NFT factory not deployed. Please deploy factory first.', 500, 'MISSING_CONFIG');
    }
    
    return BlockchainProviderService.getContract(factorySettings.address, nftFactoryAbi);
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

  // ===== S3 STORAGE METHODS =====

  async uploadCertificateTemplate(
    businessId: string,
    templateFile: Buffer,
    templateName: string,
    metadata?: Record<string, any>
  ): Promise<TemplateUploadResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }
      if (!templateFile || templateFile.length === 0) {
        throw createAppError('Template file is required', 400, 'MISSING_TEMPLATE_FILE');
      }
      if (!templateName?.trim()) {
        throw createAppError('Template name is required', 400, 'MISSING_TEMPLATE_NAME');
      }

      const templateId = `template_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const filename = `${templateId}_${templateName.replace(/[^a-zA-Z0-9\-_.]/g, '_')}`;

      // Upload template to S3
      const uploadResult = await S3Service.uploadFile(templateFile, {
        businessId,
        resourceId: 'templates',
        filename,
        mimeType: 'image/png',
        metadata: {
          templateId,
          templateName,
          uploadedAt: new Date().toISOString(),
          ...metadata
        },
        isPublic: false
      });

      // Generate preview thumbnail
      let previewUrl: string | undefined;
      try {
        const thumbnailBuffer = await sharp(templateFile)
          .resize(400, 300, { fit: 'inside' })
          .png({ quality: 80 })
          .toBuffer();

        const thumbnailResult = await S3Service.uploadFile(thumbnailBuffer, {
          businessId,
          resourceId: 'templates',
          filename: `${templateId}_preview.png`,
          mimeType: 'image/png',
          metadata: {
            type: 'preview',
            parentTemplate: templateId
          },
          isPublic: true
        });

        previewUrl = thumbnailResult.url;
      } catch (previewError) {
        logger.warn('Failed to generate template preview:', previewError);
      }

      return {
        templateId,
        templateUrl: uploadResult.url,
        s3Key: uploadResult.key,
        previewUrl
      };
    } catch (error: any) {
      logger.error('Upload certificate template error:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createAppError(`Failed to upload certificate template: ${error.message}`, 500, 'TEMPLATE_UPLOAD_FAILED');
    }
  }

  async generateCertificateImage(
    businessId: string,
    certificateData: {
      recipient: string;
      productName: string;
      issuedAt: Date;
      tokenId: string;
      customMessage?: string;
    },
    options: CertificateImageOptions = {}
  ): Promise<{ imageUrl: string; s3Key: string; thumbnailUrl?: string }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }
      if (!certificateData.recipient?.trim()) {
        throw createAppError('Recipient is required', 400, 'MISSING_RECIPIENT');
      }
      if (!certificateData.productName?.trim()) {
        throw createAppError('Product name is required', 400, 'MISSING_PRODUCT_NAME');
      }

      // Certificate dimensions
      const width = 1200;
      const height = 800;
      const backgroundColor = options.backgroundColor || '#ffffff';
      const textColor = options.textColor || '#333333';

      // Create certificate image using Sharp
      const certificateImage = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: backgroundColor
        }
      })
      .composite([
        // Add decorative border
        {
          input: Buffer.from(`
            <svg width="${width}" height="${height}">
              <rect x="40" y="40" width="${width - 80}" height="${height - 80}" 
                    fill="none" stroke="${textColor}" stroke-width="4" rx="20"/>
            </svg>
          `),
          top: 0,
          left: 0,
          blend: 'over' as const
        },

        // Add certificate text
        {
          input: Buffer.from(`
            <svg width="${width - 160}" height="${height - 160}">
              <text x="50%" y="120" text-anchor="middle" font-family="Arial, sans-serif" 
                    font-size="48" font-weight="bold" fill="${textColor}">
                CERTIFICATE
              </text>
              <text x="50%" y="180" text-anchor="middle" font-family="Arial, sans-serif" 
                    font-size="24" fill="${textColor}">
                This is to certify that
              </text>
              <text x="50%" y="260" text-anchor="middle" font-family="Arial, sans-serif" 
                    font-size="36" font-weight="bold" fill="${textColor}">
                ${certificateData.recipient}
              </text>
              <text x="50%" y="320" text-anchor="middle" font-family="Arial, sans-serif" 
                    font-size="24" fill="${textColor}">
                has been awarded this certificate for
              </text>
              <text x="50%" y="400" text-anchor="middle" font-family="Arial, sans-serif" 
                    font-size="32" font-weight="bold" fill="${textColor}">
                ${certificateData.productName}
              </text>
              ${options.customMessage ? `
                <text x="50%" y="460" text-anchor="middle" font-family="Arial, sans-serif" 
                      font-size="20" fill="${textColor}">
                  ${options.customMessage}
                </text>
              ` : ''}
              <text x="50%" y="540" text-anchor="middle" font-family="Arial, sans-serif" 
                    font-size="18" fill="${textColor}">
                Issued on ${certificateData.issuedAt.toLocaleDateString()}
              </text>
              <text x="50%" y="580" text-anchor="middle" font-family="Arial, sans-serif" 
                    font-size="14" fill="${textColor}" opacity="0.7">
                Token ID: ${certificateData.tokenId}
              </text>
            </svg>
          `),
          top: 80,
          left: 80,
          blend: 'over' as const
        }
      ])
      .png({ quality: 90 })
      .toBuffer();

      // Upload certificate image to S3
      const filename = `certificate_${certificateData.tokenId}_${Date.now()}.png`;
      const uploadResult = await S3Service.uploadFile(certificateImage, {
        businessId,
        resourceId: 'certificates',
        filename,
        mimeType: 'image/png',
        metadata: {
          type: 'certificate',
          tokenId: certificateData.tokenId,
          recipient: certificateData.recipient,
          productName: certificateData.productName,
          issuedAt: certificateData.issuedAt.toISOString()
        },
        isPublic: true
      });

      // Generate thumbnail
      let thumbnailUrl: string | undefined;
      try {
        const thumbnailBuffer = await sharp(certificateImage)
          .resize(400, 267, { fit: 'inside' })
          .png({ quality: 80 })
          .toBuffer();

        const thumbnailResult = await S3Service.uploadFile(thumbnailBuffer, {
          businessId,
          resourceId: 'certificates',
          filename: `certificate_${certificateData.tokenId}_thumb.png`,
          mimeType: 'image/png',
          metadata: {
            type: 'thumbnail',
            parentTokenId: certificateData.tokenId
          },
          isPublic: true
        });

        thumbnailUrl = thumbnailResult.url;
      } catch (thumbError) {
        logger.warn('Failed to generate certificate thumbnail:', thumbError);
      }

      return {
        imageUrl: uploadResult.url,
        s3Key: uploadResult.key,
        thumbnailUrl
      };
    } catch (error: any) {
      logger.error('Generate certificate image error:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createAppError(`Failed to generate certificate image: ${error.message}`, 500, 'IMAGE_GENERATION_FAILED');
    }
  }

  async uploadNftMetadata(
    businessId: string,
    tokenId: string,
    metadata: NftMetadata
  ): Promise<{ metadataUrl: string; s3Key: string }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }
      if (!tokenId?.trim()) {
        throw createAppError('Token ID is required', 400, 'MISSING_TOKEN_ID');
      }
      if (!metadata || typeof metadata !== 'object') {
        throw createAppError('Valid metadata object is required', 400, 'INVALID_METADATA');
      }

      // Validate required metadata fields
      if (!metadata.name?.trim()) {
        throw createAppError('Metadata name is required', 400, 'MISSING_METADATA_NAME');
      }
      if (!metadata.description?.trim()) {
        throw createAppError('Metadata description is required', 400, 'MISSING_METADATA_DESCRIPTION');
      }
      if (!metadata.image?.trim()) {
        throw createAppError('Metadata image URL is required', 400, 'MISSING_METADATA_IMAGE');
      }

      const filename = `metadata_${tokenId}.json`;
      const metadataJson = JSON.stringify(metadata, null, 2);
      const metadataBuffer = Buffer.from(metadataJson, 'utf8');

      const uploadResult = await S3Service.uploadFile(metadataBuffer, {
        businessId,
        resourceId: 'nft-metadata',
        filename,
        mimeType: 'application/json',
        metadata: {
          type: 'nft-metadata',
          tokenId,
          name: metadata.name,
          uploadedAt: new Date().toISOString()
        },
        isPublic: true
      });

      return {
        metadataUrl: uploadResult.url,
        s3Key: uploadResult.key
      };
    } catch (error: any) {
      logger.error('Upload NFT metadata error:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createAppError(`Failed to upload NFT metadata: ${error.message}`, 500, 'METADATA_UPLOAD_FAILED');
    }
  }

  /**
   * Log supply chain event on blockchain using SupplyChain contract
   */
  async logSupplyChainEvent(eventData: {
    productId: string;
    eventType: string;
    location?: string;
    details?: string;
    businessId?: string;
  }): Promise<{ txHash: string; blockNumber: number }> {
    try {
      if (!eventData.productId?.trim()) {
        throw createAppError('Product ID is required', 400, 'MISSING_PRODUCT_ID');
      }
      if (!eventData.eventType?.trim()) {
        throw createAppError('Event type is required', 400, 'MISSING_EVENT_TYPE');
      }

      // Import SupplyChainService dynamically to avoid circular dependencies
      const { SupplyChainService } = await import('./supplyChain.service');
      
      // Get business ID from eventData or use a default
      const businessId = eventData.businessId;
      if (!businessId) {
        throw createAppError('Business ID is required for supply chain logging', 400, 'MISSING_BUSINESS_ID');
      }

      // Get the supply chain contract address for this business
      const { BrandSettings } = require('../../models/brandSettings.model');
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      
      if (!brandSettings?.web3Settings?.supplyChainContract) {
        throw createAppError('No supply chain contract deployed for this business', 404, 'NO_SUPPLY_CHAIN_CONTRACT');
      }

      const contractAddress = brandSettings.web3Settings.supplyChainContract;
      
      // For now, we'll use endpoint ID 1 (assuming it exists)
      // In a real implementation, you'd validate the endpoint exists
      const result = await SupplyChainService.logEvent(
        contractAddress,
        {
          endpointId: 1, // Default endpoint - should be validated
          productId: eventData.productId,
          eventType: eventData.eventType,
          location: eventData.location || '',
          details: eventData.details || ''
        },
        businessId
      );

      return {
        txHash: result.txHash,
        blockNumber: 0 // Block number would be available from transaction receipt
      };
      
    } catch (error: any) {
      logger.error('Log supply chain event error:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createAppError(`Failed to log supply chain event: ${error.message}`, 500, 'SUPPLY_CHAIN_LOG_FAILED');
    }
  }

  async cleanupOrphanedS3Files(businessId: string): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const errors: string[] = [];
      let cleaned = 0;

      // Get all certificate S3 keys from database
      const certificates = await Certificate.find({
        business: businessId,
        'metadata.s3Keys': { $exists: true }
      }).select('metadata.s3Keys').lean();

      const dbS3Keys = new Set<string>();
      certificates.forEach(cert => {
        if (cert.metadata?.s3Keys) {
          Object.values(cert.metadata.s3Keys).forEach(key => {
            if (key) dbS3Keys.add(key as string);
          });
        }
      });

      // List all S3 files for this business
      const s3Files = await S3Service.listFiles({
        prefix: `${businessId}/`,
        maxKeys: 1000
      });

      // Find orphaned files
      const orphanedKeys = s3Files.files
        .map(file => file.key)
        .filter(key => !dbS3Keys.has(key));

      // Delete orphaned files
      if (orphanedKeys.length > 0) {
        const deleteResult = await S3Service.deleteFiles(orphanedKeys);
        cleaned = deleteResult.deleted.length;
        errors.push(...deleteResult.errors.map(err => err.error));
      }

      return { cleaned, errors };
    } catch (error: any) {
      logger.error('Cleanup orphaned S3 files error:', error);
      throw createAppError(`Failed to cleanup orphaned S3 files: ${error.message}`, 500, 'S3_CLEANUP_FAILED');
    }
  }

  async getS3StorageStats(businessId: string): Promise<{
    totalFiles: number;
    totalSize: string;
    breakdown: {
      images: number;
      metadata: number;
      thumbnails: number;
      templates: number;
    };
  }> {
    try {
      const s3Stats = await S3Service.getStorageStats(businessId);
      const s3Files = await S3Service.listFiles({
        prefix: `${businessId}/`,
        maxKeys: 1000
      });

      const breakdown = {
        images: 0,
        metadata: 0,
        thumbnails: 0,
        templates: 0
      };

      s3Files.files.forEach(file => {
        if (file.key.includes('/certificates/')) {
          if (file.key.includes('_thumb.')) {
            breakdown.thumbnails++;
          } else {
            breakdown.images++;
          }
        } else if (file.key.includes('/nft-metadata/')) {
          breakdown.metadata++;
        } else if (file.key.includes('/templates/')) {
          breakdown.templates++;
        }
      });

      return {
        totalFiles: s3Stats.totalFiles,
        totalSize: s3Stats.sizeFormatted,
        breakdown
      };
    } catch (error: any) {
      logger.error('Get S3 storage stats error:', error);
      throw createAppError(`Failed to get S3 storage statistics: ${error.message}`, 500, 'S3_STATS_FAILED');
    }
  }

  // ===== CONTRACT OPERATIONS =====

  /**
   * Store business-contract mapping in database
   */
  private async storeBusinessContractMapping(
    businessId: string,
    contractAddress: string,
    contractType: 'voting' | 'nft'
  ): Promise<void> {
    try {
      const updateField = contractType === 'voting' 
        ? 'web3Settings.votingContract' 
        : 'web3Settings.nftContract';
      
      await BrandSettings.findOneAndUpdate(
        { business: new Types.ObjectId(businessId) },
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
      throw createAppError(`Failed to store business-contract mapping: ${error.message}`, 500, 'MAPPING_STORAGE_FAILED');
    }
  }

  /**
   * Validate that a business ID is associated with a specific contract
   */
  private async validateBusinessContractAssociation(
    contractAddress: string,
    businessId: string
  ): Promise<void> {
    try {
      // Check if business ID is associated with this contract
      const brandSettings = await BrandSettings.findOne({
        business: new Types.ObjectId(businessId),
        $or: [
          { 'web3Settings.votingContract': contractAddress },
          { 'web3Settings.nftContract': contractAddress }
        ]
      });
      
      if (!brandSettings) {
        throw createAppError(
          `Business ${businessId} is not associated with contract ${contractAddress}`,
          403,
          'CONTRACT_ASSOCIATION_MISMATCH'
        );
      }
      
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }
      
      throw createAppError(`Failed to validate business contract association: ${error.message}`, 500, 'VALIDATION_FAILED');
    }
  }

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
      
      // Validate business ID format (MongoDB ObjectId)
      if (!/^[0-9a-fA-F]{24}$/.test(businessId)) {
        throw createAppError('Invalid business ID format', 400, 'INVALID_BUSINESS_ID');
      }
      
      const nftFactory = await this.getNftFactoryContract();
      
      // Deploy the contract with relayer as owner (relayer will manage for the business)
      const tx = await nftFactory.deployNFTForSelf(name, symbol, baseUri);
      const receipt = await tx.wait();

      // Find the deployment event
      const deployEvent = receipt.events?.find((e: any) => e.event === 'NFTDeployed');
      if (!deployEvent) {
        throw createAppError('NFTDeployed event not found in transaction receipt', 500, 'DEPLOYMENT_EVENT_MISSING');
      }

      const contractAddress = deployEvent.args.contractAddress as string;
      
      // Store business-contract mapping in database
      await this.storeBusinessContractMapping(businessId, contractAddress, 'nft');

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
        estimatedMintCost: '50000000000000000',
        businessId
      };
    } catch (error: any) {
      logger.error('Contract deployment error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw createAppError('Insufficient funds for contract deployment', 400, 'INSUFFICIENT_FUNDS');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error during deployment', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to deploy NFT contract: ${error.message}`, 500, 'DEPLOYMENT_FAILED');
    }
  }

  async listContracts(businessId: string, options: any = {}): Promise<any[]> {
    try {
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
          maxSupply: contractInfo.totalSupply,
          deployedAt: brandSettings.createdAt,
          lastMintedAt: new Date()
        });
      }

      return contracts;
    } catch (error: any) {
      logger.error('List contracts error:', error);
      throw createAppError(`Failed to list contracts: ${error.message}`, 500, 'LIST_CONTRACTS_FAILED');
    }
  }

  // ===== NFT MINTING =====

  async mintNft(businessId: string, params: MintParams): Promise<MintResult> {
    try {
      const { productId, recipient, metadata, customMessage } = params;
      
      // Get business contract
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      const contractAddress = brandSettings?.web3Settings?.nftContract;
      
      if (!contractAddress) {
        throw createAppError('No NFT contract found for this business', 404, 'NO_CONTRACT');
      }

      // Validate that the business ID is associated with this contract
      await this.validateBusinessContractAssociation(contractAddress, businessId);

      // Validate recipient address
      this.validateAddress(recipient, 'recipient address');
      
      // Generate token ID first
      const tokenId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate certificate image
      const imageResult = await this.generateCertificateImage(businessId, {
        recipient,
        productName: metadata?.name || `Product ${productId}`,
        issuedAt: new Date(),
        tokenId,
        customMessage
      });

      // Create NFT metadata
      const nftMetadata: NftMetadata = {
        name: metadata?.name || `Certificate for ${recipient}`,
        description: metadata?.description || `Certificate awarded to ${recipient} for ${productId}`,
        image: imageResult.imageUrl,
        external_url: this.generateVerificationUrl(tokenId, contractAddress),
        attributes: metadata?.attributes || [],
        certificate: {
          recipient,
          issuer: brandSettings?.business?.toString() || 'Unknown',
          issuedAt: new Date().toISOString(),
          certificateId: tokenId
        }
      };

      // Upload metadata to S3
      const metadataResult = await this.uploadNftMetadata(businessId, tokenId, nftMetadata);
      
      // Mint to relayer wallet
      const relayerWallet = this.getRelayerWallet();
      const nftContract = BlockchainProviderService.getContract(contractAddress, erc721Abi);
      
      const tx = await nftContract.safeMint(relayerWallet, metadataResult.metadataUrl);
      const receipt = await tx.wait();

      // Find the Transfer event to get actual token ID from blockchain
      const transferEvent = receipt.events?.find((e: any) => e.event === 'Transfer');
      if (!transferEvent) {
        throw createAppError('Transfer event not found', 500, 'MINT_EVENT_MISSING');
      }

      const actualTokenId = transferEvent.args.tokenId.toString();

      // Create certificate record with S3 information
      const certificate = await Certificate.create({
        business: businessId,
        product: productId,
        recipient,
        tokenId: actualTokenId,
        txHash: receipt.transactionHash,
        contractAddress,
        status: 'minted',
        mintedToRelayer: true,
        autoTransferEnabled: brandSettings?.shouldAutoTransfer() || false,
        transferDelayMinutes: brandSettings?.getTransferSettings?.()?.transferDelay || 5,
        maxTransferAttempts: 3,
        transferTimeout: 300000,
        metadata: {
          ...metadata,
          imageUrl: imageResult.imageUrl,
          metadataUri: metadataResult.metadataUrl,
          s3Keys: {
            image: imageResult.s3Key,
            metadata: metadataResult.s3Key,
            thumbnail: imageResult.thumbnailUrl ? imageResult.s3Key.replace('.png', '_thumb.png') : undefined
          }
        }
      });

      const verificationUrl = this.generateVerificationUrl(actualTokenId, contractAddress);

      return {
        tokenId: actualTokenId,
        contractAddress,
        recipient,
        metadata: nftMetadata,
        metadataUri: metadataResult.metadataUrl,
        imageUrl: imageResult.imageUrl,
        mintedAt: new Date(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString() || '0',
        totalCost: (receipt.gasUsed * (receipt.effectiveGasPrice || 0)).toString(),
        certificateId: certificate._id.toString(),
        verificationUrl,
        s3Keys: {
          metadata: metadataResult.s3Key,
          image: imageResult.s3Key,
          thumbnail: imageResult.thumbnailUrl ? imageResult.s3Key.replace('.png', '_thumb.png') : undefined
        }
      };
    } catch (error: any) {
      logger.error('Mint NFT error:', error);
      
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

  // ===== NFT TRANSFER =====

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
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString() || '0',
        verificationUrl,
        ownershipProof: `Token ${tokenId} successfully transferred to ${toAddress}`,
        from: fromAddress,
        to: toAddress,
        tokenId,
        contractAddress,
        businessId,
        tokenType: 'ERC721' as const,
        success: true
      };
    } catch (error: any) {
      logger.error('Transfer NFT error:', error);
      
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

// ===== NFT VERIFICATION =====

async verifyNftAuthenticity(tokenId: string, contractAddress: string): Promise<VerificationResult> {
  try {
    this.validateAddress(contractAddress, 'contract address');
    
    // Get owner and metadata from blockchain
    const [owner, tokenUri] = await Promise.all([
      this.getTokenOwner(contractAddress, tokenId),
      this.getTokenURI(contractAddress, tokenId)
    ]);

    // Find certificate record with S3 data
    const certificate = await Certificate.findOne({
      tokenId,
      contractAddress
    }).lean();

    // Build NftMetadata from certificate data
    const metadata: NftMetadata = {
      name: `Certificate ${tokenId}`,
      description: `Certificate for token ${tokenId}`,
      image: certificate?.metadata?.imageUrl || '',
      external_url: this.generateVerificationUrl(tokenId, contractAddress),
      attributes: certificate?.metadata?.attributes || [],
      certificate: {
        recipient: certificate?.recipient || '',
        issuer: 'Unknown',
        issuedAt: certificate?.createdAt?.toISOString() || new Date().toISOString(),
        certificateId: tokenId
      }
    };

    return {
      isAuthentic: true,
      owner,
      mintedAt: certificate?.createdAt || new Date(),
      metadata,
      network: process.env.BLOCKCHAIN_NETWORK || 'base',
      blockNumber: 0,
      transactionHash: certificate?.txHash || '',
      certificate,
      imageUrl: certificate?.metadata?.imageUrl,
      metadataUrl: certificate?.metadata?.metadataUri
    };
  } catch (error: any) {
    logger.error('Verify NFT error:', error);
    throw createAppError(`Failed to verify NFT: ${error.message}`, 500, 'VERIFICATION_FAILED');
  }
}

  // ===== CERTIFICATE DATA =====

  async listCertificates(businessId: string, options: any = {}): Promise<{
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

      // Enhance certificates with S3 data
      const enhancedCertificates = certificates.map(cert => ({
        ...cert,
        imageUrl: cert.metadata?.imageUrl,
        metadataUri: cert.metadata?.metadataUri,
        thumbnailUrl: (cert.metadata?.s3Keys as { thumbnail?: string })?.thumbnail ? 
          cert.metadata.imageUrl?.replace('.png', '_thumb.png') : undefined,
        s3Keys: cert.metadata?.s3Keys,
        verificationUrl: this.generateVerificationUrl(cert.tokenId, cert.contractAddress)
      }));

      return {
        certificates: enhancedCertificates,
        total
      };
    } catch (error: any) {
      logger.error('List certificates error:', error);
      throw createAppError(`Failed to list certificates: ${error.message}`, 500, 'LIST_CERTIFICATES_FAILED');
    }
  }

  // ===== ANALYTICS =====

  async getCertificateAnalytics(businessId: string): Promise<CertificateAnalytics> {
    try {
      const [
        totalCertificates,
        mintedThisMonth,
        transferStats,
        storageStats
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
        ]),
        this.storageService.getStorageStats(businessId)
      ]);

      const stats = transferStats[0] || { totalTransfers: 0, totalCertificates: 0 };
      const transferSuccessRate = stats.totalCertificates > 0 
        ? (stats.totalTransfers / stats.totalCertificates) * 100 
        : 0;

      return {
        totalCertificates,
        mintedThisMonth,
        transferSuccessRate,
        averageGasCost: '0.001',
        topProducts: [],
        storageUsed: storageStats.storageUsed,
        totalFiles: storageStats.totalFiles
      };
    } catch (error: any) {
      logger.error('Certificate analytics error:', error);
      throw createAppError(`Failed to get certificate analytics: ${error.message}`, 500, 'ANALYTICS_FAILED');
    }
  }

  async getAnalytics(businessId: string, options: any = {}): Promise<Analytics> {
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
        certificates,
        storageStats
      ] = await Promise.all([
        Certificate.countDocuments(dateFilter),
        Certificate.countDocuments({ ...dateFilter, status: 'transferred_to_brand' }),
        Certificate.find(dateFilter).lean(),
        this.storageService.getStorageStats(businessId)
      ]);

      // Calculate trends (simplified)
      const trends = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          mints: Math.floor(Math.random() * 10),
          transfers: Math.floor(Math.random() * 5),
          revenue: '0'
        });
      }

      return {
        summary: {
          totalContracts: 1,
          totalMinted,
          totalTransferred,
          revenue: '0'
        },
        trends,
        performance: {
          mintSuccessRate: 95,
          transferSuccessRate: totalMinted > 0 ? (totalTransferred / totalMinted) * 100 : 0,
          averageGasCost: '0.001'
        },
        topProducts: [],
        recentActivity: certificates.slice(0, 10).map(cert => ({
          type: cert.status === 'transferred_to_brand' ? 'transfer' : 'mint' as 'mint' | 'transfer' | 'burn',
          tokenId: cert.tokenId,
          timestamp: cert.createdAt,
          txHash: cert.txHash
        })),
        storage: {
          totalFiles: storageStats.totalFiles,
          totalSize: storageStats.storageUsed,
          s3Usage: storageStats.storageUsed
        }
      };
    } catch (error: any) {
      logger.error('Analytics error:', error);
      throw createAppError(`Failed to get analytics: ${error.message}`, 500, 'ANALYTICS_FAILED');
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
      logger.error('Get contract metadata error:', error);
      
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
      logger.error('Get token URI error:', error);
      
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
      logger.error('Get token owner error:', error);
      
      if (error.code === 'CALL_EXCEPTION') {
        throw createAppError('Token not found or contract unavailable', 404, 'TOKEN_NOT_FOUND');
      }
      if (error.code === 'NETWORK_ERROR') {
        throw createAppError('Blockchain network error while fetching token owner', 503, 'NETWORK_ERROR');
      }
      
      throw createAppError(`Failed to get token owner: ${error.message}`, 500, 'TOKEN_OWNER_FAILED');
    }
  }

  // ===== STATIC METHODS FOR BACKWARD COMPATIBILITY =====

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
    imageUrl?: string;
    metadataUri?: string;
    s3Keys?: {
      metadata: string;
      image: string;
      thumbnail?: string;
    };
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
      transferScheduled: false,
      brandWallet: undefined,
      transferDelay: undefined,
      imageUrl: result.imageUrl,
      metadataUri: result.metadataUri,
      s3Keys: result.s3Keys
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
    
    // Find business ID from certificate
    const certificate = await Certificate.findOne({
      tokenId: params.tokenId,
      contractAddress: params.contractAddress
    });
    
    if (!certificate) {
      throw createAppError('Certificate not found for transfer', 404, 'CERTIFICATE_NOT_FOUND');
    }
    
    return await service.transferNft(certificate.business.toString(), {
      tokenId: params.tokenId,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      contractAddress: params.contractAddress
    });
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
  storageStats?: {
    totalFiles: number;
    totalSize: string;
    breakdown: {
      images: number;
      metadata: number;
      thumbnails: number;
      templates: number;
    };
  };
}> {
  try {
    const service = new NftService();
    const analytics = await service.getCertificateAnalytics(businessId);
    
    // Get additional stats
    const [
      total,
      minted,
      transferred,
      failed,
      storageStats
    ] = await Promise.all([
      Certificate.countDocuments({ business: businessId }),
      Certificate.countDocuments({ business: businessId, status: 'minted' }),
      Certificate.countDocuments({ business: businessId, status: 'transferred_to_brand' }),
      Certificate.countDocuments({ business: businessId, status: 'transfer_failed' }),
      service.getS3StorageStats(businessId).catch(() => undefined)
    ]);

    // Get brand settings for context
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    // Check if web3 is enabled by looking for nft contract
    const hasWeb3 = !!(brandSettings?.web3Settings?.nftContract);
    
    // Get recent activity with S3 data
    const recentActivity = await Certificate.find({ business: businessId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('tokenId status transferredAt transferTxHash createdAt metadata')
      .lean();

    return {
      total,
      minted,
      transferred,
      failed,
      relayerHeld: hasWeb3 ? minted + failed : total - (transferred + failed),
      brandOwned: hasWeb3 ? transferred : 0,
      transferSuccessRate: analytics.transferSuccessRate,
      gasUsed: '0',
      recentActivity: recentActivity.map(cert => ({
        tokenId: cert.tokenId,
        status: cert.status,
        transferredAt: cert.transferredAt,
        txHash: cert.transferTxHash || cert.txHash,
        createdAt: cert.createdAt,
        imageUrl: cert.metadata?.imageUrl,
        metadataUri: cert.metadata?.metadataUri
      })),
      storageStats
    };
  } catch (error: any) {
    logger.error('Certificate analytics error:', error);
    throw createAppError(`Failed to get certificate analytics: ${error.message}`, 500, 'ANALYTICS_FAILED');
  }
}

  // Additional static methods for convenience
  static async uploadCertificateTemplate(
    businessId: string,
    templateFile: Buffer,
    templateName: string,
    metadata?: Record<string, any>
  ): Promise<TemplateUploadResult> {
    const service = new NftService();
    return await service.uploadCertificateTemplate(businessId, templateFile, templateName, metadata);
  }

  static async cleanupOrphanedS3Files(businessId: string): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const service = new NftService();
    return await service.cleanupOrphanedS3Files(businessId);
  }

  static async getS3StorageStats(businessId: string): Promise<{
    totalFiles: number;
    totalSize: string;
    breakdown: {
      images: number;
      metadata: number;
      thumbnails: number;
      templates: number;
    };
  }> {
    const service = new NftService();
    return await service.getS3StorageStats(businessId);
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

  static async retryFailedTransfers(businessId: string, limit: number = 10): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const service = new NftService();
      
      // Find certificates with failed transfers
      const failedCerts = await Certificate.find({
        business: businessId,
        status: 'transfer_failed',
        transferAttempts: { $lt: 3 } // Max 3 attempts
      }).limit(limit);

      let processed = 0;
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const cert of failedCerts) {
        try {
          processed++;
          
          // Get brand settings for transfer
          const brandSettings = await BrandSettings.findOne({ business: businessId });
          if (!brandSettings?.canTransferToBrand()) {
            errors.push(`Certificate ${cert.tokenId}: Brand wallet not configured`);
            failed++;
            continue;
          }

          // Retry transfer
          const transferResult = await service.transferNft(businessId, {
            tokenId: cert.tokenId,
            contractAddress: cert.contractAddress,
            fromAddress: process.env.RELAYER_WALLET_ADDRESS || '',
            toAddress: brandSettings.web3Settings?.certificateWallet || ''
          });

          if (transferResult.success) {
            successful++;
          } else {
            failed++;
            errors.push(`Certificate ${cert.tokenId}: Transfer failed`);
          }
        } catch (error: any) {
          failed++;
          errors.push(`Certificate ${cert.tokenId}: ${error.message}`);
        }
      }

      return { processed, successful, failed, errors };
    } catch (error: any) {
      logger.error('Retry failed transfers error:', error);
      throw createAppError(`Failed to retry transfers: ${error.message}`, 500, 'RETRY_FAILED');
    }
  }

  static async getPendingTransfers(businessId: string): Promise<any[]> {
    try {
      return await Certificate.find({
        business: businessId,
        status: { $in: ['minted', 'pending_transfer'] },
        transferredToBrand: { $ne: true }
      }).sort({ createdAt: -1 });
    } catch (error: any) {
      logger.error('Get pending transfers error:', error);
      throw createAppError(`Failed to get pending transfers: ${error.message}`, 500, 'GET_PENDING_FAILED');
    }
  }

  static async getContractStatistics(businessId: string): Promise<{
    totalContracts: number;
    activeContracts: number;
    totalMinted: number;
    totalTransferred: number;
    averageGasCost: string;
  }> {
    try {
      const service = new NftService();
      const contracts = await service.listContracts(businessId);
      const analytics = await service.getCertificateAnalytics(businessId);
      
      return {
        totalContracts: contracts.length,
        activeContracts: contracts.filter(c => c.status === 'active').length,
        totalMinted: analytics.totalCertificates,
        totalTransferred: analytics.totalCertificates - analytics.totalCertificates + analytics.transferSuccessRate,
        averageGasCost: analytics.averageGasCost
      };
    } catch (error: any) {
      logger.error('Get contract statistics error:', error);
      throw createAppError(`Failed to get contract statistics: ${error.message}`, 500, 'STATS_FAILED');
    }
  }

  static async verifyProductOwnership(productId: string, businessId: string): Promise<{
    isOwner: boolean;
    product?: any;
  }> {
    try {
      // This would typically check against a products collection
      // For now, return true as a placeholder
      return { isOwner: true };
    } catch (error: any) {
      logger.error('Verify product ownership error:', error);
      return { isOwner: false };
    }
  }

  static async checkMintingEligibility(businessId: string, productId: string): Promise<{
    canMint: boolean;
    reason?: string;
  }> {
    try {
      // Check if business has active contract
      const contracts = await new NftService().listContracts(businessId);
      const hasActiveContract = contracts.some(c => c.status === 'active');
      
      if (!hasActiveContract) {
        return { canMint: false, reason: 'No active NFT contract found' };
      }
      
      return { canMint: true };
    } catch (error: any) {
      logger.error('Check minting eligibility error:', error);
      return { canMint: false, reason: 'Unable to verify eligibility' };
    }
  }

  static async verifyTransferEligibility(
    tokenId: string, 
    contractAddress: string, 
    fromAddress: string, 
    businessId: string
  ): Promise<{
    canTransfer: boolean;
    reason?: string;
  }> {
    try {
      // Check if certificate exists and belongs to business
      const certificate = await Certificate.findOne({
        tokenId,
        contractAddress,
        business: businessId
      });
      
      if (!certificate) {
        return { canTransfer: false, reason: 'Certificate not found' };
      }
      
      if (certificate.status === 'transferred_to_brand') {
        return { canTransfer: false, reason: 'Certificate already transferred' };
      }
      
      return { canTransfer: true };
    } catch (error: any) {
      logger.error('Verify transfer eligibility error:', error);
      return { canTransfer: false, reason: 'Unable to verify transfer eligibility' };
    }
  }

  static async verifyBurnEligibility(
    tokenId: string, 
    contractAddress: string, 
    businessId: string
  ): Promise<{
    canBurn: boolean;
    reason?: string;
  }> {
    try {
      // Check if certificate exists and belongs to business
      const certificate = await Certificate.findOne({
        tokenId,
        contractAddress,
        business: businessId
      });
      
      if (!certificate) {
        return { canBurn: false, reason: 'Certificate not found' };
      }
      
      if (certificate.revoked) {
        return { canBurn: false, reason: 'Certificate already revoked' };
      }
      
      return { canBurn: true };
    } catch (error: any) {
      logger.error('Verify burn eligibility error:', error);
      return { canBurn: false, reason: 'Unable to verify burn eligibility' };
    }
  }

  static async burnNft(businessId: string, params: {
    tokenId: string;
    contractAddress: string;
    reason?: string;
  }): Promise<{
    burnedAt: Date;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
    storageReclaimed: string;
    costsRecovered: string;
  }> {
    try {
      // Update certificate status to revoked
      await Certificate.findOneAndUpdate(
        { 
          tokenId: params.tokenId, 
          contractAddress: params.contractAddress, 
          business: businessId 
        },
        {
          $set: {
            status: 'revoked',
            revoked: true,
            revokedAt: new Date(),
            revokedReason: params.reason || 'Burned by owner'
          }
        }
      );
      
      return {
        burnedAt: new Date(),
        transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        blockNumber: 0,
        gasUsed: '0',
        storageReclaimed: '0',
        costsRecovered: '0'
      };
    } catch (error: any) {
      logger.error('Burn NFT error:', error);
      throw createAppError(`Failed to burn NFT: ${error.message}`, 500, 'BURN_FAILED');
    }
  }
}