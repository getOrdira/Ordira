// src/controllers/features/certificates/certificateHelpers.controller.ts
// Certificate helpers controller using modular certificate services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getCertificatesServices } from '../../../services/container/container.getters';  

/**
 * Certificate helpers request interfaces
 */
interface ValidateRecipientRequest extends BaseRequest {
  validatedBody: {
    recipient: string;
    contactMethod: 'email' | 'sms' | 'wallet';
  };
}

interface ValidateProductOwnershipRequest extends BaseRequest {
  validatedBody: {
    productId: string;
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

interface GetCertificateNextStepsRequest extends BaseRequest {
  validatedBody: {
    hasWeb3: boolean;
    shouldAutoTransfer: boolean;
    transferScheduled: boolean;
  };
}

interface GetTransferUsageRequest extends BaseRequest {
  validatedQuery?: {
    includeAnalytics?: boolean;
  };
}

interface GetTransferLimitsRequest extends BaseRequest {
  validatedQuery: {
    plan: string;
  };
}

interface GetPlanLimitsRequest extends BaseRequest {
  validatedQuery: {
    plan: string;
  };
}

interface CalculateGasCostRequest extends BaseRequest {
  validatedBody: {
    recipientCount: number;
  };
}

interface CalculateMonthlyGrowthRequest extends BaseRequest {
  validatedBody: {
    monthlyStats: Array<{ month: string; transfers: number }>;
  };
}

interface GenerateWeb3InsightsRequest extends BaseRequest {
  validatedBody: {
    certificateAnalytics: any;
    transferAnalytics: any;
  };
}

interface GenerateWeb3RecommendationsRequest extends BaseRequest {
  validatedBody: {
    certificateAnalytics: any;
    transferAnalytics: any;
    plan: string;
  };
}

/**
 * Certificate helpers controller
 */
export class CertificateHelpersController extends BaseController {
  private certificateHelpersService = getCertificatesServices().helpers;

  /**
   * POST /api/certificates/validate-recipient
   * Validate recipient format based on contact method
   */
  async validateRecipient(req: ValidateRecipientRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_RECIPIENT');

        const validation = this.certificateHelpersService.validateRecipient(
          req.validatedBody.recipient,
          req.validatedBody.contactMethod
        );

        this.logAction(req, 'VALIDATE_RECIPIENT_SUCCESS', {
          businessId: req.businessId,
          contactMethod: req.validatedBody.contactMethod,
          valid: validation.valid
        });

        return { validation };
      });
    }, res, 'Recipient validation completed', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/validate-product-ownership
   * Validate product ownership by business
   */
  async validateProductOwnership(req: ValidateProductOwnershipRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_PRODUCT_OWNERSHIP');

        const isValid = await this.certificateHelpersService.validateProductOwnership(
          req.businessId!,
          req.validatedBody.productId
        );

        this.logAction(req, 'VALIDATE_PRODUCT_OWNERSHIP_SUCCESS', {
          businessId: req.businessId,
          productId: req.validatedBody.productId,
          isValid
        });

        return { isValid };
      });
    }, res, 'Product ownership validation completed', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/:certificateId/ownership-status
   * Get certificate ownership status
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

        const ownershipStatus = this.certificateHelpersService.getOwnershipStatus(certificate);

        this.logAction(req, 'GET_OWNERSHIP_STATUS_SUCCESS', {
          businessId: req.businessId,
          certificateId: req.validatedParams.certificateId,
          status: ownershipStatus
        });

        return { ownershipStatus };
      });
    }, res, 'Ownership status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/:certificateId/transfer-health
   * Calculate transfer health score and identify issues
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

        const transferHealth = this.certificateHelpersService.getTransferHealth(certificate);

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
   * POST /api/certificates/next-steps
   * Get certificate next steps based on configuration
   */
  async getCertificateNextSteps(req: GetCertificateNextStepsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CERTIFICATE_NEXT_STEPS');

        const nextSteps = this.certificateHelpersService.getCertificateNextSteps(
          req.validatedBody.hasWeb3,
          req.validatedBody.shouldAutoTransfer,
          req.validatedBody.transferScheduled
        );

        this.logAction(req, 'GET_CERTIFICATE_NEXT_STEPS_SUCCESS', {
          businessId: req.businessId,
          hasWeb3: req.validatedBody.hasWeb3,
          stepCount: nextSteps.length
        });

        return { nextSteps };
      });
    }, res, 'Certificate next steps retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/transfer-usage
   * Get transfer usage for a business
   */
  async getTransferUsage(req: GetTransferUsageRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_TRANSFER_USAGE');

        const transferUsage = await this.certificateHelpersService.getTransferUsage(req.businessId!);

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
   * GET /api/certificates/transfer-limits
   * Get transfer limits for a plan
   */
  async getTransferLimits(req: GetTransferLimitsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_TRANSFER_LIMITS');

        const limits = this.certificateHelpersService.getTransferLimits(req.validatedQuery.plan);

        this.logAction(req, 'GET_TRANSFER_LIMITS_SUCCESS', {
          businessId: req.businessId,
          plan: req.validatedQuery.plan,
          transfersPerMonth: limits.transfersPerMonth
        });

        return { limits };
      });
    }, res, 'Transfer limits retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/plan-limits
   * Get plan limits for certificates
   */
  async getPlanLimits(req: GetPlanLimitsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_PLAN_LIMITS');

        const limits = this.certificateHelpersService.getPlanLimits(req.validatedQuery.plan);

        this.logAction(req, 'GET_PLAN_LIMITS_SUCCESS', {
          businessId: req.businessId,
          plan: req.validatedQuery.plan,
          certificates: limits.certificates,
          hasWeb3: limits.hasWeb3
        });

        return { limits };
      });
    }, res, 'Plan limits retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/calculate-gas-cost
   * Calculate estimated gas cost for batch operations
   */
  async calculateEstimatedGasCost(req: CalculateGasCostRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_ESTIMATED_GAS_COST');

        const estimatedCost = this.certificateHelpersService.calculateEstimatedGasCost(
          req.validatedBody.recipientCount
        );

        this.logAction(req, 'CALCULATE_ESTIMATED_GAS_COST_SUCCESS', {
          businessId: req.businessId,
          recipientCount: req.validatedBody.recipientCount,
          estimatedCostWei: estimatedCost
        });

        return { estimatedCostWei: estimatedCost };
      });
    }, res, 'Gas cost calculated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/calculate-monthly-growth
   * Calculate monthly growth percentage from stats
   */
  async calculateMonthlyGrowth(req: CalculateMonthlyGrowthRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_MONTHLY_GROWTH');

        const growthPercentage = this.certificateHelpersService.calculateMonthlyGrowth(
          req.validatedBody.monthlyStats
        );

        this.logAction(req, 'CALCULATE_MONTHLY_GROWTH_SUCCESS', {
          businessId: req.businessId,
          growthPercentage,
          statsCount: req.validatedBody.monthlyStats.length
        });

        return { growthPercentage };
      });
    }, res, 'Monthly growth calculated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/generate-web3-insights
   * Generate Web3 insights based on analytics
   */
  async generateWeb3Insights(req: GenerateWeb3InsightsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_WEB3_INSIGHTS');

        const insights = this.certificateHelpersService.generateWeb3Insights(
          req.validatedBody.certificateAnalytics,
          req.validatedBody.transferAnalytics
        );

        this.logAction(req, 'GENERATE_WEB3_INSIGHTS_SUCCESS', {
          businessId: req.businessId,
          insightCount: insights.length
        });

        return { insights };
      });
    }, res, 'Web3 insights generated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/generate-web3-recommendations
   * Generate Web3 recommendations based on analytics
   */
  async generateWeb3Recommendations(req: GenerateWeb3RecommendationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_WEB3_RECOMMENDATIONS');

        const recommendations = this.certificateHelpersService.generateWeb3Recommendations(
          req.validatedBody.certificateAnalytics,
          req.validatedBody.transferAnalytics,
          req.validatedBody.plan
        );

        this.logAction(req, 'GENERATE_WEB3_RECOMMENDATIONS_SUCCESS', {
          businessId: req.businessId,
          plan: req.validatedBody.plan,
          recommendationCount: recommendations.length
        });

        return { recommendations };
      });
    }, res, 'Web3 recommendations generated successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const certificateHelpersController = new CertificateHelpersController();
