// src/services/platform/features/votingPlatformAnalytics.service.ts
import { Types } from 'mongoose';
import { VotingPlatform } from '../../../models/platform/votingPlatform.model';
import { VotingQuestion } from '../../../models/platform/votingQuestion.model';
import { VotingResponse } from '../../../models/platform/votingResponse.model';
import { PendingVote } from '../../../models/voting/pendingVote.model';
import { logger } from '../../../utils/logger';
import { createAppError } from '../../../middleware/core/error.middleware';
import { votingPlatformDataService } from '../core/votingPlatformData.service';
import { votingPlatformValidationService } from '../validation/votingPlatformValidation.service';

export interface PlatformAnalytics {
  platformId: string;
  title: string;
  status: string;

  // Response metrics
  totalViews: number;
  totalResponses: number;
  completedResponses: number;
  inProgressResponses: number;
  abandonedResponses: number;
  uniqueRespondents: number;

  // Engagement metrics
  completionRate: number;
  bounceRate: number;
  averageTimeToComplete: number;

  // Quality metrics
  averageQualityScore: number;
  flaggedResponses: number;
  suspiciousResponses: number;

  // Device breakdown
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };

  // Time series data
  dailyResponses: Array<{
    date: string;
    count: number;
    completed: number;
  }>;

  // Question performance
  questionPerformance: Array<{
    questionId: string;
    questionText: string;
    responseCount: number;
    skipCount: number;
    averageTimeToAnswer: number;
    skipRate: number;
  }>;

  // Blockchain integration (NEW)
  blockchainMetrics?: {
    totalPendingVotes: number;
    totalProcessedVotes: number;
    batchesCreated: number;
    lastBatchAt?: Date;
  };
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  questionType: string;

  // Response metrics
  totalResponses: number;
  totalSkips: number;
  responseRate: number;
  skipRate: number;
  averageTimeToAnswer: number;

  // Distribution (for choice-based questions)
  responseDistribution?: Record<string, {
    value: string;
    count: number;
    percentage: number;
  }>;

  // For numeric questions
  numericStats?: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
}

/**
 * Service for voting platform analytics
 */
export class VotingPlatformAnalyticsService {
  private readonly dataService = votingPlatformDataService;
  private readonly validation = votingPlatformValidationService;

  // ============================================
  // PLATFORM ANALYTICS
  // ============================================

  /**
   * Get comprehensive analytics for a platform
   */
  async getPlatformAnalytics(
    businessId: string,
    platformId: string
  ): Promise<PlatformAnalytics> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    // Verify ownership
    const platform = await this.dataService.getPlatformById(validatedPlatformId, validatedBusinessId);

    // Get response statistics
    const [
      responseStats,
      deviceBreakdown,
      timeSeriesData,
      questionPerformance,
      blockchainMetrics
    ] = await Promise.all([
      this.getResponseStatistics(validatedPlatformId),
      this.getDeviceBreakdown(validatedPlatformId),
      this.getTimeSeriesData(validatedPlatformId),
      this.getQuestionPerformanceMetrics(validatedPlatformId),
      this.getBlockchainMetrics(validatedBusinessId, validatedPlatformId)
    ]);

    const analytics: PlatformAnalytics = {
      platformId: validatedPlatformId,
      title: platform.title,
      status: platform.status,

      // Response metrics
      totalViews: platform.analytics.totalViews,
      totalResponses: responseStats.totalResponses,
      completedResponses: responseStats.completedResponses,
      inProgressResponses: responseStats.inProgressResponses,
      abandonedResponses: responseStats.abandonedResponses,
      uniqueRespondents: responseStats.uniqueRespondents,

      // Engagement metrics
      completionRate: responseStats.completionRate,
      bounceRate: platform.analytics.bounceRate,
      averageTimeToComplete: responseStats.averageTimeToComplete,

      // Quality metrics
      averageQualityScore: responseStats.averageQualityScore,
      flaggedResponses: responseStats.flaggedResponses,
      suspiciousResponses: responseStats.suspiciousResponses,

      // Device breakdown
      deviceBreakdown,

      // Time series
      dailyResponses: timeSeriesData,

      // Question performance
      questionPerformance,

      // Blockchain metrics
      blockchainMetrics
    };

    logger.info('Platform analytics generated', {
      businessId: validatedBusinessId,
      platformId: validatedPlatformId,
      totalResponses: analytics.totalResponses
    });

    return analytics;
  }

  /**
   * Get question-specific analytics
   */
  async getQuestionAnalytics(
    businessId: string,
    questionId: string
  ): Promise<QuestionAnalytics> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const question = await this.dataService.getQuestionById(questionId);

    // Verify ownership
    await this.dataService.getPlatformById(
      question.platformId.toString(),
      validatedBusinessId
    );

    // Get response data for this question
    const responses = await VotingResponse.aggregate([
      {
        $match: {
          platformId: question.platformId,
          'answers.questionId': new Types.ObjectId(questionId)
        }
      },
      { $unwind: '$answers' },
      {
        $match: {
          'answers.questionId': new Types.ObjectId(questionId)
        }
      },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          values: { $push: '$answers.value' },
          numericValues: {
            $push: {
              $cond: [
                { $isNumber: '$answers.numericValue' },
                '$answers.numericValue',
                '$$REMOVE'
              ]
            }
          },
          timeToAnswer: { $push: '$answers.metadata.timeToAnswer' }
        }
      }
    ]);

    const stats = responses[0] || { totalResponses: 0, values: [], numericValues: [], timeToAnswer: [] };

    // Calculate analytics
    const totalSkips = question.analytics.totalSkips || 0;
    const totalResponses = stats.totalResponses;
    const total = totalResponses + totalSkips;

    const responseRate = total > 0 ? (totalResponses / total) * 100 : 0;
    const skipRate = total > 0 ? (totalSkips / total) * 100 : 0;

    const averageTimeToAnswer = stats.timeToAnswer
      .filter((t: number) => t > 0)
      .reduce((sum: number, t: number) => sum + t, 0) / Math.max(stats.timeToAnswer.length, 1);

    const analytics: QuestionAnalytics = {
      questionId,
      questionText: question.questionText,
      questionType: question.questionType,
      totalResponses,
      totalSkips,
      responseRate,
      skipRate,
      averageTimeToAnswer
    };

    // Add distribution for choice-based questions
    if (['multiple_choice', 'image_selection', 'yes_no'].includes(question.questionType)) {
      analytics.responseDistribution = this.calculateDistribution(stats.values, totalResponses);
    }

    // Add numeric stats
    if (['rating', 'scale'].includes(question.questionType) && stats.numericValues.length > 0) {
      analytics.numericStats = this.calculateNumericStats(stats.numericValues);
    }

    return analytics;
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    businessId: string,
    platformId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    // Check if export is allowed by plan
    const platform = await this.dataService.getPlatformById(platformId, validatedBusinessId);

    if (!platform.planFeatures.exportResponses) {
      throw createAppError(
        'Export feature requires Growth plan or higher',
        403,
        'PLAN_UPGRADE_REQUIRED'
      );
    }

    const analytics = await this.getPlatformAnalytics(validatedBusinessId, platformId);

    if (format === 'csv') {
      return this.convertToCSV(analytics);
    }

    return analytics;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get response statistics
   */
  private async getResponseStatistics(platformId: string): Promise<any> {
    const stats = await VotingResponse.aggregate([
      { $match: { platformId: new Types.ObjectId(platformId) } },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          completedResponses: {
            $sum: { $cond: ['$isComplete', 1, 0] }
          },
          inProgressResponses: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          abandonedResponses: {
            $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] }
          },
          flaggedResponses: {
            $sum: { $cond: ['$isFlagged', 1, 0] }
          },
          suspiciousResponses: {
            $sum: { $cond: ['$qualityMetrics.isSuspicious', 1, 0] }
          },
          uniqueRespondents: { $addToSet: '$userId' },
          averageTimeToComplete: {
            $avg: '$timeToComplete'
          },
          averageQualityScore: {
            $avg: '$qualityMetrics.validationScore'
          }
        }
      }
    ]);

    const data = stats[0] || {
      totalResponses: 0,
      completedResponses: 0,
      inProgressResponses: 0,
      abandonedResponses: 0,
      flaggedResponses: 0,
      suspiciousResponses: 0,
      uniqueRespondents: [],
      averageTimeToComplete: 0,
      averageQualityScore: 100
    };

    const completionRate = data.totalResponses > 0
      ? (data.completedResponses / data.totalResponses) * 100
      : 0;

    return {
      ...data,
      uniqueRespondents: data.uniqueRespondents.filter(Boolean).length,
      completionRate,
      averageTimeToComplete: Math.round(data.averageTimeToComplete || 0),
      averageQualityScore: Math.round(data.averageQualityScore || 100)
    };
  }

  /**
   * Get device breakdown
   */
  private async getDeviceBreakdown(platformId: string): Promise<any> {
    const breakdown = await VotingResponse.aggregate([
      { $match: { platformId: new Types.ObjectId(platformId) } },
      {
        $group: {
          _id: '$userContext.deviceType',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      desktop: breakdown.find((b: any) => b._id === 'desktop')?.count || 0,
      mobile: breakdown.find((b: any) => b._id === 'mobile')?.count || 0,
      tablet: breakdown.find((b: any) => b._id === 'tablet')?.count || 0
    };
  }

  /**
   * Get time series data (daily responses)
   */
  private async getTimeSeriesData(platformId: string): Promise<any[]> {
    const data = await VotingResponse.aggregate([
      { $match: { platformId: new Types.ObjectId(platformId) } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: ['$isComplete', 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return data.map((d: any) => ({
      date: d._id,
      count: d.count,
      completed: d.completed
    }));
  }

  /**
   * Get question performance metrics
   */
  private async getQuestionPerformanceMetrics(platformId: string): Promise<any[]> {
    const questions = await VotingQuestion.find({
      platformId: new Types.ObjectId(platformId)
    }).lean();

    return questions.map(q => {
      const totalResponses = q.analytics?.totalResponses || 0;
      const totalSkips = q.analytics?.totalSkips || 0;
      const total = totalResponses + totalSkips;

      return {
        questionId: q._id.toString(),
        questionText: q.questionText,
        responseCount: totalResponses,
        skipCount: totalSkips,
        averageTimeToAnswer: q.analytics?.averageTimeToAnswer || 0,
        skipRate: total > 0 ? (totalSkips / total) * 100 : 0
      };
    });
  }

  /**
   * Get blockchain integration metrics (NEW)
   */
  private async getBlockchainMetrics(
    businessId: string,
    platformId: string
  ): Promise<any> {
    // Count pending votes created from this platform's responses
    const pendingVotes = await PendingVote.countDocuments({
      businessId,
      metadata: { source: 'voting_platform', platformId }
    });

    const processedVotes = await PendingVote.countDocuments({
      businessId,
      metadata: { source: 'voting_platform', platformId },
      isProcessed: true
    });

    const lastBatch = await PendingVote.findOne({
      businessId,
      metadata: { source: 'voting_platform', platformId },
      isProcessed: true
    })
      .sort({ processedAt: -1 })
      .select('processedAt')
      .lean();

    return {
      totalPendingVotes: pendingVotes,
      totalProcessedVotes: processedVotes,
      batchesCreated: 0, // TODO: Count actual batches when batch tracking is implemented
      lastBatchAt: lastBatch?.processedAt
    };
  }

  /**
   * Calculate distribution for choice-based questions
   */
  private calculateDistribution(values: any[], total: number): Record<string, any> {
    const distribution: Record<string, number> = {};

    values.forEach(value => {
      const key = Array.isArray(value) ? value.join(',') : String(value);
      distribution[key] = (distribution[key] || 0) + 1;
    });

    const result: Record<string, any> = {};
    Object.entries(distribution).forEach(([key, count]) => {
      result[key] = {
        value: key,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      };
    });

    return result;
  }

  /**
   * Calculate numeric statistics
   */
  private calculateNumericStats(values: number[]): any {
    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      average: Math.round(average * 100) / 100,
      median
    };
  }

  /**
   * Convert analytics to CSV format
   */
  private convertToCSV(analytics: PlatformAnalytics): string {
    const rows = [
      ['Metric', 'Value'],
      ['Platform ID', analytics.platformId],
      ['Title', analytics.title],
      ['Status', analytics.status],
      ['Total Views', analytics.totalViews.toString()],
      ['Total Responses', analytics.totalResponses.toString()],
      ['Completed Responses', analytics.completedResponses.toString()],
      ['Completion Rate', `${analytics.completionRate}%`],
      ['Average Time to Complete', `${analytics.averageTimeToComplete}s`],
      ['Average Quality Score', analytics.averageQualityScore.toString()]
    ];

    return rows.map(row => row.join(',')).join('\n');
  }
}

export const votingPlatformAnalyticsService = new VotingPlatformAnalyticsService();
