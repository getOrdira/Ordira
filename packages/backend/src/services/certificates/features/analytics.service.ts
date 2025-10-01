/**
 * Certificate Analytics Service
 */

import { logger } from '../../../utils/logger';

export interface Web3Insights {
  insights: string[];
  recommendations: string[];
  metrics: {
    transferSuccessRate: number;
    averageTransferTime: number;
    monthlyGrowth: number;
  };
}

export interface MonthlyStats {
  month: string;
  transfers: number;
  certificates: number;
  successRate: number;
}

export class CertificateAnalyticsService {
  /**
   * Generate Web3 insights based on analytics
   */
  generateWeb3Insights(certificateAnalytics: any, transferAnalytics: any): string[] {
    const insights: string[] = [];

    if (transferAnalytics?.successRate > 95) {
      insights.push('Excellent transfer success rate - automation is working well');
    }

    if (certificateAnalytics?.relayerHeld === 0) {
      insights.push('All certificates successfully transferred to your wallet');
    }

    if (transferAnalytics?.averageTransferTime < 300000) { // 5 minutes
      insights.push('Fast transfer times - optimal gas settings detected');
    }

    const monthlyGrowth = this.calculateMonthlyGrowth(transferAnalytics?.monthlyStats);
    if (monthlyGrowth > 20) {
      insights.push('Transfer volume growing rapidly - consider upgrading gas limits');
    }

    return insights;
  }

  /**
   * Generate Web3 recommendations based on analytics
   */
  generateWeb3Recommendations(
    certificateAnalytics: any,
    transferAnalytics: any,
    plan: string
  ): string[] {
    const recommendations: string[] = [];

    if (transferAnalytics?.failedTransfers > 0) {
      recommendations.push('Review failed transfers and retry if needed');
    }

    if (transferAnalytics?.successRate < 90) {
      recommendations.push('Check wallet configuration and gas settings');
    }

    if (plan === 'premium' && transferAnalytics?.totalTransfers > 800) {
      recommendations.push('Consider upgrading to Enterprise for unlimited transfers');
    }

    const avgGasUsed = transferAnalytics?.totalGasUsed
      ? Number(BigInt(transferAnalytics.totalGasUsed) / BigInt(Math.max(1, transferAnalytics.totalTransfers)))
      : 0;

    if (avgGasUsed > 100000) { // If using more than 100k gas per transfer
      recommendations.push('Enable gas optimization to reduce transfer costs');
    }

    return recommendations;
  }

  /**
   * Get comprehensive Web3 insights
   */
  getComprehensiveWeb3Insights(
    certificateAnalytics: any,
    transferAnalytics: any,
    plan: string
  ): Web3Insights {
    const insights = this.generateWeb3Insights(certificateAnalytics, transferAnalytics);
    const recommendations = this.generateWeb3Recommendations(
      certificateAnalytics,
      transferAnalytics,
      plan
    );

    return {
      insights,
      recommendations,
      metrics: {
        transferSuccessRate: transferAnalytics?.successRate || 0,
        averageTransferTime: transferAnalytics?.averageTransferTime || 0,
        monthlyGrowth: this.calculateMonthlyGrowth(transferAnalytics?.monthlyStats)
      }
    };
  }

  /**
   * Calculate monthly growth percentage
   */
  calculateMonthlyGrowth(monthlyStats: any[]): number {
    if (!monthlyStats || monthlyStats.length < 2) return 0;

    const sorted = monthlyStats.sort((a, b) => a.month.localeCompare(b.month));
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    if (!previous.transfers) return 100;

    return ((latest.transfers - previous.transfers) / previous.transfers) * 100;
  }

  /**
   * Analyze certificate performance
   */
  analyzeCertificatePerformance(certificates: any[]): {
    totalCertificates: number;
    successfulTransfers: number;
    failedTransfers: number;
    averageProcessingTime: number;
    peakHours: number[];
  } {
    const totalCertificates = certificates.length;
    const successfulTransfers = certificates.filter(c => c.transferredToBrand).length;
    const failedTransfers = certificates.filter(c => c.transferFailed).length;

    // Calculate average processing time
    const processingTimes = certificates
      .filter(c => c.transferredAt && c.createdAt)
      .map(c => new Date(c.transferredAt).getTime() - new Date(c.createdAt).getTime());

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Find peak hours
    const hourCounts = new Array(24).fill(0);
    certificates.forEach(cert => {
      const hour = new Date(cert.createdAt).getHours();
      hourCounts[hour]++;
    });

    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    return {
      totalCertificates,
      successfulTransfers,
      failedTransfers,
      averageProcessingTime,
      peakHours
    };
  }

  /**
   * Generate trend analysis
   */
  generateTrendAnalysis(monthlyStats: MonthlyStats[]): {
    trend: 'growing' | 'stable' | 'declining';
    growthRate: number;
    prediction: string;
  } {
    if (monthlyStats.length < 2) {
      return {
        trend: 'stable',
        growthRate: 0,
        prediction: 'Insufficient data for trend analysis'
      };
    }

    const growthRate = this.calculateMonthlyGrowth(monthlyStats);

    let trend: 'growing' | 'stable' | 'declining';
    let prediction: string;

    if (growthRate > 10) {
      trend = 'growing';
      prediction = `Expected ${Math.round(growthRate)}% increase next month`;
    } else if (growthRate < -10) {
      trend = 'declining';
      prediction = `Expected ${Math.abs(Math.round(growthRate))}% decrease next month`;
    } else {
      trend = 'stable';
      prediction = 'Usage expected to remain stable';
    }

    return {
      trend,
      growthRate,
      prediction
    };
  }

  /**
   * Calculate cost efficiency metrics
   */
  calculateCostEfficiency(
    totalGasUsed: string,
    totalCertificates: number,
    gasPriceGwei: number = 20
  ): {
    averageGasPerCertificate: number;
    estimatedCostPerCertificate: number;
    totalEstimatedCost: number;
  } {
    if (totalCertificates === 0) {
      return {
        averageGasPerCertificate: 0,
        estimatedCostPerCertificate: 0,
        totalEstimatedCost: 0
      };
    }

    const gasUsed = BigInt(totalGasUsed);
    const averageGasPerCertificate = Number(gasUsed / BigInt(totalCertificates));

    // Calculate cost in ETH (gas * gwei * 10^-9)
    const estimatedCostPerCertificate = (averageGasPerCertificate * gasPriceGwei) / 1e9;
    const totalEstimatedCost = (Number(gasUsed) * gasPriceGwei) / 1e9;

    return {
      averageGasPerCertificate,
      estimatedCostPerCertificate,
      totalEstimatedCost
    };
  }

  /**
   * Generate health score
   */
  generateHealthScore(analytics: {
    successRate: number;
    averageProcessingTime: number;
    failedTransfers: number;
    totalCertificates: number;
  }): {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    factors: Array<{ name: string; impact: string; score: number }>;
  } {
    let score = 100;
    const factors: Array<{ name: string; impact: string; score: number }> = [];

    // Success rate factor (40% weight)
    const successRateScore = analytics.successRate;
    if (successRateScore < 95) {
      score -= (95 - successRateScore) * 0.4;
      factors.push({
        name: 'Success Rate',
        impact: successRateScore < 90 ? 'negative' : 'neutral',
        score: successRateScore
      });
    }

    // Processing time factor (30% weight)
    const processingTimeScore = analytics.averageProcessingTime < 300000 ? 100 : 80;
    if (processingTimeScore < 100) {
      score -= (100 - processingTimeScore) * 0.3;
      factors.push({
        name: 'Processing Time',
        impact: 'negative',
        score: processingTimeScore
      });
    }

    // Failure rate factor (30% weight)
    const failureRate = analytics.totalCertificates > 0
      ? (analytics.failedTransfers / analytics.totalCertificates) * 100
      : 0;
    if (failureRate > 5) {
      score -= failureRate * 0.3;
      factors.push({
        name: 'Failure Rate',
        impact: 'negative',
        score: 100 - failureRate
      });
    }

    const finalScore = Math.max(0, Math.round(score));
    let status: 'excellent' | 'good' | 'fair' | 'poor';

    if (finalScore >= 90) status = 'excellent';
    else if (finalScore >= 75) status = 'good';
    else if (finalScore >= 60) status = 'fair';
    else status = 'poor';

    return {
      score: finalScore,
      status,
      factors
    };
  }

  /**
   * Get certificate distribution insights
   */
  getCertificateDistributionInsights(distribution: {
    inRelayerWallet: number;
    inBrandWallet: number;
    transferFailed: number;
  }): string[] {
    const insights: string[] = [];
    const total = distribution.inRelayerWallet + distribution.inBrandWallet + distribution.transferFailed;

    if (total === 0) {
      return ['No certificates issued yet'];
    }

    const brandPercentage = Math.round((distribution.inBrandWallet / total) * 100);
    const failedPercentage = Math.round((distribution.transferFailed / total) * 100);

    if (brandPercentage === 100) {
      insights.push('Perfect! All certificates are in your brand wallet');
    } else if (brandPercentage > 80) {
      insights.push('Most certificates successfully transferred to brand wallet');
    } else if (brandPercentage < 50) {
      insights.push('Many certificates still in relayer wallet - consider enabling auto-transfer');
    }

    if (failedPercentage > 10) {
      insights.push('High failure rate detected - review wallet configuration');
    } else if (failedPercentage > 0) {
      insights.push('Some transfers failed - retry recommended');
    }

    if (distribution.inRelayerWallet > 10) {
      insights.push(`${distribution.inRelayerWallet} certificates awaiting transfer`);
    }

    return insights;
  }
}

export const certificateAnalyticsService = new CertificateAnalyticsService();
