import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ===== TYPES =====

type UserOccupation = 'Brand' | 'Manufacturer' | 'Creator';
type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
type VotingSource = 'web' | 'mobile' | 'api' | 'widget';

interface BaseUser {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  country: string;
  occupation: UserOccupation;
  businessWebsite?: string;
  businessAddress?: string;
  businessNumber?: string;
  isEmailVerified: boolean;
  status: UserStatus;
  profilePictureUrl?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

// ✅ FIXED: Brand and Creator users have SAME interface and functionalities
interface BrandLikeUser extends BaseUser {
  occupation: 'Brand' | 'Creator'; // Both use same structure
  brandSettings?: {
    businessId: string;
    planType: 'foundation' | 'growth' | 'premium' | 'enterprise';
    isActive: boolean;
    certificatesIssued: number;
    votingProposals: number;
    connectedManufacturers: number;
  };
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    votingReminders: boolean;
    certificateAlerts: boolean;
    manufacturerUpdates: boolean;
  };
  analytics: {
    dashboardViews: number;
    lastDashboardView?: string;
    averageSessionDuration: number;
    mostUsedFeatures: string[];
    engagementScore: number;
  };
  // Creator-specific fields (optional, only for creators)
  creatorProfile?: {
    contentTypes: string[];
    platforms: string[];
    followerCount: number;
    engagementRate: number;
    portfolioItems: number;
    collaborations: number;
  };
}

interface ManufacturerUser extends BaseUser {
  occupation: 'Manufacturer';
  manufacturerProfile?: {
    id: string;
    industry: string;
    isVerified: boolean;
    servicesOffered: string[];
    specializations: string[];
    minimumOrderQuantity?: number;
    leadTime?: string;
    connectedBrands: number;
    profileCompleteness: number;
  };
  businessMetrics: {
    totalOrders: number;
    averageOrderValue: number;
    fulfillmentRate: number;
    customerSatisfaction: number;
    responseTime: number;
  };
}

// ✅ FIXED: Simplified type union - Brand and Creator are treated the same
type User = BrandLikeUser | ManufacturerUser;

interface UserProfile extends BaseUser {
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    language: string;
    timezone: string;
    dashboardLayout: 'default' | 'compact' | 'detailed';
    autoSave: boolean;
  };
  settings: {
    twoFactorEnabled: boolean;
    loginAlerts: boolean;
    sessionTimeout: number;
    allowedIPs?: string[];
    securityQuestions?: Array<{
      question: string;
      answer: string; // hashed
    }>;
  };
  votingHistory?: {
    totalVotes: number;
    proposalsParticipated: number;
    averageResponseTime: number;
    lastVoteDate?: string;
    votingStreak: number;
    favoriteCategories: string[];
  };
  activityLog: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    iconUrl: string;
    earnedAt: string;
    category: 'voting' | 'engagement' | 'social' | 'milestone';
  }>;
}

interface Vote {
  id: string;
  voteId: string;
  proposalId: string;
  businessId: string;
  businessName: string;
  selectedProductId: string;
  productName: string;
  productImageUrl?: string;
  selectionReason?: string;
  timestamp: string;
  votingSource: VotingSource;
  isVerified: boolean;
  verificationHash?: string;
  blockchainData?: {
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
    batchId?: string;
  };
}

interface UserInteraction {
  id: string;
  type: 'page_view' | 'product_view' | 'vote_submit' | 'share' | 'favorite' | 'comment';
  targetType: 'product' | 'proposal' | 'brand' | 'manufacturer';
  targetId: string;
  targetName?: string;
  metadata?: {
    duration?: number;
    referrer?: string;
    device?: 'desktop' | 'mobile' | 'tablet';
    location?: string;
    engagement?: number;
  };
  timestamp: string;
}

interface UserAnalytics {
  overview: {
    totalVotes: number;
    proposalsParticipated: number;
    favoriteProducts: number;
    socialShares: number;
    accountAge: number; // days
    loginStreak: number;
    engagementScore: number;
  };
  votingStats: {
    averageResponseTime: number; // minutes
    participationRate: number; // percentage
    votingStreak: number;
    lastVoteDate?: string;
    mostActiveHours: number[];
    favoriteCategories: Array<{
      category: string;
      votes: number;
      percentage: number;
    }>;
    influenceScore: number;
  };
  behaviorPatterns: {
    sessionDuration: {
      average: number;
      longest: number;
      sessions: number;
    };
    deviceUsage: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
    timePatterns: {
      mostActiveDay: string;
      mostActiveHour: number;
      weekdayActivity: number;
      weekendActivity: number;
    };
  };
  engagement: {
    totalInteractions: number;
    interactionTypes: Record<string, number>;
    socialActivity: {
      shares: number;
      comments: number;
      likes: number;
    };
    brandAffinity: Array<{
      brandId: string;
      brandName: string;
      interactions: number;
      lastInteraction: string;
    }>;
  };
}

interface UpdateUserProfileRequest {
  fullName?: string;
  businessName?: string;
  businessWebsite?: string;
  businessAddress?: string;
  businessNumber?: string;
  country?: string;
  phone?: string;
  profilePictureUrl?: string;
  timezone?: string;
  language?: string;
  preferences?: Partial<UserProfile['preferences']>;
  settings?: Partial<UserProfile['settings']>;
}

interface SubmitVoteRequest {
  proposalId: string;
  businessId: string;
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  votingSource?: VotingSource;
  metadata?: {
    userAgent?: string;
    referrer?: string;
    deviceType?: string;
    location?: string;
  };
}

interface RecordInteractionRequest {
  type: UserInteraction['type'];
  targetType: UserInteraction['targetType'];
  targetId: string;
  targetName?: string;
  metadata?: UserInteraction['metadata'];
}

interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  occupation?: UserOccupation;
  status?: UserStatus;
  country?: string;
  isEmailVerified?: boolean;
  registeredAfter?: string;
  registeredBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'fullName' | 'votingActivity';
  sortOrder?: 'asc' | 'desc';
}

interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  analytics: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    verifiedUsers: number;
    usersByOccupation: Record<UserOccupation, number>;
    usersByCountry: Record<string, number>;
    engagementMetrics: {
      averageSessionDuration: number;
      averageVotesPerUser: number;
      activeVoters: number;
    };
  };
}

interface UserNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  category: 'voting' | 'system' | 'marketing' | 'security' | 'social';
  isRead: boolean;
  actionRequired?: boolean;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string;
}

// ===== API FUNCTIONS =====

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const usersApi = {
  // Profile management
  getUserProfile: (): Promise<UserProfile> =>
    api.get('/users/profile').then(res => res.data.data || res.data),

  updateUserProfile: (data: UpdateUserProfileRequest): Promise<UserProfile> =>
    api.put('/users/profile', data).then(res => res.data.data || res.data),

  deleteUserAccount: (reason?: string): Promise<{ success: boolean; message: string }> =>
    api.delete('/users/profile', { data: { reason } }).then(res => res.data),

  // User management (Admin/Brand access)
  getUsers: (params?: UserListQuery): Promise<UserListResponse> =>
    api.get('/users', { params }).then(res => res.data),

  getUserById: (userId: string): Promise<User> =>
    api.get(`/users/${userId}`).then(res => res.data.data || res.data),

  updateUserStatus: (userId: string, status: UserStatus, reason?: string): Promise<{ success: boolean; user: User }> =>
    api.put(`/users/${userId}/status`, { status, reason }).then(res => res.data),

  // Voting functionality
  submitVote: (data: SubmitVoteRequest): Promise<{
    success: boolean;
    voteId: string;
    vote: Vote;
    verificationHash?: string;
  }> =>
    api.post('/users/vote', data).then(res => res.data),

  checkVoteStatus: (proposalId: string): Promise<{
    hasVoted: boolean;
    vote?: Vote;
    canVote: boolean;
    reason?: string;
  }> =>
    api.get(`/users/vote/status/${proposalId}`).then(res => res.data.data || res.data),

  getVotingHistory: (params?: {
    page?: number;
    limit?: number;
    proposalId?: string;
    businessId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'timestamp' | 'proposalId';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    votes: Vote[];
    pagination: any;
    analytics: {
      totalVotes: number;
      uniqueProposals: number;
      averageResponseTime: number;
      participationRate: number;
    };
  }> =>
    api.get('/users/voting-history', { params }).then(res => res.data),

  // Interaction tracking
  recordInteraction: (data: RecordInteractionRequest): Promise<{
    success: boolean;
    interactionId: string;
    points?: number;
  }> =>
    api.post('/users/interaction', data).then(res => res.data),

  getInteractionHistory: (params?: {
    page?: number;
    limit?: number;
    type?: UserInteraction['type'];
    targetType?: UserInteraction['targetType'];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    interactions: UserInteraction[];
    pagination: any;
  }> =>
    api.get('/users/interactions', { params }).then(res => res.data),

  // Analytics and insights
  getUserAnalytics: (params?: {
    timeframe?: '7d' | '30d' | '90d' | '1y' | 'all';
    includeComparison?: boolean;
  }): Promise<UserAnalytics> =>
    api.get('/users/analytics', { params }).then(res => res.data),

  getUserInsights: (): Promise<{
    personalizedRecommendations: Array<{
      type: 'product' | 'brand' | 'feature';
      title: string;
      description: string;
      confidence: number;
      actionUrl?: string;
    }>;
    engagementTips: Array<{
      tip: string;
      impact: 'low' | 'medium' | 'high';
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    progressMetrics: {
      votingStreak: number;
      engagementGrowth: number;
      achievementsUnlocked: number;
      nextMilestone?: {
        title: string;
        description: string;
        progress: number;
        target: number;
      };
    };
  }> =>
    api.get('/users/insights').then(res => res.data),

  // Notifications
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    category?: UserNotification['category'];
    isRead?: boolean;
    type?: UserNotification['type'];
  }): Promise<{
    notifications: UserNotification[];
    pagination: any;
    unreadCount: number;
  }> =>
    api.get('/users/notifications', { params }).then(res => res.data),

  markNotificationRead: (notificationId: string): Promise<{ success: boolean }> =>
    api.put(`/users/notifications/${notificationId}/read`).then(res => res.data),

  markAllNotificationsRead: (): Promise<{ success: boolean; updatedCount: number }> =>
    api.put('/users/notifications/read-all').then(res => res.data),

  deleteNotification: (notificationId: string): Promise<{ success: boolean }> =>
    api.delete(`/users/notifications/${notificationId}`).then(res => res.data),

  // Settings and preferences
  getUserSettings: (): Promise<UserProfile['settings'] & UserProfile['preferences']> =>
    api.get('/users/settings').then(res => res.data.data || res.data),

  updateUserSettings: (settings: Partial<UserProfile['settings'] & UserProfile['preferences']>): Promise<{
    success: boolean;
    settings: UserProfile['settings'] & UserProfile['preferences'];
  }> =>
    api.put('/users/settings', settings).then(res => res.data),

  updateNotificationSettings: (preferences: Partial<UserProfile['preferences']>): Promise<{
    success: boolean;
    preferences: UserProfile['preferences'];
  }> =>
    api.put('/users/settings/notifications', preferences).then(res => res.data),

  updatePrivacySettings: (settings: {
    profileVisibility?: 'public' | 'private' | 'limited';
    showVotingHistory?: boolean;
    allowDataCollection?: boolean;
    marketingConsent?: boolean;
    thirdPartySharing?: boolean;
  }): Promise<{ success: boolean; settings: any }> =>
    api.put('/users/settings/privacy', settings).then(res => res.data),

  updateSecuritySettings: (settings: {
    twoFactorEnabled?: boolean;
    loginAlerts?: boolean;
    sessionTimeout?: number;
    allowedIPs?: string[];
  }): Promise<{ success: boolean; settings: any }> =>
    api.put('/users/settings/security', settings).then(res => res.data),

  // Security
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> =>
    api.post('/users/settings/password', data).then(res => res.data),

  setupTwoFactor: (): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> =>
    api.post('/users/settings/two-factor/setup').then(res => res.data),

  verifyTwoFactorSetup: (code: string): Promise<{
    success: boolean;
    backupCodes: string[];
  }> =>
    api.post('/users/settings/two-factor/verify', { code }).then(res => res.data),

  disableTwoFactor: (password: string, code: string): Promise<{ success: boolean; message: string }> =>
    api.post('/users/settings/two-factor/disable', { password, code }).then(res => res.data),

  getBackupCodes: (): Promise<{ backupCodes: string[] }> =>
    api.get('/users/settings/two-factor/backup-codes').then(res => res.data),

  regenerateBackupCodes: (): Promise<{ backupCodes: string[] }> =>
    api.post('/users/settings/two-factor/backup-codes/regenerate').then(res => res.data),

  // Activity and audit
  getActivityLog: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    activities: UserProfile['activityLog'];
    pagination: any;
  }> =>
    api.get('/users/activity', { params }).then(res => res.data),

  getLoginHistory: (params?: { page?: number; limit?: number }): Promise<{
    logins: Array<{
      id: string;
      timestamp: string;
      ipAddress: string;
      userAgent: string;
      location?: string;
      success: boolean;
      method: 'password' | 'two_factor' | 'backup_code';
    }>;
    pagination: any;
  }> =>
    api.get('/users/login-history', { params }).then(res => res.data),

  // Achievements and gamification
  getAchievements: (): Promise<{
    achievements: UserProfile['achievements'];
    available: Array<{
      id: string;
      title: string;
      description: string;
      iconUrl: string;
      category: string;
      progress: number;
      target: number;
      reward?: string;
    }>;
    stats: {
      totalEarned: number;
      totalAvailable: number;
      categories: Record<string, number>;
    };
  }> =>
    api.get('/users/achievements').then(res => res.data),

  // Data export and privacy
  exportUserData: (): Promise<Blob> =>
    api.get('/users/export', { responseType: 'blob' }).then(res => res.data),

  requestDataDeletion: (reason: string, confirmPassword: string): Promise<{
    success: boolean;
    deletionId: string;
    scheduledDate: string;
  }> =>
    api.post('/users/request-deletion', { reason, confirmPassword }).then(res => res.data),

  cancelDataDeletion: (deletionId: string, password: string): Promise<{ success: boolean; message: string }> =>
    api.post('/users/cancel-deletion', { deletionId, password }).then(res => res.data),
};

// ===== HOOKS =====

/**
 * Get current user profile
 */
export function useUserProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: usersApi.getUserProfile,
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Update user profile
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updateUserProfile,
    onSuccess: (updatedProfile) => {
      // Update profile cache
      queryClient.setQueryData(['user', 'profile'], updatedProfile);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'insights'] });
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
    },
  });
}

/**
 * Delete user account
 */
export function useDeleteUserAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.deleteUserAccount,
    onSuccess: () => {
      // Clear all user-related cache
      queryClient.clear();
      
      // Redirect to login or home page
      localStorage.removeItem('token');
    },
    onError: (error) => {
      console.error('Account deletion failed:', error);
    },
  });
}

/**
 * Get users list (Admin/Brand access)
 */
export function useUsers(params?: UserListQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['users', 'list', params],
    queryFn: () => usersApi.getUsers(params),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

/**
 * Get user by ID
 */
export function useUserById(userId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => usersApi.getUserById(userId!),
    enabled: (options?.enabled ?? true) && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update user status (Admin)
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string; status: UserStatus; reason?: string }) =>
      usersApi.updateUserStatus(userId, status, reason),
    onSuccess: (_, variables) => {
      // Invalidate user cache
      queryClient.invalidateQueries({ queryKey: ['users', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
    onError: (error) => {
      console.error('User status update failed:', error);
    },
  });
}

/**
 * Submit vote
 */
export function useSubmitVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.submitVote,
    onSuccess: (_, variables) => {
      // Invalidate voting-related queries
      queryClient.invalidateQueries({ queryKey: ['user', 'voting-history'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'vote-status', variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ['user', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
    onError: (error) => {
      console.error('Vote submission failed:', error);
    },
  });
}

/**
 * Check vote status for proposal
 */
export function useVoteStatus(proposalId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['user', 'vote-status', proposalId],
    queryFn: () => usersApi.checkVoteStatus(proposalId!),
    enabled: (options?.enabled ?? true) && !!proposalId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get voting history
 */
export function useVotingHistory(
  params?: {
    page?: number;
    limit?: number;
    proposalId?: string;
    businessId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'timestamp' | 'proposalId';
    sortOrder?: 'asc' | 'desc';
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['user', 'voting-history', params],
    queryFn: () => usersApi.getVotingHistory(params),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

/**
 * Record user interaction
 */
export function useRecordInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.recordInteraction,
    onSuccess: () => {
      // Invalidate analytics and insights
      queryClient.invalidateQueries({ queryKey: ['user', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'insights'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'interactions'] });
    },
    // Don't show errors for interaction tracking as it's background
    onError: () => {}, 
  });
}

/**
 * Get interaction history
 */
export function useInteractionHistory(
  params?: {
    page?: number;
    limit?: number;
    type?: UserInteraction['type'];
    targetType?: UserInteraction['targetType'];
    dateFrom?: string;
    dateTo?: string;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['user', 'interactions', params],
    queryFn: () => usersApi.getInteractionHistory(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
}

/**
 * Get user analytics
 */
export function useUserAnalytics(
  params?: {
    timeframe?: '7d' | '30d' | '90d' | '1y' | 'all';
    includeComparison?: boolean;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['user', 'analytics', params],
    queryFn: () => usersApi.getUserAnalytics(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get personalized user insights
 */
export function useUserInsights(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['user', 'insights'],
    queryFn: usersApi.getUserInsights,
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get user notifications
 */
export function useUserNotifications(
  params?: {
    page?: number;
    limit?: number;
    category?: UserNotification['category'];
    isRead?: boolean;
    type?: UserNotification['type'];
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['user', 'notifications', params],
    queryFn: () => usersApi.getNotifications(params),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000, // 30 seconds
    keepPreviousData: true,
  });
}

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.markNotificationRead,
    onSuccess: () => {
      // Refresh notifications
      queryClient.invalidateQueries({ queryKey: ['user', 'notifications'] });
    },
    onError: (error) => {
      console.error('Mark notification read failed:', error);
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.markAllNotificationsRead,
    onSuccess: () => {
      // Refresh notifications
      queryClient.invalidateQueries({ queryKey: ['user', 'notifications'] });
    },
    onError: (error) => {
      console.error('Mark all notifications read failed:', error);
    },
  });
}

/**
 * Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.deleteNotification,
    onSuccess: () => {
      // Refresh notifications
      queryClient.invalidateQueries({ queryKey: ['user', 'notifications'] });
    },
    onError: (error) => {
      console.error('Delete notification failed:', error);
    },
  });
}

/**
 * Get user settings
 */
export function useUserSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['user', 'settings'],
    queryFn: usersApi.getUserSettings,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update user settings
 */
export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updateUserSettings,
    onSuccess: () => {
      // Update settings cache
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
    onError: (error) => {
      console.error('Settings update failed:', error);
    },
  });
}

/**
 * Update notification settings
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
    onError: (error) => {
      console.error('Notification settings update failed:', error);
    },
  });
}

/**
 * Update privacy settings
 */
export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updatePrivacySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
    onError: (error) => {
      console.error('Privacy settings update failed:', error);
    },
  });
}

/**
 * Update security settings
 */
export function useUpdateSecuritySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updateSecuritySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
    },
    onError: (error) => {
      console.error('Security settings update failed:', error);
    },
  });
}

/**
 * Change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: usersApi.changePassword,
    onError: (error) => {
      console.error('Password change failed:', error);
    },
  });
}

/**
 * Setup two-factor authentication
 */
export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: usersApi.setupTwoFactor,
    onError: (error) => {
      console.error('Two-factor setup failed:', error);
    },
  });
}

/**
 * Verify two-factor setup
 */
export function useVerifyTwoFactorSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.verifyTwoFactorSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
    onError: (error) => {
      console.error('Two-factor verification failed:', error);
    },
  });
}

/**
 * Disable two-factor authentication
 */
export function useDisableTwoFactor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ password, code }: { password: string; code: string }) =>
      usersApi.disableTwoFactor(password, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
    onError: (error) => {
      console.error('Two-factor disable failed:', error);
    },
  });
}

/**
 * Get backup codes
 */
export function useBackupCodes(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['user', 'backup-codes'],
    queryFn: usersApi.getBackupCodes,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Regenerate backup codes
 */
export function useRegenerateBackupCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.regenerateBackupCodes,
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'backup-codes'], data);
    },
    onError: (error) => {
      console.error('Backup codes regeneration failed:', error);
    },
  });
}

/**
 * Get activity log
 */
export function useActivityLog(
  params?: {
    page?: number;
    limit?: number;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['user', 'activity', params],
    queryFn: () => usersApi.getActivityLog(params),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

/**
 * Get login history
 */
export function useLoginHistory(
  params?: { page?: number; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['user', 'login-history', params],
    queryFn: () => usersApi.getLoginHistory(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
}

/**
 * Get achievements
 */
export function useAchievements(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['user', 'achievements'],
    queryFn: usersApi.getAchievements,
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Export user data
 */
export function useExportUserData() {
  return useMutation({
    mutationFn: usersApi.exportUserData,
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-data-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Data export failed:', error);
    },
  });
}

/**
 * Request data deletion (GDPR)
 */
export function useRequestDataDeletion() {
  return useMutation({
    mutationFn: ({ reason, confirmPassword }: { reason: string; confirmPassword: string }) =>
      usersApi.requestDataDeletion(reason, confirmPassword),
    onError: (error) => {
      console.error('Data deletion request failed:', error);
    },
  });
}

/**
 * Cancel data deletion
 */
export function useCancelDataDeletion() {
  return useMutation({
    mutationFn: ({ deletionId, password }: { deletionId: string; password: string }) =>
      usersApi.cancelDataDeletion(deletionId, password),
    onError: (error) => {
      console.error('Cancel data deletion failed:', error);
    },
  });
}

/**
 * Comprehensive user status hook
 */
export function useUserStatus() {
  const profile = useUserProfile();
  const analytics = useUserAnalytics({ timeframe: '30d' });
  const notifications = useUserNotifications({ limit: 5, isRead: false });
  const achievements = useAchievements();

  return {
    profile: profile.data,
    analytics: analytics.data,
    notifications: notifications.data,
    achievements: achievements.data,
    isLoading: profile.isLoading || analytics.isLoading,
    error: profile.error || analytics.error,
    
    // Computed values
    isVerified: profile.data?.isEmailVerified ?? false,
    occupation: profile.data?.occupation,
    accountAge: profile.data ? Math.floor((Date.now() - new Date(profile.data.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    
    // Engagement metrics
    engagementScore: analytics.data?.overview.engagementScore || 0,
    votingStreak: analytics.data?.votingStats.votingStreak || 0,
    totalVotes: analytics.data?.overview.totalVotes || 0,
    
    // Status indicators
    hasUnreadNotifications: (notifications.data?.unreadCount || 0) > 0,
    recentAchievements: achievements.data?.achievements.filter(a => 
      new Date(a.earnedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
    ).length || 0,
    
    // Security status
    hasSecurePassword: profile.data?.settings?.twoFactorEnabled ?? false,
    needsProfileCompletion: !profile.data?.businessWebsite || !profile.data?.businessAddress,
    
    // Activity status
    isActiveUser: (analytics.data?.overview.loginStreak || 0) > 0,
    lastActivity: profile.data?.lastLoginAt,
  };
}

/**
 * User dashboard overview
 */
export function useUserDashboard() {
  const status = useUserStatus();
  const insights = useUserInsights();
  const recentVotes = useVotingHistory({ limit: 5, sortBy: 'timestamp', sortOrder: 'desc' });
  
  return useQuery({
    queryKey: ['user', 'dashboard'],
    queryFn: () => {
      if (!status.profile || !insights.data) return null;

      return {
        user: status.profile,
        stats: {
          totalVotes: status.totalVotes,
          votingStreak: status.votingStreak,
          engagementScore: status.engagementScore,
          accountAge: status.accountAge,
          achievementsUnlocked: status.achievements?.achievements.length || 0,
        },
        activity: {
          recentVotes: recentVotes.data?.votes.slice(0, 5) || [],
          recentAchievements: status.achievements?.achievements
            .filter(a => new Date(a.earnedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
            .slice(0, 3) || [],
        },
        insights: insights.data,
        notifications: {
          unread: status.notifications?.unreadCount || 0,
          recent: status.notifications?.notifications.slice(0, 3) || [],
        },
        quickActions: [
          {
            id: 'vote',
            title: 'Vote on Products',
            description: 'Participate in product selection',
            icon: 'vote',
            url: '/voting',
            enabled: true,
          },
          {
            id: 'profile',
            title: 'Complete Profile',
            description: 'Update your business information',
            icon: 'profile',
            url: '/profile',
            enabled: status.needsProfileCompletion,
          },
          {
            id: 'security',
            title: 'Enable 2FA',
            description: 'Secure your account',
            icon: 'security',
            url: '/settings/security',
            enabled: !status.hasSecurePassword,
          },
        ].filter(action => action.enabled),
      };
    },
    enabled: !!status.profile && !!insights.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Real-time user notifications
 */
export function useRealtimeNotifications(enabled: boolean = false) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['user', 'notifications', 'realtime'],
    queryFn: () => usersApi.getNotifications({ limit: 10, isRead: false }),
    enabled,
    refetchInterval: enabled ? 30 * 1000 : false, // 30 seconds
    refetchIntervalInBackground: true,
    onSuccess: (data) => {
      // Update notifications cache
      queryClient.setQueryData(['user', 'notifications'], data);
    },
  });
}

/**
 * User role-based access control - FIXED to treat Creators same as Brands
 */
export function useUserPermissions() {
  const { profile } = useUserStatus();

  return {
    // Role checks - FIXED: isBrandLike includes both Brand and Creator
    isBrand: profile?.occupation === 'Brand',
    isCreator: profile?.occupation === 'Creator', 
    isBrandLike: profile?.occupation === 'Brand' || profile?.occupation === 'Creator', // ✅ NEW: Combined check
    isManufacturer: profile?.occupation === 'Manufacturer',
    
    // Feature access based on role - FIXED: Creators have same access as Brands
    canVote: !!profile, // All authenticated users can vote
    canCreateProposals: profile?.occupation === 'Brand' || profile?.occupation === 'Creator', // ✅ FIXED
    canViewAnalytics: profile?.occupation === 'Brand' || profile?.occupation === 'Creator' || profile?.occupation === 'Manufacturer', // ✅ FIXED  
    canManageProducts: profile?.occupation === 'Brand' || profile?.occupation === 'Creator', // ✅ FIXED
    canManageCertificates: profile?.occupation === 'Brand' || profile?.occupation === 'Creator', // ✅ FIXED
    canManageIntegrations: profile?.occupation === 'Brand' || profile?.occupation === 'Creator', // ✅ FIXED
    canManageDomains: profile?.occupation === 'Brand' || profile?.occupation === 'Creator', // ✅ FIXED
    canViewOrders: profile?.occupation === 'Manufacturer',
    canCreateContent: profile?.occupation === 'Creator', // Creator-specific feature
    
    // Admin-like permissions based on verification status
    isVerifiedUser: profile?.isEmailVerified ?? false,
    hasAdvancedFeatures: profile?.status === 'active' && profile?.isEmailVerified,
    
    // Route access helpers - FIXED: Creators get same routes as Brands
    getAccessibleRoutes: () => {
      if (!profile) return [];
      
      const baseRoutes = ['/dashboard', '/profile', '/settings', '/voting'];
      
      switch (profile.occupation) {
        case 'Brand':
        case 'Creator': // ✅ FIXED: Same routes as Brand
          return [...baseRoutes, '/products', '/certificates', '/integrations', '/analytics', '/domains'];
        case 'Manufacturer':
          return [...baseRoutes, '/orders', '/production', '/brands', '/analytics'];
        default:
          return baseRoutes;
      }
    },
    
    // Get dashboard path - FIXED: Creators use same dashboard as Brands
    getDashboardPath: () => {
      if (!profile) return '/auth/login';
      
      switch (profile.occupation) {
        case 'Brand':
        case 'Creator': // ✅ FIXED: Same dashboard
          return '/dashboard';
        case 'Manufacturer':
          return '/manufacturer/dashboard';
        default:
          return '/dashboard';
      }
    },
    
    // Permission helpers
    hasPermission: (permission: string) => {
      const permissions = (profile as any)?.permissions || [];
      return permissions.includes(permission) || permissions.includes('*');
    },

    // User type for API calls - NEW helper
    getUserApiType: (): 'brand' | 'manufacturer' | null => {
      if (!profile) return null;
      
      // Both Brand and Creator use 'brand' API endpoints
      if (profile.occupation === 'Brand' || profile.occupation === 'Creator') {
        return 'brand';
      }
      if (profile.occupation === 'Manufacturer') {
        return 'manufacturer';
      }
      
      return null;
    },
  };
}

/**
 * Auto-save user interactions (fire-and-forget)
 */
export function useAutoTrackInteraction() {
  const recordInteraction = useRecordInteraction();
  
  const trackInteraction = (data: RecordInteractionRequest) => {
    // Fire and forget - don't wait for response
    recordInteraction.mutate(data);
  };
  
  return {
    trackPageView: (targetId: string, targetName?: string) => {
      trackInteraction({
        type: 'page_view',
        targetType: 'product', // Default, can be overridden
        targetId,
        targetName,
        metadata: {
          referrer: document.referrer,
          device: window.innerWidth > 768 ? 'desktop' : 'mobile',
        },
      });
    },
    
    trackProductView: (productId: string, productName: string, duration?: number) => {
      trackInteraction({
        type: 'product_view',
        targetType: 'product',
        targetId: productId,
        targetName: productName,
        metadata: { duration },
      });
    },
    
    trackVoteSubmit: (proposalId: string, selectedProductId: string) => {
      trackInteraction({
        type: 'vote_submit',
        targetType: 'proposal',
        targetId: proposalId,
        metadata: { selectedProductId },
      });
    },
    
    trackShare: (targetType: UserInteraction['targetType'], targetId: string, platform?: string) => {
      trackInteraction({
        type: 'share',
        targetType,
        targetId,
        metadata: { platform },
      });
    },
  };
}