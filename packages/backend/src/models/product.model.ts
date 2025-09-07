// src/models/product.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  // Core product information
  title: string;
  description?: string;
  media: Types.ObjectId[];
  
  // Owner - either business OR manufacturer (mutually exclusive)
  business?: Types.ObjectId;
  manufacturer?: Types.ObjectId;
  
  // Product details
  category?: string;
  status: 'draft' | 'active' | 'archived';
  sku?: string;
  price?: number;
  tags: string[];
  
  // Enhanced product specifications
  specifications: Map<string, string>;
  manufacturingDetails?: {
    materials?: string[];
    dimensions?: string;
    weight?: string;
    origin?: string;
  };
  
  // Analytics and engagement
  voteCount: number;
  certificateCount: number;
  viewCount: number;
  lastViewedAt?: Date;
  engagementScore?: number; // Calculated virtual field
  
  // SEO and metadata
  slug?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  
  // Supply chain tracking
  supplyChainQrCode?: {
    qrCodeUrl: string;
    qrCodeData: string; // The actual QR code image data
    generatedAt: Date;
    isActive: boolean;
  };
  
  // Instance methods for analytics
  incrementVoteCount(): Promise<IProduct>;
  incrementCertificateCount(): Promise<IProduct>;
  incrementViewCount(): Promise<IProduct>;
  updateAnalytics(analytics: { votes?: number; certificates?: number; views?: number }): Promise<IProduct>;
  
  // Instance methods for ownership and utility
  isOwnedBy(userId: string, userType: 'business' | 'manufacturer'): boolean;
  generateSlug(): string;
  
  // Supply chain QR code methods
  generateSupplyChainQrCode(): Promise<IProduct>;
  getSupplyChainQrData(): string;
  
  // Virtual properties
  ownerType: 'business' | 'manufacturer';
  ownerId: string;
  urlPath: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface for the model
export interface IProductModel extends Document {
  findByOwner(ownerId: string, ownerType: 'business' | 'manufacturer'): Promise<IProduct[]>;
  getActiveProducts(): Promise<IProduct[]>;
  getProductsByCategory(category: string): Promise<IProduct[]>;
  searchProducts(searchTerm: string): Promise<IProduct[]>;
  getPopularProducts(limit?: number): Promise<IProduct[]>;
  findBySlug(ownerId: string, ownerType: 'business' | 'manufacturer', slug: string): Promise<IProduct | null>;
  getFeaturedProducts(limit?: number): Promise<IProduct[]>;
  getProductStats(businessId?: string, manufacturerId?: string): Promise<any>;
  bulkUpdateProducts(productIds: string[], updates: any): Promise<{ updated: number; errors: string[] }>;
}

const ProductSchema = new Schema<IProduct>({
  // Core product information with enhanced validation
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
  
  // Owner references - either business OR manufacturer (not both)
  business: { 
    type: Schema.Types.ObjectId, 
    ref: 'Business',
    sparse: true,
    index: true
  },
  
  manufacturer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Manufacturer',
    sparse: true,
    index: true
  },
  
  // Product classification and status
  category: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
    index: true
  },
  
  status: { 
    type: String, 
    enum: {
      values: ['draft', 'active', 'archived'],
      message: 'Status must be either draft, active, or archived'
    },
    default: 'draft',
    index: true
  },
  
  // Commercial information
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
    max: [1000000, 'Price cannot exceed $1,000,000'],
    validate: {
      validator: function(v: number) {
        return !v || (v >= 0 && v <= 1000000);
      },
      message: 'Price must be between 0 and $1,000,000'
    }
  },
  
  // Tagging system
  tags: [{
    type: String, 
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters'],
    validate: {
      validator: function(tag: string) {
        return tag && tag.trim().length > 0;
      },
      message: 'Tags cannot be empty'
    }
  }],
  
  // Product specifications as Map for flexible key-value pairs
  specifications: {
    type: Map,
    of: String,
    default: new Map(),
    validate: {
      validator: function(v: Map<string, string>) {
        return v.size <= 50;
      },
      message: 'Cannot have more than 50 specifications'
    }
  },
  
  // Manufacturing and product details
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
  
  // Analytics and engagement metrics
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
    min: [0, 'View count cannot be negative'],
    index: true
  },
  
  lastViewedAt: {
    type: Date,
    index: true
  },
  
  // SEO and discoverability fields
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    maxlength: [100, 'Slug cannot exceed 100 characters'],
    sparse: true,
    index: true
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
  }],
  
  // Supply chain QR code tracking
  supplyChainQrCode: {
    qrCodeUrl: {
      type: String,
      trim: true
    },
    qrCodeData: {
      type: String // Base64 encoded QR code image
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      // Convert Map to Object for JSON serialization
      if (ret.specifications && ret.specifications instanceof Map) {
        ret.specifications = Object.fromEntries(ret.specifications);
      }
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Convert Map to Object for object serialization
      if (ret.specifications && ret.specifications instanceof Map) {
        ret.specifications = Object.fromEntries(ret.specifications);
      }
      return ret;
    }
  }
});

// ====================
// INDEXES FOR PERFORMANCE
// ====================

// Primary indexes for owner-based queries
ProductSchema.index({ business: 1, status: 1, createdAt: -1 });
ProductSchema.index({ manufacturer: 1, status: 1, createdAt: -1 });

// Category and status-based queries
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });

// Analytics and engagement queries
ProductSchema.index({ voteCount: -1, createdAt: -1 });
ProductSchema.index({ certificateCount: -1, createdAt: -1 });
ProductSchema.index({ viewCount: -1, createdAt: -1 });

// Search functionality
ProductSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  category: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    tags: 8,
    category: 3
  }
});

// Tag-based queries
ProductSchema.index({ tags: 1 });

// Price range queries
ProductSchema.index({ price: 1, status: 1 });

// Compound indexes for complex queries
ProductSchema.index({ business: 1, category: 1, status: 1 });
ProductSchema.index({ manufacturer: 1, category: 1, status: 1 });
ProductSchema.index({ status: 1, voteCount: -1, createdAt: -1 });

// Unique constraints for slug per owner
ProductSchema.index({ business: 1, slug: 1 }, { unique: true, sparse: true });
ProductSchema.index({ manufacturer: 1, slug: 1 }, { unique: true, sparse: true });

// Media existence queries
ProductSchema.index({ 'media.0': 1 }); // Products with at least one media

// ====================
// VALIDATION MIDDLEWARE
// ====================

// Pre-validate: Ensure product belongs to either business OR manufacturer, not both
ProductSchema.pre('validate', function(next) {
  if (this.business && this.manufacturer) {
    return next(new Error('Product cannot belong to both business and manufacturer'));
  }
  if (!this.business && !this.manufacturer) {
    return next(new Error('Product must belong to either business or manufacturer'));
  }
  next();
});

// Pre-save: Data cleaning and slug generation
ProductSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.slug && this.title) {
    this.slug = this.generateSlug();
  }
  
  // Clean up and deduplicate tags
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(
      this.tags
        .filter(tag => tag && tag.trim())
        .map(tag => tag.toLowerCase().trim())
    )];
  }
  
  // Clean up and deduplicate meta keywords
  if (this.metaKeywords && this.metaKeywords.length > 0) {
    this.metaKeywords = [...new Set(
      this.metaKeywords
        .filter(keyword => keyword && keyword.trim())
        .map(keyword => keyword.toLowerCase().trim())
    )];
  }
  
  // Ensure SKU is uppercase if provided
  if (this.sku) {
    this.sku = this.sku.toUpperCase().trim();
  }
  
  // Auto-generate meta description if not provided
  if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.substring(0, 297) + '...';
  }
  
  next();
});

// ====================
// VIRTUAL PROPERTIES
// ====================

// Virtual for determining owner type
ProductSchema.virtual('ownerType').get(function() {
  return this.business ? 'business' : 'manufacturer';
});

// Virtual for getting owner ID
ProductSchema.virtual('ownerId').get(function() {
  return this.business?.toString() || this.manufacturer?.toString();
});

// Virtual for URL path generation
ProductSchema.virtual('urlPath').get(function() {
  return `/products/${this.slug || this._id}`;
});

// Virtual for engagement score calculation
ProductSchema.virtual('engagementScore').get(function() {
  const voteWeight = 2;
  const certificateWeight = 3;
  const viewWeight = 0.1;
  
  return (this.voteCount * voteWeight) + 
         (this.certificateCount * certificateWeight) + 
         (this.viewCount * viewWeight);
});

// Virtual for media count
ProductSchema.virtual('mediaCount').get(function() {
  return this.media ? this.media.length : 0;
});

// Virtual for checking if product has media
ProductSchema.virtual('hasMedia').get(function() {
  return this.media && this.media.length > 0;
});

// ====================
// INSTANCE METHODS
// ====================

// Increment vote count with atomic operation
ProductSchema.methods.incrementVoteCount = function(): Promise<IProduct> {
  this.voteCount = (this.voteCount || 0) + 1;
  return this.save();
};

// Increment certificate count with atomic operation
ProductSchema.methods.incrementCertificateCount = function(): Promise<IProduct> {
  this.certificateCount = (this.certificateCount || 0) + 1;
  return this.save();
};

// Increment view count and update last viewed timestamp
ProductSchema.methods.incrementViewCount = function(): Promise<IProduct> {
  this.viewCount = (this.viewCount || 0) + 1;
  this.lastViewedAt = new Date();
  return this.save();
};

// Update analytics in bulk
ProductSchema.methods.updateAnalytics = function(
  analytics: { votes?: number; certificates?: number; views?: number }
): Promise<IProduct> {
  if (analytics.votes !== undefined) {
    this.voteCount = Math.max(0, analytics.votes);
  }
  if (analytics.certificates !== undefined) {
    this.certificateCount = Math.max(0, analytics.certificates);
  }
  if (analytics.views !== undefined) {
    this.viewCount = Math.max(0, analytics.views);
    this.lastViewedAt = new Date();
  }
  return this.save();
};

// Check ownership
ProductSchema.methods.isOwnedBy = function(
  userId: string, 
  userType: 'business' | 'manufacturer'
): boolean {
  if (userType === 'business') {
    return this.business?.toString() === userId;
  } else {
    return this.manufacturer?.toString() === userId;
  }
};

// Generate SEO-friendly slug from title
ProductSchema.methods.generateSlug = function(): string {
  return this.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
};

// Generate supply chain QR code for product tracking
ProductSchema.methods.generateSupplyChainQrCode = async function(): Promise<IProduct> {
  try {
    // Import QR code service dynamically to avoid circular dependencies
    const { QrCodeService } = await import('../services/external/qrCode.service');
    const qrService = new QrCodeService();
    
    // Generate QR code data containing product ID and tracking URL
    const qrData = this.getSupplyChainQrData();
    
    // Generate QR code image
    const qrCodeImage = await qrService.generateQrCode(qrData, {
      size: 256,
      format: 'png',
      errorCorrectionLevel: 'M'
    });
    
    // Update product with QR code information
    this.supplyChainQrCode = {
      qrCodeUrl: `${process.env.FRONTEND_URL}/supply-chain/track/${this._id}`,
      qrCodeData: qrCodeImage, // Base64 encoded image
      generatedAt: new Date(),
      isActive: true
    };
    
    return this.save();
  } catch (error) {
    console.error('Failed to generate supply chain QR code:', error);
    throw new Error('Failed to generate QR code for product tracking');
  }
};

// Get QR code data string for supply chain tracking
ProductSchema.methods.getSupplyChainQrData = function(): string {
  const trackingData = {
    productId: this._id.toString(),
    productName: this.title,
    ownerType: this.ownerType,
    ownerId: this.ownerId,
    trackingUrl: `${process.env.FRONTEND_URL}/supply-chain/track/${this._id}`,
    timestamp: new Date().toISOString()
  };
  
  return JSON.stringify(trackingData);
};

// ====================
// STATIC METHODS
// ====================

// Find products by owner
ProductSchema.statics.findByOwner = function(
  ownerId: string, 
  ownerType: 'business' | 'manufacturer'
) {
  const query = ownerType === 'business' 
    ? { business: ownerId }
    : { manufacturer: ownerId };
  return this.find(query).sort({ createdAt: -1 });
};

// Get all active products
ProductSchema.statics.getActiveProducts = function() {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

// Get products by category
ProductSchema.statics.getProductsByCategory = function(category: string) {
  return this.find({ 
    category, 
    status: 'active' 
  }).sort({ voteCount: -1, createdAt: -1 });
};

// Search products with full-text search
ProductSchema.statics.searchProducts = function(searchTerm: string) {
  return this.find({
    status: 'active',
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' },
    voteCount: -1,
    createdAt: -1
  });
};

// Get popular products based on engagement
ProductSchema.statics.getPopularProducts = function(limit: number = 10) {
  return this.find({ status: 'active' })
    .sort({ 
      voteCount: -1, 
      certificateCount: -1,
      viewCount: -1,
      createdAt: -1 
    })
    .limit(limit)
    .populate('media', 'url type filename');
};

// Find product by slug within owner context
ProductSchema.statics.findBySlug = function(
  ownerId: string, 
  ownerType: 'business' | 'manufacturer', 
  slug: string
) {
  const query = ownerType === 'business' 
    ? { business: ownerId, slug }
    : { manufacturer: ownerId, slug };
  return this.findOne(query);
};

// Get featured products (highest engagement)
ProductSchema.statics.getFeaturedProducts = function(limit: number = 10) {
  return this.find({ status: 'active' })
    .sort({ 
      voteCount: -1, 
      certificateCount: -1,
      createdAt: -1 
    })
    .limit(limit)
    .populate('media', 'url type filename');
};

// Get comprehensive product statistics
ProductSchema.statics.getProductStats = function(businessId?: string, manufacturerId?: string) {
  const matchQuery: any = {};
  if (businessId) matchQuery.business = businessId;
  if (manufacturerId) matchQuery.manufacturer = manufacturerId;
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        totalVotes: { $sum: '$voteCount' },
        totalCertificates: { $sum: '$certificateCount' },
        totalViews: { $sum: '$viewCount' },
        averageVotes: { $avg: '$voteCount' },
        averageCertificates: { $avg: '$certificateCount' },
        averageViews: { $avg: '$viewCount' }
      }
    }
  ]);
};

// Bulk operations for products
ProductSchema.statics.bulkUpdateProducts = function(
  productIds: string[], 
  updates: any,
  businessId?: string,
  manufacturerId?: string
) {
  const query: any = { _id: { $in: productIds } };
  if (businessId) query.business = businessId;
  if (manufacturerId) query.manufacturer = manufacturerId;
  
  return this.updateMany(query, { $set: updates });
};

export const Product = model<IProduct>('Product', ProductSchema);