// src/services/connections/features/proposalSharing.service.ts

import { Types } from 'mongoose';
import { Proposal, ProposalStatus } from '../../../models/voting/proposal.model';
import { VotingRecord } from '../../../models/voting/votingRecord.model';
import { permissionsService } from './permissions.service';
import { logger } from '../../../utils/logger';

interface ProductVoteData {
  productId: string;
  name: string;
  imageUrl?: string;
  voteCount: number;
  percentage: number;
  rank: number;
}

export interface SharedProposalData {
  proposalId: string;
  title: string;
  description: string;
  status: ProposalStatus;
  category?: string;
  imageUrl?: string;

  // Time tracking (LIVE)
  startTime?: Date;
  endTime?: Date;
  timeRemaining: number | null; // milliseconds
  isActive: boolean;
  isExpired: boolean;
  isScheduled: boolean;

  // Engagement metrics
  voteCount: number;
  participantCount: number;
  viewCount: number;
  engagementRate: number;

  // Product vote breakdown
  products: Array<{
    productId: string;
    name: string;
    imageUrl?: string;
    voteCount: number;
    percentage: number;
    rank: number;
  }>;

  // Metadata
  tags: string[];
  priority: string;
  publishedAt?: Date;
}

export interface SharedProposalsResult {
  proposals: SharedProposalData[];
  summary: {
    totalProposals: number;
    activeProposals: number;
    completedProposals: number;
    draftProposals: number;
    totalVotes: number;
    totalParticipants: number;
    averageEngagementRate: number;
  };
}

export class ProposalSharingService {
  /**
   * Get all proposals shared with a connected manufacturer
   */
  async getSharedProposals(
    brandId: string,
    manufacturerId: string,
    options?: {
      includeCompleted?: boolean;
      includeDraft?: boolean;
      limit?: number;
    }
  ): Promise<SharedProposalsResult> {
    // 1. Verify connection exists
    await permissionsService.assertFeatureAccess(brandId, manufacturerId, 'analytics');

    // 2. Get proposals based on filter
    const statusFilter = this.buildStatusFilter(options);
    const proposals = await Proposal.find({
      businessId: brandId,
      status: { $in: statusFilter }
    })
      .populate('productIds', 'name imageUrl')
      .sort({ createdAt: -1 })
      .limit(options?.limit || 50)
      .lean();

    // 3. Get vote distribution per product for each proposal
    const sharedProposals = await Promise.all(
      proposals.map(async (proposal) => {
        const productVotes = await this.getProductVoteDistribution(proposal._id.toString());

        return {
          proposalId: proposal.proposalId,
          title: proposal.title,
          description: proposal.description,
          status: proposal.status,
          category: proposal.category,
          imageUrl: proposal.imageUrl,

          // Time data
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          timeRemaining: this.calculateTimeRemaining(proposal.endTime),
          isActive: this.isProposalActive(proposal),
          isExpired: !!(proposal.endTime && proposal.endTime < new Date()),
          isScheduled: !!(proposal.startTime && proposal.startTime > new Date()),

          // Metrics
          voteCount: proposal.voteCount,
          participantCount: proposal.participantCount,
          viewCount: proposal.viewCount,
          engagementRate: this.calculateEngagementRate(proposal.participantCount, proposal.viewCount),

          // Product breakdown
          products: productVotes,

          // Metadata
          tags: proposal.tags,
          priority: proposal.priority,
          publishedAt: proposal.publishedAt
        };
      })
    );

    // 4. Calculate summary
    const summary = this.calculateSummary(proposals);

    return {
      proposals: sharedProposals,
      summary
    };
  }

  /**
   * Get vote distribution for products in a proposal
   */
  private async getProductVoteDistribution(proposalId: string): Promise<ProductVoteData[]> {
    // Query VotingRecord to get vote counts per product
    const voteDistribution = await VotingRecord.aggregate([
      {
        $match: {
          proposalId: new Types.ObjectId(proposalId),
          status: { $in: ['confirmed', 'pending'] }
        }
      },
      { $unwind: '$productIds' },
      {
        $group: {
          _id: '$productIds',
          voteCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          name: '$product.name',
          imageUrl: '$product.imageUrl',
          voteCount: 1
        }
      },
      { $sort: { voteCount: -1 } }
    ]);

    // Calculate percentages and ranks
    const totalVotes = voteDistribution.reduce((sum, item) => sum + item.voteCount, 0);

    return voteDistribution.map((item, index) => ({
      productId: item.productId.toString(),
      name: item.name,
      imageUrl: item.imageUrl,
      voteCount: item.voteCount,
      percentage: totalVotes > 0 ? (item.voteCount / totalVotes) * 100 : 0,
      rank: index + 1
    }));
  }

  /**
   * Get real-time proposal details (for live updates)
   */
  async getLiveProposalData(
    brandId: string,
    manufacturerId: string,
    proposalId: string
  ): Promise<SharedProposalData> {
    await permissionsService.assertFeatureAccess(brandId, manufacturerId, 'analytics');

    const proposal = await Proposal.findOne({
      businessId: brandId,
      proposalId
    }).populate('productIds');

    if (!proposal) {
      throw { statusCode: 404, message: 'Proposal not found' };
    }

    const productVotes = await this.getProductVoteDistribution(proposal._id.toString());

    // Calculate virtuals manually since they may not be available after populate
    const isExpired = !!(proposal.endTime && proposal.endTime < new Date());
    const isScheduled = !!(proposal.startTime && proposal.startTime > new Date());
    const engagementRate = proposal.viewCount > 0
      ? Math.round((proposal.participantCount / proposal.viewCount) * 100)
      : 0;

    return {
      proposalId: proposal.proposalId,
      title: proposal.title,
      description: proposal.description,
      status: proposal.status,
      category: proposal.category,
      imageUrl: proposal.imageUrl,
      startTime: proposal.startTime,
      endTime: proposal.endTime,
      timeRemaining: this.calculateTimeRemaining(proposal.endTime),
      isActive: proposal.isActive(),
      isExpired,
      isScheduled,
      voteCount: proposal.voteCount,
      participantCount: proposal.participantCount,
      viewCount: proposal.viewCount,
      engagementRate,
      products: productVotes,
      tags: proposal.tags,
      priority: proposal.priority,
      publishedAt: proposal.publishedAt
    };
  }

  private calculateTimeRemaining(endTime?: Date): number | null {
    if (!endTime) return null;
    const remaining = endTime.getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  private isProposalActive(proposal: any): boolean {
    if (proposal.status !== 'active') return false;
    const now = new Date();
    if (proposal.startTime && proposal.startTime > now) return false;
    if (proposal.endTime && proposal.endTime < now) return false;
    return true;
  }

  private calculateEngagementRate(participants: number, views: number): number {
    if (views === 0) return 0;
    return Math.round((participants / views) * 100);
  }

  private buildStatusFilter(options?: any): ProposalStatus[] {
    const statuses: ProposalStatus[] = ['active'];
    if (options?.includeCompleted) statuses.push('completed');
    if (options?.includeDraft) statuses.push('draft');
    return statuses;
  }

  private calculateSummary(proposals: any[]): any {
    const totalVotes = proposals.reduce((sum, p) => sum + (p.voteCount || 0), 0);
    const totalParticipants = proposals.reduce((sum, p) => sum + (p.participantCount || 0), 0);
    const totalViews = proposals.reduce((sum, p) => sum + (p.viewCount || 0), 0);

    return {
      totalProposals: proposals.length,
      activeProposals: proposals.filter(p => p.status === 'active').length,
      completedProposals: proposals.filter(p => p.status === 'completed').length,
      draftProposals: proposals.filter(p => p.status === 'draft').length,
      totalVotes,
      totalParticipants,
      averageEngagementRate: totalViews > 0 ? Math.round((totalParticipants / totalViews) * 100) : 0
    };
  }
}

export const proposalSharingService = new ProposalSharingService();
