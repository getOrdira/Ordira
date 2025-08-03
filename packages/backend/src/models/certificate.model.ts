// src/models/certificate.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  business: Types.ObjectId;    // which brand
  product: Types.ObjectId;     // which product
  recipient: string;           // wallet or email
  tokenId: string;             
  tokenUri: string;
  txHash: string;              
  createdAt: Date;
}

const CertificateSchema = new Schema<ICertificate>({
  business:  { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  product:   { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  recipient: { type: String, required: true },
  tokenId:   { type: String, required: true },
  txHash:    { type: String, required: true }
}, { timestamps: true });

export const Certificate = model<ICertificate>('Certificate', CertificateSchema);
