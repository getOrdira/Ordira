/**
 * Certificate Delivery Service
 *
 * Handles certificate delivery operations including:
 * - Certificate delivery to recipients
 * - Scheduled delivery management
 * - Delivery notifications
 * - Next steps generation
 */

import { Certificate, ICertificate } from '../../../models/deprecated/certificate.model';
import { notificationsService } from '../../notifications/notifications.service';
import { logger } from '../../../utils/logger';

export interface DeliveryData {
  method?: string;
  scheduleDate?: Date;
  priority?: string;
  web3Enabled?: boolean;
  transferScheduled?: boolean;
  blockchainData?: {
    txHash?: string;
    tokenId?: string;
    contractAddress?: string;
  };
}

export interface DeliveryResult {
  success: boolean;
  message: string;
  deliveryId?: string;
}

export interface ScheduleDeliveryResult {
  success: boolean;
  message: string;
  scheduledId?: string;
}

export class DeliveryService {
  private notificationsService = notificationsService;

  /**
   * Deliver certificate with enhanced options
   */
  async deliverCertificate(
    certificateId: string,
    deliveryData: DeliveryData
  ): Promise<DeliveryResult> {
    try {
      const certificate = await Certificate.findById(certificateId).populate('product');

      if (!certificate) {
        throw new Error('Certificate not found');
      }

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
  ): Promise<ScheduleDeliveryResult> {
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
   * Process certificate delivery with mint result
   */
  async processCertificateDelivery(
    mintResult: any,
    deliveryOptions: any,
    hasWeb3: boolean
  ): Promise<void> {
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

  /**
   * Get certificate next steps
   */
  getCertificateNextSteps(
    hasWeb3: boolean,
    shouldAutoTransfer: boolean,
    transferScheduled: boolean
  ): string[] {
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

  /**
   * Cancel scheduled delivery
   */
  async cancelScheduledDelivery(
    certificateId: string,
    businessId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const certificate = await Certificate.findOne({
        _id: certificateId,
        business: businessId,
        deliveryScheduled: true
      });

      if (!certificate) {
        return { success: false, message: 'Scheduled delivery not found' };
      }

      await Certificate.findByIdAndUpdate(certificateId, {
        deliveryScheduled: false,
        scheduledDeliveryDate: undefined,
        scheduledDeliveryId: undefined
      });

      return { success: true, message: 'Scheduled delivery cancelled successfully' };
    } catch (error: any) {
      logger.error('Cancel scheduled delivery error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get scheduled deliveries
   */
  async getScheduledDeliveries(businessId: string): Promise<Array<{
    certificateId: string;
    scheduleDate: Date;
    status: string;
  }>> {
    const certificates = await Certificate.find({
      business: businessId,
      deliveryScheduled: true,
      delivered: { $ne: true }
    })
      .select('_id scheduledDeliveryDate scheduledDeliveryId')
      .lean();

    return certificates.map(cert => ({
      certificateId: cert._id.toString(),
      scheduleDate: cert.scheduledDeliveryDate!,
      status: 'scheduled'
    }));
  }

  /**
   * Resend delivery notification
   */
  async resendDeliveryNotification(
    certificateId: string,
    businessId: string,
    contactMethod: 'email' | 'sms' = 'email'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const certificate = await Certificate.findOne({
        _id: certificateId,
        business: businessId
      });

      if (!certificate) {
        return { success: false, message: 'Certificate not found' };
      }

      const hasWeb3 = certificate.autoTransferEnabled || false;
      await this.sendStandardDeliveryNotification(certificate, { method: contactMethod });

      return { success: true, message: 'Delivery notification resent successfully' };
    } catch (error: any) {
      logger.error('Resend delivery notification error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(certificateId: string, businessId: string): Promise<{
    delivered: boolean;
    deliveredAt?: Date;
    deliveryMethod?: string;
    scheduled: boolean;
    scheduledDate?: Date;
  } | null> {
    const certificate = await Certificate.findOne({
      _id: certificateId,
      business: businessId
    })
      .select('delivered deliveredAt deliveryMethod deliveryScheduled scheduledDeliveryDate')
      .lean();

    if (!certificate) {
      return null;
    }

    return {
      delivered: certificate.delivered || false,
      deliveredAt: certificate.deliveredAt,
      deliveryMethod: certificate.deliveryMethod,
      scheduled: certificate.deliveryScheduled || false,
      scheduledDate: certificate.scheduledDeliveryDate
    };
  }

  // Private helper methods

  private async sendWeb3DeliveryNotification(
    certificate: ICertificate,
    deliveryData: DeliveryData
  ): Promise<void> {
    const imageUrl = certificate.metadata?.imageUrl;
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

  private async sendStandardDeliveryNotification(
    certificate: ICertificate,
    deliveryData: DeliveryData
  ): Promise<void> {
    const imageUrl = certificate.metadata?.imageUrl;

    let message = `Your certificate is ready for viewing. Certificate ID: ${certificate._id}`;

    if (imageUrl) {
      message += `\n\nCertificate image: ${imageUrl}`;
    }

    await this.notificationsService.sendEmail(certificate.recipient, 'Certificate Ready', message);
  }

  private async storeScheduledDelivery(deliveryData: any): Promise<void> {
    logger.info('Storing scheduled delivery:', deliveryData.scheduledId);
    // TODO: Store in database or cache
  }
}

export const deliveryService = new DeliveryService();
