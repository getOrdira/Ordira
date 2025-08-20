// src/validation/brandAccount.validation.ts
import Joi from 'joi';
import { commonSchemas } from '../middleware/validation.middleware';

/**
 * Enhanced brand account validation aligned with controller and service methods
 */

// Main brand account update schema (aligns with updateBrandProfile controller method)
export const updateBrandAccountSchema = Joi.object({
  // Basic profile fields
  profilePictureUrl: commonSchemas.url
    .custom((value, helpers) => {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => 
        value.toLowerCase().includes(ext)
      );
      
      const allowedDomains = [
        'amazonaws.com', 'cloudinary.com', 'imgix.com', 
        'cloudflare.com', 'googleapis.com', 'firebase.com'
      ];
      
      const isAllowedDomain = allowedDomains.some(domain => 
        value.toLowerCase().includes(domain)
      );
      
      if (!hasImageExtension && !isAllowedDomain) {
        return helpers.error('string.invalidImageUrl');
      }
      
      return value;
    })
    .messages({
      'string.invalidImageUrl': 'Profile picture must be a valid image URL'
    })
    .optional(),

  description: commonSchemas.longText
    .min(10)
    .max(2000)
    .custom((value, helpers) => {
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 5) {
        return helpers.error('string.minWords');
      }
      
      const spamPatterns = [
        /(.)\1{4,}/g,
        /\b(free|sale|discount|offer|deal)\b.*\b(now|today|urgent)\b/i,
        /(click here|visit now|limited time)/i
      ];
      
      if (spamPatterns.some(pattern => pattern.test(value))) {
        return helpers.error('string.spamContent');
      }
      
      return value;
    })
    .messages({
      'string.minWords': 'Description must contain at least 5 words',
      'string.spamContent': 'Description contains prohibited promotional language'
    })
    .optional(),

  industry: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .valid(
      // Technology & Digital
      'Software Development', 'Web Development', 'Mobile Apps', 'SaaS',
      'E-commerce', 'Digital Marketing', 'Cybersecurity', 'AI/ML',
      'Blockchain', 'Gaming', 'Fintech', 'Edtech', 'Healthtech',
      
      // Traditional Industries
      'Healthcare', 'Finance', 'Banking', 'Insurance', 'Real Estate',
      'Construction', 'Manufacturing', 'Automotive', 'Aerospace',
      'Energy', 'Oil & Gas', 'Mining', 'Agriculture', 'Food & Beverage',
      
      // Services
      'Consulting', 'Legal Services', 'Accounting', 'Marketing & Advertising',
      'Public Relations', 'Design', 'Architecture', 'Engineering',
      'Transportation', 'Logistics', 'Supply Chain',
      
      // Retail & Consumer
      'Retail', 'Fashion', 'Beauty & Cosmetics', 'Jewelry', 'Sports & Fitness',
      'Travel & Tourism', 'Hospitality', 'Entertainment', 'Media',
      'Publishing', 'Photography', 'Event Planning',
      
      // Education & Non-Profit
      'Education', 'Training', 'Non-Profit', 'Government', 'Research',
      
      // Other
      'Other'
    )
    .optional(),

  contactEmail: commonSchemas.email
    .custom((value, helpers) => {
      const context = helpers.state.ancestors[0];
      const mainEmail = context?.email;
      
      if (mainEmail) {
        const mainDomain = mainEmail.split('@')[1];
        const contactDomain = value.split('@')[1];
        
        if (mainDomain !== contactDomain) {
          helpers.state.path.push('domainMismatch');
        }
      }
      
      return value;
    })
    .optional(),

  socialUrls: Joi.array()
    .items(
      Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .custom((value, helpers) => {
          const socialPlatforms = [
            'facebook.com', 'twitter.com', 'x.com', 'linkedin.com',
            'instagram.com', 'youtube.com', 'tiktok.com', 'snapchat.com',
            'pinterest.com', 'github.com', 'behance.net', 'dribbble.com',
            'medium.com', 'discord.gg', 'telegram.org', 'whatsapp.com', 'inspired.ch'
          ];
          
          const isValidSocial = socialPlatforms.some(platform => 
            value.toLowerCase().includes(platform)
          );
          
          if (!isValidSocial) {
            return helpers.error('string.invalidSocialPlatform');
          }
          
          return value;
        })
        .messages({
          'string.invalidSocialPlatform': 'URL must be from a recognized social media platform'
        })
    )
    .max(10)
    .unique()
    .optional(),

  walletAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .custom((value, helpers) => {
      const address = value.toLowerCase();
      const invalidAddresses = [
        '0x0000000000000000000000000000000000000000',
        '0x000000000000000000000000000000000000dead',
        '0xffffffffffffffffffffffffffffffffffffffff'
      ];
      
      if (invalidAddresses.includes(address)) {
        return helpers.error('string.invalidEthereumAddress');
      }
      
      return value;
    })
    .messages({
      'string.pattern.base': 'Must be a valid Ethereum wallet address (42 characters starting with 0x)',
      'string.invalidEthereumAddress': 'Invalid or restricted Ethereum address'
    })
    .optional(),

  // Enhanced fields matching controller expectations
  headquarters: Joi.object({
    country: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s\-']+$/)
      .optional(),
    city: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s\-'\.]+$/)
      .optional(),
    address: Joi.string()
      .trim()
      .min(5)
      .max(300)
      .optional(),
    timezone: Joi.string()
      .valid(
        'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
        'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney'
      )
      .optional()
  }).optional(),

  businessInformation: Joi.object({
    establishedYear: Joi.number()
      .integer()
      .min(1800)
      .max(new Date().getFullYear())
      .optional(),
    employeeCount: Joi.string()
      .valid('1-10', '11-50', '51-200', '201-1000', '1000+')
      .optional(),
    annualRevenue: Joi.string()
      .valid('0-100k', '100k-1M', '1M-10M', '10M-100M', '100M+')
      .optional(),
    businessLicense: Joi.string()
      .max(50)
      .optional(),
    certifications: Joi.array()
      .items(Joi.string().max(100))
      .max(20)
      .optional()
  }).optional(),

  communicationPreferences: Joi.object({
    preferredMethod: Joi.string()
      .valid('email', 'phone', 'slack', 'teams')
      .optional(),
    responseTime: Joi.string()
      .valid('immediate', '1-hour', '4-hours', '24-hours', 'next-business-day')
      .optional(),
    languages: Joi.array()
      .items(Joi.string().max(20))
      .max(10)
      .optional()
  }).optional(),

  marketingPreferences: Joi.object({
    allowEmails: Joi.boolean().optional(),
    allowSms: Joi.boolean().optional(),
    allowPushNotifications: Joi.boolean().optional()
  }).optional(),

  // Premium/Enterprise features (plan validation handled in controller)
  customDomain: Joi.string().domain().optional(),
  advancedAnalytics: Joi.boolean().optional(),
  prioritySupport: Joi.boolean().optional(),
  whiteLabel: Joi.boolean().optional(),
  customBranding: Joi.boolean().optional(),
  dedicatedSupport: Joi.boolean().optional(),

  // Internal fields for tracking
  lastUpdatedBy: Joi.string().optional(),
  lastUpdateSource: Joi.string().valid('profile_page', 'api', 'admin').optional(),
  updateMetadata: Joi.object({
    fieldsChanged: Joi.array().items(Joi.string()).optional(),
    updateReason: Joi.string().optional(),
    ipAddress: Joi.string().optional(),
    userAgent: Joi.string().optional()
  }).optional()
});

// Schema for verification submission (aligns with submitVerification controller method)
export const submitVerificationSchema = Joi.object({
  businessLicense: Joi.string()
    .required()
    .messages({
      'any.required': 'Business license is required'
    }),
  
  taxDocument: Joi.string().optional(),
  
  proofOfAddress: Joi.string().optional(),
  
  additionalDocuments: Joi.array()
    .items(Joi.string())
    .max(10)
    .optional(),
  
  verificationNotes: Joi.string()
    .max(1000)
    .trim()
    .optional(),

  // Enhanced verification fields
  type: Joi.string()
    .valid('business', 'identity', 'address')
    .default('business')
    .optional(),

  submittedAt: Joi.date().optional(),
  submissionSource: Joi.string()
    .valid('brand_account', 'api', 'mobile')
    .default('brand_account')
    .optional(),
  planLevel: Joi.string()
    .valid('foundation', 'growth', 'premium', 'enterprise')
    .optional(),
  submissionMetadata: Joi.object({
    ipAddress: Joi.string().optional(),
    userAgent: Joi.string().optional(),
    documentCount: Joi.number().optional()
  }).optional()
});

// Schema for account deactivation (aligns with deactivateAccount controller method)
export const deactivateAccountSchema = Joi.object({
  reason: Joi.string()
    .valid(
      'business_closure',
      'switching_platforms', 
      'too_expensive',
      'not_meeting_needs',
      'poor_support',
      'technical_issues',
      'security_concerns',
      'other'
    )
    .required(),
  
  feedback: Joi.string()
    .max(2000)
    .trim()
    .optional(),
  
  deleteData: Joi.boolean()
    .default(false)
    .optional(),
  
  confirmPassword: Joi.string()
    .required(),

  // Additional feedback fields matching controller
  whatWouldMakeYouStay: Joi.string()
    .max(500)
    .optional(),
  
  alternativePlatform: Joi.string()
    .max(100)
    .optional(),
  
  overallSatisfaction: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional(),

  // Internal tracking fields
  deactivatedBy: Joi.string().optional(),
  deactivationSource: Joi.string()
    .valid('self_service', 'admin', 'automated')
    .default('self_service')
    .optional(),

  // Confirmation flags
  confirmDataDeletion: Joi.boolean()
    .when('deleteData', {
      is: true,
      then: Joi.boolean().valid(true).required(),
      otherwise: Joi.boolean().optional()
    }),
  
  confirmDeactivation: Joi.boolean()
    .valid(true)
    .required()
});

// Schema for data export (aligns with exportAccountData controller method)
export const exportAccountDataSchema = Joi.object({
  format: Joi.string()
    .valid('json', 'csv', 'pdf', 'xlsx', 'xml')
    .default('json')
    .optional(),
  
  includeAnalytics: Joi.boolean()
    .default(false)
    .optional(),
  
  includeHistory: Joi.boolean()
    .default(false)
    .optional(),
  
  anonymize: Joi.boolean()
    .default(false)
    .optional(),

  // Additional export options matching controller
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }).optional(),
  
  sections: Joi.array()
    .items(Joi.string().valid(
      'profile',
      'settings', 
      'verification',
      'analytics',
      'billing',
      'integrations',
      'certificates',
      'votes'
    ))
    .default(['profile', 'settings'])
    .optional(),
  
  compression: Joi.string()
    .valid('none', 'zip', 'gzip')
    .default('none')
    .optional()
});

// Query schema for analytics endpoint (aligns with getAccountAnalytics controller method)
export const analyticsQuerySchema = Joi.object({
  timeframe: Joi.string()
    .valid('7d', '30d', '90d', '1y')
    .default('30d')
    .optional(),
  
  includeEngagement: Joi.boolean()
    .default(true)
    .optional(),
  
  includeConversions: Joi.boolean()
    .default(false)
    .optional(),
  
  includeAdvancedMetrics: Joi.boolean()
    .default(false)
    .optional(),

  // Additional analytics options
  metrics: Joi.array()
    .items(Joi.string().valid(
      'engagement',
      'conversions', 
      'usage',
      'performance',
      'growth'
    ))
    .default(['engagement', 'usage'])
    .optional(),
  
  granularity: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  
  detailedBreakdown: Joi.boolean()
    .default(false)
    .optional()
});

// Simplified schema for quick profile updates
export const quickUpdateSchema = Joi.object({
  profilePictureUrl: commonSchemas.url.optional(),
  description: Joi.string().max(1000).optional(),
  contactEmail: commonSchemas.email.optional()
});

// Legacy schema maintained for backward compatibility
export const businessVerificationSchema = Joi.object({
  businessLicense: Joi.string().required(),
  taxDocument: Joi.string().optional(),
  proofOfAddress: Joi.string().optional(),
  additionalDocuments: Joi.array()
    .items(Joi.string().uri())
    .max(5)
    .optional(),
  verificationNotes: Joi.string()
    .max(1000)
    .optional()
});

// Export all schemas
export const brandAccountValidationSchemas = {
  updateBrandAccount: updateBrandAccountSchema,
  submitVerification: submitVerificationSchema,
  deactivateAccount: deactivateAccountSchema,
  exportAccountData: exportAccountDataSchema,
  analyticsQuery: analyticsQuerySchema,
  quickUpdate: quickUpdateSchema,
  businessVerification: businessVerificationSchema // Legacy support
};
