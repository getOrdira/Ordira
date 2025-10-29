// src/controllers/features/certificates/certificateAccount.controller.ts
// Certificate account controller using modular certificate services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { certificateAccountService } from '../../../services/certificates/core/certificateAccount.service';

/**
 * Certificate account request interfaces
 */
interface GetCertificateStatsRequest extends BaseRequest {
  validatedQuery?: {
    includeDistribution?: boolean;
    includeWallet?: boolean;
  };
}

interface GetCertificateUsageRequest extends BaseRequest {
  validatedQuery?: {
    timeframe?: 'month' | 'year' | 'all';
  };
}

interface GetTransferUsageRequest extends BaseRequest {
  validatedQuery?: {
    includeAnalytics?: boolean;
  };
}

interface GetOwnershipStatusRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
}

interface GetTransferHealthRequest extends BaseRequest {
  validatedParams: {
    certificateId: string;
  };
}

interface GetCertificateDistributionRequest extends BaseRequest {
  validatedQuery?: {
    groupBy?: 'status' | 'product' | 'month';
  };
}

interface GetMonthlyTrendsRequest extends BaseRequest {
  validatedQuery?: {
    monthsBack?: number;
  };
}

interface CheckPlanLimitsRequest extends BaseRequest {
  validatedQuery?: {
    planType?: string;
  };
}

interface GetTransferStatisticsRequest extends BaseRequest {
  validatedQuery?: {
    includeSuccessRate?: boolean;
    includeAverageTime?: boolean;
  };
}

/**
 * Certificate account controller
 */
export class CertificateAccountController extends BaseController {
  private certificateAccountService = certificateAccountService;

  /**
   * GET /api/certificates/stats
   * Get certificate statistics with transfer info
   */
  async getCertificateStats(req: GetCertificateStatsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATE_STATS');

        const stats = await this.certificateAccountService.getCertificateStats(req.businessId!);

        this.logAction(req, 'GET_CERTIFICATE_STATS_SUCCESS', {
          businessId: req.businessId,
          total: stats.total,
          thisMonth: stats.thisMonth
        });

        return { stats };
      });
    }, res, 'Certificate statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/usage
   * Get certificate usage statistics for a business
   */
  async getCertificateUsage(req: GetCertificateUsageRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATE_USAGE');

        const usage = await this.certificateAccountService.getCertificateUsage(req.businessId!);

        this.logAction(req, 'GET_CERTIFICATE_USAGE_SUCCESS', {
          businessId: req.businessId,
          total: usage.total,
          thisMonth: usage.certificatesThisMonth
        });

        return { usage };
      });
    }, res, 'Certificate usage retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/transfer-usage
   * Get transfer usage statistics
   */
  async getTransferUsage(req: GetTransferUsageRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_TRANSFER_USAGE');

        const transferUsage = await this.certificateAccountService.getTransferUsage(req.businessId!);

        this.logAction(req, 'GET_TRANSFER_USAGE_SUCCESS', {
          businessId: req.businessId,
          thisMonth: transferUsage.thisMonth,
          total: transferUsage.total
        });

        return { transferUsage };
      });
    }, res, 'Transfer usage retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/:certificateId/ownership-status
   * Get ownership status of a certificate
   */
  async getOwnershipStatus(req: GetOwnershipStatusRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_OWNERSHIP_STATUS');

        // First get the certificate to check ownership status
        const { certificateDataService } = await import('../../../services/certificates/core/certificateData.service');
        const certificate = await certificateDataService.getCertificate(
          req.validatedParams.certificateId,
          req.businessId
        );

        const ownershipStatus = this.certificateAccountService.getOwnershipStatus(certificate);

        this.logAction(req, 'GET_OWNERSHIP_STATUS_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId,
          status: ownershipStatus.status
        });

        return { ownershipStatus };
      });
    }, res, 'Ownership status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/:certificateId/transfer-health
   * Get transfer health status
   */
  async getTransferHealth(req: GetTransferHealthRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_TRANSFER_HEALTH');

        // First get the certificate to check transfer health
        const { certificateDataService } = await import('../../../services/certificates/core/certificateData.service');
        const certificate = await certificateDataService.getCertificate(
          req.validatedParams.certificateId,
          req.businessId
        );

        const transferHealth = this.certificateAccountService.getTransferHealth(certificate);

        this.logAction(req, 'GET_TRANSFER_HEALTH_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId,
          healthScore: transferHealth.score,
          status: transferHealth.status
        });

        return { transferHealth };
      });
    }, res, 'Transfer health retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/distribution
   * Get certificate distribution by status
   */
  async getCertificateDistribution(req: GetCertificateDistributionRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATE_DISTRIBUTION');

        const distribution = await this.certificateAccountService.getCertificateDistribution(req.businessId!);

        this.logAction(req, 'GET_CERTIFICATE_DISTRIBUTION_SUCCESS', {
          businessId: req.businessId,
          statusCount: Object.keys(distribution).length
        });

        return { distribution };
      });
    }, res, 'Certificate distribution retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/monthly-trends
   * Get monthly certificate trends
   */
  async getMonthlyCertificateTrends(req: GetMonthlyTrendsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MONTHLY_CERTIFICATE_TRENDS');

        const monthsBack = req.validatedQuery?.monthsBack || 6;
        const trends = await this.certificateAccountService.getMonthlyCertificateTrends(
          req.businessId!,
          monthsBack
        );

        this.logAction(req, 'GET_MONTHLY_CERTIFICATE_TRENDS_SUCCESS', {
          businessId: req.businessId,
          monthsBack,
          trendCount: trends.length
        });

        return { trends };
      });
    }, res, 'Monthly certificate trends retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/by-product
   * Get certificate count by product
   */
  async getCertificatesByProduct(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATES_BY_PRODUCT');

        const productCounts = await this.certificateAccountService.getCertificatesByProduct(req.businessId!);

        this.logAction(req, 'GET_CERTIFICATES_BY_PRODUCT_SUCCESS', {
          businessId: req.businessId,
          productCount: productCounts.length
        });

        return { productCounts };
      });
    }, res, 'Product certificate counts retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/plan-limits
   * Get certificates nearing plan limits
   */
  async checkPlanLimits(req: CheckPlanLimitsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CHECK_PLAN_LIMITS');

        // Get plan limits - this would typically come from subscription service
        const planLimits = {
          certificates: req.validatedQuery?.planType === 'enterprise' ? Infinity : 100 // Placeholder
        };

        const limits = await this.certificateAccountService.checkPlanLimits(
          req.businessId!,
          planLimits
        );

        this.logAction(req, 'CHECK_PLAN_LIMITS_SUCCESS', {
          businessId: req.businessId,
          used: limits.used,
          limit: limits.limit,
          percentage: limits.percentage
        });

        return { limits };
      });
    }, res, 'Plan limits checked successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/average-processing-time
   * Get average certificate processing time
   */
  async getAverageProcessingTime(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_AVERAGE_PROCESSING_TIME');

        const averageTime = await this.certificateAccountService.getAverageProcessingTime(req.businessId!);

        this.logAction(req, 'GET_AVERAGE_PROCESSING_TIME_SUCCESS', {
          businessId: req.businessId,
          averageTimeMs: averageTime
        });

        return { averageTimeMs: averageTime };
      });
    }, res, 'Average processing time retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/success-rate
   * Get certificate success rate
   */
  async getSuccessRate(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const days = req.query.days ? parseInt(req.query.days as string) : 30;

        this.recordPerformance(req, 'GET_SUCCESS_RATE');

        const successRate = await this.certificateAccountService.getSuccessRate(req.businessId!, days);

        this.logAction(req, 'GET_SUCCESS_RATE_SUCCESS', {
          businessId: req.businessId,
          days,
          successRate
        });

        return { successRate };
      });
    }, res, 'Success rate retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/transfer-statistics
   * Get detailed transfer statistics
   */
  async getTransferStatistics(req: GetTransferStatisticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_TRANSFER_STATISTICS');

        const statistics = await this.certificateAccountService.getTransferStatistics(req.businessId!);

        this.logAction(req, 'GET_TRANSFER_STATISTICS_SUCCESS', {
          businessId: req.businessId,
          total: statistics.total,
          successRate: statistics.successRate
        });

        return { statistics };
      });
    }, res, 'Transfer statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/global-analytics
   * Get global transfer analytics across all brands
   */
  async getGlobalTransferAnalytics(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_GLOBAL_TRANSFER_ANALYTICS');

        const analytics = await this.certificateAccountService.getGlobalTransferAnalytics();

        this.logAction(req, 'GET_GLOBAL_TRANSFER_ANALYTICS_SUCCESS', {
          businessId: req.businessId,
          totalBrands: analytics?.totalBrands || 0
        });

        return { analytics };
      });
    }, res, 'Global transfer analytics retrieved successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const certificateAccountController = new CertificateAccountController();
