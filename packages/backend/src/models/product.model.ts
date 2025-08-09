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
  viewCount: number;
  lastViewedAt?: Date;
  
  // SEO and metadata
  slug?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  
  // Instance methods
  incrementVoteCount(): Promise<IProduct>;
  incrementCertificateCount(): Promise<IProduct>;
  incrementViewCount(): Promise<IProduct>;
  isOwnedBy(userId: string, userType: 'business' | 'manufacturer'): boolean;
  generateSlug(): string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  title: { 
    type: String, 
    required: [true, 'Product title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  media: [{ 
    type: Types.ObjectId, 
    ref: 'Media',
    validate: {
      validator: function(media: Types.ObjectId[]) {
        return media.length <= 20;
      },
      message: 'Product cannot have more than 20 media files'
    }
  }],
  
  // Owner - either business OR manufacturer (not both)
  business: { 
    type: Types.ObjectId, 
    ref: 'Business',
    sparse: true
  },
  manufacturer: { 
    type: Types.ObjectId, 
    ref: 'Manufacturer',
    sparse: true
  },
  
  // Product details
  category: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
    index: true
  },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
    index: true
  },
  sku: { 
    type: String, 
    trim: true, 
    unique: true, 
    sparse: true,
    match: [/^[A-Z0-9\-_]+$/i, 'SKU can only contain letters, numbers, hyphens, and underscores'],
    maxlength: [50, 'SKU cannot exceed 50 characters'],
    index: true
  },
  price: { 
    type: Number, 
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(v: number) {
        return !v || v <= 1000000; // Max price $1M
      },
      message: 'Price cannot exceed $1,000,000'
    }
  },
  tags: [{
    type: String, 
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  // Specifications and manufacturing
  specifications: {
    type: Map,
    of: String,
    default: new Map(),
    validate: {
      validator: function(v: Map<string, string>) {
        return v.size <= 50; // Max 50 specifications
      },
      message: 'Cannot have more than 50 specifications'
    }
  },
  manufacturingDetails: {
    materials: [{
      type: String, 
      trim: true,
      maxlength: [100, 'Material name cannot exceed 100 characters']
    }],
    dimensions: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Dimensions cannot exceed 100 characters']
    },
    weight: { 
      type: String, 
      trim: true,
      maxlength: [50, 'Weight cannot exceed 50 characters']
    },
    origin: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Origin cannot exceed 100 characters']
    }
  },
  
  // Analytics
  voteCount: { 
    type: Number, 
    default: 0, 
    min: [0, 'Vote count cannot be negative'],
    index: true
  },
  certificateCount: { 
    type: Number, 
    default: 0, 
    min: [0, 'Certificate count cannot be negative'],
    index: true
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  lastViewedAt: {
    type: Date
  },
  
  // SEO fields
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    maxlength: [100, 'Slug cannot exceed 100 characters'],
    sparse: true
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [300, 'Meta description cannot exceed 300 characters']
  },
  metaKeywords: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Meta keyword cannot exceed 50 characters']
  }]
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

// Indexes for better performance
ProductSchema.index({ business: 1, status: 1, createdAt: -1 });
ProductSchema.index({ manufacturer: 1, status: 1, createdAt: -1 });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ voteCount: -1 });
ProductSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Compound indexes
ProductSchema.index({ business: 1, category: 1, status: 1 });
ProductSchema.index({ manufacturer: 1, category: 1, status: 1 });

// Unique constraint for slug per owner
ProductSchema.index({ business: 1, slug: 1 }, { unique: true, sparse: true });
ProductSchema.index({ manufacturer: 1, slug: 1 }, { unique: true, sparse: true });

// Validation: product must belong to either business OR manufacturer, not both
ProductSchema.pre('validate', function(next) {
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

// Virtual for URL path
ProductSchema.virtual('urlPath').get(function() {
  return `/products/${this.slug || this._id}`;
});

// Virtual for engagement score
ProductSchema.virtual('engagementScore').get(function() {
  return (this.voteCount * 2) + (this.certificateCount * 3) + (this.viewCount * 0.1);
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

ProductSchema.methods.incrementViewCount = function(): Promise<IProduct> {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

ProductSchema.methods.isOwnedBy = function(userId: string, userType: 'business' | 'manufacturer'): boolean {
  if (userType === 'business') {
    return this.business?.toString() === userId;
  } else {
    return this.manufacturer?.toString() === userId;
  }
};

ProductSchema.methods.generateSlug = function(): string {
  return this.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

ProductSchema.methods.updateAnalytics = function(analytics: { votes?: number; certificates?: number; views?: number }): Promise<IProduct> {
  if (analytics.votes !== undefined) this.voteCount = Math.max(0, analytics.votes);
  if (analytics.certificates !== undefined) this.certificateCount = Math.max(0, analytics.certificates);
  if (analytics.views !== undefined) this.viewCount = Math.max(0, analytics.views);
  return this.save();
};

// Static methods
ProductSchema.statics.findByOwner = function(ownerId: string, ownerType: 'business' | 'manufacturer') {
  const query = ownerType === 'business' 
    ? { business: ownerId }
    : { manufacturer: ownerId };
  return this.find(query).sort({ createdAt: -1 });
};

ProductSchema.statics.getActiveProducts = function() {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

ProductSchema.statics.getProductsByCategory = function(category: string) {
  return this.find({ category, status: 'active' }).sort({ voteCount: -1 });
};

ProductSchema.statics.searchProducts = function(searchTerm: string) {
  return this.find({
    status: 'active',
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' },
    voteCount: -1
  });
};

ProductSchema.statics.getPopularProducts = function(limit: number = 10) {
  return this.find({ status: 'active' })
    .sort({ voteCount: -1, viewCount: -1 })
    .limit(limit)
    .populate('media', 'url type');
};

ProductSchema.statics.findBySlug = function(ownerId: string, ownerType: 'business' | 'manufacturer', slug: string) {
  const query = ownerType === 'business' 
    ? { business: ownerId, slug }
    : { manufacturer: ownerId, slug };
  return this.findOne(query);
};

// Pre-save middleware
ProductSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.slug && this.title) {
    this.slug = this.generateSlug();
  }
  
  // Clean up tags
  if (this.tags) {
    this.tags = [...new Set(this.tags.filter(tag => tag && tag.trim()))];
  }
  
  // Clean up meta keywords
  if (this.metaKeywords) {
    this.metaKeywords = [...new Set(this.metaKeywords.filter(keyword => keyword && keyword.trim()))];
  }
  
  // Ensure SKU is uppercase
  if (this.sku) {
    this.sku = this.sku.toUpperCase();
  }
  
  next();
});

export const Product = model<IProduct>('Product', ProductSchema);