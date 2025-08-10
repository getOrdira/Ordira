// src/services/business/certificate.service.ts
import { Certificate, ICertificate } from '../../models/certificate.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { NftService } from '../blockchain/nft.service';
import { NotificationsService } from '../external/notifications.service';
import { AnalyticsBusinessService } from './analytics.service';

type CreateCertInput = {
  productId: string;
  recipient: string;
  contactMethod: 'email' | 'sms';
  metadata?: {
    customMessage?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
};

type TransferResult = {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  transferredAt: Date;
};

export class CertificateService {
  private nftService = new NftService();
  private notificationsService = new NotificationsService();
  private analyticsService = new AnalyticsBusinessService();

  /**
   * Create certificate with automatic brand transfer for Web3 brands
   */
  async createCertificate(businessId: string, input: CreateCertInput): Promise<ICertificate> {
    try {
      // 1️⃣ Get brand settings to check for wallet
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      
      // 2️⃣ Mint NFT to relayer wallet first (always works)
      const mintResult = await this.nftService.mintNft(businessId, {
        productId: input.productId,
        recipient: input.recipient,
        metadata: input.metadata
      });

      // 3️⃣ Create certificate record with initial status
      const cert = await Certificate.create({
        business: businessId,
        product: input.productId,
        recipient: input.recipient,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
        contractAddress: mintResult.contractAddress,
        status: 'minted',
        mintedToRelayer: true,
        metadata: input.metadata,
        createdAt: new Date()
      });

      // 4️⃣ ✨ AUTOMATIC TRANSFER TO BRAND WALLET IF CONFIGURED
      if (brandSettings?.certificateWallet && this.shouldAutoTransfer(brandSettings)) {
        try {
          console.log(`Attempting automatic transfer to brand wallet: ${brandSettings.certificateWallet}`);
          
          const transferResult = await this.transferCertificateToBrand(
            mintResult.contractAddress,
            mintResult.tokenId,
            brandSettings.certificateWallet,
            businessId
          );
          
          // Update certificate with successful transfer
          await Certificate.findByIdAndUpdate(cert._id, {
            transferredToBrand: true,
            brandWallet: brandSettings.certificateWallet,
            transferTxHash: transferResult.txHash,
            transferredAt: transferResult.transferredAt,
            status: 'transferred_to_brand'
          });

          // Notify brand of certificate ownership
          await this.notificationsService.notifyBrandOfCertificateOwnership(
            businessId,
            cert._id.toString(),
            brandSettings.certificateWallet,
            {
              tokenId: mintResult.tokenId,
              contractAddress: mintResult.contractAddress,
              transferTxHash: transferResult.txHash
            }
          );

          console.log(`Certificate ${mintResult.tokenId} successfully transferred to brand wallet`);
          
        } catch (transferError: any) {
          console.error('Failed to transfer certificate to brand:', transferError);
          
          // Update certificate with transfer failure info
          await Certificate.findByIdAndUpdate(cert._id, {
            transferFailed: true,
            transferError: transferError.message,
            status: 'transfer_failed'
          });

          // Notify operations team for manual intervention
          await this.notificationsService.notifyOperationsOfTransferFailure(
            businessId,
            cert._id.toString(),
            transferError.message
          );
        }
      }

      // 5️⃣ Customer notification (regardless of transfer outcome)
      await this.sendCustomerNotification(cert, input.contactMethod);

      // 6️⃣ Brand notification of new certificate
      await this.notificationsService.notifyBrandOfCertificateMinted(
        businessId, 
        cert._id.toString(),
        {
          productId: input.productId,
          recipient: input.recipient,
          tokenId: mintResult.tokenId,
          transferredToBrand: !!brandSettings?.certificateWallet
        }
      );

      // 7️⃣ Update analytics
      await this.analyticsService.recordCertificateCreation(businessId, cert._id.toString());

      return cert;

    } catch (error: any) {
      console.error('Certificate creation failed:', error);
      throw new Error(`Failed to create certificate: ${error.message}`);
    }
  }

  /**
   * ✨ NEW: Transfer certificate from relayer to brand wallet
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

    // Prepare transfer parameters
    const transferParams = {
      tokenId,
      contractAddress,
      fromAddress: process.env.RELAYER_WALLET_ADDRESS!,
      toAddress: brandWallet
    };

    // Validate relayer wallet is configured
    if (!transferParams.fromAddress) {
      throw new Error('Relayer wallet address not configured');
    }

    // Execute transfer using existing NFT service
    const transferResult = await this.nftService.transferNft(businessId, transferParams);
    
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

    // Default to auto-transfer if wallet is configured
    return true;
  }

  /**
   * Send notification to customer about their certificate
   */
  private async sendCustomerNotification(cert: ICertificate, contactMethod: string): Promise<void> {
    const link = `${process.env.FRONTEND_URL}/certificates/${cert._id}`;
    const subject = 'Your NFT Certificate is Ready';
    const message = `Hello! Your certificate has been minted and is ready to view.\n\nView your certificate: ${link}\n\nToken ID: ${cert.tokenId}`;

    if (contactMethod === 'email') {
      await this.notificationsService.sendEmail(cert.recipient, subject, message);
    }
  }

  /**
   * Retry failed transfers for Web3 brands
   */
  async retryFailedTransfers(businessId: string): Promise<{
    attempted: number;
    successful: number;
    failed: number;
  }> {
    // Find certificates with failed transfers
    const failedCerts = await Certificate.find({
      business: businessId,
      transferFailed: true,
      status: 'transfer_failed'
    });

    const brandSettings = await BrandSettings.findOne({ business: businessId });
    
    if (!brandSettings?.certificateWallet) {
      return { attempted: 0, successful: 0, failed: 0 };
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

        // Update certificate with successful retry
        await Certificate.findByIdAndUpdate(cert._id, {
          transferredToBrand: true,
          brandWallet: brandSettings.certificateWallet,
          transferTxHash: transferResult.txHash,
          transferredAt: transferResult.transferredAt,
          status: 'transferred_to_brand',
          transferFailed: false,
          transferError: undefined
        });

        successful++;

      } catch (error: any) {
        console.error(`Retry failed for certificate ${cert._id}:`, error);
        failed++;
      }
    }

    return { attempted: failedCerts.length, successful, failed };
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
   * List certificates with enhanced filtering
   */
  async listCertificates(businessId: string, options: {
    status?: string;
    transferStatus?: 'relayer' | 'brand' | 'failed';
    page?: number;
    limit?: number;
  } = {}): Promise<{
    certificates: ICertificate[];
    total: number;
    pagination: any;
  }> {
    const { status, transferStatus, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Build query
    const query: any = { business: businessId };
    
    if (status) {
      query.status = status;
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

    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .populate('product')
        .sort({ createdAt: -1 })
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
   * Batch create certificates (for bulk operations)
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
}
