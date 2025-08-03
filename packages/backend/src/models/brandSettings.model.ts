// src/models/brandSettings.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface IBrandSettings extends Document {
  business:            Types.ObjectId;
  themeColor?:         string;
  logoUrl?:            string;
  bannerImages?:       string[];
  customCss?:          string;
  manufacturers?:      Types.ObjectId[];
  shopifyDomain?:      string;
  shopifyAccessToken?: string;
  shopifyWebhookSecret?: string;
  wooDomain?:          string;
  wooConsumerKey?:     string;
  wooConsumerSecret?:  string;
  wixDomain?:          string;
  wixApiKey?:          string;
  subdomain:           string;
  customDomain?:       string;
  certificateWallet?:  string;
  nftContract?:        string;
  voteContract?:       string;
  stripeCustomerId?:   string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItems?: {
    priceId:           string;
    subscriptionItemId: string;
  }[];
  plan?:               string;
  createdAt:           Date;
  updatedAt:           Date;
}

const BrandSettingsSchema = new Schema<IBrandSettings>(
  {
    business: {
      type:     Schema.Types.ObjectId,  
      ref:      'Business',
      required: true,
      unique:   true
    },
    themeColor:        { type: String },
    logoUrl:           { type: String },
    bannerImages:      [{ type: String }],
    customCss:         { type: String },
    manufacturers:     [{
      type:     Schema.Types.ObjectId, 
      ref:      'Manufacturer',
      default:  []
    }],
    shopifyDomain:     { type: String, unique: true, sparse: true },
    shopifyAccessToken:{ type: String },
    shopifyWebhookSecret:{ type: String },
    wooDomain:         { type: String, unique: true, sparse: true },
    wooConsumerKey:    { type: String },
    wooConsumerSecret: { type: String },
    wixDomain:         { type: String, unique: true, sparse: true },
    wixApiKey:         { type: String },
    subdomain:         { type: String, required: true, unique: true },
    customDomain:      { type: String, unique: true, sparse: true },
    certificateWallet: {
      type: String,
      validate: {
        validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
        message:   (props: any) => `${props.value} is not a valid Ethereum address!`
      }
    },
    nftContract: {
      type: String,
      validate: {
        validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
        message:   (props: any) => `${props.value} is not a valid Ethereum address!`
      }
    },
    voteContract: {
      type: String,
      validate: {
        validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
        message:   (props: any) => `${props.value} is not a valid Ethereum address!`
      }
    },
    stripeCustomerId:     { type: String },
    stripeSubscriptionId: { type: String },
    stripeSubscriptionItems: [{
      priceId:           { type: String },
      subscriptionItemId:{ type: String }
    }],
    plan:                { type: String }
  },
  { timestamps: true }
);

export const BrandSettings = model<IBrandSettings>(
  'BrandSettings',
  BrandSettingsSchema
);

