// src/controllers/features/domains/domainAnalytics.controller.ts
// Controller exposing domain analytics operations

import { Response } from 'express';
import { DomainsBaseController, DomainsBaseRequest } from './domainsBase.controller';
import type { DomainAnalyticsOptions } from '../../../services/domains/features/domainAnalytics.service';

interface DomainAnalyticsRequest extends DomainsBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    domainId?: string;
    timeframe?: string;
    useCache?: boolean;
    includePerformance?: boolean;
    includeErrors?: boolean;
    includeTraffic?: boolean;
  };
  validatedBody?: {
    domainName?: string;
    statusCode?: number;
    latencyMs?: number;
    visitorIdentifier?: string;
  };
}

/**
 * DomainAnalyticsController maps HTTP analytics requests to the domain analytics service.
 */
export class DomainAnalyticsController extends DomainsBaseController {
  /**
   * Retrieve analytics for a domain mapping.
   */
  async getDomainAnalytics(req: DomainAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_ANALYTICS_GET');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const options: DomainAnalyticsOptions = {
        timeframe: this.parseString(query.timeframe) as DomainAnalyticsOptions['timeframe'],
        useCache: query.useCache !== undefined ? this.parseBoolean(query.useCache) : undefined,
        includePerformance: query.includePerformance !== undefined ? this.parseBoolean(query.includePerformance) : undefined,
        includeErrors: query.includeErrors !== undefined ? this.parseBoolean(query.includeErrors) : undefined,
        includeTraffic: query.includeTraffic !== undefined ? this.parseBoolean(query.includeTraffic) : undefined,
      };

      const report = await this.domainAnalyticsService.getDomainAnalytics(businessId, domainId, options);

      this.logAction(req, 'DOMAINS_ANALYTICS_GET_SUCCESS', {
        businessId,
        domainId,
        timeframe: report.timeframe,
      });

      return { report };
    }, res, 'Domain analytics generated successfully', this.getRequestMeta(req));
  }

  /**
   * Record a domain access event.
   */
  async recordDomainAccess(req: DomainAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_ANALYTICS_RECORD_ACCESS');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const domainName = this.parseString(body.domainName) ?? this.requireDomainName(req);

      await this.domainAnalyticsService.recordDomainAccess(domainName, {
        statusCode: this.parseOptionalNumber(body.statusCode),
        latencyMs: this.parseOptionalNumber(body.latencyMs),
        visitorIdentifier: this.parseString(body.visitorIdentifier),
      });

      this.logAction(req, 'DOMAINS_ANALYTICS_RECORD_ACCESS_SUCCESS', {
        domain: domainName,
      });

      return {
        domain: domainName,
        recorded: true,
      };
    }, res, 'Domain access recorded successfully', this.getRequestMeta(req));
  }

  /**
   * Reset analytics counters for a domain mapping.
   */
  async resetDomainAnalytics(req: DomainsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_ANALYTICS_RESET');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      await this.domainAnalyticsService.resetDomainAnalytics(businessId, domainId);

      this.logAction(req, 'DOMAINS_ANALYTICS_RESET_SUCCESS', {
        businessId,
        domainId,
      });

      return {
        businessId,
        domainId,
        reset: true,
      };
    }, res, 'Domain analytics reset successfully', this.getRequestMeta(req));
  }
}

export const domainAnalyticsController = new DomainAnalyticsController();

