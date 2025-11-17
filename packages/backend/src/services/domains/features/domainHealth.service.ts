import { performance } from 'node:perf_hooks';

import { createAppError } from '../../../middleware/core/error.middleware';
import { logger } from '../../../utils/logger';
import type { DomainMappingRecord } from '../core/domainStorage.service';
import { domainRegistryService } from '../core/domainRegistry.service';
import { domainDnsService } from './domainDns.service';

export interface DomainHealthCheckOptions {
  timeoutMs?: number;
  includeDns?: boolean;
  includeHttp?: boolean;
  includeSsl?: boolean;
}

interface HealthComponentStatus<TDetails = Record<string, unknown>> {
  status: 'healthy' | 'warning' | 'error';
  details?: TDetails;
}

export interface DomainHealthReport {
  overall: 'healthy' | 'warning' | 'error';
  dns: HealthComponentStatus<{ issues?: string[] }>;
  ssl: HealthComponentStatus<{ expiresAt?: Date; issuer?: string; daysUntilExpiry?: number }>;
  http: HealthComponentStatus<{ statusCode?: number; responseTimeMs?: number; error?: string }>;
  performance: {
    status: 'healthy' | 'warning' | 'error';
    responseTimeMs: number;
  };
  issues: string[];
  timestamp: Date;
}

const DEFAULT_TIMEOUT_MS = 5000;
const WARNING_RESPONSE_TIME_MS = 1500;
const ERROR_RESPONSE_TIME_MS = 4000;

export class DomainHealthService {
  constructor(
    private readonly registry = domainRegistryService
  ) {}

  /**
   * Run a comprehensive health check and persist the results.
   */
  async runHealthCheck(
    businessId: string,
    domainId: string,
    options: DomainHealthCheckOptions = {}
  ): Promise<DomainHealthReport> {
    const domain = await this.ensureDomain(businessId, domainId);
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const includeDns = options.includeDns ?? true;
    const includeHttp = options.includeHttp ?? true;
    const includeSsl = options.includeSsl ?? true;

    const issues: string[] = [];
    let dnsStatus: HealthComponentStatus<{ issues?: string[] }> = { status: 'healthy' };
    let httpStatus: HealthComponentStatus<{ statusCode?: number; responseTimeMs?: number; error?: string }> = { status: 'healthy' };
    let sslStatus: HealthComponentStatus<{ expiresAt?: Date; issuer?: string; daysUntilExpiry?: number }> = { status: 'healthy' };
    let responseTimeMs = domain.averageResponseTime ?? 0;

    if (includeDns) {
      const dnsEvaluation = await domainDnsService.evaluateDomainRecords(
        domain.domain,
        domain.verificationToken ?? undefined
      );

      const dnsIssues = dnsEvaluation.issues ?? [];
      dnsStatus = {
        status: dnsEvaluation.status === 'verified'
          ? 'healthy'
          : dnsEvaluation.status === 'pending'
            ? 'warning'
            : 'error',
        details: dnsIssues.length ? { issues: dnsIssues } : undefined
      };

      if (dnsIssues.length) {
        issues.push(...dnsIssues.map(issue => `DNS: ${issue}`));
      }

      await this.registry.updateDnsStatus(businessId, domainId, {
        status: dnsEvaluation.status === 'verified' ? 'verified' : dnsEvaluation.status === 'pending' ? 'pending' : 'error'
      });
    }

    if (includeHttp) {
      httpStatus = await this.checkHttpConnectivity(domain.domain, timeoutMs);
      if (httpStatus.details?.responseTimeMs) {
        responseTimeMs = httpStatus.details.responseTimeMs;
      }
      if (httpStatus.status !== 'healthy') {
        const reason = httpStatus.details?.error
          ?? `status code ${httpStatus.details?.statusCode ?? 'unknown'}`;
        issues.push(`HTTP: ${reason}`);
      }
    }

    if (includeSsl) {
      sslStatus = await this.evaluateSslState(domain);
      if (sslStatus.status !== 'healthy') {
        issues.push('SSL: certificate requires attention');
      }
    }

    let overall: DomainHealthReport['overall'] = 'healthy';
    if ([dnsStatus, httpStatus, sslStatus].some(component => component.status === 'error')) {
      overall = 'error';
    } else if ([dnsStatus, httpStatus, sslStatus].some(component => component.status === 'warning')) {
      overall = 'warning';
    }

    const performanceStatus = this.evaluatePerformance(responseTimeMs);
    if (performanceStatus.status === 'warning' && overall === 'healthy') {
      overall = 'warning';
    } else if (performanceStatus.status === 'error') {
      overall = 'error';
      issues.push('Performance: average response time is too high');
    }

    const report: DomainHealthReport = {
      overall,
      dns: dnsStatus,
      ssl: sslStatus,
      http: httpStatus,
      performance: performanceStatus,
      issues,
      timestamp: new Date()
    };

    await this.registry.updateHealthMetrics(businessId, domainId, {
      healthStatus: report.overall,
      lastHealthCheck: report.timestamp,
      dnsStatus: includeDns ? this.mapComponentStatusToDomainStatus(dnsStatus.status) : undefined,
      sslStatus: includeSsl ? this.mapSslStatus(sslStatus.status) : undefined,
      responseTime: performanceStatus.responseTimeMs,
      performanceMetrics: {
        responseTime: performanceStatus.responseTimeMs,
        uptime: domain.uptimePercentage ?? 99.9,
        errorRate: httpStatus.status === 'error' ? 0.05 : 0.01,
        lastChecked: report.timestamp
      }
    });

    return report;
  }

  private evaluatePerformance(responseTimeMs: number): DomainHealthReport['performance'] {
    let status: DomainHealthReport['performance']['status'] = 'healthy';

    if (responseTimeMs >= ERROR_RESPONSE_TIME_MS) {
      status = 'error';
    } else if (responseTimeMs >= WARNING_RESPONSE_TIME_MS) {
      status = 'warning';
    }

    return {
      status,
      responseTimeMs: Math.round(responseTimeMs)
    };
  }

  private async checkHttpConnectivity(
    domain: string,
    timeoutMs: number
  ): Promise<HealthComponentStatus<{ statusCode?: number; responseTimeMs?: number; error?: string }>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const start = performance.now();
      const response = await fetch(`https://${domain}`, {
        method: 'GET',
        signal: controller.signal
      });
      const duration = performance.now() - start;
      clearTimeout(timeout);

      const statusCode = response.status;
      if (statusCode >= 500) {
        return {
          status: 'error',
          details: { statusCode, responseTimeMs: duration, error: 'Server returned 5xx response' }
        };
      }

      if (statusCode >= 400) {
        return {
          status: 'warning',
          details: { statusCode, responseTimeMs: duration, error: 'Client error response detected' }
        };
      }

      return {
        status: 'healthy',
        details: { statusCode, responseTimeMs: duration }
      };
    } catch (error: any) {
      clearTimeout(timeout);
      const message = error?.name === 'AbortError'
        ? 'Request timed out'
        : (error?.message ?? 'HTTP connection failed');

      return {
        status: error?.name === 'AbortError' ? 'warning' : 'error',
        details: { error: message }
      };
    }
  }

  private async evaluateSslState(
    domain: DomainMappingRecord
  ): Promise<HealthComponentStatus<{ expiresAt?: Date; issuer?: string; daysUntilExpiry?: number }>> {
    const certificateInfo = await this.registry.getManagedCertificate(domain.domain);
    const expiresAt = certificateInfo.expiresAt ?? domain.sslExpiresAt ?? domain.certificateExpiry;

    if (!certificateInfo.exists && !expiresAt) {
      return {
        status: 'warning',
        details: {
          issuer: certificateInfo.issuer,
          expiresAt: undefined,
          daysUntilExpiry: undefined
        }
      };
    }

    if (!expiresAt) {
      return {
        status: 'warning',
        details: {
          issuer: certificateInfo.issuer,
          expiresAt: undefined,
          daysUntilExpiry: undefined
        }
      };
    }

    const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysUntilExpiry < 0) {
      return {
        status: 'error',
        details: {
          expiresAt,
          issuer: certificateInfo.issuer,
          daysUntilExpiry
        }
      };
    }

    if (daysUntilExpiry <= 14) {
      return {
        status: 'warning',
        details: {
          expiresAt,
          issuer: certificateInfo.issuer,
          daysUntilExpiry
        }
      };
    }

    return {
      status: 'healthy',
      details: {
        expiresAt,
        issuer: certificateInfo.issuer,
        daysUntilExpiry
      }
    };
  }

  private mapComponentStatusToDomainStatus(
    status: HealthComponentStatus['status']
  ): DomainMappingRecord['dnsStatus'] {
    switch (status) {
      case 'healthy':
        return 'verified';
      case 'warning':
        return 'pending';
      default:
        return 'error';
    }
  }

  private mapSslStatus(
    status: HealthComponentStatus['status']
  ): DomainMappingRecord['sslStatus'] {
    switch (status) {
      case 'healthy':
        return 'active';
      case 'warning':
        return 'expiring_soon';
      default:
        return 'error';
    }
  }

  private async ensureDomain(businessId: string, domainId: string): Promise<DomainMappingRecord> {
    const domain = await this.registry.getDomainById(businessId, domainId);
    if (!domain) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }
    return domain;
  }
}

export const domainHealthService = new DomainHealthService();
