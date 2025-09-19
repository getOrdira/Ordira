import { Schema, model, Document, Types } from 'mongoose';
import { logger } from '../utils/logger';

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

  // Customization settings
    customization?: {
    theme?: string;
    primaryColor?: string;
    logoUrl?: string;
    customDomain?: string;
    customCss?: string;
    fonts?: {
      primary?: string;
      secondary?: string;
    };
    layout?: {
      headerStyle?: string;
      footerStyle?: string;
      sidebarEnabled?: boolean;
    };
   };
  
  // Certificate wallet (referenced in controller)
  certificateWallet?: string;

  // Business Verification
   businessVerified?: boolean;
   businessVerifiedAt?: Date;
   verificationDocuments?: Array<{
      type: 'tax_document' | 'business_license' | 'certificate_of_incorporation' | 'other';
      url: string;
      uploadedAt: Date;
      verified?: boolean;
      verifiedAt?: Date;
    }>;
  
  // Email Gating Configuration
  emailGating?: {
    enabled: boolean;
    mode: 'whitelist' | 'blacklist' | 'disabled';
    allowUnregistered: boolean;
    requireApproval: boolean;
    autoSyncEnabled: boolean;
    syncSources: ('shopify' | 'woocommerce' | 'csv' | 'api')[];
    welcomeEmailEnabled: boolean;
    accessDeniedMessage: string;
    
    // Advanced gating settings
    gatingRules?: {
      domainWhitelist?: string[];
      domainBlacklist?: string[];
      emailPatterns?: string[];
      maxVotesPerEmail?: number;
      votingWindow?: {
        enabled: boolean;
        startDate?: Date;
        endDate?: Date;
        timezone?: string;
      };
      geographicRestrictions?: {
        enabled: boolean;
        allowedCountries?: string[];
        blockedCountries?: string[];
      };
      ipWhitelist?: string[];
      ipBlacklist?: string[];
    };
    
    // Analytics and monitoring
    gatingAnalytics?: {
      totalEmailsChecked: number;
      totalEmailsAllowed: number;
      totalEmailsDenied: number;
      lastResetDate?: Date;
      dailyStats?: {
        date: string;
        checked: number;
        allowed: number;
        denied: number;
        topDenialReasons: string[];
      }[];
    };

    // Integration settings
    integrationSettings?: {
      syncWithCRM?: boolean;
      crmWebhookUrl?: string;
      notifyOnDenial?: boolean;
      notifyOnApproval?: boolean;
      customWebhookUrl?: string;
      slackNotifications?: {
        enabled: boolean;
        webhookUrl?: string;
        channel?: string;
        notifyOnDenial?: boolean;
        notifyOnApproval?: boolean;
      };
    };

  };

  // Voting settings
  votingSettings?: {
    autoProcessEnabled?: boolean;
    batchThreshold?: number;
    maxBatchSize?: number;
  };
  
  // E-commerce integrations
  shopifyDomain?: string;
  shopifyAccessToken?: string;
  shopifyWebhookSecret?: string;
  shopifyConnectedAt?: Date;
  shopifyLastSync?: Date;
  shopifyConfig?: {
    syncProducts?: boolean;
    syncOrders?: boolean;
    configuredBy?: string;
    configuredAt?: Date;
  };
  shopifyUpdatedAt?: Date;
  
  wooDomain?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
  wooUpdatedAt?: Date;
  wooConnectedAt?: Date;
  wooLastSync?: Date;
 wooSettings?: {
    webhooksRegistered?: number;
    version?: string;
    verifySsl?: boolean;
    lastConnectionTest?: Date;
    lastProductSync?: Date;
    lastOrderSync?: Date;
    lastCustomerSync?: Date;
  };



  wixSettings?: {
    webhooksRegistered?: boolean;
    lastConnectionTest?: Date;
    lastProductSync?: Date;
    lastOrderSync?: Date;
    lastTokenRefresh?: Date;
  };
  
  wixDomain?: string;
  wixApiKey?: string;
  wixRefreshToken?: string;
  wixConnectedAt?: Date;
  wixLastSync?: Date;
  
  // Enhanced Web3 settings
  web3Settings?: {
    certificateWallet?: string;
    walletType?: 'metamask' | 'walletconnect' | 'coinbase' | 'hardware' | 'other';
    walletVerified?: boolean;
    walletVerifiedAt?: Date;
    walletSignature?: string;
    tokenDiscounts?: string[];
    lastDiscountCheck?: Date;
    voteContract?: string;
    transferHealth?: string;
    nftContract?: string;
    supplyChainContract?: string;
    chainId?: number;
    networkName?: string;
    gasSettings?: {
      maxGasPrice?: number;
      gasLimit?: number;
      priorityFee?: number;
      useGasOptimization?: boolean;
    };
    securitySettings?: {
      requireSignatureForTransfers?: boolean;
      enableMultisig?: boolean;
      multisigThreshold?: number;
      allowedSigners?: string[];
      sessionTimeout?: number;
    };
  };
  
  // Supply Chain settings
  supplyChainSettings?: {
    contractDeployedAt?: Date;
    networkId?: string;
    endpoints?: Array<{
      id: number;
      name: string;
      eventType: string;
      location: string;
      isActive: boolean;
    }>;
    products?: Array<{
      id: number;
      productId: string;
      name: string;
      description: string;
    }>;
  };
  
  // Transfer preferences
  transferPreferences?: {
    autoTransfer?: boolean;
    transferDelay?: number;
    transferTimeout?: number;
    batchTransfer?: boolean;
    batchSize?: number;
    batchInterval?: number;
    retryFailedTransfers?: boolean;
    maxRetryAttempts?: number;
    retryBackoffStrategy?: 'linear' | 'exponential' | 'custom';
    retryDelayBase?: number;
    retryDelayMax?: number;
    notificationSettings?: {
      notifyOnTransfer?: boolean;
      notifyOnFailure?: boolean;
      notifyOnRetry?: boolean;
      notifyOnSuccess?: boolean;
      emailNotifications?: boolean;
      webhookNotifications?: boolean;
      webhookUrl?: string;
      slackIntegration?: {
        webhookUrl?: string;
        channel?: string;
        enabled?: boolean;
      };
    };
    transferRules?: {
      businessHoursOnly?: boolean;
      businessHoursStart?: string;
      businessHoursEnd?: string;
      timezone?: string;
      excludeWeekends?: boolean;
      excludeHolidays?: boolean;
      minimumValueThreshold?: string;
      requireCustomerConfirmation?: boolean;
      autoTransferWhitelist?: string[];
      autoTransferBlacklist?: string[];
      maxTransfersPerHour?: number;
      maxTransfersPerDay?: number;
      cooldownPeriod?: number;
    };
  };
  
  // E-commerce integrations (extended)
  shopifyIntegration?: {
    shopifyDomain?: string;
    shopifyAccessToken?: string;
    shopifyWebhookSecret?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
  
  wooCommerceIntegration?: {
    wooDomain?: string;
    wooConsumerKey?: string;
    wooConsumerSecret?: string;
    apiVersion?: string;
    syncInterval?: number;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
  
  wixIntegration?: {
    wixDomain?: string;
    wixApiKey?: string;
    wixRefreshToken?: string;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
  
  // Plan and subscription
  plan?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  planLimits?: {
    certificates?: number;
    votes?: number;
    customDomains?: number;
    apiCalls?: number;
    transfersPerMonth?: number;
    gasCredits?: string;
    webhookEndpoints?: number;
    emailGatingRules?: number;
    gatedEmailsPerMonth?: number;
  };
  
  // Transfer analytics
  transferAnalytics?: {
    totalTransfers?: number;
    successfulTransfers?: number;
    failedTransfers?: number;
    totalGasUsed?: string;
    averageTransferTime?: number;
    lastTransferAt?: Date;
    monthlyStats?: {
      month: string;
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
    trackWeb3Events?: boolean;
    trackEmailGating?: boolean;
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
  updateSource?: string;
  updateMetadata?: any;
  lastWalletVerification?: Date;
  
  // Instance methods
  hasWeb3Features(): boolean;
  shouldAutoTransfer(): boolean;
  canTransferToBrand(): boolean;
  getTransferSettings(): any;
  validateWalletAddress(address: string): boolean;
  getEmailGatingRulesCount(): number;
  isWithinBusinessHours(): boolean;
  canTransferNow(): { allowed: boolean; reason?: string };
  updateTransferAnalytics(transferData: any): Promise<void>;
  hasEmailGating(): boolean;
  isEmailGatingEnabled(): boolean;
  getEmailGatingMode(): 'whitelist' | 'blacklist' | 'disabled';
  updateGatingAnalytics(emailChecked: string, allowed: boolean, reason?: string): Promise<void>;
  canEmailVote(email: string, context?: any): { allowed: boolean; reason?: string };
  
  createdAt: Date;
  updatedAt: Date;
}

// Email Gating Settings Schema
const emailGatingSettingsSchema = new Schema({
  enabled: { 
    type: Boolean, 
    default: false,
    index: true
  },
  mode: { 
    type: String, 
    enum: ['whitelist', 'blacklist', 'disabled'], 
    default: 'disabled',
    index: true
  },
  allowUnregistered: { 
    type: Boolean, 
    default: true 
  },
  requireApproval: { 
    type: Boolean, 
    default: false 
  },
  autoSyncEnabled: { 
    type: Boolean, 
    default: false 
  },
  syncSources: [{ 
    type: String, 
    enum: ['shopify', 'woocommerce', 'csv', 'api'] 
  }],
  welcomeEmailEnabled: { 
    type: Boolean, 
    default: true 
  },
  accessDeniedMessage: { 
    type: String, 
    maxlength: [500, 'Access denied message cannot exceed 500 characters'], 
    default: 'Your email is not authorized to access this voting platform. Please contact the brand for access.',
    trim: true
  },
  
  // Advanced gating rules
  gatingRules: {
    domainWhitelist: [{
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Invalid domain format']
    }],
    domainBlacklist: [{
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Invalid domain format']
    }],
    emailPatterns: [{
      type: String,
      trim: true,
      validate: {
        validator: function(pattern: string) {
          try {
            new RegExp(pattern);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid regular expression pattern'
      }
    }],
    maxVotesPerEmail: {
      type: Number,
      min: [1, 'Max votes per email must be at least 1'],
      max: [1000, 'Max votes per email cannot exceed 1000'],
      default: 1
    },
    votingWindow: {
      enabled: {
        type: Boolean,
        default: false
      },
      startDate: {
        type: Date,
        index: true
      },
      endDate: {
        type: Date,
        index: true
      },
      timezone: {
        type: String,
        default: 'UTC'
      }
    },
    geographicRestrictions: {
      enabled: {
        type: Boolean,
        default: false
      },
      allowedCountries: [{
        type: String,
        uppercase: true,
        match: [/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters']
      }],
      blockedCountries: [{
        type: String,
        uppercase: true,
        match: [/^[A-Z]{2}$/, 'Country code must be 2 uppercase letters']
      }]
    },
    ipWhitelist: [{
      type: String,
      trim: true,
      validate: {
        validator: function(ip: string) {
          return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(ip);
        },
        message: 'Invalid IP address or CIDR format'
      }
    }],
    ipBlacklist: [{
      type: String,
      trim: true,
      validate: {
        validator: function(ip: string) {
          return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(ip);
        },
        message: 'Invalid IP address or CIDR format'
      }
    }]
  },

   // Business verification
      businessVerified: {
      type: Boolean,
      default: false
    },
      businessVerifiedAt: {
      type: Date
    },
      verificationDocuments: [{
      type: {
      type: String,
      enum: ['tax_document', 'business_license', 'certificate_of_incorporation', 'other'],
      required: true
    },
    url: {
    type: String,
    required: true,
    trim: true
    },
    uploadedAt: {
    type: Date,
    default: Date.now
    },
    verified: {
    type: Boolean,
    default: false
    },
    verifiedAt: {
    type: Date
    }
  }],
  
  // Analytics and monitoring
  gatingAnalytics: {
    totalEmailsChecked: {
      type: Number,
      default: 0,
      min: [0, 'Total emails checked cannot be negative']
    },
    totalEmailsAllowed: {
      type: Number,
      default: 0,
      min: [0, 'Total emails allowed cannot be negative']
    },
    totalEmailsDenied: {
      type: Number,
      default: 0,
      min: [0, 'Total emails denied cannot be negative']
    },
    lastResetDate: {
      type: Date,
      index: true
    },
    dailyStats: [{
      date: {
        type: String,
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)']
      },
      checked: {
        type: Number,
        min: [0, 'Daily checked count cannot be negative'],
        default: 0
      },
      allowed: {
        type: Number,
        min: [0, 'Daily allowed count cannot be negative'],
        default: 0
      },
      denied: {
        type: Number,
        min: [0, 'Daily denied count cannot be negative'],
        default: 0
      },
      topDenialReasons: [{
        type: String,
        trim: true
      }]
    }]
  },

  customization: {

  theme: {
    type: String,
    enum: ['default', 'modern', 'classic', 'minimal', 'bold'],
    default: 'default'
  },
  primaryColor: {
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Primary color must be a valid hex color'],
    default: '#007bff'
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
  customDomain: {
    type: String,
    trim: true,
    lowercase: true
  },
  customCss: {
    type: String,
    trim: true,
    maxlength: [50000, 'Custom CSS cannot exceed 50,000 characters']
  },
  fonts: {
    primary: {
      type: String,
      trim: true
    },
    secondary: {
      type: String,
      trim: true
    }
  },
  layout: {
    headerStyle: {
      type: String,
      enum: ['default', 'minimal', 'centered', 'sidebar'],
      default: 'default'
    },
    footerStyle: {
      type: String,
      enum: ['default', 'minimal', 'expanded'],
      default: 'default'
    },
    sidebarEnabled: {
      type: Boolean,
      default: false
    }
  }
},

votingSettings: {
  type: {
    autoProcessEnabled: {
      type: Boolean,
      default: false,
      description: 'Enable automatic batch processing of pending votes'
    },
    batchThreshold: {
      type: Number,
      default: 20,
      min: [1, 'Batch threshold must be at least 1'],
      max: [100, 'Batch threshold cannot exceed 100'],
      description: 'Number of pending votes needed to trigger batch processing'
    },
    maxBatchSize: {
      type: Number,
      default: 50,
      min: [1, 'Max batch size must be at least 1'],
      max: [200, 'Max batch size cannot exceed 200'],
      description: 'Maximum number of votes to process in a single batch'
    },
    processingDelay: {
      type: Number,
      default: 300, // 5 minutes
      min: [0, 'Processing delay cannot be negative'],
      max: [3600, 'Processing delay cannot exceed 1 hour'],
      description: 'Delay in seconds before auto-processing triggers'
    },
    contractDeployedAt: {
      type: Date,
      description: 'When the voting contract was deployed'
    },
    networkId: {
      type: String,
      description: 'Blockchain network ID where voting contract is deployed'
    }
  },
  default: () => ({
    autoProcessEnabled: false,
    batchThreshold: 20,
    maxBatchSize: 50,
    processingDelay: 300
  })
},
  
// Integration settings
  integrationSettings: {
    syncWithCRM: {
      type: Boolean,
      default: false
    },
    crmWebhookUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'CRM webhook URL must be a valid HTTP/HTTPS URL'
      }
    },
    notifyOnDenial: {
      type: Boolean,
      default: false
    },
    notifyOnApproval: {
      type: Boolean,
      default: true
    },
    customWebhookUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Custom webhook URL must be a valid HTTP/HTTPS URL'
      }
    },
    slackNotifications: {
      enabled: {
        type: Boolean,
        default: false
      },
      webhookUrl: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https:\/\/hooks\.slack\.com\//.test(v);
          },
          message: 'Invalid Slack webhook URL'
        },
        select: false
      },
      channel: {
        type: String,
        trim: true,
        match: [/^#[a-z0-9-_]+$/, 'Invalid Slack channel format']
      },
      notifyOnDenial: {
        type: Boolean,
        default: false
      },
      notifyOnApproval: {
        type: Boolean,
        default: false
      }
    }
  }
}, { _id: false });

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
    
    // Certificate wallet
    certificateWallet: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'],
      index: true,
      sparse: true
    },
    
    // Email Gating Configuration
    emailGating: emailGatingSettingsSchema,
    
    // E-commerce integrations
    shopifyDomain: {
      type: String,
      trim: true,
      match: [/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/, 'Invalid Shopify domain format'],
      sparse: true
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
    shopifyConfig: {
      syncProducts: {
        type: Boolean,
        default: true
      },
      syncOrders: {
        type: Boolean,
        default: true
      },
      configuredBy: {
        type: String,
        trim: true
      },
      configuredAt: {
        type: Date
      }
    },
    shopifyUpdatedAt: {
      type: Date,
      index: true
    },
    
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
    wooUpdatedAt: {
      type: Date,
      index: true
    },
    
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
    
    // Enhanced Web3 settings
    web3Settings: {
      certificateWallet: {
        type: String,
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
        default: false
      },
      walletVerifiedAt: {
        type: Date,
        index: true
      },
      walletSignature: {
        type: String,
        trim: true,
        select: false
      },
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
        enum: [1, 5, 11155111, 137, 80001, 56, 97],
        default: 1
      },
      networkName: {
        type: String,
        enum: ['ethereum', 'goerli', 'sepolia', 'polygon', 'mumbai', 'bsc', 'bsc-testnet'],
        default: 'ethereum'
      },
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
    
    // Comprehensive transfer preferences
    transferPreferences: {
      autoTransfer: {
        type: Boolean,
        default: true,
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
      transferRules: {
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
        minimumValueThreshold: {
          type: String,
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
    
    // E-commerce integrations (extended)
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
    
    // Plan and subscription
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
        type: String,
        default: '0'
      },
      webhookEndpoints: {
        type: Number,
        min: [0, 'Webhook endpoint limit cannot be negative'],
        default: 1
      },
      emailGatingRules: {
        type: Number,
        min: [0, 'Email gating rules limit cannot be negative'],
        default: 10
      },
      gatedEmailsPerMonth: {
        type: Number,
        min: [0, 'Gated emails per month limit cannot be negative'],
        default: 10000
      }
    },
    
    // Transfer analytics
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
        type: String,
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
    
    // Analytics settings
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
      },
      trackEmailGating: {
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
    },
    updateSource: {
      type: String,
      trim: true,
      default: 'api'
    },
    updateMetadata: {
      type: Schema.Types.Mixed
    },
    lastWalletVerification: {
      type: Date,
      index: true
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        // Don't expose sensitive data in JSON responses
        delete ret.shopifyAccessToken;
        delete ret.shopifyWebhookSecret;
        delete ret.wooConsumerKey;
        delete ret.wooConsumerSecret;
        delete ret.wixApiKey;
        delete ret.wixRefreshToken;
        if (ret.web3Settings?.walletSignature) {
          delete ret.web3Settings.walletSignature;
        }
        if (ret.emailGating?.integrationSettings?.slackNotifications?.webhookUrl) {
          delete ret.emailGating.integrationSettings.slackNotifications.webhookUrl;
        }
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ===== INDEXES =====
BrandSettingsSchema.index({ business: 1 }, { unique: true });
BrandSettingsSchema.index({ certificateWallet: 1 }, { sparse: true });
BrandSettingsSchema.index({ 'web3Settings.certificateWallet': 1 }, { sparse: true });
BrandSettingsSchema.index({ plan: 1, isActive: 1 });
BrandSettingsSchema.index({ 'transferPreferences.autoTransfer': 1 });
BrandSettingsSchema.index({ 'web3Settings.chainId': 1 });
BrandSettingsSchema.index({ 'transferAnalytics.lastTransferAt': -1 });
BrandSettingsSchema.index({ subdomain: 1 }, { unique: true, sparse: true });
BrandSettingsSchema.index({ customDomain: 1 }, { unique: true, sparse: true });
BrandSettingsSchema.index({ shopifyDomain: 1 }, { sparse: true });
BrandSettingsSchema.index({ wooDomain: 1 }, { sparse: true });
BrandSettingsSchema.index({ wixDomain: 1 }, { sparse: true });
BrandSettingsSchema.index({ 'emailGating.enabled': 1, 'emailGating.mode': 1 });
BrandSettingsSchema.index({ 'emailGating.gatingAnalytics.lastResetDate': -1 });

// ===== VIRTUALS =====
BrandSettingsSchema.virtual('hasCustomDomain').get(function() {
  return !!this.customDomain;
});

BrandSettingsSchema.virtual('integrationStatus').get(function() {
  return {
    shopify: !!(this.shopifyDomain || this.shopifyIntegration?.shopifyDomain),
    woocommerce: !!(this.wooDomain || this.wooCommerceIntegration?.wooDomain),
    wix: !!(this.wixDomain || this.wixIntegration?.wixDomain)
  };
});

BrandSettingsSchema.virtual('web3Status').get(function() {
  const wallet = this.certificateWallet || this.web3Settings?.certificateWallet;
  return {
    walletConnected: !!wallet,
    walletVerified: this.web3Settings?.walletVerified || false,
    contractsDeployed: !!(this.web3Settings?.voteContract && this.web3Settings?.nftContract),
    autoTransferEnabled: this.shouldAutoTransfer(),
    networkSupported: this.web3Settings?.chainId ? [1, 137, 56].includes(this.web3Settings.chainId) : false
  };
});

BrandSettingsSchema.virtual('emailGatingStatus').get(function(this: IBrandSettings) {
  const gating = this.emailGating;
  if (!gating) {
    return {
      enabled: false,
      mode: 'disabled',
      rulesCount: 0,
      totalChecked: 0,
      successRate: 0
    };
  }
  
  const analytics = gating.gatingAnalytics;
  const totalChecked = analytics?.totalEmailsChecked || 0;
  const totalAllowed = analytics?.totalEmailsAllowed || 0;
  
  return {
    enabled: gating.enabled || false,
    mode: gating.mode || 'disabled',
    rulesCount: this.getEmailGatingRulesCount(),
    totalChecked,
    successRate: totalChecked > 0 ? Math.round((totalAllowed / totalChecked) * 100) : 0,
    lastActivity: analytics?.lastResetDate
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
 * Check if email gating is available for this plan
 */
BrandSettingsSchema.methods.hasEmailGating = function(): boolean {
  return ['growth', 'premium', 'enterprise'].includes(this.plan || 'foundation');
};

/**
 * Check if email gating is enabled and properly configured
 */
BrandSettingsSchema.methods.isEmailGatingEnabled = function(): boolean {
  return this.hasEmailGating() && 
         this.emailGating?.enabled === true && 
         this.emailGating?.mode !== 'disabled';
};

/**
 * Get the current email gating mode
 */
BrandSettingsSchema.methods.getEmailGatingMode = function(): 'whitelist' | 'blacklist' | 'disabled' {
  if (!this.isEmailGatingEnabled()) {
    return 'disabled';
  }
  return this.emailGating?.mode || 'disabled';
};

/**
 * Count the number of email gating rules configured
 */
BrandSettingsSchema.methods.getEmailGatingRulesCount = function(): number {
  if (!this.emailGating?.gatingRules) {
    return 0;
  }
  
  const rules = this.emailGating.gatingRules;
  let count = 0;
  
  if (rules.domainWhitelist?.length) count += rules.domainWhitelist.length;
  if (rules.domainBlacklist?.length) count += rules.domainBlacklist.length;
  if (rules.emailPatterns?.length) count += rules.emailPatterns.length;
  if (rules.ipWhitelist?.length) count += rules.ipWhitelist.length;
  if (rules.ipBlacklist?.length) count += rules.ipBlacklist.length;
  if (rules.geographicRestrictions?.enabled) count += 1;
  if (rules.votingWindow?.enabled) count += 1;
  
  return count;
};

/**
 * Check if voting window is currently active
 */
BrandSettingsSchema.methods.isVotingWindowActive = function(): boolean {
  const votingWindow = this.emailGating?.gatingRules?.votingWindow;
  if (!votingWindow?.enabled || !votingWindow.startDate || !votingWindow.endDate) {
    return true; // No window restrictions
  }
  
  const now = new Date();
  return now >= votingWindow.startDate && now <= votingWindow.endDate;
};

/**
 * Check if an email can vote based on gating rules
 */
BrandSettingsSchema.methods.canEmailVote = function(
  email: string, 
  context?: { 
    ip?: string; 
    country?: string; 
    userAgent?: string;
    previousVotes?: number;
  }
): { allowed: boolean; reason?: string } {
  // If email gating is not enabled, allow by default
  if (!this.isEmailGatingEnabled()) {
    return { allowed: true };
  }
  
  const rules = this.emailGating?.gatingRules;
  const mode = this.getEmailGatingMode();
  
  // Check voting window
  if (!this.isVotingWindowActive()) {
    return { allowed: false, reason: 'Voting window is not active' };
  }
  
  // Check vote limit per email
  if (rules?.maxVotesPerEmail && context?.previousVotes) {
    if (context.previousVotes >= rules.maxVotesPerEmail) {
      return { allowed: false, reason: 'Maximum votes per email exceeded' };
    }
  }
  
  // Extract domain from email
  const emailDomain = email.split('@')[1]?.toLowerCase();
  
  // Check geographic restrictions
  if (rules?.geographicRestrictions?.enabled && context?.country) {
    const { allowedCountries, blockedCountries } = rules.geographicRestrictions;
    
    if (allowedCountries?.length && !allowedCountries.includes(context.country)) {
      return { allowed: false, reason: 'Geographic restriction: country not allowed' };
    }
    
    if (blockedCountries?.length && blockedCountries.includes(context.country)) {
      return { allowed: false, reason: 'Geographic restriction: country blocked' };
    }
  }
  
  // Check IP restrictions
  if (context?.ip) {
    if (rules?.ipBlacklist?.length) {
      const isBlocked = rules.ipBlacklist.some(blockedIp => {
        return context.ip === blockedIp || context.ip?.startsWith(blockedIp.split('/')[0]);
      });
      if (isBlocked) {
        return { allowed: false, reason: 'IP address blocked' };
      }
    }
    
    if (rules?.ipWhitelist?.length) {
      const isAllowed = rules.ipWhitelist.some(allowedIp => {
        return context.ip === allowedIp || context.ip?.startsWith(allowedIp.split('/')[0]);
      });
      if (!isAllowed) {
        return { allowed: false, reason: 'IP address not whitelisted' };
      }
    }
  }
  
  // Apply mode-specific rules
  if (mode === 'whitelist') {
    // Check domain whitelist
    if (rules?.domainWhitelist?.length && emailDomain) {
      if (rules.domainWhitelist.includes(emailDomain)) {
        return { allowed: true };
      }
    }
    
    // Check email patterns
    if (rules?.emailPatterns?.length) {
      const matchesPattern = rules.emailPatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(email);
        } catch {
          return false;
        }
      });
      if (matchesPattern) {
        return { allowed: true };
      }
    }
    
    // If whitelist mode and no matches, deny
    return { allowed: false, reason: 'Email not found in whitelist' };
    
  } else if (mode === 'blacklist') {
    // Check domain blacklist
    if (rules?.domainBlacklist?.length && emailDomain) {
      if (rules.domainBlacklist.includes(emailDomain)) {
        return { allowed: false, reason: 'Domain is blacklisted' };
      }
    }
    
    // Check email patterns (for blacklist, patterns indicate blocked emails)
    if (rules?.emailPatterns?.length) {
      const matchesPattern = rules.emailPatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(email);
        } catch {
          return false;
        }
      });
      if (matchesPattern) {
        return { allowed: false, reason: 'Email matches blocked pattern' };
      }
    }
    
    // If blacklist mode and no matches, allow
    return { allowed: true };
  }
  
  // Default fallback
  return { allowed: this.emailGating?.allowUnregistered !== false };
};

/**
 * Update email gating analytics
 */
BrandSettingsSchema.methods.updateGatingAnalytics = async function(
  emailChecked: string, 
  allowed: boolean, 
  reason?: string
): Promise<void> {
  if (!this.emailGating) {
    this.emailGating = {
      enabled: false,
      mode: 'disabled',
      allowUnregistered: true,
      requireApproval: false,
      autoSyncEnabled: false,
      syncSources: [],
      welcomeEmailEnabled: true,
      accessDeniedMessage: 'Your email is not authorized to access this voting platform. Please contact the brand for access.'
    };
  }
  
  if (!this.emailGating.gatingAnalytics) {
    this.emailGating.gatingAnalytics = {
      totalEmailsChecked: 0,
      totalEmailsAllowed: 0,
      totalEmailsDenied: 0,
      dailyStats: []
    };
  }
  
  const analytics = this.emailGating.gatingAnalytics;
  
  // Update totals
  analytics.totalEmailsChecked += 1;
  if (allowed) {
    analytics.totalEmailsAllowed += 1;
  } else {
    analytics.totalEmailsDenied += 1;
  }
  
  // Update daily stats
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let todayStats = analytics.dailyStats?.find(stat => stat.date === today);
  
  if (!todayStats) {
    todayStats = {
      date: today,
      checked: 0,
      allowed: 0,
      denied: 0,
      topDenialReasons: []
    };
    if (!analytics.dailyStats) analytics.dailyStats = [];
    analytics.dailyStats.push(todayStats);
  }
  
  todayStats.checked += 1;
  if (allowed) {
    todayStats.allowed += 1;
  } else {
    todayStats.denied += 1;
    if (reason && !todayStats.topDenialReasons.includes(reason)) {
      todayStats.topDenialReasons.push(reason);
      // Keep only top 5 reasons
      if (todayStats.topDenialReasons.length > 5) {
        todayStats.topDenialReasons = todayStats.topDenialReasons.slice(0, 5);
      }
    }
  }
  
  // Keep only last 30 days of daily stats
  if (analytics.dailyStats) {
    analytics.dailyStats = analytics.dailyStats
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);
  }
  
  await this.save();
};

/**
 * Check if automatic transfer should be performed
 */
BrandSettingsSchema.methods.shouldAutoTransfer = function(): boolean {
  if (!this.hasWeb3Features()) return false;
  const wallet = this.certificateWallet || this.web3Settings?.certificateWallet;
  if (!wallet || !this.web3Settings?.walletVerified) return false;
  if (this.transferPreferences?.autoTransfer === false) return false;
  return true;
};

/**
 * Check if brand can transfer certificates to their wallet
 */
BrandSettingsSchema.methods.canTransferToBrand = function(): boolean {
  const wallet = this.certificateWallet || this.web3Settings?.certificateWallet;
  return this.hasWeb3Features() && 
         !!wallet && 
         this.web3Settings?.walletVerified &&
         this.validateWalletAddress(wallet);
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
  const monthlySuccessfulTransfers = this.transferAnalytics.successfulTransfers;
  currentMonthStats.successRate = Math.round((monthlySuccessfulTransfers / currentMonthStats.transfers) * 100);
  
  // Keep only last 12 months
  this.transferAnalytics.monthlyStats = monthlyStats
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
  
  await this.save();
};

// ===== STATIC METHODS =====

/**
 * Find brands with email gating enabled
 */
BrandSettingsSchema.statics.findEmailGatingEnabled = function() {
  return this.find({
    'emailGating.enabled': true,
    'emailGating.mode': { $in: ['whitelist', 'blacklist'] },
    plan: { $in: ['growth', 'premium', 'enterprise'] },
    isActive: true
  });
};

/**
 * Find brands by email gating mode
 */
BrandSettingsSchema.statics.findByEmailGatingMode = function(mode: 'whitelist' | 'blacklist' | 'disabled') {
  return this.find({
    'emailGating.enabled': mode !== 'disabled',
    'emailGating.mode': mode,
    isActive: true
  });
};

/**
 * Find brands with auto-transfer enabled and verified wallets
 */
BrandSettingsSchema.statics.findAutoTransferEnabled = function() {
  return this.find({
    $or: [
      { 'certificateWallet': { $exists: true, $ne: null } },
      { 'web3Settings.certificateWallet': { $exists: true, $ne: null } }
    ],
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
    $or: [
      { 'certificateWallet': { $exists: true, $ne: null } },
      { 'web3Settings.certificateWallet': { $exists: true, $ne: null } }
    ],
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
 * Get email gating analytics summary across all brands
 */
BrandSettingsSchema.statics.getGlobalEmailGatingAnalytics = async function() {
  const results = await this.aggregate([
    {
      $match: {
        'emailGating.enabled': true,
        'emailGating.gatingAnalytics.totalEmailsChecked': { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        totalBrands: { $sum: 1 },
        totalEmailsChecked: { $sum: '$emailGating.gatingAnalytics.totalEmailsChecked' },
        totalEmailsAllowed: { $sum: '$emailGating.gatingAnalytics.totalEmailsAllowed' },
        totalEmailsDenied: { $sum: '$emailGating.gatingAnalytics.totalEmailsDenied' },
        avgRulesPerBrand: { $avg: { $size: { $ifNull: ['$emailGating.gatingRules.domainWhitelist', []] } } }
      }
    }
  ]);
  
  const result = results[0] || {
    totalBrands: 0,
    totalEmailsChecked: 0,
    totalEmailsAllowed: 0,
    totalEmailsDenied: 0,
    avgRulesPerBrand: 0
  };
  
  result.allowanceRate = result.totalEmailsChecked > 0 
    ? Math.round((result.totalEmailsAllowed / result.totalEmailsChecked) * 100) 
    : 0;
  
  return result;
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
  const wallet = this.certificateWallet || this.web3Settings?.certificateWallet;
  if (this.isModified('certificateWallet') || this.isModified('web3Settings.certificateWallet')) {
    if (wallet && !this.transferPreferences) {
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
  }
  
  // Initialize email gating defaults if enabled
  if (this.isModified('emailGating.enabled') && this.emailGating?.enabled) {
    if (!this.emailGating.gatingAnalytics) {
      this.emailGating.gatingAnalytics = {
        totalEmailsChecked: 0,
        totalEmailsAllowed: 0,
        totalEmailsDenied: 0,
        dailyStats: []
      };
    }
    
    // Set default gating rules if not present
    if (!this.emailGating.gatingRules) {
      this.emailGating.gatingRules = {
        maxVotesPerEmail: 1,
        votingWindow: {
          enabled: false,
          timezone: 'UTC'
        },
        geographicRestrictions: {
          enabled: false
        }
      };
    }
  }
  
  // Validate email gating plan restrictions
  if (this.emailGating?.enabled && !this.hasEmailGating()) {
    this.emailGating.enabled = false;
    this.emailGating.mode = 'disabled';
  }
  
  // Initialize transfer analytics if not present
  if (wallet && !this.transferAnalytics) {
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
  
  // Sync certificateWallet with web3Settings if only one is set
  if (this.certificateWallet && !this.web3Settings?.certificateWallet) {
    if (!this.web3Settings) this.web3Settings = {};
    this.web3Settings.certificateWallet = this.certificateWallet;
  } else if (this.web3Settings?.certificateWallet && !this.certificateWallet) {
    this.certificateWallet = this.web3Settings.certificateWallet;
  }
  
  // Increment version on significant changes
  const significantFields = [
    'certificateWallet',
    'web3Settings.certificateWallet', 
    'plan', 
    'transferPreferences',
    'web3Settings.walletVerified',
    'emailGating.enabled',
    'emailGating.mode',
    'emailGating.gatingRules'
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
  const wallet = doc.certificateWallet || doc.web3Settings?.certificateWallet;
  
  // Emit events for real-time updates
  if (doc.isModified('certificateWallet') || doc.isModified('web3Settings.certificateWallet')) {
    process.nextTick(() => {
      logger.info(`Brand ${doc.business} wallet updated: ${wallet ? 'connected' : 'disconnected'}`);
    });
  }
  
  if (doc.isModified('web3Settings.walletVerified')) {
    process.nextTick(() => {
      logger.info(`Brand ${doc.business} wallet verification: ${doc.web3Settings?.walletVerified ? 'verified' : 'unverified'}`);
    });
  }
  
  if (doc.isModified('transferPreferences')) {
    process.nextTick(() => {
      logger.info(`Brand ${doc.business} transfer preferences updated`);
    });
  }
  
  if (doc.isModified('emailGating')) {
    process.nextTick(() => {
      logger.info(`Brand ${doc.business} email gating settings updated: ${doc.emailGating?.enabled ? 'enabled' : 'disabled'} (${doc.emailGating?.mode || 'disabled'})`);
    });
  }
  
  // Clear relevant caches
  if (doc.isModified('web3Settings') || doc.isModified('transferPreferences') || doc.isModified('certificateWallet') || doc.isModified('emailGating')) {
    process.nextTick(() => {
      // Clear business settings cache
      logger.info(`Clearing cache for business ${doc.business}`);
    });
  }
});

/**
 * Pre-remove hook for cleanup (document-level)
 */
BrandSettingsSchema.pre('remove', function(this: IBrandSettings, next) {
  logger.info('Removing brand settings for business ${this.business}');
  // Could trigger cleanup of related data, cancel pending transfers, clear email gating rules, etc.
  next();
});

/**
 * Pre-deleteOne hook for cleanup (query-level)
 */
BrandSettingsSchema.pre('deleteOne', function(next) {
  logger.info('Removing brand settings via deleteOne query');
  // For query-level hooks, you'd need to find the document first if you need its data
  next();
});

/**
 * Pre-findOneAndDelete hook for cleanup (query-level)
 */
BrandSettingsSchema.pre('findOneAndDelete', function(next) {
  logger.info('Removing brand settings via findOneAndDelete query');
  // For query-level hooks, you'd need to find the document first if you need its data
  next();
});

export const BrandSettings = model<IBrandSettings>('BrandSettings', BrandSettingsSchema);