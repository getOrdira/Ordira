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

    if (settings?.voteContract) {
      const events = await BlockchainContractsService.getVoteEventsFromContract(settings.voteContract);
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
      timeSeries: Array<{
        date: string;
        count: number;
    // other time series properties
  }> 
    };
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