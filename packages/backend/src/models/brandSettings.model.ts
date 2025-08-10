// src/models/brandSettings.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IBrandSettings extends Document {
  business: Types.ObjectId;
  
  // Visual branding
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  customCss?: string;
  
  // Domain configuration
  subdomain?: string;
  customDomain?: string;
  enableSsl?: boolean;
  
  // ✨ Enhanced Web3 settings with comprehensive wallet integration
  web3Settings?: {
    // Primary wallet configuration
    certificateWallet: string;
    walletType: 'metamask' | 'walletconnect' | 'coinbase' | 'hardware' | 'other';
    walletVerified: boolean;
    walletVerifiedAt?: Date;
    walletSignature?: string;
    
    // Contract addresses
    voteContract?: string;
    nftContract?: string;
    chainId: number;
    networkName: string;
    
    // Gas optimization
    gasSettings?: {
      maxGasPrice: number; // in gwei
      gasLimit: number;
      priorityFee?: number; // EIP-1559
      useGasOptimization: boolean;
    };
    
    // Security settings
    securitySettings?: {
      requireSignatureForTransfers: boolean;
      enableMultisig: boolean;
      multisigThreshold?: number;
      allowedSigners?: string[];
      sessionTimeout: number; // minutes
    };
  };
  
  // ✨ Comprehensive transfer preferences
  transferPreferences?: {
    // Basic transfer settings
    autoTransfer: boolean;
    transferDelay: number; // minutes after minting
    transferTimeout: number; // milliseconds for blockchain operations
    
    // Batch processing
    batchTransfer: boolean;
    batchSize: number; // certificates per batch
    batchInterval: number; // minutes between batches
    
    // Retry logic
    retryFailedTransfers: boolean;
    maxRetryAttempts: number;
    retryBackoffStrategy: 'linear' | 'exponential' | 'custom';
    retryDelayBase: number; // base delay in minutes
    retryDelayMax: number; // maximum delay in minutes
    
    // Notification preferences
    notificationSettings: {
      notifyOnTransfer: boolean;
      notifyOnFailure: boolean;
      notifyOnRetry: boolean;
      notifyOnSuccess: boolean;
      emailNotifications: boolean;
      webhookNotifications: boolean;
      webhookUrl?: string;
      slackIntegration?: {
        webhookUrl: string;
        channel: string;
        enabled: boolean;
      };
    };
    
    // Advanced transfer rules
    transferRules?: {
      // Time-based rules
      businessHoursOnly: boolean;
      businessHoursStart?: string; // "09:00"
      businessHoursEnd?: string; // "17:00"
      timezone?: string; // "America/New_York"
      excludeWeekends: boolean;
      excludeHolidays: boolean;
      
      // Conditional transfers
      minimumValueThreshold?: number; // in wei
      requireCustomerConfirmation: boolean;
      autoTransferWhitelist?: string[]; // wallet addresses
      autoTransferBlacklist?: string[]; // wallet addresses
      
      // Rate limiting
      maxTransfersPerHour: number;
      maxTransfersPerDay: number;
      cooldownPeriod: number; // minutes between transfers to same address
    };
  };
  
  // E-commerce integrations
  shopifyIntegration?: {
    shopifyDomain: string;
    shopifyAccessToken: string;
    shopifyWebhookSecret?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean; // Auto-mint certificates on product purchase
    lastSyncAt?: Date;
  };
  
  wooCommerceIntegration?: {
    wooDomain: string;
    wooConsumerKey: string;
    wooConsumerSecret: string;
    apiVersion?: string;
    syncInterval?: number;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
  
  wixIntegration?: {
    wixDomain: string;
    wixApiKey: string;
    wixRefreshToken?: string;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
  
  // Plan and subscription with Web3 features
  plan?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  planLimits?: {
    certificates: number;
    votes: number;
    customDomains: number;
    apiCalls: number;
    transfersPerMonth: number; // Web3 transfer limit
    gasCredits: number; // Monthly gas credits in wei
    webhookEndpoints: number;
  };
  
  // ✨ Transfer analytics and monitoring
  transferAnalytics?: {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    totalGasUsed: string; // in wei
    averageTransferTime: number; // milliseconds
    lastTransferAt?: Date;
    monthlyStats?: {
      month: string; // "2025-01"
      transfers: number;
      gasUsed: string;
      successRate: number;
    }[];
  };
  
  // Analytics settings
  analyticsSettings?: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    enableHeatmaps?: boolean;
    enableSessionRecording?: boolean;
    trackWeb3Events?: boolean; // Track wallet connections, transfers, etc.
  };
  
  // SEO settings
  seoSettings?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  
  // Status and metadata
  isActive?: boolean;
  lastUpdatedBy?: string;
  version?: number;
  
  // Instance methods
  hasWeb3Features(): boolean;
  shouldAutoTransfer(): boolean;
  canTransferToBrand(): boolean;
  getTransferSettings(): any;
  validateWalletAddress(address: string): boolean;
  isWithinBusinessHours(): boolean;
  canTransferNow(): { allowed: boolean; reason?: string };
  updateTransferAnalytics(transferData: any): Promise<void>;
  
  createdAt: Date;
  updatedAt: Date;
}

const BrandSettingsSchema = new Schema<IBrandSettings>(
  {
    business: { 
      type: Schema.Types.ObjectId, 
      ref: 'Business', 
      required: [true, 'Business reference is required'],
      unique: true,
      index: true
    },
    
    // Visual branding
    themeColor: {
      type: String,
      trim: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Theme color must be a valid hex color']
    },
    logoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Logo URL must be a valid HTTP/HTTPS URL'
      }
    },
    bannerImages: [{
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Banner image URL must be a valid HTTP/HTTPS URL'
      }
    }],
    customCss: {
      type: String,
      trim: true,
      maxlength: [50000, 'Custom CSS cannot exceed 50,000 characters']
    },
    
    // Domain configuration
    subdomain: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'],
      maxlength: [63, 'Subdomain cannot exceed 63 characters'],
      index: true,
      unique: true,
      sparse: true
    },
    customDomain: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,}$/, 'Invalid domain format'],
      index: true,
      unique: true,
      sparse: true
    },
    enableSsl: {
      type: Boolean,
      default: true
    },
    
    // ✨ Enhanced Web3 settings
    web3Settings: {
      // Primary wallet configuration
      certificateWallet: {
        type: String,
        required: true,
        trim: true,
        match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'],
        index: true
      },
      walletType: {
        type: String,
        enum: ['metamask', 'walletconnect', 'coinbase', 'hardware', 'other'],
        default: 'metamask'
      },
      walletVerified: {
        type: Boolean,
        default: false,
        required: true
      },
      walletVerifiedAt: {
        type: Date,
        index: true
      },
      walletSignature: {
        type: String,
        trim: true,
        select: false // Don't include in queries by default
      },
      
      // Contract addresses
      voteContract: {
        type: String,
        trim: true,
        match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format'],
        index: true
      },
      nftContract: {
        type: String,
        trim: true,
        match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format'],
        index: true
      },
      chainId: {
        type: Number,
        enum: [1, 5, 11155111, 137, 80001, 56, 97], // Mainnet, Goerli, Sepolia, Polygon, Mumbai, BSC, BSC Testnet
        default: 1,
        required: true
      },
      networkName: {
        type: String,
        enum: ['ethereum', 'goerli', 'sepolia', 'polygon', 'mumbai', 'bsc', 'bsc-testnet'],
        default: 'ethereum',
        required: true
      },
      
      // Gas optimization
      gasSettings: {
        maxGasPrice: {
          type: Number,
          min: [1, 'Max gas price must be at least 1 gwei'],
          max: [1000, 'Max gas price cannot exceed 1000 gwei'],
          default: 100
        },
        gasLimit: {
          type: Number,
          min: [21000, 'Gas limit must be at least 21000'],
          max: [10000000, 'Gas limit cannot exceed 10M'],
          default: 500000
        },
        priorityFee: {
          type: Number,
          min: [0, 'Priority fee cannot be negative'],
          max: [100, 'Priority fee cannot exceed 100 gwei'],
          default: 2
        },
        useGasOptimization: {
          type: Boolean,
          default: true
        }
      },
      
      // Security settings
      securitySettings: {
        requireSignatureForTransfers: {
          type: Boolean,
          default: false
        },
        enableMultisig: {
          type: Boolean,
          default: false
        },
        multisigThreshold: {
          type: Number,
          min: [1, 'Multisig threshold must be at least 1'],
          max: [10, 'Multisig threshold cannot exceed 10']
        },
        allowedSigners: [{
          type: String,
          trim: true,
          match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid signer address format']
        }],
        sessionTimeout: {
          type: Number,
          min: [5, 'Session timeout must be at least 5 minutes'],
          max: [1440, 'Session timeout cannot exceed 24 hours'],
          default: 60
        }
      }
    },
    
    // ✨ Comprehensive transfer preferences
    transferPreferences: {
      // Basic transfer settings
      autoTransfer: {
        type: Boolean,
        default: true,
        required: true,
        index: true
      },
      transferDelay: {
        type: Number,
        min: [0, 'Transfer delay cannot be negative'],
        max: [1440, 'Transfer delay cannot exceed 24 hours (1440 minutes)'],
        default: 5
      },
      transferTimeout: {
        type: Number,
        min: [30000, 'Transfer timeout must be at least 30 seconds'],
        max: [1800000, 'Transfer timeout cannot exceed 30 minutes'],
        default: 300000
      },
      
      // Batch processing
      batchTransfer: {
        type: Boolean,
        default: false
      },
      batchSize: {
        type: Number,
        min: [1, 'Batch size must be at least 1'],
        max: [100, 'Batch size cannot exceed 100'],
        default: 10
      },
      batchInterval: {
        type: Number,
        min: [1, 'Batch interval must be at least 1 minute'],
        max: [1440, 'Batch interval cannot exceed 24 hours'],
        default: 30
      },
      
      // Retry logic
      retryFailedTransfers: {
        type: Boolean,
        default: true
      },
      maxRetryAttempts: {
        type: Number,
        min: [1, 'Max retry attempts must be at least 1'],
        max: [10, 'Max retry attempts cannot exceed 10'],
        default: 3
      },
      retryBackoffStrategy: {
        type: String,
        enum: ['linear', 'exponential', 'custom'],
        default: 'exponential'
      },
      retryDelayBase: {
        type: Number,
        min: [1, 'Retry delay base must be at least 1 minute'],
        max: [60, 'Retry delay base cannot exceed 60 minutes'],
        default: 5
      },
      retryDelayMax: {
        type: Number,
        min: [5, 'Retry delay max must be at least 5 minutes'],
        max: [1440, 'Retry delay max cannot exceed 24 hours'],
        default: 120
      },
      
      // Notification preferences
      notificationSettings: {
        notifyOnTransfer: {
          type: Boolean,
          default: true
        },
        notifyOnFailure: {
          type: Boolean,
          default: true
        },
        notifyOnRetry: {
          type: Boolean,
          default: false
        },
        notifyOnSuccess: {
          type: Boolean,
          default: true
        },
        emailNotifications: {
          type: Boolean,
          default: true
        },
        webhookNotifications: {
          type: Boolean,
          default: false
        },
        webhookUrl: {
          type: String,
          trim: true,
          validate: {
            validator: function(v: string) {
              return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Webhook URL must be a valid HTTP/HTTPS URL'
          }
        },
        slackIntegration: {
          webhookUrl: {
            type: String,
            trim: true,
            validate: {
              validator: function(v: string) {
                return !v || /^https:\/\/hooks\.slack\.com\//.test(v);
              },
              message: 'Invalid Slack webhook URL'
            }
          },
          channel: {
            type: String,
            trim: true,
            match: [/^#[a-z0-9-_]+$/, 'Invalid Slack channel format']
          },
          enabled: {
            type: Boolean,
            default: false
          }
        }
      },
      
      // Advanced transfer rules
      transferRules: {
        // Time-based rules
        businessHoursOnly: {
          type: Boolean,
          default: false
        },
        businessHoursStart: {
          type: String,
          match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
          default: '09:00'
        },
        businessHoursEnd: {
          type: String,
          match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
          default: '17:00'
        },
        timezone: {
          type: String,
          default: 'UTC'
        },
        excludeWeekends: {
          type: Boolean,
          default: false
        },
        excludeHolidays: {
          type: Boolean,
          default: false
        },
        
        // Conditional transfers
        minimumValueThreshold: {
          type: String, // Store as string to handle big numbers
          default: '0'
        },
        requireCustomerConfirmation: {
          type: Boolean,
          default: false
        },
        autoTransferWhitelist: [{
          type: String,
          trim: true,
          match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format']
        }],
        autoTransferBlacklist: [{
          type: String,
          trim: true,
          match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format']
        }],
        
        // Rate limiting
        maxTransfersPerHour: {
          type: Number,
          min: [1, 'Max transfers per hour must be at least 1'],
          max: [1000, 'Max transfers per hour cannot exceed 1000'],
          default: 100
        },
        maxTransfersPerDay: {
          type: Number,
          min: [1, 'Max transfers per day must be at least 1'],
          max: [10000, 'Max transfers per day cannot exceed 10000'],
          default: 500
        },
        cooldownPeriod: {
          type: Number,
          min: [0, 'Cooldown period cannot be negative'],
          max: [1440, 'Cooldown period cannot exceed 24 hours'],
          default: 0
        }
      }
    },
    
    // E-commerce integrations with auto-mint features
    shopifyIntegration: {
      shopifyDomain: {
        type: String,
        trim: true,
        match: [/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/, 'Invalid Shopify domain format']
      },
      shopifyAccessToken: {
        type: String,
        trim: true,
        select: false
      },
      shopifyWebhookSecret: {
        type: String,
        trim: true,
        select: false
      },
      syncProducts: {
        type: Boolean,
        default: true
      },
      syncOrders: {
        type: Boolean,
        default: true
      },
      autoMintOnPurchase: {
        type: Boolean,
        default: false
      },
      lastSyncAt: {
        type: Date,
        index: true
      }
    },
    
    wooCommerceIntegration: {
      wooDomain: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'WooCommerce domain must be a valid URL'
        }
      },
      wooConsumerKey: {
        type: String,
        trim: true,
        match: [/^ck_[a-f0-9]{40}$/, 'Invalid WooCommerce consumer key format'],
        select: false
      },
      wooConsumerSecret: {
        type: String,
        trim: true,
        match: [/^cs_[a-f0-9]{40}$/, 'Invalid WooCommerce consumer secret format'],
        select: false
      },
      apiVersion: {
        type: String,
        enum: ['wc/v1', 'wc/v2', 'wc/v3'],
        default: 'wc/v3'
      },
      syncInterval: {
        type: Number,
        min: [5, 'Sync interval cannot be less than 5 minutes'],
        max: [1440, 'Sync interval cannot exceed 24 hours'],
        default: 60
      },
      autoMintOnPurchase: {
        type: Boolean,
        default: false
      },
      lastSyncAt: {
        type: Date,
        index: true
      }
    },
    
    wixIntegration: {
      wixDomain: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/.+\.wixsite\.com/.test(v);
          },
          message: 'Wix domain must be a valid Wix site URL'
        }
      },
      wixApiKey: {
        type: String,
        trim: true,
        select: false
      },
      wixRefreshToken: {
        type: String,
        trim: true,
        select: false
      },
      autoMintOnPurchase: {
        type: Boolean,
        default: false
      },
      lastSyncAt: {
        type: Date,
        index: true
      }
    },
    
    // Enhanced plan limits with Web3 features
    plan: {
      type: String,
      enum: ['foundation', 'growth', 'premium', 'enterprise'],
      default: 'foundation',
      index: true
    },
    planLimits: {
      certificates: {
        type: Number,
        min: [0, 'Certificate limit cannot be negative'],
        default: 100
      },
      votes: {
        type: Number,
        min: [0, 'Vote limit cannot be negative'],
        default: 1000
      },
      customDomains: {
        type: Number,
        min: [0, 'Custom domain limit cannot be negative'],
        default: 0
      },
      apiCalls: {
        type: Number,
        min: [0, 'API call limit cannot be negative'],
        default: 10000
      },
      transfersPerMonth: {
        type: Number,
        min: [0, 'Transfer limit cannot be negative'],
        default: 1000
      },
      gasCredits: {
        type: String, // Store as string to handle big numbers
        default: '0'
      },
      webhookEndpoints: {
        type: Number,
        min: [0, 'Webhook endpoint limit cannot be negative'],
        default: 1
      }
    },
    
    // ✨ Transfer analytics and monitoring
    transferAnalytics: {
      totalTransfers: {
        type: Number,
        default: 0,
        min: [0, 'Total transfers cannot be negative']
      },
      successfulTransfers: {
        type: Number,
        default: 0,
        min: [0, 'Successful transfers cannot be negative']
      },
      failedTransfers: {
        type: Number,
        default: 0,
        min: [0, 'Failed transfers cannot be negative']
      },
      totalGasUsed: {
        type: String, // Store as string to handle big numbers
        default: '0'
      },
      averageTransferTime: {
        type: Number,
        default: 0,
        min: [0, 'Average transfer time cannot be negative']
      },
      lastTransferAt: {
        type: Date,
        index: true
      },
      monthlyStats: [{
        month: {
          type: String,
          match: [/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)']
        },
        transfers: {
          type: Number,
          min: [0, 'Monthly transfers cannot be negative'],
          default: 0
        },
        gasUsed: {
          type: String,
          default: '0'
        },
        successRate: {
          type: Number,
          min: [0, 'Success rate cannot be negative'],
          max: [100, 'Success rate cannot exceed 100'],
          default: 0
        }
      }]
    },
    
    // Enhanced analytics settings
    analyticsSettings: {
      googleAnalyticsId: {
        type: String,
        trim: true,
        match: [/^G-[A-Z0-9]+$|^UA-\d+-\d+$/, 'Invalid Google Analytics ID format']
      },
      facebookPixelId: {
        type: String,
        trim: true,
        match: [/^\d{15,16}$/, 'Invalid Facebook Pixel ID format']
      },
      enableHeatmaps: {
        type: Boolean,
        default: false
      },
      enableSessionRecording: {
        type: Boolean,
        default: false
      },
      trackWeb3Events: {
        type: Boolean,
        default: true
      }
    },
    
    // SEO settings
    seoSettings: {
      metaTitle: {
        type: String,
        trim: true,
        maxlength: [60, 'Meta title cannot exceed 60 characters']
      },
      metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters']
      },
      keywords: [{
        type: String,
        trim: true,
        maxlength: [50, 'Keyword cannot exceed 50 characters']
      }],
      canonicalUrl: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'Canonical URL must be a valid HTTP/HTTPS URL'
        }
      }
    },
    
    // Status and metadata
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastUpdatedBy: {
      type: String,
      trim: true
    },
    version: {
      type: Number,
      default: 1
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ===== INDEXES =====
BrandSettingsSchema.index({ business: 1 }, { unique: true });
BrandSettingsSchema.index({ 'web3Settings.certificateWallet': 1 }, { sparse: true });
BrandSettingsSchema.index({ plan: 1, isActive: 1 });
BrandSettingsSchema.index({ 'transferPreferences.autoTransfer': 1 });
BrandSettingsSchema.index({ 'web3Settings.chainId': 1 });
BrandSettingsSchema.index({ 'transferAnalytics.lastTransferAt': -1 });

// ===== VIRTUALS =====
BrandSettingsSchema.virtual('hasCustomDomain').get(function() {
  return !!this.customDomain;
});

BrandSettingsSchema.virtual('integrationStatus').get(function() {
  return {
    shopify: !!this.shopifyIntegration?.shopifyDomain,
    woocommerce: !!this.wooCommerceIntegration?.wooDomain,
    wix: !!this.wixIntegration?.wixDomain
  };
});

BrandSettingsSchema.virtual('web3Status').get(function() {
  return {
    walletConnected: !!this.web3Settings?.certificateWallet,
    walletVerified: this.web3Settings?.walletVerified || false,
    contractsDeployed: !!(this.web3Settings?.voteContract && this.web3Settings?.nftContract),
    autoTransferEnabled: this.shouldAutoTransfer(),
    networkSupported: this.web3Settings?.chainId ? [1, 137, 56].includes(this.web3Settings.chainId) : false
  };
});

BrandSettingsSchema.virtual('transferHealth').get(function() {
  const analytics = this.transferAnalytics;
  const total = analytics?.totalTransfers || 0;
  const successful = analytics?.successfulTransfers || 0;
  const failed = analytics?.failedTransfers || 0;
  
  return {
    successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
    totalTransfers: total,
    lastTransferAt: analytics?.lastTransferAt,
    averageTime: analytics?.averageTransferTime || 0,
    status: failed > successful ? 'unhealthy' : successful > 0 ? 'healthy' : 'inactive'
  };
});

// ===== INSTANCE METHODS =====

/**
 * Check if brand has Web3 features enabled
 */
BrandSettingsSchema.methods.hasWeb3Features = function(): boolean {
  return ['premium', 'enterprise'].includes(this.plan || 'foundation');
};

/**
 * Check if automatic transfer should be performed
 */
BrandSettingsSchema.methods.shouldAutoTransfer = function(): boolean {
  // Must have Web3 features
  if (!this.hasWeb3Features()) return false;
  
  // Must have wallet configured and verified
  if (!this.web3Settings?.certificateWallet || !this.web3Settings?.walletVerified) return false;
  
  // Check if auto-transfer is explicitly disabled
  if (this.transferPreferences?.autoTransfer === false) return false;
  
  // Default to enabled if wallet is configured and verified
  return true;
};

/**
 * Check if brand can transfer certificates to their wallet
 */
BrandSettingsSchema.methods.canTransferToBrand = function(): boolean {
  return this.hasWeb3Features() && 
         !!this.web3Settings?.certificateWallet && 
         this.web3Settings?.walletVerified &&
         this.validateWalletAddress(this.web3Settings.certificateWallet);
};

/**
 * Validate wallet address format
 */
BrandSettingsSchema.methods.validateWalletAddress = function(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Check if current time is within business hours
 */
BrandSettingsSchema.methods.isWithinBusinessHours = function(): boolean {
  if (!this.transferPreferences?.transferRules?.businessHoursOnly) {
    return true;
  }

  const now = new Date();
  const timezone = this.transferPreferences.transferRules.timezone || 'UTC';
  const rules = this.transferPreferences.transferRules;
  
  // Convert to business timezone
  const businessTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  // Check weekends
  if (rules.excludeWeekends) {
    const dayOfWeek = businessTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      return false;
    }
  }
  
  // Check business hours
  const currentTime = businessTime.getHours() * 60 + businessTime.getMinutes();
  const [startHour, startMin] = (rules.businessHoursStart || '09:00').split(':').map(Number);
  const [endHour, endMin] = (rules.businessHoursEnd || '17:00').split(':').map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  return currentTime >= startTime && currentTime <= endTime;
};

/**
 * Check if transfer can be performed now with detailed reasoning
 */
BrandSettingsSchema.methods.canTransferNow = function(): { allowed: boolean; reason?: string } {
  // Check if auto-transfer is enabled
  if (!this.shouldAutoTransfer()) {
    return { allowed: false, reason: 'Auto-transfer is disabled or wallet not configured' };
  }
  
  const rules = this.transferPreferences?.transferRules;
  if (!rules) {
    return { allowed: true };
  }
  
  // Check business hours
  if (!this.isWithinBusinessHours()) {
    return { allowed: false, reason: 'Outside business hours' };
  }
  
  // Check rate limiting (simplified - would need Redis for full implementation)
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // This would typically query a rate limiting store
  // For now, we'll assume it's allowed
  
  return { allowed: true };
};

/**
 * Get transfer settings with all defaults applied
 */
BrandSettingsSchema.methods.getTransferSettings = function() {
  const defaults = {
    autoTransfer: true,
    transferDelay: 5,
    transferTimeout: 300000,
    batchTransfer: false,
    batchSize: 10,
    batchInterval: 30,
    retryFailedTransfers: true,
    maxRetryAttempts: 3,
    retryBackoffStrategy: 'exponential',
    retryDelayBase: 5,
    retryDelayMax: 120,
    notificationSettings: {
      notifyOnTransfer: true,
      notifyOnFailure: true,
      notifyOnRetry: false,
      notifyOnSuccess: true,
      emailNotifications: true,
      webhookNotifications: false
    },
    transferRules: {
      businessHoursOnly: false,
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      timezone: 'UTC',
      excludeWeekends: false,
      excludeHolidays: false,
      requireCustomerConfirmation: false,
      maxTransfersPerHour: 100,
      maxTransfersPerDay: 500,
      cooldownPeriod: 0
    }
  };
  
  return {
    ...defaults,
    ...this.transferPreferences,
    notificationSettings: {
      ...defaults.notificationSettings,
      ...this.transferPreferences?.notificationSettings
    },
    transferRules: {
      ...defaults.transferRules,
      ...this.transferPreferences?.transferRules
    }
  };
};

/**
 * Update transfer analytics with new transfer data
 */
BrandSettingsSchema.methods.updateTransferAnalytics = async function(transferData: {
  success: boolean;
  gasUsed?: string;
  transferTime?: number;
}): Promise<void> {
  if (!this.transferAnalytics) {
    this.transferAnalytics = {
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      totalGasUsed: '0',
      averageTransferTime: 0
    };
  }
  
  // Update counters
  this.transferAnalytics.totalTransfers += 1;
  this.transferAnalytics.lastTransferAt = new Date();
  
  if (transferData.success) {
    this.transferAnalytics.successfulTransfers += 1;
  } else {
    this.transferAnalytics.failedTransfers += 1;
  }
  
  // Update gas usage
  if (transferData.gasUsed) {
    const currentGas = BigInt(this.transferAnalytics.totalGasUsed || '0');
    const newGas = BigInt(transferData.gasUsed);
    this.transferAnalytics.totalGasUsed = (currentGas + newGas).toString();
  }
  
  // Update average transfer time
  if (transferData.transferTime) {
    const totalTime = this.transferAnalytics.averageTransferTime * (this.transferAnalytics.totalTransfers - 1);
    this.transferAnalytics.averageTransferTime = (totalTime + transferData.transferTime) / this.transferAnalytics.totalTransfers;
  }
  
  // Update monthly stats
  const currentMonth = new Date().toISOString().slice(0, 7); // "2025-01"
  let monthlyStats = this.transferAnalytics.monthlyStats || [];
  let currentMonthStats = monthlyStats.find(stat => stat.month === currentMonth);
  
  if (!currentMonthStats) {
    currentMonthStats = {
      month: currentMonth,
      transfers: 0,
      gasUsed: '0',
      successRate: 0
    };
    monthlyStats.push(currentMonthStats);
  }
  
  currentMonthStats.transfers += 1;
  if (transferData.gasUsed) {
    const currentMonthGas = BigInt(currentMonthStats.gasUsed);
    const newGas = BigInt(transferData.gasUsed);
    currentMonthStats.gasUsed = (currentMonthGas + newGas).toString();
  }
  
  // Calculate success rate for the month
  const monthlySuccessful = monthlyStats
    .filter(stat => stat.month === currentMonth)
    .reduce((acc, stat) => acc + stat.transfers, 0);
  currentMonthStats.successRate = Math.round((monthlySuccessful / currentMonthStats.transfers) * 100);
  
  // Keep only last 12 months
  this.transferAnalytics.monthlyStats = monthlyStats
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
  
  await this.save();
};

// ===== STATIC METHODS =====

/**
 * Find brands with auto-transfer enabled and verified wallets
 */
BrandSettingsSchema.statics.findAutoTransferEnabled = function() {
  return this.find({
    'web3Settings.certificateWallet': { $exists: true, $ne: null },
    'web3Settings.walletVerified': true,
    'transferPreferences.autoTransfer': { $ne: false },
    plan: { $in: ['premium', 'enterprise'] },
    isActive: true
  });
};

/**
 * Find brands needing transfer retry
 */
BrandSettingsSchema.statics.findNeedingTransferRetry = function() {
  return this.find({
    'web3Settings.certificateWallet': { $exists: true, $ne: null },
    'web3Settings.walletVerified': true,
    'transferPreferences.retryFailedTransfers': true,
    plan: { $in: ['premium', 'enterprise'] },
    isActive: true
  });
};

/**
 * Find brands by network/chain
 */
BrandSettingsSchema.statics.findByNetwork = function(chainId: number) {
  return this.find({
    'web3Settings.chainId': chainId,
    'web3Settings.walletVerified': true,
    isActive: true
  });
};

/**
 * Get transfer analytics summary across all brands
 */
BrandSettingsSchema.statics.getGlobalTransferAnalytics = async function() {
  const results = await this.aggregate([
    {
      $match: {
        'transferAnalytics.totalTransfers': { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        totalBrands: { $sum: 1 },
        totalTransfers: { $sum: '$transferAnalytics.totalTransfers' },
        totalSuccessful: { $sum: '$transferAnalytics.successfulTransfers' },
        totalFailed: { $sum: '$transferAnalytics.failedTransfers' },
        totalGasUsed: { 
          $sum: { 
            $toLong: { $ifNull: ['$transferAnalytics.totalGasUsed', '0'] }
          }
        },
        avgTransferTime: { $avg: '$transferAnalytics.averageTransferTime' }
      }
    }
  ]);
  
  const result = results[0] || {
    totalBrands: 0,
    totalTransfers: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalGasUsed: 0,
    avgTransferTime: 0
  };
  
  result.successRate = result.totalTransfers > 0 
    ? Math.round((result.totalSuccessful / result.totalTransfers) * 100) 
    : 0;
  
  return result;
};

// ===== PRE/POST HOOKS =====

/**
 * Pre-save validation and processing
 */
BrandSettingsSchema.pre('save', function(next) {
  // Set default transfer preferences if wallet is being added
  if (this.isModified('web3Settings.certificateWallet') && 
      this.web3Settings?.certificateWallet && 
      !this.transferPreferences) {
    this.transferPreferences = {
      autoTransfer: true,
      transferDelay: 5,
      transferTimeout: 300000,
      batchTransfer: false,
      batchSize: 10,
      batchInterval: 30,
      retryFailedTransfers: true,
      maxRetryAttempts: 3,
      retryBackoffStrategy: 'exponential',
      retryDelayBase: 5,
      retryDelayMax: 120,
      notificationSettings: {
        notifyOnTransfer: true,
        notifyOnFailure: true,
        notifyOnRetry: false,
        notifyOnSuccess: true,
        emailNotifications: true,
        webhookNotifications: false
      },
      transferRules: {
        businessHoursOnly: false,
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        timezone: 'UTC',
        excludeWeekends: false,
        excludeHolidays: false,
        requireCustomerConfirmation: false,
        maxTransfersPerHour: 100,
        maxTransfersPerDay: 500,
        cooldownPeriod: 0
      }
    };
  }
  
  // Initialize transfer analytics if not present
  if (this.web3Settings?.certificateWallet && !this.transferAnalytics) {
    this.transferAnalytics = {
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      totalGasUsed: '0',
      averageTransferTime: 0,
      monthlyStats: []
    };
  }
  
  // Set network name based on chain ID
  if (this.web3Settings?.chainId && this.isModified('web3Settings.chainId')) {
    const networkMap: { [key: number]: string } = {
      1: 'ethereum',
      5: 'goerli',
      11155111: 'sepolia',
      137: 'polygon',
      80001: 'mumbai',
      56: 'bsc',
      97: 'bsc-testnet'
    };
    this.web3Settings.networkName = networkMap[this.web3Settings.chainId] || 'unknown';
  }
  
  // Increment version on significant changes
  const significantFields = [
    'web3Settings.certificateWallet', 
    'plan', 
    'transferPreferences',
    'web3Settings.walletVerified'
  ];
  if (significantFields.some(field => this.isModified(field))) {
    this.version = (this.version || 0) + 1;
  }
  
  next();
});

/**
 * Post-save hook for notifications and cache management
 */
BrandSettingsSchema.post('save', function(doc) {
  // Emit events for real-time updates
  if (doc.isModified('web3Settings.certificateWallet')) {
    process.nextTick(() => {
      console.log(`Brand ${doc.business} wallet updated: ${doc.web3Settings?.certificateWallet ? 'connected' : 'disconnected'}`);
    });
  }
  
  if (doc.isModified('web3Settings.walletVerified')) {
    process.nextTick(() => {
      console.log(`Brand ${doc.business} wallet verification: ${doc.web3Settings?.walletVerified ? 'verified' : 'unverified'}`);
    });
  }
  
  if (doc.isModified('transferPreferences')) {
    process.nextTick(() => {
      console.log(`Brand ${doc.business} transfer preferences updated`);
    });
  }
  
  // Clear relevant caches
  if (doc.isModified('web3Settings') || doc.isModified('transferPreferences')) {
    process.nextTick(() => {
      // Clear business settings cache
      console.log(`Clearing cache for business ${doc.business}`);
    });
  }
});

/**
 * Pre-remove hook for cleanup
 */
BrandSettingsSchema.pre('remove', function(next) {
  console.log(`Removing brand settings for business ${this.business}`);
  // Could trigger cleanup of related data, cancel pending transfers, etc.
  next();
});

export const BrandSettings = model<IBrandSettings>('BrandSettings', BrandSettingsSchema);