// src/services/connections/features/analyticsSharing.service.ts

import { AnalyticsService as BrandAnalyticsService } from '../../brands/features/analytics.service';
import { analyticsService as manufacturerAnalyticsService } from '../../manufacturers/features/analytics.service';
import { permissionsService } from './permissions.service';
import { connectionDataService } from '../core/connectionData.service';
import { Invitation } from '../../../models/infrastructure/invitation.model';
import { logger } from '../../../utils/logger';
import { proposalSharingService, SharedProposalsResult } from './proposalSharing.service';

export interface SharedAnalyticsOptions {
  timeRange?: { start: Date; end: Date };
  includeBrand?: boolean;
  includeManufacturer?: boolean;
  includeProposals?: boolean;
}

export interface SharedAnalyticsResult {
  brand?: any | null;
  manufacturer?: any | null;

  // Proposal voting data
  proposals?: SharedProposalsResult | null;

  connection: {
    connected: boolean;
    since?: Date | null;
    invitationType?: string;
    lastUpdated?: Date | null;
  };
}

/**
 * Orchestrates analytics sharing between connected brands and manufacturers.
 */
export class AnalyticsSharingService {
  private brandAnalytics = new BrandAnalyticsService();

  /**
   * Check whether analytics can be shared for this connection.
   */
  async canShare(brandId: string, manufacturerId: string): Promise<boolean> {
    return permissionsService.canUseFeature(brandId, manufacturerId, 'analytics');
  }

  /**
   * Retrieve both brand and manufacturer analytics snapshots.
   */
  async getSharedAnalytics(
    brandId: string,
    manufacturerId: string,
    options: SharedAnalyticsOptions = {}
  ): Promise<SharedAnalyticsResult> {
    const includeBrand = options.includeBrand ?? true;
    const includeManufacturer = options.includeManufacturer ?? true;
    const includeProposals = options.includeProposals ?? true;

    await permissionsService.assertFeatureAccess(brandId, manufacturerId, 'analytics');

    const connectionMeta = await this.getConnectionMetadata(brandId, manufacturerId);

    const [brandAnalytics, manufacturerAnalytics, proposalsData] = await Promise.all([
      includeBrand
        ? this.getBrandAnalyticsForManufacturer(brandId, manufacturerId, options.timeRange).catch(error => {
            logger.warn('Failed to load brand analytics for sharing', {
              brandId,
              manufacturerId,
              error
            });
            return null;
          })
        : Promise.resolve(null),
      includeManufacturer
        ? this.getManufacturerAnalyticsForBrand(manufacturerId, brandId, options.timeRange).catch(error => {
            logger.warn('Failed to load manufacturer analytics for sharing', {
              brandId,
              manufacturerId,
              error
            });
            return null;
          })
        : Promise.resolve(null),
      includeProposals
        ? proposalSharingService.getSharedProposals(brandId, manufacturerId, {
            includeCompleted: true,
            includeDraft: false
          }).catch(error => {
            logger.warn('Failed to load proposal data for sharing', {
              brandId,
              manufacturerId,
              error
            });
            return null;
          })
        : Promise.resolve(null)
    ]);

    return {
      brand: brandAnalytics,
      manufacturer: manufacturerAnalytics,
      proposals: proposalsData,
      connection: connectionMeta
    };
  }

  /**
   * Share brand dashboard analytics with a connected manufacturer.
   */
  async getBrandAnalyticsForManufacturer(
    brandId: string,
    manufacturerId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    await this.ensureCanShare(brandId, manufacturerId);
    return this.brandAnalytics.getDashboardAnalytics(brandId);
  }

  /**
   * Share manufacturer analytics with a connected brand.
   */
  async getManufacturerAnalyticsForBrand(
    manufacturerId: string,
    brandId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    await this.ensureCanShare(brandId, manufacturerId);
    return manufacturerAnalyticsService.getManufacturerAnalytics(manufacturerId, timeRange);
  }

  /**
   * Provide lightweight KPI summary for dashboards.
   */
  async getSharedKpis(
    brandId: string,
    manufacturerId: string
  ): Promise<{ brand?: Record<string, number>; manufacturer?: Record<string, number> }> {
    await this.ensureCanShare(brandId, manufacturerId);

    const [brandAnalytics, manufacturerAnalytics] = await Promise.all([
      this.brandAnalytics.getDashboardAnalytics(brandId),
      manufacturerAnalyticsService.getManufacturerAnalytics(manufacturerId)
    ]);

    const brandKpis = brandAnalytics
      ? {
          totalVotes: brandAnalytics.overview?.certificatesIssued ?? 0,
          activeProducts: brandAnalytics.overview?.profileViews ?? 0
        }
      : undefined;

    const manufacturerKpis = manufacturerAnalytics
      ? {
          profileViews: manufacturerAnalytics.profileViews ?? 0,
          activeConnections: manufacturerAnalytics.activeConnections ?? 0,
          inquiries: manufacturerAnalytics.productInquiries ?? 0
        }
      : undefined;

    return {
      brand: brandKpis,
      manufacturer: manufacturerKpis
    };
  }

  /**
   * Ensure a connection is present and analytics sharing is enabled.
   */
  private async ensureCanShare(brandId: string, manufacturerId: string): Promise<void> {
    const connected = await connectionDataService.areConnected(brandId, manufacturerId);
    if (!connected) {
      throw { statusCode: 403, message: 'Brand and manufacturer must be connected to share analytics' };
    }

    await permissionsService.assertFeatureAccess(brandId, manufacturerId, 'analytics');
  }

  private async getConnectionMetadata(
    brandId: string,
    manufacturerId: string
  ): Promise<{ connected: boolean; since?: Date | null; invitationType?: string; lastUpdated?: Date | null }> {
    const invitation = await Invitation.findOne({
      brand: brandId,
      manufacturer: manufacturerId,
      status: 'accepted'
    }).select('respondedAt invitationType updatedAt');

    return {
      connected: !!invitation,
      since: invitation?.respondedAt ?? null,
      invitationType: invitation?.invitationType,
      lastUpdated: invitation?.updatedAt ?? null
    };
  }
}

export const analyticsSharingService = new AnalyticsSharingService();

