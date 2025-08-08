// src/models/product.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  description?: string;
  media: Types.ObjectId[];
  
  // Owner - either business OR manufacturer
  business?: Types.ObjectId;
  manufacturer?: Types.ObjectId;
  
  // Product details
  category?: string;
  status: 'draft' | 'active' | 'archived';
  sku?: string;
  price?: number;
  tags: string[];
  
  // Specifications and manufacturing details
  specifications: Record<string, string>;
  manufacturingDetails?: {
    materials?: string[];
    dimensions?: string;
    weight?: string;
    origin?: string;
  };
  
  // Analytics
  voteCount: number;
  certificateCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, maxlength: 2000 },
  media: [{ type: Types.ObjectId, ref: 'Media' }],
  
  // Owner - either business OR manufacturer (not both)
  business: { type: Types.ObjectId, ref: 'Business' },
  manufacturer: { type: Types.ObjectId, ref: 'Manufacturer' },
  
  // Product details
  category: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  sku: { type: String, trim: true, unique: true, sparse: true },
  price: { type: Number, min: 0 },
  tags: [{ type: String, trim: true }],
  
  // Specifications and manufacturing
  specifications: {
    type: Map,
    of: String,
    default: new Map()
  },
  manufacturingDetails: {
    materials: [{ type: String, trim: true }],
    dimensions: { type: String, trim: true },
    weight: { type: String, trim: true },
    origin: { type: String, trim: true }
  },
  
  // Analytics
  voteCount: { type: Number, default: 0, min: 0 },
  certificateCount: { type: Number, default: 0, min: 0 }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
ProductSchema.index({ business: 1 });
ProductSchema.index({ manufacturer: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ voteCount: -1 });

// Validation: product must belong to either business OR manufacturer, not both
ProductSchema.pre('save', function(next) {
  if (this.business && this.manufacturer) {
    return next(new Error('Product cannot belong to both business and manufacturer'));
  }
  if (!this.business && !this.manufacturer) {
    return next(new Error('Product must belong to either business or manufacturer'));
  }
  next();
});

// Virtual for owner type
ProductSchema.virtual('ownerType').get(function() {
  return this.business ? 'business' : 'manufacturer';
});

// Virtual for owner ID
ProductSchema.virtual('ownerId').get(function() {
  return this.business?.toString() || this.manufacturer?.toString();
});

// Instance methods
ProductSchema.methods.incrementVoteCount = function(): Promise<IProduct> {
  this.voteCount += 1;
  return this.save();
};

ProductSchema.methods.incrementCertificateCount = function(): Promise<IProduct> {
  this.certificateCount += 1;
  return this.save();
};

ProductSchema.methods.isOwnedBy = function(userId: string, userType: 'business' | 'manufacturer'): boolean {
  if (userType === 'business') {
    return this.business?.toString() === userId;
  } else {
    return this.manufacturer?.toString() === userId;
  }
};

// Static methods
ProductSchema.statics.findByOwner = function(ownerId: string, ownerType: 'business' | 'manufacturer') {
  const query = ownerType === 'business' 
    ? { business: ownerId }
    : { manufacturer: ownerId };
  return this.find(query);
};

ProductSchema.statics.getActiveProducts = function() {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

ProductSchema.statics.getProductsByCategory = function(category: string) {
  return this.find({ category, status: 'active' }).sort({ voteCount: -1 });
};

export const Product = model<IProduct>('Product', ProductSchema);