// src/services/business/certificate.service.ts
import { Certificate, ICertificate } from '../../models/certificate.model';
import { logger } from '../../utils/logger'; 
import { BrandSettings } from '../../models/brandSettings.model';
import { Business } from '../../models/business.model';
import { NftService } from '../blockchain/nft.service';
import { NotificationsService } from '../external/notifications.service';
import { AnalyticsBusinessService } from './analytics.service';
import { MediaService } from './media.service';
import { S3Service } from '../external/s3.service';

type CreateCertInput = {
  productId: string;
  recipient: string;
  contactMethod: 'email' | 'sms' | 'wallet';
  certificateImage?: Express.Multer.File; // New: Optional certificate image
  metadata?: {
    customMessage?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
    certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
    expirationDate?: Date;
    imageUrl?: string; // For custom certificate images
    templateId?: string; // For certificate templates
    metadataUri?: string; // S3 metadata URI
    s3Keys?: {
      image?: string;
      metadata?: string;
    };
  };
  deliveryOptions?: {
    scheduleDate?: Date;
    priority?: 'standard' | 'priority' | 'urgent';
    notifyRecipient?: boolean;
  };
  web3Options?: {
    autoTransfer?: boolean;
    transferDelay?: number;
    brandWallet?: string;
    requireCustomerConfirmation?: boolean;
    gasOptimization?: boolean;
  };
};

type BatchCreateInput = {
  productId: string;
  recipients: Array<{
    address: string;
    contactMethod: 'email' | 'sms' | 'wallet';
    customData?: any;
    certificateImage?: Express.Multer.File; // Individual certificate images
  }>;
  batchOptions?: {
    delayBetweenCerts?: number;
    maxConcurrent?: number;
    continueOnError?: boolean;
    batchTransfer?: boolean;
    transferBatchSize?: number;
    gasOptimization?: boolean;
  };
  planLevel?: string;
  hasWeb3?: boolean;
  shouldAutoTransfer?: boolean;
  transferSettings?: any;
  initiatedBy?: string;
  jobMetadata?: any;
};

type TransferResult = {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  transferredAt: Date;
};

type BatchJobResult = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedCompletion: Date;
  queuePosition: number;
  estimatedStartTime: Date;
  webhookUrl?: string;
};

type BatchProgress = {
  id: string;
  status: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  web3?: {
    minted: number;
    transfersScheduled: number;
    transfersCompleted: number;
    transfersFailed: number;
    totalGasUsed: string;
  };
  estimatedCompletion?: Date;
  averageProcessingTime?: number;
  remainingTime?: number;
  errors?: Array<{
    certificateId?: string;
    recipient: string;
    error: string;
    timestamp: Date;
  }>;
};

type CertificateMetadata = {
  s3Keys?: {
    original?: string;
    thumbnail?: string;
  };
  imageUrl?: string;
};

export class CertificateService {
  private nftService = new NftService();
  private notificationsService = new NotificationsService();
  private analyticsService = new AnalyticsBusinessService();
  private mediaService = new MediaService();

  /**
   * Create certificate with S3 asset storage and automatic brand transfer
   */
  async createCertificate(businessId: string, input: CreateCertInput): Promise<ICertificate> {
    try {
      // Get brand settings to check for wallet and Web3 capabilities
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      const hasWeb3 = brandSettings?.hasWeb3Features() || false;
      const shouldAutoTransfer = brandSettings?.shouldAutoTransfer() || false;

      // Validate product ownership
      const productExists = await this.validateProductOwnership(businessId, input.productId);
      if (!productExists) {
        throw new Error('Product not found or access denied');
      }

      // Check for duplicate certificates
      const existingCert = await Certificate.findOne({
        business: businessId,
        product: input.productId,
        recipient: input.recipient
      });

      if (existingCert) {
        throw new Error('Certificate already exists for this recipient and product');
      }

      // Handle certificate image upload to S3
      let certificateImageUrl = input.metadata?.imageUrl;
      let certificateImageS3Key: string | undefined;

      if (input.certificateImage) {
        try {
          const imageMedia = await this.mediaService.saveMedia(
            input.certificateImage,
            businessId,
            {
              category: 'certificate',
              description: `Certificate image for ${input.productId}`,
              tags: ['certificate', 'nft', input.productId],
              resourceId: input.productId,
              isPublic: true // Make public for NFT metadata
            }
          );

          certificateImageUrl = imageMedia.url;
          certificateImageS3Key = imageMedia.s3Key;
        } catch (imageError) {
          logger.warn('Certificate image upload failed:', imageError);
          // Continue without image rather than failing the entire certificate
        }
      }

      // Generate NFT metadata with S3-hosted assets
      const nftMetadata = await this.generateNFTMetadata(businessId, {
        productId: input.productId,
        recipient: input.recipient,
        certificateLevel: input.metadata?.certificateLevel || 'bronze',
        customMessage: input.metadata?.customMessage,
        attributes: input.metadata?.attributes || [],
        expirationDate: input.metadata?.expirationDate,
        imageUrl: certificateImageUrl,
        templateId: input.metadata?.templateId
      });

      // Store metadata JSON in S3
      const metadataS3Key = await this.storeNFTMetadataInS3(businessId, input.productId, nftMetadata);

      // Mint NFT using the NFT service with S3 metadata URL
      let mintResult;
      const metadataUri = `${process.env.S3_PUBLIC_URL || process.env.METADATA_BASE_URL}/${metadataS3Key}`;

      if (hasWeb3 && brandSettings?.web3Settings?.nftContract) {
        // Use existing contract
        mintResult = await NftService.mintNFTWithAutoTransfer({
          contractAddress: brandSettings.web3Settings.nftContract,
          recipient: input.recipient,
          tokenUri: metadataUri,
          businessId,
          productId: input.productId
        });
      } else {
        // Traditional minting to relayer wallet
        mintResult = await this.nftService.mintNft(businessId, {
          productId: input.productId,
          recipient: input.recipient,
          metadata: nftMetadata
        });
      }

      // Create certificate record with S3 references
      const cert = await Certificate.create({
        business: businessId,
        product: input.productId,
        recipient: input.recipient,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
        contractAddress: mintResult.contractAddress,
        status: mintResult.transferScheduled ? 'pending_transfer' : 'minted',
        mintedToRelayer: !mintResult.transferScheduled,
        transferredToBrand: false,
        autoTransferEnabled: shouldAutoTransfer,
        transferScheduled: mintResult.transferScheduled,
        brandWallet: mintResult.brandWallet,
        transferDelay: mintResult.transferDelay,
        metadata: {
          ...input.metadata,
          imageUrl: certificateImageUrl,
          metadataUri,
          s3Keys: {
            image: certificateImageS3Key,
            metadata: metadataS3Key
          }
        },
        deliveryOptions: input.deliveryOptions,
        web3Options: input.web3Options,
        createdAt: new Date()
      });

      // Handle automatic transfer if configured
      if (shouldAutoTransfer && brandSettings?.certificateWallet) {
        await this.handleAutoTransfer(cert, brandSettings, mintResult);
      }

      // Send customer notification with S3 assets
      await this.sendCustomerNotification(cert, input.contactMethod, hasWeb3);

      // Send brand notification
      await this.notificationsService.notifyBrandOfCertificateMinted(
        businessId, 
        cert._id.toString(),
        {
          recipient: input.recipient,
          tokenId: mintResult.tokenId,
          txHash: mintResult.txHash,
          transferScheduled: mintResult.transferScheduled,
          brandWallet: mintResult.brandWallet,
          autoTransferEnabled: shouldAutoTransfer
        }
      );

      // Update analytics
      await this.analyticsService.trackEvent('certificate_created', {
        businessId,
        certificateId: cert._id.toString(),
        productId: input.productId,
        recipient: input.recipient,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash
      });

      return cert;

    } catch (error: any) {
      logger.error('Certificate creation failed:', error);
      throw new Error(`Failed to create certificate: ${error.message}`);
    }
  }

  /**
   * Generate NFT metadata with S3 assets
   */
  private async generateNFTMetadata(businessId: string, options: {
    productId: string;
    recipient: string;
    certificateLevel: string;
    customMessage?: string;
    attributes?: Array<any>;
    expirationDate?: Date;
    imageUrl?: string;
    templateId?: string;
  }): Promise<any> {
    const business = await Business.findById(businessId);
    const brandName = business?.businessName || 'Brand';

    // Use provided image or generate default certificate image URL
    let imageUrl = options.imageUrl;
    
    if (!imageUrl) {
      // Generate a default certificate image based on template
      imageUrl = await this.generateDefaultCertificateImage(businessId, options);
    }

    const metadata = {
      name: `${brandName} Certificate - ${options.productId}`,
      description: options.customMessage || `Digital certificate of authenticity for ${options.productId} issued by ${brandName}`,
      image: imageUrl,
      external_url: `${process.env.FRONTEND_URL}/certificates/${options.productId}`,
      attributes: [
        {
          trait_type: "Certificate Level",
          value: options.certificateLevel
        },
        {
          trait_type: "Product ID", 
          value: options.productId
        },
        {
          trait_type: "Issued By",
          value: brandName
        },
        {
          trait_type: "Recipient",
          value: options.recipient
        },
        {
          trait_type: "Issue Date",
          value: new Date().toISOString().split('T')[0],
          display_type: "date"
        },
        ...(options.expirationDate ? [{
          trait_type: "Expiration Date",
          value: options.expirationDate.toISOString().split('T')[0],
          display_type: "date"
        }] : []),
        ...(options.attributes || [])
      ],
      properties: {
        category: "certificate",
        type: "authenticity",
        level: options.certificateLevel,
        business: businessId,
        product: options.productId,
        template: options.templateId || 'default'
      }
    };

    return metadata;
  }

  /**
   * Store NFT metadata JSON in S3
   */
  private async storeNFTMetadataInS3(businessId: string, productId: string, metadata: any): Promise<string> {
    try {
      const metadataJson = JSON.stringify(metadata, null, 2);
      const buffer = Buffer.from(metadataJson, 'utf8');
      
      const timestamp = Date.now();
      const filename = `metadata-${productId}-${timestamp}.json`;
      
      const uploadResult = await S3Service.uploadFile(buffer, {
        businessId,
        resourceId: 'certificates',
        filename,
        mimeType: 'application/json',
        metadata: {
          type: 'nft-metadata',
          productId,
          createdAt: new Date().toISOString()
        },
        isPublic: true // Make public for NFT marketplaces
      });

      return uploadResult.key;
    } catch (error: any) {
      throw new Error(`Failed to store NFT metadata in S3: ${error.message}`);
    }
  }

  /**
   * Generate default certificate image using template
   */
  private async generateDefaultCertificateImage(businessId: string, options: any): Promise<string> {
    try {
      // For now, return a placeholder URL
      // In production, you would generate an actual certificate image
      const business = await Business.findById(businessId);
      const brandName = business?.businessName || 'Brand';
      
      // Generate a simple SVG certificate (you could use a more sophisticated image generation library)
      const svgContent = this.generateCertificateSVG(brandName, options);
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      
      const filename = `certificate-${options.productId}-${Date.now()}.svg`;
      
      const uploadResult = await S3Service.uploadFile(svgBuffer, {
        businessId,
        resourceId: 'certificates',
        filename,
        mimeType: 'image/svg+xml',
        metadata: {
          type: 'certificate-image',
          productId: options.productId,
          level: options.certificateLevel
        },
        isPublic: true
      });

      return uploadResult.url;
    } catch (error: any) {
      logger.warn('Default certificate image generation failed:', error);
      // Return a fallback placeholder
      return `${process.env.FRONTEND_URL}/api/certificates/placeholder/${options.certificateLevel}`;
    }
  }

  /**
   * Generate simple SVG certificate
   */
  private generateCertificateSVG(brandName: string, options: any): string {
    const { productId, certificateLevel, recipient } = options;
    const levelColors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0', 
      gold: '#FFD700',
      platinum: '#E5E4E2'
    };
    
    const color = levelColors[certificateLevel as keyof typeof levelColors] || levelColors.bronze;
    
    return `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="white" stroke="${color}" stroke-width="10"/>
        <text x="400" y="100" font-family="serif" font-size="48" font-weight="bold" text-anchor="middle" fill="${color}">
          CERTIFICATE
        </text>
        <text x="400" y="150" font-family="serif" font-size="24" text-anchor="middle" fill="#333">
          of Authenticity
        </text>
        <text x="400" y="250" font-family="serif" font-size="32" text-anchor="middle" fill="#333">
          ${productId}
        </text>
        <text x="400" y="320" font-family="serif" font-size="18" text-anchor="middle" fill="#666">
          Issued to: ${recipient}
        </text>
        <text x="400" y="380" font-family="serif" font-size="18" text-anchor="middle" fill="#666">
          Level: ${certificateLevel.toUpperCase()}
        </text>
        <text x="400" y="450" font-family="serif" font-size="24" text-anchor="middle" fill="#333">
          ${brandName}
        </text>
        <text x="400" y="520" font-family="serif" font-size="14" text-anchor="middle" fill="#999">
          ${new Date().toLocaleDateString()}
        </text>
      </svg>
    `;
  }

  /**
   * Handle automatic transfer to brand wallet
   */
  private async handleAutoTransfer(
    certificate: ICertificate, 
    brandSettings: any,
    mintResult: any
  ): Promise<void> {
    if (!this.shouldAutoTransfer(brandSettings)) {
      return;
    }

    try {
      const transferResult = await this.transferCertificateToBrand(
        mintResult.contractAddress,
        mintResult.tokenId,
        brandSettings.certificateWallet,
        certificate.business.toString()
      );

      // Update certificate with successful transfer
      await Certificate.findByIdAndUpdate(certificate._id, {
        transferredToBrand: true,
        brandWallet: brandSettings.certificateWallet,
        transferTxHash: transferResult.txHash,
        transferredAt: transferResult.transferredAt,
        status: 'transferred_to_brand',
        transferFailed: false
      });

      // Notify brand of successful transfer
      await this.notificationsService.notifyBrandOfCertificateMinted(
        certificate.business.toString(),
        certificate._id.toString(),
        {
          tokenId: mintResult.tokenId,
          txHash: transferResult.txHash,
          recipient: brandSettings.certificateWallet,
          transferScheduled: false,
          brandWallet: brandSettings.certificateWallet,
          autoTransferEnabled: true
        }
      );

    } catch (transferError: any) {
      logger.error('Auto-transfer failed:', transferError);
      
      // Update certificate with transfer failure
      await Certificate.findByIdAndUpdate(certificate._id, {
        transferFailed: true,
        transferError: transferError.message,
        status: 'transfer_failed',
        transferAttempts: 1,
        nextTransferAttempt: new Date(Date.now() + 300000) // Retry in 5 minutes
      });

      // Notify of transfer failure
      await this.notificationsService.sendTransferFailureNotification(
        certificate.business.toString(),
        {
          certificateId: certificate._id.toString(),
          tokenId: mintResult.tokenId,
          error: transferError.message,
          attemptNumber: 1,
          maxAttempts: 3,
          nextRetryAt: new Date(Date.now() + 300000)
        }
      );
    }
  }

  /**
   * Transfer certificate from relayer to brand wallet
   */
  private async transferCertificateToBrand(
    contractAddress: string,
    tokenId: string,
    brandWallet: string,
    businessId: string
  ): Promise<TransferResult> {
    
    // Validate inputs
    if (!contractAddress || !tokenId || !brandWallet) {
      throw new Error('Missing required transfer parameters');
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(brandWallet)) {
      throw new Error('Invalid brand wallet address format');
    }

    // Validate relayer wallet is configured
    const relayerWallet = process.env.RELAYER_WALLET_ADDRESS;
    if (!relayerWallet) {
      throw new Error('Relayer wallet address not configured');
    }

    // Execute transfer using NFT service
    const transferResult = await this.nftService.transferNft(businessId, {
      tokenId,
      contractAddress,
      fromAddress: relayerWallet,
      toAddress: brandWallet
    });
    
    return {
      txHash: transferResult.transactionHash,
      blockNumber: transferResult.blockNumber,
      gasUsed: transferResult.gasUsed,
      transferredAt: new Date()
    };
  }

  /**
   * Check if automatic transfer should be performed
   */
  private shouldAutoTransfer(brandSettings: any): boolean {
    // Check if auto-transfer is explicitly disabled
    if (brandSettings.transferPreferences?.autoTransfer === false) {
      return false;
    }

    // Check if wallet address exists and is valid
    if (!brandSettings.certificateWallet) {
      return false;
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(brandSettings.certificateWallet)) {
      return false;
    }

    return true;
  }

  /**
   * Send notification to customer about their certificate with S3 assets
   */
  private async sendCustomerNotification(
    cert: ICertificate, 
    contactMethod: string, 
    hasWeb3: boolean
  ): Promise<void> {
    const link = `${process.env.FRONTEND_URL}/certificates/${cert._id}`;
    const blockchainLink = cert.txHash ? `https://basescan.io/tx/${cert.txHash}` : null;
    const imageUrl = cert.metadata?.imageUrl;
    
    const subject = 'Your NFT Certificate is Ready';
    let message = `Hello! Your certificate has been minted and is ready to view.\n\nView your certificate: ${link}\n\nToken ID: ${cert.tokenId}`;
    
    if (hasWeb3 && blockchainLink) {
      message += `\n\nView on blockchain: ${blockchainLink}`;
    }
    
    if (cert.transferScheduled) {
      message += `\n\nYour certificate will be automatically transferred to your wallet shortly.`;
    }

    if (imageUrl) {
      message += `\n\nCertificate image: ${imageUrl}`;
    }

    if (contactMethod === 'email') {
      await this.notificationsService.sendEmail(cert.recipient, subject, message);
    } 
  }

  /**
   * Update certificate image (replace existing S3 asset)
   */
  async updateCertificateImage(
    certificateId: string, 
    businessId: string, 
    newImage: Express.Multer.File
  ): Promise<{ success: boolean; imageUrl?: string }> {
    try {
      const certificate = await this.getCertificate(certificateId, businessId);
      
      // Delete old image from S3 if exists
      const oldImageS3Key = certificate.metadata?.s3Keys?.image;
      if (oldImageS3Key) {
        try {
          await S3Service.deleteFile(oldImageS3Key);
        } catch (deleteError) {
          logger.warn('Failed to delete old certificate image:', deleteError);
        }
      }

      // Upload new image
      const imageMedia = await this.mediaService.saveMedia(
        newImage,
        businessId,
        {
          category: 'certificate',
          description: `Updated certificate image for ${certificate.product}`,
          tags: ['certificate', 'nft', certificate.product.toString()],
          resourceId: certificate.product.toString(),
          isPublic: true
        }
      );

      // Update certificate record
      await Certificate.findByIdAndUpdate(certificateId, {
        'metadata.imageUrl': imageMedia.url,
        'metadata.s3Keys.image': imageMedia.s3Key,
        updatedAt: new Date()
      });

      // Regenerate and update NFT metadata
      const updatedMetadata = await this.generateNFTMetadata(businessId, {
        productId: certificate.product.toString(),
        recipient: certificate.recipient,
        certificateLevel: certificate.metadata?.certificateLevel || 'bronze',
        customMessage: certificate.metadata?.customMessage,
        attributes: certificate.metadata?.attributes,
        expirationDate: certificate.metadata?.expirationDate,
        imageUrl: imageMedia.url
      });

      const newMetadataS3Key = await this.storeNFTMetadataInS3(
        businessId, 
        certificate.product.toString(), 
        updatedMetadata
      );

      // Delete old metadata
      const oldMetadataS3Key = certificate.metadata?.s3Keys?.metadata;
      if (oldMetadataS3Key) {
        try {
          await S3Service.deleteFile(oldMetadataS3Key);
        } catch (deleteError) {
          logger.warn('Failed to delete old certificate metadata:', deleteError);
        }
      }

      // Update metadata reference
      await Certificate.findByIdAndUpdate(certificateId, {
        'metadata.s3Keys.metadata': newMetadataS3Key,
        'metadata.metadataUri': `${process.env.S3_PUBLIC_URL || process.env.METADATA_BASE_URL}/${newMetadataS3Key}`
      });

      return { success: true, imageUrl: imageMedia.url };
    } catch (error: any) {
      logger.error('Certificate image update failed:', error);
      return { success: false };
    }
  }

  /**
   * Cleanup certificate S3 assets when deleting certificate
   */
  async deleteCertificateAssets(certificateId: string, businessId: string): Promise<void> {
    try {
      const certificate = await this.getCertificate(certificateId, businessId);
      const s3Keys = (certificate.metadata as CertificateMetadata)?.s3Keys;

      if (s3Keys) {
        const keysToDelete = Object.values(s3Keys).filter(Boolean) as string[];
        
        if (keysToDelete.length > 0) {
          const deleteResult = await S3Service.deleteFiles(keysToDelete);
          
          if (deleteResult.errors.length > 0) {
            logger.warn('Some certificate assets could not be deleted:', deleteResult.errors);
          }
        }
      }
    } catch (error: any) {
      logger.error('Certificate asset cleanup failed:', error);
    }
  }

  /**
   * Validate product ownership
   */
  async validateProductOwnership(businessId: string, productId: string): Promise<boolean> {
    try {
      // Check if business exists and is active
      const business = await Business.findById(businessId);
      if (!business || !business.isActive) {
        return false;
      }

      // TODO: Add actual product validation logic
      // This would check if the product belongs to the business
      // For now, return true as a placeholder
      return true;
    } catch (error) {
      logger.error('Product ownership validation error:', error);
      return false;
    }
  }

  /**
   * Create batch certificate job with S3 support
   */
  async createBatchCertificateJob(businessId: string, data: BatchCreateInput): Promise<BatchJobResult> {
    try {
      const jobId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const recipientCount = data.recipients.length;
      
      // Calculate estimated completion time (accounting for S3 uploads)
      const baseTimePerCert = data.hasWeb3 ? 60 : 45; // Increased for S3 operations
      const delay = data.batchOptions?.delayBetweenCerts || 1;
      const concurrent = data.batchOptions?.maxConcurrent || 5;
      const estimatedDuration = Math.ceil((recipientCount / concurrent) * (baseTimePerCert + delay));
      
      const estimatedCompletion = new Date(Date.now() + estimatedDuration * 1000);
      const estimatedStartTime = new Date(Date.now() + 5000);

      // Store job information
      const job = {
        id: jobId,
        businessId,
        data,
        status: 'queued' as const,
        createdAt: new Date(),
        estimatedCompletion,
        estimatedStartTime,
        queuePosition: await this.getQueuePosition(),
        webhookUrl: data.jobMetadata?.webhookUrl
      };

      await this.storeBatchJob(job);
      setTimeout(() => this.processBatchJob(jobId), 5000);

      return {
        id: jobId,
        status: 'queued',
        estimatedCompletion,
        queuePosition: job.queuePosition,
        estimatedStartTime,
        webhookUrl: job.webhookUrl
      };
    } catch (error: any) {
      throw new Error(`Failed to create batch job: ${error.message}`);
    }
  }

  /**
   * Get batch processing progress
   */
  async getBatchProgress(businessId: string, batchId: string): Promise<BatchProgress | null> {
    try {
      const job = await this.getBatchJob(batchId);
      
      if (!job || job.businessId !== businessId) {
        return null;
      }

      const certificates = await Certificate.find({ batchId });
      const total = job.data.recipients.length;
      const processed = certificates.length;
      const successful = certificates.filter(c => c.status !== 'transfer_failed').length;
      const failed = certificates.filter(c => c.status === 'transfer_failed').length;

      const minted = certificates.filter(c => c.tokenId).length;
      const transfersScheduled = certificates.filter(c => c.transferScheduled).length;
      const transfersCompleted = certificates.filter(c => c.transferredToBrand).length;
      const transfersFailed = certificates.filter(c => c.transferFailed).length;

      const averageProcessingTime = processed > 0 ? 
        (Date.now() - job.createdAt.getTime()) / processed : 0;
      const remainingTime = processed < total ? 
        (total - processed) * averageProcessingTime : 0;

      return {
        id: batchId,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        total,
        processed,
        successful,
        failed,
        web3: {
          minted,
          transfersScheduled,
          transfersCompleted,
          transfersFailed,
          totalGasUsed: certificates.reduce((sum, c) => {
            const gasUsed = c.gasUsed ? parseFloat(c.gasUsed) : 0;
            return sum + gasUsed;
          }, 0).toString()
        },
        estimatedCompletion: job.estimatedCompletion,
        averageProcessingTime,
        remainingTime,
        errors: job.errors?.slice(0, 10) || []
      };
    } catch (error: any) {
      logger.error('Get batch progress error:', error);
      return null;
    }
  }

  /**
   * List certificates with enhanced filtering
   */
  async listCertificates(businessId: string, options: {
    status?: string;
    transferStatus?: 'relayer' | 'brand' | 'failed';
    page?: number;
    limit?: number;
    productId?: string;
    recipient?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    ownershipType?: 'relayer' | 'brand' | 'all';
    hasWeb3?: boolean;
  } = {}): Promise<{
    certificates: ICertificate[];
    total: number;
    pagination: any;
  }> {
    const { 
      status, 
      transferStatus, 
      page = 1, 
      limit = 20,
      productId,
      recipient,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ownershipType = 'all',
      hasWeb3
    } = options;
    
    const offset = (page - 1) * limit;

    // Build query
    const query: any = { business: businessId };
    
    if (status) {
      query.status = status;
    }

    if (productId) {
      query.product = productId;
    }

    if (recipient) {
      query.recipient = new RegExp(recipient, 'i');
    }

    if (dateFrom && dateTo) {
      query.createdAt = {
        $gte: dateFrom,
        $lte: dateTo
      };
    }

    if (search) {
      query.$or = [
        { tokenId: new RegExp(search, 'i') },
        { recipient: new RegExp(search, 'i') }
      ];
    }

    if (transferStatus) {
      switch (transferStatus) {
        case 'relayer':
          query.mintedToRelayer = true;
          query.transferredToBrand = { $ne: true };
          query.transferFailed = { $ne: true };
          break;
        case 'brand':
          query.transferredToBrand = true;
          break;
        case 'failed':
          query.transferFailed = true;
          break;
      }
    }

    if (ownershipType !== 'all') {
      if (ownershipType === 'relayer') {
        query.$or = [
          { transferredToBrand: false },
          { transferredToBrand: { $exists: false } }
        ];
      } else if (ownershipType === 'brand') {
        query.transferredToBrand = true;
      }
    }

    if (hasWeb3 !== undefined) {
      query.autoTransferEnabled = hasWeb3;
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .populate('product')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(offset)
        .limit(limit),
      Certificate.countDocuments(query)
    ]);

    return {
      certificates,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get single certificate with full details
   */
  async getCertificate(certificateId: string, businessId?: string): Promise<ICertificate> {
    const query: any = { _id: certificateId };
    if (businessId) {
      query.business = businessId;
    }

    const cert = await Certificate.findOne(query).populate('product');
    if (!cert) {
      throw new Error('Certificate not found');
    }
    return cert;
  }

  /**
   * Deliver certificate with enhanced options
   */
  async deliverCertificate(certificateId: string, deliveryData: {
    method?: string;
    scheduleDate?: Date;
    priority?: string;
    web3Enabled?: boolean;
    transferScheduled?: boolean;
    blockchainData?: any;
  }): Promise<{ success: boolean; message: string; deliveryId?: string }> {
    try {
      const certificate = await this.getCertificate(certificateId);
      
      const deliveryId = `delivery_${Date.now()}`;
      
      if (deliveryData.web3Enabled && deliveryData.blockchainData) {
        await this.sendWeb3DeliveryNotification(certificate, deliveryData);
      } else {
        await this.sendStandardDeliveryNotification(certificate, deliveryData);
      }

      await Certificate.findByIdAndUpdate(certificateId, {
        delivered: true,
        deliveredAt: new Date(),
        deliveryMethod: deliveryData.method || 'email',
        deliveryId
      });

      return { 
        success: true, 
        message: 'Certificate delivered successfully',
        deliveryId
      };
    } catch (error: any) {
      logger.error('Certificate delivery error:', error);
      return { 
        success: false, 
        message: `Delivery failed: ${error.message}`
      };
    }
  }

  /**
   * Schedule certificate delivery
   */
  async scheduleDelivery(
    certificateId: string, 
    scheduleDate: Date,
    deliveryData: any
  ): Promise<{ success: boolean; message: string; scheduledId?: string }> {
    try {
      const scheduledId = `scheduled_${Date.now()}`;
      
      await this.storeScheduledDelivery({
        certificateId,
        scheduleDate,
        deliveryData,
        scheduledId,
        status: 'scheduled'
      });

      await Certificate.findByIdAndUpdate(certificateId, {
        deliveryScheduled: true,
        scheduledDeliveryDate: scheduleDate,
        scheduledDeliveryId: scheduledId
      });

      return {
        success: true,
        message: 'Delivery scheduled successfully',
        scheduledId
      };
    } catch (error: any) {
      logger.error('Schedule delivery error:', error);
      return {
        success: false,
        message: `Scheduling failed: ${error.message}`
      };
    }
  }

  /**
   * Retry failed transfers for Web3 brands
   */
  async retryFailedTransfers(businessId: string, limit: number = 10): Promise<{
    attempted: number;
    successful: number;
    failed: number;
    processed: number;
  }> {
    const failedCerts = await Certificate.find({
      business: businessId,
      transferFailed: true,
      status: 'transfer_failed',
      transferAttempts: { $lt: 3 }
    }).limit(limit);

    const brandSettings = await BrandSettings.findOne({ business: businessId });
    
    if (!brandSettings?.certificateWallet) {
      return { attempted: 0, successful: 0, failed: 0, processed: failedCerts.length };
    }

    let successful = 0;
    let failed = 0;

    for (const cert of failedCerts) {
      try {
        const transferResult = await this.transferCertificateToBrand(
          cert.contractAddress!,
          cert.tokenId,
          brandSettings.certificateWallet,
          businessId
        );

        await Certificate.findByIdAndUpdate(cert._id, {
          transferredToBrand: true,
          brandWallet: brandSettings.certificateWallet,
          transferTxHash: transferResult.txHash,
          transferredAt: transferResult.transferredAt,
          status: 'transferred_to_brand',
          transferFailed: false,
          transferError: undefined,
          transferAttempts: (cert.transferAttempts || 0) + 1
        });

        successful++;

      } catch (error: any) {
        logger.error('Retry failed for certificate ${cert._id}:', error);
        
        await Certificate.findByIdAndUpdate(cert._id, {
          transferAttempts: (cert.transferAttempts || 0) + 1,
          transferError: error.message,
          nextTransferAttempt: new Date(Date.now() + 600000)
        });
        
        failed++;
      }
    }

    return { 
      attempted: failedCerts.length, 
      successful, 
      failed,
      processed: failedCerts.length
    };
  }

  /**
   * Get certificate statistics with transfer info
   */
  async getCertificateStats(businessId: string): Promise<{
    total: number;
    thisMonth: number;
    distribution: {
      inRelayerWallet: number;
      inBrandWallet: number;
      transferFailed: number;
    };
    brandWallet?: string;
    autoTransferEnabled: boolean;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const brandSettings = await BrandSettings.findOne({ business: businessId });

    const [total, thisMonth, inRelayerWallet, inBrandWallet, transferFailed] = await Promise.all([
      Certificate.countDocuments({ business: businessId }),
      Certificate.countDocuments({ 
        business: businessId, 
        createdAt: { $gte: startOfMonth } 
      }),
      Certificate.countDocuments({ 
        business: businessId, 
        mintedToRelayer: true,
        transferredToBrand: { $ne: true },
        transferFailed: { $ne: true }
      }),
      Certificate.countDocuments({ 
        business: businessId, 
        transferredToBrand: true 
      }),
      Certificate.countDocuments({ 
        business: businessId, 
        transferFailed: true 
      })
    ]);

    return { 
      total, 
      thisMonth, 
      distribution: {
        inRelayerWallet,
        inBrandWallet,
        transferFailed
      },
      brandWallet: brandSettings?.certificateWallet,
      autoTransferEnabled: !!brandSettings?.certificateWallet && this.shouldAutoTransfer(brandSettings)
    };
  }

  /**
   * Batch create certificates with S3 support
   */
  async createBatchCertificates(
    businessId: string, 
    inputs: CreateCertInput[]
  ): Promise<{
    successful: ICertificate[];
    failed: Array<{ input: CreateCertInput; error: string }>;
  }> {
    const successful: ICertificate[] = [];
    const failed: Array<{ input: CreateCertInput; error: string }> = [];

    for (const input of inputs) {
      try {
        const cert = await this.createCertificate(businessId, input);
        successful.push(cert);
      } catch (error: any) {
        failed.push({ input, error: error.message });
      }
    }

    return { successful, failed };
  }

  // Private helper methods for job management

  private async getQueuePosition(): Promise<number> {
    return Math.floor(Math.random() * 5) + 1;
  }

  private async storeBatchJob(job: any): Promise<void> {
    logger.info('Storing batch job:', job.id);
  }

  private async getBatchJob(jobId: string): Promise<any> {
    return {
      id: jobId,
      businessId: 'placeholder',
      status: 'processing',
      createdAt: new Date(),
      data: { recipients: [] },
      errors: []
    };
  }

private async processBatchJob(jobId: string): Promise<void> {
    logger.info('Processing batch job', { jobId });
  }

  private async storeScheduledDelivery(deliveryData: any): Promise<void> {
    logger.info('Storing scheduled delivery:', deliveryData.scheduledId);
  }

  private async sendWeb3DeliveryNotification(certificate: ICertificate, deliveryData: any): Promise<void> {
    const imageUrl = (certificate.metadata as CertificateMetadata)?.imageUrl;
    const blockchainLink = certificate.txHash ? `https://basescan.io/tx/${certificate.txHash}` : null;
    
    let message = `Your certificate has been minted on the blockchain! Token ID: ${certificate.tokenId}`;
    if (blockchainLink) {
      message += `\n\nView on blockchain: ${blockchainLink}`;
    }
    if (imageUrl) {
      message += `\n\nCertificate image: ${imageUrl}`;
    }
    
    await this.notificationsService.sendEmail(certificate.recipient, 'Certificate Ready', message);
  }

  private async sendStandardDeliveryNotification(certificate: ICertificate, deliveryData: any): Promise<void> {
    const imageUrl = (certificate.metadata as CertificateMetadata)?.imageUrl;
    
    let message = `Your certificate is ready for viewing. Certificate ID: ${certificate._id}`;
    if (imageUrl) {
      message += `\n\nCertificate image: ${imageUrl}`;
    }
    
    await this.notificationsService.sendEmail(certificate.recipient, 'Certificate Ready', message);
  }

  

  public async getTransferUsage(businessId: string): Promise<{ thisMonth: number; total: number }> {
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const analytics = (brandSettings as any)?.transferAnalytics;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyStats = analytics?.monthlyStats?.find((stat: any) => stat.month === currentMonth);
    return {
      thisMonth: monthlyStats?.transfers || 0,
      total: analytics?.totalTransfers || 0
    };
  }

  public getTransferLimits(plan: string): { transfersPerMonth: number; gasCreditsWei: string } {
    const limits: Record<string, { transfersPerMonth: number; gasCreditsWei: string }> = {
      growth: { transfersPerMonth: 500, gasCreditsWei: '50000000000000000' },
      premium: { transfersPerMonth: 1000, gasCreditsWei: '100000000000000000' },
      enterprise: { transfersPerMonth: Number.POSITIVE_INFINITY, gasCreditsWei: '1000000000000000000' }
    };
    return limits[plan] || { transfersPerMonth: 0, gasCreditsWei: '0' };
  }

  public getBatchLimits(plan: string): { maxBatchSize: number; maxConcurrent: number } {
    const limits: Record<string, { maxBatchSize: number; maxConcurrent: number }> = {
      growth: { maxBatchSize: 50, maxConcurrent: 3 },
      premium: { maxBatchSize: 100, maxConcurrent: 5 },
      enterprise: { maxBatchSize: 1000, maxConcurrent: 20 }
    };
    return limits[plan] || { maxBatchSize: 10, maxConcurrent: 1 };
  }

  public validateRecipient(recipient: string, contactMethod: string): { valid: boolean; error?: string } {
    switch (contactMethod) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return { valid: emailRegex.test(recipient), error: !emailRegex.test(recipient) ? 'Invalid email format' : undefined };
      }
      case 'sms': {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return { valid: phoneRegex.test(recipient), error: !phoneRegex.test(recipient) ? 'Invalid phone number format' : undefined };
      }
      case 'wallet': {
        const walletRegex = /^0x[a-fA-F0-9]{40}$/;
        return { valid: walletRegex.test(recipient), error: !walletRegex.test(recipient) ? 'Invalid wallet address format' : undefined };
      }
      default:
        return { valid: false, error: 'Invalid contact method' };
    }
  }

  public getOwnershipStatus(certificate: any): string {
    if (certificate.revoked) return 'revoked';
    if (certificate.transferFailed && certificate.transferAttempts >= certificate.maxTransferAttempts) return 'failed';
    if (certificate.transferredToBrand) return 'brand';
    return 'relayer';
  }

  public getTransferHealth(certificate: any): { status: string; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    if (certificate.transferFailed) {
      issues.push('Transfer failed');
      score -= 50;
    }
    if (certificate.transferAttempts > 1) {
      issues.push('Multiple transfer attempts');
      score -= 20;
    }
    if (certificate.status === 'pending_transfer' && certificate.nextTransferAttempt && new Date(certificate.nextTransferAttempt) < new Date()) {
      issues.push('Transfer overdue');
      score -= 30;
    }

    return {
      status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
      score: Math.max(0, score),
      issues
    };
  }

  public async processCertificateDelivery(mintResult: any, deliveryOptions: any, hasWeb3: boolean): Promise<void> {
    const deliveryData = {
      ...deliveryOptions,
      web3Enabled: hasWeb3,
      transferScheduled: mintResult.transferScheduled,
      blockchainData: {
        txHash: mintResult.txHash,
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress
      }
    };

    if (deliveryOptions?.scheduleDate) {
      await this.scheduleDelivery(mintResult.certificateId, deliveryOptions.scheduleDate, deliveryData);
    } else {
      await this.deliverCertificate(mintResult.certificateId, deliveryData);
    }
  }

  public getCertificateNextSteps(hasWeb3: boolean, shouldAutoTransfer: boolean, transferScheduled: boolean): string[] {
    const baseSteps = ['Certificate minted successfully on blockchain'];
    if (hasWeb3) {
      if (shouldAutoTransfer && transferScheduled) {
        baseSteps.push(
          'Auto-transfer to your wallet is scheduled',
          'You will be notified when transfer completes',
          'Certificate will appear in your Web3 wallet'
        );
      } else if (shouldAutoTransfer && !transferScheduled) {
        baseSteps.push(
          'Auto-transfer is enabled but transfer was not scheduled',
          'Check your wallet configuration',
          'Manual transfer may be required'
        );
      } else {
        baseSteps.push(
          'Certificate is stored in secure relayer wallet',
          'Enable auto-transfer in settings for automatic delivery',
          'Manual transfer available anytime'
        );
      }
    } else {
      baseSteps.push(
        'Certificate is securely stored in our system',
        'Upgrade to Premium for Web3 wallet integration',
        'Direct wallet ownership available with upgrade'
      );
    }
    return baseSteps;
  }

  public calculateBatchDuration(recipientCount: number, batchOptions: any, hasWeb3: boolean): number {
    const baseTimePerCert = hasWeb3 ? 45 : 30;
    const delay = batchOptions?.delayBetweenCerts || 1;
    const concurrent = batchOptions?.maxConcurrent || 5;
    const batches = Math.ceil(recipientCount / concurrent);
    return Math.ceil((recipientCount * baseTimePerCert + (recipientCount - 1) * delay) / concurrent + batches * 5);
  }

  public determineBatchPriority(plan: string): 'low' | 'normal' | 'high' {
    switch (plan) {
      case 'enterprise': return 'high';
      case 'premium': return 'normal';
      default: return 'low';
    }
  }

  /**
   * Get global transfer analytics across all brands
   */
  public async getGlobalTransferAnalytics(): Promise<any> {
    try {
      // Calculate global metrics from all brand settings
      const allSettings = await BrandSettings.find({
        'web3Settings.nftContract': { $exists: true }
      });

      // Calculate whatever global metrics you need
      return {
        totalBrands: allSettings.length,
        totalTransfers: 0, // calculate as needed
        averageSuccessRate: 0, // calculate as needed
        // ... other metrics
      };
    } catch (error) {
      logger.error('Failed to get global transfer analytics:', error);
      return null;
    }
  }

  /**
   * Get certificate usage statistics for a business
   */
  public async getCertificateUsage(businessId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, thisMonth] = await Promise.all([
      Certificate.countDocuments({ business: businessId }),
      Certificate.countDocuments({
        business: businessId,
        createdAt: { $gte: startOfMonth }
      })
    ]);

    return { total, certificatesThisMonth: thisMonth };
  }


  /**
   * Get plan limits for certificates
   */
  public getPlanLimits(plan: string) {
    const planKey = plan as any; // Type assertion for plan
    const PLAN_DEFINITIONS: any = {
      foundation: { certificates: 10, features: { allowOverage: false, hasWeb3: false } },
      growth: { certificates: 100, features: { allowOverage: true, hasWeb3: true } },
      premium: { certificates: 1000, features: { allowOverage: true, hasWeb3: true } },
      enterprise: { certificates: Infinity, features: { allowOverage: true, hasWeb3: true } }
    };
    const planDef = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.foundation;

    return {
      certificates: planDef.certificates,
      allowOverage: planDef.features.allowOverage,
      billPerCertificate: false, // Not implemented yet
      overageCost: planDef.features.allowOverage ? 0.1 : 0,
      hasWeb3: planDef.features.hasWeb3
    };
  }


  /**
   * Calculate estimated gas cost for batch operations
   */
  public calculateEstimatedGasCost(recipientCount: number): string {
    // Estimate: ~0.005 ETH per mint + transfer
    const estimatedCostWei = BigInt(recipientCount) * BigInt('5000000000000000'); // 0.005 ETH in wei
    return estimatedCostWei.toString();
  }

  /**
   * Generate Web3 insights based on analytics
   */
  public generateWeb3Insights(certificateAnalytics: any, transferAnalytics: any): string[] {
    const insights: string[] = [];

    if (transferAnalytics?.successRate > 95) {
      insights.push('Excellent transfer success rate - automation is working well');
    }

    if (certificateAnalytics?.relayerHeld === 0) {
      insights.push('All certificates successfully transferred to your wallet');
    }

    if (transferAnalytics?.averageTransferTime < 300000) { // 5 minutes
      insights.push('Fast transfer times - optimal gas settings detected');
    }

    const monthlyGrowth = this.calculateMonthlyGrowth(transferAnalytics?.monthlyStats);
    if (monthlyGrowth > 20) {
      insights.push('Transfer volume growing rapidly - consider upgrading gas limits');
    }

    return insights;
  }

  /**
   * Generate Web3 recommendations based on analytics
   */
  public generateWeb3Recommendations(certificateAnalytics: any, transferAnalytics: any, plan: string): string[] {
    const recommendations: string[] = [];

    if (transferAnalytics?.failedTransfers > 0) {
      recommendations.push('Review failed transfers and retry if needed');
    }

    if (transferAnalytics?.successRate < 90) {
      recommendations.push('Check wallet configuration and gas settings');
    }

    if (plan === 'premium' && transferAnalytics?.totalTransfers > 800) {
      recommendations.push('Consider upgrading to Enterprise for unlimited transfers');
    }

    const avgGasUsed = transferAnalytics?.totalGasUsed ?
      Number(BigInt(transferAnalytics.totalGasUsed) / BigInt(Math.max(1, transferAnalytics.totalTransfers))) : 0;

    if (avgGasUsed > 100000) { // If using more than 100k gas per transfer
      recommendations.push('Enable gas optimization to reduce transfer costs');
    }

    return recommendations;
  }

  /**
   * Calculate monthly growth percentage
   */
  public calculateMonthlyGrowth(monthlyStats: any[]): number {
    if (!monthlyStats || monthlyStats.length < 2) return 0;

    const sorted = monthlyStats.sort((a, b) => a.month.localeCompare(b.month));
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    if (!previous.transfers) return 100;

    return ((latest.transfers - previous.transfers) / previous.transfers) * 100;
  }

}