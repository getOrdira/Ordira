// src/validation/user.validation.ts
import Joi from 'joi';

/**
 * Schema for user registration
 */
export const registerUserSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .custom((value, helpers) => {
      // Check for disposable email domains
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'temp-mail.org'
      ];
      
      const domain = value.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        return helpers.error('email.disposable');
      }
      
      return value;
    })
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required',
      'email.disposable': 'Disposable email addresses are not allowed'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Must be a valid phone number in international format'
    }),

  dateOfBirth: Joi.date()
    .max('now')
    .min('1900-01-01')
    .optional()
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.min': 'Date of birth must be after 1900'
    }),

  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    }),

  marketingConsent: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Marketing consent must be a boolean value'
    })
});

/**
 * Schema for user login
 */
export const loginUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),

  rememberMe: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Remember me must be a boolean value'
    }),

  twoFactorCode: Joi.string()
    .alphanum()
    .length(6)
    .optional()
    .messages({
      'string.alphanum': 'Two-factor code must be alphanumeric',
      'string.length': 'Two-factor code must be exactly 6 characters'
    })
});

/**
 * Schema for user verification
 */
export const verifyUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),

  verificationCode: Joi.string()
    .alphanum()
    .length(6)
    .required()
    .messages({
      'string.alphanum': 'Verification code must be alphanumeric',
      'string.length': 'Verification code must be exactly 6 characters',
      'any.required': 'Verification code is required'
    })
});

/**
 * Schema for updating user profile
 */
export const updateUserProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters'
    }),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Must be a valid phone number in international format'
    }),

  dateOfBirth: Joi.date()
    .max('now')
    .min('1900-01-01')
    .optional()
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.min': 'Date of birth must be after 1900'
    }),

  bio: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),

  location: Joi.object({
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    timezone: Joi.string().trim().max(50).optional()
  }).optional(),

  preferences: Joi.object({
    language: Joi.string()
      .valid('en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko')
      .default('en')
      .optional(),
    
    theme: Joi.string()
      .valid('light', 'dark', 'auto')
      .default('auto')
      .optional(),
    
    notifications: Joi.object({
      email: Joi.boolean().default(true).optional(),
      push: Joi.boolean().default(true).optional(),
      sms: Joi.boolean().default(false).optional()
    }).optional()
  }).optional(),

  socialLinks: Joi.object({
    linkedin: Joi.string().uri().optional().allow(''),
    twitter: Joi.string().uri().optional().allow(''),
    website: Joi.string().uri().optional().allow('')
  }).optional()
});

/**
 * Schema for changing password
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match new password',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Schema for forgot password
 */
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    })
});

/**
 * Schema for reset password
 */
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .alphanum()
    .length(32)
    .required()
    .messages({
      'string.alphanum': 'Reset token must be alphanumeric',
      'string.length': 'Reset token must be exactly 32 characters',
      'any.required': 'Reset token is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match new password',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Schema for user route parameters
 */
export const userParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId',
      'any.required': 'User ID is required'
    }),

  sessionId: Joi.string()
    .alphanum()
    .length(32)
    .optional()
    .messages({
      'string.alphanum': 'Session ID must be alphanumeric',
      'string.length': 'Session ID must be exactly 32 characters'
    }),

  exportId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Export ID must be a valid MongoDB ObjectId'
    })
});

/**
 * Schema for listing users with query parameters
 */
export const listUsersQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),

  status: Joi.string()
    .valid('active', 'inactive', 'pending', 'suspended', 'deleted')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, pending, suspended, deleted'
    }),

  startDate: Joi.date()
    .optional(),

  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.greater': 'End date must be after start date'
    }),

  sortBy: Joi.string()
    .valid('firstName', 'lastName', 'email', 'createdAt', 'lastLoginAt', 'status')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: firstName, lastName, email, createdAt, lastLoginAt, status'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    }),

  includeDeleted: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Include deleted must be a boolean value'
    })
});

/**
 * Schema for account settings
 */
export const accountSettingsSchema = Joi.object({
  privacy: Joi.object({
    profileVisibility: Joi.string()
      .valid('public', 'private', 'contacts')
      .default('public')
      .optional(),
    
    showEmail: Joi.boolean().default(false).optional(),
    showPhone: Joi.boolean().default(false).optional(),
    showLocation: Joi.boolean().default(true).optional(),
    
    allowSearch: Joi.boolean().default(true).optional(),
    allowRecommendations: Joi.boolean().default(true).optional()
  }).optional(),

  security: Joi.object({
    twoFactorEnabled: Joi.boolean().default(false).optional(),
    loginNotifications: Joi.boolean().default(true).optional(),
    securityAlerts: Joi.boolean().default(true).optional(),
    
    sessionTimeout: Joi.number()
      .integer()
      .min(15)
      .max(10080) // 7 days in minutes
      .default(480) // 8 hours
      .optional()
      .messages({
        'number.integer': 'Session timeout must be an integer',
        'number.min': 'Session timeout must be at least 15 minutes',
        'number.max': 'Session timeout cannot exceed 7 days'
      })
  }).optional(),

  communication: Joi.object({
    language: Joi.string()
      .valid('en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko')
      .default('en')
      .optional(),
    
    timezone: Joi.string()
      .max(50)
      .default('UTC')
      .optional(),
    
    emailFrequency: Joi.string()
      .valid('immediate', 'hourly', 'daily', 'weekly', 'never')
      .default('daily')
      .optional(),
    
    marketingEmails: Joi.boolean().default(false).optional(),
    productUpdates: Joi.boolean().default(true).optional(),
    securityNotifications: Joi.boolean().default(true).optional()
  }).optional()
});

/**
 * All user validation schemas
 */
export const userValidationSchemas = {
  register: registerUserSchema,
  login: loginUserSchema,
  verify: verifyUserSchema,
  updateProfile: updateUserProfileSchema,
  changePassword: changePasswordSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  params: userParamsSchema,
  listQuery: listUsersQuerySchema,
  accountSettings: accountSettingsSchema
};