// src/services/connections/utils/matchingEngine.service.ts

import { Types } from 'mongoose';
import { Business, IBusiness } from '../../../models/core/business.model';
import { Manufacturer, IManufacturer } from '../../../models/core/manufacturer.model';
import { Product } from '../../../models/products/product.model';
import { Invitation } from '../../../models/infrastructure/invitation.model';
import { logger } from '../../../utils/logger';
import { connectionDataService } from '../core/connectionData.service';

export interface ManufacturerRecommendation {
  manufacturerId: string;
  score: number;
  reasons: string[];
  manufacturer: Pick<IManufacturer,
    'name' |
    'industry' |
    'servicesOffered' |
    'manufacturingCapabilities' |
    'plan' |
    'isVerified' |
    'totalConnections'> & { _id?: Types.ObjectId };
}

interface BrandProfile {
  business: Pick<IBusiness,
    'industry' |
    'companySize' |
    'businessName' |
    'description' |
    'plan'> & { _id?: Types.ObjectId };
  categories: string[];
  keywords: string[];
}

interface RecommendationOptions {
  limit?: number;
  requireVerified?: boolean;
  excludeConnected?: boolean;
  excludePending?: boolean;
}

/**
 * Matching engine responsible for recommending the best manufacturers for a brand
 * based on profile compatibility, production capabilities, and historic activity.
 */
export class MatchingEngineService {
  /**
   * Recommend manufacturers for a brand ordered by compatibility score.
   */
  async recommendManufacturersForBrand(
    brandId: string,
    options: RecommendationOptions = {}
  ): Promise<ManufacturerRecommendation[]> {
    try {
      const brandProfile = await this.getBrandProfile(brandId);
      if (!brandProfile) {
        return [];
      }

      const {
        limit = 5,
        requireVerified = false,
        excludeConnected = true,
        excludePending = true
      } = options;

      const exclusionSet = await this.buildExclusionSet(
        brandId,
        excludeConnected,
        excludePending
      );

      const manufacturers = await this.getCandidateManufacturers({
        requireVerified,
        excludeIds: exclusionSet
      });

      const ranked = manufacturers
        .map(manufacturer =>
          this.scoreManufacturer(manufacturer, brandProfile)
        )
        .filter((rec): rec is ManufacturerRecommendation => rec.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      logger.info('Generated manufacturer recommendations', {
        brandId,
        candidateCount: manufacturers.length,
        recommendationCount: ranked.length
      });

      return ranked;
    } catch (error) {
      logger.error('Failed to recommend manufacturers', { brandId }, error as Error);
      return [];
    }
  }

  /**
   * Recommend brands for a manufacturer (reverse lookup).
   */
  async recommendBrandsForManufacturer(
    manufacturerId: string,
    limit: number = 5
  ): Promise<Array<{ brandId: string; score: number; reasons: string[] }>> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId)
        .select('industry servicesOffered manufacturingCapabilities plan isVerified')
        .lean();

      if (!manufacturer) {
        return [];
      }

      const candidateBrands = await Business.find({ isActive: true })
        .select('industry businessName description companySize plan')
        .lean();

      const scored = await Promise.all(
        candidateBrands.map(async brand => {
          const profile = await this.getBrandProfile(brand._id.toString(), brand);
          if (!profile) {
            return null;
          }

          const recommendation = this.scoreManufacturer(manufacturer, profile);
          return recommendation.score > 0
            ? {
                brandId: brand._id.toString(),
                score: recommendation.score,
                reasons: recommendation.reasons
              }
            : null;
        })
      );

      return scored
        .filter((item): item is { brandId: string; score: number; reasons: string[] } => !!item)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to recommend brands for manufacturer',
        { manufacturerId }, error as Error);
      return [];
    }
  }

  /**
   * Compute a compatibility score for a manufacturer given brand profile context.
   */
  private scoreManufacturer(
    manufacturer: Pick<IManufacturer,
      'name' |
      'industry' |
      'servicesOffered' |
      'manufacturingCapabilities' |
      'plan' |
      'isVerified' |
      'totalConnections'> & { _id?: Types.ObjectId },
    brandProfile: BrandProfile
  ): ManufacturerRecommendation {
    let score = 0;
    const reasons: string[] = [];

    if (manufacturer.industry && brandProfile.business.industry) {
      if (manufacturer.industry.toLowerCase() === brandProfile.business.industry.toLowerCase()) {
        score += 30;
        reasons.push('Matches brand industry focus');
      }
    }

    const serviceOverlap = this.getIntersection(
      manufacturer.servicesOffered,
      brandProfile.keywords
    );

    if (serviceOverlap.length) {
      score += Math.min(serviceOverlap.length * 10, 30);
      reasons.push(`Shared services: ${serviceOverlap.slice(0, 3).join(', ')}`);
    }

    const capabilityOverlap = this.getIntersection(
      manufacturer.manufacturingCapabilities?.productTypes,
      brandProfile.categories
    );

    if (capabilityOverlap.length) {
      score += Math.min(capabilityOverlap.length * 12, 36);
      reasons.push(`Product focus alignment: ${capabilityOverlap.slice(0, 3).join(', ')}`);
    }

    if (manufacturer.isVerified) {
      score += 12;
      reasons.push('Manufacturer is verified');
    }

    if (manufacturer.plan) {
      const planWeights: Record<string, number> = {
        unlimited: 10,
        enterprise: 8,
        professional: 6,
        starter: 3
      };
      score += planWeights[manufacturer.plan] ?? 0;
    }

    if (typeof manufacturer.totalConnections === 'number') {
      score += Math.min(manufacturer.totalConnections, 15);
    }

    return {
      manufacturerId: manufacturer._id?.toString() ?? '',
      score,
      reasons,
      manufacturer
    };
  }

  /**
   * Fetch a brand profile that includes helpful matching metadata.
   */
  private async getBrandProfile(
    brandId: string,
    prefetchedBusiness?: Pick<IBusiness,
      'industry' |
      'companySize' |
      'businessName' |
      'description' |
      'plan'> & { _id?: Types.ObjectId }
  ): Promise<BrandProfile | null> {
    const business = prefetchedBusiness || await Business.findById(brandId)
      .select('industry companySize businessName description plan')
      .lean();

    if (!business) {
      return null;
    }

    const categories = await Product.distinct('category', {
      business: brandId,
      status: { $ne: 'archived' }
    });

    const keywords = new Set<string>();

    if (business.industry) {
      keywords.add(business.industry.toLowerCase());
    }

    categories
      .filter((category): category is string => typeof category === 'string')
      .forEach(category => keywords.add(category.toLowerCase()));

    if (business.description) {
      business.description
        .split(/[,;\.]/)
        .map(part => part.trim().toLowerCase())
        .filter(Boolean)
        .forEach(part => keywords.add(part));
    }

    return {
      business,
      categories: Array.from(new Set(
        categories
          .filter((category): category is string => typeof category === 'string')
          .map(category => category.toLowerCase())
      )),
      keywords: Array.from(keywords)
    };
  }

  /**
   * Gather candidate manufacturers subject to filters and exclusions.
   */
  private async getCandidateManufacturers(options: {
    requireVerified: boolean;
    excludeIds: Set<string>;
  }): Promise<Array<Pick<IManufacturer,
    'name' |
    'industry' |
    'servicesOffered' |
    'manufacturingCapabilities' |
    'plan' |
    'isVerified' |
    'totalConnections'> & { _id: Types.ObjectId }>> {
    const query: Record<string, unknown> = { isActive: true };

    if (options.requireVerified) {
      query.isVerified = true;
    }

    const docs = await Manufacturer.find(query)
      .select('name industry servicesOffered manufacturingCapabilities plan isVerified totalConnections')
      .lean();

    return docs.filter(doc => !options.excludeIds.has(doc._id.toString()));
  }

  /**
   * Build set of manufacturer IDs that should not be recommended.
   */
  private async buildExclusionSet(
    brandId: string,
    excludeConnected: boolean,
    excludePending: boolean
  ): Promise<Set<string>> {
    const exclusions = new Set<string>();

    if (excludeConnected) {
      const connected = await connectionDataService.getConnectedManufacturers(brandId);
      connected.forEach(id => exclusions.add(id.toString()));
    }

    if (excludePending) {
      const pending = await Invitation.find({
        brand: brandId,
        status: 'pending'
      }).select('manufacturer').lean();

      pending.forEach(invite => {
        exclusions.add(invite.manufacturer.toString());
      });
    }

    return exclusions;
  }


  /**
   * Compute compatibility for a specific brand/manufacturer pair.
   */
  async getCompatibilityForPair(
    brandId: string,
    manufacturerId: string
  ): Promise<ManufacturerRecommendation | null> {
    const brandProfile = await this.getBrandProfile(brandId);
    if (!brandProfile) {
      return null;
    }

    const manufacturer = await Manufacturer.findById(manufacturerId)
      .select('name industry servicesOffered manufacturingCapabilities plan isVerified totalConnections')
      .lean();

    if (!manufacturer) {
      return null;
    }

    return this.scoreManufacturer(manufacturer, brandProfile);
  }

  /**
   * Helper to gather intersection between two arrays.
   */
  private getIntersection(values?: string[] | null, targets?: string[] | null): string[] {
    if (!Array.isArray(values) || !Array.isArray(targets)) {
      return [];
    }

    const normalizedValues = new Set(values.map(value => value.toLowerCase()));
    const intersections = targets
      .map(target => target.toLowerCase())
      .filter(target => normalizedValues.has(target));

    return Array.from(new Set(intersections));
  }
}

export const matchingEngineService = new MatchingEngineService();



