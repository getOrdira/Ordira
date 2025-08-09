// src/models/brandSettings.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IBrandSettings extends Document {
  business: Types.ObjectId;
  
  // Brand customization
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  customCss?: string;
  subdomain?: string;
  customDomain?: string;
  
  // Blockchain settings
  certificateWallet?: string;
  voteContract?: string;
  nftContract?: string;
  
  // Subscription
  plan?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItems?: Array<{
    priceId: string;
    subscriptionItemId: string;
  }>;
  
  // Connected manufacturers
  manufacturers?: Types.ObjectId[];
  
  // E-commerce integrations
  // Shopify
  shopifyDomain?: string;
  shopifyAccessToken?: string;
  shopifyWebhookSecret?: string;
  shopifyConnectedAt?: Date;
  shopifyLastSync?: Date;
  
  // Wix
  wixDomain?: string;
  wixApiKey?: string;
  wixRefreshToken?: string;
  wixConnectedAt?: Date;
  wixLastSync?: Date;
  
  // WooCommerce
  wooDomain?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
  wooConnectedAt?: Date;
  wooLastSync?: Date;
  
  // Instance methods
  hasShopifyIntegration(): boolean;
  hasWixIntegration(): boolean;
  hasWooCommerceIntegration(): boolean;
  getActiveIntegrations(): string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BrandSettingsSchema = new Schema<IBrandSettings>({
  business: { 
    type: Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true, 
    unique: true,
    index: true
  },
  
  // Brand customization
  themeColor: { 
    type: String, 
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format']
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
      message: 'Banner image must be a valid HTTP/HTTPS URL'
    }
  }],
  customCss: { 
    type: String,
    maxlength: [50000, 'Custom CSS cannot exceed 50KB']
  },
  subdomain: { 
    type: String, 
    trim: true, 
    unique: true, 
    sparse: true,
    lowercase: true,
    match: [/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Invalid subdomain format'],
    minlength: [3, 'Subdomain must be at least 3 characters'],
    maxlength: [63, 'Subdomain cannot exceed 63 characters']
  },
  customDomain: { 
    type: String, 
    trim: true, 
    unique: true, 
    sparse: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return !v || /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/.test(v);
      },
      message: 'Invalid domain format'
    }
  },
  
  // Blockchain settings with validation
  certificateWallet: { 
    type: String, 
    trim: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format']
  },
  voteContract: { 
    type: String, 
    trim: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format']
  },
  nftContract: { 
    type: String, 
    trim: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format']
  },
  
  // Subscription
  plan: { 
    type: String, 
    trim: true,
    enum: ['foundation', 'growth', 'premium', 'enterprise'],
    default: 'foundation'
  },
  stripeCustomerId: { 
    type: String, 
    trim: true,
    match: [/^cus_[a-zA-Z0-9]+$/, 'Invalid Stripe customer ID format']
  },
  stripeSubscriptionId: { 
    type: String, 
    trim: true,
    match: [/^sub_[a-zA-Z0-9]+$/, 'Invalid Stripe subscription ID format']
  },
  stripeSubscriptionItems: [{
    priceId: { 
      type: String, 
      required: true,
      match: [/^price_[a-zA-Z0-9]+$/, 'Invalid Stripe price ID format']
    },
    subscriptionItemId: { 
      type: String, 
      required: true,
      match: [/^si_[a-zA-Z0-9]+$/, 'Invalid Stripe subscription item ID format']
    }
  }],
  
  // Connected manufacturers
  manufacturers: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Manufacturer'
  }],
  
  // E-commerce integrations with validation
  // Shopify
  shopifyDomain: { 
    type: String, 
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Invalid Shopify domain format']
  },
  shopifyAccessToken: { 
    type: String, 
    trim: true,
    select: false // Hide from queries by default for security
  },
  shopifyWebhookSecret: { 
    type: String, 
    trim: true,
    select: false
  },
  shopifyConnectedAt: { type: Date },
  shopifyLastSync: { type: Date },
  
  // Wix
  wixDomain: { 
    type: String, 
    trim: true
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
  wixConnectedAt: { type: Date },
  wixLastSync: { type: Date },
  
  // WooCommerce
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
    select: false
  },
  wooConsumerSecret: { 
    type: String, 
    trim: true,
    select: false
  },
  wooConnectedAt: { type: Date },
  wooLastSync: { type: Date }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Optimized indexes
BrandSettingsSchema.index({ business: 1 });
BrandSettingsSchema.index({ subdomain: 1 });
BrandSettingsSchema.index({ customDomain: 1 });
BrandSettingsSchema.index({ plan: 1 });
BrandSettingsSchema.index({ shopifyDomain: 1 }, { sparse: true });
BrandSettingsSchema.index({ wixDomain: 1 }, { sparse: true });
BrandSettingsSchema.index({ wooDomain: 1 }, { sparse: true });

// Compound indexes for common queries
BrandSettingsSchema.index({ business: 1, plan: 1 });
BrandSettingsSchema.index({ business: 1, shopifyDomain: 1 });

// Virtual for total integrations
BrandSettingsSchema.virtual('totalIntegrations').get(function() {
  let count = 0;
  if (this.shopifyAccessToken) count++;
  if (this.wixApiKey) count++;
  if (this.wooConsumerKey) count++;
  return count;
});

// Virtual for integration status
BrandSettingsSchema.virtual('integrationStatus').get(function() {
  return {
    shopify: this.hasShopifyIntegration(),
    wix: this.hasWixIntegration(),
    woocommerce: this.hasWooCommerceIntegration(),
    total: this.totalIntegrations
  };
});

// Instance methods
BrandSettingsSchema.methods.hasShopifyIntegration = function(): boolean {
  return !!(this.shopifyAccessToken && this.shopifyDomain);
};

BrandSettingsSchema.methods.hasWixIntegration = function(): boolean {
  return !!(this.wixApiKey && this.wixDomain);
};

BrandSettingsSchema.methods.hasWooCommerceIntegration = function(): boolean {
  return !!(this.wooConsumerKey && this.wooDomain);
};

BrandSettingsSchema.methods.getActiveIntegrations = function(): string[] {
  const integrations = [];
  if (this.hasShopifyIntegration()) integrations.push('shopify');
  if (this.hasWixIntegration()) integrations.push('wix');
  if (this.hasWooCommerceIntegration()) integrations.push('woocommerce');
  return integrations;
};

BrandSettingsSchema.methods.hasBlockchainSetup = function(): boolean {
  return !!(this.certificateWallet || this.voteContract || this.nftContract);
};

BrandSettingsSchema.methods.updateLastSync = function(platform: 'shopify' | 'wix' | 'woocommerce'): Promise<IBrandSettings> {
  const syncField = `${platform}LastSync` as keyof IBrandSettings;
  (this as any)[syncField] = new Date();
  return this.save();
};

// Static methods
BrandSettingsSchema.statics.findByIntegration = function(platform: 'shopify' | 'wix' | 'woocommerce') {
  const query: any = {};
  switch (platform) {
    case 'shopify':
      query.shopifyAccessToken = { $exists: true, $ne: null };
      break;
    case 'wix':
      query.wixApiKey = { $exists: true, $ne: null };
      break;
    case 'woocommerce':
      query.wooConsumerKey = { $exists: true, $ne: null };
      break;
  }
  return this.find(query);
};

BrandSettingsSchema.statics.findByPlan = function(plan: string) {
  return this.find({ plan });
};

// Pre-save middleware for validation
BrandSettingsSchema.pre('save', function(next) {
  // Ensure subdomain is lowercase and doesn't contain invalid characters
  if (this.subdomain) {
    this.subdomain = this.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (this.subdomain.startsWith('-') || this.subdomain.endsWith('-')) {
      return next(new Error('Subdomain cannot start or end with hyphen'));
    }
  }
  
  // Validate manufacturer count
  if (this.manufacturers && this.manufacturers.length > 50) {
    return next(new Error('Cannot connect more than 50 manufacturers'));
  }
  
  next();
});

export const BrandSettings = model<IBrandSettings>('BrandSettings', BrandSettingsSchema);