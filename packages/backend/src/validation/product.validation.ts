// src/validation/product.validation.ts
import Joi from 'joi';
import { commonSchemas, customJoi } from '../middleware/validation.middleware';

/**
 * Enhanced product validation with comprehensive business logic and media handling
 */

// Main product creation validation
export const createProductSchema = Joi.object({
  // Basic product information
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .custom((value, helpers) => {
      // Check for minimum quality in product titles
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 2) {
        return helpers.error('string.insufficientWords');
      }
      
      // Check for spam patterns in titles
      const spamPatterns = [
        /(.)\1{3,}/g, // Repeated characters (4+ times)
        /!!+/g,       // Multiple exclamation marks
        /\$\$+/g,     // Multiple dollar signs
        /(FREE|SALE|DEAL|OFFER).*!!+/i,
        /(URGENT|LIMITED|NOW).*[!$]/i
      ];
      
      if (spamPatterns.some(pattern => pattern.test(value))) {
        return helpers.error('string.spamTitle');
      }
      
      // Check for professional language
      const unprofessionalWords = ['cheap', 'fake', 'copy', 'replica', 'knockoff'];
      if (unprofessionalWords.some(word => value.toLowerCase().includes(word))) {
        return helpers.error('string.unprofessionalTitle');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.min': 'Product title must be at least 3 characters',
      'string.max': 'Product title cannot exceed 200 characters',
      'string.insufficientWords': 'Product title should contain at least 2 words',
      'string.spamTitle': 'Product title contains spam-like patterns',
      'string.unprofessionalTitle': 'Product title contains unprofessional language'
    }),

  // Enhanced description with rich validation
  description: Joi.string()
    .trim()
    .min(20)
    .max(5000)
    .custom((value, helpers) => {
      // Check for meaningful content
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 10) {
        return helpers.error('string.insufficientDescription');
      }
      
      // Check for product-relevant keywords
      const productKeywords = [
        'material', 'size', 'color', 'weight', 'dimension', 'feature',
        'specification', 'quality', 'durable', 'design', 'function',
        'use', 'application', 'benefit', 'advantage', 'made', 'manufactured'
      ];
      
      const hasRelevantKeywords = productKeywords.some(keyword => 
        value.toLowerCase().includes(keyword)
      );
      
      if (!hasRelevantKeywords) {
        helpers.state.path.push('lackProductDetails');
      }
      
      // Check description structure
      const sentences = value.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length < 3) {
        helpers.state.path.push('needMoreSentences');
      }
      
      return value;
    })
    .optional()
    .messages({
      'string.min': 'Product description should be at least 20 characters',
      'string.max': 'Product description cannot exceed 5000 characters',
      'string.insufficientDescription': 'Description should contain at least 10 words'
    }),

  // Enhanced media validation with comprehensive checks
  media: Joi.array()
    .items(
      Joi.alternatives().try(
        // MongoDB ObjectId for uploaded files
        customJoi.mongoId().valid(),
        // Direct URL for external media
        commonSchemas.url.custom((value, helpers) => {
          // Validate media URL requirements
          const mediaFormats = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
            '.mp4', '.mov', '.avi', '.webm', '.pdf'
          ];
          
          const hasValidFormat = mediaFormats.some(format => 
            value.toLowerCase().includes(format)
          );
          
          if (!hasValidFormat) {
            return helpers.error('url.invalidMediaFormat');
          }
          
          return value;
        }).messages({
          'url.invalidMediaFormat': 'Media URL must be a valid image, video, or document format'
        })
      )
    )
    .min(1)
    .max(20)
    .unique()
    .required()
    .messages({
      'array.min': 'At least one media file is required',
      'array.max': 'Maximum 20 media files allowed per product',
      'array.unique': 'Duplicate media references are not allowed'
    }),

  // Product categorization and specifications
  category: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .valid(
      // Electronics & Technology
      'Electronics', 'Computer Hardware', 'Mobile Accessories', 'Gaming',
      'Smart Home', 'Wearable Technology', 'Audio & Video', 'Cameras',
      
      // Fashion & Apparel
      'Clothing', 'Footwear', 'Accessories', 'Jewelry', 'Watches',
      'Bags & Luggage', 'Eyewear', 'Fashion Accessories',
      
      // Home & Living
      'Furniture', 'Home Decor', 'Kitchen & Dining', 'Bedding & Bath',
      'Storage & Organization', 'Lighting', 'Garden & Outdoor',
      
      // Health & Beauty
      'Skincare', 'Makeup', 'Hair Care', 'Personal Care', 'Health Supplements',
      'Medical Devices', 'Fitness Equipment', 'Wellness Products',
      
      // Sports & Recreation
      'Sports Equipment', 'Outdoor Gear', 'Fitness', 'Team Sports',
      'Water Sports', 'Winter Sports', 'Cycling', 'Running',
      
      // Automotive
      'Car Accessories', 'Auto Parts', 'Motorcycle', 'Tools & Equipment',
      'Car Care', 'Electronics & GPS', 'Tires & Wheels',
      
      // Business & Industrial
      'Office Supplies', 'Industrial Equipment', 'Safety Equipment',
      'Packaging Materials', 'Manufacturing Tools', 'Commercial Furniture',
      
      // Food & Beverage
      'Food Products', 'Beverages', 'Supplements', 'Specialty Foods',
      'Organic Products', 'Cooking Ingredients', 'Snacks',
      
      // Arts & Crafts
      'Art Supplies', 'Craft Materials', 'DIY Tools', 'Hobby Supplies',
      'Educational Materials', 'Party Supplies',
      
      // Other
      'Other'
    )
    .optional()
    .messages({
      'any.only': 'Please select a valid product category'
    }),

  // Product specifications and attributes
  specifications: Joi.object({
    dimensions: Joi.object({
      length: Joi.number().positive().precision(2).optional(),
      width: Joi.number().positive().precision(2).optional(),
      height: Joi.number().positive().precision(2).optional(),
      unit: Joi.string().valid('mm', 'cm', 'm', 'in', 'ft').default('cm')
    }).optional(),

    weight: Joi.object({
      value: Joi.number().positive().precision(3).optional(),
      unit: Joi.string().valid('g', 'kg', 'lb', 'oz').default('kg')
    }).optional(),

    materials: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(2)
          .max(50)
          .valid(
            // Common materials
            'Plastic', 'Metal', 'Steel', 'Aluminum', 'Copper', 'Brass',
            'Wood', 'Bamboo', 'Paper', 'Cardboard', 'Glass', 'Ceramic',
            'Fabric', 'Cotton', 'Polyester', 'Leather', 'Rubber', 'Silicone',
            'Carbon Fiber', 'Stainless Steel', 'Titanium', 'Gold', 'Silver',
            'Other'
          )
      )
      .max(10)
      .optional(),

    colors: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(2)
          .max(30)
          .pattern(/^[a-zA-Z\s\-]+$/)
      )
      .max(20)
      .optional()
      .messages({
        'string.pattern.base': 'Color names can only contain letters, spaces, and hyphens'
      }),

    warranty: Joi.object({
      duration: Joi.number().integer().min(0).max(120).optional(), // months
      type: Joi.string().valid('manufacturer', 'seller', 'extended', 'none').optional(),
      coverage: Joi.string().max(500).optional()
    }).optional(),

    certifications: Joi.array()
      .items(
        Joi.string()
          .trim()
          .max(100)
          .valid(
            'CE', 'FCC', 'FDA', 'UL', 'RoHS', 'REACH', 'ISO 9001',
            'Energy Star', 'OEKO-TEX', 'Fair Trade', 'Organic',
            'FSC Certified', 'Recycled Content', 'BPA Free'
          )
      )
      .max(15)
      .optional()
  }).optional(),

  // Pricing and availability
  pricing: Joi.object({
    basePrice: Joi.number()
      .positive()
      .precision(2)
      .custom((value, helpers) => {
        if (value < 0.01) {
          return helpers.error('number.tooLow');
        }
        if (value > 1000000) {
          return helpers.error('number.tooHigh');
        }
        return value;
      })
      .optional()
      .messages({
        'number.positive': 'Base price must be greater than 0',
        'number.tooLow': 'Price must be at least $0.01',
        'number.tooHigh': 'Price cannot exceed $1,000,000'
      }),

    currency: Joi.string()
      .valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY')
      .default('USD')
      .optional(),

    minimumOrderQuantity: Joi.number()
      .integer()
      .min(1)
      .max(1000000)
      .optional(),

    bulkPricing: Joi.array()
      .items(
        Joi.object({
          minQuantity: Joi.number().integer().min(1).required(),
          price: Joi.number().positive().precision(2).required(),
          discount: Joi.number().min(0).max(100).precision(2).optional()
        })
      )
      .max(10)
      .optional()
  }).optional(),

  // Manufacturing and sourcing information
  manufacturing: Joi.object({
    manufacturerId: commonSchemas.mongoId.optional(),
    
    leadTime: Joi.object({
      min: Joi.number().integer().min(1).max(365).optional(),
      max: Joi.number().integer().min(1).max(365).optional(),
      unit: Joi.string().valid('days', 'weeks', 'months').default('days')
    }).optional(),

    originCountry: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s\-']+$/)
      .optional(),

    customizationOptions: Joi.array()
      .items(
        Joi.object({
          type: Joi.string().valid('color', 'size', 'material', 'engraving', 'printing', 'packaging').required(),
          options: Joi.array().items(Joi.string().max(100)).min(1).max(50).required(),
          additionalCost: Joi.number().min(0).precision(2).optional()
        })
      )
      .max(10)
      .optional()
  }).optional(),

  // Compliance and safety
  compliance: Joi.object({
    ageRestriction: Joi.number()
      .integer()
      .min(0)
      .max(21)
      .optional(),

    safetyWarnings: Joi.array()
      .items(Joi.string().max(200))
      .max(10)
      .optional(),

    handlingInstructions: Joi.string()
      .max(1000)
      .optional(),

    storageRequirements: Joi.string()
      .max(500)
      .optional(),

    hazardousMaterial: Joi.boolean().default(false).optional(),

    restrictedRegions: Joi.array()
      .items(Joi.string().length(2).uppercase()) // Country codes
      .max(50)
      .optional()
  }).optional(),

  // SEO and marketing
  seo: Joi.object({
    metaTitle: Joi.string()
      .max(60)
      .optional()
      .messages({
        'string.max': 'Meta title should not exceed 60 characters for SEO'
      }),

    metaDescription: Joi.string()
      .max(160)
      .optional()
      .messages({
        'string.max': 'Meta description should not exceed 160 characters for SEO'
      }),

    keywords: Joi.array()
      .items(Joi.string().trim().min(2).max(50))
      .max(20)
      .optional(),

    tags: Joi.array()
      .items(Joi.string().trim().min(2).max(30))
      .max(30)
      .unique()
      .optional()
  }).optional(),

  // Product status and visibility
  status: Joi.string()
    .valid('draft', 'active', 'inactive', 'discontinued', 'out_of_stock')
    .default('draft')
    .optional(),

  visibility: Joi.string()
    .valid('public', 'private', 'restricted')
    .default('public')
    .optional()
});

// Simplified product update schema (allows partial updates)
export const updateProductSchema = Joi.object({
  title: createProductSchema.extract('title').optional(),
  description: createProductSchema.extract('description'),
  media: createProductSchema.extract('media').optional(),
  category: createProductSchema.extract('category'),
  specifications: createProductSchema.extract('specifications'),
  pricing: createProductSchema.extract('pricing'),
  manufacturing: createProductSchema.extract('manufacturing'),
  compliance: createProductSchema.extract('compliance'),
  seo: createProductSchema.extract('seo'),
  status: createProductSchema.extract('status'),
  visibility: createProductSchema.extract('visibility')
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Quick product creation schema (minimal required fields)
export const quickCreateProductSchema = Joi.object({
  title: createProductSchema.extract('title'),
  description: createProductSchema.extract('description').optional(),
  media: createProductSchema.extract('media'),
  category: createProductSchema.extract('category')
});

// Product search and filtering validation
export const productSearchSchema = Joi.object({
  query: commonSchemas.searchQuery,
  category: createProductSchema.extract('category'),
  
  priceRange: Joi.object({
    min: Joi.number().min(0).precision(2).optional(),
    max: Joi.number().min(0).precision(2).optional()
  }).optional(),

  materials: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional(),

  colors: Joi.array()
    .items(Joi.string().max(30))
    .max(10)
    .optional(),

  inStock: Joi.boolean().optional(),
  
  manufacturer: commonSchemas.mongoId.optional(),
  
  sortBy: Joi.string()
    .valid('relevance', 'price_asc', 'price_desc', 'newest', 'popularity', 'rating')
    .default('relevance')
    .optional(),

  ...commonSchemas.pagination
});

// Product review validation
export const productReviewSchema = Joi.object({
  productId: commonSchemas.mongoId,
  
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.min': 'Rating must be between 1 and 5',
      'number.max': 'Rating must be between 1 and 5'
    }),

  review: Joi.string()
    .trim()
    .min(10)
    .max(2000)
    .optional()
    .messages({
      'string.min': 'Review must be at least 10 characters if provided'
    }),

  pros: Joi.array()
    .items(Joi.string().trim().max(200))
    .max(10)
    .optional(),

  cons: Joi.array()
    .items(Joi.string().trim().max(200))
    .max(10)
    .optional(),

  wouldRecommend: Joi.boolean().optional(),
  
  verifiedPurchase: Joi.boolean().default(false).optional()
});

// Export all product validation schemas
export const productValidationSchemas = {
  createProduct: createProductSchema,
  updateProduct: updateProductSchema,
  quickCreateProduct: quickCreateProductSchema,
  productSearch: productSearchSchema,
  productReview: productReviewSchema
};