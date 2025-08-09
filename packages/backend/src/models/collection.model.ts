// src/models/collection.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ICollection extends Document {
  business: Types.ObjectId;
  title: string;
  description?: string;
  products: Types.ObjectId[];
  
  // Enhanced fields
  slug?: string;
  isPublic: boolean;
  isActive: boolean;
  featuredImage?: string;
  tags: string[];
  sortOrder: number;
  
  // SEO and metadata
  metaDescription?: string;
  metaKeywords?: string[];
  
  // Analytics
  viewCount: number;
  lastViewedAt?: Date;
  
  // Instance methods
  addProduct(productId: Types.ObjectId): Promise<ICollection>;
  removeProduct(productId: Types.ObjectId): Promise<ICollection>;
  incrementViewCount(): Promise<ICollection>;
  generateSlug(): string;
  
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    business: { 
      type: Schema.Types.ObjectId, 
      ref: 'Business', 
      required: [true, 'Business reference is required'],
      index: true
    },
    title: { 
      type: String, 
      required: [true, 'Collection title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: { 
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    products: [{ 
      type: Types.ObjectId, 
      ref: 'Product',
      validate: {
        validator: function(products: Types.ObjectId[]) {
          return products.length <= 500;
        },
        message: 'Collection cannot contain more than 500 products'
      }
    }],
    
    // Enhanced fields
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
      maxlength: [100, 'Slug cannot exceed 100 characters']
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    featuredImage: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Featured image must be a valid URL'
      }
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    sortOrder: {
      type: Number,
      default: 0,
      index: true
    },
    
    // SEO fields
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
    
    // Analytics
    viewCount: {
      type: Number,
      default: 0,
      min: [0, 'View count cannot be negative']
    },
    lastViewedAt: {
      type: Date
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for performance
CollectionSchema.index({ business: 1, createdAt: -1 });
CollectionSchema.index({ business: 1, isActive: 1 });
CollectionSchema.index({ business: 1, isPublic: 1 });
CollectionSchema.index({ slug: 1 });
CollectionSchema.index({ tags: 1 });
CollectionSchema.index({ sortOrder: 1 });
CollectionSchema.index({ title: 'text', description: 'text' });

// Compound indexes
CollectionSchema.index({ business: 1, slug: 1 }, { unique: true });
CollectionSchema.index({ business: 1, isActive: 1, sortOrder: 1 });

// Virtual for product count
CollectionSchema.virtual('productCount').get(function() {
  return this.products?.length || 0;
});

// Virtual for URL path
CollectionSchema.virtual('urlPath').get(function() {
  return `/collections/${this.slug || this._id}`;
});

// Instance methods
CollectionSchema.methods.addProduct = function(productId: Types.ObjectId): Promise<ICollection> {
  if (!this.products.includes(productId)) {
    this.products.push(productId);
  }
  return this.save();
};

CollectionSchema.methods.removeProduct = function(productId: Types.ObjectId): Promise<ICollection> {
  this.products = this.products.filter(id => !id.equals(productId));
  return this.save();
};

CollectionSchema.methods.incrementViewCount = function(): Promise<ICollection> {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

CollectionSchema.methods.generateSlug = function(): string {
  return this.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

CollectionSchema.methods.reorderProducts = function(productIds: Types.ObjectId[]): Promise<ICollection> {
  // Validate that all provided IDs exist in the collection
  const validIds = productIds.filter(id => 
    this.products.some(productId => productId.equals(id))
  );
  this.products = validIds;
  return this.save();
};

// Static methods
CollectionSchema.statics.findByBusiness = function(businessId: string) {
  return this.find({ business: businessId, isActive: true })
    .populate('products', 'title media status')
    .sort({ sortOrder: 1, createdAt: -1 });
};

CollectionSchema.statics.findPublic = function(businessId: string) {
  return this.find({ 
    business: businessId, 
    isPublic: true, 
    isActive: true 
  })
    .populate('products', 'title media status')
    .sort({ sortOrder: 1, createdAt: -1 });
};

CollectionSchema.statics.findBySlug = function(businessId: string, slug: string) {
  return this.findOne({ 
    business: businessId, 
    slug, 
    isActive: true 
  }).populate('products');
};

CollectionSchema.statics.searchCollections = function(businessId: string, searchTerm: string) {
  return this.find({
    business: businessId,
    isActive: true,
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' },
    createdAt: -1
  });
};

CollectionSchema.statics.getPopularCollections = function(businessId: string, limit: number = 10) {
  return this.find({ 
    business: businessId, 
    isPublic: true, 
    isActive: true 
  })
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(limit)
    .populate('products', 'title media');
};

// Pre-save middleware
CollectionSchema.pre('save', function(next) {
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
  
  next();
});

// Pre-remove middleware
CollectionSchema.pre('remove', function(next) {
  // Could add logic here to handle cleanup
  // e.g., remove references from products
  next();
});

export const Collection = model<ICollection>('Collection', CollectionSchema);