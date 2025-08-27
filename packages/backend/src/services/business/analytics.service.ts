import { VotingRecord } from '../../models/votingRecord.model';
import { NftCertificate } from '../../models/nftCertificate.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { SubscriptionService } from './subscription.service';
import { BlockchainContractsService } from '../blockchain/contracts.service';

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

type NftAnalytics = {
  usedLast30d: number;
  nftLimit: number;
  remainingCertificates: number | 'unlimited';
};
type NftAnalyticsOptions = {
  timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  includeMarketData?: boolean;
  includeHolderAnalysis?: boolean;
};

type DashboardAnalyticsOptions = {
  plan: string;
  includePredictions?: boolean;
  includeComparisons?: boolean;
  includeAdvancedMetrics?: boolean;
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

type Analytics = {
  votes: VoteAnalytics;
  certificates: NftAnalytics;
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
  transactions?: any[]; // Keep the array data if needed
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
  status: 'generating' | 'completed' | 'failed';  // Add status
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

  async getVotingAnalytics(businessId: string): Promise<VoteAnalytics> {
    // Get on-chain data
    const settings = await BrandSettings.findOne({ business: businessId });
    let totalOnChainVotes = 0;
    let byProposal: Record<string, number> = {};

    if (settings.web3Settings?.voteContract) {
      const events = await BlockchainContractsService.getVoteEventsFromContract(settings.web3Settings?.voteContract);
      totalOnChainVotes = events.length;
      
      for (const event of events) {
        const evt = event as any;
        const pid = evt.args.proposalId.toString();
        byProposal[pid] = (byProposal[pid] || 0) + 1;
      }
    }

    // Get 30-day usage and limits
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usedLast30d = await VotingRecord.countDocuments({
      business: businessId,
      timestamp: { $gte: windowStart }
    });

    const limits = await this.subscriptionService.getVotingLimits(businessId);

    return {
    totalOnChainVotes,
    byProposal,
    usedLast30d,
    voteLimit: limits.voteLimit,
    remainingVotes: limits.remainingVotes,
    timeSeries: [] as Array<{
    date: string;
    count: number;
    // other time series properties
  }>
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
      business: businessId,
      proposalId: proposalId
    });

    const uniqueVoters = await VotingRecord.distinct('voterAddress', {
      business: businessId,
      proposalId: proposalId
    }).countDocuments();

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
        .sort(([,a], [,b]) => (b as any).selectionCount - (a as any).selectionCount)
        .slice(0, 5) : []
    };
  } catch (error) {
    console.error('Get proposal analytics error:', error);
    throw new Error(`Failed to get proposal analytics: ${error.message}`);
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
    const totalProducts = await VotingRecord.distinct('selectedProductId', {
      business: businessId
    }).countDocuments();

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
    console.error('Get product analytics error:', error);
    throw new Error(`Failed to get product analytics: ${error.message}`);
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
    const { 
      timeframe = '30d',
      groupBy = 'day',
      includeCompetitorComparison = true,
      includeSelectionReasons = true 
    } = options || {};

    // Get product selection data
    const productSelections = await VotingRecord.find({
      business: businessId,
      selectedProductId: productId
    }).sort({ timestamp: -1 });

    const totalSelections = productSelections.length;
    const uniqueVoters = new Set(productSelections.map(s => s.voterAddress)).size;

    // Get product ranking
    const allProducts = await VotingRecord.getTopProducts(businessId, 100);
    const productRank = allProducts.findIndex(p => p.productId === productId) + 1;

    // Get time series for this product
    const timeSeries = await this.getProductTimeSeries(businessId, productId, groupBy);

    // Get selection reasons if available
    let selectionReasons = [];
    if (includeSelectionReasons) {
      selectionReasons = productSelections
        .filter(s => s.selectionReason)
        .map(s => s.selectionReason)
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
    console.error('Get product analytics by ID error:', error);
    throw new Error(`Failed to get product analytics: ${error.message}`);
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
        business: businessId,
        timestamp: { $gte: startDate }
      });

      const uniqueVoters = await VotingRecord.distinct('voterAddress', {
        business: businessId,
        timestamp: { $gte: startDate }
      }).countDocuments();

      const activeProposals = await VotingRecord.distinct('proposalId', {
        business: businessId,
        timestamp: { $gte: startDate }
      }).countDocuments();

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
        overallEngagement: votingEngagement.participationRate || '0%',
        activeUsers: votingEngagement.uniqueVoters || 0,
        totalInteractions: votingEngagement.totalVotes || 0
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
    console.error('Get engagement analytics error:', error);
    throw new Error(`Failed to get engagement analytics: ${error.message}`);
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
    console.error('Get comparative analytics error:', error);
    throw new Error(`Failed to get comparative analytics: ${error.message}`);
  }
}


 async getNftAnalytics(
  businessId: string, 
  options?: NftAnalyticsOptions
): Promise<NftAnalytics & {
  holderMetrics?: any;
  mintingActivity?: any;
  marketMetrics?: any;
}> {
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const usedLast30d = await NftCertificate.countDocuments({
    business: businessId,
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

  async getTransactionAnalytics(businessId: string, options?: AnalyticsOptions): Promise<TransactionAnalytics> {
  // TODO: Implement proper analytics
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
    timeSeries: [],
    transactions: []
  };
}

  /**
   * Combined analytics for both votes and NFT certificates.
   */
  async getAnalytics(businessId: string): Promise<Analytics> {
    const [votes, certificates] = await Promise.all([
      this.getVotingAnalytics(businessId),
      this.getNftAnalytics(businessId)
    ]);
    return { votes, certificates };
  }

  async getDashboardAnalytics(
    businessId: string, 
    options?: DashboardAnalyticsOptions
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
        // Get all analytics
        data = await this.getAnalytics(businessId);
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

  private formatAsCSV(data: any, filename: string): ExportData {
    // Convert data to CSV format
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
      console.error('Error generating custom report:', error);
      throw new Error('Failed to generate custom report');
    }

    return {
      reportId,
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics Report`,
      generatedAt: new Date(),
      requestedBy: requestedBy || 'system',
      planLevel,
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
    const recommendations: any = [];

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

}