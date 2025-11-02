/**
 * Certificate Helpers Service
 *
 * Utility functions for certificate operations including:
 * - Recipient validation (email, sms, wallet)
 * - Product ownership validation
 * - Transfer usage tracking
 * - Plan limits and quotas
 * - Ownership status checks
 * - Transfer health monitoring
 * - Gas cost estimation
 * - Certificate workflow helpers
 */

import { Business } from '../../../models/deprecated/business.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { logger } from '../../../utils/logger';

/**
 * Validate recipient format based on contact method
 */
export function validateRecipient(
  recipient: string,
  contactMethod: string
): { valid: boolean; error?: string } {
  switch (contactMethod) {
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        valid: emailRegex.test(recipient),
        error: !emailRegex.test(recipient) ? 'Invalid email format' : undefined
      };
    }
    case 'sms': {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return {
        valid: phoneRegex.test(recipient),
        error: !phoneRegex.test(recipient) ? 'Invalid phone number format' : undefined
      };
    }
    case 'wallet': {
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      return {
        valid: walletRegex.test(recipient),
        error: !walletRegex.test(recipient) ? 'Invalid wallet address format' : undefined
      };
    }
    default:
      return { valid: false, error: 'Invalid contact method' };
  }
}

/**
 * Validate product ownership by business
 */
export async function validateProductOwnership(
  businessId: string,
  productId: string
): Promise<boolean> {
  try {
    // Check if business exists and is active
    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      return false;
    }

    // TODO: Add actual product validation logic
    // This would check if the product belongs to the business
    // For now, return true as a placeholder
    return true;
  } catch (error) {
    logger.error('Product ownership validation error:', error);
    return false;
  }
}

/**
 * Get certificate ownership status
 */
export function getOwnershipStatus(certificate: any): string {
  if (certificate.revoked) return 'revoked';
  if (
    certificate.transferFailed &&
    certificate.transferAttempts >= certificate.maxTransferAttempts
  ) {
    return 'failed';
  }
  if (certificate.transferredToBrand) return 'brand';
  return 'relayer';
}

/**
 * Calculate transfer health score and identify issues
 */
export function getTransferHealth(certificate: any): {
  status: string;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  if (certificate.transferFailed) {
    issues.push('Transfer failed');
    score -= 50;
  }
  if (certificate.transferAttempts > 1) {
    issues.push('Multiple transfer attempts');
    score -= 20;
  }
  if (
    certificate.status === 'pending_transfer' &&
    certificate.nextTransferAttempt &&
    new Date(certificate.nextTransferAttempt) < new Date()
  ) {
    issues.push('Transfer overdue');
    score -= 30;
  }

  return {
    status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
    score: Math.max(0, score),
    issues
  };
}

/**
 * Get certificate next steps based on configuration
 */
export function getCertificateNextSteps(
  hasWeb3: boolean,
  shouldAutoTransfer: boolean,
  transferScheduled: boolean
): string[] {
  const baseSteps = ['Certificate minted successfully on blockchain'];

  if (hasWeb3) {
    if (shouldAutoTransfer && transferScheduled) {
      baseSteps.push(
        'Auto-transfer to your wallet is scheduled',
        'You will be notified when transfer completes',
        'Certificate will appear in your Web3 wallet'
      );
    } else if (shouldAutoTransfer && !transferScheduled) {
      baseSteps.push(
        'Auto-transfer is enabled but transfer was not scheduled',
        'Check your wallet configuration',
        'Manual transfer may be required'
      );
    } else {
      baseSteps.push(
        'Certificate is stored in secure relayer wallet',
        'Enable auto-transfer in settings for automatic delivery',
        'Manual transfer available anytime'
      );
    }
  } else {
    baseSteps.push(
      'Certificate is securely stored in our system',
      'Upgrade to Premium for Web3 wallet integration',
      'Direct wallet ownership available with upgrade'
    );
  }

  return baseSteps;
}

/**
 * Get transfer usage for a business
 */
export async function getTransferUsage(
  businessId: string
): Promise<{ thisMonth: number; total: number }> {
  const brandSettings = await BrandSettings.findOne({ business: businessId });
  const analytics = (brandSettings as any)?.transferAnalytics;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyStats = analytics?.monthlyStats?.find(
    (stat: any) => stat.month === currentMonth
  );

  return {
    thisMonth: monthlyStats?.transfers || 0,
    total: analytics?.totalTransfers || 0
  };
}

/**
 * Get transfer limits for a plan
 */
export function getTransferLimits(plan: string): {
  transfersPerMonth: number;
  gasCreditsWei: string;
} {
  const limits: Record<
    string,
    { transfersPerMonth: number; gasCreditsWei: string }
  > = {
    growth: { transfersPerMonth: 500, gasCreditsWei: '50000000000000000' },
    premium: { transfersPerMonth: 1000, gasCreditsWei: '100000000000000000' },
    enterprise: {
      transfersPerMonth: Number.POSITIVE_INFINITY,
      gasCreditsWei: '1000000000000000000'
    }
  };

  return limits[plan] || { transfersPerMonth: 0, gasCreditsWei: '0' };
}

/**
 * Get plan limits for certificates
 */
export function getPlanLimits(plan: string): {
  certificates: number;
  allowOverage: boolean;
  billPerCertificate: boolean;
  overageCost: number;
  hasWeb3: boolean;
} {
  const planKey = plan as any;
  const PLAN_DEFINITIONS: any = {
    foundation: {
      certificates: 10,
      features: { allowOverage: false, hasWeb3: false }
    },
    growth: {
      certificates: 100,
      features: { allowOverage: true, hasWeb3: true }
    },
    premium: {
      certificates: 1000,
      features: { allowOverage: true, hasWeb3: true }
    },
    enterprise: {
      certificates: Infinity,
      features: { allowOverage: true, hasWeb3: true }
    }
  };

  const planDef = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.foundation;

  return {
    certificates: planDef.certificates,
    allowOverage: planDef.features.allowOverage,
    billPerCertificate: false, // Not implemented yet
    overageCost: planDef.features.allowOverage ? 0.1 : 0,
    hasWeb3: planDef.features.hasWeb3
  };
}

/**
 * Calculate estimated gas cost for batch operations
 */
export function calculateEstimatedGasCost(recipientCount: number): string {
  // Estimate: ~0.005 ETH per mint + transfer
  const estimatedCostWei = BigInt(recipientCount) * BigInt('5000000000000000'); // 0.005 ETH in wei
  return estimatedCostWei.toString();
}

/**
 * Calculate monthly growth percentage from stats
 */
export function calculateMonthlyGrowth(monthlyStats: any[]): number {
  if (!monthlyStats || monthlyStats.length < 2) return 0;

  const sorted = monthlyStats.sort((a, b) => a.month.localeCompare(b.month));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  if (!previous.transfers) return 100;

  return ((latest.transfers - previous.transfers) / previous.transfers) * 100;
}

/**
 * Generate Web3 insights based on analytics
 */
export function generateWeb3Insights(
  certificateAnalytics: any,
  transferAnalytics: any
): string[] {
  const insights: string[] = [];

  if (transferAnalytics?.successRate > 95) {
    insights.push('Excellent transfer success rate - automation is working well');
  }

  if (certificateAnalytics?.relayerHeld === 0) {
    insights.push('All certificates successfully transferred to your wallet');
  }

  if (transferAnalytics?.averageTransferTime < 300000) {
    // 5 minutes
    insights.push('Fast transfer times - optimal gas settings detected');
  }

  const monthlyGrowth = calculateMonthlyGrowth(transferAnalytics?.monthlyStats);
  if (monthlyGrowth > 20) {
    insights.push('Transfer volume growing rapidly - consider upgrading gas limits');
  }

  return insights;
}

/**
 * Generate Web3 recommendations based on analytics
 */
export function generateWeb3Recommendations(
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
    ? Number(
        BigInt(transferAnalytics.totalGasUsed) /
          BigInt(Math.max(1, transferAnalytics.totalTransfers))
      )
    : 0;

  if (avgGasUsed > 100000) {
    // If using more than 100k gas per transfer
    recommendations.push('Enable gas optimization to reduce transfer costs');
  }

  return recommendations;
}

export class CertificateHelpersService {
  validateRecipient = validateRecipient;
  validateProductOwnership = validateProductOwnership;
  getOwnershipStatus = getOwnershipStatus;
  getTransferHealth = getTransferHealth;
  getCertificateNextSteps = getCertificateNextSteps;
  getTransferUsage = getTransferUsage;
  getTransferLimits = getTransferLimits;
  getPlanLimits = getPlanLimits;
  calculateEstimatedGasCost = calculateEstimatedGasCost;
  calculateMonthlyGrowth = calculateMonthlyGrowth;
  generateWeb3Insights = generateWeb3Insights;
  generateWeb3Recommendations = generateWeb3Recommendations;
}

export const certificateHelpersService = new CertificateHelpersService();

