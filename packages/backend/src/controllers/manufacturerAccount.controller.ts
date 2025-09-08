// src/controllers/manufacturerAccount.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ManufacturerAuthRequest } from '../middleware/manufacturerAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { ManufacturerAccountService } from '../services/business/manufacturerAccount.service';

// Initialize service
const manufacturerAccountService = new ManufacturerAccountService();

/**
 * Extended request interfaces for type safety
 */
interface UpdateProfileRequest extends Request, ManufacturerAuthRequest, ValidatedRequest {
  validatedBody: {
    name?: string;
    description?: string;
    industry?: string;
    contactEmail?: string;
    servicesOffered?: string[];
    moq?: number;
    socialUrls?: string[];
    profilePictureUrl?: string;
    location?: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    certifications?: Array<{
      name: string;
      issuer: string;
      dateIssued?: Date;
      expiryDate?: Date;
      certificateUrl?: string;
    }>;
  };
}

interface UpdateNotificationPreferencesRequest extends Request, ManufacturerAuthRequest, ValidatedRequest {
  validatedBody: {
    emailNotifications?: {
      invitations?: boolean;
      orderUpdates?: boolean;
      systemUpdates?: boolean;
      marketing?: boolean;
    };
    pushNotifications?: {
      invitations?: boolean;
      orderUpdates?: boolean;
      systemUpdates?: boolean;
    };
    smsNotifications?: {
      criticalUpdates?: boolean;
      orderAlerts?: boolean;
    };
    frequency?: 'immediate' | 'daily' | 'weekly';
    timezone?: string;
  };
}

/**
 * Get manufacturer profile/account details
 * GET /api/manufacturer/account
 * 
 * @requires manufacturerAuth
 * @returns { profile, stats, completeness }
 */
export const getManufacturerProfile = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Get profile through service
  const profile = await manufacturerAccountService.getManufacturerAccount(manufacturerId);

  if (!profile) {
    throw createAppError('Manufacturer profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Return standardized response
  res.json({
    success: true,
    message: 'Manufacturer profile retrieved successfully',
    data: {
      profile,
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Update manufacturer profile/account
 * PUT /api/manufacturer/account
 * 
 * @requires manufacturerAuth
 * @requires validation: UpdateProfileRequest
 * @returns { updatedProfile, changedFields }
 */
export const updateManufacturerProfile = asyncHandler(async (
  req: UpdateProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Extract validated update data
  const updateData = req.validatedBody;

  // Check if there are any fields to update
  if (Object.keys(updateData).length === 0) {
    throw createAppError('No update data provided', 400, 'EMPTY_UPDATE_DATA');
  }

  // Update profile through service
  const updatedProfile = await manufacturerAccountService.updateManufacturerAccount(
    manufacturerId, 
    updateData
  );

  // Determine which fields were changed
  const changedFields = Object.keys(updateData).filter(key => updateData[key] !== undefined);

  // Return standardized response
  res.json({
    success: true,
    message: 'Manufacturer profile updated successfully',
    data: {
      profile: updatedProfile,
      changedFields,
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Delete manufacturer account (soft delete)
 * DELETE /api/manufacturer/account
 * 
 * @requires manufacturerAuth
 * @returns { deleted, retentionPeriod }
 */
export const deleteManufacturerAccount = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Soft delete account through service
  const deletionResult = await manufacturerAccountService.softDeleteAccount(manufacturerId);

  // Clear authentication cookie
  res.clearCookie('mfg_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'Manufacturer account deactivated successfully',
    data: {
      deleted: true,
      accountId: manufacturerId,
      retentionPeriod: '30 days',
      deletedAt: deletionResult.deletedAt,
      canRestore: true
    }
  });
});

/**
 * Upload manufacturer profile picture
 * POST /api/manufacturer/account/profile-picture
 * 
 * @requires manufacturerAuth
 * @requires multipart/form-data with 'profilePicture' field
 * @returns { profilePictureUrl, uploadedAt }
 */
export const uploadProfilePicture = asyncHandler(async (
  req: ManufacturerAuthRequest & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Check if file was uploaded
  if (!req.file) {
    throw createAppError('No profile picture file provided', 400, 'MISSING_FILE');
  }

  // Validate file type and size (handled in multer middleware, but double-check)
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    throw createAppError('Invalid file type. Only JPEG, PNG, and WebP are allowed', 400, 'INVALID_FILE_TYPE');
  }

  // Upload and update profile picture through service
  const result = await manufacturerAccountService.uploadProfilePicture(manufacturerId, req.file);

  // Return standardized response
  res.json({
    success: true,
    message: 'Profile picture uploaded successfully',
    data: {
      profilePictureUrl: result.profilePictureUrl,
      uploadedAt: result.uploadedAt,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      // Add S3 information if available
      ...(result.s3Key && {
        storage: {
          type: 's3',
          s3Key: result.s3Key,
          s3Bucket: result.s3Bucket,
          s3Region: result.s3Region
        }
      })
    }
  });
});

/**
 * Get manufacturer verification status and requirements
 * GET /api/manufacturer/account/verification
 * 
 * @requires manufacturerAuth
 * @returns { verificationStatus, requirements, documents }
 */
export const getVerificationStatus = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Get verification status through service
  const verificationData = await manufacturerAccountService.getVerificationStatus(manufacturerId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Verification status retrieved successfully',
    data: {
      ...verificationData,
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Submit documents for manufacturer verification
 * POST /api/manufacturer/account/verification/submit
 * 
 * @requires manufacturerAuth
 * @requires multipart/form-data with verification documents
 * @returns { submissionId, status, reviewTime }
 */
export const submitVerificationDocuments = asyncHandler(async (
  req: ManufacturerAuthRequest & { files?: Express.Multer.File[] },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Check if documents were uploaded
  if (!req.files || req.files.length === 0) {
    throw createAppError('No verification documents provided', 400, 'MISSING_DOCUMENTS');
  }

  // Submit documents for verification through service
  const submissionResult = await manufacturerAccountService.submitVerificationDocuments(
    manufacturerId, 
    req.files
  );

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Verification documents submitted successfully',
    data: {
      submissionId: submissionResult.submissionId,
      status: submissionResult.status,
      documentsCount: req.files.length,
      estimatedReviewTime: submissionResult.estimatedReviewTime,
      submittedAt: new Date().toISOString()
    }
  });
});

/**
 * Get account activity log
 * GET /api/manufacturer/account/activity
 * 
 * @requires manufacturerAuth
 * @optional query: { page?, limit?, type?, startDate?, endDate? }
 * @returns { activities[], pagination }
 */
export const getAccountActivity = asyncHandler(async (
  req: ManufacturerAuthRequest & { 
    query: { 
      page?: string; 
      limit?: string; 
      type?: string; 
      startDate?: string; 
      endDate?: string; 
    } 
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Parse query parameters
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '20'), 100); // Max 100 items per page
  const type = req.query.type;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;

  // Get activity log through service
  const activityResult = await manufacturerAccountService.getAccountActivity(manufacturerId, {
    page,
    limit,
    type,
    startDate,
    endDate
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'Account activity retrieved successfully',
    data: {
      activities: activityResult.activities,
              pagination: {
        total: activityResult.total,
        page,
        limit,
        totalPages: Math.ceil(activityResult.total / limit),
        hasNext: page < Math.ceil(activityResult.total / limit),
        hasPrev: page > 1
      },
      filters: {
        type,
        startDate,
        endDate
      }
    }
  });
});

/**
 * Update manufacturer notification preferences
 * PUT /api/manufacturer/account/notifications
 * 
 * @requires manufacturerAuth
 * @requires validation: notification preferences
 * @returns { preferences, updatedAt }
 */
export const updateNotificationPreferences = asyncHandler(async (
  req: UpdateNotificationPreferencesRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const preferences = req.validatedBody;

  // Update preferences through service
  const updatedPreferences = await manufacturerAccountService.updateNotificationPreferences(
    manufacturerId,
    preferences
  );

  res.json({
    success: true,
    message: 'Notification preferences updated successfully',
    data: {
      preferences: updatedPreferences,
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Export manufacturer account data (GDPR compliance)
 * GET /api/manufacturer/account/export
 * 
 * @requires manufacturerAuth
 * @returns { exportId, downloadUrl, expiresAt }
 */
export const exportAccountData = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Initiate data export through service
  const exportResult = await manufacturerAccountService.initiateDataExport(manufacturerId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Data export initiated successfully',
    data: {
      exportId: exportResult.exportId,
      status: 'processing',
      estimatedCompletionTime: exportResult.estimatedCompletionTime,
      expiresAt: exportResult.expiresAt,
      initiatedAt: new Date().toISOString()
    }
  });
});

// ===== SUPPLY CHAIN MANAGEMENT ENDPOINTS =====

/**
 * Deploy supply chain contract for manufacturer
 * POST /api/manufacturer/account/supply-chain/deploy
 * 
 * @requires manufacturerAuth
 * @requires validation: manufacturerName
 * @returns { contractInfo }
 */
export const deploySupplyChainContract = asyncHandler(async (
  req: ManufacturerAuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const { manufacturerName } = req.validatedBody;

  const contractInfo = await manufacturerAccountService.deploySupplyChainContract(
    manufacturerId,
    manufacturerName
  );

  res.status(201).json({
    success: true,
    message: 'Supply chain contract deployed successfully',
    data: {
      contractInfo,
      deployedAt: new Date().toISOString()
    }
  });
});

/**
 * Get supply chain contract information
 * GET /api/manufacturer/account/supply-chain/contract
 * 
 * @requires manufacturerAuth
 * @returns { contractInfo }
 */
export const getSupplyChainContract = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const contractInfo = await manufacturerAccountService.getSupplyChainContractInfo(manufacturerId);

  if (!contractInfo) {
    res.status(404).json({
      success: false,
      error: 'No supply chain contract deployed',
      code: 'NO_CONTRACT_FOUND'
    });
    return;
  }

  res.json({
    success: true,
    data: {
      contractInfo
    }
  });
});

/**
 * Create supply chain endpoint
 * POST /api/manufacturer/account/supply-chain/endpoints
 * 
 * @requires manufacturerAuth
 * @requires validation: endpoint data
 * @returns { endpoint }
 */
export const createSupplyChainEndpoint = asyncHandler(async (
  req: ManufacturerAuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const endpointData = req.validatedBody;

  const endpoint = await manufacturerAccountService.createSupplyChainEndpoint(
    manufacturerId,
    endpointData
  );

  res.status(201).json({
    success: true,
    message: 'Supply chain endpoint created successfully',
    data: {
      endpoint
    }
  });
});

/**
 * Get all supply chain endpoints
 * GET /api/manufacturer/account/supply-chain/endpoints
 * 
 * @requires manufacturerAuth
 * @returns { endpoints }
 */
export const getSupplyChainEndpoints = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const endpoints = await manufacturerAccountService.getSupplyChainEndpoints(manufacturerId);

  res.json({
    success: true,
    data: {
      endpoints,
      count: endpoints.length
    }
  });
});

/**
 * Register product for supply chain tracking
 * POST /api/manufacturer/account/supply-chain/products
 * 
 * @requires manufacturerAuth
 * @requires validation: product data
 * @returns { product }
 */
export const registerSupplyChainProduct = asyncHandler(async (
  req: ManufacturerAuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const productData = req.validatedBody;

  const product = await manufacturerAccountService.registerSupplyChainProduct(
    manufacturerId,
    productData
  );

  res.status(201).json({
    success: true,
    message: 'Product registered for supply chain tracking successfully',
    data: {
      product
    }
  });
});

/**
 * Get all supply chain products
 * GET /api/manufacturer/account/supply-chain/products
 * 
 * @requires manufacturerAuth
 * @returns { products }
 */
export const getSupplyChainProducts = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const products = await manufacturerAccountService.getSupplyChainProducts(manufacturerId);

  res.json({
    success: true,
    data: {
      products,
      count: products.length
    }
  });
});

/**
 * Log supply chain event
 * POST /api/manufacturer/account/supply-chain/events
 * 
 * @requires manufacturerAuth
 * @requires validation: event data
 * @returns { event }
 */
export const logSupplyChainEvent = asyncHandler(async (
  req: ManufacturerAuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const eventData = req.validatedBody;

  const event = await manufacturerAccountService.logSupplyChainEvent(
    manufacturerId,
    eventData
  );

  res.status(201).json({
    success: true,
    message: 'Supply chain event logged successfully',
    data: {
      event
    }
  });
});

/**
 * Get supply chain events for a product
 * GET /api/manufacturer/account/supply-chain/products/:productId/events
 * 
 * @requires manufacturerAuth
 * @returns { events }
 */
export const getSupplyChainProductEvents = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const { productId } = req.params;

  const events = await manufacturerAccountService.getSupplyChainProductEvents(
    manufacturerId,
    productId
  );

  res.json({
    success: true,
    data: {
      events,
      count: events.length,
      productId
    }
  });
});

/**
 * Get supply chain dashboard data
 * GET /api/manufacturer/account/supply-chain/dashboard
 * 
 * @requires manufacturerAuth
 * @returns { dashboard data }
 */
export const getSupplyChainDashboard = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  const dashboard = await manufacturerAccountService.getSupplyChainDashboard(manufacturerId);

  res.json({
    success: true,
    data: {
      dashboard,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Generate QR code for product supply chain tracking
 * POST /api/manufacturer/account/supply-chain/products/:productId/qr-code
 * 
 * @requires manufacturerAuth
 * @requires params: productId
 * @returns { qrCodeUrl, qrCodeData, productName }
 */
export const generateProductQrCode = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  const { productId } = req.params;

  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  if (!productId) {
    throw createAppError('Product ID is required', 400, 'MISSING_PRODUCT_ID');
  }

  const qrCodeInfo = await manufacturerAccountService.generateProductQrCode(manufacturerId, productId);

  res.status(201).json({
    success: true,
    data: qrCodeInfo,
    message: 'QR code generated successfully'
  });
});

/**
 * Generate QR codes for multiple products
 * POST /api/manufacturer/account/supply-chain/products/qr-codes/batch
 * 
 * @requires manufacturerAuth
 * @requires body: { productIds: string[] }
 * @returns { results: Array<{ productId, success, qrCodeUrl?, error? }> }
 */
export const generateBatchProductQrCodes = asyncHandler(async (
  req: ManufacturerAuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  const { productIds } = req.validatedBody;

  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    throw createAppError('Product IDs array is required', 400, 'MISSING_PRODUCT_IDS');
  }

  if (productIds.length > 50) {
    throw createAppError('Cannot generate more than 50 QR codes at once', 400, 'BATCH_SIZE_EXCEEDED');
  }

  const results = await manufacturerAccountService.generateBatchProductQrCodes(manufacturerId, productIds);

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  res.status(201).json({
    success: true,
    data: {
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    },
    message: `Generated ${successCount} QR codes successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`
  });
});

/**
 * Get QR code information for a product
 * GET /api/manufacturer/account/supply-chain/products/:productId/qr-code
 * 
 * @requires manufacturerAuth
 * @requires params: productId
 * @returns { hasQrCode, qrCodeUrl?, generatedAt?, isActive?, productName }
 */
export const getProductQrCodeInfo = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId;
  const { productId } = req.params;

  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  if (!productId) {
    throw createAppError('Product ID is required', 400, 'MISSING_PRODUCT_ID');
  }

  const qrCodeInfo = await manufacturerAccountService.getProductQrCodeInfo(manufacturerId, productId);

  res.json({
    success: true,
    data: qrCodeInfo
  });
});

