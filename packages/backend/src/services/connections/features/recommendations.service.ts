// src/services/connections/features/recommendations.service.ts

import { matchingEngineService, ManufacturerRecommendation } from '../utils/matchingEngine.service';
import { collaborationService } from './collaboration.service';
import { connectionDataService } from '../core/connectionData.service';
import { logger } from '../../../utils/logger';

export interface RecommendationOptions {
  limit?: number;
  requireVerified?: boolean;
  excludeConnected?: boolean;
  excludePending?: boolean;
}

export interface CompatibilityReport {
  score: number;
  reasons: string[];
  connected: boolean;
  suggestions: string[];
}

/**
 * High level recommendation engine orchestrator that exposes developer-friendly
 * methods for suggesting new partnerships or analysing compatibility.
 */
export class RecommendationsService {
  /**
   * Recommend manufacturers that align with the brand's profile.
   */
  async getManufacturerRecommendationsForBrand(
    brandId: string,
    options: RecommendationOptions = {}
  ): Promise<ManufacturerRecommendation[]> {
    try {
      return await matchingEngineService.recommendManufacturersForBrand(brandId, options);
    } catch (error) {
      logger.error('Failed to load manufacturer recommendations', { brandId, options }, error as Error);
      return [];
    }
  }

  /**
   * Recommend brands that could partner with the manufacturer.
   */
  async getBrandRecommendationsForManufacturer(
    manufacturerId: string,
    limit: number = 5
  ): Promise<Array<{ brandId: string; score: number; reasons: string[] }>> {
    try {
      return await matchingEngineService.recommendBrandsForManufacturer(manufacturerId, limit);
    } catch (error) {
      logger.error('Failed to load brand recommendations', { manufacturerId }, error as Error);
      return [];
    }
  }

  /**
   * Generate compatibility report for an existing or potential connection.
   */
  async getCompatibilityReport(
    brandId: string,
    manufacturerId: string
  ): Promise<CompatibilityReport | null> {
    const recommendation = await matchingEngineService.getCompatibilityForPair(brandId, manufacturerId);
    if (!recommendation) {
      return null;
    }

    const connected = await connectionDataService.areConnected(brandId, manufacturerId);
    const suggestions = await collaborationService.suggestNextSteps(brandId, manufacturerId);

    return {
      score: recommendation.score,
      reasons: recommendation.reasons,
      connected,
      suggestions
    };
  }

}

export const recommendationsService = new RecommendationsService();
