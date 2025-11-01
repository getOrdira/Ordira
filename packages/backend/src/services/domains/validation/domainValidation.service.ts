import { createAppError } from '../../../middleware/deprecated/error.middleware';
import type { RegisterDomainOptions } from '../core/domainRegistry.service';
import type { VerificationInitiationOptions, VerificationMethod } from '../features/domainVerification.service';
import type { DomainAnalyticsOptions, DomainAnalyticsTimeframe } from '../features/domainAnalytics.service';
import type { DomainHealthCheckOptions } from '../features/domainHealth.service';

type CertificateType = 'letsencrypt' | 'custom';
type PlanLevel = 'foundation' | 'growth' | 'premium' | 'enterprise';

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const DOMAIN_REGEX = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;
const IP_REGEX = /^\d{1,3}(\.\d{1,3}){3}$/;
const BLOCKED_DOMAINS = [
  'localhost',
  'myshopify.com',
  'herokuapp.com',
  'netlify.app',
  'vercel.app',
  'github.io',
  'gitlab.io',
  'firebaseapp.com',
  'firebase.app',
  'web.app',
  'appspot.com',
  'amazonaws.com'
];
const ALLOWED_CERTIFICATE_TYPES: CertificateType[] = ['letsencrypt', 'custom'];
const ALLOWED_VERIFICATION_METHODS: VerificationMethod[] = ['dns', 'file', 'email'];
const ALLOWED_PLAN_LEVELS: PlanLevel[] = ['foundation', 'growth', 'premium', 'enterprise'];
const ALLOWED_TIMEFRAMES: DomainAnalyticsTimeframe[] = ['24h', '7d', '30d', '90d'];

const DEFAULT_ANALYTICS_TIMEFRAME: DomainAnalyticsTimeframe = '7d';

interface RegistrationPayload
  extends Omit<RegisterDomainOptions, 'domain'> {
  domain: string;
}

interface ConfigurationUpdateInput {
  forceHttps?: unknown;
  autoRenewal?: unknown;
  certificateType?: unknown;
  verificationMethod?: unknown;
}

interface VerificationInput extends VerificationInitiationOptions {
}

export class DomainValidationService {
  ensureBusinessId(businessId: string | undefined | null): string {
    const trimmed = (businessId || '').trim();
    if (!trimmed) {
      throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
    }
    return trimmed;
  }

  ensureDomainId(domainId: string | undefined | null): string {
    const trimmed = (domainId || '').trim();
    if (!OBJECT_ID_REGEX.test(trimmed)) {
      throw createAppError('Domain ID must be a valid ObjectId', 400, 'INVALID_DOMAIN_ID');
    }
    return trimmed;
  }

  ensureDomainName(domain: string | undefined | null): string {
    const candidate = (domain || '').trim().toLowerCase();

    if (!candidate) {
      throw createAppError('Domain is required', 400, 'MISSING_DOMAIN');
    }

    if (candidate.length > 253) {
      throw createAppError('Domain exceeds maximum length of 253 characters', 400, 'DOMAIN_TOO_LONG');
    }

    if (IP_REGEX.test(candidate)) {
      throw createAppError('IP addresses are not allowed for custom domain mapping', 400, 'DOMAIN_IP_NOT_ALLOWED');
    }

    if (!DOMAIN_REGEX.test(candidate)) {
      throw createAppError('Domain is not in a valid format', 400, 'INVALID_DOMAIN');
    }

    if (BLOCKED_DOMAINS.some(blocked => candidate.endsWith(blocked))) {
      throw createAppError('This domain suffix is not allowed for custom mapping', 400, 'DOMAIN_BLOCKED');
    }

    const baseDomain = process.env.BASE_DOMAIN?.toLowerCase();
    if (baseDomain && (candidate === baseDomain || candidate.endsWith(`.${baseDomain}`))) {
      throw createAppError('Domain cannot match the Ordira base domain', 400, 'DOMAIN_BASE_CONFLICT');
    }

    return candidate;
  }

  ensureCertificateType(type: string | undefined | null): CertificateType {
    if (!type) {
      return 'letsencrypt';
    }

    const normalized = type.toLowerCase() as CertificateType;
    if (!ALLOWED_CERTIFICATE_TYPES.includes(normalized)) {
      throw createAppError('Unsupported certificate type', 400, 'INVALID_CERTIFICATE_TYPE');
    }

    return normalized;
  }

  ensureVerificationMethod(method: string | undefined | null): VerificationMethod {
    const normalized = (method || 'dns').toLowerCase() as VerificationMethod;
    if (!ALLOWED_VERIFICATION_METHODS.includes(normalized)) {
      throw createAppError('Unsupported verification method', 400, 'INVALID_VERIFICATION_METHOD');
    }
    return normalized;
  }

  ensurePlanLevel(plan: string | undefined | null): PlanLevel {
    if (!plan) {
      return 'foundation';
    }

    const normalized = plan.toLowerCase() as PlanLevel;
    if (!ALLOWED_PLAN_LEVELS.includes(normalized)) {
      throw createAppError('Invalid plan level specified', 400, 'INVALID_PLAN_LEVEL');
    }
    return normalized;
  }

  normalizeRegistrationPayload(input: RegistrationPayload): RegistrationPayload {
    if (!input.createdBy) {
      throw createAppError('createdBy is required for domain registration', 400, 'MISSING_CREATED_BY');
    }

    return {
      ...input,
      domain: this.ensureDomainName(input.domain),
      certificateType: this.ensureCertificateType(input.certificateType),
      forceHttps: input.forceHttps !== false,
      autoRenewal: input.autoRenewal !== false,
      planLevel: this.ensurePlanLevel(input.planLevel),
      verificationMethod: this.ensureVerificationMethod(input.verificationMethod)
    };
  }

  normalizeConfigurationUpdate(input: ConfigurationUpdateInput = {}): {
    forceHttps?: boolean;
    autoRenewal?: boolean;
    certificateType?: CertificateType;
    verificationMethod?: VerificationMethod;
  } {
    const normalized: {
      forceHttps?: boolean;
      autoRenewal?: boolean;
      certificateType?: CertificateType;
      verificationMethod?: VerificationMethod;
    } = {};

    if (typeof input.forceHttps !== 'undefined') {
      normalized.forceHttps = this.toBoolean(input.forceHttps, 'forceHttps');
    }

    if (typeof input.autoRenewal !== 'undefined') {
      normalized.autoRenewal = this.toBoolean(input.autoRenewal, 'autoRenewal');
    }

    if (typeof input.certificateType !== 'undefined') {
      normalized.certificateType = this.ensureCertificateType(String(input.certificateType));
    }

    if (typeof input.verificationMethod !== 'undefined') {
      normalized.verificationMethod = this.ensureVerificationMethod(String(input.verificationMethod));
    }

    return normalized;
  }

  normalizeVerificationOptions(options: VerificationInput = {}): VerificationInitiationOptions {
    const method = this.ensureVerificationMethod(options.method as string | undefined);

    return {
      method,
      requestedBy: typeof options.requestedBy === 'string' ? options.requestedBy.trim() || undefined : undefined,
      autoScheduleRecheck: options.autoScheduleRecheck !== false
    };
  }

  normalizeAnalyticsOptions(options: DomainAnalyticsOptions = {}): Required<DomainAnalyticsOptions> {
    const timeframe = (options.timeframe || DEFAULT_ANALYTICS_TIMEFRAME).toLowerCase() as DomainAnalyticsTimeframe;
    if (!ALLOWED_TIMEFRAMES.includes(timeframe)) {
      throw createAppError('Invalid analytics timeframe', 400, 'INVALID_ANALYTICS_TIMEFRAME');
    }

    return {
      timeframe,
      useCache: options.useCache !== false,
      includePerformance: options.includePerformance !== false,
      includeErrors: options.includeErrors !== false,
      includeTraffic: options.includeTraffic !== false
    };
  }

  normalizeHealthOptions(options: DomainHealthCheckOptions = {}): Required<DomainHealthCheckOptions> {
    return {
      timeoutMs: this.ensurePositiveInteger(options.timeoutMs, 'timeoutMs', DEFAULT_TIMEOUT_MS),
      includeDns: options.includeDns !== false,
      includeHttp: options.includeHttp !== false,
      includeSsl: options.includeSsl !== false
    };
  }

  ensureRenewalLeadTime(daysBeforeExpiry: number | undefined | null): number {
    if (typeof daysBeforeExpiry === 'undefined' || daysBeforeExpiry === null) {
      return 20;
    }

    if (typeof daysBeforeExpiry !== 'number' || Number.isNaN(daysBeforeExpiry)) {
      throw createAppError('daysBeforeExpiry must be a number', 400, 'INVALID_RENEWAL_WINDOW');
    }

    if (daysBeforeExpiry <= 0) {
      throw createAppError('daysBeforeExpiry must be greater than zero', 400, 'INVALID_RENEWAL_WINDOW');
    }

    return Math.floor(daysBeforeExpiry);
  }

  private ensurePositiveInteger(value: unknown, field: string, fallback: number): number {
    if (typeof value === 'undefined' || value === null) {
      return fallback;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw createAppError(`${field} must be a positive number`, 400, 'INVALID_HEALTH_OPTION');
    }

    return Math.floor(numeric);
  }

  private toBoolean(value: unknown, field: string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['true', '1'].includes(normalized)) {
        return true;
      }
      if (['false', '0'].includes(normalized)) {
        return false;
      }
    }

    throw createAppError(`${field} must be a boolean value`, 400, 'INVALID_BOOLEAN');
  }
}

const DEFAULT_TIMEOUT_MS = 5000;

export const domainValidationService = new DomainValidationService();
