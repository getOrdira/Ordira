/**
 * Certificate Minting Service
 *
 * Handles NFT minting operations including:
 * - Certificate creation with NFT minting
 * - S3 asset storage and management
 * - Metadata generation and storage
 * - Batch certificate creation
 */

import { Certificate, ICertificate } from '../../../models/certificate.model';
import { BrandSettings } from '../../../models/brandSettings.model';
import { Business } from '../../../models/business.model';
import { NftService } from '../../blockchain/nft.service';
import { AnalyticsService } from '../../business/analytics.service';
import { eventHandlerService, NotificationCategory, NotificationEventType, NotificationPriority } from '../../notifications';
import { MediaService } from '../../business/media.service';
import { S3Service } from '../../external/s3.service';
import { logger } from '../../../utils/logger';

export interface CreateCertInput {
  productId: string;
  recipient: string;
  contactMethod: 'email' | 'sms' | 'wallet';
  certificateImage?: Express.Multer.File;
  metadata?: {
    customMessage?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
    certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
    expirationDate?: Date;
    imageUrl?: string;
    templateId?: string;
    metadataUri?: string;
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
}

export class MintingService {
  private nftService = new NftService();
  private analyticsService = new AnalyticsService();
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
              isPublic: true
            }
          );

          certificateImageUrl = imageMedia.url;
          certificateImageS3Key = imageMedia.s3Key;
        } catch (imageError) {
          logger.warn('Certificate image upload failed:', imageError);
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

      // Send notifications
      await this.sendNotifications(cert, input.contactMethod, hasWeb3, shouldAutoTransfer, mintResult);

      return cert;

    } catch (error: any) {
      logger.error('Certificate creation failed:', error);
      throw new Error(`Failed to create certificate: ${error.message}`);
    }
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

  /**
   * Update certificate image (replace existing S3 asset)
   */
  async updateCertificateImage(
    certificateId: string,
    businessId: string,
    newImage: Express.Multer.File
  ): Promise<{ success: boolean; imageUrl?: string }> {
    try {
      const certificate = await Certificate.findOne({
        _id: certificateId,
        business: businessId
      });

      if (!certificate) {
        throw new Error('Certificate not found');
      }

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
      const certificate = await Certificate.findOne({
        _id: certificateId,
        business: businessId
      });

      if (!certificate) {
        throw new Error('Certificate not found');
      }

      const s3Keys = certificate.metadata?.s3Keys;

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

    // Use provided image or generate default
    let imageUrl = options.imageUrl;

    if (!imageUrl) {
      // This would call imageGenerator service
      imageUrl = `${process.env.FRONTEND_URL}/api/certificates/placeholder/${options.certificateLevel}`;
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
        isPublic: true
      });

      return uploadResult.key;
    } catch (error: any) {
      throw new Error(`Failed to store NFT metadata in S3: ${error.message}`);
    }
  }

  /**
   * Validate product ownership
   */
  private async validateProductOwnership(businessId: string, productId: string): Promise<boolean> {
    try {
      const business = await Business.findById(businessId);
      if (!business || !business.isActive) {
        return false;
      }

      // TODO: Add actual product validation logic
      return true;
    } catch (error) {
      logger.error('Product ownership validation error:', error);
      return false;
    }
  }

  /**
   * Send notifications for certificate creation
   */
  private async sendNotifications(
    cert: ICertificate,
    contactMethod: string,
    hasWeb3: boolean,
    shouldAutoTransfer: boolean,
    mintResult: any
  ): Promise<void> {
    await this.sendCustomerNotification(cert, contactMethod, hasWeb3, mintResult);

    await eventHandlerService.handle({
      type: NotificationEventType.CertificateMinted,
      recipient: { businessId: cert.business.toString() },
      payload: {
        certificateId: cert._id.toString(),
        recipient: cert.recipient,
        productId: (cert.product as any)?.toString?.() ?? undefined,
        productName: (cert.metadata as any)?.productName,
        tokenId: mintResult?.tokenId,
        txHash: mintResult?.txHash,
        transferScheduled: mintResult?.transferScheduled,
        brandWallet: mintResult?.brandWallet,
        autoTransferEnabled: shouldAutoTransfer,
        certificateUrl: `${process.env.FRONTEND_URL}/brand/certificates/${cert._id.toString()}`,
      },
      metadata: {
        category: NotificationCategory.Certificate,
        priority: NotificationPriority.Medium,
        title: 'Certificate minted',
        message: `Certificate ${cert._id.toString()} has been minted successfully.`,
        actionUrl: `/brand/certificates/${cert._id.toString()}`,
      },
    });
  }

  /**
   * Send notification to customer about their certificate
   */
  private async sendCustomerNotification(
    cert: ICertificate,
    contactMethod: string,
    hasWeb3: boolean,
    mintResult: any
  ): Promise<void> {
    const link = `${process.env.FRONTEND_URL}/certificates/${cert._id}`;
    const blockchainLink = mintResult?.txHash
      ? `https://basescan.io/tx/${mintResult.txHash}`
      : cert.txHash
        ? `https://basescan.io/tx/${cert.txHash}`
        : null;

    const messageParts = [
      'Hello! Your certificate has been minted and is ready to view.',
      `View your certificate: ${link}`,
    ];

    const tokenId = mintResult?.tokenId ?? cert.tokenId;
    if (tokenId) {
      messageParts.push(`Token ID: ${tokenId}`);
    }

    if (hasWeb3 && blockchainLink) {
      messageParts.push(`View on blockchain: ${blockchainLink}`);
    }

    if (cert.transferScheduled) {
      messageParts.push('Your certificate is scheduled for automatic transfer.');
    }

    const message = messageParts.join('\n\n');

    if (contactMethod === 'email' || contactMethod === 'wallet' || contactMethod === 'sms') {
      await eventHandlerService.handle({
        type: NotificationEventType.CertificateMinted,
        recipient: { email: cert.recipient },
        payload: {
          certificateId: cert._id.toString(),
          tokenId,
          link,
          blockchainLink,
          contactMethod,
          productName: (cert.metadata as any)?.productName,
        },
        metadata: {
          category: NotificationCategory.Certificate,
          priority: NotificationPriority.Medium,
          title: 'Your certificate is ready',
          message,
          actionUrl: link,
          channels: { email: true, inApp: false },
        },
      });
    }
  }

}
export const mintingService = new MintingService();










