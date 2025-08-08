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
  business: { type: Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
  
  // Brand customization
  themeColor: { type: String, trim: true },
  logoUrl: { type: String, trim: true },
  bannerImages: [{ type: String, trim: true }],
  customCss: { type: String },
  subdomain: { type: String, trim: true, unique: true, sparse: true },
  customDomain: { type: String, trim: true, unique: true, sparse: true },
  
  // Blockchain settings
  certificateWallet: { type: String, trim: true },
  voteContract: { type: String, trim: true },
  nftContract: { type: String, trim: true },
  
  // Subscription
  plan: { type: String, trim: true },
  stripeCustomerId: { type: String, trim: true },
  stripeSubscriptionId: { type: String, trim: true },
  stripeSubscriptionItems: [{
    priceId: { type: String, required: true },
    subscriptionItemId: { type: String, required: true }
  }],
  
  // Connected manufacturers
  manufacturers: [{ type: Schema.Types.ObjectId, ref: 'Manufacturer' }],
  
  // E-commerce integrations
  // Shopify
  shopifyDomain: { type: String, trim: true },
  shopifyAccessToken: { type: String, trim: true },
  shopifyWebhookSecret: { type: String, trim: true },
  shopifyConnectedAt: { type: Date },
  shopifyLastSync: { type: Date },
  
  // Wix
  wixDomain: { type: String, trim: true },
  wixApiKey: { type: String, trim: true },
  wixRefreshToken: { type: String, trim: true },
  wixConnectedAt: { type: Date },
  wixLastSync: { type: Date },
  
  // WooCommerce
  wooDomain: { type: String, trim: true },
  wooConsumerKey: { type: String, trim: true },
  wooConsumerSecret: { type: String, trim: true },
  wooConnectedAt: { type: Date },
  wooLastSync: { type: Date }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
BrandSettingsSchema.index({ business: 1 });
BrandSettingsSchema.index({ subdomain: 1 });
BrandSettingsSchema.index({ customDomain: 1 });
BrandSettingsSchema.index({ shopifyDomain: 1 });
BrandSettingsSchema.index({ wixDomain: 1 });
BrandSettingsSchema.index({ wooDomain: 1 });

// Virtual for total integrations
BrandSettingsSchema.virtual('totalIntegrations').get(function() {
  let count = 0;
  if (this.shopifyAccessToken) count++;
  if (this.wixApiKey) count++;
  if (this.wooConsumerKey) count++;
  return count;
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

export const BrandSettings = model<IBrandSettings>('BrandSettings', BrandSettingsSchema);

