// src/validation/brandSettings.validation.ts
import Joi from 'joi';
import { commonSchemas } from '../middleware/validation.middleware';

/**
 * Enhanced brand settings validation with comprehensive customization and integration options
 */

// Main brand settings update schema
export const updateBrandSettingsSchema = Joi.object({
  // Visual branding
  themeColor: Joi.string()
    .pattern(/^#([0-9A-F]{3}){1,2}$/i)
    .custom((value, helpers) => {
      // Ensure good contrast and accessibility
      const hex = value.substring(1);
      const rgb = parseInt(hex, 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      // Calculate luminance for accessibility
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      if (luminance < 0.1) {
        return helpers.error('color.tooLight');
      }
      
      return value;
    })
    .messages({
      'string.pattern.base': 'Theme color must be a valid hex color (e.g., #FF0000)',
      'color.tooLight': 'Theme color is too light for good accessibility'
    })
    .optional(),

  logoUrl: Joi.string()
    .uri()
    .custom((value, helpers) => {
      // Validate logo URL requirements
      const validImageFormats = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
      const hasValidFormat = validImageFormats.some(format => 
        value.toLowerCase().includes(format)
      );
      
      // Check for CDN or trusted hosting
      const trustedHosts = [
        'amazonaws.com', 'cloudinary.com', 'imgix.com',
        'cloudflare.com', 'googleapis.com', 'firebase.com',
        'github.com', 'gitlab.com'
      ];
      
      const isTrustedHost = trustedHosts.some(host => 
        value.toLowerCase().includes(host)
      );
      
      if (!hasValidFormat && !isTrustedHost) {
        return helpers.error('url.invalidLogo');
      }
      
      return value;
    })
    .messages({
      'string.uri': 'Logo URL must be a valid URL',
      'url.invalidLogo': 'Logo must be a valid image URL from a trusted hosting service'
    })
    .optional(),

  bannerImages: Joi.array()
    .items(
      Joi.string()
        .uri()
        .custom((value, helpers) => {
          const validFormats = ['.png', '.jpg', '.jpeg', '.webp'];
          const hasValidFormat = validFormats.some(format => 
            value.toLowerCase().includes(format)
          );
          
          if (!hasValidFormat) {
            return helpers.error('url.invalidBanner');
          }
          
          return value;
        })
        .messages({
          'string.uri': 'Banner image must be a valid URL',
          'url.invalidBanner': 'Banner images must be valid image URLs'
        })
    )
    .max(5)
    .unique()
    .optional()
    .messages({
      'array.max': 'Maximum 5 banner images allowed',
      'array.unique': 'Duplicate banner image URLs are not allowed'
    }),

  customCss: Joi.string()
    .max(50000) // 50KB limit
    .custom((value, helpers) => {
      // Basic CSS security validation
      const dangerousPatterns = [
        /@import\s+url\(/i,
        /javascript:/i,
        /expression\s*\(/i,
        /behavior\s*:/i,
        /vbscript:/i,
        /<script/i,
        /on\w+\s*=/i
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(value))) {
        return helpers.error('string.unsafeCss');
      }
      
      // Check for external references that might be risky
      const externalRefs = value.match(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
      if (externalRefs) {
        const trustedDomains = [
          'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'
        ];
        
        for (const ref of externalRefs) {
          const url = ref.match(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/i)?.[1];
          if (url && !trustedDomains.some(domain => url.includes(domain))) {
            return helpers.error('string.untrustedCssUrl');
          }
        }
      }
      
      return value;
    })
    .messages({
      'string.max': 'Custom CSS cannot exceed 50KB',
      'string.unsafeCss': 'Custom CSS contains potentially unsafe content',
      'string.untrustedCssUrl': 'Custom CSS contains references to untrusted external resources'
    })
    .optional(),

  // Routing & hosting configuration
  subdomain: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
    .min(3)
    .max(63)
    .custom((value, helpers) => {
      // Reserved subdomains check (enhanced list)
      const reserved = [
        'www', 'api', 'admin', 'dashboard', 'app', 'mail', 'ftp',
        'localhost', 'staging', 'dev', 'test', 'demo', 'beta',
        'support', 'help', 'docs', 'blog', 'shop', 'store',
        'cdn', 'static', 'assets', 'files', 'upload', 'download',
        'secure', 'ssl', 'payment', 'billing', 'account',
        'status', 'monitor', 'health', 'metrics', 'analytics'
      ];
      
      if (reserved.includes(value.toLowerCase())) {
        return helpers.error('string.reservedSubdomain');
      }
      
      // Check for inappropriate content
      const inappropriate = ['adult', 'xxx', 'porn', 'sex', 'casino', 'gambling'];
      if (inappropriate.some(word => value.toLowerCase().includes(word))) {
        return helpers.error('string.inappropriateSubdomain');
      }
      
      return value;
    })
    .messages({
      'string.pattern.base': 'Subdomain can only contain lowercase letters, numbers, and hyphens',
      'string.min': 'Subdomain must be at least 3 characters',
      'string.max': 'Subdomain cannot exceed 63 characters',
      'string.reservedSubdomain': 'This subdomain is reserved and cannot be used',
      'string.inappropriateSubdomain': 'Subdomain contains inappropriate content'
    })
    .optional(),

  customDomain: Joi.string()
    .domain()
    .custom((value, helpers) => {
      // Validate custom domain format and restrictions
      const domain = value.toLowerCase();
      
      // Prevent using common free domains
      const freeDomains = [
        'github.io', 'netlify.app', 'vercel.app', 'herokuapp.com',
        'blogspot.com', 'wordpress.com', 'wix.com', 'squarespace.com'
      ];
      
      if (freeDomains.some(free => domain.includes(free))) {
        return helpers.error('string.freeDomain');
      }
      
      // Basic domain validation
      if (domain.startsWith('www.')) {
        return helpers.error('string.wwwNotAllowed');
      }
      
      if (domain.split('.').length < 2) {
        return helpers.error('string.invalidDomainFormat');
      }
      
      return value;
    })
    .messages({
      'string.domain': 'Must be a valid domain name',
      'string.freeDomain': 'Free hosting domains are not allowed for custom domains',
      'string.wwwNotAllowed': 'Custom domain should not include www prefix',
      'string.invalidDomainFormat': 'Invalid domain format'
    })
    .optional(),

  // E-commerce integrations
  shopifyIntegration: Joi.object({
    shopifyDomain: Joi.string()
      .domain()
      .pattern(/\.myshopify\.com$/)
      .required()
      .messages({
        'string.domain': 'Must be a valid domain',
        'string.pattern.base': 'Shopify domain must end with .myshopify.com'
      }),
    
    shopifyAccessToken: Joi.string()
      .alphanum()
      .min(32)
      .max(128)
      .required()
      .messages({
        'string.alphanum': 'Access token must be alphanumeric',
        'string.min': 'Invalid Shopify access token format',
        'string.max': 'Invalid Shopify access token format'
      }),
    
    shopifyWebhookSecret: Joi.string()
      .min(16)
      .max(128)
      .optional(),
    
    syncProducts: Joi.boolean().default(true),
    syncOrders: Joi.boolean().default(true),
    syncCustomers: Joi.boolean().default(false),
    
    webhookEndpoints: Joi.array()
      .items(Joi.string().valid(
        'orders/create', 'orders/updated', 'orders/paid',
        'products/create', 'products/update'
      ))
      .max(10)
      .optional()
  }).optional(),

  wooCommerceIntegration: Joi.object({
    wooDomain: Joi.string()
      .domain()
      .required()
      .messages({
        'string.domain': 'Must be a valid domain'
      }),
    
    wooConsumerKey: Joi.string()
      .pattern(/^ck_[a-f0-9]{40}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid WooCommerce consumer key format'
      }),
    
    wooConsumerSecret: Joi.string()
      .pattern(/^cs_[a-f0-9]{40}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid WooCommerce consumer secret format'
      }),
    
    apiVersion: Joi.string()
      .valid('wc/v1', 'wc/v2', 'wc/v3')
      .default('wc/v3'),
    
    syncInterval: Joi.number()
      .integer()
      .min(5)
      .max(1440)
      .default(30)
      .messages({
        'number.integer': 'Sync interval must be an integer',
        'number.min': 'Sync interval must be at least 5 minutes',
        'number.max': 'Sync interval cannot exceed 24 hours'
      })
  }).optional(),

  wixIntegration: Joi.object({
    wixDomain: Joi.string()
      .domain()
      .pattern(/\.wixsite\.com$|\.wix\.com$/)
      .required()
      .messages({
        'string.domain': 'Must be a valid domain',
        'string.pattern.base': 'Wix domain must end with .wixsite.com or .wix.com'
      }),
    
    wixApiKey: Joi.string()
      .min(32)
      .max(128)
      .required()
      .messages({
        'string.min': 'Wix API key must be at least 32 characters',
        'string.max': 'Wix API key cannot exceed 128 characters'
      }),
    
    wixRefreshToken: Joi.string().optional(),
    
    appId: Joi.string()
      .guid({ version: 'uuidv4' })
      .optional()
      .messages({
        'string.guid': 'App ID must be a valid UUID'
      })
  }).optional(),

  // Web3 & blockchain settings
  web3Settings: Joi.object({
    certificateWallet: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .custom((value, helpers) => {
        const address = value.toLowerCase();
        
        // Check for burn addresses and common invalid addresses
        const invalidAddresses = [
          '0x0000000000000000000000000000000000000000',
          '0x000000000000000000000000000000000000dead',
          '0xffffffffffffffffffffffffffffffffffffffff'
        ];
        
        if (invalidAddresses.includes(address)) {
          return helpers.error('string.invalidWalletAddress');
        }
        
        return value;
      })
      .messages({
        'string.pattern.base': 'Must be a valid Ethereum wallet address',
        'string.invalidWalletAddress': 'Invalid or restricted wallet address'
      })
      .optional(),
    
    voteContract: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Must be a valid Ethereum contract address'
      }),
    
    nftContract: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Must be a valid Ethereum contract address'
      }),
    
    chainId: Joi.number()
      .integer()
      .valid(8453, 84532, 1, 137) // Base, Ethereum, testnets, Polygon
      .default(8453)
      .optional()
      .messages({
        'any.only': 'Chain ID must be a supported blockchain network'
      }),
    
    gasLimit: Joi.number()
      .integer()
      .min(21000)
      .max(8000000)
      .default(200000)
      .optional()
      .messages({
        'number.integer': 'Gas limit must be an integer',
        'number.min': 'Gas limit must be at least 21,000',
        'number.max': 'Gas limit cannot exceed 8,000,000'
      })
  }).optional(),

  // API and webhook configuration
  apiSettings: Joi.object({
    webhookUrl: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'Webhook URL must be a valid URL'
      }),
    
    webhookSecret: Joi.string()
      .min(16)
      .max(128)
      .optional()
      .messages({
        'string.min': 'Webhook secret must be at least 16 characters',
        'string.max': 'Webhook secret cannot exceed 128 characters'
      }),
    
    enabledEvents: Joi.array()
      .items(Joi.string().valid(
        'vote.created', 'vote.updated', 'certificate.issued',
        'manufacturer.connected', 'manufacturer.disconnected',
        'plan.upgraded', 'plan.downgraded', 'subscription.renewed'
      ))
      .max(20)
      .optional()
      .messages({
        'array.max': 'Cannot enable more than 20 webhook events'
      }),
    
    rateLimits: Joi.object({
      enabled: Joi.boolean().default(true),
      requestsPerMinute: Joi.number()
        .integer()
        .min(1)
        .max(1000)
        .default(100)
        .messages({
          'number.integer': 'Requests per minute must be an integer',
          'number.min': 'Must allow at least 1 request per minute',
          'number.max': 'Cannot exceed 1000 requests per minute'
        }),
      burstLimit: Joi.number()
        .integer()
        .min(1)
        .max(2000)
        .default(200)
        .messages({
          'number.integer': 'Burst limit must be an integer',
          'number.min': 'Must allow at least 1 burst request',
          'number.max': 'Burst limit cannot exceed 2000'
        })
    }).optional()
  }).optional(),

  // Analytics and tracking
  analyticsSettings: Joi.object({
    googleAnalyticsId: Joi.string()
      .pattern(/^(UA|G)-[A-Z0-9-]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid Google Analytics tracking ID format'
      }),
    
    facebookPixelId: Joi.string()
      .pattern(/^[0-9]{15,16}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Facebook Pixel ID must be 15-16 digits'
      }),
    
    customTrackingScript: Joi.string()
      .max(10000)
      .custom((value, helpers) => {
        // Basic security check for tracking scripts
        if (value.includes('<script') && !value.includes('</script>')) {
          return helpers.error('string.invalidScript');
        }
        return value;
      })
      .optional()
      .messages({
        'string.max': 'Custom tracking script cannot exceed 10KB',
        'string.invalidScript': 'Invalid script format - must have proper opening and closing tags'
      }),
    
    enableHeatmaps: Joi.boolean().default(false),
    enableSessionRecording: Joi.boolean().default(false)
  }).optional(),

  // SEO and metadata
  seoSettings: Joi.object({
    metaTitle: Joi.string()
      .max(60)
      .optional()
      .messages({
        'string.max': 'Meta title should not exceed 60 characters for optimal SEO'
      }),
    
    metaDescription: Joi.string()
      .max(160)
      .optional()
      .messages({
        'string.max': 'Meta description should not exceed 160 characters for optimal SEO'
      }),
    
    keywords: Joi.array()
      .items(Joi.string().max(50))
      .max(20)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 20 keywords',
        'string.max': 'Each keyword cannot exceed 50 characters'
      }),
    
    canonicalUrl: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'Canonical URL must be a valid URL'
      }),
    
    robotsTxt: Joi.string()
      .max(5000)
      .optional()
      .messages({
        'string.max': 'Robots.txt cannot exceed 5KB'
      }),
    
    sitemap: Joi.boolean().default(true)
  }).optional(),

  // Security settings
  securitySettings: Joi.object({
    corsOrigins: Joi.array()
      .items(
        Joi.alternatives().try(
          Joi.string().uri(),
          Joi.string().valid('*')
        )
      )
      .max(20)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 20 CORS origins'
      }),
    
    cspDirectives: Joi.object()
      .pattern(
        Joi.string(),
        Joi.alternatives().try(
          Joi.string(),
          Joi.array().items(Joi.string())
        )
      )
      .optional(),
    
    enableSsl: Joi.boolean().default(true),
    enableHsts: Joi.boolean().default(true),
    
    ipWhitelist: Joi.array()
      .items(Joi.string().ip())
      .max(100)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 100 whitelisted IP addresses'
      }),
    
    blockCountries: Joi.array()
      .items(Joi.string().length(2).uppercase())
      .max(50)
      .optional()
      .messages({
        'array.max': 'Cannot block more than 50 countries',
        'string.length': 'Country codes must be exactly 2 characters',
        'string.uppercase': 'Country codes must be uppercase (e.g., US, CA, GB)'
      })
  }).optional()
});

/**
 * Schema for certificate wallet updates (security-critical)
 */
export const certificateWalletSchema = Joi.object({
  certificateWallet: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .custom((value, helpers) => {
      const address = value.toLowerCase();
      
      // Check for burn addresses and common invalid addresses
      const invalidAddresses = [
        '0x0000000000000000000000000000000000000000',
        '0x000000000000000000000000000000000000dead',
        '0xffffffffffffffffffffffffffffffffffffffff'
      ];
      
      if (invalidAddresses.includes(address)) {
        return helpers.error('string.invalidWalletAddress');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.pattern.base': 'Certificate wallet must be a valid Ethereum address (0x followed by 40 hex characters)',
      'string.invalidWalletAddress': 'Invalid or restricted wallet address',
      'any.required': 'Certificate wallet address is required'
    })
});

/**
 * Schema for quick branding updates (theme and logo only)
 */
export const quickBrandingSchema = Joi.object({
  themeColor: Joi.string()
    .pattern(/^#([0-9A-F]{3}){1,2}$/i)
    .optional()
    .messages({
      'string.pattern.base': 'Theme color must be a valid hex color (e.g., #FF0000 or #F00)'
    }),

  logoUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Logo URL must be a valid URL'
    })
});

/**
 * Schema for domain configuration
 */
export const domainConfigSchema = Joi.object({
  subdomain: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
    .min(3)
    .max(63)
    .optional()
    .messages({
      'string.pattern.base': 'Subdomain can only contain lowercase letters, numbers, and hyphens',
      'string.min': 'Subdomain must be at least 3 characters',
      'string.max': 'Subdomain cannot exceed 63 characters'
    }),

  customDomain: Joi.string()
    .domain()
    .optional()
    .messages({
      'string.domain': 'Custom domain must be a valid domain name'
    })
}).or('subdomain', 'customDomain')
  .messages({
    'object.missing': 'Either subdomain or customDomain must be provided'
  });

/**
 * Schema for Shopify integration
 */
export const shopifyIntegrationSchema = Joi.object({
  shopifyDomain: Joi.string()
    .pattern(/\.myshopify\.com$/)
    .required()
    .messages({
      'string.pattern.base': 'Shopify domain must end with .myshopify.com',
      'any.required': 'Shopify domain is required'
    }),
  
  shopifyAccessToken: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'Shopify access token must be at least 32 characters',
      'any.required': 'Shopify access token is required'
    }),
  
  shopifyWebhookSecret: Joi.string()
    .optional()
});

/**
 * Schema for WooCommerce integration
 */
export const wooCommerceIntegrationSchema = Joi.object({
  wooDomain: Joi.string()
    .domain()
    .required()
    .messages({
      'string.domain': 'WooCommerce domain must be a valid domain',
      'any.required': 'WooCommerce domain is required'
    }),
  
  wooConsumerKey: Joi.string()
    .pattern(/^ck_/)
    .required()
    .messages({
      'string.pattern.base': 'WooCommerce consumer key must start with "ck_"',
      'any.required': 'WooCommerce consumer key is required'
    }),
  
  wooConsumerSecret: Joi.string()
    .pattern(/^cs_/)
    .required()
    .messages({
      'string.pattern.base': 'WooCommerce consumer secret must start with "cs_"',
      'any.required': 'WooCommerce consumer secret is required'
    })
});

/**
 * Schema for Wix integration
 */
export const wixIntegrationSchema = Joi.object({
  wixDomain: Joi.string()
    .domain()
    .pattern(/\.wixsite\.com$|\.wix\.com$/)
    .required()
    .messages({
      'string.domain': 'Must be a valid domain',
      'string.pattern.base': 'Wix domain must end with .wixsite.com or .wix.com',
      'any.required': 'Wix domain is required'
    }),
  
  wixApiKey: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'Wix API key must be at least 32 characters',
      'any.required': 'Wix API key is required'
    }),
  
  wixRefreshToken: Joi.string().optional()
});

/**
 * All brand settings validation schemas
 */
export const brandSettingsValidationSchemas = {
  updateBrandSettings: updateBrandSettingsSchema,
  certificateWallet: certificateWalletSchema,
  quickBranding: quickBrandingSchema,
  domainConfig: domainConfigSchema,
  shopifyIntegration: shopifyIntegrationSchema,
  wooCommerceIntegration: wooCommerceIntegrationSchema,
  wixIntegration: wixIntegrationSchema
};
