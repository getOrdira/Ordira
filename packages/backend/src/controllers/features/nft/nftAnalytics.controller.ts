// src/controllers/features/nft/nftAnalytics.controller.ts
// Controller for NFT analytics operations

import { Response, NextFunction } from 'express';
import { NftBaseController, NftBaseRequest } from './nftBase.controller';

interface GetCertificateAnalyticsRequest extends NftBaseRequest {
  // No additional query params needed
}

interface GetAnalyticsRequest extends NftBaseRequest {
  validatedQuery?: {
    startDate?: string;
    endDate?: string;
    contractAddress?: string;
  };
}

/**
 * NftAnalyticsController exposes analytics operations aligned with NFT service.
 */
export class NftAnalyticsController extends NftBaseController {
  /**
   * Get certificate analytics
   */
  async getCertificateAnalytics(
    req: GetCertificateAnalyticsRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const businessId = this.resolveBusinessId(req);
      this.ensureBusinessId(businessId);

      this.recordPerformance(req, 'GET_CERTIFICATE_ANALYTICS');

      const analytics = await this.nftService.getCertificateAnalytics(businessId);

      this.logAction(req, 'GET_CERTIFICATE_ANALYTICS_SUCCESS', {
        businessId,
        totalCertificates: analytics.totalCertificates,
      });

      return { analytics };
    }, res, 'Certificate analytics retrieved', this.getRequestMeta(req));
  }

  /**
   * Get comprehensive NFT analytics
   */
  async getAnalytics(req: GetAnalyticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const businessId = this.resolveBusinessId(req);
      this.ensureBusinessId(businessId);

      const query = req.validatedQuery ?? {};
      const options = {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        contractAddress: this.parseString(query.contractAddress),
      };

      // Validate contract address if provided
      if (options.contractAddress) {
        this.validateAddress(options.contractAddress, 'contract address');
      }

      this.recordPerformance(req, 'GET_NFT_ANALYTICS');

      const analytics = await this.nftService.getAnalytics(businessId, options);

      this.logAction(req, 'GET_NFT_ANALYTICS_SUCCESS', {
        businessId,
        totalMinted: analytics.summary.totalMinted,
      });

      return { analytics };
    }, res, 'NFT analytics retrieved', this.getRequestMeta(req));
  }
}

export const nftAnalyticsController = new NftAnalyticsController();

