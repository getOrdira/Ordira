// src/services/votes/utils/pendingVoteHelpers.ts
// Utility helpers for pending vote operations

import type { IPendingVote } from '../../../models/voting/pendingVote.model';

/**
 * Calculate processing priority for a vote based on age, verification status, and vote choice
 */
export function calculateProcessingPriority(vote: IPendingVote): number {
  let priority = 50; // Base priority
  
  // Age-based priority (older = higher priority)
  const ageInHours = (Date.now() - vote.createdAt.getTime()) / (1000 * 60 * 60);
  priority += Math.min(ageInHours * 2, 30); // Max 30 points for age
  
  // Signature verification bonus
  if (vote.isVerified) priority += 10;
  
  // Vote choice priority (abstain gets lower priority)
  if (vote.voteChoice === 'abstain') priority -= 5;
  
  return Math.round(priority);
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Generate a unique batch ID for batch processing
 */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Estimate gas cost per individual vote in ETH
 */
export function estimateVoteGasCost(): string {
  // Estimated gas cost per vote in ETH
  return '0.001';
}

/**
 * Estimate gas cost for batch processing
 */
export function estimateBatchGasCost(batchSize: number): string {
  // Batch processing is more efficient
  const baseGas = 50000; // Base transaction gas
  const perVoteGas = 20000; // Gas per vote in batch
  const totalGas = baseGas + (perVoteGas * batchSize);
  
  // Assume 20 gwei gas price
  const gasPriceWei = 20 * 1000000000;
  const totalCostWei = totalGas * gasPriceWei;
  const totalCostEth = totalCostWei / 1000000000000000000;
  
  return totalCostEth.toFixed(6);
}

/**
 * Calculate gas savings from batch processing vs individual processing
 */
export function calculateBatchSavings(batchSize: number): string {
  const individualCost = parseFloat(estimateVoteGasCost()) * batchSize;
  const batchCost = parseFloat(estimateBatchGasCost(batchSize));
  const savings = individualCost - batchCost;
  const savingsPercentage = (savings / individualCost) * 100;
  
  return `${savingsPercentage.toFixed(1)}% (${savings.toFixed(4)} ETH)`;
}

/**
 * Get recommended action based on pending vote count and threshold
 */
export function getRecommendedAction(pendingCount: number, threshold: number): string {
  if (pendingCount === 0) return 'No pending votes';
  if (pendingCount >= threshold) return 'Process batch now';
  if (pendingCount >= threshold * 0.8) return 'Consider processing soon';
  if (pendingCount >= threshold * 0.5) return 'Monitor and wait for more votes';
  return 'Wait for more votes to accumulate';
}

