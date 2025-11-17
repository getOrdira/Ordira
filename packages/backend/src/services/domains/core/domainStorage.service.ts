import type { FilterQuery, LeanDocument, UpdateQuery } from 'mongoose';

import { createAppError } from '../../../middleware/core/error.middleware';
import { DomainMapping, IDomainMapping } from '../../../models/infrastructure/domainMapping.model';
import { logger } from '../../../utils/logger';

export type DomainMappingRecord = LeanDocument<IDomainMapping>;

export interface CreateDomainMappingInput {
  businessId: string;
  domain: string;
  certificateType?: 'letsencrypt' | 'custom';
  forceHttps?: boolean;
  autoRenewal?: boolean;
  planLevel?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  createdBy: string;
  verificationMethod?: 'dns' | 'file' | 'email';
  dnsRecords?: IDomainMapping['dnsRecords'];
  metadata?: IDomainMapping['mappingMetadata'];
}

export interface UpdateDomainMappingInput {
  forceHttps?: boolean;
  autoRenewal?: boolean;
  certificateType?: 'letsencrypt' | 'custom';
  verificationMethod?: 'dns' | 'file' | 'email';
  dnsRecords?: IDomainMapping['dnsRecords'];
  metadata?: IDomainMapping['mappingMetadata'];
  status?: IDomainMapping['status'];
  updatedBy?: string;
  customCertificate?: IDomainMapping['customCertificate'];
}

export interface ManagedCertificatePersistence {
  businessId: string;
  domainId: string;
  certificateType: 'letsencrypt' | 'custom';
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  serialNumber?: string;
  renewedBy?: string;
  sslStatus?: IDomainMapping['sslStatus'];
  autoRenewal?: boolean;
}

export interface DomainQuery {
  businessId: string;
  domainId?: string;
  domain?: string;
}

export interface VerificationStateUpdate {
  verificationToken?: string | null;
  verificationMethod?: IDomainMapping['verificationMethod'];
  isVerified?: boolean;
  verifiedBy?: string;
}

export interface DnsStatusUpdate {
  status: IDomainMapping['dnsStatus'];
  records?: IDomainMapping['dnsRecords'];
  changedBy?: string;
}

export interface HealthMetricsUpdate {
  healthStatus: IDomainMapping['healthStatus'];
  lastHealthCheck: Date;
  dnsStatus?: IDomainMapping['dnsStatus'];
  sslStatus?: IDomainMapping['sslStatus'];
  responseTime?: number;
  uptimePercentage?: number;
  lastDowntime?: Date;
  performanceMetrics?: IDomainMapping['performanceMetrics'];
}

export interface AnalyticsUpdate {
  requestCount?: number;
  lastAccessedAt?: Date;
  analyticsData?: IDomainMapping['analyticsData'];
}

/**
 * Low-level data access service for DomainMapping persistence.
 */
export class DomainStorageService {
  /**
   * Create a new domain mapping record.
   */
  async createDomainMapping(input: CreateDomainMappingInput): Promise<DomainMappingRecord> {
    const doc = await DomainMapping.create({
      business: input.businessId,
      domain: input.domain,
      hostname: input.domain,
      certificateType: input.certificateType ?? 'letsencrypt',
      forceHttps: input.forceHttps ?? true,
      autoRenewal: input.autoRenewal ?? true,
      planLevel: input.planLevel ?? 'foundation',
      createdBy: input.createdBy,
      verificationMethod: input.verificationMethod ?? 'dns',
      dnsRecords: input.dnsRecords,
      mappingMetadata: input.metadata
    });

    logger.info('Domain mapping created', {
      domainId: doc._id.toString(),
      businessId: input.businessId,
      domain: input.domain
    });

    return doc.toObject();
  }

  /**
   * Retrieve a domain mapping by business + domain id.
   */
  async getDomainById(businessId: string, domainId: string): Promise<DomainMappingRecord | null> {
    return DomainMapping.findOne({ _id: domainId, business: businessId })
      .select('+verificationToken')
      .lean();
  }

  /**
   * Retrieve a domain mapping by business + domain name.
   */
  async getDomainByDomain(businessId: string, domain: string): Promise<DomainMappingRecord | null> {
    return DomainMapping.findOne({ domain, business: businessId })
      .select('+verificationToken')
      .lean();
  }

  /**
   * Retrieve a domain mapping by id (regardless of business ownership).
   */
  async getDomainByObjectId(domainId: string): Promise<DomainMappingRecord | null> {
    return DomainMapping.findById(domainId)
      .select('+verificationToken')
      .lean();
  }

  /**
   * Retrieve a domain mapping regardless of business ownership.
   */
  async findDomain(domain: string): Promise<DomainMappingRecord | null> {
    return DomainMapping.findOne({ domain })
      .select('+verificationToken')
      .lean();
  }

  /**
   * Update an existing domain mapping with the supplied changes.
   */
  async updateDomainMapping(
    businessId: string,
    domainId: string,
    updates: UpdateDomainMappingInput
  ): Promise<DomainMappingRecord> {
    const updatePayload: UpdateQuery<IDomainMapping> = {
      updatedAt: new Date()
    };

    if (typeof updates.forceHttps === 'boolean') {
      updatePayload.forceHttps = updates.forceHttps;
    }
    if (typeof updates.autoRenewal === 'boolean') {
      updatePayload.autoRenewal = updates.autoRenewal;
    }
    if (updates.certificateType) {
      updatePayload.certificateType = updates.certificateType;
    }
    if (updates.verificationMethod) {
      updatePayload.verificationMethod = updates.verificationMethod;
    }
    if (updates.dnsRecords) {
      updatePayload.dnsRecords = updates.dnsRecords;
    }
    if (updates.metadata) {
      updatePayload.mappingMetadata = updates.metadata;
    }
    if (updates.status) {
      updatePayload.status = updates.status;
    }
    if (updates.updatedBy) {
      updatePayload.updatedBy = updates.updatedBy;
    }
    if (updates.customCertificate) {
      updatePayload.customCertificate = updates.customCertificate;
    }

    const doc = await DomainMapping.findOneAndUpdate(
      { _id: domainId, business: businessId },
      updatePayload,
      { new: true, lean: true }
    );

    if (!doc) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    return doc;
  }

  /**
   * Persist managed certificate metadata after issuance.
   */
  async recordManagedCertificate(
    payload: ManagedCertificatePersistence
  ): Promise<DomainMappingRecord> {
    const { businessId, domainId, certificateType, issuer, validFrom, validTo, serialNumber, renewedBy, sslStatus, autoRenewal } =
      payload;

    const updatePayload: UpdateQuery<IDomainMapping> = {
      certificateType,
      sslEnabled: true,
      sslStatus: sslStatus ?? 'active',
      sslExpiresAt: validTo,
      certificateExpiry: validTo,
      certificateInfo: {
        issuer,
        validFrom,
        validTo,
        serialNumber
      },
      lastCertificateRenewal: new Date(),
      autoRenewal: autoRenewal ?? true,
      ...(renewedBy ? { renewedBy } : {})
    };

    const doc = await DomainMapping.findOneAndUpdate(
      { _id: domainId, business: businessId },
      updatePayload,
      { new: true, lean: true }
    );

    if (!doc) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    logger.info('Managed certificate recorded for domain', {
      domainId,
      businessId,
      certificateType,
      expiresAt: validTo?.toISOString()
    });

    return doc;
  }

  /**
   * Remove managed certificate metadata, typically during revocation.
   */
  async clearManagedCertificate(businessId: string, domainId: string): Promise<DomainMappingRecord> {
    const updatePayload: UpdateQuery<IDomainMapping> = {
      sslEnabled: false,
      sslStatus: 'unknown',
      sslExpiresAt: undefined,
      certificateExpiry: undefined,
      certificateInfo: undefined,
      lastCertificateRenewal: undefined,
      renewedBy: undefined
    };

    const doc = await DomainMapping.findOneAndUpdate(
      { _id: domainId, business: businessId },
      updatePayload,
      { new: true, lean: true }
    );

    if (!doc) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    logger.info('Managed certificate cleared for domain', {
      domainId,
      businessId
    });

    return doc;
  }

  /**
   * Update verification-related state such as token, method, and verified flags.
   */
  async updateVerificationState(
    businessId: string,
    domainId: string,
    state: VerificationStateUpdate
  ): Promise<DomainMappingRecord> {
    const updatePayload: UpdateQuery<IDomainMapping> = {
      updatedAt: new Date()
    };

    if (typeof state.verificationToken !== 'undefined') {
      updatePayload.verificationToken = state.verificationToken || undefined;
    }
    if (state.verificationMethod) {
      updatePayload.verificationMethod = state.verificationMethod;
    }
    if (typeof state.isVerified === 'boolean') {
      updatePayload.isVerified = state.isVerified;
      updatePayload.status = state.isVerified ? 'active' : 'pending_verification';
      updatePayload.verifiedAt = state.isVerified ? new Date() : undefined;
    }
    if (state.verifiedBy) {
      updatePayload.verifiedBy = state.verifiedBy;
    }

    const doc = await DomainMapping.findOneAndUpdate(
      { _id: domainId, business: businessId },
      updatePayload,
      { new: true, lean: true }
    );

    if (!doc) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    return doc;
  }

  /**
   * Update DNS status and optionally store the latest record set.
   */
  async updateDnsStatus(
    businessId: string,
    domainId: string,
    payload: DnsStatusUpdate
  ): Promise<DomainMappingRecord> {
    const updatePayload: UpdateQuery<IDomainMapping> = {
      dnsStatus: payload.status,
      updatedAt: new Date()
    };

    if (payload.records) {
      updatePayload.dnsRecords = payload.records;
    }
    if (payload.changedBy) {
      updatePayload.updatedBy = payload.changedBy;
    }

    const doc = await DomainMapping.findOneAndUpdate(
      { _id: domainId, business: businessId },
      updatePayload,
      { new: true, lean: true }
    );

    if (!doc) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    return doc;
  }

  /**
   * Update health status and performance metrics.
   */
  async updateHealthMetrics(
    businessId: string,
    domainId: string,
    metrics: HealthMetricsUpdate
  ): Promise<DomainMappingRecord> {
    const updatePayload: UpdateQuery<IDomainMapping> = {
      healthStatus: metrics.healthStatus,
      lastHealthCheck: metrics.lastHealthCheck,
      updatedAt: new Date()
    };

    if (metrics.dnsStatus) {
      updatePayload.dnsStatus = metrics.dnsStatus;
    }
    if (metrics.sslStatus) {
      updatePayload.sslStatus = metrics.sslStatus;
    }
    if (typeof metrics.responseTime === 'number') {
      updatePayload.averageResponseTime = metrics.responseTime;
    }
    if (typeof metrics.uptimePercentage === 'number') {
      updatePayload.uptimePercentage = metrics.uptimePercentage;
    }
    if (metrics.lastDowntime) {
      updatePayload.lastDowntime = metrics.lastDowntime;
    }
    if (metrics.performanceMetrics) {
      updatePayload.performanceMetrics = metrics.performanceMetrics;
    }

    const doc = await DomainMapping.findOneAndUpdate(
      { _id: domainId, business: businessId },
      updatePayload,
      { new: true, lean: true }
    );

    if (!doc) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    return doc;
  }

  /**
   * Update aggregate analytics data points.
   */
  async updateAnalytics(
    businessId: string,
    domainId: string,
    analytics: AnalyticsUpdate
  ): Promise<DomainMappingRecord> {
    const updatePayload: UpdateQuery<IDomainMapping> = {
      updatedAt: new Date()
    };

    if (typeof analytics.requestCount === 'number') {
      updatePayload.requestCount = analytics.requestCount;
    }
    if (analytics.lastAccessedAt) {
      updatePayload.lastAccessedAt = analytics.lastAccessedAt;
    }
    if (analytics.analyticsData) {
      updatePayload.analyticsData = analytics.analyticsData;
    }

    const doc = await DomainMapping.findOneAndUpdate(
      { _id: domainId, business: businessId },
      updatePayload,
      { new: true, lean: true }
    );

    if (!doc) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    return doc;
  }

  /**
   * Count the number of domains registered for a business.
   */
  async countDomains(businessId: string): Promise<number> {
    return DomainMapping.countDocuments({ business: businessId });
  }

  /**
   * List domain mappings for a business.
   */
  async listDomains(businessId: string, filter: FilterQuery<IDomainMapping> = {}): Promise<DomainMappingRecord[]> {
    return DomainMapping.find({ business: businessId, ...filter })
      .select('+verificationToken')
      .lean();
  }

  /**
   * Count domains across all businesses (internal analytics).
   */
  async countAllDomains(filter: FilterQuery<IDomainMapping> = {}): Promise<number> {
    return DomainMapping.countDocuments(filter);
  }

  /**
   * Delete a domain mapping.
   */
  async deleteDomainMapping(businessId: string, domainId: string): Promise<boolean> {
    const result = await DomainMapping.deleteOne({ _id: domainId, business: businessId });
    return (result as { deletedCount?: number }).deletedCount === 1;
  }
}

export const domainStorageService = new DomainStorageService();

