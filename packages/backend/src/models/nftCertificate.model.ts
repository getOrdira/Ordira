// src/models/nftCertificate.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface INftCertificate extends Document {
  business:  Types.ObjectId;
  product:   Types.ObjectId;
  recipient: string;
  tokenId:   string;
  tokenUri:  string;
  txHash:    string;
  mintedAt:  Date;
}

const NftCertificateSchema = new Schema<INftCertificate>(
  {
    business: {
      type:     Schema.Types.ObjectId, // <-- Schema.Types.ObjectId
      ref:      'BrandSettings',
      required: true,
      index:    true
    },
    product: {
      type:     Schema.Types.ObjectId, // <-- and here
      ref:      'Product',
      required: true
    },
    recipient: { type: String, required: true },
    tokenId:   { type: String, required: true },
    tokenUri:  { type: String, required: true },
    txHash:    { type: String, required: true },
    mintedAt:  { type: Date,   default: () => new Date() }
  },
  {
    // No need for additional timestamps since we have mintedAt
    // But you could add `timestamps: true` if you want createdAt/updatedAt too
  }
);

// Prevent duplicate certificates per business + tokenId
NftCertificateSchema.index(
  { business: 1, tokenId: 1 },
  { unique: true }
);

// Compound index for efficient monthly usage queries
NftCertificateSchema.index(
  { business: 1, mintedAt: 1 }
);

export const NftCertificate = model<INftCertificate>('NftCertificate', NftCertificateSchema);
