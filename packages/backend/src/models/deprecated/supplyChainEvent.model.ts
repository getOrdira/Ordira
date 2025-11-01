// src/models/supplyChainEvent.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import { logger } from '../../utils/logger';

export interface ISupplyChainEvent extends Document {
  product: Types.ObjectId;
  certificate?: Types.ObjectId; // Links to your existing NFT certificates
  manufacturer: Types.ObjectId;
  eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
  eventData: {
    location?: string;
    coordinates?: { lat: number; lng: number };
    temperature?: number; // For cold chain
    humidity?: number;
    qualityMetrics?: Record<string, any>;
  };
  qrCodeUrl?: string;
  txHash?: string;
  blockNumber?: number;
  
  // Analytics integration
  viewCount: number;
  lastViewedAt?: Date;
  
  // Instance methods
  generateQrCode(): Promise<ISupplyChainEvent>;
  logToBlockchain(): Promise<ISupplyChainEvent>;
  incrementViewCount(): Promise<ISupplyChainEvent>;
}

const SupplyChainEventSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  certificate: { type: Schema.Types.ObjectId, ref: 'Certificate' },
  manufacturer: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  eventType: {
    type: String,
    required: true,
    enum: ['sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered']
  },
  eventData: {
    location: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    temperature: Number,
    humidity: Number,
    qualityMetrics: Schema.Types.Mixed
  },
  qrCodeUrl: String,
  txHash: String,
  blockNumber: Number,
  viewCount: { type: Number, default: 0 },
  lastViewedAt: Date
}, {
  timestamps: true
});

// Instance methods
SupplyChainEventSchema.methods.generateQrCode = async function(): Promise<ISupplyChainEvent> {
  // Generate QR code URL (implement based on your QR service)
  this.qrCodeUrl = `${process.env.FRONTEND_URL}/track/${this._id}`;
  return this;
};

SupplyChainEventSchema.methods.logToBlockchain = async function(): Promise<ISupplyChainEvent> {
  // Log to blockchain using NFT service
  const { NftService } = await import('../../services/blockchain/nft.service');
  const nftService = new NftService();
  
  try {
    const result = await nftService.logSupplyChainEvent({
      productId: this.product.toString(),
      eventType: this.eventType,
      location: this.eventData?.location,
      details: JSON.stringify(this.eventData)
    });
    
    this.txHash = result.txHash;
    this.blockNumber = result.blockNumber;
  } catch (error) {
    logger.error('Failed to log to blockchain:', error);
    // Don't throw - allow event to be saved without blockchain
  }
  
  return this;
};

SupplyChainEventSchema.methods.incrementViewCount = async function(): Promise<ISupplyChainEvent> {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this;
};

export const SupplyChainEvent = mongoose.model<ISupplyChainEvent>('SupplyChainEvent', SupplyChainEventSchema);