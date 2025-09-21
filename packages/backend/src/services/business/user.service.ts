// src/services/business/user.service.ts
import { User, IUser } from '../../models/user.model';
import { logger } from '../../utils/logger';
import { NotificationService } from './notification.service';
import { AnalyticsBusinessService } from './analytics.service';
import { UtilsService } from '../utils/utils.service';
import { Business } from '../../models/business.model';

export interface UserSummary {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  profilePictureUrl?: string;
  isEmailVerified: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  lastLoginAt?: Date;
  analytics: {
    totalVotes: number;
    totalSessions: number;
    engagementScore: number;
    lastActiveAt: Date;
    isActive: boolean;
  };
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  preferences?: {
    emailNotifications?: boolean;
    marketingEmails?: boolean;
    language?: string;
    timezone?: string;
  };
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  preferences?: any;
  status?: 'active' | 'inactive' | 'suspended';
  suspensionReason?: string;
  suspendedAt?: Date;
}

export interface VoteData {
  proposalId: string;
  businessId: string;
  productId?: string; 
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserFilters {
  status?: 'active' | 'inactive' | 'suspended' | 'deleted';
  isEmailVerified?: boolean;
  hasVoted?: boolean;
  businessId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'totalVotes' | 'engagementScore';
  sortOrder?: 'asc' | 'desc';
}

export interface UserAnalytics {
  overview: {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    totalVotes: number;
    averageVotesPerUser: number;
  };
  growth: {
    newUsersThisMonth: number;
    growthRate: number;
    retentionRate: number;
  };
  engagement: {
    highlyEngaged: number;
    moderatelyEngaged: number;
    lowEngagement: number;
    averageSessionDuration: number;
  };
  voting: {
    totalVotingUsers: number;
    averageVotesPerUser: number;
    mostActiveVoters: UserSummary[];
    votingTrends: any[];
  };
}

class UserError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'UserError';
    this.statusCode = statusCode;
  }
}

export class UserService {
  private notificationService = new NotificationService();
  private analyticsService = new AnalyticsBusinessService();

  /**
   * Create a new user (customer registration)
   */
  async createUser(data: CreateUserData): Promise<UserSummary> {
    // Validate email format
    if (!UtilsService.isValidEmail(data.email)) {
      throw new UserError('Invalid email format', 400);
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(data.email);
    if (existingUser) {
      throw new UserError('Email already registered', 409);
    }

    // Create user with default preferences
    const userData = {
      ...data,
      email: data.email.toLowerCase().trim(),
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: true,
        language: 'en',
        timezone: 'UTC',
        ...data.preferences
      },
      analytics: {
        totalVotes: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        lastActiveAt: new Date(),
        deviceInfo: null,
        referralSource: null
      },
      status: 'active'
    };

    const user = await User.create(userData);
    
    // Fix 3: Replace sendUserWelcome with simple logging or remove entirely
    try {
      logger.info(`User created successfully: ${user.email} (${user.firstName || 'Unknown'});`);
      // If you have a working welcome method, use that instead
    } catch (error) {
      logger.warn('Failed to log user creation:', error);
    }

    return this.mapToSummary(user);
  }


  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserSummary> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UserError('User not found', 404);
    }

    return this.mapToSummary(user);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserSummary> {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UserError('User not found', 404);
    }

    return this.mapToSummary(user);
  }

 /**
   * Update user profile
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<UserSummary> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UserError('User not found', 404);
    }

    // Handle suspension
    if (data.status === 'suspended' && user.status !== 'suspended') {
      data.suspendedAt = new Date(); // Now this works because we added it to the interface
      
      // Fix 4: Replace sendAccountSuspensionNotice with logging or working method
      try {
        logger.info(`User suspended: ${user.email} - Reason: ${data.suspensionReason || 'Terms violation'}`);
        // If you have a working suspension notification method, use that instead
      } catch (error) {
        logger.warn('Failed to log user suspension:', error);
      }
    }

    // Update user
    Object.assign(user, data);
    await user.save();

    return this.mapToSummary(user);
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, reason?: string): Promise<{ deleted: boolean; deletedAt: Date }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UserError('User not found', 404);
    }

    if (user.status === 'deleted') {
      throw new UserError('User already deleted', 400);
    }

    // Soft delete
    user.status = 'deleted';
    user.deletedAt = new Date();
    user.suspensionReason = reason;
    await user.save();

    // Send deletion confirmation
    await this.notificationService.sendAccountDeletionConfirmation(user.email);

    return {
      deleted: true,
      deletedAt: user.deletedAt
    };
  }

  /**
   * Record user vote
   */
  async recordVote(userId: string, voteData: VoteData): Promise<{
    recorded: boolean;
    voteId: string;
    totalUserVotes: number;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UserError('User not found', 404);
    }

    // Check if user can vote
    if (!user.canVoteForBusiness(voteData.businessId)) {
      throw new UserError('User not eligible to vote', 403);
    }

    // Check if already voted for this proposal
    if (user.hasVotedForProposal(voteData.proposalId)) {
      throw new UserError('User has already voted for this proposal', 409);
    }

    // Record the vote
    await user.addVote(voteData);

    // Track analytics
    await this.analyticsService.trackUserVote(userId, voteData);

    return {
      recorded: true,
      voteId: voteData.proposalId,
      totalUserVotes: user.analytics.totalVotes + 1
    };
  }

  /**
   * Check if user has voted for a proposal
   */
  async checkVoteStatus(userId: string, proposalId: string): Promise<{
    hasVoted: boolean;
    selectedProductId: string;
    votedAt?: Date;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UserError('User not found', 404);
    }

    const vote = user.votingHistory.find(v => v.proposalId === proposalId);
    
    return {
      hasVoted: !!vote,
      selectedProductId: vote?.selectedProductId || null,
      votedAt: vote?.votedAt
    };
  }

/**
 * Get user's voting history (Alternative robust solution)
 */
async getUserVotingHistory(
  userId: string, 
  filters: { businessId?: string; limit?: number; offset?: number } = {}
): Promise<{
  votes: any[];
  total: number;
  page: number;
  totalPages: number;
  selectedProductId: string;
}> {
  const user = await User.findById(userId);
  if (!user) {
    throw new UserError('User not found', 404);
  }

  let votes = user.votingHistory;

  // Filter by business if specified
  if (filters.businessId) {
    votes = votes.filter(vote => vote.businessId.toString() === filters.businessId);
  }

  // Sort by most recent first
  votes.sort((a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime());

  // Apply pagination
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  const page = Math.floor(offset / limit) + 1;
  const total = votes.length;
  const paginatedVotes = votes.slice(offset, offset + limit);

  // Get business names separately to avoid populate issues
  const businessIds = [...new Set(paginatedVotes.map(vote => vote.businessId.toString()))];
  const businesses = await Business.find({ _id: { $in: businessIds } }).select('businessName');
  const businessMap = new Map(businesses.map(b => [b._id.toString(), b.businessName]));

  return {
    votes: paginatedVotes.map(vote => ({
      proposalId: vote.proposalId,
      businessId: vote.businessId,
      businessName: businessMap.get(vote.businessId.toString()) || 'Unknown Business',
      productId: vote.productId,
      selectedProductId: vote.selectedProductId, // For your product selection system
      productName: vote.productName,
      votedAt: vote.votedAt,
      ipAddress: vote.ipAddress
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    selectedProductId: votes[0]?.selectedProductId || ''
  };
}

  /**
   * Get users for a specific business
   */
  async getUsersForBusiness(
    businessId: string, 
    filters: UserFilters = {}
  ): Promise<{
    users: UserSummary[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    // Build query
    const query = this.buildUserQuery(businessId, filters);
    const sort = this.buildUserSort(filters);

    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .exec(),
      User.countDocuments(query)
    ]);

    return {
      users: users.map(user => this.mapToSummary(user)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * List all users with advanced filtering
   */
  async listUsers(filters: UserFilters = {}): Promise<{
    users: UserSummary[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    // Build query without business filter
    const query = this.buildUserQuery(undefined, filters);
    const sort = this.buildUserSort(filters);

    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .exec(),
      User.countDocuments(query)
    ]);

    return {
      users: users.map(user => this.mapToSummary(user)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }


  /**
   * Update user session analytics
   */
  async recordSession(
    userId: string, 
    sessionData: {
      duration?: number; // in minutes
      deviceInfo?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UserError('User not found', 404);
    }

    // Update session analytics
    if (sessionData.duration) {
      await user.incrementAnalytics('sessionDuration', sessionData.duration);
    }
    await user.incrementAnalytics('session', 1);

    // Update device info if provided
    if (sessionData.deviceInfo) {
      user.analytics.deviceInfo = sessionData.deviceInfo;
      await user.save();
    }
  }

  /**
 * Record brand interaction
 */
async recordBrandInteraction(userId: string, businessId: string, type: string): Promise<void> {
  try {
    // Add your implementation here - could be analytics tracking
    await this.analyticsService.trackEvent('brand_interaction', {
      userId,
      businessId,
      interactionType: type,
      timestamp: new Date()
    });
  } catch (error) {
    logger.warn('Failed to record brand interaction:', error);
    // Don't throw - analytics shouldn't break functionality
  }
}

  /**
   * Get comprehensive user analytics
   */
  async getUserAnalytics(businessId?: string): Promise<UserAnalytics> {
    // Build match query
    const matchQuery: any = { status: 'active' };
    if (businessId) {
      matchQuery['brandInteractions.businessId'] = businessId;
    }

    // Get overview stats
    const overviewStats = await User.getVotingStats(businessId);
    const overview = overviewStats[0] || {
      totalUsers: 0,
      totalVotes: 0,
      averageVotesPerUser: 0,
      activeUsers: 0
    };

    // Get verified users count
    const verifiedUsers = await User.countDocuments({
      ...matchQuery,
      isEmailVerified: true
    });

    // Get growth stats
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [newUsersThisMonth, totalUsersLastMonth] = await Promise.all([
      User.countDocuments({
        ...matchQuery,
        createdAt: { $gte: monthAgo }
      }),
      User.countDocuments({
        ...matchQuery,
        createdAt: { $lt: monthAgo }
      })
    ]);

    const growthRate = totalUsersLastMonth > 0 
      ? ((newUsersThisMonth / totalUsersLastMonth) * 100) 
      : 0;

    // Get engagement stats
    const engagementStats = await this.calculateEngagementStats(matchQuery);

    // Get most active voters
    const mostActiveVoters = await User.find(matchQuery)
      .sort({ 'analytics.totalVotes': -1 })
      .limit(10)
      .exec();

    // Get voting trends (last 6 months)
    const votingTrends = await this.getVotingTrends(businessId, 6);

    return {
      overview: {
        totalUsers: overview.totalUsers,
        activeUsers: overview.activeUsers,
        verifiedUsers,
        totalVotes: overview.totalVotes,
        averageVotesPerUser: overview.averageVotesPerUser || 0
      },
      growth: {
        newUsersThisMonth,
        growthRate,
        retentionRate: await this.calculateRetentionRate(businessId)
      },
      engagement: engagementStats,
      voting: {
        totalVotingUsers: await User.countDocuments({
          ...matchQuery,
          'analytics.totalVotes': { $gt: 0 }
        }),
        averageVotesPerUser: overview.averageVotesPerUser || 0,
        mostActiveVoters: mostActiveVoters.map(user => this.mapToSummary(user)),
        votingTrends
      }
    };
  }

  /**
   * Search users
   */
  async searchUsers(
    query: string, 
    filters: UserFilters = {}
  ): Promise<{
    users: UserSummary[];
    total: number;
    searchTerm: string;
  }> {
    if (!query || query.trim().length < 2) {
      throw new UserError('Search query must be at least 2 characters', 400);
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    const searchQuery = {
      ...this.buildUserQuery(filters.businessId, filters),
      $or: [
        { email: { $regex: searchRegex } },
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } }
      ]
    };

    const users = await User.find(searchQuery)
      .sort({ 'analytics.totalVotes': -1, createdAt: -1 })
      .limit(filters.limit || 50)
      .exec();

    return {
      users: users.map(user => this.mapToSummary(user)),
      total: users.length,
      searchTerm: query.trim()
    };
  }

  /**
   * Bulk update user preferences
   */
  async bulkUpdatePreferences(
    userIds: string[], 
    preferences: any
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    try {
      const result = await User.bulkUpdatePreferences(userIds, preferences);
      updated = result.modifiedCount || 0;
    } catch (error: any) {
      errors.push(`Bulk update failed: ${error.message}`);
    }

    return { updated, errors };
  }

  /**
   * Get user engagement insights
   */
  async getUserEngagementInsights(userId: string): Promise<{
    engagementScore: number;
    tier: 'low' | 'medium' | 'high' | 'champion';
    insights: string[];
    recommendations: string[];
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UserError('User not found', 404);
    }

    const engagementScore = user.analytics.engagementScore;
    let tier: 'low' | 'medium' | 'high' | 'champion';
    
    if (engagementScore >= 100) tier = 'champion';
    else if (engagementScore >= 50) tier = 'high';
    else if (engagementScore >= 20) tier = 'medium';
    else tier = 'low';

    const insights = this.generateEngagementInsights(user);
    const recommendations = this.generateEngagementRecommendations(user, tier);

    return {
      engagementScore,
      tier,
      insights,
      recommendations
    };
  }

  // ====================
  // PRIVATE HELPER METHODS
  // ====================

  private buildUserQuery(businessId?: string, filters: UserFilters = {}): any {
    const query: any = {};

    // Business filter
    if (businessId) {
      query['brandInteractions.businessId'] = businessId;
    }

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Email verification filter
    if (filters.isEmailVerified !== undefined) {
      query.isEmailVerified = filters.isEmailVerified;
    }

    // Voting filter
    if (filters.hasVoted !== undefined) {
      if (filters.hasVoted) {
        query['analytics.totalVotes'] = { $gt: 0 };
      } else {
        query['analytics.totalVotes'] = 0;
      }
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    // Search filter
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { email: { $regex: searchRegex } },
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } }
      ];
    }

    return query;
  }

  private buildUserSort(filters: UserFilters = {}): any {
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    
    const sortQuery: any = {};
    
    switch (sortField) {
      case 'engagementScore':
        sortQuery['analytics.totalVotes'] = sortOrder;
        sortQuery['analytics.totalSessions'] = sortOrder;
        break;
      case 'totalVotes':
        sortQuery['analytics.totalVotes'] = sortOrder;
        break;
      case 'lastLoginAt':
        sortQuery.lastLoginAt = sortOrder;
        break;
      default:
        sortQuery[sortField] = sortOrder;
    }
    
    return sortQuery;
  }

  private async calculateEngagementStats(matchQuery: any): Promise<any> {
    const engagementResults = await User.aggregate([
      { $match: matchQuery },
      {
        $bucket: {
          groupBy: '$analytics.totalVotes',
          boundaries: [0, 1, 5, 20, Infinity],
          default: 'unknown',
          output: {
            count: { $sum: 1 },
            avgSessions: { $avg: '$analytics.totalSessions' }
          }
        }
      }
    ]);

    const stats = {
      lowEngagement: 0,
      moderatelyEngaged: 0,
      highlyEngaged: 0,
      averageSessionDuration: 0
    };

    engagementResults.forEach(bucket => {
      if (bucket._id === 0) stats.lowEngagement = bucket.count;
      else if (bucket._id === 1) stats.moderatelyEngaged = bucket.count;
      else if (bucket._id >= 5) stats.highlyEngaged = bucket.count;
    });

    // Calculate average session duration
    const avgSession = await User.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$analytics.averageSessionDuration' }
        }
      }
    ]);

    stats.averageSessionDuration = avgSession[0]?.avgDuration || 0;

    return stats;
  }

  private async calculateRetentionRate(businessId?: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const matchQuery: any = {
      status: 'active',
      createdAt: { $lte: thirtyDaysAgo }
    };

    if (businessId) {
      matchQuery['brandInteractions.businessId'] = businessId;
    }

    const [totalUsers, activeUsers] = await Promise.all([
      User.countDocuments(matchQuery),
      User.countDocuments({
        ...matchQuery,
        'analytics.lastActiveAt': { $gte: thirtyDaysAgo }
      })
    ]);

    return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  }

  private async getVotingTrends(businessId?: string, months: number = 6): Promise<any[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const matchQuery: any = {
      'votingHistory.votedAt': { $gte: startDate }
    };

    if (businessId) {
      matchQuery['votingHistory.businessId'] = businessId;
    }

    return User.aggregate([
      { $match: matchQuery },
      { $unwind: '$votingHistory' },
      { $match: { 'votingHistory.votedAt': { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$votingHistory.votedAt' },
            month: { $month: '$votingHistory.votedAt' }
          },
          totalVotes: { $sum: 1 },
          uniqueVoters: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          date: '$_id',
          totalVotes: 1,
          uniqueVoters: { $size: '$uniqueVoters' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
  }

  private generateEngagementInsights(user: IUser): string[] {
    const insights: string[] = [];

    if (user.analytics.totalVotes === 0) {
      insights.push('User has not voted yet');
    } else if (user.analytics.totalVotes >= 10) {
      insights.push('Highly engaged voter');
    }

    if (user.analytics.totalSessions >= 20) {
      insights.push('Frequent visitor');
    }

    if (user.brandInteractions.length > 3) {
      insights.push('Engages with multiple brands');
    }

    const daysSinceLastActive = Math.floor(
      (Date.now() - user.analytics.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActive <= 7) {
      insights.push('Recently active');
    } else if (daysSinceLastActive > 30) {
      insights.push('May be becoming inactive');
    }

    return insights;
  }

  private generateEngagementRecommendations(user: IUser, tier: string): string[] {
    const recommendations: string[] = [];

    switch (tier) {
      case 'low':
        recommendations.push('Send personalized onboarding emails');
        recommendations.push('Highlight popular voting campaigns');
        recommendations.push('Offer voting incentives');
        break;
      case 'medium':
        recommendations.push('Share voting results and impact');
        recommendations.push('Recommend similar products to vote on');
        break;
      case 'high':
        recommendations.push('Invite to exclusive voting previews');
        recommendations.push('Ask for feedback on platform improvements');
        break;
      case 'champion':
        recommendations.push('Consider for beta testing new features');
        recommendations.push('Invite to brand advisory panels');
        recommendations.push('Offer referral rewards');
        break;
    }

    return recommendations;
  }

  private mapToSummary(user: IUser): UserSummary {
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profilePictureUrl: user.profilePictureUrl,
      isEmailVerified: user.isEmailVerified,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      analytics: {
        totalVotes: user.analytics.totalVotes,
        totalSessions: user.analytics.totalSessions,
        engagementScore: user.analytics.engagementScore,
        lastActiveAt: user.analytics.lastActiveAt,
        isActive: user.isActive
      },
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  // ===== Controller-extracted helper functions =====

  public generateLoginSuggestions(user: any): string[] {
    const suggestions: string[] = [];
    
    if (user.analytics.totalVotes === 0) {
      suggestions.push('Cast your first vote to get started');
    }
    
    if (user.analytics.totalVotes < 5) {
      suggestions.push('Explore trending product proposals');
    }
    
    return suggestions;
  }

  public getRelevantAnnouncements(user: any): string[] {
    return [
      'New brands have joined the platform',
      'Your votes from last month influenced 3 products',
      'Check out the latest voting campaigns'
    ];
  }

  public generateProfileRecommendations(user: any, insights: any): string[] {
    const recommendations: string[] = [];
    
    if (!user.firstName) {
      recommendations.push('Add your name for a personalized experience');
    }
    
    if (!user.profilePictureUrl) {
      recommendations.push('Upload a profile picture');
    }
    
    if (insights.tier === 'low') {
      recommendations.push('Start voting to increase your engagement');
    }
    
    return recommendations;
  }

  public generateUpdateImpact(changes: string[]): string[] {
    const impact: string[] = [];
    
    if (changes.includes('preferences')) {
      impact.push('Notification settings updated');
    }
    
    if (changes.includes('firstName') || changes.includes('lastName')) {
      impact.push('Profile display name updated');
    }
    
    return impact;
  }

  public generatePostVoteActions(user: any, businessId: string): string[] {
    return [
      'See how your vote compares to others',
      'Explore more products from this brand',
      'Share your voting experience',
      'Check voting results when available'
    ];
  }

  public calculateAverageVotesPerMonth(user: any): number {
    const monthsActive = Math.max(1, Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    return Math.round(user.analytics.totalVotes / monthsActive * 10) / 10;
  }

  public findMostActiveMonth(votes: any[]): string | null {
    if (!votes.length) return null;
    
    const monthCounts: Record<string, number> = {};
    votes.forEach(vote => {
      const month = new Date(vote.votedAt).toISOString().substring(0, 7);
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    const mostActive = Object.entries(monthCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostActive ? mostActive[0] : null;
  }

  public generateVotingInsights(votes: any[], stats: any): string[] {
    const insights: string[] = [];
    
    if (stats.totalVotes > 10) {
      insights.push('You\'re an active voter!');
    }
    
    if (votes.length > 0) {
      const recentVotes = votes.filter(v => 
        Date.now() - new Date(v.votedAt).getTime() < 7 * 24 * 60 * 60 * 1000
      );
      if (recentVotes.length > 0) {
        insights.push(`You've voted ${recentVotes.length} times this week`);
      }
    }
    
    return insights;
  }

  public analyzeUserDistribution(users: any[]): any {
    const distribution = {
      byStatus: {} as Record<string, number>,
      byEngagement: { low: 0, medium: 0, high: 0 },
      verified: 0,
      unverified: 0
    };
    
    users.forEach(user => {
      distribution.byStatus[user.status] = (distribution.byStatus[user.status] || 0) + 1;
      
      if (user.isEmailVerified) distribution.verified++;
      else distribution.unverified++;
      
      if (user.analytics.totalVotes === 0) distribution.byEngagement.low++;
      else if (user.analytics.totalVotes < 10) distribution.byEngagement.medium++;
      else distribution.byEngagement.high++;
    });
    
    return distribution;
  }

  public analyzeEngagementLevels(users: any[]): any {
    const totalUsers = users.length;
    if (totalUsers === 0) return { average: 0, distribution: {} };
    
    const totalVotes = users.reduce((sum, user) => sum + user.analytics.totalVotes, 0);
    
    return {
      averageVotesPerUser: Math.round(totalVotes / totalUsers * 10) / 10,
      highlyEngaged: users.filter(u => u.analytics.totalVotes >= 10).length,
      moderatelyEngaged: users.filter(u => u.analytics.totalVotes >= 1 && u.analytics.totalVotes < 10).length,
      lowEngagement: users.filter(u => u.analytics.totalVotes === 0).length
    };
  }

  public generateUserTrends(users: any[]): any {
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const newUsers = users.filter(u => new Date(u.createdAt) >= lastMonth).length;
    const activeUsers = users.filter(u => new Date(u.analytics.lastActiveAt) >= lastMonth).length;
    
    return {
      newUsersLastMonth: newUsers,
      activeUsersLastMonth: activeUsers,
      growthRate: users.length > 0 ? Math.round((newUsers / users.length) * 100) : 0
    };
  }

  public calculatePlatformHealth(analytics: any): { score: number; status: string } {
    let score = 100;
    
    if (analytics.overview.averageVotesPerUser < 2) score -= 20;
    if (analytics.growth.growthRate < 5) score -= 15;
    if (analytics.growth.retentionRate < 70) score -= 25;
    
    const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';
    return { score, status };
  }

  public generateAnalyticsRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];
    
    if (analytics.overview.averageVotesPerUser < 2) {
      recommendations.push('Focus on increasing user engagement');
    }
    
    if (analytics.growth.retentionRate < 70) {
      recommendations.push('Improve user retention strategies');
    }
    
    return recommendations;
  }

  public generateAnalyticsAlerts(analytics: any): string[] {
    const alerts: string[] = [];
    
    if (analytics.growth.growthRate < 0) {
      alerts.push('User growth is negative');
    }
    
    if (analytics.engagement.lowEngagement > analytics.engagement.highlyEngaged) {
      alerts.push('More users have low engagement than high engagement');
    }
    
    return alerts;
  }

  public generateBenchmarks(analytics: any, period: string): any {
    return {
      industry: {
        averageVotesPerUser: 3.2,
        retentionRate: 75,
        engagementRate: 45
      },
      platform: {
        averageVotesPerUser: analytics.overview.averageVotesPerUser,
        retentionRate: analytics.growth.retentionRate,
        engagementRate: analytics.engagement.engagementRate
      },
      period
    };
  }

  public analyzeSearchResults(users: any[], query: string): string {
    if (users.length === 0) return 'no-matches';
    if (users.length < 5) return 'few-matches';
    return 'good-matches';
  }

  public generateSearchSuggestions(query: string, resultCount: number): string[] {
    const suggestions: string[] = [];
    
    if (resultCount === 0) {
      suggestions.push('Try searching with different keywords');
      suggestions.push('Check spelling and try again');
    }
    
    return suggestions;
  }

  public generateRelatedSearches(query: string): string[] {
    return [
      `${query} active users`,
      `${query} recent votes`,
      `${query} engagement`
    ];
  }
}