import { createAppError } from '../../../middleware/error.middleware';
import { logger } from '../../../utils/logger';
import { jobQueueService } from '../../external/job-queue.service';
import { domainRegistryService } from '../core/domainRegistry.service';
import type { DomainMappingRecord } from '../core/domainStorage.service';

export interface CertificateLifecycleResult {
  domain: DomainMappingRecord;
  certificate: {
    expiresAt?: Date;
    issuer?: string;
    serialNumber?: string;
    validFrom?: Date;
  };
}

export interface AutoRenewalSchedule {
  jobId: string;
  scheduledFor: Date;
}

const CERTIFICATE_RENEWAL_JOB = 'domains:certificate:auto-renew';

export class DomainCertificateLifecycleService {
  constructor(
    private readonly registry = domainRegistryService
  ) {}

  /**
   * Issue a managed certificate for a verified domain.
   */
  async issueManagedCertificate(
    businessId: string,
    domainId: string,
    requestedBy?: string
  ): Promise<CertificateLifecycleResult> {
    const mapping = await this.ensureDomain(businessId, domainId);
    this.ensureDomainEligible(mapping);

    const result = await this.registry.issueManagedCertificate(businessId, domainId, requestedBy);
    logger.info('Managed certificate issued', {
      businessId,
      domainId,
      domain: mapping.domain,
      expiresAt: result.certificate.expiresAt?.toISOString()
    });

    return {
      domain: result.domain,
      certificate: {
        expiresAt: result.certificate.expiresAt,
        issuer: result.certificate.issuer,
        serialNumber: result.certificate.serialNumber,
        validFrom: result.certificate.validFrom
      }
    };
  }

  /**
   * Renew an existing managed certificate.
   */
  async renewManagedCertificate(
    businessId: string,
    domainId: string,
    requestedBy?: string
  ): Promise<CertificateLifecycleResult> {
    const mapping = await this.ensureDomain(businessId, domainId);
    this.ensureDomainEligible(mapping);

    const result = await this.registry.renewManagedCertificate(businessId, domainId, requestedBy);
    logger.info('Managed certificate renewed', {
      businessId,
      domainId,
      domain: mapping.domain,
      expiresAt: result.certificate.expiresAt?.toISOString()
    });

    return {
      domain: result.domain,
      certificate: {
        expiresAt: result.certificate.expiresAt,
        issuer: result.certificate.issuer,
        serialNumber: result.certificate.serialNumber,
        validFrom: result.certificate.validFrom
      }
    };
  }

  /**
   * Revoke an existing managed certificate.
   */
  async revokeManagedCertificate(businessId: string, domainId: string): Promise<DomainMappingRecord> {
    const mapping = await this.ensureDomain(businessId, domainId);
    const updated = await this.registry.revokeManagedCertificate(businessId, domainId);

    logger.warn('Managed certificate revoked', {
      businessId,
      domainId,
      domain: mapping.domain
    });

    return updated;
  }

  /**
   * Schedule an auto-renewal job prior to certificate expiration.
   */
  async scheduleAutoRenewal(
    businessId: string,
    domainId: string,
    daysBeforeExpiry: number = 20
  ): Promise<AutoRenewalSchedule | null> {
    const mapping = await this.ensureDomain(businessId, domainId);
    const expiresAt = mapping.sslExpiresAt ?? mapping.certificateExpiry;

    if (!expiresAt) {
      logger.warn('No expiration date available for certificate auto-renewal', {
        businessId,
        domainId
      });
      return null;
    }

    const scheduleDate = this.calculateScheduleDate(expiresAt, daysBeforeExpiry);
    if (scheduleDate.getTime() <= Date.now()) {
      logger.info('Certificate expires soon, triggering immediate renewal job', {
        businessId,
        domainId,
        expiresAt: expiresAt.toISOString()
      });
      await jobQueueService.addJob({
        type: CERTIFICATE_RENEWAL_JOB,
        businessId,
        payload: { businessId, domainId },
        priority: 1
      });
      return null;
    }

    const jobId = await jobQueueService.addJob({
      type: CERTIFICATE_RENEWAL_JOB,
      businessId,
      payload: { businessId, domainId },
      delay: scheduleDate.getTime() - Date.now(),
      priority: 1
    });

    return {
      jobId,
      scheduledFor: scheduleDate
    };
  }

  /**
   * Provide a summary of the current certificate state for a domain.
   */
  async getCertificateSummary(businessId: string, domainId: string): Promise<{
    certificateType: DomainMappingRecord['certificateType'];
    expiresInDays?: number;
    expiresAt?: Date;
    autoRenewal: boolean;
    status: DomainMappingRecord['sslStatus'];
  }> {
    const mapping = await this.ensureDomain(businessId, domainId);
    const expiresAt = mapping.sslExpiresAt ?? mapping.certificateExpiry;

    return {
      certificateType: mapping.certificateType ?? 'letsencrypt',
      expiresAt: expiresAt ?? undefined,
      expiresInDays: expiresAt ? this.calculateDaysUntil(expiresAt) : undefined,
      autoRenewal: mapping.autoRenewal ?? true,
      status: mapping.sslStatus ?? 'unknown'
    };
  }

  private ensureDomainEligible(domain: DomainMappingRecord): void {
    if (!domain.isVerified) {
      throw createAppError(
        'Domain must be verified before requesting a managed certificate',
        409,
        'DOMAIN_NOT_VERIFIED'
      );
    }

    if (domain.dnsStatus && domain.dnsStatus !== 'verified') {
      throw createAppError(
        'DNS configuration must be verified before requesting a managed certificate',
        409,
        'DNS_NOT_VERIFIED'
      );
    }
  }

  private async ensureDomain(businessId: string, domainId: string): Promise<DomainMappingRecord> {
    const domain = await this.registry.getDomainById(businessId, domainId);
    if (!domain) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }
    return domain;
  }

  private calculateScheduleDate(expiresAt: Date, daysBeforeExpiry: number): Date {
    const scheduleMs = expiresAt.getTime() - daysBeforeExpiry * 24 * 60 * 60 * 1000;
    return new Date(scheduleMs);
  }

  private calculateDaysUntil(expiresAt: Date): number {
    const diffMs = expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  }
}

export const domainCertificateLifecycleService = new DomainCertificateLifecycleService();
