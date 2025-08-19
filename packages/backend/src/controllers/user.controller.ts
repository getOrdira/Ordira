// src/controllers/user.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { UserService } from '../services/business/user.service';
import { AuthService } from '../services/business/auth.service';

// Initialize services
const userService = new UserService();
const authService = new AuthService();

/**
 * Extended request interfaces for type safety
 */
interface UserAuthRequest extends AuthRequest {
  userType?: 'user' | 'business';
}

interface UserRegisterRequest extends ValidatedRequest {
  validatedBody: {
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
  };
}

interface UserLoginRequest extends ValidatedRequest {
  validatedBody: {
    email: string;
    password: string;
    rememberMe?: boolean;
  };
}

interface UserVerifyRequest extends ValidatedRequest {
  validatedBody: {
    email: string;
    emailCode: string;
  };
}

interface UserUpdateRequest extends UserAuthRequest, ValidatedRequest {
  validatedBody: {
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
    preferences?: any;
  };
}

interface UserVoteRequest extends UserAuthRequest, ValidatedRequest {
  validatedBody: {
    proposalId: string;
    businessId: string;
    productId?: string;
    vote: 'yes' | 'no' | 'abstain';
  };
}

interface UserListRequest extends ValidatedRequest {
  validatedQuery: {
    status?: 'active' | 'inactive' | 'suspended' | 'deleted';
    isEmailVerified?: boolean;
    hasVoted?: boolean;
    businessId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'lastLoginAt' | 'totalVotes' | 'engagementScore';
    sortOrder?: 'asc' | 'desc';
    dateFrom?: string;
    dateTo?: string;
  };
}

interface UserAnalyticsRequest extends ValidatedRequest {
  validatedQuery: {
    businessId?: string;
    period?: '7d' | '30d' | '90d' | '1y';
  };
}

// ====================
// AUTHENTICATION ENDPOINTS
// ====================

/**
 * Register a new customer user
 * POST /api/users/register
 */
export const registerUser = asyncHandler(async (
  req: UserRegisterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const registrationData = req.validatedBody;

  // Validate password strength
  if (registrationData.password.length < 8) {
    throw createAppError('Password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
  }

  // Create user through service
  const user = await userService.createUser(registrationData);

  // Send verification email through auth service
  await authService.registerUser({
    email: registrationData.email,
    password: registrationData.password
  });

  // Generate welcome recommendations
  const recommendations = [
    'Verify your email to start voting',
    'Explore brands and their products',
    'Cast your first vote to influence production',
    'Set up your preferences for a personalized experience'
  ];

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email for verification code.',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified
      },
      nextSteps: recommendations,
      verificationRequired: true,
      registeredAt: new Date().toISOString()
    }
  });
});

/**
 * Verify user email with verification code
 * POST /api/users/verify
 */
export const verifyUser = asyncHandler(async (
  req: UserVerifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, emailCode } = req.validatedBody;

  // Verify through auth service
  const result = await authService.verifyUser({ email, code: emailCode });

  // Get user details after verification
  const user = await userService.getUserByEmail(email);

  res.json({
    success: true,
    message: 'Email verification successful',
    data: {
      token: result.token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: true,
        verifiedAt: new Date().toISOString()
      },
      features: {
        voting: 'You can now vote on product proposals',
        profiles: 'Access to brand and product pages',
        history: 'Track your voting history and impact'
      },
      expiresIn: '7 days'
    }
  });
});

/**
 * Login user with email and password
 * POST /api/users/login
 */
export const loginUser = asyncHandler(async (
  req: UserLoginRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password, rememberMe } = req.validatedBody;

  // Login through auth service
  const result = await authService.loginUser({ email, password, rememberMe });

  // Get comprehensive user data
  const user = await userService.getUserByEmail(email);

  // Record login session
  await userService.recordSession(user.id, {
    deviceInfo: req.get('User-Agent'),
    ipAddress: req.ip
  });

  // Generate personalized dashboard data
  const dashboardData = {
    recentVotes: await userService.getUserVotingHistory(user.id, { limit: 5 }),
    suggestions: generateLoginSuggestions(user),
    announcements: getRelevantAnnouncements(user)
  };

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token: result.token,
      rememberToken: result.rememberToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        profilePictureUrl: user.profilePictureUrl,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        analytics: user.analytics
      },
      dashboard: dashboardData,
      session: {
        expiresIn: rememberMe ? '30 days' : '7 days',
        loginAt: new Date().toISOString()
      }
    }
  });
});

// ====================
// USER PROFILE ENDPOINTS
// ====================

/**
 * Get current user profile
 * GET /api/users/profile
 */
export const getUserProfile = asyncHandler(async (
  req: UserAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId!;

  // Get comprehensive user data
  const [user, engagementInsights] = await Promise.all([
    userService.getUserById(userId),
    userService.getUserEngagementInsights(userId)
  ]);

  // Get recent activity summary
  const recentActivity = {
    votingHistory: await userService.getUserVotingHistory(userId, { limit: 10 }),
    sessionStats: {
      totalSessions: user.analytics.totalSessions,
      lastActive: user.analytics.lastActiveAt,
      engagementTier: engagementInsights.tier
    }
  };

  res.json({
    success: true,
    message: 'User profile retrieved successfully',
    data: {
      user,
      insights: engagementInsights,
      activity: recentActivity,
      recommendations: generateProfileRecommendations(user, engagementInsights),
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Update user profile
 * PUT /api/users/profile
 */
export const updateUserProfile = asyncHandler(async (
  req: UserUpdateRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId!;
  const updateData = req.validatedBody;

  if (Object.keys(updateData).length === 0) {
    throw createAppError('No update data provided', 400, 'EMPTY_UPDATE_DATA');
  }

  // Update user profile
  const updatedUser = await userService.updateUser(userId, updateData);

  // Analyze what changed
  const changes = Object.keys(updateData);
  const impact = generateUpdateImpact(changes);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser,
      changes: {
        updated: changes,
        impact
      },
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Delete user account
 * DELETE /api/users/profile
 */
export const deleteUserAccount = asyncHandler(async (
  req: UserAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId!;

  // Get user before deletion for final summary
  const user = await userService.getUserById(userId);

  // Delete user account (soft delete)
  const result = await userService.deleteUser(userId, 'User requested account deletion');

  // Generate deletion summary
  const deletionSummary = {
    accountActive: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    totalVotes: user.analytics.totalVotes,
    impactMade: user.analytics.totalVotes > 0 ? 'Your votes helped influence product decisions' : 'Thank you for being part of our community',
    dataRetention: '90 days for legal compliance',
    reactivation: 'Contact support within 30 days to reactivate'
  };

  res.json({
    success: true,
    message: 'Account deleted successfully',
    data: {
      deleted: result.deleted,
      deletedAt: result.deletedAt,
      summary: deletionSummary,
      support: {
        email: 'support@platform.com',
        reactivationPeriod: '30 days',
        dataExport: 'Available upon request before deletion'
      }
    }
  });
});

// ====================
// VOTING ENDPOINTS
// ====================

/**
 * Submit a vote for a proposal
 * POST /api/users/vote
 */
export const submitVote = asyncHandler(async (
  req: UserVoteRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId!;
  const voteData = req.validatedBody;

  // Add request metadata to vote
  const enrichedVoteData = {
    ...voteData,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  // Check vote eligibility first
  const voteStatus = await userService.checkVoteStatus(userId, voteData.proposalId);
  if (voteStatus.hasVoted) {
    throw createAppError('You have already voted on this proposal', 409, 'ALREADY_VOTED');
  }

  // Record the vote
  const result = await userService.recordVote(userId, enrichedVoteData);

  // Get updated user analytics
  const user = await userService.getUserById(userId);

  // Generate vote impact analysis
  const impact = {
    personalImpact: `This is vote #${result.totalUserVotes} in your voting journey`,
    engagementBoost: result.totalUserVotes === 1 ? 'Congratulations on your first vote!' : 
                     result.totalUserVotes % 10 === 0 ? `Milestone reached: ${result.totalUserVotes} votes!` : 
                     'Thank you for your continued participation',
    nextActions: generatePostVoteActions(user, voteData.businessId)
  };

  res.json({
    success: true,
    message: 'Vote submitted successfully',
    data: {
      vote: {
        proposalId: voteData.proposalId,
        vote: voteData.vote,
        submittedAt: new Date().toISOString()
      },
      user: {
        totalVotes: result.totalUserVotes,
        engagementScore: user.analytics.engagementScore
      },
      impact,
      voteRecorded: true
    }
  });
});

/**
 * Check user's vote status for a proposal
 * GET /api/users/vote/status/:proposalId
 */
export const checkVoteStatus = asyncHandler(async (
  req: UserAuthRequest & { params: { proposalId: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId!;
  const { proposalId } = req.params;

  if (!proposalId) {
    throw createAppError('Proposal ID is required', 400, 'MISSING_PROPOSAL_ID');
  }

  // Check vote status
  const voteStatus = await userService.checkVoteStatus(userId, proposalId);

  // Get voting eligibility info
  const user = await userService.getUserById(userId);
  const eligibility = {
    canVote: user.status === 'active' && user.isEmailVerified,
    reasons: [] as string[]
  };

  if (!user.isEmailVerified) {
    eligibility.reasons.push('Email verification required');
  }
  if (user.status !== 'active') {
    eligibility.reasons.push('Account not active');
  }
  if (voteStatus.hasVoted) {
    eligibility.reasons.push('Already voted on this proposal');
  }

  res.json({
    success: true,
    message: 'Vote status retrieved successfully',
    data: {
      proposalId,
      voteStatus: {
        hasVoted: voteStatus.hasVoted,
        vote: voteStatus.vote,
        votedAt: voteStatus.votedAt
      },
      eligibility,
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Get user's voting history
 * GET /api/users/voting-history
 */
export const getVotingHistory = asyncHandler(async (
  req: UserAuthRequest & { query: { businessId?: string; page?: string; limit?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId!;
  const { businessId, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const offset = (pageNum - 1) * limitNum;

  // Get voting history
  const history = await userService.getUserVotingHistory(userId, {
    businessId,
    limit: limitNum,
    offset
  });

  // Get voting statistics
  const user = await userService.getUserById(userId);
  const stats = {
    totalVotes: user.analytics.totalVotes,
    engagementScore: user.analytics.engagementScore,
    averageVotesPerMonth: calculateAverageVotesPerMonth(user),
    mostActiveMonth: findMostActiveMonth(history.votes)
  };

  res.json({
    success: true,
    message: 'Voting history retrieved successfully',
    data: {
      history,
      stats,
      insights: generateVotingInsights(history.votes, stats),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: history.total,
        totalPages: history.totalPages,
        hasNext: pageNum < history.totalPages,
        hasPrev: pageNum > 1
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

// ====================
// ADMIN/MANAGEMENT ENDPOINTS
// ====================

/**
 * List users with filtering and pagination (Admin/Brand access)
 * GET /api/users
 */
export const listUsers = asyncHandler(async (
  req: UserListRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const queryParams = req.validatedQuery;

  // Parse date filters
  const dateFrom = queryParams.dateFrom ? new Date(queryParams.dateFrom) : undefined;
  const dateTo = queryParams.dateTo ? new Date(queryParams.dateTo) : undefined;

  // Build filter options
  const filters = {
    status: queryParams.status,
    isEmailVerified: queryParams.isEmailVerified,
    hasVoted: queryParams.hasVoted,
    businessId: queryParams.businessId,
    search: queryParams.search,
    dateFrom,
    dateTo,
    limit: Math.min(queryParams.limit || 20, 100),
    offset: ((queryParams.page || 1) - 1) * (queryParams.limit || 20),
    sortBy: queryParams.sortBy || 'createdAt',
    sortOrder: queryParams.sortOrder || 'desc'
  };

  // Get users based on whether business filter is applied
  const result = queryParams.businessId 
    ? await userService.getUsersForBusiness(queryParams.businessId, filters)
    : await userService.listUsers(filters);

  // Generate summary insights
  const insights = {
    distribution: analyzeUserDistribution(result.users),
    engagement: analyzeEngagementLevels(result.users),
    trends: generateUserTrends(result.users)
  };

  res.json({
    success: true,
    message: 'Users retrieved successfully',
    data: {
      users: result.users,
      insights,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: filters.limit,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1
      },
      filters: {
        applied: Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        ),
        available: {
          status: ['active', 'inactive', 'suspended', 'deleted'],
          sortBy: ['createdAt', 'lastLoginAt', 'totalVotes', 'engagementScore'],
          sortOrder: ['asc', 'desc']
        }
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Get comprehensive user analytics
 * GET /api/users/analytics
 */
export const getUserAnalytics = asyncHandler(async (
  req: UserAnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { businessId, period = '30d' } = req.validatedQuery;

  // Get comprehensive analytics
  const analytics = await userService.getUserAnalytics(businessId);

  // Generate insights based on analytics
  const insights = {
    healthScore: calculatePlatformHealth(analytics),
    recommendations: generateAnalyticsRecommendations(analytics),
    alerts: generateAnalyticsAlerts(analytics),
    benchmarks: generateBenchmarks(analytics, period)
  };

  res.json({
    success: true,
    message: 'User analytics retrieved successfully',
    data: {
      analytics,
      insights,
      period,
      scope: businessId ? 'business-specific' : 'platform-wide',
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Search users by email, name, or other criteria
 * GET /api/users/search
 */
export const searchUsers = asyncHandler(async (
  req: UserAuthRequest & { query: { q: string; limit?: string; businessId?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { q: query, limit = '20', businessId } = req.query;

  if (!query || query.trim().length < 2) {
    throw createAppError('Search query must be at least 2 characters', 400, 'INVALID_SEARCH_QUERY');
  }

  // Perform search
  const result = await userService.searchUsers(query, {
    limit: Math.min(parseInt(limit), 50),
    businessId
  });

  // Generate search insights
  const searchInsights = {
    matchQuality: analyzeSearchResults(result.users, query),
    suggestions: generateSearchSuggestions(query, result.users.length),
    relatedSearches: generateRelatedSearches(query)
  };

  res.json({
    success: true,
    message: 'User search completed successfully',
    data: {
      results: result.users,
      searchTerm: result.searchTerm,
      insights: searchInsights,
      metadata: {
        total: result.total,
        maxResults: 50,
        searchedAt: new Date().toISOString()
      }
    }
  });
});

/**
 * Record user interaction with brand/product
 * POST /api/users/interaction
 */
export const recordInteraction = asyncHandler(async (
  req: UserAuthRequest & ValidatedRequest & {
    validatedBody: {
      businessId: string;
      type: 'page_view' | 'product_view' | 'vote';
      metadata?: any;
    }
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId!;
  const { businessId, type, metadata } = req.validatedBody;

  // Record the interaction
  await userService.recordBrandInteraction(userId, businessId, type);

  // Record session data if provided
  if (metadata?.sessionDuration) {
    await userService.recordSession(userId, {
      duration: metadata.sessionDuration,
      deviceInfo: req.get('User-Agent'),
      ipAddress: req.ip
    });
  }

  res.json({
    success: true,
    message: 'Interaction recorded successfully',
    data: {
      interaction: {
        type,
        businessId,
        recordedAt: new Date().toISOString()
      },
      tracking: 'Analytics updated'
    }
  });
});

// ====================
// UTILITY ENDPOINTS
// ====================

/**
 * Forgot password - initiate reset process
 * POST /api/users/forgot-password
 */
export const forgotPassword = asyncHandler(async (
  req: ValidatedRequest & { validatedBody: { email: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.validatedBody;

  // Initiate password reset through auth service
  await authService.requestPasswordReset({ email });

  res.json({
    success: true,
    message: 'Password reset instructions sent to your email',
    data: {
      email: email.toLowerCase(),
      nextSteps: [
        'Check your email for reset instructions',
        'Click the reset link within 1 hour',
        'Create a new secure password'
      ],
      requestedAt: new Date().toISOString()
    }
  });
});

/**
 * Reset password with reset token
 * POST /api/users/reset-password
 */
export const resetPassword = asyncHandler(async (
  req: ValidatedRequest & {
    validatedBody: {
      email: string;
      resetCode: string;
      newPassword: string;
    }
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, resetCode, newPassword } = req.validatedBody;

  // Reset password through auth service
  await authService.resetPassword({
    email,
    resetCode,
    newPassword
  });

  res.json({
    success: true,
    message: 'Password reset successfully',
    data: {
      passwordChanged: true,
      changedAt: new Date().toISOString(),
      nextSteps: [
        'Login with your new password',
        'Consider enabling two-factor authentication',
        'Update any saved passwords'
      ]
    }
  });
});

/**
 * Resend verification email
 * POST /api/users/resend-verification
 */
export const resendVerification = asyncHandler(async (
  req: ValidatedRequest & { validatedBody: { email: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.validatedBody;

  // Check if user exists and needs verification
  const user = await userService.getUserByEmail(email);
  
  if (user.isEmailVerified) {
    throw createAppError('Email is already verified', 400, 'ALREADY_VERIFIED');
  }

  // Resend verification through auth service
  await authService.registerUser({ email, password: 'temp' }); // Password not used for resend

  res.json({
    success: true,
    message: 'Verification email sent successfully',
    data: {
      email: email.toLowerCase(),
      resentAt: new Date().toISOString(),
      expiresIn: '24 hours'
    }
  });
});

// ====================
// HELPER FUNCTIONS
// ====================

function generateLoginSuggestions(user: any): string[] {
  const suggestions: string[] = [];
  
  if (user.analytics.totalVotes === 0) {
    suggestions.push('Cast your first vote to get started');
  }
  
  if (user.analytics.totalVotes < 5) {
    suggestions.push('Explore trending product proposals');
  }
  
  return suggestions;
}

function getRelevantAnnouncements(user: any): string[] {
  return [
    'New brands have joined the platform',
    'Your votes from last month influenced 3 products',
    'Check out the latest voting campaigns'
  ];
}

function generateProfileRecommendations(user: any, insights: any): string[] {
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

function generateUpdateImpact(changes: string[]): string[] {
  const impact: string[] = [];
  
  if (changes.includes('preferences')) {
    impact.push('Notification settings updated');
  }
  
  if (changes.includes('firstName') || changes.includes('lastName')) {
    impact.push('Profile display name updated');
  }
  
  return impact;
}

function generatePostVoteActions(user: any, businessId: string): string[] {
  return [
    'See how your vote compares to others',
    'Explore more products from this brand',
    'Share your voting experience',
    'Check voting results when available'
  ];
}

function calculateAverageVotesPerMonth(user: any): number {
  const monthsActive = Math.max(1, Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
  ));
  return Math.round(user.analytics.totalVotes / monthsActive * 10) / 10;
}

function findMostActiveMonth(votes: any[]): string | null {
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

function generateVotingInsights(votes: any[], stats: any): string[] {
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

function analyzeUserDistribution(users: any[]): any {
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

function analyzeEngagementLevels(users: any[]): any {
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

function generateUserTrends(users: any[]): any {
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

function calculatePlatformHealth(analytics: any): { score: number; status: string } {
  let score = 100;
  
  if (analytics.overview.averageVotesPerUser < 2) score -= 20;
  if (analytics.growth.growthRate < 5) score -= 15;
  if (analytics.growth.retentionRate < 70) score -= 25;
  
  const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';
  return { score, status };
}

function generateAnalyticsRecommendations(analytics: any): string[] {
  const recommendations: string[] = [];
  
  if (analytics.overview.averageVotesPerUser < 2) {
    recommendations.push('Focus on increasing user engagement');
  }
  
  if (analytics.growth.retentionRate < 70) {
    recommendations.push('Improve user retention strategies');
  }
  
  return recommendations;
}

function generateAnalyticsAlerts(analytics: any): string[] {
  const alerts: string[] = [];
  
  if (analytics.growth.growthRate < 0) {
    alerts.push('User growth is negative');
  }
  
  if (analytics.engagement.lowEngagement > analytics.engagement.highlyEngaged) {
    alerts.push('More users have low engagement than high engagement');
  }
  
  return alerts;
}

function generateBenchmarks(analytics: any, period: string): any {
  return {
    industry: {
      averageVotesPerUser: 3.2,
      retentionRate: 75,
      engagementRate: 45
    },
    yourPlatform: {
      averageVotesPerUser: analytics.overview.averageVotesPerUser,
      retentionRate: analytics.growth.retentionRate,
      engagementRate: Math.round(
        (analytics.voting.totalVotingUsers / analytics.overview.totalUsers) * 100
      )
    }
  };
}

function analyzeSearchResults(users: any[], query: string): string {
  if (users.length === 0) return 'no-matches';
  if (users.length < 5) return 'few-matches';
  return 'good-matches';
}

function generateSearchSuggestions(query: string, resultCount: number): string[] {
  const suggestions: string[] = [];
  
  if (resultCount === 0) {
    suggestions.push('Try using different keywords');
    suggestions.push('Check spelling');
  }
  
  return suggestions;
}

function generateRelatedSearches(query: string): string[] {
  return [
    `${query} active users`,
    `${query} recent votes`,
    `${query} high engagement`
  ];
}
