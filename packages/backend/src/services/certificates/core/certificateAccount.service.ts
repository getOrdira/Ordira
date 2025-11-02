/**
 * Certificate Account Service
 *
 * Handles certificate statistics, usage tracking, and ownership status including:
 * - Usage statistics and limits
 * - Certificate distribution and ownership
 * - Health monitoring
 * - Plan limits and quotas
 */

import { Certificate } from '../../../models/certificates/certificate.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { logger } from '../../../utils/logger';

export interface CertificateStats {
  total: number;
  thisMonth: number;
  distribution: {
    inRelayerWallet: number;
    inBrandWallet: number;
    transferFailed: number;
  };
  brandWallet?: string;
  autoTransferEnabled: boolean;
}

export interface CertificateUsage {
  total: number;
  certificatesThisMonth: number;
}

export interface TransferUsage {
  thisMonth: number;
  total: number;
}

export interface OwnershipStatus {
  status: 'revoked' | 'failed' | 'brand' | 'relayer';
}

export interface TransferHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  issues: string[];
}

export class CertificateAccountService {
  /**
   * Get certificate statistics with transfer info
   */
  async getCertificateStats(businessId: string): Promise<CertificateStats> {
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

    const shouldAutoTransfer = this.shouldAutoTransfer(brandSettings);

    return {
      total,
      thisMonth,
      distribution: {
        inRelayerWallet,
        inBrandWallet,
        transferFailed
      },
      brandWallet: brandSettings?.certificateWallet,
      autoTransferEnabled: !!brandSettings?.certificateWallet && shouldAutoTransfer
    };
  }

  /**
   * Get certificate usage statistics for a business
   */
  async getCertificateUsage(businessId: string): Promise<CertificateUsage> {
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
   * Get transfer usage statistics
   */
  async getTransferUsage(businessId: string): Promise<TransferUsage> {
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const analytics = (brandSettings as any)?.transferAnalytics;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyStats = analytics?.monthlyStats?.find((stat: any) => stat.month === currentMonth);

    return {
      thisMonth: monthlyStats?.transfers || 0,
      total: analytics?.totalTransfers || 0
    };
  }

  /**
   * Get ownership status of a certificate
   */
  getOwnershipStatus(certificate: any): OwnershipStatus {
    let status: 'revoked' | 'failed' | 'brand' | 'relayer';

    if (certificate.revoked) {
      status = 'revoked';
    } else if (certificate.transferFailed && certificate.transferAttempts >= certificate.maxTransferAttempts) {
      status = 'failed';
    } else if (certificate.transferredToBrand) {
      status = 'brand';
    } else {
      status = 'relayer';
    }

    return { status };
  }

  /**
   * Get transfer health status
   */
  getTransferHealth(certificate: any): TransferHealth {
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

    if (
      certificate.status === 'pending_transfer' &&
      certificate.nextTransferAttempt &&
      new Date(certificate.nextTransferAttempt) < new Date()
    ) {
      issues.push('Transfer overdue');
      score -= 30;
    }

    return {
      status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Get certificate distribution by status
   */
  async getCertificateDistribution(businessId: string): Promise<Record<string, number>> {
    const statuses = await Certificate.aggregate([
      { $match: { business: businessId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result: Record<string, number> = {};
    statuses.forEach(item => {
      result[item._id || 'unknown'] = item.count;
    });

    return result;
  }

  /**
   * Get monthly certificate trends
   */
  async getMonthlyCertificateTrends(
    businessId: string,
    monthsBack: number = 6
  ): Promise<Array<{ month: string; count: number }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const trends = await Certificate.aggregate([
      {
        $match: {
          business: businessId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    return trends.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      count: item.count
    }));
  }

  /**
   * Get certificate count by product
   */
  async getCertificatesByProduct(businessId: string): Promise<Array<{ productId: string; count: number }>> {
    const products = await Certificate.aggregate([
      { $match: { business: businessId } },
      { $group: { _id: '$product', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return products.map(item => ({
      productId: item._id?.toString() || 'unknown',
      count: item.count
    }));
  }

  /**
   * Get certificates nearing plan limits
   */
  async checkPlanLimits(
    businessId: string,
    planLimits: { certificates: number }
  ): Promise<{
    used: number;
    limit: number;
    percentage: number;
    nearingLimit: boolean;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const used = await Certificate.countDocuments({
      business: businessId,
      createdAt: { $gte: startOfMonth }
    });

    const limit = planLimits.certificates;
    const percentage = limit === Infinity ? 0 : Math.round((used / limit) * 100);
    const nearingLimit = percentage >= 80;

    return {
      used,
      limit,
      percentage,
      nearingLimit
    };
  }

  /**
   * Get average certificate processing time
   */
  async getAverageProcessingTime(businessId: string): Promise<number> {
    const recentCerts = await Certificate.find({
      business: businessId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      transferredToBrand: true,
      transferredAt: { $exists: true }
    })
      .select('createdAt transferredAt')
      .limit(100)
      .lean();

    if (recentCerts.length === 0) return 0;

    const totalTime = recentCerts.reduce((sum, cert) => {
      const processingTime = new Date(cert.transferredAt!).getTime() - new Date(cert.createdAt).getTime();
      return sum + processingTime;
    }, 0);

    return Math.round(totalTime / recentCerts.length);
  }

  /**
   * Get certificate success rate
   */
  async getSuccessRate(businessId: string, days: number = 30): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, failed] = await Promise.all([
      Certificate.countDocuments({
        business: businessId,
        createdAt: { $gte: startDate }
      }),
      Certificate.countDocuments({
        business: businessId,
        createdAt: { $gte: startDate },
        transferFailed: true
      })
    ]);

    if (total === 0) return 100;

    return Math.round(((total - failed) / total) * 100);
  }

  /**
   * Get detailed transfer statistics
   */
  async getTransferStatistics(businessId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
    averageTime: number;
  }> {
    const [total, successful, failed, pending] = await Promise.all([
      Certificate.countDocuments({ business: businessId }),
      Certificate.countDocuments({
        business: businessId,
        transferredToBrand: true
      }),
      Certificate.countDocuments({
        business: businessId,
        transferFailed: true
      }),
      Certificate.countDocuments({
        business: businessId,
        status: 'pending_transfer'
      })
    ]);

    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
    const averageTime = await this.getAverageProcessingTime(businessId);

    return {
      total,
      successful,
      failed,
      pending,
      successRate,
      averageTime
    };
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
   * Get global transfer analytics across all brands
   */
  async getGlobalTransferAnalytics(): Promise<{
    totalBrands: number;
    totalTransfers: number;
    averageSuccessRate: number;
  } | null> {
    try {
      const allSettings = await BrandSettings.find({
        'web3Settings.nftContract': { $exists: true }
      });

      // Calculate global metrics
      const totalBrands = allSettings.length;
      const totalTransfers = allSettings.reduce((sum, settings) => {
        return sum + ((settings as any)?.transferAnalytics?.totalTransfers || 0);
      }, 0);

      const successRates = await Promise.all(
        allSettings.map(settings =>
          this.getSuccessRate(settings.business.toString())
        )
      );

      const averageSuccessRate = successRates.length > 0
        ? Math.round(successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length)
        : 0;

      return {
        totalBrands,
        totalTransfers,
        averageSuccessRate
      };
    } catch (error) {
      logger.error('Failed to get global transfer analytics:', error);
      return null;
    }
  }
}

export const certificateAccountService = new CertificateAccountService();


