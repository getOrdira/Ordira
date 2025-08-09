// src/validation/brandAccount.validation.ts
import Joi from 'joi';
import { commonSchemas, customJoi } from '../middleware/validation.middleware';

/**
 * Enhanced brand account validation with comprehensive business logic and security
 */

// Main brand account update schema
export const updateBrandAccountSchema = Joi.object({
  // Profile customization
  profilePictureUrl: commonSchemas.url
    .custom((value, helpers) => {
      // Validate image URL format
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => 
        value.toLowerCase().includes(ext)
      );
      
      // Allow common image hosting domains
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

  // Business description with rich validation
  description: commonSchemas.longText
    .min(10)
    .max(2000)
    .custom((value, helpers) => {
      // Check for minimum meaningful content
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 5) {
        return helpers.error('string.minWords');
      }
      
      // Check for spam patterns
      const spamPatterns = [
        /(.)\1{4,}/g, // Repeated characters (5+ times)
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

  // Industry validation with comprehensive list
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
    .messages({
      'any.only': 'Please select a valid industry from the provided options'
    })
    .optional(),

  // Contact email with business validation
  contactEmail: commonSchemas.email
    .custom((value, helpers) => {
      // Should ideally match the business domain
      const context = helpers.state.ancestors[0];
      const mainEmail = context?.email;
      
      if (mainEmail) {
        const mainDomain = mainEmail.split('@')[1];
        const contactDomain = value.split('@')[1];
        
        // Warn if domains don't match (but don't fail)
        if (mainDomain !== contactDomain) {
          helpers.state.path.push('domainMismatch');
        }
      }
      
      return value;
    })
    .optional(),

  // Social media URLs with platform validation
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
    .optional()
    .messages({
      'array.max': 'Maximum 10 social media URLs allowed',
      'array.unique': 'Duplicate social media URLs are not allowed'
    }),

  // Ethereum wallet address validation
  walletAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .custom((value, helpers) => {
      // Additional Ethereum address validation
      const address = value.toLowerCase();
      
      // Check for common invalid addresses
      const invalidAddresses = [
        '0x0000000000000000000000000000000000000000', // Zero address
        '0x000000000000000000000000000000000000dead', // Dead address
        '0xffffffffffffffffffffffffffffffffffffffff'  // Max address
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

  // Business location information
  headquarters: Joi.object({
    country: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s\-']+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Country name can only contain letters, spaces, hyphens, and apostrophes'
      }),
    
    city: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s\-'\.]+$/)
      .optional(),
    
    state: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional(),
    
    postalCode: Joi.string()
      .trim()
      .min(3)
      .max(20)
      .pattern(/^[a-zA-Z0-9\s\-]+$/)
      .optional(),
    
    address: commonSchemas.mediumText
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

  // Business metrics and information
  companySize: Joi.string()
    .valid(
      '1', '2-10', '11-50', '51-200', '201-500', 
      '501-1000', '1001-5000', '5000+'
    )
    .optional(),

  foundedYear: Joi.number()
    .integer()
    .min(1800)
    .max(new Date().getFullYear())
    .optional()
    .messages({
      'number.min': 'Founded year cannot be before 1800',
      'number.max': 'Founded year cannot be in the future'
    }),

  // Business verification documents
  businessLicense: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional(),

  certifications: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(2)
        .max(200)
    )
    .max(20)
    .optional(),

  // Contact preferences
  preferredContactMethod: Joi.string()
    .valid('email', 'phone', 'message', 'video_call')
    .default('email')
    .optional(),

  businessHours: Joi.object({
    timezone: Joi.string().optional(),
    monday: Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      closed: Joi.boolean().default(false)
    }).optional(),
    tuesday: Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      closed: Joi.boolean().default(false)
    }).optional(),
    // ... similar for other days
  }).optional(),

  // Marketing preferences
  marketingPreferences: Joi.object({
    allowEmails: Joi.boolean().default(true),
    allowSms: Joi.boolean().default(false),
    allowPushNotifications: Joi.boolean().default(true),
    interestedInPartnership: Joi.boolean().default(false),
    interestedInEvents: Joi.boolean().default(true)
  }).optional(),

  // Custom fields for specific industries
  customFields: Joi.object()
    .pattern(
      Joi.string().min(1).max(50),
      Joi.alternatives().try(
        Joi.string().max(500),
        Joi.number(),
        Joi.boolean(),
        Joi.array().items(Joi.string().max(100)).max(10)
      )
    )
    .max(20)
    .optional()
});

// Simplified schema for quick profile updates
export const quickUpdateSchema = Joi.object({
  profilePictureUrl: commonSchemas.optionalUrl,
  description: commonSchemas.optionalLongText.max(1000),
  contactEmail: commonSchemas.optionalEmail
});

// Schema for business verification submission
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

// Schema for account deactivation
export const deactivateAccountSchema = Joi.object({
  reason: Joi.string()
    .valid(
      'temporary_break', 'switching_platforms', 'cost_concerns',
      'feature_limitations', 'poor_experience', 'business_closure', 'other'
    )
    .required(),
  
  feedback: Joi.string()
    .max(2000)
    .optional(),
  
  deleteData: Joi.boolean()
    .default(false),
  
  confirmPassword: Joi.string().required()
});

// Export all schemas
export const brandAccountValidationSchemas = {
  updateBrandAccount: updateBrandAccountSchema,
  quickUpdate: quickUpdateSchema,
  businessVerification: businessVerificationSchema,
  deactivateAccount: deactivateAccountSchema
};
