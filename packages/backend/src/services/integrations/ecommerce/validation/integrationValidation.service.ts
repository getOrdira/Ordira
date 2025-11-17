/**
 * Ecommerce Integration Validation Service
 * 
 * Validates integration configuration, credentials, and business rules
 * before establishing connections with ecommerce providers.
 */

import { EcommerceIntegrationError } from '../core/errors';
import type { EcommerceProvider, IntegrationCredentialsInput } from '../core/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validates integration credentials and configuration for a provider
 */
export class IntegrationValidationService {
  /**
   * Validate credentials input for a specific provider
   */
  validateCredentials(
    provider: EcommerceProvider,
    credentials: IntegrationCredentialsInput
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (provider) {
      case 'shopify':
        return this.validateShopifyCredentials(credentials, errors, warnings);
      case 'wix':
        return this.validateWixCredentials(credentials, errors, warnings);
      case 'woocommerce':
        return this.validateWooCommerceCredentials(credentials, errors, warnings);
      default:
        errors.push(`Unsupported provider: ${provider}`);
        return { valid: false, errors };
    }
  }

  /**
   * Validate domain format for a provider
   */
  validateDomain(provider: EcommerceProvider, domain: string): ValidationResult {
    if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
      return { valid: false, errors: ['Domain is required'] };
    }

    const trimmedDomain = domain.trim().toLowerCase();
    const errors: string[] = [];

    switch (provider) {
      case 'shopify':
        return this.validateShopifyDomain(trimmedDomain, errors);
      case 'wix':
        return this.validateWixDomain(trimmedDomain, errors);
      case 'woocommerce':
        return this.validateWooCommerceDomain(trimmedDomain, errors);
      default:
        errors.push(`Unsupported provider: ${provider}`);
        return { valid: false, errors };
    }
  }

  /**
   * Validate business ID format
   */
  validateBusinessId(businessId: string): ValidationResult {
    const errors: string[] = [];

    if (!businessId || typeof businessId !== 'string') {
      errors.push('Business ID is required');
      return { valid: false, errors };
    }

    if (businessId.trim().length === 0) {
      errors.push('Business ID cannot be empty');
    }

    // MongoDB ObjectId format validation (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(businessId)) {
      errors.push('Business ID must be a valid MongoDB ObjectId');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate complete integration configuration
   */
  validateIntegrationConfig(
    provider: EcommerceProvider,
    businessId: string,
    credentials: IntegrationCredentialsInput
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate business ID
    const businessIdValidation = this.validateBusinessId(businessId);
    if (!businessIdValidation.valid) {
      errors.push(...businessIdValidation.errors);
    }

    // Validate domain if provided
    if (credentials.domain) {
      const domainValidation = this.validateDomain(provider, credentials.domain);
      if (!domainValidation.valid) {
        errors.push(...domainValidation.errors);
      }
    }

    // Validate credentials
    const credentialsValidation = this.validateCredentials(provider, credentials);
    if (!credentialsValidation.valid) {
      errors.push(...credentialsValidation.errors);
    }
    if (credentialsValidation.warnings) {
      warnings.push(...credentialsValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // ===== PROVIDER-SPECIFIC VALIDATION =====

  private validateShopifyCredentials(
    credentials: IntegrationCredentialsInput,
    errors: string[],
    warnings: string[]
  ): ValidationResult {
    // Domain validation
    if (credentials.domain) {
      const domainValidation = this.validateShopifyDomain(credentials.domain, errors);
      if (!domainValidation.valid) {
        errors.push(...domainValidation.errors);
      }
    } else {
      errors.push('Shopify domain is required');
    }

    // Access token validation
    if (!credentials.accessToken || credentials.accessToken.trim().length === 0) {
      errors.push('Shopify access token is required');
    } else if (credentials.accessToken.length < 20) {
      warnings.push('Shopify access token appears to be invalid (too short)');
    }

    // Webhook secret is optional but recommended
    if (!credentials.secret) {
      warnings.push('Webhook secret not provided - webhook signature validation will be disabled');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private validateWixCredentials(
    credentials: IntegrationCredentialsInput,
    errors: string[],
    warnings: string[]
  ): ValidationResult {
    // Access token validation
    if (!credentials.accessToken || credentials.accessToken.trim().length === 0) {
      errors.push('Wix access token is required');
    } else if (credentials.accessToken.length < 20) {
      warnings.push('Wix access token appears to be invalid (too short)');
    }

    // Refresh token is recommended for long-term connections
    if (!credentials.refreshToken) {
      warnings.push('Wix refresh token not provided - token refresh may fail');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private validateWooCommerceCredentials(
    credentials: IntegrationCredentialsInput,
    errors: string[],
    warnings: string[]
  ): ValidationResult {
    // Domain validation
    if (credentials.domain) {
      const domainValidation = this.validateWooCommerceDomain(credentials.domain, errors);
      if (!domainValidation.valid) {
        errors.push(...domainValidation.errors);
      }
    } else {
      errors.push('WooCommerce store domain is required');
    }

    // Consumer key validation
    if (!credentials.accessToken || credentials.accessToken.trim().length === 0) {
      errors.push('WooCommerce consumer key is required');
    } else if (credentials.accessToken.length < 10) {
      warnings.push('WooCommerce consumer key appears to be invalid (too short)');
    }

    // Consumer secret validation
    if (!credentials.secret || credentials.secret.trim().length === 0) {
      errors.push('WooCommerce consumer secret is required');
    } else if (credentials.secret.length < 10) {
      warnings.push('WooCommerce consumer secret appears to be invalid (too short)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private validateShopifyDomain(domain: string, errors: string[]): ValidationResult {
    // Shopify domains can be:
    // - shop.myshopify.com
    // - shop (will be normalized to shop.myshopify.com)
    // - custom domain (must be verified)

    if (domain.includes('.myshopify.com')) {
      const shopName = domain.replace('.myshopify.com', '');
      if (shopName.length < 3 || shopName.length > 63) {
        errors.push('Shopify shop name must be between 3 and 63 characters');
      }
      if (!/^[a-z0-9-]+$/.test(shopName)) {
        errors.push('Shopify shop name can only contain lowercase letters, numbers, and hyphens');
      }
    } else {
      // Custom domain or shop name without .myshopify.com
      if (domain.length < 3 || domain.length > 253) {
        errors.push('Shopify domain must be between 3 and 253 characters');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateWixDomain(domain: string, errors: string[]): ValidationResult {
    // Wix domains are typically:
    // - example.wixsite.com
    // - example.com (custom domain)
    // - example (site name)

    if (domain.length < 2 || domain.length > 253) {
      errors.push('Wix domain must be between 2 and 253 characters');
    }

    // Basic domain format validation
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(domain)) {
      errors.push('Wix domain format is invalid');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateWooCommerceDomain(domain: string, errors: string[]): ValidationResult {
    // WooCommerce domains are typically WordPress sites:
    // - example.com
    // - www.example.com
    // - store.example.com

    if (domain.length < 4 || domain.length > 253) {
      errors.push('WooCommerce domain must be between 4 and 253 characters');
    }

    // Basic domain format validation
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(domain)) {
      errors.push('WooCommerce domain format is invalid');
    }

    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (cleanDomain !== domain) {
      errors.push('WooCommerce domain should not include protocol (http:// or https://)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const integrationValidationService = new IntegrationValidationService();
