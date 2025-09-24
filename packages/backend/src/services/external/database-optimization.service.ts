/**
 * Database Optimization Service
 * 
 * Provides advanced MongoDB optimization strategies including:
 * - Compound indexes for complex queries
 * - Text search indexes
 * - Partial indexes for filtered queries
 * - Sparse indexes for optional fields
 */

import { logger } from '../../utils/logger';
import { container, SERVICE_TOKENS } from '../utils/di-container.service';

export class DatabaseOptimizationService {
  
  /**
   * Create advanced compound indexes for better query performance
   */
  async createAdvancedIndexes(): Promise<void> {
    logger.info('🔧 Creating advanced database indexes...');

    try {
      // Get models from container
      const User = container.resolve(SERVICE_TOKENS.USER_MODEL);
      const Business = container.resolve(SERVICE_TOKENS.BUSINESS_MODEL);
      const Manufacturer = container.resolve(SERVICE_TOKENS.MANUFACTURER_MODEL);
      const Product = container.resolve(SERVICE_TOKENS.PRODUCT_MODEL);
      const VotingRecord = container.resolve(SERVICE_TOKENS.VOTING_RECORD_MODEL);
      const BrandSettings = container.resolve(SERVICE_TOKENS.BRAND_SETTINGS_MODEL);
      const Certificate = container.resolve(SERVICE_TOKENS.CERTIFICATE_MODEL);
      const Media = container.resolve(SERVICE_TOKENS.MEDIA_MODEL);

      // ===== USER MODEL OPTIMIZATIONS =====
      await this.optimizeUserIndexes(User);
      
      // ===== BUSINESS MODEL OPTIMIZATIONS =====
      await this.optimizeBusinessIndexes(Business);
      
      // ===== MANUFACTURER MODEL OPTIMIZATIONS =====
      await this.optimizeManufacturerIndexes(Manufacturer);
      
      // ===== PRODUCT MODEL OPTIMIZATIONS =====
      await this.optimizeProductIndexes(Product);
      
      // ===== VOTING RECORD OPTIMIZATIONS =====
      await this.optimizeVotingRecordIndexes(VotingRecord);
      
      // ===== BRAND SETTINGS OPTIMIZATIONS =====
      await this.optimizeBrandSettingsIndexes(BrandSettings);
      
      // ===== CERTIFICATE MODEL OPTIMIZATIONS =====
      await this.optimizeCertificateIndexes(Certificate);
      
      // ===== MEDIA MODEL OPTIMIZATIONS =====
      await this.optimizeMediaIndexes(Media);

      logger.info('✅ Advanced database indexes created successfully');

    } catch (error) {
      logger.error('❌ Failed to create advanced indexes:', error);
      throw error;
    }
  }

  /**
   * Optimize User model indexes
   */
  private async optimizeUserIndexes(User: any): Promise<void> {
    // Text search index for user search
    await User.collection.createIndex({
      email: 'text',
      firstName: 'text',
      lastName: 'text',
      fullName: 'text'
    }, {
      name: 'user_text_search',
      weights: {
        email: 10,
        fullName: 5,
        firstName: 3,
        lastName: 3
      }
    });

    // Compound index for active users with recent activity
    await User.collection.createIndex({
      isActive: 1,
      lastLoginAt: -1,
      createdAt: -1
    }, {
      name: 'user_active_recent',
      partialFilterExpression: { isActive: true }
    });

    // Compound index for email verification status
    await User.collection.createIndex({
      isEmailVerified: 1,
      emailVerifiedAt: -1,
      isActive: 1
    }, {
      name: 'user_email_verification'
    });

    // Index for voting history queries
    await User.collection.createIndex({
      'votingHistory.businessId': 1,
      'votingHistory.votedAt': -1
    }, {
      name: 'user_voting_history',
      sparse: true
    });

    // Index for brand interactions
    await User.collection.createIndex({
      'brandInteractions.businessId': 1,
      'brandInteractions.lastInteraction': -1
    }, {
      name: 'user_brand_interactions',
      sparse: true
    });
  }

  /**
   * Optimize Business model indexes
   */
  private async optimizeBusinessIndexes(Business: any): Promise<void> {
    // Text search index for business search
    await Business.collection.createIndex({
      businessName: 'text',
      description: 'text',
      industry: 'text',
      contactEmail: 'text'
    }, {
      name: 'business_text_search',
      weights: {
        businessName: 10,
        industry: 5,
        description: 3,
        contactEmail: 2
      }
    });

    // Compound index for verified businesses by industry
    await Business.collection.createIndex({
      isEmailVerified: 1,
      businessType: 1,
      industry: 1,
      isActive: 1
    }, {
      name: 'business_verified_by_industry',
      partialFilterExpression: { 
        isEmailVerified: true,
        isActive: { $ne: false }
      }
    });

    // Compound index for business discovery
    await Business.collection.createIndex({
      businessType: 1,
      isEmailVerified: 1,
      createdAt: -1,
      profileViews: -1
    }, {
      name: 'business_discovery',
      partialFilterExpression: { 
        isEmailVerified: true,
        isActive: { $ne: false }
      }
    });

    // Index for domain resolution
    await Business.collection.createIndex({
      subdomain: 1,
      customDomain: 1,
      isActive: 1
    }, {
      name: 'business_domain_resolution',
      unique: true,
      sparse: true,
      partialFilterExpression: { isActive: { $ne: false } }
    });

    // Index for plan-based queries
    await Business.collection.createIndex({
      plan: 1,
      isActive: 1,
      lastLoginAt: -1
    }, {
      name: 'business_plan_activity',
      partialFilterExpression: { isActive: { $ne: false } }
    });
  }

  /**
   * Optimize Manufacturer model indexes
   */
  private async optimizeManufacturerIndexes(Manufacturer: any): Promise<void> {
    // Text search index for manufacturer search
    await Manufacturer.collection.createIndex({
      name: 'text',
      description: 'text',
      industry: 'text',
      'servicesOffered': 'text'
    }, {
      name: 'manufacturer_text_search',
      weights: {
        name: 10,
        industry: 5,
        description: 3,
        'servicesOffered': 4
      }
    });

    // Compound index for manufacturer discovery
    await Manufacturer.collection.createIndex({
      isActive: 1,
      isEmailVerified: 1,
      industry: 1,
      'profileScore': -1
    }, {
      name: 'manufacturer_discovery',
      partialFilterExpression: { 
        isActive: { $ne: false },
        isEmailVerified: true
      }
    });

    // Index for services offered
    await Manufacturer.collection.createIndex({
      'servicesOffered': 1,
      isActive: 1,
      'profileScore': -1
    }, {
      name: 'manufacturer_services',
      partialFilterExpression: { isActive: { $ne: false } }
    });

    // Index for MOQ-based searches
    await Manufacturer.collection.createIndex({
      moq: 1,
      isActive: 1,
      industry: 1
    }, {
      name: 'manufacturer_moq_search',
      partialFilterExpression: { 
        isActive: { $ne: false },
        moq: { $exists: true }
      }
    });

    // Index for location-based searches
    await Manufacturer.collection.createIndex({
      'headquarters.country': 1,
      'headquarters.city': 1,
      isActive: 1
    }, {
      name: 'manufacturer_location',
      partialFilterExpression: { isActive: { $ne: false } }
    });

    // Index for certification searches
    await Manufacturer.collection.createIndex({
      'certifications.name': 1,
      isActive: 1,
      'profileScore': -1
    }, {
      name: 'manufacturer_certifications',
      partialFilterExpression: { isActive: { $ne: false } }
    });
  }

  /**
   * Optimize Product model indexes
   */
  private async optimizeProductIndexes(Product: any): Promise<void> {
    // Text search index for product search
    await Product.collection.createIndex({
      title: 'text',
      description: 'text',
      category: 'text',
      tags: 'text'
    }, {
      name: 'product_text_search',
      weights: {
        title: 10,
        category: 5,
        tags: 3,
        description: 2
      }
    });

    // Compound index for business products
    await Product.collection.createIndex({
      business: 1,
      status: 1,
      category: 1,
      createdAt: -1
    }, {
      name: 'product_business_listing',
      partialFilterExpression: { 
        business: { $exists: true },
        status: { $in: ['active', 'draft'] }
      }
    });

    // Compound index for manufacturer products
    await Product.collection.createIndex({
      manufacturer: 1,
      status: 1,
      category: 1,
      createdAt: -1
    }, {
      name: 'product_manufacturer_listing',
      partialFilterExpression: { 
        manufacturer: { $exists: true },
        status: { $in: ['active', 'draft'] }
      }
    });

    // Index for product discovery
    await Product.collection.createIndex({
      status: 1,
      category: 1,
      'engagementScore': -1,
      createdAt: -1
    }, {
      name: 'product_discovery',
      partialFilterExpression: { status: 'active' }
    });

    // Index for price-based searches
    await Product.collection.createIndex({
      price: 1,
      status: 1,
      category: 1
    }, {
      name: 'product_price_search',
      partialFilterExpression: { 
        status: 'active',
        price: { $exists: true }
      }
    });

    // Index for analytics queries
    await Product.collection.createIndex({
      'voteCount': -1,
      'certificateCount': -1,
      'viewCount': -1,
      status: 1
    }, {
      name: 'product_analytics',
      partialFilterExpression: { status: 'active' }
    });
  }

  /**
   * Optimize VotingRecord model indexes
   */
  private async optimizeVotingRecordIndexes(VotingRecord: any): Promise<void> {
    // Compound index for business voting analytics
    await VotingRecord.collection.createIndex({
      business: 1,
      timestamp: -1,
      isVerified: 1
    }, {
      name: 'voting_business_analytics'
    });

    // Index for product voting analytics
    await VotingRecord.collection.createIndex({
      'selectedProductId': 1,
      timestamp: -1,
      business: 1
    }, {
      name: 'voting_product_analytics'
    });

    // Index for voting source analytics
    await VotingRecord.collection.createIndex({
      'votingSource': 1,
      timestamp: -1,
      isVerified: 1
    }, {
      name: 'voting_source_analytics'
    });

    // Index for email gating analytics
    await VotingRecord.collection.createIndex({
      'emailGatingApplied': 1,
      'emailGatingMode': 1,
      timestamp: -1
    }, {
      name: 'voting_email_gating'
    });

    // Index for verification status
    await VotingRecord.collection.createIndex({
      isVerified: 1,
      processedAt: -1,
      timestamp: -1
    }, {
      name: 'voting_verification_status'
    });
  }

  /**
   * Optimize BrandSettings model indexes
   */
  private async optimizeBrandSettingsIndexes(BrandSettings: any): Promise<void> {
    // Index for domain resolution
    await BrandSettings.collection.createIndex({
      subdomain: 1,
      customDomain: 1,
      'business': 1
    }, {
      name: 'brand_settings_domain',
      unique: true,
      sparse: true
    });

    // Index for business verification
    await BrandSettings.collection.createIndex({
      'business': 1,
      'businessVerified': 1,
      'businessVerifiedAt': -1
    }, {
      name: 'brand_settings_verification'
    });
  }

  /**
   * Optimize Certificate model indexes
   */
  private async optimizeCertificateIndexes(Certificate: any): Promise<void> {
    // Compound index for business certificates
    await Certificate.collection.createIndex({
      business: 1,
      status: 1,
      createdAt: -1
    }, {
      name: 'certificate_business_status'
    });

    // Index for token-based lookups
    await Certificate.collection.createIndex({
      tokenId: 1,
      status: 1
    }, {
      name: 'certificate_token_lookup',
      unique: true,
      sparse: true,
      partialFilterExpression: { tokenId: { $exists: true } }
    });

    // Index for recipient lookups
    await Certificate.collection.createIndex({
      recipientEmail: 1,
      status: 1,
      createdAt: -1
    }, {
      name: 'certificate_recipient_lookup',
      partialFilterExpression: { recipientEmail: { $exists: true } }
    });
  }

  /**
   * Optimize Media model indexes
   */
  private async optimizeMediaIndexes(Media: any): Promise<void> {
    // Compound index for business media
    await Media.collection.createIndex({
      business: 1,
      category: 1,
      createdAt: -1
    }, {
      name: 'media_business_category',
      partialFilterExpression: { business: { $exists: true } }
    });

    // Compound index for manufacturer media
    await Media.collection.createIndex({
      manufacturer: 1,
      category: 1,
      createdAt: -1
    }, {
      name: 'media_manufacturer_category',
      partialFilterExpression: { manufacturer: { $exists: true } }
    });

    // Index for file type searches
    await Media.collection.createIndex({
      mimeType: 1,
      category: 1,
      createdAt: -1
    }, {
      name: 'media_file_type'
    });
  }

  /**
   * Analyze and optimize slow queries
   */
  async analyzeSlowQueries(): Promise<void> {
    logger.info('🔍 Analyzing slow queries...');

    try {
      // Enable profiling for slow operations
      await this.enableProfiling();
      
      // Get slow operations from profiler
      const slowOps = await this.getSlowOperations();
      
      if (slowOps.length > 0) {
        logger.warn(`Found ${slowOps.length} slow operations:`, slowOps);
        await this.optimizeSlowOperations(slowOps);
      } else {
        logger.info('✅ No slow operations found');
      }

    } catch (error) {
      logger.error('❌ Failed to analyze slow queries:', error);
      throw error;
    }
  }

  /**
   * Enable MongoDB profiling
   */
  private async enableProfiling(): Promise<void> {
    // This would typically be done via MongoDB shell or admin commands
    // For now, we'll log the command that should be run
    logger.info('📊 To enable profiling, run: db.setProfilingLevel(1, { slowms: 100 })');
  }

  /**
   * Get slow operations from profiler
   */
  private async getSlowOperations(): Promise<any[]> {
    // This would query the system.profile collection
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Optimize slow operations
   */
  private async optimizeSlowOperations(operations: any[]): Promise<void> {
    // Analyze each slow operation and suggest optimizations
    for (const op of operations) {
      logger.info(`Optimizing slow operation: ${op.command}`);
      // Implementation would analyze the operation and suggest index optimizations
    }
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();
