/**
 * Plan Validation Service
 *
 * Handles plan-related validation for certificate operations including:
 * - Certificate quota validation
 * - Transfer limit validation
 * - Batch size validation
 * - Feature availability validation
 * - Usage limit checking
 */

import { Certificate } from '../../../models/deprecated/certificate.model';
import { BrandSettings } from '../../../models/deprecated/brandSettings.model';

export interface PlanLimits {
  certificates: number;
  allowOverage: boolean;
  billPerCertificate: boolean;
  overageCost: number;
  hasWeb3: boolean;
}

export interface TransferLimits {
  transfersPerMonth: number;
  gasCreditsWei: string;
}

export interface BatchLimits {
  maxBatchSize: number;
  maxConcurrent: number;
}

/**
 * Plan definitions with limits
 */
const PLAN_DEFINITIONS: Record<string, any> = {
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

/**
 * Get plan limits for certificates
 */
export function getPlanLimits(plan: string): PlanLimits {
  const planDef = PLAN_DEFINITIONS[plan] || PLAN_DEFINITIONS.foundation;

  return {
    certificates: planDef.certificates,
    allowOverage: planDef.features.allowOverage,
    billPerCertificate: false, // Not implemented yet
    overageCost: planDef.features.allowOverage ? 0.1 : 0,
    hasWeb3: planDef.features.hasWeb3
  };
}

/**
 * Get transfer limits for a plan
 */
export function getTransferLimits(plan: string): TransferLimits {
  const limits: Record<string, TransferLimits> = {
    growth: {
      transfersPerMonth: 500,
      gasCreditsWei: '50000000000000000'
    },
    premium: {
      transfersPerMonth: 1000,
      gasCreditsWei: '100000000000000000'
    },
    enterprise: {
      transfersPerMonth: Number.POSITIVE_INFINITY,
      gasCreditsWei: '1000000000000000000'
    }
  };

  return (
    limits[plan] || { transfersPerMonth: 0, gasCreditsWei: '0' }
  );
}

/**
 * Get batch limits for a plan
 */
export function getBatchLimits(plan: string): BatchLimits {
  const limits: Record<string, BatchLimits> = {
    growth: { maxBatchSize: 50, maxConcurrent: 3 },
    premium: { maxBatchSize: 100, maxConcurrent: 5 },
    enterprise: { maxBatchSize: 1000, maxConcurrent: 20 }
  };

  return limits[plan] || { maxBatchSize: 10, maxConcurrent: 1 };
}

/**
 * Check if plan allows Web3 features
 */
export function planHasWeb3Features(plan: string): boolean {
  const limits = getPlanLimits(plan);
  return limits.hasWeb3;
}

/**
 * Check if plan allows overage
 */
export function planAllowsOverage(plan: string): boolean {
  const limits = getPlanLimits(plan);
  return limits.allowOverage;
}

/**
 * Validate certificate quota for business
 */
export async function validateCertificateQuota(
  businessId: string,
  plan: string,
  additionalCertificates: number = 1
): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  willExceed: boolean;
}> {
  const limits = getPlanLimits(plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Count certificates created this month
  const currentCount = await Certificate.countDocuments({
    business: businessId,
    createdAt: { $gte: startOfMonth }
  });

  const willExceed = currentCount + additionalCertificates > limits.certificates;

  // If will exceed and overage not allowed
  if (willExceed && !limits.allowOverage) {
    return {
      allowed: false,
      reason: `Certificate limit reached. Your ${plan} plan allows ${limits.certificates} certificates per month. Upgrade to create more.`,
      current: currentCount,
      limit: limits.certificates,
      willExceed: true
    };
  }

  return {
    allowed: true,
    current: currentCount,
    limit: limits.certificates,
    willExceed
  };
}

/**
 * Validate transfer quota for business
 */
export async function validateTransferQuota(
  businessId: string,
  plan: string
): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
}> {
  const limits = getTransferLimits(plan);

  // Get brand settings to check transfer analytics
  const brandSettings = await BrandSettings.findOne({ business: businessId });
  const analytics = (brandSettings as any)?.transferAnalytics;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyStats = analytics?.monthlyStats?.find(
    (stat: any) => stat.month === currentMonth
  );

  const currentTransfers = monthlyStats?.transfers || 0;

  if (currentTransfers >= limits.transfersPerMonth) {
    return {
      allowed: false,
      reason: `Transfer limit reached. Your ${plan} plan allows ${limits.transfersPerMonth} transfers per month.`,
      current: currentTransfers,
      limit: limits.transfersPerMonth
    };
  }

  return {
    allowed: true,
    current: currentTransfers,
    limit: limits.transfersPerMonth
  };
}

/**
 * Validate batch size against plan limits
 */
export function validateBatchSize(
  batchSize: number,
  plan: string
): { valid: boolean; error?: string; maxAllowed: number } {
  const limits = getBatchLimits(plan);

  if (batchSize > limits.maxBatchSize) {
    return {
      valid: false,
      error: `Batch size ${batchSize} exceeds plan limit of ${limits.maxBatchSize}. Upgrade your plan for larger batches.`,
      maxAllowed: limits.maxBatchSize
    };
  }

  return {
    valid: true,
    maxAllowed: limits.maxBatchSize
  };
}

/**
 * Validate Web3 feature access
 */
export function validateWeb3Access(plan: string): {
  allowed: boolean;
  reason?: string;
} {
  if (!planHasWeb3Features(plan)) {
    return {
      allowed: false,
      reason: `Web3 features are not available on your ${plan} plan. Upgrade to Growth or higher for blockchain integration.`
    };
  }

  return { allowed: true };
}

/**
 * Validate auto-transfer feature access
 */
export function validateAutoTransferAccess(plan: string): {
  allowed: boolean;
  reason?: string;
} {
  const web3Access = validateWeb3Access(plan);
  if (!web3Access.allowed) {
    return web3Access;
  }

  // Auto-transfer requires Web3 features
  return { allowed: true };
}

/**
 * Get upgrade recommendation based on usage
 */
export async function getUpgradeRecommendation(
  businessId: string,
  currentPlan: string
): Promise<{
  shouldUpgrade: boolean;
  recommendedPlan?: string;
  reasons: string[];
}> {
  const reasons: string[] = [];
  let shouldUpgrade = false;
  let recommendedPlan: string | undefined;

  // Check certificate usage
  const quotaCheck = await validateCertificateQuota(businessId, currentPlan, 0);
  if (quotaCheck.current >= quotaCheck.limit * 0.8) {
    reasons.push(
      `Using ${quotaCheck.current}/${quotaCheck.limit} certificates (${Math.round((quotaCheck.current / quotaCheck.limit) * 100)}%)`
    );
    shouldUpgrade = true;
  }

  // Check transfer usage
  const transferCheck = await validateTransferQuota(businessId, currentPlan);
  if (transferCheck.current >= transferCheck.limit * 0.8) {
    reasons.push(
      `Using ${transferCheck.current}/${transferCheck.limit} transfers (${Math.round((transferCheck.current / transferCheck.limit) * 100)}%)`
    );
    shouldUpgrade = true;
  }

  // Recommend next plan tier
  if (shouldUpgrade) {
    const planHierarchy = ['foundation', 'growth', 'premium', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    if (currentIndex < planHierarchy.length - 1) {
      recommendedPlan = planHierarchy[currentIndex + 1];
    }
  }

  return {
    shouldUpgrade,
    recommendedPlan,
    reasons
  };
}

/**
 * Validate plan supports requested feature
 */
export function validateFeatureAccess(
  plan: string,
  feature: 'web3' | 'autoTransfer' | 'batch' | 'analytics'
): { allowed: boolean; reason?: string } {
  switch (feature) {
    case 'web3':
    case 'autoTransfer':
      return validateWeb3Access(plan);

    case 'batch':
      // All plans support batch, but with different limits
      return { allowed: true };

    case 'analytics':
      // All plans have analytics
      return { allowed: true };

    default:
      return { allowed: false, reason: 'Unknown feature' };
  }
}

export class PlanValidationService {
  getPlanLimits = getPlanLimits;
  getTransferLimits = getTransferLimits;
  getBatchLimits = getBatchLimits;
  planHasWeb3Features = planHasWeb3Features;
  planAllowsOverage = planAllowsOverage;
  validateCertificateQuota = validateCertificateQuota;
  validateTransferQuota = validateTransferQuota;
  validateBatchSize = validateBatchSize;
  validateWeb3Access = validateWeb3Access;
  validateAutoTransferAccess = validateAutoTransferAccess;
  getUpgradeRecommendation = getUpgradeRecommendation;
  validateFeatureAccess = validateFeatureAccess;
}

export const planValidationService = new PlanValidationService();
