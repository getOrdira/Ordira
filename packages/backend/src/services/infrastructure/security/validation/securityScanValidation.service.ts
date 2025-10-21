import Joi from 'joi';
import {
  SecurityVulnerability,
  SecurityScanResult,
  SecurityScanMetrics,
  SecurityVulnerabilityType,
  SecuritySeverity,
  SecurityVulnerabilityCreateInput,
  SecurityScanResultCreateInput
} from '../utils/securityTypes';

/**
 * Validation schemas for security scanning operations
 */

// Security vulnerability type schema
export const securityVulnerabilityTypeSchema = Joi.string().valid(
  'sql_injection',
  'xss',
  'csrf',
  'insecure_direct_object_reference',
  'security_misconfiguration',
  'sensitive_data_exposure',
  'missing_function_level_access_control',
  'known_vulnerable_components',
  'unvalidated_redirects_forwards',
  'other'
).required().description('Type of security vulnerability');

// Security severity schema
export const securitySeveritySchema = Joi.string().valid(
  'low',
  'medium',
  'high',
  'critical'
).required().description('Severity level of the vulnerability');

// Security vulnerability schema
export const securityVulnerabilitySchema = Joi.object<SecurityVulnerability>({
  id: Joi.string().min(1).max(100).required()
    .description('Unique identifier for the vulnerability'),
  
  type: securityVulnerabilityTypeSchema,
  
  severity: securitySeveritySchema,
  
  title: Joi.string().min(1).max(200).required()
    .description('Title of the vulnerability'),
  
  description: Joi.string().min(1).max(1000).required()
    .description('Detailed description of the vulnerability'),
  
  recommendation: Joi.string().min(1).max(1000).required()
    .description('Recommendation for fixing the vulnerability'),
  
  detectedAt: Joi.date().required()
    .description('When the vulnerability was detected'),
  
  resolved: Joi.date().optional()
    .description('When the vulnerability was resolved'),
  
  metadata: Joi.object().optional()
    .description('Additional metadata about the vulnerability')
});

// Security vulnerability create input schema
export const securityVulnerabilityCreateInputSchema = Joi.object<SecurityVulnerabilityCreateInput>({
  id: Joi.string().min(1).max(100).optional()
    .description('Unique identifier for the vulnerability'),
  
  type: securityVulnerabilityTypeSchema,
  
  severity: securitySeveritySchema,
  
  title: Joi.string().min(1).max(200).required()
    .description('Title of the vulnerability'),
  
  description: Joi.string().min(1).max(1000).required()
    .description('Detailed description of the vulnerability'),
  
  recommendation: Joi.string().min(1).max(1000).required()
    .description('Recommendation for fixing the vulnerability'),
  
  detectedAt: Joi.date().optional()
    .description('When the vulnerability was detected'),
  
  resolved: Joi.date().optional()
    .description('When the vulnerability was resolved'),
  
  metadata: Joi.object().optional()
    .description('Additional metadata about the vulnerability')
});

// Vulnerability summary schema
export const vulnerabilitySummarySchema = Joi.object({
  total: Joi.number().integer().min(0).required()
    .description('Total number of vulnerabilities'),
  
  critical: Joi.number().integer().min(0).required()
    .description('Number of critical vulnerabilities'),
  
  high: Joi.number().integer().min(0).required()
    .description('Number of high severity vulnerabilities'),
  
  medium: Joi.number().integer().min(0).required()
    .description('Number of medium severity vulnerabilities'),
  
  low: Joi.number().integer().min(0).required()
    .description('Number of low severity vulnerabilities')
});

// Security scan status schema
export const securityScanStatusSchema = Joi.string().valid(
  'completed',
  'failed',
  'in_progress'
).required().description('Status of the security scan');

// Security scan result schema
export const securityScanResultSchema = Joi.object<SecurityScanResult>({
  scanId: Joi.string().min(1).max(100).required()
    .description('Unique identifier for the scan'),
  
  timestamp: Joi.date().required()
    .description('When the scan was performed'),
  
  vulnerabilities: Joi.array().items(securityVulnerabilitySchema).required()
    .description('List of vulnerabilities found'),
  
  summary: vulnerabilitySummarySchema.required(),
  
  status: securityScanStatusSchema
});

// Security scan result create input schema
export const securityScanResultCreateInputSchema = Joi.object<SecurityScanResultCreateInput>({
  scanId: Joi.string().min(1).max(100).optional()
    .description('Unique identifier for the scan'),
  
  timestamp: Joi.date().optional()
    .description('When the scan was performed'),
  
  vulnerabilities: Joi.array().items(securityVulnerabilityCreateInputSchema).required()
    .description('List of vulnerabilities found'),
  
  summary: vulnerabilitySummarySchema.required(),
  
  status: securityScanStatusSchema
});

// Security scan metrics schema
export const securityScanMetricsSchema = Joi.object<SecurityScanMetrics>({
  totalScans: Joi.number().integer().min(0).required()
    .description('Total number of scans performed'),
  
  vulnerabilitiesFound: Joi.number().integer().min(0).required()
    .description('Total number of vulnerabilities found'),
  
  vulnerabilitiesResolved: Joi.number().integer().min(0).required()
    .description('Number of vulnerabilities that have been resolved'),
  
  averageScanTime: Joi.number().integer().min(0).required()
    .description('Average scan time in milliseconds'),
  
  lastScanDate: Joi.date().optional()
    .description('Date of the last scan'),
  
  riskScore: Joi.number().min(0).max(100).required()
    .description('Current risk score (0-100, lower is better)')
});

// Vulnerability filters schema
export const vulnerabilityFiltersSchema = Joi.object({
  type: Joi.string().optional()
    .description('Filter by vulnerability type'),
  
  severity: securitySeveritySchema.optional(),
  
  resolved: Joi.boolean().optional()
    .description('Filter by resolution status'),
  
  limit: Joi.number().integer().min(1).max(1000).optional()
    .description('Limit the number of results')
});

// Scan history limit schema
export const scanHistoryLimitSchema = Joi.number().integer().min(1).max(100).optional()
  .description('Limit the number of scan results to return');

// Vulnerability ID schema
export const vulnerabilityIdSchema = Joi.string().min(1).max(100).required()
  .description('Unique identifier for the vulnerability');

// Scan ID schema
export const scanIdSchema = Joi.string().min(1).max(100).required()
  .description('Unique identifier for the scan');

/**
 * Security Scan Validation Service
 */
export class SecurityScanValidationService {
  /**
   * Validate security vulnerability
   */
  validateVulnerability(vulnerability: unknown): SecurityVulnerability {
    const { error, value } = securityVulnerabilitySchema.validate(vulnerability, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid security vulnerability: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate security vulnerability create input
   */
  validateVulnerabilityCreateInput(input: unknown): SecurityVulnerabilityCreateInput {
    const { error, value } = securityVulnerabilityCreateInputSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid security vulnerability create input: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate security scan result
   */
  validateScanResult(result: unknown): SecurityScanResult {
    const { error, value } = securityScanResultSchema.validate(result, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid security scan result: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate security scan result create input
   */
  validateScanResultCreateInput(input: unknown): SecurityScanResultCreateInput {
    const { error, value } = securityScanResultCreateInputSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid security scan result create input: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate security scan metrics
   */
  validateScanMetrics(metrics: unknown): SecurityScanMetrics {
    const { error, value } = securityScanMetricsSchema.validate(metrics, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid security scan metrics: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate vulnerability filters
   */
  validateVulnerabilityFilters(filters: unknown): { 
    type?: string; 
    severity?: SecuritySeverity; 
    resolved?: boolean; 
    limit?: number 
  } {
    const { error, value } = vulnerabilityFiltersSchema.validate(filters, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid vulnerability filters: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate scan history limit
   */
  validateScanHistoryLimit(limit: unknown): number | undefined {
    const { error, value } = scanHistoryLimitSchema.validate(limit, {
      abortEarly: false
    });

    if (error) {
      throw new Error(`Invalid scan history limit: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate vulnerability ID
   */
  validateVulnerabilityId(id: unknown): string {
    const { error, value } = vulnerabilityIdSchema.validate(id, {
      abortEarly: false
    });

    if (error) {
      throw new Error(`Invalid vulnerability ID: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate scan ID
   */
  validateScanId(id: unknown): string {
    const { error, value } = scanIdSchema.validate(id, {
      abortEarly: false
    });

    if (error) {
      throw new Error(`Invalid scan ID: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate vulnerability type
   */
  validateVulnerabilityType(type: unknown): SecurityVulnerabilityType {
    const { error, value } = securityVulnerabilityTypeSchema.validate(type, {
      abortEarly: false
    });

    if (error) {
      throw new Error(`Invalid vulnerability type: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate security severity
   */
  validateSecuritySeverity(severity: unknown): SecuritySeverity {
    const { error, value } = securitySeveritySchema.validate(severity, {
      abortEarly: false
    });

    if (error) {
      throw new Error(`Invalid security severity: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }
}

export const securityScanValidationService = new SecurityScanValidationService();
