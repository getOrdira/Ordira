// src/components/forms/adapters/rhf/resolver.tsx

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Resolver, FieldErrors, FieldValues } from 'react-hook-form';
import { z } from 'zod';

// Import backend-aligned types
import type { ValidationError as BackendValidationError } from '@/lib/types/common';

/**
 * Enhanced resolver options that align with backend validation patterns
 */
export interface ResolverOptions {
  // Transform field names (e.g., camelCase to snake_case for backend)
  transformFieldNames?: (fieldName: string) => string;
  // Transform error messages
  transformErrorMessage?: (message: string, field: string) => string;
  // Custom validation mode
  mode?: 'sync' | 'async';
  // Backend validation integration
  backendValidation?: {
    enabled: boolean;
    endpoint?: string;
    debounceMs?: number;
    validateOnBlur?: boolean;
  };
  // Field-specific options
  fieldOptions?: Record<string, {
    skipValidation?: boolean;
    customValidator?: (value: any) => boolean | string;
    formatValue?: (value: any) => any;
  }>;
}

/**
 * Create enhanced Zod resolver with backend alignment
 */
export function createZodResolver<T extends z.ZodTypeAny>(
  schema: T,
  options: ResolverOptions = {}
): Resolver<any, FieldValues> {
  return async (values, context, resolverOptions) => {
    // Apply field transformations before validation
    const transformedValues = transformFieldsForValidation(values, options);
    
    // Run base Zod validation
    const baseResolver = zodResolver(schema as any);
    const result = await baseResolver(transformedValues, context, resolverOptions);
    
    // Transform errors to match backend patterns
    if (result.errors) {
      result.errors = transformErrorsForDisplay(result.errors, options);
    }
    
    // Apply custom field validations
    const customErrors = await runCustomFieldValidations(values, options);
    if (customErrors && Object.keys(customErrors).length > 0) {
      result.errors = { ...result.errors, ...customErrors };
    }
    
    return result;
  };
}

/**
 * Transform field values before validation (e.g., trim strings, format numbers)
 */
function transformFieldsForValidation(values: any, options: ResolverOptions): any {
  const transformed = { ...values };
  
  for (const [fieldName, fieldValue] of Object.entries(transformed)) {
    const fieldOptions = options.fieldOptions?.[fieldName];
    
    if (fieldOptions?.formatValue) {
      transformed[fieldName] = fieldOptions.formatValue(fieldValue);
    } else if (typeof fieldValue === 'string') {
      // Default string transformations
      transformed[fieldName] = fieldValue.trim();
    }
  }
  
  return transformed;
}

/**
 * Transform validation errors for better display
 */
function transformErrorsForDisplay(
  errors: FieldErrors,
  options: ResolverOptions
): FieldErrors {
  const transformedErrors: FieldErrors = {};
  
  for (const [fieldName, error] of Object.entries(errors)) {
    if (!error || typeof error !== 'object' || !('message' in error)) continue;
    
    const errorObj = error as { message: string; type?: string };
    const transformedFieldName = options.transformFieldNames?.(fieldName) || fieldName;
    const transformedMessage = options.transformErrorMessage?.(
      errorObj.message || 'Invalid value',
      fieldName
    ) || errorObj.message;
    
    transformedErrors[transformedFieldName] = {
      ...errorObj,
      message: transformedMessage
    } as any;
  }
  
  return transformedErrors;
}

/**
 * Run custom field validations
 */
async function runCustomFieldValidations(
  values: any,
  options: ResolverOptions
): Promise<FieldErrors | null> {
  const errors: FieldErrors = {};
  
  if (!options.fieldOptions) return null;
  
  for (const [fieldName, fieldOptions] of Object.entries(options.fieldOptions)) {
    if (fieldOptions.skipValidation) continue;
    
    const fieldValue = values[fieldName];
    const customValidator = fieldOptions.customValidator;
    
    if (customValidator) {
      const validationResult = customValidator(fieldValue);
      
      if (validationResult !== true) {
        errors[fieldName] = {
          type: 'custom',
          message: typeof validationResult === 'string' ? validationResult : 'Invalid value'
        };
      }
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validation schema builders that mirror backend Joi patterns
 */
export const validationSchemas = {
  /**
   * MongoDB ObjectId validation (matches backend commonSchemas.mongoId)
   */
  mongoId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId')
    .length(24, 'MongoDB ObjectId must be exactly 24 characters'),

  /**
   * Email validation (matches backend commonSchemas.email)
   */
  email: z.string()
    .email('Must be a valid email address')
    .toLowerCase()
    .min(1, 'Email is required'),

  /**
   * Business email validation (matches backend commonSchemas.businessEmail)
   */
  businessEmail: z.string()
    .email('Must be a valid email address')
    .toLowerCase()
    .refine((email) => {
      // Block disposable email domains (matches backend logic)
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'temp-mail.org'
      ];
      const domain = email.split('@')[1]?.toLowerCase();
      return !disposableDomains.includes(domain);
    }, 'Business email addresses only - disposable emails not allowed'),

  /**
   * Password validation (matches backend commonSchemas.password)
   */
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  /**
   * Phone number validation (matches backend commonSchemas.phone)
   */
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number in international format')
    .min(1, 'Phone number is required'),

  /**
   * Optional phone validation
   */
  optionalPhone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number in international format')
    .optional()
    .or(z.literal('')),

  /**
   * URL validation (matches backend commonSchemas.url)
   */
  url: z.string()
    .url('Must be a valid URL')
    .min(1, 'URL is required'),

  /**
   * Optional URL validation
   */
  optionalUrl: z.string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),

  /**
   * Business name validation (matches backend commonSchemas.businessName)
   */
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-\&\.\,\']+$/, 'Business name contains invalid characters'),

  /**
   * Subdomain validation (matches backend commonSchemas.subdomain)
   */
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain cannot exceed 63 characters')
    .regex(/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),

  /**
   * Hex color validation (matches backend commonSchemas.hexColor)
   */
  hexColor: z.string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, 'Must be a valid hex color (e.g., #FF0000)')
    .optional(),

  /**
   * Ethereum address validation (matches backend commonSchemas.ethereumAddress)
   */
  ethereumAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address')
    .optional(),

  /**
   * Industry validation (matches backend commonSchemas.industry)
   */
  industry: z.string()
    .min(2, 'Industry must be at least 2 characters')
    .max(100, 'Industry cannot exceed 100 characters')
    .optional(),

  /**
   * Plan type validation (matches backend commonSchemas.plan)
   */
  plan: z.enum(['foundation', 'growth', 'premium', 'enterprise']).refine(
    (val) => ['foundation', 'growth', 'premium', 'enterprise'].includes(val),
    { message: 'Plan must be foundation, growth, premium, or enterprise' }
  ),

  /**
   * Optional plan validation
   */
  optionalPlan: z.enum(['foundation', 'growth', 'premium', 'enterprise'])
    .optional(),

  /**
   * Pagination validation (matches backend querySchemas.pagination)
   */
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0)
  }),

  /**
   * Search validation (matches backend querySchemas.search)
   */
  search: z.object({
    q: z.string().min(1).max(100).optional(),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  /**
   * Date validation (matches backend commonSchemas.date)
   */
  date: z.string()
    .datetime({ message: 'Must be a valid ISO date string' })
    .or(z.date())
    .transform((val) => typeof val === 'string' ? val : val.toISOString()),

  /**
   * Optional date validation
   */
  optionalDate: z.string()
    .datetime({ message: 'Must be a valid ISO date string' })
    .or(z.date())
    .transform((val) => typeof val === 'string' ? val : val.toISOString())
    .optional(),

  /**
   * Text length validations (matches backend text schemas)
   */
  shortText: z.string()
    .min(1, 'This field is required')
    .max(100, 'Cannot exceed 100 characters')
    .trim(),

  mediumText: z.string()
    .min(1, 'This field is required')
    .max(500, 'Cannot exceed 500 characters')
    .trim(),

  longText: z.string()
    .min(1, 'This field is required')
    .max(2000, 'Cannot exceed 2000 characters')
    .trim(),

  optionalShortText: z.string()
    .max(100, 'Cannot exceed 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  optionalMediumText: z.string()
    .max(500, 'Cannot exceed 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  optionalLongText: z.string()
    .max(2000, 'Cannot exceed 2000 characters')
    .trim()
    .optional()
    .or(z.literal(''))
};

/**
 * Form schema builders that match your backend schemas
 */
export const formSchemas = {
  /**
   * Login schema (matches backend businessSchemas.loginBusiness)
   */
  login: z.object({
    email: validationSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false)
  }),

  /**
   * Alternative login with email or phone (matches backend pattern)
   */
  loginWithEmailOrPhone: z.object({
    emailOrPhone: z.union([
      validationSchemas.email,
      validationSchemas.phone
    ]).refine(
      (val) => {
        try {
          validationSchemas.email.parse(val);
          return true;
        } catch {
          try {
            validationSchemas.phone.parse(val);
            return true;
          } catch {
            return false;
          }
        }
      },
      { message: 'Must be a valid email or phone number' }
    ),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false)
  }),

  /**
   * Business registration schema (matches backend businessSchemas.registerBusiness)
   */
  registerBusiness: z.object({
    firstName: validationSchemas.shortText,
    lastName: validationSchemas.shortText,
    businessName: validationSchemas.businessName,
    businessEmail: validationSchemas.businessEmail,
    phone: validationSchemas.phone,
    password: validationSchemas.password,
    dateOfBirth: validationSchemas.date.optional(),
    address: validationSchemas.optionalMediumText,
    regNumber: z.string().max(50).optional().or(z.literal('')),
    taxId: z.string().max(50).optional().or(z.literal('')),
    industry: validationSchemas.industry,
    country: validationSchemas.optionalShortText,
    planType: validationSchemas.plan.default('foundation')
  }),

  /**
   * Manufacturer registration schema (matches backend manufacturerSchemas.registerManufacturer)
   */
  registerManufacturer: z.object({
    name: validationSchemas.businessName,
    email: validationSchemas.businessEmail,
    password: validationSchemas.password,
    description: validationSchemas.optionalLongText,
    industry: validationSchemas.industry,
    servicesOffered: z.array(z.string().max(100)).max(20).optional().default([]),
    moq: z.number().int().min(1).optional(),
    contactEmail: validationSchemas.email.optional().or(z.literal('')),
    country: validationSchemas.optionalShortText,
    establishedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional()
  }),

  /**
   * Brand settings update schema (matches backend brand validation)
   */
  updateBrandSettings: z.object({
    themeColor: validationSchemas.hexColor,
    logoUrl: validationSchemas.optionalUrl,
    bannerImages: z.array(validationSchemas.url).max(5, 'Cannot have more than 5 banner images').optional(),
    customCss: z.string().max(10000, 'Custom CSS cannot exceed 10,000 characters').optional().or(z.literal('')),
    subdomain: validationSchemas.subdomain.optional(),
    customDomain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, 'Must be a valid domain name').optional().or(z.literal('')),
    enableSsl: z.boolean().default(true),
    certificateWallet: validationSchemas.ethereumAddress
  }),

  /**
   * User preferences schema (matches backend user validation)
   */
  userPreferences: z.object({
    language: z.enum(['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko']).default('en'),
    timezone: z.string().max(50).default('UTC'),
    emailFrequency: z.enum(['immediate', 'hourly', 'daily', 'weekly', 'never']).default('daily'),
    marketingEmails: z.boolean().default(false),
    productUpdates: z.boolean().default(true),
    securityNotifications: z.boolean().default(true),
    emailNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false)
  }),

  /**
   * Email gating configuration schema (matches backend patterns)
   */
  emailGatingConfig: z.object({
    enabled: z.boolean().default(false),
    mode: z.enum(['whitelist', 'blacklist', 'disabled']).default('disabled'),
    allowUnregistered: z.boolean().default(false),
    requireApproval: z.boolean().default(false),
    autoSyncEnabled: z.boolean().default(false),
    syncSources: z.array(z.enum(['shopify', 'woocommerce', 'csv', 'api'])).max(4).default([]),
    welcomeEmailEnabled: z.boolean().default(true),
    accessDeniedMessage: z.string().max(500).default('Access denied. Please contact support.')
  })
};

/**
 * Create resolver with backend API integration for async validation
 */
export function createAsyncZodResolver<T extends z.ZodTypeAny>(
  schema: T,
  backendValidationConfig?: {
    endpoint: string;
    method?: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    transformRequest?: (data: any) => any;
    transformResponse?: (response: any) => BackendValidationError[];
  }
): Resolver<any, FieldValues> {
  return async (values, context, resolverOptions) => {
    // First run client-side Zod validation
    const clientValidation = await createZodResolver(schema)(values, context, resolverOptions);
    
    // If client validation fails, return early
    if (clientValidation.errors && Object.keys(clientValidation.errors).length > 0) {
      return clientValidation;
    }

    // Run server-side validation if configured
    if (backendValidationConfig && context?.shouldUseNativeValidation === false) {
      try {
        const requestData = backendValidationConfig.transformRequest?.(values) || values;
        
        const response = await fetch(backendValidationConfig.endpoint, {
          method: backendValidationConfig.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...backendValidationConfig.headers
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          const backendErrors = backendValidationConfig.transformResponse?.(errorData) || errorData.errors || [];
          
          // Transform backend errors to RHF format
          const rhfErrors: FieldErrors = {};
          backendErrors.forEach((error: BackendValidationError) => {
            if (error.field) {
              rhfErrors[error.field] = {
                type: 'server',
                message: error.message
              };
            }
          });

          return {
            values: {},
            errors: rhfErrors
          };
        }
      } catch (error) {
        console.error('Backend validation error:', error);
        // Fall back to client validation on network errors
      }
    }

    return clientValidation;
  };
}

/**
 * Utility to create form resolver with common configurations
 */
export function createFormResolver<T extends z.ZodTypeAny>(
  schema: T,
  config: {
    mode?: 'client' | 'server' | 'hybrid';
    backendEndpoint?: string;
    transformFieldNames?: boolean;
    customErrorMessages?: Record<string, string>;
  } = {}
): Resolver<any, FieldValues> {
  const resolverOptions: ResolverOptions = {
    transformFieldNames: config.transformFieldNames ? 
      (fieldName: string) => fieldName.replace(/([A-Z])/g, '_$1').toLowerCase() : 
      undefined,
    transformErrorMessage: config.customErrorMessages ?
      (message: string, field: string) => config.customErrorMessages![field] || message :
      undefined,
  };

  if (config.mode === 'server' || config.mode === 'hybrid') {
    return createAsyncZodResolver(schema, {
      endpoint: config.backendEndpoint || '/api/validate',
      transformRequest: (data) => ({ 
        ...data, 
        _validationMode: config.mode 
      })
    });
  }

  return createZodResolver(schema, resolverOptions);
}

/**
 * Real-time validation hook for async field validation
 */
export function useAsyncFieldValidation(
  fieldName: string,
  value: any,
  validationEndpoint: string,
  options: {
    debounceMs?: number;
    enabled?: boolean;
    onValidationChange?: (isValid: boolean, error?: string) => void;
  } = {}
) {
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isValid, setIsValid] = React.useState<boolean | null>(null);
  
  const debouncedValue = React.useMemo(() => {
    if (!options.debounceMs) return value;
    
    const timeoutId = setTimeout(() => {
      // This will be handled by the effect below
    }, options.debounceMs);
    
    return () => clearTimeout(timeoutId);
  }, [value, options.debounceMs]);

  React.useEffect(() => {
    if (!options.enabled || !value || !validationEndpoint) return;

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      setValidationError(null);
      
      try {
        const response = await fetch(validationEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            field: fieldName,
            value,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setIsValid(result.valid);
          setValidationError(result.error || null);
          options.onValidationChange?.(result.valid, result.error);
        } else {
          const errorData = await response.json();
          setIsValid(false);
          setValidationError(errorData.message || 'Validation failed');
          options.onValidationChange?.(false, errorData.message);
        }
      } catch (error) {
        console.error('Async validation error:', error);
        setIsValid(false);
        setValidationError('Network error during validation');
        options.onValidationChange?.(false, 'Network error during validation');
      } finally {
        setIsValidating(false);
      }
    }, options.debounceMs || 500);

    return () => clearTimeout(timeoutId);
  }, [value, fieldName, validationEndpoint, options]);

  return {
    isValidating,
    validationError,
    isValid,
  };
}

/**
 * Business-specific validation schemas that align with your backend
 */
export const businessValidationSchemas = {
  /**
   * Product creation validation (matches backend product validation)
   */
  createProduct: z.object({
    name: z.string()
      .min(3, 'Product name must be at least 3 characters')
      .max(200, 'Product name cannot exceed 200 characters')
      .trim(),
    description: z.string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description cannot exceed 2000 characters')
      .trim(),
    category: z.string()
      .min(1, 'Category is required')
      .max(100, 'Category cannot exceed 100 characters'),
    price: z.number()
      .positive('Price must be positive')
      .max(999999.99, 'Price cannot exceed 999,999.99'),
    currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
      .default('USD'),
    tags: z.array(z.string().max(50))
      .max(20, 'Cannot have more than 20 tags')
      .optional()
      .default([]),
    images: z.array(z.string().url())
      .max(10, 'Cannot have more than 10 images')
      .optional()
      .default([]),
    specifications: z.record(z.string(), z.string())
      .optional()
      .default({}),
    isActive: z.boolean().default(true),
    requiresApproval: z.boolean().default(false)
  }),

  /**
   * Certificate creation validation (matches backend certificate validation)
   */
  createCertificate: z.object({
    recipientName: z.string()
      .min(2, 'Recipient name must be at least 2 characters')
      .max(100, 'Recipient name cannot exceed 100 characters')
      .trim(),
    recipientEmail: z.string()
      .email('Must be a valid email address')
      .toLowerCase(),
    productId: validationSchemas.mongoId,
    productName: z.string()
      .min(1, 'Product name is required')
      .max(200, 'Product name cannot exceed 200 characters'),
    template: z.string()
      .min(1, 'Template is required')
      .max(100, 'Template name cannot exceed 100 characters'),
    expiryDate: validationSchemas.optionalDate,
    customFields: z.record(z.string(), z.any())
      .optional()
      .default({}),
    metadata: z.object({
      orderId: z.string().optional(),
      integrationSource: z.enum(['shopify', 'woocommerce', 'wix', 'manual']).optional(),
    }).optional()
  }),

  /**
   * Vote submission validation (matches backend vote validation)
   */
  submitVote: z.object({
    proposalId: validationSchemas.mongoId,
    productId: validationSchemas.mongoId,
    voteType: z.enum(['approve', 'reject', 'abstain']),
    comments: z.string()
      .max(500, 'Comments cannot exceed 500 characters')
      .optional(),
    confidence: z.number()
      .min(1, 'Confidence must be at least 1')
      .max(10, 'Confidence cannot exceed 10')
      .optional(),
    isAnonymous: z.boolean().default(false)
  }),

  /**
   * Integration configuration validation (matches backend integration validation)
   */
  configureIntegration: z.object({
    type: z.enum(['shopify', 'woocommerce', 'wix', 'api']),
    name: z.string()
      .min(2, 'Integration name must be at least 2 characters')
      .max(100, 'Integration name cannot exceed 100 characters'),
    config: z.record(z.string(), z.any()),
    isActive: z.boolean().default(true),
    autoSync: z.boolean().default(false),
    syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual'])
      .default('daily'),
    webhookUrl: validationSchemas.optionalUrl
  }),

  /**
   * Manufacturer profile validation (matches backend manufacturer validation)
   */
  updateManufacturerProfile: z.object({
    name: validationSchemas.businessName,
    description: validationSchemas.optionalLongText,
    industry: validationSchemas.industry,
    servicesOffered: z.array(z.string().max(100))
      .max(20, 'Cannot offer more than 20 services')
      .optional()
      .default([]),
    moq: z.number().int().min(1).optional(),
    contactEmail: validationSchemas.email.optional().or(z.literal('')),
    country: validationSchemas.optionalShortText,
    establishedYear: z.number()
      .int()
      .min(1800)
      .max(new Date().getFullYear())
      .optional(),
    certifications: z.array(z.string().max(200))
      .max(10, 'Cannot have more than 10 certifications')
      .optional()
      .default([]),
    website: validationSchemas.optionalUrl,
    socialMedia: z.object({
      linkedin: validationSchemas.optionalUrl,
      twitter: validationSchemas.optionalUrl,
      instagram: validationSchemas.optionalUrl,
    }).optional()
  }),

  /**
   * Brand settings validation (matches backend brand validation)
   */
  updateBrandSettings: z.object({
    themeColor: validationSchemas.hexColor,
    logoUrl: validationSchemas.optionalUrl,
    bannerImages: z.array(validationSchemas.url)
      .max(5, 'Cannot have more than 5 banner images')
      .optional()
      .default([]),
    customCss: z.string()
      .max(10000, 'Custom CSS cannot exceed 10,000 characters')
      .optional()
      .or(z.literal('')),
    subdomain: validationSchemas.subdomain.optional(),
    customDomain: z.string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, 'Must be a valid domain name')
      .optional()
      .or(z.literal('')),
    enableSsl: z.boolean().default(true),
    certificateWallet: validationSchemas.ethereumAddress,
    seoSettings: z.object({
      title: z.string().max(100).optional(),
      description: z.string().max(200).optional(),
      keywords: z.array(z.string().max(50)).max(10).optional().default([]),
    }).optional()
  })
};

/**
 * Create a resolver with real-time validation integration
 */
export function createRealtimeValidationResolver<T extends z.ZodTypeAny>(
  schema: T,
  realtimeConfig?: {
    fields: Record<string, {
      endpoint: string;
      debounceMs?: number;
      enabled?: boolean;
    }>;
  }
): Resolver<any, FieldValues> {
  return createZodResolver(schema, {
    backendValidation: realtimeConfig ? {
      enabled: true,
      debounceMs: 500,
      validateOnBlur: true
    } : undefined
  });
}

// Export commonly used validators
export { zodResolver };