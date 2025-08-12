// src/controllers/manufacturer.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ManufacturerAuthRequest } from '../middleware/manufacturerAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { ManufacturerService } from '../services/business/manufacturer.service';

// Initialize service
const manufacturerService = new ManufacturerService();

/**
 * Extended request interfaces for type safety
 */
interface RegisterRequest extends Request, ValidatedRequest {
  validatedBody: {
    name: string;
    email: string;
    password: string;
    industry?: string;
    contactEmail?: string;
    description?: string;
  };
}

interface LoginRequest extends Request, ValidatedRequest {
  validatedBody: {
    email: string;
    password: string;
  };
}

interface UpdateProfileRequest extends ManufacturerAuthRequest, ValidatedRequest {
  validatedBody: {
    name?: string;
    description?: string;
    industry?: string;
    contactEmail?: string;
    servicesOffered?: string[];
    moq?: number;
  };
}

interface ManufacturerBrandRequest extends ManufacturerAuthRequest, ValidatedRequest {
  validatedParams: { brandSettingsId: string };
  query: {
    includeAnalytics?: string;
    timeframe?: string;
  };
}

interface ConnectionRequest extends ManufacturerAuthRequest, ValidatedRequest {
  validatedParams: { brandId: string };
  validatedBody: {
    message?: string;
    services?: string[];
    portfolio?: string;
    proposedServices?: string[];
    timeline?: string;
    budget?: string;
  };
}

interface SearchRequest extends Request, ValidatedRequest {
  query: {
    q?: string;
    industry?: string;
    verified?: string;
    minMoq?: string;
    maxMoq?: string;
    services?: string;
    limit?: string;
    sortBy?: 'relevance' | 'name' | 'completeness' | 'connections';
  };
}

/**
 * Register a new manufacturer account
 * POST /api/manufacturer/register
 * 
 * @requires validation: { name, email, password, industry?, contactEmail?, description? }
 * @returns { token, manufacturerId, profile }
 */
export const register = asyncHandler(async (
  req: RegisterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated registration data
  const registrationData = req.validatedBody;

  // Register manufacturer through service
  const result = await manufacturerService.register(registrationData);

  // Set secure HTTP-only cookie for token
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('mfg_token', result.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Manufacturer account created successfully',
    data: {
      token: result.token,
      manufacturerId: result.manufacturerId,
      profile: result.profile
    },
    nextSteps: [
      'Complete your profile to increase visibility',
      'Verify your email address',
      'Browse available brand partnerships',
      'Upload portfolio and service details'
    ]
  });
});

/**
 * Authenticate manufacturer login
 * POST /api/manufacturer/login
 * 
 * @requires validation: { email, password }
 * @returns { token, manufacturerId, profile }
 */
export const login = asyncHandler(async (
  req: LoginRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated login credentials
  const loginData = req.validatedBody;

  // Authenticate manufacturer through service
  const result = await manufacturerService.login(loginData);

  // Set secure HTTP-only cookie for token
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('mfg_token', result.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token: result.token,
      manufacturerId: result.manufacturerId,
      profile: result.profile
    },
    recommendations: generateLoginRecommendations(result.profile)
  });
});

/**
 * Update manufacturer profile
 * PUT /api/manufacturer/profile
 * 
 * @requires manufacturerAuth
 * @requires validation: profile update data
 * @returns { profile, completeness, recommendations }
 */
export const updateProfile = asyncHandler(async (
  req: UpdateProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const updateData = req.validatedBody;

  // Update profile through service
  const updatedProfile = await manufacturerService.updateProfile(manufacturerId, updateData);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      profile: updatedProfile,
      completeness: updatedProfile.profileCompleteness,
      improvements: generateProfileImprovements(updatedProfile)
    }
  });
});

/**
 * Get manufacturer profile
 * GET /api/manufacturer/profile
 * 
 * @requires manufacturerAuth
 * @returns { profile, stats, recommendations }
 */
export const getProfile = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Get profile through service
  const profile = await manufacturerService.getManufacturerById(manufacturerId);

  res.json({
    success: true,
    data: {
      profile,
      completeness: profile.profileCompleteness,
      recommendations: generateProfileRecommendations(profile),
      nextActions: generateNextActions(profile)
    }
  });
});

/**
 * Get all brands connected to the authenticated manufacturer
 * GET /api/manufacturer/brands
 * 
 * @requires manufacturerAuth
 * @returns { brands[], connectionStats, analytics }
 */
export const listBrandsForManufacturer = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Get connected brands and stats through service
  const [brands, connectionStats] = await Promise.all([
    manufacturerService.listBrandsForManufacturer(manufacturerId),
    manufacturerService.getConnectionStats(manufacturerId)
  ]);

  res.json({
    success: true,
    message: 'Connected brands retrieved successfully',
    data: {
      brands,
      connectionStats,
      pagination: {
        total: brands.length,
        page: 1,
        limit: brands.length
      },
      insights: generateConnectionInsights(brands, connectionStats)
    }
  });
});

/**
 * Get analytics/results for a specific brand
 * GET /api/manufacturer/brands/:brandSettingsId/results
 * 
 * @requires manufacturerAuth
 * @requires params: { brandSettingsId }
 * @returns { results, analytics, metrics }
 */
export const getResultsForBrand = asyncHandler(async (
  req: ManufacturerBrandRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const { brandSettingsId } = req.validatedParams;
  const { includeAnalytics, timeframe } = req.query;

  // Get results through service
  let results;
  if (includeAnalytics === 'true') {
    results = await manufacturerService.getComprehensiveAnalyticsForBrand(manufacturerId, brandSettingsId);
  } else {
    results = await manufacturerService.getResultsForBrand(manufacturerId, brandSettingsId);
  }

  res.json({
    success: true,
    message: 'Brand results retrieved successfully',
    data: {
      brandSettingsId,
      results,
      timeframe: timeframe || 'default',
      generatedAt: new Date().toISOString(),
      accessLevel: 'full'
    }
  });
});

/**
 * Get comprehensive analytics for a brand
 * GET /api/manufacturer/brands/:brandSettingsId/analytics
 * 
 * @requires manufacturerAuth
 * @returns { voting, nft, comprehensive analytics }
 */
export const getComprehensiveAnalytics = asyncHandler(async (
  req: ManufacturerBrandRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const { brandSettingsId } = req.validatedParams;

  // Get comprehensive analytics through service
  const analytics = await manufacturerService.getComprehensiveAnalyticsForBrand(manufacturerId, brandSettingsId);

  res.json({
    success: true,
    message: 'Comprehensive analytics retrieved successfully',
    data: analytics,
    metadata: {
      dataPoints: calculateDataPoints(analytics),
      insights: generateAnalyticsInsights(analytics)
    }
  });
});

/**
 * Check connection status with a brand
 * GET /api/manufacturer/brands/:brandId/connection-status
 * 
 * @requires manufacturerAuth
 * @returns { status, history, nextSteps }
 */
export const getConnectionStatus = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const { brandId } = req.params;
  if (!brandId) {
    throw createAppError('Brand ID is required', 400, 'MISSING_BRAND_ID');
  }

  // Get connection status through service
  const connectionStatus = await manufacturerService.getConnectionStatus(manufacturerId, brandId);

  res.json({
    success: true,
    data: {
      brandId,
      ...connectionStatus,
      nextSteps: generateConnectionNextSteps(connectionStatus.status),
      recommendations: generateConnectionRecommendations(connectionStatus)
    }
  });
});

/**
 * Check if manufacturer can connect to a brand
 * GET /api/manufacturer/brands/:brandId/can-connect
 * 
 * @requires manufacturerAuth
 * @returns { canConnect, requirements, recommendations }
 */
export const canConnectToBrand = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const { brandId } = req.params;
  if (!brandId) {
    throw createAppError('Brand ID is required', 400, 'MISSING_BRAND_ID');
  }

  // Check connection eligibility through service
  const eligibility = await manufacturerService.canConnectToBrand(manufacturerId, brandId);

  res.json({
    success: true,
    data: {
      brandId,
      ...eligibility,
      actionItems: eligibility.requirements || [],
      estimatedTime: estimateCompletionTime(eligibility.requirements || [])
    }
  });
});

/**
 * Create connection request to a brand
 * POST /api/manufacturer/brands/:brandId/connect
 * 
 * @requires manufacturerAuth
 * @returns { connectionRequest, status, nextSteps }
 */
export const createConnectionRequest = asyncHandler(async (
  req: ConnectionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const { brandId } = req.validatedParams;
  const requestData = req.validatedBody;

  // Create connection request through service
  const result = await manufacturerService.createConnectionRequest(manufacturerId, brandId, {
    message: requestData.message,
    proposedServices: requestData.proposedServices || requestData.services,
    timeline: requestData.timeline,
    budget: requestData.budget,
    portfolio: requestData.portfolio
  });

  const statusCode = result.success ? 201 : 400;

  res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.success ? {
      connectionRequestId: result.connectionRequestId,
      status: 'pending',
      submittedAt: new Date(),
      estimatedResponse: '7-14 business days'
    } : null,
    nextSteps: result.nextSteps || [],
    recommendations: result.success ? [
      'Monitor your dashboard for updates',
      'Prepare project requirements documentation',
      'Research the brand\'s existing partnerships',
      'Follow up if no response within 2 weeks'
    ] : []
  });
});

/**
 * Search for manufacturers (public endpoint)
 * GET /api/manufacturer/search
 * 
 * @returns { manufacturers[], filters, pagination }
 */
export const searchManufacturers = asyncHandler(async (
  req: SearchRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { 
    q = '', 
    industry, 
    verified, 
    minMoq, 
    maxMoq, 
    services, 
    limit = '20', 
    sortBy = 'relevance' 
  } = req.query;

  // Parse search options
  const searchOptions = {
    industry,
    verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
    minMoq: minMoq ? parseInt(minMoq) : undefined,
    maxMoq: maxMoq ? parseInt(maxMoq) : undefined,
    services: services ? services.split(',').map(s => s.trim()) : undefined,
    limit: Math.min(parseInt(limit), 100),
    sortBy: sortBy as 'relevance' | 'name' | 'completeness' | 'connections'
  };

  // Search through service
  const results = await manufacturerService.searchManufacturers(q, searchOptions);

  res.json({
    success: true,
    data: {
      manufacturers: results,
      query: q,
      filters: {
        industry,
        verified,
        minMoq,
        maxMoq,
        services: searchOptions.services
      },
      pagination: {
        total: results.length,
        limit: searchOptions.limit,
        sortBy
      },
      suggestions: generateSearchSuggestions(q, results)
    }
  });
});

/**
 * Get manufacturer dashboard summary
 * GET /api/manufacturer/dashboard
 * 
 * @requires manufacturerAuth
 * @returns { stats, recentActivity, notifications, insights }
 */
export const getDashboardSummary = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Get dashboard data through service
  const dashboardData = await manufacturerService.getDashboardStats(manufacturerId);

  res.json({
    success: true,
    message: 'Dashboard summary retrieved successfully',
    data: {
      ...dashboardData,
      quickActions: generateQuickActions(dashboardData.profile),
      insights: generateDashboardInsights(dashboardData),
      lastUpdated: new Date().toISOString()
    }
  });
});

/**
 * Refresh manufacturer authentication token
 * POST /api/manufacturer/refresh
 * 
 * @requires manufacturerAuth
 * @returns { token, expiresAt }
 */
export const refreshToken = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Generate new token through service
  const result = await manufacturerService.refreshToken(manufacturerId);

  // Set new secure HTTP-only cookie
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('mfg_token', result.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      token: result.token,
      expiresAt: result.expiresAt,
      tokenType: 'Bearer'
    }
  });
});

/**
 * Logout manufacturer (clear cookies and invalidate session)
 * POST /api/manufacturer/logout
 * 
 * @requires manufacturerAuth
 * @returns { success }
 */
export const logout = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Clear HTTP-only cookie
  res.clearCookie('mfg_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });

  res.json({
    success: true,
    message: 'Logout successful',
    data: {
      loggedOut: true,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Verify manufacturer token (utility endpoint)
 * POST /api/manufacturer/verify-token
 * 
 * @returns { valid, manufacturerId, profile }
 */
export const verifyToken = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.mfg_token;

  if (!token) {
    throw createAppError('No token provided', 401, 'MISSING_TOKEN');
  }

  try {
    // Verify token through service
    const decoded = manufacturerService.verifyToken(token);
    
    // Get profile if needed
    const profile = await manufacturerService.getManufacturerById(decoded.manufacturerId);

    res.json({
      success: true,
      data: {
        valid: true,
        manufacturerId: decoded.manufacturerId,
        email: decoded.email,
        verified: decoded.verified,
        profile
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      data: {
        valid: false
      },
      error: 'Invalid token'
    });
  }
});

// Helper functions for generating dynamic responses

function generateLoginRecommendations(profile: any): string[] {
  const recommendations = [];
  
  if (profile.profileCompleteness < 70) {
    recommendations.push('Complete your profile to unlock more opportunities');
  }
  
  if (!profile.isVerified) {
    recommendations.push('Verify your account to build trust with brands');
  }
  
  if (profile.totalConnections === 0) {
    recommendations.push('Browse available brands and send your first connection request');
  }
  
  return recommendations;
}

function generateProfileImprovements(profile: any): string[] {
  const improvements = [];
  
  if (!profile.description || profile.description.length < 100) {
    improvements.push('Add a detailed description of your services and expertise');
  }
  
  if (!profile.servicesOffered || profile.servicesOffered.length === 0) {
    improvements.push('List the services you offer to attract relevant brands');
  }
  
  if (!profile.moq) {
    improvements.push('Specify your minimum order quantity');
  }
  
  if (!profile.contactEmail) {
    improvements.push('Add a business contact email');
  }
  
  return improvements;
}

function generateProfileRecommendations(profile: any): string[] {
  const recommendations = [];
  
  if (profile.profileCompleteness >= 90) {
    recommendations.push('Your profile is excellent! Consider showcasing case studies');
  } else if (profile.profileCompleteness >= 70) {
    recommendations.push('Good profile! Add more details to stand out');
  } else {
    recommendations.push('Complete your profile to increase visibility');
  }
  
  return recommendations;
}

function generateNextActions(profile: any): string[] {
  const actions = [];
  
  if (profile.totalConnections === 0) {
    actions.push('Send your first brand connection request');
  }
  
  if (profile.profileCompleteness < 80) {
    actions.push('Complete remaining profile sections');
  }
  
  if (!profile.isVerified) {
    actions.push('Verify your account');
  }
  
  actions.push('Browse new brand opportunities');
  
  return actions;
}

function generateConnectionInsights(brands: any[], stats: any): string[] {
  const insights = [];
  
  if (brands.length === 0) {
    insights.push('No brand connections yet - start exploring opportunities');
  } else if (brands.length === 1) {
    insights.push('Great start! Consider connecting with more brands to diversify');
  } else {
    insights.push(`You're connected to ${brands.length} brands - excellent network building`);
  }
  
  return insights;
}

function generateConnectionNextSteps(status: string): string[] {
  switch (status) {
    case 'none':
      return [
        'Review brand requirements and preferences',
        'Prepare your proposal and portfolio',
        'Send a personalized connection request'
      ];
    case 'pending':
      return [
        'Wait for brand response (typically 7-14 days)',
        'Prepare project requirements documentation',
        'Monitor your dashboard for updates'
      ];
    case 'connected':
      return [
        'Explore collaboration opportunities',
        'Maintain regular communication',
        'Deliver excellent results to build reputation'
      ];
    case 'rejected':
      return [
        'Review feedback if provided',
        'Improve your profile based on requirements',
        'Consider alternative partnership approaches'
      ];
    default:
      return ['Contact support for guidance'];
  }
}

function generateConnectionRecommendations(connectionStatus: any): string[] {
  const recommendations = [];
  
  if (connectionStatus.status === 'none') {
    recommendations.push('Ensure your profile is complete before connecting');
    recommendations.push('Research the brand\'s values and requirements');
  }
  
  return recommendations;
}

function estimateCompletionTime(requirements: string[]): string {
  if (requirements.length === 0) return 'Ready to connect';
  if (requirements.length <= 2) return '5-10 minutes';
  if (requirements.length <= 4) return '15-30 minutes';
  return '30+ minutes';
}

function calculateDataPoints(analytics: any): number {
  let points = 0;
  
  if (analytics.voting) points += 50;
  if (analytics.nft) points += 50;
  
  return points;
}

function generateAnalyticsInsights(analytics: any): string[] {
  const insights = [];
  
  if (analytics.voting) {
    insights.push('Voting analytics available for deeper insights');
  }
  
  if (analytics.nft) {
    insights.push('NFT analytics showing engagement trends');
  }
  
  return insights;
}

function generateQuickActions(profile: any): Array<{ title: string; action: string; priority: 'high' | 'medium' | 'low' }> {
  const actions = [];
  
  if (profile.profileCompleteness < 80) {
    actions.push({
      title: 'Complete Profile',
      action: 'complete_profile',
      priority: 'high' as const
    });
  }
  
  if (!profile.isVerified) {
    actions.push({
      title: 'Verify Account',
      action: 'verify_account',
      priority: 'high' as const
    });
  }
  
  actions.push({
    title: 'Browse Brands',
    action: 'browse_brands',
    priority: 'medium' as const
  });
  
  return actions;
}

function generateDashboardInsights(dashboardData: any): string[] {
  const insights = [];
  
  if (dashboardData.profile.profileCompleteness >= 90) {
    insights.push('Your profile is highly optimized for brand partnerships');
  }
  
  if (dashboardData.connectionStats?.total > 0) {
    insights.push(`You have ${dashboardData.connectionStats.total} active brand connections`);
  }
  
  return insights;
}

function generateSearchSuggestions(query: string, results: any[]): string[] {
  const suggestions = [];
  
  if (results.length === 0) {
    suggestions.push('Try broader search terms');
    suggestions.push('Remove filters to see more results');
  } else if (results.length < 5) {
    suggestions.push('Consider related industries');
    suggestions.push('Expand your search criteria');
  }
  
  return suggestions;
}