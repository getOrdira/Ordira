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

interface ManufacturerBrandRequest extends ManufacturerAuthRequest, ValidatedRequest {
  validatedParams: { brandSettingsId: string };
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

  // Set secure HTTP-only cookie for token (optional enhancement)
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
    }
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

  // Set secure HTTP-only cookie for token (optional enhancement)
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
    }
  });
});

/**
 * Get all brands connected to the authenticated manufacturer
 * GET /api/manufacturer/brands
 * 
 * @requires manufacturerAuth
 * @returns { brands[], connectionStats }
 */
export const listBrandsForManufacturer = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Get connected brands through service
  const brands = await manufacturerService.listBrandsForManufacturer(manufacturerId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Connected brands retrieved successfully',
    data: {
      brands,
      pagination: {
        total: brands.length,
        page: 1,
        limit: brands.length
      }
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
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Extract validated brand settings ID
  const { brandSettingsId } = req.validatedParams;

  // Verify manufacturer has access to this brand (handled in service)
  const results = await manufacturerService.getResultsForBrand(manufacturerId, brandSettingsId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Brand results retrieved successfully',
    data: {
      brandSettingsId,
      results,
      generatedAt: new Date().toISOString()
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

  // Optional: Add token to blacklist (if implementing token blacklisting)
  // await manufacturerService.blacklistToken(req.headers.authorization);

  // Return standardized response
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
  // Extract manufacturer ID from auth context
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

  // Return standardized response
  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      token: result.token,
      expiresAt: result.expiresAt
    }
  });
});

/**
 * Get manufacturer dashboard summary
 * GET /api/manufacturer/dashboard
 * 
 * @requires manufacturerAuth
 * @returns { stats, recentActivity, pendingInvitations }
 */
export const getDashboardSummary = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Get dashboard data through service
  const dashboardData = await manufacturerService.getDashboardSummary(manufacturerId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Dashboard summary retrieved successfully',
    data: {
      ...dashboardData,
      lastUpdated: new Date().toISOString()
    }
  });
});