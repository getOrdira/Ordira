/**
 * Query Optimization Service
 */

import { logger } from '../../../../utils/logger';
import { ensureSafeFilter } from '../utils/filterGuard.service';

export class QueryOptimizationService {

  /**
   * Optimized manufacturer search with proper indexing support
   */
  async optimizedManufacturerSearch(params: {
    query?: string;
    industry?: string;
    services?: string[];
    minMoq?: number;
    maxMoq?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }, Manufacturer: any): Promise<any> {
    const {
      query,
      industry,
      services,
      minMoq,
      maxMoq,
      limit = 20,
      offset = 0,
      sortBy = 'name',
      sortOrder = 'asc'
    } = params;

    // Build optimized search criteria
    const searchCriteria: any = { 
      isActive: { $ne: false },
      isEmailVerified: true 
    };

    // Use text search if query provided (requires text index)
    if (query) {
      searchCriteria.$text = { $search: query };
    }

    // Optimized industry filter (exact match for better index usage)
    if (industry) {
      searchCriteria.industry = industry; // Use exact match instead of regex
    }

    // Optimized services filter
    if (services && services.length > 0) {
      // Use $in with exact matches instead of regex for better performance
      searchCriteria.servicesOffered = { 
        $in: services // Exact match is much faster than regex
      };
    }

    // Optimized MOQ range filter
    if (minMoq !== undefined || maxMoq !== undefined) {
      searchCriteria.moq = {};
      if (minMoq !== undefined) searchCriteria.moq.$gte = minMoq;
      if (maxMoq !== undefined) searchCriteria.moq.$lte = maxMoq;
    }

    // Build optimized sort criteria
    const sortCriteria: any = {};
    
    if (query && sortBy === 'relevance') {
      // Use text score for relevance when searching
      sortCriteria.score = { $meta: 'textScore' };
    } else {
      // Use compound index-friendly sorting
      sortCriteria[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Add secondary sort for consistency
    sortCriteria.profileScore = -1;

    const startTime = Date.now();

    ensureSafeFilter(searchCriteria, 'optimizedManufacturerSearch');

    // Execute optimized query
    const results = await Manufacturer.find(searchCriteria)
      .select('name email industry description servicesOffered moq profileScore isVerified createdAt')
      .sort(sortCriteria)
      .limit(limit)
      .skip(offset)
      .lean(); // Use lean() for better performance when not needing Mongoose documents

    const total = await Manufacturer.countDocuments(searchCriteria);
    const queryTime = Date.now() - startTime;

    logger.info(`Manufacturer search completed in ${queryTime}ms`, {
      queryTime,
      resultsCount: results.length,
      totalCount: total,
      searchCriteria: Object.keys(searchCriteria)
    });

    return {
      manufacturers: results,
      total,
      hasMore: offset + results.length < total,
      queryTime
    };
  }

  /**
   * Optimized product search with proper indexing
   */
  async optimizedProductSearch(params: {
    query?: string;
    businessId?: string;
    manufacturerId?: string;
    category?: string;
    status?: string;
    priceMin?: number;
    priceMax?: number;
    limit?: number;
    offset?: number;
  }, Product: any): Promise<any> {
    const {
      query,
      businessId,
      manufacturerId,
      category,
      status = 'active',
      priceMin,
      priceMax,
      limit = 20,
      offset = 0
    } = params;

    // Build optimized search criteria
    const searchCriteria: any = { status };

    // Owner filter (business OR manufacturer)
    if (businessId) {
      searchCriteria.business = businessId;
    } else if (manufacturerId) {
      searchCriteria.manufacturer = manufacturerId;
    }

    // Text search if query provided
    if (query) {
      searchCriteria.$text = { $search: query };
    }

    // Exact category match for better index usage
    if (category) {
      searchCriteria.category = category;
    }

    // Price range filter
    if (priceMin !== undefined || priceMax !== undefined) {
      searchCriteria.price = {};
      if (priceMin !== undefined) searchCriteria.price.$gte = priceMin;
      if (priceMax !== undefined) searchCriteria.price.$lte = priceMax;
    }

    ensureSafeFilter(searchCriteria, 'optimizedProductSearch');

    const startTime = Date.now();

    // Execute optimized query with projection
    const results = await Product.find(searchCriteria)
      .select('title description category price status voteCount certificateCount viewCount createdAt')
      .sort({ 
        ...(query ? { score: { $meta: 'textScore' } } : {}),
        createdAt: -1 
      })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await Product.countDocuments(searchCriteria);
    const queryTime = Date.now() - startTime;

    logger.info(`Product search completed in ${queryTime}ms`, {
      queryTime,
      resultsCount: results.length,
      totalCount: total
    });

    return {
      products: results,
      total,
      hasMore: offset + results.length < total,
      queryTime
    };
  }

  /**
   * Optimized business aggregation for analytics
   */
  async optimizedBusinessAnalytics(filterOptions: {
    industry?: string;
    verified?: boolean;
    plan?: string;
    dateRange?: { start: Date; end: Date };
  }, Business: any): Promise<any> {
    const pipeline = [];

    // Match stage with optimized filters
    const matchStage: any = { isActive: { $ne: false } };
    
    if (filterOptions.industry) {
      matchStage.industry = filterOptions.industry;
    }
    
    if (filterOptions.verified !== undefined) {
      matchStage.isEmailVerified = filterOptions.verified;
    }
    
    if (filterOptions.plan) {
      matchStage.plan = filterOptions.plan;
    }
    
    if (filterOptions.dateRange) {
      matchStage.createdAt = {
        $gte: filterOptions.dateRange.start,
        $lte: filterOptions.dateRange.end
      };
    }

    pipeline.push({ $match: matchStage });

    // Optimized aggregation pipeline
    pipeline.push(
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: {
            $sum: { $cond: ['$isEmailVerified', 1, 0] }
          },
          industries: {
            $push: {
              industry: '$industry',
              verified: '$isEmailVerified'
            }
          },
          plans: {
            $push: '$plan'
          },
          avgProfileViews: {
            $avg: '$profileViews'
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          verified: 1,
          verificationRate: {
            $multiply: [
              { $divide: ['$verified', '$total'] },
              100
            ]
          },
          avgProfileViews: { $round: ['$avgProfileViews', 2] }
        }
      }
    );

    const startTime = Date.now();
    const results = await Business.aggregate(pipeline);
    const queryTime = Date.now() - startTime;

    logger.info(`Business analytics completed in ${queryTime}ms`, {
      queryTime,
      filterOptions
    });

    return {
      analytics: results[0] || { total: 0, verified: 0, verificationRate: 0 },
      queryTime
    };
  }

  /**
   * Optimized voting analytics with proper indexing
   */
  async optimizedVotingAnalytics(params: {
    businessId?: string;
    productId?: string;
    dateRange?: { start: Date; end: Date };
    groupBy?: 'day' | 'week' | 'month';
  }, VotingRecord: any): Promise<any> {
    const { businessId, productId, dateRange, groupBy = 'day' } = params;

    const pipeline: any[] = [];

    // Optimized match stage
    const matchStage: any = { isVerified: true };
    
    if (businessId) {
      matchStage.business = businessId;
    }
    
    if (productId) {
      matchStage.selectedProductId = productId;
    }
    
    if (dateRange) {
      matchStage.timestamp = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    ensureSafeFilter(matchStage, 'optimizedVotingAnalytics');

    pipeline.push({ $match: matchStage });

    // Date grouping optimization
    const dateGrouping = this.getDateGrouping(groupBy);
    
    pipeline.push(
      {
        $group: {
          _id: {
            date: dateGrouping,
            business: '$business',
            product: '$selectedProductId'
          },
          voteCount: { $sum: 1 },
          uniqueVoters: { $addToSet: '$voterEmail' },
          sources: { $addToSet: '$votingSource' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          totalVotes: { $sum: '$voteCount' },
          uniqueVoters: { $sum: { $size: '$uniqueVoters' } },
          products: { $sum: 1 },
          sources: { $addToSet: { $arrayElemAt: ['$sources', 0] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    );

    const startTime = Date.now();
    const results = await VotingRecord.aggregate(pipeline);
    const queryTime = Date.now() - startTime;

    logger.info(`Voting analytics completed in ${queryTime}ms`, {
      queryTime,
      resultsCount: results.length
    });

    return {
      analytics: results,
      queryTime
    };
  }

  /**
   * Get date grouping expression for aggregation
   */
  private getDateGrouping(groupBy: string): any {
    switch (groupBy) {
      case 'day':
        return {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$timestamp'
          }
        };
      case 'week':
        return {
          $dateToString: {
            format: '%Y-%U',
            date: '$timestamp'
          }
        };
      case 'month':
        return {
          $dateToString: {
            format: '%Y-%m',
            date: '$timestamp'
          }
        };
      default:
        return {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$timestamp'
          }
        };
    }
  }

  /**
   * Optimized user lookup with minimal data transfer
   */
  async optimizedUserLookup(userId: string, User: any): Promise<any> {
    const startTime = Date.now();

    // Use projection to limit data transfer
    const user = await User.findById(userId)
      .select('email firstName lastName profilePictureUrl isActive lastLoginAt preferences.emailNotifications')
      .lean();

    const queryTime = Date.now() - startTime;

    logger.info(`User lookup completed in ${queryTime}ms`, {
      userId,
      queryTime,
      found: !!user
    });

    return user;
  }

  /**
   * Batch user lookup for multiple users
   */
  async batchUserLookup(userIds: string[], User: any): Promise<any[]> {
    const startTime = Date.now();

    const userFilter = { _id: { $in: userIds } };
    ensureSafeFilter(userFilter, 'batchUserLookup');

    const users = await User.find(userFilter)
      .select('email firstName lastName profilePictureUrl isActive')
      .lean();

    const queryTime = Date.now() - startTime;

    logger.info(`Batch user lookup completed in ${queryTime}ms`, {
      requestedCount: userIds.length,
      foundCount: users.length,
      queryTime
    });

    return users;
  }

  /**
   * Optimized media lookup with pagination
   */
  async optimizedMediaLookup(params: {
    businessId?: string;
    manufacturerId?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }, Media: any): Promise<any> {
    const { businessId, manufacturerId, category, limit = 20, offset = 0 } = params;

    const searchCriteria: any = {};
    
    if (businessId) {
      searchCriteria.business = businessId;
    } else if (manufacturerId) {
      searchCriteria.manufacturer = manufacturerId;
    }
    
    if (category) {
      searchCriteria.category = category;
    }

    const startTime = Date.now();

    ensureSafeFilter(searchCriteria, 'optimizedMediaLookup');

    const results = await Media.find(searchCriteria)
      .select('fileName originalName fileSize mimeType filePath createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await Media.countDocuments(searchCriteria);
    const queryTime = Date.now() - startTime;

    logger.info(`Media lookup completed in ${queryTime}ms`, {
      queryTime,
      resultsCount: results.length,
      totalCount: total
    });

    return {
      media: results,
      total,
      hasMore: offset + results.length < total,
      queryTime
    };
  }
}

export const queryOptimizationService = new QueryOptimizationService();


