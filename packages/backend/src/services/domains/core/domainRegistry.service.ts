import { createAppError } from '../../../middleware/error.middleware';
import type { DomainMappingRecord } from './domainStorage.service';
import {
  CreateDomainMappingInput,
  domainStorageService,
  UpdateDomainMappingInput,
  VerificationStateUpdate,
  DnsStatusUpdate,
  HealthMetricsUpdate,
  AnalyticsUpdate
} from './domainStorage.service';
import {
  certificateProvisionerService,
  CertificateDetails
} from './certificateProvisioner.service';

export interface RegisterDomainOptions extends Omit<CreateDomainMappingInput, 'domain'> {
  domain: string;
}

export interface ManagedCertificateResult {
  domain: DomainMappingRecord;
  certificate: CertificateDetails;
}

/**
 * Core registry orchestrating domain lifecycle actions (creation, certificate management, lookups).
 */
export class DomainRegistryService {
  constructor(
    private readonly storage = domainStorageService,
    private readonly certificateProvisioner = certificateProvisionerService
  ) {}

  /**
   * Register a new domain for a business.
   */
  async registerDomain(options: RegisterDomainOptions): Promise<DomainMappingRecord> {
    const normalizedDomain = this.normalizeDomain(options.domain);

    const existing = await this.storage.findDomain(normalizedDomain);
    if (existing && existing.business?.toString() !== options.businessId) {
      throw createAppError(
        'Domain is already mapped to another account',
        409,
        'DOMAIN_ALREADY_MAPPED'
      );
    }

    if (existing && existing.business?.toString() === options.businessId) {
      throw createAppError(
        'Domain is already registered to this business',
        409,
        'DOMAIN_ALREADY_EXISTS'
      );
    }

    return this.storage.createDomainMapping({
      ...options,
      domain: normalizedDomain
    });
  }

  /**
   * Issue a managed (Let's Encrypt) certificate and persist metadata.
   */
  async issueManagedCertificate(
    businessId: string,
    domainId: string,
    requestedBy?: string
  ): Promise<ManagedCertificateResult> {
    const domain = await this.storage.getDomainById(businessId, domainId);

    if (!domain) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    const certificate = await this.certificateProvisioner.provisionCertificate(domain.domain);

    const updatedDomain = await this.storage.recordManagedCertificate({
      businessId,
      domainId,
      certificateType: 'letsencrypt',
      issuer: certificate.issuer,
      validFrom: certificate.validFrom,
      validTo: certificate.expiresAt,
      serialNumber: certificate.serialNumber,
      renewedBy: requestedBy,
      sslStatus: 'active'
    });

    return {
      domain: updatedDomain,
      certificate
    };
  }

  /**
   * Renew a managed certificate (re-provisions a new certificate).
   */
  async renewManagedCertificate(
    businessId: string,
    domainId: string,
    requestedBy?: string
  ): Promise<ManagedCertificateResult> {
    const domain = await this.storage.getDomainById(businessId, domainId);

    if (!domain) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    const certificate = await this.certificateProvisioner.renewCertificate(domain.domain);
    const updatedDomain = await this.storage.recordManagedCertificate({
      businessId,
      domainId,
      certificateType: 'letsencrypt',
      issuer: certificate.issuer,
      validFrom: certificate.validFrom,
      validTo: certificate.expiresAt,
      serialNumber: certificate.serialNumber,
      renewedBy: requestedBy,
      sslStatus: 'active'
    });

    return {
      domain: updatedDomain,
      certificate
    };
  }

  /**
   * Revoke a managed certificate and clear stored metadata.
   */
  async revokeManagedCertificate(businessId: string, domainId: string): Promise<DomainMappingRecord> {
    const domain = await this.storage.getDomainById(businessId, domainId);

    if (!domain) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    await this.certificateProvisioner.revokeCertificate(domain.domain);
    return this.storage.clearManagedCertificate(businessId, domainId);
  }

  /**
   * Fetch current certificate info from disk.
   */
  async getManagedCertificate(hostname: string) {
    return this.certificateProvisioner.getCertificateInfo(hostname);
  }

  /**
   * Expose raw domain lookup helpers.
   */
  async getDomainById(businessId: string, domainId: string): Promise<DomainMappingRecord | null> {
    return this.storage.getDomainById(businessId, domainId);
  }

  async getDomainByDomain(businessId: string, domain: string): Promise<DomainMappingRecord | null> {
    return this.storage.getDomainByDomain(businessId, this.normalizeDomain(domain));
  }

  async findDomain(domain: string): Promise<DomainMappingRecord | null> {
    return this.storage.findDomain(this.normalizeDomain(domain));
  }

  async getDomainByObjectId(domainId: string): Promise<DomainMappingRecord | null> {
    return this.storage.getDomainByObjectId(domainId);
  }

  async listDomains(businessId: string): Promise<DomainMappingRecord[]> {
    return this.storage.listDomains(businessId);
  }

  async countDomains(businessId: string): Promise<number> {
    return this.storage.countDomains(businessId);
  }

  async deleteDomain(businessId: string, domainId: string): Promise<boolean> {
    return this.storage.deleteDomainMapping(businessId, domainId);
  }

  async countAllDomains(filter: Record<string, unknown> = {}): Promise<number> {
    return this.storage.countAllDomains(filter as any);
  }

  async updateDomainConfiguration(
    businessId: string,
    domainId: string,
    updates: UpdateDomainMappingInput
  ): Promise<DomainMappingRecord> {
    return this.storage.updateDomainMapping(businessId, domainId, updates);
  }

  async updateVerificationState(
    businessId: string,
    domainId: string,
    state: VerificationStateUpdate
  ): Promise<DomainMappingRecord> {
    return this.storage.updateVerificationState(businessId, domainId, state);
  }

  async updateDnsStatus(
    businessId: string,
    domainId: string,
    payload: DnsStatusUpdate
  ): Promise<DomainMappingRecord> {
    return this.storage.updateDnsStatus(businessId, domainId, payload);
  }

  async updateHealthMetrics(
    businessId: string,
    domainId: string,
    metrics: HealthMetricsUpdate
  ): Promise<DomainMappingRecord> {
    return this.storage.updateHealthMetrics(businessId, domainId, metrics);
  }

  async updateAnalytics(
    businessId: string,
    domainId: string,
    analytics: AnalyticsUpdate
  ): Promise<DomainMappingRecord> {
    return this.storage.updateAnalytics(businessId, domainId, analytics);
  }

  private normalizeDomain(domain: string): string {
    const trimmed = domain.trim().toLowerCase();

    if (!trimmed) {
      throw createAppError('Domain is required', 400, 'MISSING_DOMAIN');
    }

    return trimmed;
  }
}

export const domainRegistryService = new DomainRegistryService();
