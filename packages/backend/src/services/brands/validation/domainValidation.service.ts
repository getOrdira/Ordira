// src/services/brands/validation/domain-validation.service.ts
import { BrandSettings } from '../../../models/brandSettings.model';
import { logger } from '../../../utils/logger';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve);

export interface DomainValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
}

export interface SubdomainValidationResult extends DomainValidationResult {
  available: boolean;
  reserved?: boolean;
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
}

export interface DomainVerificationResult {
  verified: boolean;
  requiredRecords?: DnsRecord[];
  observedRecords?: DnsRecord[];
  checkedAt: Date;
  reason?: string;
}

export interface CustomDomainSetup {
  domain: string;
  cnameTarget: string;
  requiredRecords: DnsRecord[];
  sslEnabled: boolean;
  verificationToken: string;
}

export class DomainValidationService {
  private readonly reservedSubdomains = [
    'www', 'api', 'admin', 'support', 'help', 'mail', 'ftp', 'blog',
    'news', 'shop', 'store', 'app', 'mobile', 'dev', 'test', 'staging',
    'prod', 'production', 'cdn', 'assets', 'static', 'media', 'images',
    'js', 'css', 'files', 'docs', 'documentation', 'status', 'about',
    'contact', 'privacy', 'terms', 'legal', 'security', 'team', 'careers'
  ];

  private readonly bannedDomains = [
    'example.com', 'test.com', 'localhost', '127.0.0.1', 'temp.com'
  ];

  /**
   * Validate custom domain format and availability
   */
  async validateCustomDomain(domain: string, excludeBusinessId?: string): Promise<DomainValidationResult> {
    try {
      // Sanitize input
      const cleanDomain = domain.toLowerCase().trim();

      // Basic format validation
      const formatValidation = this.validateDomainFormat(cleanDomain);
      if (!formatValidation.valid) {
        return formatValidation;
      }

      // Check if domain is banned
      if (this.isBannedDomain(cleanDomain)) {
        return {
          valid: false,
          error: 'This domain is not allowed'
        };
      }

      // Check if domain is already in use
      const availabilityCheck = await this.checkDomainAvailability(cleanDomain, excludeBusinessId);
      if (!availabilityCheck.valid) {
        return availabilityCheck;
      }

      // Perform DNS validation (optional, for better UX)
      const dnsValidation = await this.validateDomainDns(cleanDomain);

      return {
        valid: true,
        warnings: dnsValidation.warnings,
        suggestions: dnsValidation.suggestions
      };
    } catch (error: any) {
      logger.error('Custom domain validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate domain. Please try again.'
      };
    }
  }

  /**
   * Validate subdomain format and availability
   */
  async validateSubdomain(subdomain: string, excludeBusinessId?: string): Promise<SubdomainValidationResult> {
    try {
      // Sanitize input
      const cleanSubdomain = subdomain.toLowerCase().trim();

      // Basic format validation
      const formatValidation = this.validateSubdomainFormat(cleanSubdomain);
      if (!formatValidation.valid) {
        return {
          ...formatValidation,
          available: false
        };
      }

      // Check if subdomain is reserved
      if (this.isReservedSubdomain(cleanSubdomain)) {
        return {
          valid: false,
          available: false,
          reserved: true,
          error: 'This subdomain is reserved',
          suggestions: this.generateSubdomainSuggestions(cleanSubdomain)
        };
      }

      // Check availability
      const available = await this.isSubdomainAvailable(cleanSubdomain, excludeBusinessId);

      return {
        valid: available,
        available,
        error: available ? undefined : 'This subdomain is already taken',
        suggestions: available ? undefined : this.generateSubdomainSuggestions(cleanSubdomain)
      };
    } catch (error: any) {
      logger.error('Subdomain validation error:', error);
      return {
        valid: false,
        available: false,
        error: 'Failed to validate subdomain. Please try again.'
      };
    }
  }

  /**
   * Validate domain format using regex
   */
  private validateDomainFormat(domain: string): DomainValidationResult {
    // Check minimum length
    if (domain.length < 3) {
      return {
        valid: false,
        error: 'Domain must be at least 3 characters long'
      };
    }

    // Check maximum length
    if (domain.length > 253) {
      return {
        valid: false,
        error: 'Domain cannot exceed 253 characters'
      };
    }

    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;

    if (!domainRegex.test(domain)) {
      return {
        valid: false,
        error: 'Invalid domain format. Use only letters, numbers, and hyphens.'
      };
    }

    // Check for consecutive hyphens
    if (domain.includes('--')) {
      return {
        valid: false,
        error: 'Domain cannot contain consecutive hyphens'
      };
    }

    // Must contain at least one dot
    if (!domain.includes('.')) {
      return {
        valid: false,
        error: 'Domain must include a top-level domain (e.g., .com, .org)'
      };
    }

    // Check TLD validity
    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2) {
      return {
        valid: false,
        error: 'Invalid top-level domain'
      };
    }

    return { valid: true };
  }

  /**
   * Validate subdomain format
   */
  private validateSubdomainFormat(subdomain: string): DomainValidationResult {
    // Check length constraints
    if (subdomain.length < 3) {
      return {
        valid: false,
        error: 'Subdomain must be at least 3 characters long'
      };
    }

    if (subdomain.length > 63) {
      return {
        valid: false,
        error: 'Subdomain cannot exceed 63 characters'
      };
    }

    // Alphanumeric and hyphens only, cannot start/end with hyphen
    const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]$|^[a-zA-Z0-9]{3}$/;

    if (!subdomainRegex.test(subdomain)) {
      return {
        valid: false,
        error: 'Subdomain can only contain letters, numbers, and hyphens. Cannot start or end with a hyphen.'
      };
    }

    // Cannot contain consecutive hyphens
    if (subdomain.includes('--')) {
      return {
        valid: false,
        error: 'Subdomain cannot contain consecutive hyphens'
      };
    }

    return { valid: true };
  }

  /**
   * Check if custom domain is available
   */
  private async checkDomainAvailability(domain: string, excludeBusinessId?: string): Promise<DomainValidationResult> {
    const query: any = { customDomain: domain };
    if (excludeBusinessId) {
      query.business = { $ne: excludeBusinessId };
    }

    const existing = await BrandSettings.findOne(query);

    return {
      valid: !existing,
      error: existing ? 'This domain is already in use by another brand' : undefined
    };
  }

  /**
   * Check if subdomain is available
   */
  async isSubdomainAvailable(subdomain: string, excludeBusinessId?: string): Promise<boolean> {
    const query: any = { subdomain };
    if (excludeBusinessId) {
      query.business = { $ne: excludeBusinessId };
    }

    const existing = await BrandSettings.findOne(query);
    return !existing;
  }

  /**
   * Check if subdomain is reserved
   */
  private isReservedSubdomain(subdomain: string): boolean {
    return this.reservedSubdomains.includes(subdomain.toLowerCase());
  }

  /**
   * Check if domain is banned
   */
  private isBannedDomain(domain: string): boolean {
    return this.bannedDomains.some(banned =>
      domain === banned || domain.endsWith('.' + banned)
    );
  }

  /**
   * Generate subdomain suggestions
   */
  private generateSubdomainSuggestions(subdomain: string): string[] {
    const suggestions: string[] = [];
    const base = subdomain.replace(/[^a-zA-Z0-9]/g, '');

    // Add numbers
    for (let i = 1; i <= 3; i++) {
      suggestions.push(`${base}${i}`);
    }

    // Add common suffixes
    const suffixes = ['brand', 'store', 'shop', 'co'];
    suffixes.forEach(suffix => {
      if (base.length + suffix.length <= 63) {
        suggestions.push(`${base}${suffix}`);
      }
    });

    // Add year
    const currentYear = new Date().getFullYear().toString().slice(-2);
    if (base.length + 2 <= 63) {
      suggestions.push(`${base}${currentYear}`);
    }

    return suggestions.slice(0, 5); // Return max 5 suggestions
  }

  /**
   * Validate domain DNS records
   */
  private async validateDomainDns(domain: string): Promise<{
    warnings?: string[];
    suggestions?: string[];
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Try to resolve A record
      await dnsResolve(domain, 'A');
    } catch (error) {
      warnings.push('Domain does not have DNS A records configured');
      suggestions.push('Configure your domain DNS to point to our servers before activation');
    }

    return { warnings, suggestions };
  }

  /**
   * Verify domain ownership through DNS
   */
  async verifyDomainOwnership(domain: string, verificationToken: string): Promise<DomainVerificationResult> {
    const checkedAt = new Date();

    try {
      // Check for TXT record with verification token
      const txtRecords = await dnsResolve(domain, 'TXT') as string[][];
      const flatRecords = txtRecords.flat();

      const verificationRecord = flatRecords.find(record =>
        record.includes(verificationToken)
      );

      if (verificationRecord) {
        return {
          verified: true,
          checkedAt,
          observedRecords: [{
            type: 'TXT',
            name: domain,
            value: verificationRecord
          }]
        };
      }

      return {
        verified: false,
        checkedAt,
        reason: 'Verification TXT record not found',
        requiredRecords: [{
          type: 'TXT',
          name: domain,
          value: `brand-verification=${verificationToken}`
        }]
      };
    } catch (error: any) {
      logger.error('Domain verification error:', error);

      return {
        verified: false,
        checkedAt,
        reason: 'DNS lookup failed',
        requiredRecords: [{
          type: 'TXT',
          name: domain,
          value: `brand-verification=${verificationToken}`
        }]
      };
    }
  }

  /**
   * Generate domain setup instructions
   */
  generateCustomDomainSetup(domain: string): CustomDomainSetup {
    const verificationToken = this.generateVerificationToken();
    const cnameTarget = 'brands.yourdomain.com'; // Replace with your actual CNAME target

    return {
      domain,
      cnameTarget,
      sslEnabled: true,
      verificationToken,
      requiredRecords: [
        {
          type: 'TXT',
          name: domain,
          value: `brand-verification=${verificationToken}`,
          ttl: 300
        },
        {
          type: 'CNAME',
          name: domain,
          value: cnameTarget,
          ttl: 300
        }
      ]
    };
  }

  /**
   * Validate domain changes against current settings
   */
  async validateDomainChanges(
    businessId: string,
    updateData: any,
    currentSettings: any
  ): Promise<void> {
    // Validate subdomain change
    if (updateData.subdomain && updateData.subdomain !== currentSettings.subdomain) {
      const validation = await this.validateSubdomain(updateData.subdomain, businessId);
      if (!validation.valid) {
        throw {
          statusCode: 400,
          message: validation.error,
          suggestions: validation.suggestions
        };
      }
    }

    // Validate custom domain change
    if (updateData.customDomain && updateData.customDomain !== currentSettings.customDomain) {
      const validation = await this.validateCustomDomain(updateData.customDomain, businessId);
      if (!validation.valid) {
        throw {
          statusCode: 400,
          message: validation.error,
          suggestions: validation.suggestions
        };
      }
    }
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get domain status information
   */
  async getDomainStatus(businessId: string): Promise<{
    subdomain: {
      configured: boolean;
      available: boolean;
      url?: string;
    };
    customDomain: {
      configured: boolean;
      verified: boolean;
      sslEnabled: boolean;
      url?: string;
    };
  }> {
    const settings = await BrandSettings.findOne({ business: businessId });

    if (!settings) {
      return {
        subdomain: { configured: false, available: true },
        customDomain: { configured: false, verified: false, sslEnabled: false }
      };
    }

    return {
      subdomain: {
        configured: !!settings.subdomain,
        available: !settings.subdomain || await this.isSubdomainAvailable(settings.subdomain, businessId),
        url: settings.subdomain ? `https://${settings.subdomain}.yourdomain.com` : undefined
      },
      customDomain: {
        configured: !!settings.customDomain,
        verified: !!settings.customDomain, // Simplified - you might want to store verification status
        sslEnabled: !!settings.customDomain, // Simplified - you might want to store SSL status
        url: settings.customDomain ? `https://${settings.customDomain}` : undefined
      }
    };
  }

  /**
   * Batch validate multiple domains
   */
  async batchValidateDomains(domains: string[]): Promise<{
    domain: string;
    validation: DomainValidationResult;
  }[]> {
    const results = await Promise.all(
      domains.map(async (domain) => ({
        domain,
        validation: await this.validateCustomDomain(domain)
      }))
    );

    return results;
  }

  /**
   * Get domain suggestions based on business name
   */
  generateDomainSuggestions(businessName: string): string[] {
    const clean = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);

    const suggestions: string[] = [];
    const tlds = ['com', 'co', 'io', 'app', 'store'];

    tlds.forEach(tld => {
      suggestions.push(`${clean}.${tld}`);
      suggestions.push(`${clean}brand.${tld}`);
      suggestions.push(`${clean}co.${tld}`);
    });

    return suggestions.slice(0, 8);
  }
}