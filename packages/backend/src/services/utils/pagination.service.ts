/**
 * Memory-Efficient Pagination Service
 *
 * Provides cursor-based pagination for large datasets to improve memory efficiency
 * and provide consistent performance regardless of page offset.
 */

import { Document, Model, FilterQuery, QueryOptions } from 'mongoose';
import { logger } from '../../utils/logger';

export interface CursorPaginationOptions<T> {
  limit?: number;
  cursor?: string;
  sortField?: keyof T;
  sortOrder?: 'asc' | 'desc';
  select?: string;
  populate?: string | object;
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
    count: number;
    totalEstimate?: number;
  };
  performance: {
    queryTime: number;
    cached: boolean;
  };
}

export interface OffsetPaginationOptions {
  page?: number;
  limit?: number;
  select?: string;
  populate?: string | object;
  sort?: object;
}

export interface OffsetPaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
    limit: number;
  };
  performance: {
    queryTime: number;
  };
}

export class PaginationService {
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  /**
   * Cursor-based pagination for memory efficiency
   */
  async cursorPaginate<T extends Document>(
    model: Model<T>,
    filter: FilterQuery<T>,
    options: CursorPaginationOptions<T> = {}
  ): Promise<CursorPaginationResult<T>> {
    const startTime = Date.now();

    const {
      limit = this.DEFAULT_LIMIT,
      cursor,
      sortField = '_id' as keyof T,
      sortOrder = 'desc',
      select,
      populate
    } = options;

    // Ensure limit doesn't exceed maximum
    const actualLimit = Math.min(limit, this.MAX_LIMIT);

    try {
      // Build query with cursor
      const query = this.buildCursorQuery(filter, cursor, sortField as string, sortOrder);

      // Build sort object
      const sort = { [sortField as string]: sortOrder === 'asc' ? 1 : -1 };

      // Execute query with one extra document to check for next page
      let queryBuilder: any = model.find(query).sort(sort as any).limit(actualLimit + 1).lean();

      if (select) {
        queryBuilder = queryBuilder.select(select);
      }

      if (populate) {
        queryBuilder = queryBuilder.populate(populate);
      }

      const results = await queryBuilder.exec();
      const hasNext = results.length > actualLimit;
      const data = hasNext ? results.slice(0, actualLimit) : results;

      // Generate cursors
      const nextCursor = hasNext && data.length > 0
        ? this.encodeCursor(data[data.length - 1][sortField as string])
        : undefined;

      const previousCursor = cursor && data.length > 0
        ? this.encodeCursor(data[0][sortField as string])
        : undefined;

      const queryTime = Date.now() - startTime;

      logger.debug(`Cursor pagination completed in ${queryTime}ms`, {
        collection: model.collection.name,
        filter: Object.keys(filter),
        resultCount: data.length,
        hasNext,
        queryTime
      });

      return {
        data: data as T[],
        pagination: {
          hasNext,
          hasPrevious: !!cursor,
          nextCursor,
          previousCursor,
          count: data.length
        },
        performance: {
          queryTime,
          cached: queryTime < 50 // Assume cache hit if very fast
        }
      };

    } catch (error) {
      logger.error('Cursor pagination failed:', error);
      throw error;
    }
  }

  /**
   * Optimized offset-based pagination for small datasets
   */
  async offsetPaginate<T extends Document>(
    model: Model<T>,
    filter: FilterQuery<T>,
    options: OffsetPaginationOptions = {}
  ): Promise<OffsetPaginationResult<T>> {
    const startTime = Date.now();

    const {
      page = 1,
      limit = this.DEFAULT_LIMIT,
      select,
      populate,
      sort = { createdAt: -1 }
    } = options;

    // Ensure valid page and limit
    const actualPage = Math.max(1, page);
    const actualLimit = Math.min(limit, this.MAX_LIMIT);
    const skip = (actualPage - 1) * actualLimit;

    try {
      // Use Promise.all for parallel execution
      const [data, totalCount] = await Promise.all([
        this.buildOffsetQuery(model, filter, {
          skip,
          limit: actualLimit,
          sort,
          select,
          populate
        }),
        this.getOptimizedCount(model, filter, skip)
      ]);

      const totalPages = Math.ceil(totalCount / actualLimit);
      const queryTime = Date.now() - startTime;

      logger.debug(`Offset pagination completed in ${queryTime}ms`, {
        collection: model.collection.name,
        page: actualPage,
        limit: actualLimit,
        totalCount,
        resultCount: data.length,
        queryTime
      });

      return {
        data: data as T[],
        pagination: {
          currentPage: actualPage,
          totalPages,
          totalCount,
          hasNext: actualPage < totalPages,
          hasPrevious: actualPage > 1,
          limit: actualLimit
        },
        performance: {
          queryTime
        }
      };

    } catch (error) {
      logger.error('Offset pagination failed:', error);
      throw error;
    }
  }

  /**
   * Hybrid pagination that chooses optimal strategy based on page number
   */
  async hybridPaginate<T extends Document>(
    model: Model<T>,
    filter: FilterQuery<T>,
    options: (CursorPaginationOptions<T> | OffsetPaginationOptions) & {
      strategy?: 'auto' | 'cursor' | 'offset';
      page?: number;
    } = {}
  ): Promise<CursorPaginationResult<T> | OffsetPaginationResult<T>> {
    const { strategy = 'auto', page = 1 } = options;

    // Auto-select strategy based on page number
    let useStrategy = strategy;
    if (strategy === 'auto') {
      // Use cursor pagination for deep pages (>= page 10) or when cursor is provided
      useStrategy = (page >= 10 || 'cursor' in options) ? 'cursor' : 'offset';
    }

    if (useStrategy === 'cursor') {
      return this.cursorPaginate(model, filter, options as CursorPaginationOptions<T>);
    } else {
      return this.offsetPaginate(model, filter, options as OffsetPaginationOptions);
    }
  }

  /**
   * Streaming pagination for very large datasets
   */
  async *streamPaginate<T extends Document>(
    model: Model<T>,
    filter: FilterQuery<T>,
    options: {
      batchSize?: number;
      select?: string;
      sort?: object;
    } = {}
  ): AsyncGenerator<T[], void, unknown> {
    const { batchSize = 1000, select, sort = { _id: 1 } } = options;

    let cursor = '';
    let hasMore = true;

    logger.info(`Starting stream pagination for ${model.collection.name}`, {
      batchSize,
      filter: Object.keys(filter)
    });

    while (hasMore) {
      try {
        const result = await this.cursorPaginate(model, filter, {
          limit: batchSize,
          cursor: cursor || undefined,
          sortField: Object.keys(sort)[0] as keyof T,
          sortOrder: Object.values(sort)[0] === 1 ? 'asc' : 'desc',
          select
        });

        if (result.data.length === 0) {
          hasMore = false;
          break;
        }

        yield result.data;

        hasMore = result.pagination.hasNext;
        cursor = result.pagination.nextCursor || '';

      } catch (error) {
        logger.error('Stream pagination failed:', error);
        throw error;
      }
    }

    logger.info(`Stream pagination completed for ${model.collection.name}`);
  }

  /**
   * Build cursor-based query
   */
  private buildCursorQuery(
    baseFilter: FilterQuery<any>,
    cursor: string | undefined,
    sortField: string,
    sortOrder: 'asc' | 'desc'
  ): FilterQuery<any> {
    const query = { ...baseFilter };

    if (cursor) {
      try {
        const cursorValue = this.decodeCursor(cursor);
        const operator = sortOrder === 'asc' ? '$gt' : '$lt';
        query[sortField] = { [operator]: cursorValue };
      } catch (error) {
        logger.warn('Invalid cursor provided, ignoring', { cursor });
      }
    }

    return query;
  }

  /**
   * Build optimized offset query
   */
  private async buildOffsetQuery<T extends Document>(
    model: Model<T>,
    filter: FilterQuery<T>,
    options: {
      skip: number;
      limit: number;
      sort: object;
      select?: string;
      populate?: string | object;
    }
  ): Promise<T[]> {
    const { skip, limit, sort, select, populate } = options;

    let queryBuilder: any = model.find(filter)
      .sort(sort as any)
      .skip(skip)
      .limit(limit)
      .lean();

    if (select) {
      queryBuilder = queryBuilder.select(select);
    }

    if (populate) {
      queryBuilder = queryBuilder.populate(populate);
    }

    return queryBuilder.exec();
  }

  /**
   * Get optimized count with estimation for large collections
   */
  private async getOptimizedCount<T extends Document>(
    model: Model<T>,
    filter: FilterQuery<T>,
    skip: number
  ): Promise<number> {
    // For deep pagination, use estimated count to avoid performance issues
    if (skip > 10000) {
      try {
        // Use estimatedDocumentCount for empty filters on large collections
        if (Object.keys(filter).length === 0) {
          return await model.estimatedDocumentCount();
        }

        // For filtered queries, use a sample-based estimation
        const sampleSize = 1000;
        const sample = await model.find(filter).limit(sampleSize).countDocuments();

        if (sample < sampleSize) {
          return sample; // Small result set, return exact count
        }

        // Estimate total based on sample
        const totalDocs = await model.estimatedDocumentCount();
        const allDocs = await model.find({}).limit(sampleSize).countDocuments();
        const ratio = sample / allDocs;

        return Math.round(totalDocs * ratio);

      } catch (error) {
        logger.warn('Count estimation failed, falling back to exact count:', error);
      }
    }

    // Use exact count for smaller datasets
    return await model.countDocuments(filter);
  }

  /**
   * Encode cursor value
   */
  private encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  /**
   * Decode cursor value
   */
  private decodeCursor(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  /**
   * Get pagination recommendations based on collection size
   */
  async getPaginationRecommendations<T extends Document>(
    model: Model<T>,
    filter: FilterQuery<T> = {}
  ): Promise<{
    recommendedStrategy: 'cursor' | 'offset' | 'stream';
    estimatedTotal: number;
    reasoning: string;
  }> {
    try {
      const estimatedTotal = await this.getOptimizedCount(model, filter, 0);

      if (estimatedTotal > 100000) {
        return {
          recommendedStrategy: 'stream',
          estimatedTotal,
          reasoning: 'Large dataset detected. Streaming pagination recommended for memory efficiency.'
        };
      } else if (estimatedTotal > 10000) {
        return {
          recommendedStrategy: 'cursor',
          estimatedTotal,
          reasoning: 'Medium dataset detected. Cursor-based pagination recommended for consistent performance.'
        };
      } else {
        return {
          recommendedStrategy: 'offset',
          estimatedTotal,
          reasoning: 'Small dataset detected. Offset pagination is suitable.'
        };
      }
    } catch (error) {
      logger.error('Failed to get pagination recommendations:', error);
      return {
        recommendedStrategy: 'cursor',
        estimatedTotal: 0,
        reasoning: 'Unable to determine dataset size. Defaulting to cursor pagination for safety.'
      };
    }
  }
}

export const paginationService = new PaginationService();