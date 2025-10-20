// src/services/tenants/validation/domainValidation.service.ts

import type { IBrandSettings } from '../../../models/brandSettings.model';
import { configService } from '../../utils/config.service';
import type { TenantValidationResult } from '../utils/types';

const DEFAULT_RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'dashboard', 'app'];

export class TenantDomainValidationService {
  private readonly baseDomain: string;
  private readonly reservedSubdomains: string[];

  constructor(baseDomain?: string, reservedSubdomains: string[] = DEFAULT_RESERVED_SUBDOMAINS) {
    this.baseDomain = baseDomain ?? configService.get('BASE_DOMAIN');

    if (!this.baseDomain) {
      throw new Error('Missing BASE_DOMAIN environment variable!');
    }

    this.reservedSubdomains = reservedSubdomains;
  }

  getBaseDomain(): string {
    return this.baseDomain;
  }

  getReservedSubdomains(): string[] {
    return [...this.reservedSubdomains];
  }

  validateSubdomain(subdomain: string): TenantValidationResult {
    if (subdomain.length < 3 || subdomain.length > 63) {
      return { valid: false, reason: 'Subdomain must be between 3 and 63 characters' };
    }

    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return { valid: false, reason: 'Invalid subdomain format' };
    }

    if (this.reservedSubdomains.includes(subdomain)) {
      return { valid: false, reason: 'Reserved subdomain' };
    }

    return { valid: true };
  }

  validateCustomDomain(domain: string): TenantValidationResult {
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;

    if (!domainRegex.test(domain)) {
      return { valid: false, reason: 'Invalid domain format' };
    }

    if (domain === this.baseDomain || domain.endsWith(`.${this.baseDomain}`)) {
      return { valid: false, reason: 'Cannot use base domain as custom domain' };
    }

    return { valid: true };
  }

  validateTenantHostname(hostname: string): boolean {
    if (!hostname || typeof hostname !== 'string') {
      return false;
    }

    if (hostname.length === 0 || hostname.length > 253) {
      return false;
    }

    const suspiciousPatterns = [
      /\.\./,
      /[^a-z0-9.-]/,
      /^-/,
      /-$/,
      /^\./,
      /\.$/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(hostname.toLowerCase())) {
        return false;
      }
    }

    if (!hostname.includes('.')) {
      return false;
    }

    const labels = hostname.split('.');
    for (const label of labels) {
      if (label.length === 0 || label.length > 63) {
        return false;
      }
    }

    return true;
  }

  validateTenantPlan(tenant: IBrandSettings, requiredPlans: string[]): boolean {
    const currentPlan = tenant.plan;
    return Boolean(currentPlan && requiredPlans.includes(currentPlan));
  }

  validateTenantSetup(business: any): { valid: boolean; missingFields?: string[] } {
    const requiredFields = ['businessName', 'email'];
    const missingFields = requiredFields.filter(field => !business?.[field]);

    return {
      valid: missingFields.length === 0,
      missingFields: missingFields.length > 0 ? missingFields : undefined
    };
  }

  validateBusinessStatus(business: any): { valid: boolean; reason?: string } {
    if (!business) {
      return { valid: false, reason: 'Business not found' };
    }

    if (business.status === 'suspended') {
      return { valid: false, reason: 'Account suspended' };
    }

    if (!business.isEmailVerified && business.requiresEmailVerification) {
      return { valid: false, reason: 'Email verification required' };
    }

    return { valid: true };
  }
}

export const tenantDomainValidationService = new TenantDomainValidationService();
