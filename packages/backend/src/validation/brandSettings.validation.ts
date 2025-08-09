// src/validation/brandSettings.validation.ts
import Joi from 'joi';
import { commonSchemas, customJoi } from '../middleware/validation.middleware';

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

  logoUrl: commonSchemas.url
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
      'url.invalidLogo': 'Logo must be a valid image URL from a trusted hosting service'
    })
    .optional(),

  bannerImages: Joi.array()
    .items(
      commonSchemas.url
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
  subdomain: commonSchemas.subdomain
    .custom(async (value, helpers) => {
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
      'string.reservedSubdomain': 'This subdomain is reserved and cannot be used',
      'string.inappropriateSubdomain': 'Subdomain contains inappropriate content'
    })
    .optional(),

  customDomain: Joi.string()
    .domain({ tlds: { allow: true } })
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
      'string.freeDomain': 'Free hosting domains are not allowed for custom domains',
      'string.wwwNotAllowed': 'Custom domain should not include www prefix',
      'string.invalidDomainFormat': 'Invalid domain format'
    })
    .optional(),

  // E-commerce integrations
  shopifyIntegration: Joi.object({
    shopifyDomain: Joi.string()
      .domain({ tlds: { allow: false } })
      .pattern(/\.myshopify\.com$/)
      .required()
      .messages({
        'string.pattern.base': 'Shopify domain must end with .myshopify.com'
      }),
    
    shopifyAccessToken: Joi.string()
      .alphanum()
      .min(32)
      .max(128)
      .required()
      .messages({
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
      .domain({ tlds: { allow: false } })
      .required(),
    
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
        'number.min': 'Sync interval must be at least 5 minutes',
        'number.max': 'Sync interval cannot exceed 24 hours'
      })
  }).optional(),

  wixIntegration: Joi.object({
    wixDomain: Joi.string()
      .domain({ tlds: { allow: false } })
      .pattern(/\.wixsite\.com$|\.wix\.com$/)
      .required(),
    
    wixApiKey: Joi.string()
      .min(32)
      .max(128)
      .required(),
    
    wixRefreshToken: Joi.string()
      .optional(),
    
    appId: Joi.string()
      .uuid()
      .optional()
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
      .optional(),
    
    nftContract: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    
    chainId: Joi.number()
      .integer()
      .valid(1, 3, 4, 5, 42, 137, 80001) // Ethereum, testnets, Polygon
      .default(1)
      .optional(),
    
    gasLimit: Joi.number()
      .integer()
      .min(21000)
      .max(8000000)
      .default(200000)
      .optional()
  }).optional(),

  // Subscription and billing settings
  subscriptionSettings: Joi.object({
    plan: commonSchemas.plan.optional(),
    
    billingCycle: Joi.string()
      .valid('monthly', 'yearly')
      .default('monthly')
      .optional(),
    
    autoRenew: Joi.boolean()
      .default(true)
      .optional(),
    
    usageAlerts: Joi.object({
      enabled: Joi.boolean().default(true),
      thresholds: Joi.array()
        .items(Joi.number().min(0).max(100))
        .max(5)
        .default([50, 75, 90])
    }).optional()
  }).optional(),

  // API and webhook configuration
  apiSettings: Joi.object({
    webhookUrl: commonSchemas.url.optional(),
    
    webhookSecret: Joi.string()
      .min(16)
      .max(128)
      .optional(),
    
    enabledEvents: Joi.array()
      .items(Joi.string().valid(
        'vote.created', 'vote.updated', 'certificate.issued',
        'manufacturer.connected', 'manufacturer.disconnected',
        'plan.upgraded', 'plan.downgraded', 'subscription.renewed'
      ))
      .max(20)
      .optional(),
    
    rateLimits: Joi.object({
      enabled: Joi.boolean().default(true),
      requestsPerMinute: Joi.number()
        .integer()
        .min(1)
        .max(1000)
        .default(100),
      burstLimit: Joi.number()
        .integer()
        .min(1)
        .max(2000)
        .default(200)
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
      .optional(),
    
    customTrackingScript: Joi.string()
      .max(10000)
      .custom((value, helpers) => {
        // Basic security check for tracking scripts
        if (value.includes('<script') && !value.includes('</script>')) {
          return helpers.error('string.invalidScript');
        }
        return value;
      })
      .optional(),
    
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
      .optional(),
    
    canonicalUrl: commonSchemas.url.optional(),
    
    robotsTxt: Joi.string()
      .max(5000)
      .optional(),
    
    sitemap: Joi.boolean().default(true)
  }).optional(),

  // Security settings
  securitySettings: Joi.object({
    corsOrigins: Joi.array()
      .items(commonSchemas.url.allow('*'))
      .max(20)
      .optional(),
    
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
      .optional(),
    
    blockCountries: Joi.array()
      .items(Joi.string().length(2).uppercase())
      .max(50)
      .optional()
  }).optional()
});

// Quick branding update schema
export const quickBrandingSchema = Joi.object({
  themeColor: commonSchemas.hexColor,
  logoUrl: commonSchemas.optionalUrl
});

// Domain configuration schema
export const domainConfigSchema = Joi.object({
  subdomain: commonSchemas.subdomain.optional(),
  customDomain: Joi.string().domain().optional()
}).or('subdomain', 'customDomain');

// Integration-specific schemas
export const shopifyIntegrationSchema = Joi.object({
  shopifyDomain: Joi.string().pattern(/\.myshopify\.com$/).required(),
  shopifyAccessToken: Joi.string().min(32).required(),
  shopifyWebhookSecret: Joi.string().optional()
});

export const wooCommerceIntegrationSchema = Joi.object({
  wooDomain: Joi.string().domain().required(),
  wooConsumerKey: Joi.string().pattern(/^ck_/).required(),
  wooConsumerSecret: Joi.string().pattern(/^cs_/).required()
});

// Export all schemas
export const brandSettingsValidationSchemas = {
  updateBrandSettings: updateBrandSettingsSchema,
  quickBranding: quickBrandingSchema,
  domainConfig: domainConfigSchema,
  shopifyIntegration: shopifyIntegrationSchema,
  wooCommerceIntegration: wooCommerceIntegrationSchema
};
