/**
 * Aggregation Optimization Service
 *
 * Replaces inefficient Mongoose populate operations with optimized MongoDB aggregation pipelines.
 * Provides significant performance improvements for complex queries with relationships.
 */

import mongoose, { Model, Document, PipelineStage } from 'mongoose';
import { logger } from '../../utils/logger';
import { monitoringService } from './monitoring.service';
import mongoSanitize from 'express-mongo-sanitize';
import validator from 'validator';
import crypto from 'crypto';

export interface AggregationOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  project?: Record<string, 0 | 1>;
  match?: Record<string, any>;
  cache?: boolean;
  cacheTTL?: number;
}

// Whitelist of allowed filter fields to prevent injection
const ALLOWED_FILTER_FIELDS = {
  products: ['status', 'category', 'manufacturer', 'business', 'price', 'isActive'],
  manufacturers: ['industry', 'isVerified', 'isActive', 'servicesOffered'],
  certificates: ['type', 'status', 'issuer'],
  businesses: ['industry', 'plan', 'isEmailVerified']
};

// Whitelist of allowed sort fields
const ALLOWED_SORT_FIELDS = {
  products: ['createdAt', 'updatedAt', 'price', 'viewCount', 'voteCount'],
  manufacturers: ['createdAt', 'profileScore', 'name'],
  certificates: ['issuedAt', 'expiresAt'],
  businesses: ['createdAt', 'name']
};

export interface PopulateMapping {
  from: string;           // Collection name to join
  localField: string;     // Field in current collection
  foreignField: string;   // Field in foreign collection
  as: string;            // Name for joined data
  select?: string[];     // Fields to select from foreign collection
  unwind?: boolean;      // Whether to unwind the result array
  preserveNullAndEmptyArrays?: boolean;
}

export interface AggregationResult<T> {
  data: T[];
  totalCount?: number;
  executionTime: number;
  cached: boolean;
  pipeline: PipelineStage[];
}

export class AggregationOptimizationService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private stats = {
    queries: 0,
    cacheHits: 0,
    avgExecutionTime: 0,
    populateReplaced: 0
  };

  constructor() {
    this.startCacheCleanup();
    this.startStatsCollection();
  }

  /**
   * Validate and sanitize filters
   */
  private validateAndSanitizeFilters(filters: Record<string, any>, collection: keyof typeof ALLOWED_FILTER_FIELDS): Record<string, any> {
    if (!filters || typeof filters !== 'object') {
      return {};
    }

    // Sanitize against NoSQL injection
    const sanitized = mongoSanitize.sanitize(filters);
    const validated: Record<string, any> = {};
    const allowedFields = ALLOWED_FILTER_FIELDS[collection] || [];

    for (const [key, value] of Object.entries(sanitized)) {
      // Only allow whitelisted fields
      if (!allowedFields.includes(key)) {
        logger.warn(`Rejected unauthorized filter field: ${key}`);
        continue;
      }

      // Additional validation based on field type
      if (key === 'price' && typeof value === 'object') {
        // Validate price range queries
        const priceFilter: Record<string, any> = {};
        if (value.$gte !== undefined && typeof value.$gte === 'number' && value.$gte >= 0) {
          priceFilter.$gte = value.$gte;
        }
        if (value.$lte !== undefined && typeof value.$lte === 'number' && value.$lte >= 0) {
          priceFilter.$lte = value.$lte;
        }
        if (Object.keys(priceFilter).length > 0) {
          validated[key] = priceFilter;
        }
      } else if (key.endsWith('Id') || key === 'manufacturer' || key === 'business') {
        // Validate ObjectId fields
        if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
          validated[key] = new mongoose.Types.ObjectId(value);
        }
      } else if (typeof value === 'string') {
        // Sanitize string values
        const cleanValue = validator.escape(value).trim();
        if (cleanValue.length > 0 && cleanValue.length <= 100) {
          validated[key] = cleanValue;
        }
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        validated[key] = value;
      }
    }

    return validated;
  }

  /**
   * Validate and sanitize sort options
   */
  private validateSortOptions(sort: Record<string, 1 | -1> | undefined, collection: keyof typeof ALLOWED_SORT_FIELDS): Record<string, 1 | -1> {
    if (!sort || typeof sort !== 'object') {
      return { createdAt: -1 }; // Default sort
    }

    const validated: Record<string, 1 | -1> = {};
    const allowedFields = ALLOWED_SORT_FIELDS[collection] || [];

    for (const [key, value] of Object.entries(sort)) {
      if (allowedFields.includes(key) && (value === 1 || value === -1)) {
        validated[key] = value;
      }
    }

    return Object.keys(validated).length > 0 ? validated : { createdAt: -1 };
  }

  /**
   * Validate pagination options
   */
  private validatePaginationOptions(options: AggregationOptions): { limit: number; skip: number } {
    const limit = Math.min(Math.max(parseInt(String(options.limit)) || 20, 1), 100); // Max 100 items
    const skip = Math.max(parseInt(String(options.skip)) || 0, 0);
    return { limit, skip };
  }

  /**
   * Optimized product listing with manufacturer and business data
   */
  async getProductsWithRelations(
    filters: Record<string, any> = {},
    options: AggregationOptions = {}
  ): Promise<AggregationResult<any>> {
    const startTime = Date.now();

    // Validate and sanitize inputs
    const sanitizedFilters = this.validateAndSanitizeFilters(filters, 'products');
    const validatedSort = this.validateSortOptions(options.sort, 'products');
    const { limit, skip } = this.validatePaginationOptions(options);

    const pipeline: PipelineStage[] = [];

    // Match stage with sanitized filters
    if (Object.keys(sanitizedFilters).length > 0) {
      pipeline.push({ $match: sanitizedFilters });
    }

    // Lookup manufacturer data
    pipeline.push({
      $lookup: {
        from: 'manufacturers',
        localField: 'manufacturer',
        foreignField: '_id',
        as: 'manufacturerData',
        pipeline: [
          {
            $project: {
              name: 1,
              email: 1,
              industry: 1,
              isVerified: 1,
              profileScore: 1,
              servicesOffered: 1
            }
          }
        ]
      }
    });

    // Lookup business data
    pipeline.push({
      $lookup: {
        from: 'businesses',
        localField: 'business',
        foreignField: '_id',
        as: 'businessData',
        pipeline: [
          {
            $project: {
              name: 1,
              email: 1,
              industry: 1,
              isEmailVerified: 1,
              plan: 1
            }
          }
        ]
      }
    });

    // Lookup certificates
    pipeline.push({
      $lookup: {
        from: 'certificates',
        localField: '_id',
        foreignField: 'product',
        as: 'certificates',
        pipeline: [
          {
            $project: {
              type: 1,
              issuer: 1,
              status: 1,
              issuedAt: 1,
              expiresAt: 1
            }
          }
        ]
      }
    });

    // Lookup voting records for vote count
    pipeline.push({
      $lookup: {
        from: 'votingrecords',
        localField: '_id',
        foreignField: 'selectedProductId',
        as: 'votes',
        pipeline: [
          { $match: { isVerified: true } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]
      }
    });

    // Unwind single-value lookups
    pipeline.push(
      { $unwind: { path: '$manufacturerData', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$businessData', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$votes', preserveNullAndEmptyArrays: true } }
    );

    // Add computed fields
    pipeline.push({
      $addFields: {
        voteCount: { $ifNull: ['$votes.count', 0] },
        certificateCount: { $size: '$certificates' },
        isVerified: {
          $or: [
            '$manufacturerData.isVerified',
            '$businessData.isEmailVerified'
          ]
        },
        ownerName: {
          $ifNull: ['$manufacturerData.name', '$businessData.name']
        }
      }
    });

    // Sort with validated options
    pipeline.push({ $sort: validatedSort });

    // Skip and limit with validated values
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    pipeline.push({ $limit: limit });

    // Project final fields
    pipeline.push({
      $project: {
        title: 1,
        description: 1,
        category: 1,
        price: 1,
        status: 1,
        voteCount: 1,
        certificateCount: 1,
        viewCount: 1,
        createdAt: 1,
        updatedAt: 1,
        isVerified: 1,
        ownerName: 1,
        manufacturer: {
          _id: '$manufacturerData._id',
          name: '$manufacturerData.name',
          industry: '$manufacturerData.industry',
          isVerified: '$manufacturerData.isVerified',
          servicesOffered: '$manufacturerData.servicesOffered'
        },
        business: {
          _id: '$businessData._id',
          name: '$businessData.name',
          industry: '$businessData.industry',
          plan: '$businessData.plan'
        },
        certificates: 1
      }
    });

    try {
      const Product = mongoose.model('Product');
      const result = await Product.aggregate(pipeline).exec();

      const executionTime = Date.now() - startTime;
      this.updateStats(executionTime, false);

      logger.debug('Optimized product aggregation completed', {
        resultCount: result.length,
        executionTime,
        pipelineStages: pipeline.length
      });

      return {
        data: result,
        executionTime,
        cached: false,
        pipeline
      };

    } catch (error) {
      // Sanitize error before logging
      const sanitizedError = {
        message: 'Product aggregation failed',
        timestamp: new Date().toISOString(),
        pipelineStages: pipeline.length
      };
      logger.error('Product aggregation failed:', sanitizedError);
      throw new Error('Product aggregation failed');
    }
  }

  /**
   * Optimized manufacturer listing with product counts and ratings
   */
  async getManufacturersWithStats(
    filters: Record<string, any> = {},
    options: AggregationOptions = {}
  ): Promise<AggregationResult<any>> {
    const startTime = Date.now();

    // Validate and sanitize inputs
    const sanitizedFilters = this.validateAndSanitizeFilters(filters, 'manufacturers');
    const validatedSort = this.validateSortOptions(options.sort, 'manufacturers');
    const { limit, skip } = this.validatePaginationOptions(options);

    const pipeline: PipelineStage[] = [];

    // Match stage with sanitized filters
    const matchStage: Record<string, any> = { isActive: { $ne: false } };
    Object.assign(matchStage, sanitizedFilters);
    pipeline.push({ $match: matchStage });

    // Lookup products
    pipeline.push({
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'manufacturer',
        as: 'products',
        pipeline: [
          { $match: { status: 'active' } },
          {
            $lookup: {
              from: 'votingrecords',
              localField: '_id',
              foreignField: 'selectedProductId',
              as: 'votes',
              pipeline: [
                { $match: { isVerified: true } },
                { $group: { _id: null, count: { $sum: 1 } } }
              ]
            }
          },
          {
            $addFields: {
              voteCount: { $ifNull: [{ $arrayElemAt: ['$votes.count', 0] }, 0] }
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              category: 1,
              price: 1,
              voteCount: 1,
              createdAt: 1
            }
          }
        ]
      }
    });

    // Lookup certificates
    pipeline.push({
      $lookup: {
        from: 'certificates',
        let: { manufacturerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$manufacturer', '$$manufacturerId'] },
                  { $eq: ['$status', 'verified'] }
                ]
              }
            }
          },
          { $project: { type: 1, issuer: 1 } }
        ],
        as: 'certificates'
      }
    });

    // Add computed statistics
    pipeline.push({
      $addFields: {
        productCount: { $size: '$products' },
        totalVotes: { $sum: '$products.voteCount' },
        certificateCount: { $size: '$certificates' },
        avgProductPrice: { $avg: '$products.price' },
        profileScore: {
          $add: [
            { $multiply: [{ $size: '$products' }, 10] },
            { $multiply: [{ $sum: '$products.voteCount' }, 5] },
            { $multiply: [{ $size: '$certificates' }, 20] },
            { $cond: ['$isVerified', 50, 0] }
          ]
        },
        recentProducts: {
          $slice: [
            {
              $sortArray: {
                input: '$products',
                sortBy: { createdAt: -1 }
              }
            },
            3
          ]
        }
      }
    });

    // Sort with validated options
    pipeline.push({ $sort: validatedSort });

    // Skip and limit with validated values
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    pipeline.push({ $limit: limit });

    // Final projection
    pipeline.push({
      $project: {
        name: 1,
        email: 1,
        industry: 1,
        description: 1,
        servicesOffered: 1,
        isVerified: 1,
        moq: 1,
        profileViews: 1,
        createdAt: 1,
        // Computed fields
        productCount: 1,
        totalVotes: 1,
        certificateCount: 1,
        avgProductPrice: { $round: ['$avgProductPrice', 2] },
        profileScore: 1,
        recentProducts: 1,
        // Simplified certificates
        certificates: {
          $map: {
            input: '$certificates',
            as: 'cert',
            in: {
              type: '$$cert.type',
              issuer: '$$cert.issuer'
            }
          }
        }
      }
    });

    try {
      const Manufacturer = mongoose.model('Manufacturer');
      const result = await Manufacturer.aggregate(pipeline).exec();

      const executionTime = Date.now() - startTime;
      this.updateStats(executionTime, false);

      logger.debug('Manufacturer aggregation completed', {
        resultCount: result.length,
        executionTime,
        pipelineStages: pipeline.length
      });

      return {
        data: result,
        executionTime,
        cached: false,
        pipeline
      };

    } catch (error) {
      // Sanitize error before logging
      const sanitizedError = {
        message: 'Manufacturer aggregation failed',
        timestamp: new Date().toISOString(),
        pipelineStages: pipeline.length
      };
      logger.error('Manufacturer aggregation failed:', sanitizedError);
      throw new Error('Manufacturer aggregation failed');
    }
  }

  /**
   * Generic aggregation with caching
   */
  async aggregateWithCache<T = any>(
    model: Model<any>,
    pipeline: PipelineStage[],
    options: AggregationOptions = {}
  ): Promise<AggregationResult<T>> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = options.cache ? this.generateCacheKey(model.collection.name, pipeline, options) : null;

    // Check cache
    if (cacheKey) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return {
          ...cached,
          cached: true,
          executionTime: Date.now() - startTime
        };
      }
    }

    try {
      // Execute aggregation
      const result = await model.aggregate(pipeline).exec();

      const executionTime = Date.now() - startTime;
      this.updateStats(executionTime, false);

      const aggregationResult: AggregationResult<T> = {
        data: result,
        executionTime,
        cached: false,
        pipeline
      };

      // Cache result
      if (cacheKey && options.cacheTTL) {
        this.setCache(cacheKey, aggregationResult, options.cacheTTL);
      }

      return aggregationResult;

    } catch (error) {
      logger.error('Aggregation failed:', error);
      throw error;
    }
  }

  /**
   * Replace populate with lookup aggregation
   */
  async replacePopulateWithLookup<T = any>(
    model: Model<any>,
    baseMatch: Record<string, any>,
    populates: PopulateMapping[],
    options: AggregationOptions = {}
  ): Promise<AggregationResult<T>> {
    const startTime = Date.now();
    this.stats.populateReplaced++;

    const pipeline: PipelineStage[] = [];

    // Initial match
    if (Object.keys(baseMatch).length > 0) {
      pipeline.push({ $match: baseMatch });
    }

    // Add lookup stages for each populate
    for (const populate of populates) {
      const lookupStage: any = {
        $lookup: {
          from: populate.from,
          localField: populate.localField,
          foreignField: populate.foreignField,
          as: populate.as
        }
      };

      // Add projection pipeline if select is specified
      if (populate.select && populate.select.length > 0) {
        const projection: Record<string, 1> = {};
        populate.select.forEach(field => {
          projection[field] = 1;
        });
        lookupStage.$lookup.pipeline = [{ $project: projection }];
      }

      pipeline.push(lookupStage);

      // Add unwind if specified
      if (populate.unwind) {
        pipeline.push({
          $unwind: {
            path: `$${populate.as}`,
            preserveNullAndEmptyArrays: populate.preserveNullAndEmptyArrays || false
          }
        });
      }
    }

    // Add additional match filters
    if (options.match) {
      pipeline.push({ $match: options.match });
    }

    // Add sort
    if (options.sort) {
      pipeline.push({ $sort: options.sort });
    }

    // Add skip and limit
    if (options.skip) {
      pipeline.push({ $skip: options.skip });
    }
    if (options.limit) {
      pipeline.push({ $limit: options.limit });
    }

    // Add projection
    if (options.project) {
      pipeline.push({ $project: options.project });
    }

    return this.aggregateWithCache<T>(model, pipeline, options);
  }

  /**
   * Optimized analytics aggregation
   */
  async getAnalyticsAggregation(
    collection: string,
    dateRange: { start: Date; end: Date },
    groupBy: 'day' | 'week' | 'month' = 'day',
    filters: Record<string, any> = {}
  ): Promise<AggregationResult<any>> {
    const startTime = Date.now();

    const pipeline: PipelineStage[] = [];

    // Validate date range
    if (!dateRange.start || !dateRange.end || dateRange.start > dateRange.end) {
      throw new Error('Invalid date range provided');
    }

    // Validate date range is not too large (max 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
    if (dateRange.end.getTime() - dateRange.start.getTime() > maxRange) {
      throw new Error('Date range too large (max 1 year)');
    }

    // Sanitize filters for analytics
    const sanitizedFilters = this.validateAndSanitizeFilters(filters, 'products');

    // Match date range and sanitized filters
    const matchStage: Record<string, any> = {
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      },
      ...sanitizedFilters
    };
    pipeline.push({ $match: matchStage });

    // Group by time period
    const dateFormat = this.getDateFormat(groupBy);
    pipeline.push({
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: '$createdAt'
          }
        },
        count: { $sum: 1 },
        items: { $push: '$$ROOT' }
      }
    });

    // Add additional analytics
    pipeline.push({
      $addFields: {
        date: '$_id',
        avgItemsPerPeriod: { $avg: '$count' },
        uniqueItems: { $size: '$items' }
      }
    });

    // Sort by date
    pipeline.push({ $sort: { _id: 1 } });

    try {
      const model = mongoose.model(collection);
      const result = await model.aggregate(pipeline).exec();

      const executionTime = Date.now() - startTime;
      this.updateStats(executionTime, false);

      return {
        data: result,
        executionTime,
        cached: false,
        pipeline
      };

    } catch (error) {
      // Sanitize error before logging
      const sanitizedError = {
        message: 'Analytics aggregation failed',
        timestamp: new Date().toISOString(),
        collection,
        groupBy
      };
      logger.error('Analytics aggregation failed:', sanitizedError);
      throw new Error('Analytics aggregation failed');
    }
  }

  /**
   * Get date format for grouping
   */
  private getDateFormat(groupBy: string): string {
    switch (groupBy) {
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-%U';
      case 'month':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  /**
   * Generate secure cache key
   */
  private generateCacheKey(collection: string, pipeline: PipelineStage[], options: AggregationOptions): string {
    const key = JSON.stringify({ collection, pipeline, options });
    // Use HMAC for secure, deterministic cache keys
    const hmac = crypto.createHmac('sha256', process.env.CACHE_SECRET || 'default-secret');
    hmac.update(key);
    return hmac.digest('hex').substring(0, 32);
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000
    });
  }

  /**
   * Update statistics
   */
  private updateStats(executionTime: number, cached: boolean): void {
    this.stats.queries++;
    this.stats.avgExecutionTime = (this.stats.avgExecutionTime + executionTime) / 2;

    monitoringService.recordMetric({
      name: 'aggregation_query_time',
      value: executionTime,
      tags: { cached: cached.toString() }
    });
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp > cached.ttl) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Start statistics collection
   */
  private startStatsCollection(): void {
    setInterval(() => {
      monitoringService.recordMetric({
        name: 'aggregation_queries_total',
        value: this.stats.queries,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'aggregation_cache_hits',
        value: this.stats.cacheHits,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'aggregation_populate_replaced',
        value: this.stats.populateReplaced,
        tags: {}
      });

      // Reset stats
      this.stats.queries = 0;
      this.stats.cacheHits = 0;
      this.stats.populateReplaced = 0;

    }, 60000); // Every minute
  }

  /**
   * Execute an optimized aggregation pipeline with caching
   * Generic method for custom aggregations
   */
  async executeOptimizedAggregation<T = any>(
    collectionName: string,
    pipeline: PipelineStage[],
    options: { cache?: boolean; cacheTTL?: number } = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('custom', { collectionName, pipeline, });

    // Check cache
    if (options.cache !== false) {
      const cached = this.getFromCache<T[]>(cacheKey);
      if (cached) {
        this.updateStats(Date.now() - startTime, true);
        return cached;
      }
    }

    try {
      // Get the model
      const model = mongoose.model(collectionName);

      // Execute aggregation
      const result = await model.aggregate(pipeline).exec();

      // Cache result
      if (options.cache !== false) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl: (options.cacheTTL || 300) * 1000
        });
      }

      const executionTime = Date.now() - startTime;
      this.updateStats(executionTime, false);

      return result;
    } catch (error) {
      logger.error(`Aggregation failed for ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const aggregationOptimizationService = new AggregationOptimizationService();