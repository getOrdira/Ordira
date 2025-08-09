// src/validation/auth.validation.ts
import Joi from 'joi';
import { commonSchemas, customJoi } from '../middleware/validation.middleware';

/**
 * Enhanced authentication validation schemas with comprehensive security and business logic
 */

// Business registration validation
export const registerBusinessSchema = Joi.object({
  // Personal information
  firstName: commonSchemas.shortText
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.pattern.base': 'First name can only contain letters, spaces, apostrophes, and hyphens'
    }),
  
  lastName: commonSchemas.shortText
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.pattern.base': 'Last name can only contain letters, spaces, apostrophes, and hyphens'
    }),
  
  dateOfBirth: commonSchemas.dateOfBirth
    .custom((value, helpers) => {
      const age = Math.floor((Date.now() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        return helpers.error('date.minAge');
      }
      if (age > 120) {
        return helpers.error('date.maxAge');
      }
      return value;
    })
    .messages({
      'date.minAge': 'You must be at least 18 years old to register a business',
      'date.maxAge': 'Please enter a valid date of birth'
    }),

  // Contact information
  email: commonSchemas.businessEmail
    .custom((value, helpers) => {
      // Additional business email validation
      const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
      const domain = value.split('@')[1]?.toLowerCase();
      
      // Warning for personal emails (not blocking, just noting)
      if (personalDomains.includes(domain)) {
        // Add to context for potential warning in response
        helpers.state.path.push('personalEmail');
      }
      
      return value;
    }),
  
  phone: commonSchemas.phone
    .custom((value, helpers) => {
      // Remove common formatting characters for validation
      const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
      if (cleaned.length < 10 || cleaned.length > 15) {
        return helpers.error('string.phoneLength');
      }
      return value;
    })
    .messages({
      'string.phoneLength': 'Phone number must be between 10 and 15 digits'
    }),

  // Business information
  businessName: commonSchemas.businessName
    .min(2)
    .max(100)
    .custom((value, helpers) => {
      // Check for prohibited business names
      const prohibited = ['test', 'demo', 'example', 'sample', 'admin', 'api', 'www'];
      const lowerName = value.toLowerCase();
      
      if (prohibited.some(word => lowerName.includes(word))) {
        return helpers.error('string.prohibitedName');
      }
      
      // Ensure it contains at least one letter
      if (!/[a-zA-Z]/.test(value)) {
        return helpers.error('string.requiresLetter');
      }
      
      return value;
    })
    .messages({
      'string.prohibitedName': 'Business name cannot contain prohibited words',
      'string.requiresLetter': 'Business name must contain at least one letter'
    }),
  
  regNumber: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .alphanum()
    .optional()
    .messages({
      'string.alphanum': 'Registration number can only contain letters and numbers'
    }),
  
  taxId: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9\-]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Tax ID can only contain letters, numbers, and hyphens'
    }),
  
  address: commonSchemas.mediumText
    .min(10)
    .max(500)
    .custom((value, helpers) => {
      // Basic address validation - should contain numbers and letters
      if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
        return helpers.error('string.invalidAddress');
      }
      return value;
    })
    .messages({
      'string.invalidAddress': 'Address must contain both numbers and letters'
    }),

  // Security
  password: commonSchemas.password
    .custom((value, helpers) => {
      // Additional password security checks
      const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
      if (commonPasswords.some(common => value.toLowerCase().includes(common))) {
        return helpers.error('string.commonPassword');
      }
      
      // Check for personal info in password (basic check)
      const context = helpers.state.ancestors[0];
      const firstName = context?.firstName?.toLowerCase();
      const lastName = context?.lastName?.toLowerCase();
      const businessName = context?.businessName?.toLowerCase();
      
      if (firstName && value.toLowerCase().includes(firstName) ||
          lastName && value.toLowerCase().includes(lastName) ||
          businessName && value.toLowerCase().includes(businessName.split(' ')[0])) {
        return helpers.error('string.personalInfoInPassword');
      }
      
      return value;
    })
    .messages({
      'string.commonPassword': 'Password is too common and easily guessed',
      'string.personalInfoInPassword': 'Password should not contain personal information'
    }),

  // Optional terms acceptance
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions'
    }),
  
  acceptPrivacy: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the privacy policy'
    }),

  // Marketing preferences
  allowMarketing: Joi.boolean().default(false).optional(),
  
  // Referral tracking
  referralCode: Joi.string()
    .trim()
    .alphanum()
    .min(3)
    .max(20)
    .optional(),

  // Business metadata
  industry: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .valid(
      'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
      'Education', 'Real Estate', 'Food & Beverage', 'Fashion',
      'Automotive', 'Construction', 'Media', 'Travel', 'Sports',
      'Beauty', 'Agriculture', 'Energy', 'Consulting', 'Other'
    )
    .optional(),
  
  expectedMonthlyVolume: Joi.string()
    .valid('0-100', '100-1000', '1000-10000', '10000+')
    .optional()
});

// Business verification validation
export const verifyBusinessSchema = Joi.object({
  businessId: commonSchemas.mongoId,
  
  emailCode: Joi.string()
    .alphanum()
    .length(6)
    .uppercase()
    .required()
    .messages({
      'string.length': 'Email verification code must be exactly 6 characters',
      'string.alphanum': 'Email verification code can only contain letters and numbers'
    }),
  
  phoneCode: Joi.string()
    .alphanum()
    .length(6)
    .uppercase()
    .optional()
    .messages({
      'string.length': 'Phone verification code must be exactly 6 characters',
      'string.alphanum': 'Phone verification code can only contain letters and numbers'
    }),

  // Device fingerprinting for security
  deviceFingerprint: Joi.string()
    .optional()
    .messages({
      'string.base': 'Invalid device fingerprint'
    })
});

// Business login validation
export const loginBusinessSchema = Joi.object({
  emailOrPhone: Joi.alternatives()
    .try(
      commonSchemas.email,
      commonSchemas.phone
    )
    .required()
    .messages({
      'alternatives.match': 'Must be a valid email address or phone number'
    }),
  
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.max': 'Password is too long'
    }),

  // Security features
  rememberMe: Joi.boolean().default(false).optional(),
  
  deviceFingerprint: Joi.string().optional(),
  
  captchaToken: Joi.string()
    .when('$requireCaptcha', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Captcha verification is required'
    })
});

// User (customer) registration validation
export const registerUserSchema = Joi.object({
  email: commonSchemas.email
    .custom((value, helpers) => {
      // Check for plus addressing and normalize
      const [localPart, domain] = value.split('@');
      const normalizedLocal = localPart.split('+')[0];
      const normalizedEmail = `${normalizedLocal}@${domain}`;
      
      // Store normalized version for deduplication
      helpers.state.path.push('normalized');
      return normalizedEmail;
    }),
  
  password: commonSchemas.password
    .custom((value, helpers) => {
      // Less strict for customer accounts but still secure
      const commonPasswords = ['password', '123456', 'qwerty'];
      if (commonPasswords.includes(value.toLowerCase())) {
        return helpers.error('string.commonPassword');
      }
      return value;
    })
    .messages({
      'string.commonPassword': 'Please choose a more secure password'
    }),

  // Optional profile information
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional(),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional(),

  // Marketing and preferences
  allowMarketing: Joi.boolean().default(false).optional(),
  preferredLanguage: Joi.string().valid('en', 'es', 'fr', 'de').default('en').optional(),
  
  // Terms acceptance
  acceptTerms: Joi.boolean().valid(true).required(),
  
  // Referral tracking
  referralCode: Joi.string().trim().alphanum().min(3).max(20).optional()
});

// User verification validation
export const verifyUserSchema = Joi.object({
  email: commonSchemas.email,
  
  emailCode: Joi.string()
    .alphanum()
    .length(6)
    .uppercase()
    .required()
    .messages({
      'string.length': 'Verification code must be exactly 6 characters'
    }),

  // Optional device tracking
  deviceFingerprint: Joi.string().optional()
});

// User login validation
export const loginUserSchema = Joi.object({
  email: commonSchemas.email,
  
  password: Joi.string()
    .min(1)
    .max(128)
    .required(),

  rememberMe: Joi.boolean().default(false).optional(),
  deviceFingerprint: Joi.string().optional(),
  
  captchaToken: Joi.string()
    .when('$requireCaptcha', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
});

// Password reset validation
export const forgotPasswordSchema = Joi.object({
  emailOrPhone: Joi.alternatives()
    .try(commonSchemas.email, commonSchemas.phone)
    .required(),
  
  captchaToken: Joi.string().optional()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .alphanum()
    .min(32)
    .max(128)
    .required(),
  
  newPassword: commonSchemas.password,
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
});

// Change password validation (for authenticated users)
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: commonSchemas.password,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match'
    })
});

// Resend verification code
export const resendVerificationSchema = Joi.object({
  email: commonSchemas.email.optional(),
  phone: commonSchemas.phone.optional(),
  businessId: commonSchemas.mongoId.optional()
}).or('email', 'phone', 'businessId');

// Two-factor authentication setup
export const setupTwoFactorSchema = Joi.object({
  method: Joi.string().valid('sms', 'email', 'app').required(),
  phoneNumber: commonSchemas.phone
    .when('method', {
      is: 'sms',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
});

export const verifyTwoFactorSchema = Joi.object({
  code: Joi.string()
    .alphanum()
    .length(6)
    .required(),
  
  backupCode: Joi.string()
    .alphanum()
    .length(8)
    .optional()
}).xor('code', 'backupCode');

// Account recovery validation
export const accountRecoverySchema = Joi.object({
  email: commonSchemas.email,
  businessName: Joi.string().min(2).max(100).optional(),
  phone: commonSchemas.phone.optional(),
  lastKnownPassword: Joi.string().optional(),
  recoveryAnswers: Joi.array()
    .items(Joi.string().max(200))
    .max(3)
    .optional()
});

// Export all schemas for easy importing
export const authValidationSchemas = {
  registerBusiness: registerBusinessSchema,
  verifyBusiness: verifyBusinessSchema,
  loginBusiness: loginBusinessSchema,
  registerUser: registerUserSchema,
  verifyUser: verifyUserSchema,
  loginUser: loginUserSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
  resendVerification: resendVerificationSchema,
  setupTwoFactor: setupTwoFactorSchema,
  verifyTwoFactor: verifyTwoFactorSchema,
  accountRecovery: accountRecoverySchema
};
