import dns from 'dns/promises';

import { createAppError } from '../../../middleware/core/error.middleware';
import { logger } from '../../../utils/logger';
import { domainRegistryService } from '../core/domainRegistry.service';
import type { DomainMappingRecord } from '../core/domainStorage.service';

export type SupportedDnsRecordType = 'CNAME' | 'TXT';

export interface DnsRecordInstruction {
  type: SupportedDnsRecordType;
  name: string;
  value: string;
  ttl: number;
  required: boolean;
  description?: string;
}

export interface DnsInstructionSet {
  domain: string;
  records: DnsRecordInstruction[];
  propagationSeconds: number;
  guidance: string[];
}

export interface DnsVerificationOptions {
  skipTxtValidation?: boolean;
  tokenOverride?: string;
}

export interface DnsVerificationResult {
  status: 'verified' | 'pending' | 'error';
  verified: boolean;
  issues: string[];
  checkedAt: Date;
  propagationSeconds?: number;
  records: DnsRecordInstruction[];
}

const DEFAULT_TTL = 300;
const DEFAULT_PROPAGATION_SECONDS = 900;

export class DomainDnsService {
  constructor(
    private readonly registry = domainRegistryService
  ) {}

  /**
   * Build the canonical DNS records required for a domain mapping.
   */
  generateInstructionSet(domain: DomainMappingRecord, verificationToken?: string | null): DnsInstructionSet {
    const records = this.buildRecords(domain, verificationToken ?? domain.verificationToken);

    return {
      domain: domain.domain,
      records,
      propagationSeconds: DEFAULT_PROPAGATION_SECONDS,
      guidance: [
        'Add the DNS records above with your domain provider.',
        'DNS propagation can take up to 15 minutes depending on the TTL settings.',
        'Use an external DNS lookup tool to confirm record availability before retrying verification.'
      ]
    };
  }

  /**
   * Convenience helper to fetch and build DNS instructions for a domain the business owns.
   */
  async getInstructionSet(businessId: string, domainId: string): Promise<DnsInstructionSet> {
    const domain = await this.registry.getDomainById(businessId, domainId);
    if (!domain) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    return this.generateInstructionSet(domain);
  }

  /**
   * Validate DNS configuration and update the mapping status accordingly.
   */
  async verifyDnsConfiguration(
    businessId: string,
    domainId: string,
    options: DnsVerificationOptions = {}
  ): Promise<DnsVerificationResult> {
    const domain = await this.registry.getDomainById(businessId, domainId);
    if (!domain) {
      throw createAppError('Domain mapping not found', 404, 'DOMAIN_NOT_FOUND');
    }

    const token = options.tokenOverride ?? domain.verificationToken ?? undefined;
    const evaluation = await this.evaluateDomainRecords(domain.domain, token, {
      skipTxtValidation: options.skipTxtValidation
    });

    const records = this.buildRecords(domain, token);
    await this.registry.updateDnsStatus(businessId, domainId, {
      status: evaluation.status === 'verified' ? 'verified' : evaluation.status === 'pending' ? 'pending' : 'error',
      records
    });

    return {
      ...evaluation,
      records
    };
  }

  /**
   * Evaluate DNS records without mutating persistence.
   */
  async evaluateDomainRecords(
    hostname: string,
    token?: string,
    options: DnsVerificationOptions = {}
  ): Promise<Omit<DnsVerificationResult, 'records'>> {
    const cnameTarget = this.getExpectedCnameTarget();
    const issues: string[] = [];
    let cnameVerified = false;
    let txtVerified = options.skipTxtValidation || !token;
    let pending = false;

    try {
      const cnameRecords = await dns.resolveCname(hostname);
      if (cnameRecords.some(record => this.normalizeHostname(record) === this.normalizeHostname(cnameTarget))) {
        cnameVerified = true;
      } else if (cnameRecords.length === 0) {
        issues.push('CNAME record has not propagated yet');
        pending = true;
      } else {
        issues.push(`CNAME points to ${cnameRecords.join(', ')} instead of ${cnameTarget}`);
      }
    } catch (error: any) {
      const message = typeof error?.code === 'string' && ['ENOTFOUND', 'ESERVFAIL'].includes(error.code)
        ? 'CNAME record not found'
        : error?.message || 'Failed to resolve CNAME record';
      issues.push(message);
      pending = error?.code === 'ENOTFOUND';
    }

    if (token && !options.skipTxtValidation) {
      try {
        const txtRecords = await dns.resolveTxt(`_acme-challenge.${hostname}`);
        const flattened = txtRecords.map(record => record.join(''));
        if (flattened.includes(token)) {
          txtVerified = true;
        } else if (flattened.length === 0) {
          issues.push('Verification TXT record not found yet');
          pending = true;
        } else {
          issues.push('Verification TXT record does not match expected token');
        }
      } catch (error: any) {
        const message = typeof error?.code === 'string' && error.code === 'ENOTFOUND'
          ? 'Verification TXT record not found yet'
          : error?.message || 'Failed to resolve TXT verification record';
        issues.push(message);
        pending = error?.code === 'ENOTFOUND';
      }
    }

    const verified = cnameVerified && txtVerified;
    const status: DnsVerificationResult['status'] = verified
      ? 'verified'
      : pending
        ? 'pending'
        : 'error';

    if (verified) {
      logger.info('DNS verification succeeded', { hostname });
    } else {
      logger.debug('DNS verification incomplete', { hostname, issues, pending });
    }

    return {
      status,
      verified,
      issues: verified ? [] : issues,
      checkedAt: new Date(),
      propagationSeconds: DEFAULT_PROPAGATION_SECONDS
    };
  }

  /**
   * Construct required DNS records for the domain.
   */
  private buildRecords(domain: DomainMappingRecord, token?: string): DnsRecordInstruction[] {
    const cnameTarget = this.getExpectedCnameTarget();
    const records: DnsRecordInstruction[] = [
      {
        type: 'CNAME',
        name: domain.domain,
        value: cnameTarget,
        ttl: DEFAULT_TTL,
        required: true,
        description: `Points traffic to Ordira edge (${cnameTarget})`
      }
    ];

    if (token) {
      records.push({
        type: 'TXT',
        name: `_acme-challenge.${domain.domain}`,
        value: token,
        ttl: DEFAULT_TTL,
        required: true,
        description: 'Used for Let’s Encrypt DNS-01 verification'
      });
    }

    return records;
  }

  private getExpectedCnameTarget(): string {
    const envTarget = process.env.FRONTEND_HOSTNAME;
    if (envTarget && envTarget.trim().length > 0) {
      return envTarget.trim().toLowerCase();
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl) {
      try {
        const parsed = new URL(frontendUrl);
        if (parsed.hostname) {
          return parsed.hostname.toLowerCase();
        }
      } catch (error) {
        logger.warn('Unable to derive hostname from FRONTEND_URL', {
          url: frontendUrl,
          error: (error as Error).message
        });
      }
    }

    return 'app.ordira.com';
  }

  private normalizeHostname(hostname: string): string {
    return hostname.trim().replace(/\.$/, '').toLowerCase();
  }
}

export const domainDnsService = new DomainDnsService();
