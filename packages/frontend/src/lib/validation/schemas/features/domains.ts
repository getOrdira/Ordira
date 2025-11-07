// src/lib/validation/schemas/features/domains.ts
// Frontend validation schemas for custom domains and subdomains.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'support',
  'help',
  'mail',
  'ftp',
  'blog',
  'news',
  'shop',
  'store',
  'app',
  'mobile',
  'dev',
  'test',
  'staging',
  'prod',
  'production',
  'cdn',
  'assets',
  'static',
  'media',
  'images',
  'js',
  'css',
  'files',
  'docs',
  'documentation',
  'status',
  'about',
  'contact',
  'privacy',
  'terms',
  'legal',
  'security',
  'team',
  'careers'
];

const BANNED_DOMAINS = ['example.com', 'test.com', 'localhost', '127.0.0.1', 'temp.com'];

const DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9](?:\.[a-z0-9][a-z0-9-]{0,61}[a-z0-9])*$/;
const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

const withInvalidMessage = (message: string, helpers: Joi.CustomHelpers) =>
  helpers.error('any.invalid', { message });

const domainNameSchema = Joi.string()
  .trim()
  .lowercase()
  .custom((value, helpers) => {
    if (!value) {
      return withInvalidMessage('Domain is required', helpers);
    }

    if (value.length < 3) {
      return withInvalidMessage('Domain must be at least 3 characters long', helpers);
    }

    if (value.length > 253) {
      return withInvalidMessage('Domain cannot exceed 253 characters', helpers);
    }

    if (BANNED_DOMAINS.includes(value)) {
      return withInvalidMessage('This domain is not allowed', helpers);
    }

    if (!DOMAIN_REGEX.test(value)) {
      return withInvalidMessage('Invalid domain format. Use only letters, numbers, and hyphens.', helpers);
    }

    if (value.includes('--')) {
      return withInvalidMessage('Domain cannot contain consecutive hyphens', helpers);
    }

    if (!value.includes('.')) {
      return withInvalidMessage('Domain must include a top-level domain (e.g., .com, .org)', helpers);
    }

    const tld = value.split('.').pop();
    if (!tld || tld.length < 2) {
      return withInvalidMessage('Invalid top-level domain', helpers);
    }

    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

const sanitizeSubdomainInput = (value: string): string => value.replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');

const subdomainNameSchema = Joi.string()
  .trim()
  .lowercase()
  .custom((input, helpers) => {
    const value = sanitizeSubdomainInput(input);

    if (!value) {
      return withInvalidMessage('Subdomain is required', helpers);
    }

    if (value.length < 3) {
      return withInvalidMessage('Subdomain must be at least 3 characters long', helpers);
    }

    if (value.length > 63) {
      return withInvalidMessage('Subdomain cannot exceed 63 characters', helpers);
    }

    if (!SUBDOMAIN_REGEX.test(value)) {
      return withInvalidMessage('Subdomain can only contain lowercase letters, numbers, and hyphens (no leading or trailing hyphen)', helpers);
    }

    if (RESERVED_SUBDOMAINS.includes(value)) {
      return withInvalidMessage('This subdomain is reserved', helpers);
    }

    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

const customDomainSchema: Joi.ObjectSchema<{ domain: string; excludeBusinessId?: string }> = Joi.object({
  domain: domainNameSchema.required(),
  excludeBusinessId: commonSchemas.optionalMongoId
});

const subdomainRequestSchema: Joi.ObjectSchema<{ subdomain: string; excludeBusinessId?: string }> = Joi.object({
  subdomain: subdomainNameSchema.required(),
  excludeBusinessId: commonSchemas.optionalMongoId
});

const generateSubdomainSuggestions = (input: string, count = 3): string[] => {
  const base = sanitizeSubdomainInput(input) || 'brand';
  const suggestions = new Set<string>();
  const ideaSeeds = ['app', 'shop', 'store', 'go'];
  ideaSeeds.forEach(seed => {
    if (suggestions.size >= count) {
      return;
    }

    const candidate = sanitizeSubdomainInput(`${base}-${seed}`);
    if (candidate && !RESERVED_SUBDOMAINS.includes(candidate) && candidate.length >= 3 && candidate.length <= 63) {
      suggestions.add(candidate);
    }
  });

  let counter = 1;
  while (suggestions.size < count && counter < 10) {
    const candidate = sanitizeSubdomainInput(`${base}-${counter}`);
    if (candidate && !RESERVED_SUBDOMAINS.includes(candidate) && candidate.length >= 3 && candidate.length <= 63) {
      suggestions.add(candidate);
    }
    counter += 1;
  }

  return Array.from(suggestions);
};

/**
 * Domain feature specific Joi schemas mirroring backend validation behaviour.
 */
export const domainsFeatureSchemas = {
  customDomain: customDomainSchema,
  subdomainRequest: subdomainRequestSchema
} as const;

export const domainSuggestionHelpers = {
  generateSubdomainSuggestions
} as const;
