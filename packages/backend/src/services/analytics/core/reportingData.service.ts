import { logger } from '../../../utils/logger';
import { VotingRecord } from '../../../models/voting/votingRecord.model';
import { Product } from '../../../models/products/product.model';
import { executeAnalyticsQuery, executeReportingQuery } from '../../infrastructure/database/core/readReplica.service';
import {
  ANALYTICS_CACHE_SEGMENT,
  ANALYTICS_CACHE_TTL,
  readAnalyticsCache,
  writeAnalyticsCache
} from '../utils/cache';
import {
  normalizeTimeRange,
  safeNumber,
  toISODateString
} from '../utils/helpers';
import type {
  AnalyticsReportPayload,
  AnalyticsReportRequest,
  AnalyticsReportType,
  AnalyticsTimeRange
} from '../utils/types';

interface DashboardReplicaResult {
  timeline: Array<{
    date: string;
    totalVotes: number;
    uniqueVoters: number;
    products: number;
  }>;
  summary: {
    totalProducts: number;
    totalVotes: number;
    totalCertificates: number;
    totalViews: number;
    avgPrice: number;
  };
  executionTime: number;
  source: 'read-replica';
}

/**
 * Core reporting data service that executes heavy analytics queries using the read replica.
 */
export class ReportingDataService {
  /**
   * Execute dashboard analytics against the read replica for reduced load on the primary database.
   */
  async getDashboardAnalyticsWithReplica(businessId: string, timeRange?: AnalyticsTimeRange): Promise<DashboardReplicaResult> {
    const normalizedRange = normalizeTimeRange(timeRange);
    const cacheKey = {
      businessId,
      start: normalizedRange?.start,
      end: normalizedRange?.end,
      type: 'dashboard-replica'
    };

    const cached = await readAnalyticsCache<DashboardReplicaResult>(
      ANALYTICS_CACHE_SEGMENT.reporting,
      cacheKey
    );
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      logger.info('Executing analytics query with read replica', { businessId });

      const analyticsData = await executeAnalyticsQuery(async (connection) => {
        const VotingRecordModel = connection.model('VotingRecord', VotingRecord.schema);
        const ProductModel = connection.model('Product', Product.schema);

        const voteMatch: Record<string, unknown> = { business: businessId };
        if (normalizedRange) {
          voteMatch.timestamp = {
            $gte: normalizedRange.start,
            $lte: normalizedRange.end
          };
        }

        const [votingAnalytics, productStats] = await Promise.all([
          VotingRecordModel.aggregate([
            { $match: voteMatch },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$timestamp'
                  }
                },
                totalVotes: { $sum: 1 },
                uniqueVoters: { $addToSet: '$voterEmail' },
                products: { $addToSet: '$selectedProductId' }
              }
            },
            {
              $project: {
                _id: 0,
                date: '$_id',
                totalVotes: 1,
                uniqueVoters: { $size: '$uniqueVoters' },
                products: { $size: '$products' }
              }
            },
            { $sort: { date: 1 } }
          ]),

          ProductModel.aggregate([
            { $match: { business: businessId } },
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalVotes: { $sum: '$voteCount' },
                totalCertificates: { $sum: '$certificateCount' },
                totalViews: { $sum: '$viewCount' },
                avgPrice: { $avg: '$price' }
              }
            }
          ])
        ]);

        return {
          timeline: votingAnalytics.map((entry: any) => ({
            date: entry.date,
            totalVotes: safeNumber(entry.totalVotes),
            uniqueVoters: safeNumber(entry.uniqueVoters),
            products: safeNumber(entry.products)
          })),
          summary: (productStats[0] && {
            totalProducts: safeNumber(productStats[0].totalProducts),
            totalVotes: safeNumber(productStats[0].totalVotes),
            totalCertificates: safeNumber(productStats[0].totalCertificates),
            totalViews: safeNumber(productStats[0].totalViews),
            avgPrice: safeNumber(productStats[0].avgPrice)
          }) || {
            totalProducts: 0,
            totalVotes: 0,
            totalCertificates: 0,
            totalViews: 0,
            avgPrice: 0
          }
        };
      });

      const executionTime = Date.now() - startTime;
      const result: DashboardReplicaResult = {
        ...analyticsData,
        executionTime,
        source: 'read-replica'
      };

      await writeAnalyticsCache(
        ANALYTICS_CACHE_SEGMENT.reporting,
        cacheKey,
        result,
        { ttl: ANALYTICS_CACHE_TTL.short }
      );

      logger.info('Analytics query with read replica completed', {
        businessId,
        executionTime,
        dataPoints: result.timeline.length
      });

      return result;
    } catch (error) {
      logger.error('Read replica analytics query failed, falling back to primary', { error, businessId });
      throw error;
    }
  }

  /**
   * Execute business reporting with configurable report types using the read replica.
   */
  async getBusinessReportingData(request: AnalyticsReportRequest): Promise<AnalyticsReportPayload> {
    const normalizedRange = normalizeTimeRange(request.timeRange);
    const cacheKey = {
      businessId: request.businessId,
      reportType: request.reportType,
      start: normalizedRange?.start,
      end: normalizedRange?.end
    };

    const cached = await readAnalyticsCache<AnalyticsReportPayload>(
      ANALYTICS_CACHE_SEGMENT.reporting,
      cacheKey
    );
    if (cached && !request.includeRawData) {
      return cached;
    }

    try {
      logger.info('Executing reporting query with read replica', {
        businessId: request.businessId,
        reportType: request.reportType
      });

      const data = await executeReportingQuery(async (connection) => {
        const ProductModel = connection.model('Product', Product.schema);
        const VotingRecordModel = connection.model('VotingRecord', VotingRecord.schema);

        switch (request.reportType) {
          case 'monthly-summary':
            return this.generateMonthlySummaryReport(ProductModel, VotingRecordModel, request.businessId, normalizedRange);

          case 'product-performance':
            return this.generateProductPerformanceReport(ProductModel, VotingRecordModel, request.businessId, normalizedRange);

          case 'voting-trends':
            return this.generateVotingTrendsReport(VotingRecordModel, request.businessId, normalizedRange);

          default:
            throw new Error(`Unknown report type: ${request.reportType}`);
        }
      });

      const payload = this.buildReportPayload(request, data, normalizedRange);

      if (!request.includeRawData) {
        await writeAnalyticsCache(
          ANALYTICS_CACHE_SEGMENT.reporting,
          cacheKey,
          payload,
          { ttl: ANALYTICS_CACHE_TTL.long }
        );
      }

      return payload;
    } catch (error) {
      logger.error('Reporting query failed', { error, businessId: request.businessId, reportType: request.reportType });
      throw error;
    }
  }

  private buildReportPayload(
    request: AnalyticsReportRequest,
    data: any,
    timeRange?: AnalyticsTimeRange
  ): AnalyticsReportPayload {
    const payload: AnalyticsReportPayload = {
      metadata: {
        businessId: request.businessId,
        generatedAt: new Date(),
        reportType: request.reportType,
        timeRange,
        format: 'json'
      },
      summary: this.buildReportSummary(request.reportType, data),
      data,
      raw: request.includeRawData ? data : undefined
    };

    return payload;
  }

  private buildReportSummary(reportType: AnalyticsReportType, data: any): Record<string, unknown> {
    if (!data) {
      return {};
    }

    if (reportType === 'monthly-summary') {
      return {
        newProducts: safeNumber(data.products?.newProducts),
        totalVotes: safeNumber(data.voting?.totalVotes),
        totalViews: safeNumber(data.products?.totalViews),
        uniqueVoters: Array.isArray(data.voting?.uniqueVoters) ? data.voting.uniqueVoters.length : safeNumber(data.voting?.uniqueVoters)
      };
    }

    if (reportType === 'product-performance') {
      return {
        totalProducts: safeNumber(data.summary?.totalProducts),
        topPerformer: data.summary?.topPerformer ? {
          id: data.summary.topPerformer._id,
          title: data.summary.topPerformer.title,
          votes: safeNumber(data.summary.topPerformer.currentVoteCount)
        } : null,
        avgVotesPerProduct: safeNumber(data.summary?.avgVotesPerProduct)
      };
    }

    if (reportType === 'voting-trends') {
      return {
        totalVotes: safeNumber(data.summary?.totalVotes),
        avgVotesPerDay: safeNumber(data.summary?.avgVotesPerDay),
        peakDay: data.summary?.peakDay ? {
          date: data.summary.peakDay.date,
          votes: safeNumber(data.summary.peakDay.votes)
        } : null
      };
    }

    return {};
  }

  private async generateMonthlySummaryReport(
    ProductModel: any,
    VotingRecordModel: any,
    businessId: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<any> {
    let startOfPeriod: Date;
    let endOfPeriod: Date;

    if (timeRange) {
      startOfPeriod = timeRange.start;
      endOfPeriod = timeRange.end;
    } else {
      startOfPeriod = new Date();
      startOfPeriod.setDate(1);
      startOfPeriod.setHours(0, 0, 0, 0);

      endOfPeriod = new Date(startOfPeriod);
      endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);
      endOfPeriod.setDate(0);
      endOfPeriod.setHours(23, 59, 59, 999);
    }

    const [productStats, votingStats] = await Promise.all([
      ProductModel.aggregate([
        {
          $match: {
            business: businessId,
            createdAt: { $gte: startOfPeriod, $lte: endOfPeriod }
          }
        },
        {
          $group: {
            _id: null,
            newProducts: { $sum: 1 },
            totalVotes: { $sum: '$voteCount' },
            totalViews: { $sum: '$viewCount' },
            categories: { $addToSet: '$category' }
          }
        }
      ]),

      VotingRecordModel.aggregate([
        {
          $match: {
            business: businessId,
            timestamp: { $gte: startOfPeriod, $lte: endOfPeriod }
          }
        },
        {
          $group: {
            _id: null,
            totalVotes: { $sum: 1 },
            uniqueVoters: { $addToSet: '$voterEmail' },
            avgVotesPerDay: {
              $avg: {
                $dayOfMonth: '$timestamp'
              }
            }
          }
        }
      ])
    ]);

    return {
      period: {
        start: toISODateString(startOfPeriod),
        end: toISODateString(endOfPeriod)
      },
      products: productStats[0] || { newProducts: 0, totalVotes: 0, totalViews: 0, categories: [] },
      voting: votingStats[0] || { totalVotes: 0, uniqueVoters: [], avgVotesPerDay: 0 },
      generatedAt: new Date()
    };
  }

  private async generateProductPerformanceReport(
    ProductModel: any,
    VotingRecordModel: any,
    businessId: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<any> {
    const matchStage: Record<string, unknown> = { business: businessId };
    if (timeRange) {
      matchStage.createdAt = {
        $gte: timeRange.start,
        $lte: timeRange.end
      };
    }

    const products = await ProductModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'votingrecords',
          localField: '_id',
          foreignField: 'selectedProductId',
          as: 'votes',
          pipeline: [
            { $match: { isVerified: true } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                recentVotes: {
                  $push: {
                    timestamp: '$timestamp',
                    voterEmail: '$voterEmail'
                  }
                }
              }
            }
          ]
        }
      },
      {
        $addFields: {
          currentVoteCount: { $ifNull: [{ $arrayElemAt: ['$votes.count', 0] }, 0] },
          recentActivity: { $slice: [{ $arrayElemAt: ['$votes.recentVotes', 0] }, -10] }
        }
      },
      {
        $project: {
          title: 1,
          category: 1,
          price: 1,
          voteCount: 1,
          currentVoteCount: 1,
          viewCount: 1,
          certificateCount: 1,
          recentActivity: 1,
          createdAt: 1
        }
      },
      { $sort: { currentVoteCount: -1, viewCount: -1 } },
      { $limit: 50 }
    ]);

    return {
      products,
      summary: {
        totalProducts: products.length,
        topPerformer: products[0] || null,
        avgVotesPerProduct: products.reduce((sum: number, product: any) => sum + safeNumber(product.currentVoteCount), 0) / Math.max(products.length, 1)
      },
      generatedAt: new Date()
    };
  }

  private async generateVotingTrendsReport(
    VotingRecordModel: any,
    businessId: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<any> {
    let start: Date;
    let end: Date = new Date();

    if (timeRange) {
      start = timeRange.start;
      end = timeRange.end;
    } else {
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    const trends = await VotingRecordModel.aggregate([
      {
        $match: {
          business: businessId,
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          votes: { $sum: 1 },
          uniqueVoters: { $addToSet: '$voterEmail' },
          sources: { $addToSet: '$votingSource' }
        }
      },
      {
        $project: {
          date: '$_id',
          votes: 1,
          uniqueVoters: { $size: '$uniqueVoters' },
          sources: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    const totalVotes = trends.reduce((sum: number, day: any) => sum + safeNumber(day.votes), 0);
    const avgVotesPerDay = trends.length > 0 ? totalVotes / trends.length : 0;
    const peakDay = trends.reduce((max: any, day: any) => day.votes > safeNumber(max?.votes) ? day : max, { votes: 0, date: '' });

    return {
      period: {
        start: toISODateString(start),
        end: toISODateString(end)
      },
      trends,
      summary: {
        totalVotes,
        avgVotesPerDay,
        peakDay
      },
      generatedAt: new Date()
    };
  }
}

export const reportingDataService = new ReportingDataService();


