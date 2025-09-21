import { VotingRecord } from '../../models/votingRecord.model';
import { logger } from '../../utils/logger';
import { NftCertificate } from '../../models/nftCertificate.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { SubscriptionService } from './subscription.service';
import { BlockchainContractsService } from '../blockchain/contracts.service';
import { Types } from 'mongoose';
import { User } from '../../models/user.model';


// Type definitions
type VoteAnalytics = {
  totalOnChainVotes: number;
  byProposal: Record<string, number>;
  usedLast30d: number;
  voteLimit: number;
  remainingVotes: number | 'unlimited';
  timeSeries: Array<{
    date: string;
    count: number;
  }>;
};

type BlockchainEvent = {
  args?: {
    proposalId?: { toString(): string };
  };
};

type ProductBreakdownEntry = {
  selectionCount: number;
};

type VotingEngagement = {
  participationRate?: string;
  uniqueVoters?: number;
  totalVotes?: number;
};

type AnalyticsData = {
  totalEvents: number;
  eventBreakdown: Record<string, number>;
  lastUpdated: Date;
};

type SettingsWithAnalytics = {
  analyticsData?: AnalyticsData;
};

interface VoteData {
  proposalId: string;
  businessId: string;
  productId?: string;
  selectedProductId: string; 
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  businessId?: string;
  metadata: any;
  timestamp: Date;
  sessionId?: string;
  source?: string;
}

type NftAnalytics = {
  usedLast30d: number;
  nftLimit: number;
  remainingCertificates: number | 'unlimited';
  holderMetrics?: any;
  mintingActivity?: any;
  marketMetrics?: any;
};

type TransactionAnalytics = {
  summary?: {
    totalVolume: number;
    totalCount: number;
    averageValue: number;
  };
  trends?: {
    volumeGrowth: number;
    countGrowth: number;
  };
  timeSeries?: Array<{
    date: string;
    count: number;
    volume: number;
  }>;
};

type DashboardAnalytics = {
  summary: {
    totalVotes: number;
    totalCertificates: number;
    activeProposals: number;
    recentActivity: number;
  };
  trends?: {
    votingTrend: number;
    certificateTrend: number;
    engagementTrend: number;
  };
  predictions?: any;
  comparisons?: any;
  advancedMetrics?: any;
};

type ExportOptions = {
  type: string;
  format: string;
  timeframe: string;
  includeCharts?: boolean;
};

type ExportData = {
  data: any;
  filename: string;
  contentType: string;
  buffer?: Buffer;
};

type ReportConfig = {
  reportType?: string;
  timeframe?: string;
  metrics?: string[];
  format?: string;
  includeCharts?: boolean;
  requestedBy?: string;
  planLevel?: string;
};

type CustomReport = {
  reportId: string;
  id: string;
  title: string;
  generatedAt: Date;
  requestedBy: string;
  planLevel: string;
  status: 'generating' | 'completed' | 'failed';
  estimatedCompletion?: Date;
  data: any;
  metadata: {
    businessId: string;
    timeframe: string;
    metrics: string[];
    dataPoints: number;
  };
  insights?: any;
  recommendations?: any;
};

export class AnalyticsBusinessService {
  private subscriptionService = new SubscriptionService();
  private contractsService = new BlockchainContractsService();

  /**
   * Get voting analytics with time series data
   */
  async getVotingAnalytics(businessId: string): Promise<VoteAnalytics> {
    const businessObjectId = new Types.ObjectId(businessId);
    
    // Get on-chain data
    const settings = await BrandSettings.findOne({ business: businessObjectId });
    let totalOnChainVotes = 0;
    let byProposal: Record<string, number> = {};

    if (settings?.web3Settings?.voteContract) {
      try {
        const events = await BlockchainContractsService.getVoteEventsFromContract(settings.web3Settings.voteContract);
        totalOnChainVotes = events.length;
        
        for (const event of events) {
          const evt = event as BlockchainEvent;
          const pid = evt.args?.proposalId?.toString() || 'unknown';
          byProposal[pid] = (byProposal[pid] || 0) + 1;
        }
      } catch (error) {
        logger.error('Error fetching blockchain events:', error);
      }
    }

    // Get 30-day usage and limits
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usedLast30d = await VotingRecord.countDocuments({
      business: businessObjectId,
      timestamp: { $gte: windowStart }
    });

    const limits = await this.subscriptionService.getVotingLimits(businessId);

    // Get time series data for the last 30 days
    const timeSeries = await this.getVotingTimeSeries(businessId, '30d');

    return {
      totalOnChainVotes,
      byProposal,
      usedLast30d,
      voteLimit: limits.voteLimit,
      remainingVotes: limits.remainingVotes,
      timeSeries
    };
  }

  /**
   * Get analytics for a specific proposal/selection round
   */
  async getProposalAnalytics(
    businessId: string, 
    proposalId: string, 
    options?: {
      timeframe?: string;
      groupBy?: string;
      includeProductBreakdown?: boolean;
      includeVoterInsights?: boolean;
    }
  ): Promise<any> {
    try {
      const businessObjectId = new Types.ObjectId(businessId);
      const { 
        timeframe = '30d',
        groupBy = 'day',
        includeProductBreakdown = true,
        includeVoterInsights = true 
      } = options || {};

      // Get product selections for this proposal
      const productSelections = await VotingRecord.getProductSelectionStats(businessId, proposalId);
      
      // Get basic proposal metrics
      const totalSelections = await VotingRecord.countDocuments({
        business: businessObjectId,
        proposalId: proposalId
      });

      // Fix: Get unique voters count properly
      const uniqueVotersArray = await VotingRecord.distinct('voterAddress', {
        business: businessObjectId,
        proposalId: proposalId
      });
      const uniqueVoters = uniqueVotersArray.length;

      // Get time series data for the proposal
      const timeSeriesData = await this.getProposalTimeSeries(businessId, proposalId, groupBy);

      let productBreakdown = {};
      if (includeProductBreakdown && productSelections.length > 0) {
        productBreakdown = productSelections[0]?.productSelections || {};
      }

      let voterInsights = {};
      if (includeVoterInsights) {
        voterInsights = await this.getProposalVoterInsights(businessId, proposalId);
      }

      return {
        proposalId,
        summary: {
          totalSelections,
          uniqueVoters,
          participationRate: uniqueVoters > 0 ? ((totalSelections / uniqueVoters) * 100).toFixed(2) + '%' : '0%',
          status: 'active' // You might determine this differently
        },
        productBreakdown,
        timeSeries: timeSeriesData,
        voterInsights,
        topProducts: productBreakdown ? Object.entries(productBreakdown)
          .sort(([,a], [,b]) => (b as ProductBreakdownEntry).selectionCount - (a as ProductBreakdownEntry).selectionCount)
          .slice(0, 5) : []
      };
    } catch (error) {
      logger.error('Get proposal analytics error:', error);
      throw new Error(`Failed to get proposal analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get general product analytics
   */
  async getProductAnalytics(
    businessId: string, 
    options?: {
      timeframe?: string;
      groupBy?: string;
      sortBy?: string;
      limit?: number;
      includeSelectionTrends?: boolean;
      includePopularityMetrics?: boolean;
    }
  ): Promise<any> {
    try {
      const { 
        timeframe = '30d',
        sortBy = 'selections',
        limit = 20,
        includeSelectionTrends = true,
        includePopularityMetrics = true 
      } = options || {};

      // Get top products across all proposals
      const topProducts = await VotingRecord.getTopProducts(businessId, limit);

      // Get product selection trends
      let selectionTrends = {};
      if (includeSelectionTrends) {
        const days = this.getTimeframeDays(timeframe);
        selectionTrends = await VotingRecord.getSelectionTrends(businessId, days);
      }

      // Get total products count
      const totalProductsArray = await VotingRecord.distinct('selectedProductId', {
        business: new Types.ObjectId(businessId)
      });
      const totalProducts = totalProductsArray.length;

      // Calculate popularity metrics
      let popularityMetrics = {};
      if (includePopularityMetrics && topProducts.length > 0) {
        const totalSelections = topProducts.reduce((sum, product) => sum + product.totalSelections, 0);
        popularityMetrics = {
          totalSelections,
          averageSelectionsPerProduct: totalSelections / topProducts.length,
          topProductMarketShare: topProducts[0] ? (topProducts[0].totalSelections / totalSelections * 100).toFixed(2) + '%' : '0%'
        };
      }

      return {
        topProducts,
        totalProducts,
        selectionTrends,
        popularityMetrics,
        trendingProducts: topProducts.slice(0, 3), // Top 3 as trending
        productionRecommendations: this.generateProductionRecommendations(topProducts),
        demandMetrics: this.calculateDemandMetrics(topProducts)
      };
    } catch (error) {
      logger.error('Get product analytics error:', error);
      throw new Error(`Failed to get product analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get analytics for a specific product
   */
  async getProductAnalyticsById(
    businessId: string, 
    productId: string, 
    options?: {
      timeframe?: string;
      groupBy?: string;
      includeCompetitorComparison?: boolean;
      includeVoterDemographics?: boolean;
      includeSelectionReasons?: boolean;
    }
  ): Promise<any> {
    try {
      const businessObjectId = new Types.ObjectId(businessId);
      const { 
        timeframe = '30d',
        groupBy = 'day',
        includeCompetitorComparison = true,
        includeSelectionReasons = true 
      } = options || {};

      // Get product selection data
      const productSelections = await VotingRecord.find({
        business: businessObjectId,
        selectedProductId: productId
      }).sort({ timestamp: -1 });

      const totalSelections = productSelections.length;
      const uniqueVoters = new Set(productSelections.map(s => s.voterAddress).filter(Boolean)).size;

      // Get product ranking
      const allProducts = await VotingRecord.getTopProducts(businessId, 100);
      const productRank = allProducts.findIndex(p => p.productId === productId) + 1;

      // Get time series for this product
      const timeSeries = await this.getProductTimeSeries(businessId, productId, groupBy);

      // Get selection reasons if available
      let selectionReasons: string[] = [];
      if (includeSelectionReasons) {
        selectionReasons = productSelections
          .filter(s => s.selectionReason)
          .map(s => s.selectionReason!)
          .slice(0, 10); // Top 10 reasons
      }

      // Get competitor comparison
      let competitorData = {};
      if (includeCompetitorComparison && allProducts.length > 1) {
        const competitorProducts = allProducts
          .filter(p => p.productId !== productId)
          .slice(0, 5); // Top 5 competitors
        
        competitorData = {
          competitors: competitorProducts,
          relativePerformance: productRank ? `#${productRank} of ${allProducts.length}` : 'Unknown'
        };
      }

      return {
        productId,
        productName: productSelections[0]?.productName || 'Unknown Product',
        summary: {
          totalSelections,
          uniqueVoters,
          averageSelectionsPerVoter: uniqueVoters > 0 ? (totalSelections / uniqueVoters).toFixed(2) : '0'
        },
        rankingMetrics: {
          overallRank: productRank || null,
          totalProducts: allProducts.length
        },
        selectionTrends: {
          timeSeries,
          currentDemand: this.calculateDemandLevel(totalSelections, allProducts)
        },
        voterFeedback: {
          reasons: selectionReasons,
          sentimentScore: this.calculateSentimentScore(selectionReasons) // Placeholder
        },
        competitorData,
        productionAdvice: this.generateProductionAdvice(totalSelections, productRank, allProducts.length)
      };
    } catch (error) {
      logger.error('Get product analytics by ID error:', error);
      throw new Error(`Failed to get product analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get engagement analytics
   */
  async getEngagementAnalytics(
    businessId: string, 
    options?: {
      timeframe?: string;
      groupBy?: string;
      includeVotingEngagement?: boolean;
      includeProductInteractions?: boolean;
      includeUserRetention?: boolean;
    }
  ): Promise<any> {
    try {
      const businessObjectId = new Types.ObjectId(businessId);
      const { 
        timeframe = '30d',
        groupBy = 'day',
        includeVotingEngagement = true,
        includeUserRetention = true 
      } = options || {};

      const days = this.getTimeframeDays(timeframe);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get voting engagement metrics
      let votingEngagement = {};
      if (includeVotingEngagement) {
        const totalVotes = await VotingRecord.countDocuments({
          business: businessObjectId,
          timestamp: { $gte: startDate }
        });

        const uniqueVotersArray = await VotingRecord.distinct('voterAddress', {
          business: businessObjectId,
          timestamp: { $gte: startDate }
        });
        const uniqueVoters = uniqueVotersArray.length;

        const activeProposalsArray = await VotingRecord.distinct('proposalId', {
          business: businessObjectId,
          timestamp: { $gte: startDate }
        });
        const activeProposals = activeProposalsArray.length;

        votingEngagement = {
          totalVotes,
          uniqueVoters,
          activeProposals,
          averageVotesPerUser: uniqueVoters > 0 ? (totalVotes / uniqueVoters).toFixed(2) : '0',
          participationRate: activeProposals > 0 ? ((uniqueVoters / activeProposals) * 100).toFixed(2) + '%' : '0%'
        };
      }

      // Get user retention metrics
      let retention = {};
      if (includeUserRetention) {
        retention = await this.calculateUserRetention(businessId, days);
      }

      return {
        summary: {
          overallEngagement: (votingEngagement as VotingEngagement).participationRate || '0%',
          activeUsers: (votingEngagement as VotingEngagement).uniqueVoters || 0,
          totalInteractions: (votingEngagement as VotingEngagement).totalVotes || 0
        },
        votingEngagement,
        retention,
        trends: {
          overall: 'stable' // You might calculate this from time series data
        },
        drivers: [
          'Product selection voting',
          'Certificate rewards',
          'Community participation'
        ],
        recommendations: this.generateEngagementRecommendations(votingEngagement, retention)
      };
    } catch (error) {
      logger.error('Get engagement analytics error:', error);
      throw new Error(`Failed to get engagement analytics: ${(error as Error).message}`);
    }
  }
/**
 * Track user voting activity for analytics (CORRECTED for product selection)
 */
async trackUserVote(userId: string, voteData: VoteData): Promise<void> {
  try {
    // Log the vote for analytics - CORRECTED
    logger.info('[Analytics] User vote tracked:', {
      userId,
      proposalId: voteData.proposalId,
      businessId: voteData.businessId,
      selectedProductId: voteData.selectedProductId, // FIXED
      productName: voteData.productName, // FIXED
      selectionReason: voteData.selectionReason, // FIXED
      timestamp: new Date().toISOString(),
      userAgent: voteData.userAgent,
      ipAddress: voteData.ipAddress
    });

    // Save vote analytics to VotingRecord for historical analysis - CORRECTED
    try {
      await VotingRecord.create({
        business: new Types.ObjectId(voteData.businessId),
        proposalId: voteData.proposalId,
        voteId: `analytics_${Date.now()}_${userId}`,
        timestamp: new Date(),
        selectedProductId: voteData.selectedProductId, // FIXED - use selectedProductId
        productName: voteData.productName, // FIXED
        productImageUrl: voteData.productImageUrl, // FIXED
        selectionReason: voteData.selectionReason, // FIXED
        voterAddress: userId,
        voterEmail: undefined, // Will be populated if available
        userAgent: voteData.userAgent,
        ipAddress: voteData.ipAddress,
        votingSource: 'web', // Default, can be dynamic
        isVerified: false, // For analytics tracking
        verificationHash: undefined,
        processedAt: new Date()
      });
    } catch (recordError) {
      logger.warn('Failed to save vote analytics to VotingRecord:', recordError);
    }

    // Update user voting analytics summary
    await this.updateUserVotingAnalytics(userId, voteData);

    // Track general event for broader analytics - CORRECTED
    await this.trackEvent('user_vote', {
      userId,
      businessId: voteData.businessId,
      proposalId: voteData.proposalId,
      selectedProductId: voteData.selectedProductId, // FIXED
      productName: voteData.productName, // FIXED
      selectionReason: voteData.selectionReason, // FIXED
      timestamp: new Date(),
      source: 'voting_system'
    });

  } catch (error) {
    logger.error('Failed to track user vote:', error);
    // Don't throw - analytics tracking shouldn't break voting
  }
}

/**
 * Track general user events
 */
async trackEvent(eventType: string, eventData: any): Promise<void> {
  try {
    logger.info('[Analytics] Event tracked: ${eventType}', eventData);
    
    // Create analytics event record
    const analyticsEvent: AnalyticsEvent = {
      eventType,
      userId: eventData.userId,
      businessId: eventData.businessId,
      metadata: {
        ...eventData,
        userAgent: eventData.userAgent,
        ipAddress: eventData.ipAddress,
        referrer: eventData.referrer,
        sessionDuration: eventData.sessionDuration
      },
      timestamp: new Date(),
      sessionId: eventData.sessionId,
      source: eventData.source || 'web'
    };

    // Store in your preferred analytics storage
    switch (eventType) {
      case 'user_vote':
        // Already handled in trackUserVote
        break;
      
      case 'page_view':
        await this.trackPageView(eventData);
        break;
      
      case 'user_registration':
        await this.trackUserRegistration(eventData);
        break;
      
      case 'subscription_change':
        await this.trackSubscriptionChange(eventData);
        break;
      
      case 'product_view':
        await this.trackProductView(eventData);
        break;
      
      case 'nft_mint':
        await this.trackNftMint(eventData);
        break;
      
      default:
        // Store generic events in a simple log format
        logger.info('[Analytics] Generic event: ${eventType}', analyticsEvent);
    }

    // Update business-level analytics aggregates
    if (eventData.businessId) {
      await this.updateBusinessAnalytics(eventData.businessId, eventType, eventData);
    }

  } catch (error) {
    logger.error('Failed to track event ${eventType}:', error);
  }
}


  /**
   * Get comparative analytics between periods
   */
  async getComparativeAnalytics(
    businessId: string, 
    options: {
      currentPeriod: { startDate: Date; endDate: Date };
      previousPeriod: { startDate: Date; endDate: Date };
      metrics: string[];
      includePercentageChanges?: boolean;
      includeStatisticalSignificance?: boolean;
    }
  ): Promise<any> {
    try {
      const { currentPeriod, previousPeriod, metrics, includePercentageChanges = true } = options;

      const comparison: any = {
        currentPeriod: {},
        previousPeriod: {},
        changes: {},
        summary: {}
      };

      // Get data for both periods
      for (const metric of metrics) {
        const currentData = await this.getMetricForPeriod(businessId, metric, currentPeriod);
        const previousData = await this.getMetricForPeriod(businessId, metric, previousPeriod);

        comparison.currentPeriod[metric] = currentData;
        comparison.previousPeriod[metric] = previousData;

        if (includePercentageChanges) {
          const change = this.calculatePercentageChange(previousData, currentData);
          comparison.changes[metric] = {
            absolute: currentData - previousData,
            percentage: change,
            trend: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable'
          };
        }
      }

      // Generate summary insights
      const positiveChanges = Object.values(comparison.changes).filter((c: any) => c.percentage > 0).length;
      const negativeChanges = Object.values(comparison.changes).filter((c: any) => c.percentage < 0).length;

      comparison.summary = {
        trend: positiveChanges > negativeChanges ? 'growth' : negativeChanges > positiveChanges ? 'decline' : 'stable',
        significantChanges: Object.entries(comparison.changes)
          .filter(([, change]: [string, any]) => Math.abs(change.percentage) > 10)
          .map(([metric, change]) => ({ metric, change })),
        overallHealth: positiveChanges >= negativeChanges ? 'good' : 'needs_attention'
      };

      comparison.actionableInsights = this.generateComparisonInsights(comparison);
      comparison.highlights = this.generateComparisonHighlights(comparison);

      return comparison;
    } catch (error) {
      logger.error('Get comparative analytics error:', error);
      throw new Error(`Failed to get comparative analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get NFT analytics
   */
  async getNftAnalytics(
    businessId: string, 
    options?: {
      timeframe?: string;
      groupBy?: string;
      includeMarketData?: boolean;
      includeHolderAnalysis?: boolean;
    }
  ): Promise<NftAnalytics> {
    const businessObjectId = new Types.ObjectId(businessId);
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const usedLast30d = await NftCertificate.countDocuments({
      business: businessObjectId,
      mintedAt: { $gte: windowStart }
    });

    const limits = await this.subscriptionService.getNftLimits(businessId);

    let holderMetrics, mintingActivity, marketMetrics;

    // Include additional data based on options
    if (options?.includeHolderAnalysis) {
      holderMetrics = {
        uniqueHolders: 0, // Implement holder analysis
        distribution: {}
      };
    }

    if (options?.includeMarketData) {
      marketMetrics = {
        // Implement market data analysis
      };
    }

    return {
      usedLast30d,
      nftLimit: limits.nftLimit,
      remainingCertificates: limits.remainingCertificates,
      holderMetrics,
      mintingActivity,
      marketMetrics
    };
  }

  /**
   * Get transaction analytics
   */
  async getTransactionAnalytics(businessId: string): Promise<TransactionAnalytics> {
    // TODO: Implement proper transaction analytics
    return {
      summary: {
        totalVolume: 0,
        totalCount: 0,
        averageValue: 0
      },
      trends: {
        volumeGrowth: 0,
        countGrowth: 0
      },
      timeSeries: []
    };
  }

  /**
   * Get dashboard analytics with plan-based features
   */
  async getDashboardAnalytics(
    businessId: string, 
    options?: {
      plan: string;
      includePredictions?: boolean;
      includeComparisons?: boolean;
      includeAdvancedMetrics?: boolean;
    }
  ): Promise<DashboardAnalytics> {
    // Get basic analytics
    const [votingData, nftData] = await Promise.all([
      this.getVotingAnalytics(businessId),
      this.getNftAnalytics(businessId)
    ]);

    // Build dashboard summary
    const summary = {
      totalVotes: votingData.totalOnChainVotes,
      totalCertificates: nftData.usedLast30d,
      activeProposals: Object.keys(votingData.byProposal).length,
      recentActivity: votingData.usedLast30d + nftData.usedLast30d
    };

    let trends, predictions, comparisons, advancedMetrics;

    // Add plan-specific features
    if (options?.includeComparisons && ['growth', 'premium', 'enterprise'].includes(options.plan)) {
      trends = {
        votingTrend: 5.2, // Calculate actual trends
        certificateTrend: 3.1,
        engagementTrend: 7.8
      };
    }

    if (options?.includePredictions && ['premium', 'enterprise'].includes(options.plan)) {
      predictions = {
        nextMonthVotes: Math.round(votingData.usedLast30d * 1.1),
        nextMonthCertificates: Math.round(nftData.usedLast30d * 1.05)
      };
    }

    if (options?.includeAdvancedMetrics && options.plan === 'enterprise') {
      advancedMetrics = {
        userEngagement: 85.2,
        conversionRate: 12.3,
        retentionRate: 78.9
      };
    }

    return {
      summary,
      trends,
      predictions,
      comparisons,
      advancedMetrics
    };
  }

  /**
   * Export analytics in various formats
   */
  async exportAnalytics(
    businessId: string, 
    options: ExportOptions
  ): Promise<ExportData> {
    let data: any;
    let filename: string;

    // Get data based on type
    switch (options.type) {
      case 'votes':
        data = await this.getVotingAnalytics(businessId);
        filename = `voting-analytics-${businessId}-${options.timeframe}`;
        break;
      case 'certificates':
      case 'nfts':
        data = await this.getNftAnalytics(businessId);
        filename = `nft-analytics-${businessId}-${options.timeframe}`;
        break;
      case 'transactions':
        data = await this.getTransactionAnalytics(businessId);
        filename = `transaction-analytics-${businessId}-${options.timeframe}`;
        break;
      default:
        // Get combined analytics
        const [votes, certificates] = await Promise.all([
          this.getVotingAnalytics(businessId),
          this.getNftAnalytics(businessId)
        ]);
        data = { votes, certificates };
        filename = `combined-analytics-${businessId}-${options.timeframe}`;
    }

    // Format data based on export format
    switch (options.format) {
      case 'csv':
        return this.formatAsCSV(data, filename);
      case 'json':
        return this.formatAsJSON(data, filename);
      case 'pdf':
        return this.formatAsPDF(data, filename, options.includeCharts);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Generate custom reports
   */
  async generateCustomReport(
    businessId: string, 
    config: ReportConfig
  ): Promise<CustomReport> {
    const {
      reportType = 'comprehensive',
      timeframe = '30d',
      metrics = [],
      requestedBy,
      planLevel = 'foundation'
    } = config;

    // Generate unique report ID
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Collect data based on report type and plan level
    let reportData: any = {};
    let insights: any = {};
    let recommendations: any = {};

    try {
      // Get base analytics data
      const [votingData, nftData] = await Promise.all([
        this.getVotingAnalytics(businessId),
        this.getNftAnalytics(businessId)
      ]);

      reportData = {
        voting: votingData,
        nft: nftData
      };

      // Add transaction data for premium+ plans
      if (['premium', 'enterprise'].includes(planLevel)) {
        const transactionData = await this.getTransactionAnalytics(businessId);
        reportData.transactions = transactionData;
      }

      // Generate insights based on plan level
      if (['growth', 'premium', 'enterprise'].includes(planLevel)) {
        insights = this.generateReportInsights(reportData, planLevel);
      }

      // Generate recommendations for premium+ plans
      if (['premium', 'enterprise'].includes(planLevel)) {
        recommendations = this.generateReportRecommendations(reportData, planLevel);
      }

      // Add advanced metrics for enterprise plans
      if (planLevel === 'enterprise') {
        reportData.advanced = await this.getAdvancedMetrics(businessId);
      }

    } catch (error) {
      logger.error('Error generating custom report:', error);
      throw new Error('Failed to generate custom report');
    }

    return {
      reportId,
      id: reportId,
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics Report`,
      generatedAt: new Date(),
      requestedBy: requestedBy || 'system',
      planLevel,
      status: 'completed',
      data: reportData,
      metadata: {
        businessId,
        timeframe,
        metrics,
        dataPoints: this.calculateDataPoints(reportData)
      },
      insights,
      recommendations
    };
  }

  // Private helper methods

  /**
   * Get time series data for a specific proposal
   */
  private async getProposalTimeSeries(
    businessId: string, 
    proposalId: string, 
    groupBy: string = 'day'
  ): Promise<any[]> {
    try {
      const businessObjectId = new Types.ObjectId(businessId);
      const days = groupBy === 'hour' ? 1 : groupBy === 'week' ? 7 * 12 : 30; // Default 30 days
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const pipeline = [
        {
          $match: {
            business: businessObjectId,
            proposalId: proposalId,
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: groupBy === 'hour' 
                ? { $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" } }
                : groupBy === 'week'
                ? { $dateToString: { format: "%Y-W%U", date: "$timestamp" } }
                : { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
            },
            count: { $sum: 1 },
            uniqueVoters: { $addToSet: '$voterAddress' }
          }
        },
        {
          $addFields: {
            uniqueVoterCount: { $size: '$uniqueVoters' }
          }
        },
        {
          $project: {
            date: '$_id.date',
            selections: '$count',
            uniqueVoters: '$uniqueVoterCount',
            _id: 0
          }
        },
        { $sort: { date: 1 as 1 } }
      ];

      return await VotingRecord.aggregate(pipeline);
    } catch (error) {
      logger.error('Get proposal time series error:', error);
      return [];
    }
  }

  /**
   * Get voter insights for a specific proposal
   */
  private async getProposalVoterInsights(
    businessId: string, 
    proposalId: string
  ): Promise<any> {
    try {
      const businessObjectId = new Types.ObjectId(businessId);
      
      // Get voter participation patterns
      const voterStats = await VotingRecord.aggregate([
        {
          $match: {
            business: businessObjectId,
            proposalId: proposalId
          }
        },
        {
          $group: {
            _id: '$voterAddress',
            selectionCount: { $sum: 1 },
            products: { $addToSet: '$selectedProductId' },
            firstVote: { $min: '$timestamp' },
            lastVote: { $max: '$timestamp' },
            sources: { $addToSet: '$votingSource' },
            isVerified: { $first: '$isVerified' }
          }
        },
        {
          $group: {
            _id: null,
            totalVoters: { $sum: 1 },
            averageSelectionsPerVoter: { $avg: '$selectionCount' },
            verifiedVoters: { $sum: { $cond: ['$isVerified', 1, 0] } },
            sources: { $push: '$sources' }
          }
        }
      ]);

      // Get voting source breakdown
      const sourceBreakdown = await VotingRecord.aggregate([
        {
          $match: {
            business: businessObjectId,
            proposalId: proposalId
          }
        },
        {
          $group: {
            _id: '$votingSource',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 as -1 } }
      ]);

      const stats = voterStats[0] || {
        totalVoters: 0,
        averageSelectionsPerVoter: 0,
        verifiedVoters: 0
      };

      return {
        totalVoters: stats.totalVoters,
        averageSelectionsPerVoter: Number(stats.averageSelectionsPerVoter?.toFixed(2)) || 0,
        verifiedVoters: stats.verifiedVoters,
        verificationRate: stats.totalVoters > 0 
          ? `${((stats.verifiedVoters / stats.totalVoters) * 100).toFixed(1)}%`
          : '0%',
        sourceBreakdown: sourceBreakdown.reduce((acc: any, item: any) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        engagement: {
          level: stats.averageSelectionsPerVoter > 2 ? 'high' : 
                 stats.averageSelectionsPerVoter > 1 ? 'medium' : 'low'
        }
      };
    } catch (error) {
      logger.error('Get proposal voter insights error:', error);
      return {
        totalVoters: 0,
        averageSelectionsPerVoter: 0,
        verifiedVoters: 0,
        verificationRate: '0%',
        sourceBreakdown: {},
        engagement: { level: 'low' }
      };
    }
  }

  /**
   * Get voting time series data
   */
  private async getVotingTimeSeries(businessId: string, timeframe: string): Promise<Array<{ date: string; count: number }>> {
    const businessObjectId = new Types.ObjectId(businessId);
    const days = this.getTimeframeDays(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          business: businessObjectId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 as 1 } }
    ];

    return await VotingRecord.aggregate(pipeline);
  }

  /**
   * Get product time series data
   */
  private async getProductTimeSeries(
    businessId: string, 
    productId: string, 
    groupBy: string = 'day'
  ): Promise<any[]> {
    try {
      const businessObjectId = new Types.ObjectId(businessId);
      const days = groupBy === 'hour' ? 1 : groupBy === 'week' ? 7 * 12 : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const pipeline = [
        {
          $match: {
            business: businessObjectId,
            selectedProductId: productId,
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: groupBy === 'hour' 
                ? { $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" } }
                : groupBy === 'week'
                ? { $dateToString: { format: "%Y-W%U", date: "$timestamp" } }
                : { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            date: '$_id.date',
            selections: '$count',
            _id: 0
          }
        },
        { $sort: { date: 1 as 1 } }
      ];

      return await VotingRecord.aggregate(pipeline);
    } catch (error) {
      logger.error('Get product time series error:', error);
      return [];
    }
  }

  /**
   * Convert timeframe string to number of days
   */
  private getTimeframeDays(timeframe: string): number {
    switch (timeframe) {
      case '1d': return 1;
      case '7d': return 7;
      case '14d': return 14;
      case '30d': return 30;
      case '60d': return 60;
      case '90d': return 90;
      case '6m': return 180;
      case '1y': return 365;
      default: return 30; // Default to 30 days
    }
  }

  /**
   * Get metric data for a specific period
   */
  private async getMetricForPeriod(
    businessId: string, 
    metric: string, 
    period: { startDate: Date; endDate: Date }
  ): Promise<number> {
    const businessObjectId = new Types.ObjectId(businessId);
    
    switch (metric) {
      case 'total_votes':
        return await VotingRecord.countDocuments({
          business: businessObjectId,
          timestamp: { $gte: period.startDate, $lte: period.endDate }
        });
      
      case 'unique_voters':
        const voters = await VotingRecord.distinct('voterAddress', {
          business: businessObjectId,
          timestamp: { $gte: period.startDate, $lte: period.endDate }
        });
        return voters.length;
      
      case 'proposals':
        const proposals = await VotingRecord.distinct('proposalId', {
          business: businessObjectId,
          timestamp: { $gte: period.startDate, $lte: period.endDate }
        });
        return proposals.length;
      
      default:
        return 0;
    }
  }

  /**
   * Calculate percentage change between two values
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  

  /**
   * Calculate user retention metrics
   */
  private async calculateUserRetention(businessId: string, days: number): Promise<any> {
    const businessObjectId = new Types.ObjectId(businessId);
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const midDate = new Date(Date.now() - (days / 2) * 24 * 60 * 60 * 1000);

    try {
      // Get users who voted in first half of period
      const firstHalfVoters = await VotingRecord.distinct('voterAddress', {
        business: businessObjectId,
        timestamp: { $gte: startDate, $lt: midDate }
      });

      // Get users who voted in second half of period
      const secondHalfVoters = await VotingRecord.distinct('voterAddress', {
        business: businessObjectId,
        timestamp: { $gte: midDate, $lte: endDate }
      });

      // Calculate retention
      const retainedUsers = firstHalfVoters.filter(voter => 
        secondHalfVoters.includes(voter)
      );

      const retentionRate = firstHalfVoters.length > 0 
        ? (retainedUsers.length / firstHalfVoters.length) * 100 
        : 0;

      return {
        rate: retentionRate.toFixed(2) + '%',
        firstPeriodUsers: firstHalfVoters.length,
        secondPeriodUsers: secondHalfVoters.length,
        retainedUsers: retainedUsers.length
      };
    } catch (error) {
      logger.error('Calculate user retention error:', error);
      return {
        rate: '0%',
        firstPeriodUsers: 0,
        secondPeriodUsers: 0,
        retainedUsers: 0
      };
    }
  }

  // Helper methods for recommendations and calculations

  private generateProductionRecommendations(topProducts: any[]): string[] {
    const recommendations: string[] = [];
    
    if (topProducts.length === 0) {
      recommendations.push('No product data available for recommendations');
      return recommendations;
    }

    const topProduct = topProducts[0];
    if (topProduct.totalSelections > 100) {
      recommendations.push(`High demand for ${topProduct.productName || topProduct.productId} - consider prioritizing production`);
    }

    if (topProducts.length > 5) {
      const diversityScore = topProducts.slice(0, 5).reduce((sum, p) => sum + p.totalSelections, 0) / topProduct.totalSelections;
      if (diversityScore < 2) {
        recommendations.push('Consider diversifying product offerings based on selection patterns');
      }
    }

    return recommendations;
  }

  private calculateDemandMetrics(topProducts: any[]): any {
    if (topProducts.length === 0) return {};

    const totalSelections = topProducts.reduce((sum, p) => sum + p.totalSelections, 0);
    const averageSelections = totalSelections / topProducts.length;

    return {
      totalSelections,
      averageSelections,
      topProductDominance: topProducts[0] ? (topProducts[0].totalSelections / totalSelections) * 100 : 0,
      diversityIndex: this.calculateDiversityIndex(topProducts)
    };
  }

  private calculateDiversityIndex(products: any[]): number {
    if (products.length <= 1) return 0;
    
    const totalSelections = products.reduce((sum, p) => sum + p.totalSelections, 0);
    const proportions = products.map(p => p.totalSelections / totalSelections);
    
    // Shannon diversity index
    return -proportions.reduce((sum, p) => sum + (p * Math.log(p)), 0);
  }

  private calculateDemandLevel(totalSelections: number, allProducts: any[]): string {
    if (allProducts.length === 0) return 'unknown';
    
    const averageSelections = allProducts.reduce((sum, p) => sum + p.totalSelections, 0) / allProducts.length;
    
    if (totalSelections > averageSelections * 2) return 'high';
    if (totalSelections > averageSelections) return 'medium';
    return 'low';
  }

  private calculateSentimentScore(reasons: string[]): number {
    // Placeholder sentiment analysis - you could integrate with a real sentiment analysis service
    if (reasons.length === 0) return 0;
    
    const positiveWords = ['love', 'great', 'excellent', 'amazing', 'perfect', 'best'];
    const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'worst'];
    
    let score = 0;
    reasons.forEach(reason => {
      const lowerReason = reason.toLowerCase();
      positiveWords.forEach(word => {
        if (lowerReason.includes(word)) score += 1;
      });
      negativeWords.forEach(word => {
        if (lowerReason.includes(word)) score -= 1;
      });
    });
    
    return score / reasons.length;
  }

  private generateProductionAdvice(
    totalSelections: number, 
    productRank: number, 
    totalProducts: number
  ): string {
    if (totalSelections === 0) return 'No selection data available for production advice';
    
    if (productRank <= Math.ceil(totalProducts * 0.1)) {
      return 'High priority for production - top 10% product';
    } else if (productRank <= Math.ceil(totalProducts * 0.3)) {
      return 'Medium priority for production - top 30% product';
    } else {
      return 'Consider market research before production - lower demand indicated';
    }
  }

  private generateEngagementRecommendations(votingEngagement: any, retention: any): string[] {
    const recommendations: string[] = [];
    
    if (votingEngagement?.totalVotes === 0) {
      recommendations.push('No voting activity detected - consider launching engagement campaigns');
    }
    
    if (retention?.rate && parseFloat(retention.rate) < 50) {
      recommendations.push('Low user retention - focus on user experience improvements');
    }
    
    if (votingEngagement?.activeProposals === 0) {
      recommendations.push('No active proposals - create engaging product selection rounds');
    }
    
    return recommendations;
  }

  private generateComparisonInsights(comparison: any): string[] {
    const insights: string[] = [];
    
    const significantChanges = comparison.summary?.significantChanges || [];
    if (significantChanges.length > 0) {
      insights.push(`${significantChanges.length} metrics showed significant changes (>10%)`);
    }
    
    if (comparison.summary?.trend === 'growth') {
      insights.push('Overall positive trend detected across key metrics');
    } else if (comparison.summary?.trend === 'decline') {
      insights.push('Declining trend requires attention and intervention');
    }
    
    return insights;
  }

  private generateComparisonHighlights(comparison: any): string[] {
    const highlights: string[] = [];
    
    Object.entries(comparison.changes || {}).forEach(([metric, change]: [string, any]) => {
      if (Math.abs(change.percentage) > 20) {
        highlights.push(`${metric}: ${change.percentage > 0 ? '+' : ''}${change.percentage.toFixed(1)}% change`);
      }
    });
    
    return highlights;
  }

  private generateReportInsights(data: any, planLevel: string): any {
    const insights: any = {
      summary: {
        totalActivity: (data.voting?.usedLast30d || 0) + (data.nft?.usedLast30d || 0),
        growthIndicators: []
      }
    };

    // Add voting insights
    if (data.voting) {
      insights.voting = {
        participationTrend: data.voting.usedLast30d > 0 ? 'active' : 'low',
        proposalEngagement: Object.keys(data.voting.byProposal || {}).length,
        utilizationRate: data.voting.voteLimit > 0 
          ? (data.voting.usedLast30d / data.voting.voteLimit) * 100 
          : 0
      };
    }

    // Add NFT insights
    if (data.nft) {
      insights.nft = {
        mintingActivity: data.nft.usedLast30d,
        capacityUtilization: data.nft.nftLimit > 0
          ? (data.nft.usedLast30d / data.nft.nftLimit) * 100
          : 0
      };
    }

    return insights;
  }

  private generateReportRecommendations(data: any, planLevel: string): any {
    const recommendations: any[] = [];

    // Voting recommendations
    if (data.voting?.usedLast30d === 0) {
      recommendations.push({
        category: 'engagement',
        priority: 'high',
        title: 'Increase Voting Participation',
        description: 'No voting activity detected in the last 30 days. Consider creating engaging proposals or incentivizing participation.'
      });
    }

    // NFT recommendations
    if (data.nft?.usedLast30d < (data.nft?.nftLimit || 100) * 0.1) {
      recommendations.push({
        category: 'utilization',
        priority: 'medium',
        title: 'Optimize NFT Certificate Usage',
        description: 'Low certificate minting activity. Consider promoting your certification program.'
      });
    }

    // Plan upgrade recommendations
    if (planLevel === 'foundation') {
      recommendations.push({
        category: 'upgrade',
        priority: 'low',
        title: 'Unlock Advanced Analytics',
        description: 'Upgrade to Growth plan for detailed insights and trend analysis.'
      });
    }

    return recommendations;
  }

  private async getAdvancedMetrics(businessId: string): Promise<any> {
    // Placeholder for advanced enterprise metrics
    return {
      userEngagement: 85.2,
      conversionFunnel: {
        awareness: 100,
        consideration: 75,
        conversion: 12.3,
        retention: 78.9
      },
      predictiveAnalytics: {
        nextMonthProjection: 'growth',
        riskFactors: ['low_engagement', 'seasonal_variation']
      }
    };
  }

  private calculateDataPoints(data: any): number {
    let count = 0;
    
    if (data.voting?.byProposal) {
      count += Object.keys(data.voting.byProposal).length;
    }
    
    if (data.nft?.usedLast30d) {
      count += data.nft.usedLast30d;
    }
    
    if (Array.isArray(data.transactions)) {
      count += data.transactions.length;
    }
    
    return count;
  }

  // Export format methods

  private formatAsCSV(data: any, filename: string): ExportData {
    let csvContent = '';
    
    if (data.votes || data.totalOnChainVotes !== undefined) {
      // Handle voting data
      const votingData = data.votes || data;
      csvContent += 'Metric,Value\n';
      csvContent += `Total Votes,${votingData.totalOnChainVotes || 0}\n`;
      csvContent += `Used Last 30d,${votingData.usedLast30d || 0}\n`;
      csvContent += `Vote Limit,${votingData.voteLimit || 0}\n`;
      csvContent += `Remaining Votes,${votingData.remainingVotes || 0}\n`;
      
      // Add proposal breakdown
      if (votingData.byProposal) {
        csvContent += '\nProposal ID,Vote Count\n';
        Object.entries(votingData.byProposal).forEach(([proposalId, count]) => {
          csvContent += `${proposalId},${count}\n`;
        });
      }
    }

    return {
      data: csvContent,
      filename: `${filename}.csv`,
      contentType: 'text/csv'
    };
  }

  private formatAsJSON(data: any, filename: string): ExportData {
    return {
      data: JSON.stringify(data, null, 2),
      filename: `${filename}.json`,
      contentType: 'application/json'
    };
  }

  private formatAsPDF(data: any, filename: string, includeCharts?: boolean): ExportData {
    // For now, return a simple text representation
    // You could use a library like puppeteer or jsPDF for actual PDF generation
    const textContent = `Analytics Report\n\nGenerated: ${new Date().toISOString()}\n\nData:\n${JSON.stringify(data, null, 2)}`;
    
    return {
      data: textContent,
      filename: `${filename}.pdf`,
      contentType: 'application/pdf'
    };
  }

  /**
 * Update user voting analytics summary
 */
private async updateUserVotingAnalytics(userId: string, voteData: VoteData): Promise<void> {
  try {
    // This would update user analytics in your User model
    // Assuming you have user analytics tracking
    const user = await User.findById(userId);
    if (user) {
      // Update user analytics
      if (!user.analytics) {
        user.analytics = {
          totalVotes: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date()
        };
      }
      
      user.analytics.totalVotes = (user.analytics.totalVotes || 0) + 1;
      user.analytics.lastActiveAt = new Date();
      
      // Update brand-specific interaction
      if (!user.brandInteractions) {
        user.brandInteractions = [];
      }
      
      let brandInteraction = user.brandInteractions.find(
        bi => bi.businessId.toString() === voteData.businessId
      );
      
      if (brandInteraction) {
        brandInteraction.totalVotes += 1;
        brandInteraction.lastInteraction = new Date();
      } else {
        user.brandInteractions.push({
          businessId: new Types.ObjectId(voteData.businessId),
          firstInteraction: new Date(),
          lastInteraction: new Date(),
          totalVotes: 1,
          totalPageViews: 0,
          favoriteProducts: []
        });
      }
      
      await user.save();
    }
  } catch (error) {
    logger.error('Failed to update user voting analytics:', error);
  }
}

/**
 * Track page views for user engagement analytics
 */
private async trackPageView(eventData: any): Promise<void> {
  try {
    // Update page view analytics
    logger.info('[Analytics] Page view tracked:', {
      userId: eventData.userId,
      businessId: eventData.businessId,
      page: eventData.page,
      timestamp: new Date(),
      userAgent: eventData.userAgent,
      referrer: eventData.referrer
    });

    // Update user session data if available
    if (eventData.userId) {
      const user = await User.findById(eventData.userId);
      if (user) {
        if (!user.analytics) user.analytics = { totalSessions: 0, totalVotes: 0, lastActiveAt: new Date(), averageSessionDuration: 0 };
        user.analytics.lastActiveAt = new Date();
        
        // Update brand interaction
        if (eventData.businessId && user.brandInteractions) {
          let brandInteraction = user.brandInteractions.find(
            bi => bi.businessId.toString() === eventData.businessId
          );
          
          if (brandInteraction) {
            brandInteraction.totalPageViews += 1;
            brandInteraction.lastInteraction = new Date();
          } else if (user.brandInteractions) {
            user.brandInteractions.push({
              businessId: new Types.ObjectId(eventData.businessId),
              firstInteraction: new Date(),
              lastInteraction: new Date(),
              totalVotes: 0,
              totalPageViews: 1,
              favoriteProducts: []
            });
          }
        }
        
        await user.save();
      }
    }
  } catch (error) {
    logger.error('Failed to track page view:', error);
  }
}

/**
 * Track user registration events
 */
private async trackUserRegistration(eventData: any): Promise<void> {
  try {
    logger.info('[Analytics] User registration tracked:', {
      userId: eventData.userId,
      email: eventData.email,
      registrationSource: eventData.source,
      timestamp: new Date(),
    });

    // Update business registration analytics
    if (eventData.businessId) {
      // Could update BrandSettings with registration metrics
      const settings = await BrandSettings.findOne({ business: eventData.businessId });
      if (settings) {
        // Add registration tracking logic here
        logger.info('New user registered for business: ${eventData.businessId}');
      }
    }
  } catch (error) {
    logger.error('Failed to track user registration:', error);
  }
}

/**
 * Track subscription changes
 */
private async trackSubscriptionChange(eventData: any): Promise<void> {
  try {
    logger.info('[Analytics] Subscription change tracked:', {
      businessId: eventData.businessId,
      fromPlan: eventData.fromPlan,
      toPlan: eventData.toPlan,
      changeType: eventData.changeType,
      timestamp: new Date(),
    });
    
    // This data could be valuable for business intelligence
  } catch (error) {
    logger.error('Failed to track subscription change:', error);
  }
}

/**
 * Track product views for product analytics
 */
private async trackProductView(eventData: any): Promise<void> {
  try {
    logger.info('[Analytics] Product view tracked:', {
      userId: eventData.userId,
      businessId: eventData.businessId,
      productId: eventData.productId,
      viewDuration: eventData.viewDuration,
      timestamp: new Date(),
    });
    
    // Update product view counts or user preferences
  } catch (error) {
    logger.error('Failed to track product view:', error);
  }
}

/**
 * Track NFT minting events
 */
private async trackNftMint(eventData: any): Promise<void> {
  try {
    logger.info('[Analytics] NFT mint tracked:', {
      userId: eventData.userId,
      businessId: eventData.businessId,
      certificateId: eventData.certificateId,
      productId: eventData.productId,
      mintCost: eventData.mintCost,
      timestamp: new Date(),
    });
    
    // This data is likely already in your NftCertificate model
    // But you might want additional analytics aggregation here
  } catch (error) {
    logger.error('Failed to track NFT mint:', error);
  }
}

/**
 * Update business-level analytics aggregates
 */
private async updateBusinessAnalytics(businessId: string, eventType: string, eventData: any): Promise<void> {
  try {
    // Update business analytics summary
    // This could be stored in BrandSettings or a separate BusinessAnalytics model
    const settings = await BrandSettings.findOne({ business: businessId });
    if (settings) {
      // Initialize analytics if not exists
      if (!(settings as SettingsWithAnalytics).analyticsData) {
        (settings as SettingsWithAnalytics).analyticsData = {
          totalEvents: 0,
          eventBreakdown: {},
          lastUpdated: new Date()
        };
      }
      
      const analytics = (settings as SettingsWithAnalytics).analyticsData as AnalyticsData;
      analytics.totalEvents += 1;
      analytics.eventBreakdown[eventType] = (analytics.eventBreakdown[eventType] || 0) + 1;
      analytics.lastUpdated = new Date();
      
      await settings.save();
    }
  } catch (error) {
    logger.error('Failed to update business analytics:', error);
  }
}

/**
 * Get analytics summary for a user
 */
async getUserAnalyticsSummary(userId: string): Promise<any> {
  try {
    // Get vote analytics
    const voteCount = await VotingRecord.countDocuments({ voterAddress: userId });
    
    // Get recent activity
    const recentVotes = await VotingRecord.find({ voterAddress: userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('proposalId selectedProductId timestamp businessId');

    // Get user from User model for additional analytics
    const user = await User.findById(userId);
    
    return {
      userId,
      summary: {
        totalVotes: voteCount,
        totalSessions: user?.analytics?.totalSessions || 0,
        lastActive: user?.analytics?.lastActiveAt,
        engagementScore: this.calculateEngagementScore(voteCount, user?.analytics)
      },
      recentActivity: recentVotes,
      brandInteractions: user?.brandInteractions || []
    };
  } catch (error) {
    logger.error('Failed to get user analytics summary:', error);
    return {
      userId,
      summary: { totalVotes: 0, totalSessions: 0, engagementScore: 0 },
      recentActivity: [],
      brandInteractions: []
    };
  }
}

/**
 * Calculate user engagement score
 */
private calculateEngagementScore(voteCount: number, analytics: any): number {
  let score = 0;
  
  // Base score from votes
  score += Math.min(voteCount * 10, 500); // Max 500 points from votes
  
  // Session activity
  if (analytics?.totalSessions) {
    score += Math.min(analytics.totalSessions * 5, 250); // Max 250 points from sessions
  }
  
  // Recent activity bonus
  if (analytics?.lastActiveAt) {
    const daysSinceActive = (Date.now() - analytics.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive <= 7) {
      score += 100; // Recent activity bonus
    } else if (daysSinceActive <= 30) {
      score += 50; // Moderate activity bonus
    }
  }
  
  return Math.min(score, 1000); // Cap at 1000
}

/**
 * Generate high-level business recommendations from analytics data
 */
public generateBusinessRecommendations(data: any): string[] {
  const recommendations: string[] = [];

  if (data?.trends?.volumeGrowth < 0) {
    recommendations.push('Consider implementing customer retention strategies');
  }

  if (data?.summary?.averageValue < 100) {
    recommendations.push('Explore opportunities to increase average transaction value');
  }

  if (data?.engagement?.rate < 0.3) {
    recommendations.push('Focus on improving customer engagement and interaction');
  }

  return recommendations;
}

/**
 * Return available metrics for a given subscription plan
 */
public getPlanMetrics(plan: string): string[] {
  const baseMetrics = ['basic_stats', 'time_series', 'totals'];

  switch (plan) {
    case 'growth':
      return [...baseMetrics, 'trends', 'comparisons'];
    case 'premium':
      return [...baseMetrics, 'trends', 'comparisons', 'predictions', 'exports'];
    case 'enterprise':
      return [...baseMetrics, 'trends', 'comparisons', 'predictions', 'exports', 'custom_reports', 'real_time'];
    default:
      return baseMetrics;
  }
}

/**
 * Recommend an upgrade path based on current analytics snapshot
 */
public generateUpgradeRecommendations(data: any): any {
  return {
    suggestedPlan: 'growth',
    reasons: [
      'Access to trend analysis and growth predictions',
      'Enhanced reporting capabilities',
      'Comparative analytics with industry benchmarks'
    ],
    potentialValue: 'Unlock insights that could improve performance by 15-25%'
  };
}

/**
 * Map export format to appropriate Content-Type
 */
public getContentType(format: string): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'pdf': return 'application/pdf';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}
}
