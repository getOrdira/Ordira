// src/services/connections/features/collaboration.service.ts

import { Product } from '../../../models/products/product.model';
import { Invitation } from '../../../models/infrastructure/invitation.model';
import { analyticsSharingService } from './analyticsSharing.service';
import { connectionDataService } from '../core/connectionData.service';
import { matchingEngineService } from '../utils/matchingEngine.service';
import { permissionsService } from './permissions.service';
import { logger } from '../../../utils/logger';

export interface CollaborationOverview {
  connected: boolean;
  invitationType?: string;
  connectedSince?: Date | null;
  sharedProductCount: number;
  pendingInvites: number;
  analytics?: {
    brand?: Record<string, number>;
    manufacturer?: Record<string, number>;
  };
  recommendations?: Array<{ manufacturerId: string; score: number; reasons: string[] }>;
}

export interface SharedProductSummary {
  productId: string;
  title: string;
  category?: string;
  status: string;
  certificateCount: number;
  lastUpdated: Date;
}

/**
 * Collaboration service surfaces actionable insights for connected brands and manufacturers.
 */
export class CollaborationService {
  /**
   * Build an overview of the collaboration between a brand and manufacturer.
   */
  async getCollaborationOverview(
    brandId: string,
    manufacturerId: string
  ): Promise<CollaborationOverview> {
    const [connectionMeta, pendingInvites, sharedProducts] = await Promise.all([
      this.getConnectionMetadata(brandId, manufacturerId),
      this.countPendingInvites(brandId, manufacturerId),
      this.getSharedProductCatalog(brandId, manufacturerId, 50)
    ]);

    const analytics = await this.loadAnalyticsIfAllowed(brandId, manufacturerId);

    const recommendations = await matchingEngineService.recommendManufacturersForBrand(brandId, {
      excludeConnected: true,
      excludePending: true,
      limit: 3
    });

    return {
      connected: connectionMeta.connected,
      invitationType: connectionMeta.invitationType,
      connectedSince: connectionMeta.connectedSince,
      sharedProductCount: sharedProducts.length,
      pendingInvites,
      analytics,
      recommendations
    };
  }

  /**
   * Return the brand's product catalog that can be shared with the manufacturer.
   */
  async getSharedProductCatalog(
    brandId: string,
    manufacturerId: string,
    limit: number = 20
  ): Promise<SharedProductSummary[]> {
    const connected = await connectionDataService.areConnected(brandId, manufacturerId);
    if (!connected) {
      return [];
    }

    const products = await Product.find({
      business: brandId,
      status: { $nin: ['archived'] }
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('title category status certificateCount updatedAt')
      .lean();

    return products.map(product => ({
      productId: product._id.toString(),
      title: product.title,
      category: product.category,
      status: product.status,
      certificateCount: product.certificateCount ?? 0,
      lastUpdated: product.updatedAt
    }));
  }

  /**
   * Suggest next steps to deepen collaboration based on current state.
   */
  async suggestNextSteps(
    brandId: string,
    manufacturerId: string
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const connected = await connectionDataService.areConnected(brandId, manufacturerId);

    if (!connected) {
      const pending = await this.countPendingInvites(brandId, manufacturerId);
      if (pending > 0) {
        suggestions.push('Awaiting response on pending invitation');
      } else {
        suggestions.push('Send a collaboration invitation to get started');
      }
      return suggestions;
    }

    const products = await this.getSharedProductCatalog(brandId, manufacturerId, 5);

    if (products.length === 0) {
      suggestions.push('Publish or activate products to collaborate on shared launches');
    } else if (products.every(product => product.certificateCount === 0)) {
      suggestions.push('Mint certificates for top products to unlock supply chain tracking');
    }

    const canShareAnalytics = await permissionsService.canUseFeature(brandId, manufacturerId, 'analytics');
    if (canShareAnalytics) {
      suggestions.push('Review shared analytics to identify high-performing products');
    }

    const canUseSupplyChain = await permissionsService.canUseFeature(brandId, manufacturerId, 'supplyChain');
    if (canUseSupplyChain) {
      suggestions.push('Set up supply chain events to monitor production progress');
    }

    return suggestions;
  }

  private async loadAnalyticsIfAllowed(
    brandId: string,
    manufacturerId: string
  ): Promise<CollaborationOverview['analytics']> {
    const canShare = await permissionsService.canUseFeature(brandId, manufacturerId, 'analytics');
    if (!canShare) {
      return undefined;
    }

    try {
      return await analyticsSharingService.getSharedKpis(brandId, manufacturerId);
    } catch (error) {
      logger.warn('Failed to load shared analytics KPIs', {
        brandId,
        manufacturerId,
        error
      });
      return undefined;
    }
  }

  private async getConnectionMetadata(
    brandId: string,
    manufacturerId: string
  ): Promise<{ connected: boolean; invitationType?: string; connectedSince?: Date | null }> {
    const invitation = await Invitation.findOne({
      brand: brandId,
      manufacturer: manufacturerId,
      status: 'accepted'
    }).select('invitationType respondedAt');

    return {
      connected: !!invitation,
      invitationType: invitation?.invitationType,
      connectedSince: invitation?.respondedAt ?? null
    };
  }

  private async countPendingInvites(brandId: string, manufacturerId: string): Promise<number> {
    return Invitation.countDocuments({
      brand: brandId,
      manufacturer: manufacturerId,
      status: 'pending'
    });
  }
}

export const collaborationService = new CollaborationService();


