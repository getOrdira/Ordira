/**
 * Certificate Transfer Service
 *
 * Handles certificate transfer operations including:
 * - Auto-transfer to brand wallets
 * - Manual transfer operations
 * - Transfer retry logic
 * - Transfer health monitoring
 */

import { Certificate, ICertificate } from '../../../models/certificate.model';
import { BrandSettings } from '../../../models/brandSettings.model';
import { NftService } from '../../blockchain/nft.service';
import { notificationsService } from '../../notifications/notifications.service';
import { logger } from '../../../utils/logger';

export interface TransferResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  transferredAt: Date;
}

export interface TransferRetryResult {
  attempted: number;
  successful: number;
  failed: number;
  processed: number;
}

export class TransferService {
  private nftService = new NftService();
  private notificationsService = notificationsService;

  /**
   * Handle automatic transfer to brand wallet
   */
  async handleAutoTransfer(
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
      await this.notificationsService.sendCertificateTransferNotification(
        certificate.business.toString(),
        'business',
        mintResult.tokenId,
        certificate._id.toString(),
        brandSettings.certificateWallet,
        transferResult.txHash,
        transferResult.transferredAt,
        transferResult.gasUsed,
        0 // transferTime placeholder
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
      await this.notificationsService.sendCertificateTransferFailureNotification(
        certificate.business.toString(),
        'business',
        mintResult.tokenId,
        transferError.message
      );
    }
  }

  /**
   * Transfer certificate from relayer to brand wallet
   */
  async transferCertificateToBrand(
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
   * Retry failed transfers for Web3 brands
   */
  async retryFailedTransfers(businessId: string, limit: number = 10): Promise<TransferRetryResult> {
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
        logger.error(`Retry failed for certificate ${cert._id}:`, error);

        await Certificate.findByIdAndUpdate(cert._id, {
          transferAttempts: (cert.transferAttempts || 0) + 1,
          transferError: error.message,
          nextTransferAttempt: new Date(Date.now() + 600000) // 10 minutes
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
   * Manual transfer certificate to specified address
   */
  async manualTransferCertificate(
    certificateId: string,
    businessId: string,
    toAddress: string
  ): Promise<TransferResult> {
    const certificate = await Certificate.findOne({
      _id: certificateId,
      business: businessId
    });

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (certificate.transferredToBrand) {
      throw new Error('Certificate already transferred');
    }

    if (!certificate.contractAddress || !certificate.tokenId) {
      throw new Error('Certificate missing blockchain data');
    }

    const transferResult = await this.transferCertificateToBrand(
      certificate.contractAddress,
      certificate.tokenId,
      toAddress,
      businessId
    );

    // Update certificate
    await Certificate.findByIdAndUpdate(certificateId, {
      transferredToBrand: true,
      brandWallet: toAddress,
      transferTxHash: transferResult.txHash,
      transferredAt: transferResult.transferredAt,
      status: 'transferred_to_brand',
      transferFailed: false,
      transferAttempts: (certificate.transferAttempts || 0) + 1
    });

    return transferResult;
  }

  /**
   * Batch transfer multiple certificates
   */
  async batchTransferCertificates(
    certificateIds: string[],
    businessId: string,
    brandWallet: string
  ): Promise<{
    successful: Array<{ certificateId: string; txHash: string }>;
    failed: Array<{ certificateId: string; error: string }>;
  }> {
    const successful: Array<{ certificateId: string; txHash: string }> = [];
    const failed: Array<{ certificateId: string; error: string }> = [];

    for (const certId of certificateIds) {
      try {
        const result = await this.manualTransferCertificate(certId, businessId, brandWallet);
        successful.push({ certificateId: certId, txHash: result.txHash });
      } catch (error: any) {
        failed.push({ certificateId: certId, error: error.message });
      }
    }

    return { successful, failed };
  }

  /**
   * Get transfer limits for a plan
   */
  getTransferLimits(plan: string): { transfersPerMonth: number; gasCreditsWei: string } {
    const limits: Record<string, { transfersPerMonth: number; gasCreditsWei: string }> = {
      growth: { transfersPerMonth: 500, gasCreditsWei: '50000000000000000' },
      premium: { transfersPerMonth: 1000, gasCreditsWei: '100000000000000000' },
      enterprise: { transfersPerMonth: Number.POSITIVE_INFINITY, gasCreditsWei: '1000000000000000000' }
    };
    return limits[plan] || { transfersPerMonth: 0, gasCreditsWei: '0' };
  }

  /**
   * Calculate estimated gas cost for transfers
   */
  calculateEstimatedGasCost(recipientCount: number): string {
    // Estimate: ~0.005 ETH per mint + transfer
    const estimatedCostWei = BigInt(recipientCount) * BigInt('5000000000000000'); // 0.005 ETH in wei
    return estimatedCostWei.toString();
  }

  /**
   * Check if auto-transfer should be performed
   */
  private shouldAutoTransfer(brandSettings: any): boolean {
    // Check if auto-transfer is explicitly disabled
    if (brandSettings?.transferPreferences?.autoTransfer === false) {
      return false;
    }

    // Check if wallet address exists and is valid
    if (!brandSettings?.certificateWallet) {
      return false;
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(brandSettings.certificateWallet)) {
      return false;
    }

    return true;
  }

  /**
   * Get pending transfers count
   */
  async getPendingTransfersCount(businessId: string): Promise<number> {
    return Certificate.countDocuments({
      business: businessId,
      status: 'pending_transfer',
      transferScheduled: true,
      transferredToBrand: { $ne: true }
    });
  }

  /**
   * Get failed transfers count
   */
  async getFailedTransfersCount(businessId: string): Promise<number> {
    return Certificate.countDocuments({
      business: businessId,
      transferFailed: true,
      status: 'transfer_failed'
    });
  }

  /**
   * Cancel pending transfer
   */
  async cancelPendingTransfer(certificateId: string, businessId: string): Promise<void> {
    const certificate = await Certificate.findOne({
      _id: certificateId,
      business: businessId,
      status: 'pending_transfer'
    });

    if (!certificate) {
      throw new Error('Certificate not found or not pending transfer');
    }

    await Certificate.findByIdAndUpdate(certificateId, {
      transferScheduled: false,
      status: 'minted',
      nextTransferAttempt: undefined
    });
  }
}

export const transferService = new TransferService();
