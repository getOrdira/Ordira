// src/controllers/features/domains/domainHealth.controller.ts
// Controller exposing domain health checks

import { Response } from 'express';
import { DomainsBaseController, DomainsBaseRequest } from './domainsBase.controller';
import type { DomainHealthCheckOptions } from '../../../services/domains/features/domainHealth.service';

interface DomainHealthRequest extends DomainsBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    domainId?: string;
    timeoutMs?: number;
    includeDns?: boolean;
    includeHttp?: boolean;
    includeSsl?: boolean;
  };
  validatedBody?: {
    timeoutMs?: number;
    includeDns?: boolean;
    includeHttp?: boolean;
    includeSsl?: boolean;
  };
}

/**
 * DomainHealthController maps health-check requests to the domain health service.
 */
export class DomainHealthController extends DomainsBaseController {
  /**
   * Execute a domain health check and persist results.
   */
  async runHealthCheck(req: DomainHealthRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_HEALTH_RUN');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const body = req.validatedBody ?? (req.body as any) ?? {};
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const options: DomainHealthCheckOptions = {
        timeoutMs: this.parseOptionalNumber(body.timeoutMs ?? query.timeoutMs, { min: 1000, max: 60000 }),
        includeDns: this.parseOptionalBoolean(body.includeDns ?? query.includeDns),
        includeHttp: this.parseOptionalBoolean(body.includeHttp ?? query.includeHttp),
        includeSsl: this.parseOptionalBoolean(body.includeSsl ?? query.includeSsl),
      };

      const report = await this.domainHealthService.runHealthCheck(businessId, domainId, options);

      this.logAction(req, 'DOMAINS_HEALTH_RUN_SUCCESS', {
        businessId,
        domainId,
        overall: report.overall,
      });

      return { report };
    }, res, 'Domain health check completed successfully', this.getRequestMeta(req));
  }
}

export const domainHealthController = new DomainHealthController();

