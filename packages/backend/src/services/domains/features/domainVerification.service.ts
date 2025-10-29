import crypto from 'crypto';

import { createAppError } from '../../../middleware/error.middleware';
import { logger } from '../../../utils/logger';
import { jobQueueService } from '../../external/job-queue.service';
import { domainRegistryService } from '../core/domainRegistry.service';
import type { DomainMappingRecord } from '../core/domainStorage.service';
import { domainDnsService, DnsInstructionSet, DnsVerificationResult } from './domainDns.service';
import { domainCacheService } from '../utils/domainCache.service';

export type VerificationMethod = 'dns' | 'file' | 'email';

export interface VerificationInitiationOptions {
  method?: VerificationMethod;
  requestedBy?: string;
  autoScheduleRecheck?: boolean;
}

export interface VerificationStatus {
  domain: string;
  method: VerificationMethod;
  status: 'pending' | 'verified' | 'error';
  isVerified: boolean;
  verificationToken?: string;
  verifiedAt?: Date;
  instructions?: DnsInstructionSet | FileVerificationInstructions | EmailVerificationInstructions;
}

export interface VerificationResult extends DnsVerificationResult {
  method: VerificationMethod;
}

export interface FileVerificationInstructions {
  method: 'file';
  fileName: string;
  fileContents: string;
  uploadPath: string;
  guidance: string[];
}

export interface EmailVerificationInstructions {
  method: 'email';
  email: string;
  guidance: string[];
}

const VERIFICATION_RECHECK_JOB = 'domains:verification:recheck';

export class DomainVerificationService {
  constructor(
    private readonly registry = domainRegistryService
  ) {}

  /**
   * Begin verification for a domain mapping.
   */
  async initiateVerification(
    businessId: string,
    domainId: string,
    options: VerificationInitiationOptions = {}
  ): Promise<VerificationStatus> {
    const method: VerificationMethod = options.method ?? 'dns';
    const domain = await this.ensureDomain(businessId, domainId);
    const verificationToken = method === 'dns' ? this.generateToken() : undefined;

    await this.registry.updateVerificationState(businessId, domainId, {
      verificationMethod: method,
      verificationToken: verificationToken ?? null,
      isVerified: false,
      verifiedBy: undefined
    });

    let instructions: VerificationStatus['instructions'];
    switch (method) {
      case 'dns': {
        const instructionSet = domainDnsService.generateInstructionSet(domain, verificationToken);
        await this.registry.updateDnsStatus(businessId, domainId, {
          status: 'pending',
          records: instructionSet.records,
          changedBy: options.requestedBy
        });
        instructions = instructionSet;
        break;
      }
      case 'file':
        instructions = this.buildFileInstructions(domain);
        break;
      case 'email':
        instructions = this.buildEmailInstructions(domain);
        break;
      default:
        throw createAppError(`Unsupported verification method: ${method}`, 400, 'INVALID_VERIFICATION_METHOD');
    }

    if (options.autoScheduleRecheck && method === 'dns') {
      await this.scheduleRecheckJob({
        businessId,
        domainId,
        method
      });
    }

    logger.info('Domain verification initiated', {
      businessId,
      domainId,
      domain: domain.domain,
      method
    });

    return {
      domain: domain.domain,
      method,
      status: 'pending',
      isVerified: false,
      verificationToken,
      instructions
    };
  }

  /**
   * Attempt to verify a domain. For DNS verification this performs live DNS lookups.
   */
  async verifyDomain(
    businessId: string,
    domainId: string,
    requestedBy?: string
  ): Promise<VerificationResult> {
    const domain = await this.ensureDomain(businessId, domainId);
    const method = (domain.verificationMethod ?? 'dns') as VerificationMethod;

    if (method === 'dns') {
      const result = await domainDnsService.verifyDnsConfiguration(businessId, domainId);
      if (result.verified) {
        await this.markVerified(businessId, domainId, requestedBy);
        await domainCacheService.cacheDomain(domain.domain, businessId);
      }
      return {
        ...result,
        method
      };
    }

    if (method === 'file') {
      throw createAppError('File-based verification requires manual confirmation', 409, 'MANUAL_VERIFICATION_REQUIRED');
    }

    if (method === 'email') {
      throw createAppError('Email verification is not automated yet', 409, 'MANUAL_VERIFICATION_REQUIRED');
    }

    throw createAppError(`Unsupported verification method: ${method}`, 400, 'INVALID_VERIFICATION_METHOD');
  }

  /**
   * Mark a domain as verified without checking DNS (used after manual confirmation).
   */
  async markVerified(businessId: string, domainId: string, verifiedBy?: string): Promise<void> {
    const domain = await this.ensureDomain(businessId, domainId);

    await this.registry.updateVerificationState(businessId, domainId, {
      isVerified: true,
      verificationToken: null,
      verifiedBy
    });

    await domainCacheService.cacheDomain(domain.domain, businessId);

    logger.info('Domain marked as verified', {
      businessId,
      domainId,
      domain: domain.domain
    });
  }

  /**
   * Retrieve verification status with guidance.
   */
  async getVerificationStatus(businessId: string, domainId: string): Promise<VerificationStatus> {
    const domain = await this.ensureDomain(businessId, domainId);
    const method = (domain.verificationMethod ?? 'dns') as VerificationMethod;
    const instructions = this.resolveInstructions(domain, method);

    return {
      domain: domain.domain,
      method,
      status: domain.isVerified ? 'verified' : (domain.status as VerificationStatus['status']),
      isVerified: Boolean(domain.isVerified),
      verificationToken: domain.verificationToken ?? undefined,
      verifiedAt: domain.verifiedAt ?? undefined,
      instructions
    };
  }

  /**
   * Schedule a background DNS re-check job.
   */
  async scheduleRecheckJob(payload: { businessId: string; domainId: string; method: VerificationMethod }): Promise<void> {
    try {
      await jobQueueService.addJob({
        type: VERIFICATION_RECHECK_JOB,
        payload,
        businessId: payload.businessId,
        priority: 1,
        delay: 5 * 60 * 1000 // 5 minutes
      });
    } catch (error) {
      logger.warn('Failed to schedule domain verification recheck', {
        domainId: payload.domainId,
        error: (error as Error).message
      });
    }
  }

  private resolveInstructions(domain: DomainMappingRecord, method: VerificationMethod) {
    if (method === 'dns') {
      return domainDnsService.generateInstructionSet(domain, domain.verificationToken ?? undefined);
    }
    if (method === 'file') {
      return this.buildFileInstructions(domain);
    }
    if (method === 'email') {
      return this.buildEmailInstructions(domain);
    }
    return undefined;
  }

  private buildFileInstructions(domain: DomainMappingRecord): FileVerificationInstructions {
    const token = this.generateToken();
    const fileName = 'ordira-verification.txt';
    const fileContents = `Ordira domain verification for ${domain.domain}\nToken: ${token}\n`;

    return {
      method: 'file',
      fileName,
      fileContents,
      uploadPath: `https://${domain.domain}/.well-known/${fileName}`,
      guidance: [
        `Upload the file above to the root of ${domain.domain}`,
        'Ensure the file is publicly accessible over HTTPS',
        'Once uploaded, click "Verify" from the dashboard'
      ]
    };
  }

  private buildEmailInstructions(domain: DomainMappingRecord): EmailVerificationInstructions {
    const email = `admin@${domain.domain.replace(/^[^.]*/, 'domain-admin')}`;
    return {
      method: 'email',
      email,
      guidance: [
        `An email will be sent to ${email} with a verification link.`,
        'Click the link within 24 hours to complete verification.',
        'If you need to use a different email, contact support.'
      ]
    };
  }

  private async ensureDomain(businessId: string, domainId: string): Promise<DomainMappingRecord> {
    const domain = await this.registry.getDomainById(businessId, domainId);
    if (!domain) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }
    return domain;
  }

  private generateToken(): string {
    return crypto.randomBytes(24).toString('hex');
  }
}

export const domainVerificationService = new DomainVerificationService();
