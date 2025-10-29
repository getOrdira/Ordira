// src/controllers/features/manufacturers/manufacturerHelpers.controller.ts

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { manufacturerHelpersService } from '../../../services/manufacturers/utils/manufacturerHelpers.service';

/**
 * Manufacturer helpers request interfaces
 */
interface ValidateRegistrationDataRequest extends BaseRequest {
  validatedBody: {
    name: string;
    email: string;
    password: string;
    industry?: string;
    contactEmail?: string;
    description?: string;
    servicesOffered?: string[];
    moq?: number;
    headquarters?: {
      country?: string;
      city?: string;
      address?: string;
    };
  };
}

interface ValidateUpdateDataRequest extends BaseRequest {
  validatedBody: {
    name?: string;
    description?: string;
    industry?: string;
    contactEmail?: string;
    servicesOffered?: string[];
    moq?: number;
    headquarters?: {
      country?: string;
      city?: string;
      address?: string;
    };
    certifications?: Array<{
      name: string;
      issuer: string;
      issueDate: Date;
      expiryDate?: Date;
    }>;
  };
}

interface GenerateManufacturerAnalyticsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedQuery?: {
    startDate?: string;
    endDate?: string;
  };
}

interface InvalidateManufacturerCachesRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface FormatManufacturerForPublicRequest extends BaseRequest {
  validatedBody: {
    manufacturer: any;
  };
}

interface IsProfileCompleteRequest extends BaseRequest {
  validatedBody: {
    manufacturer: any;
  };
}

interface SanitizeSearchParamsRequest extends BaseRequest {
  validatedBody: {
    params: any;
  };
}

/**
 * Manufacturer helpers controller
 */
export class ManufacturerHelpersController extends BaseController {
  private helpersService = manufacturerHelpersService;

  /**
   * POST /api/manufacturers/helpers/validate-registration
   * Validate manufacturer registration data
   */
  async validateRegistrationData(req: ValidateRegistrationDataRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_REGISTRATION_DATA');

        try {
          this.helpersService.validateRegistrationData(req.validatedBody);

          this.logAction(req, 'VALIDATE_REGISTRATION_DATA_SUCCESS', {
            businessId: req.businessId,
            name: req.validatedBody.name,
            email: req.validatedBody.email,
            industry: req.validatedBody.industry,
            hasContactEmail: !!req.validatedBody.contactEmail,
            servicesCount: req.validatedBody.servicesOffered?.length || 0,
            hasMoq: req.validatedBody.moq !== undefined,
            hasHeadquarters: !!req.validatedBody.headquarters
          });

          return { valid: true, message: 'Registration data is valid' };
        } catch (error: any) {
          this.logAction(req, 'VALIDATE_REGISTRATION_DATA_FAILED', {
            businessId: req.businessId,
            error: error.message,
            statusCode: error.statusCode
          });

          throw error;
        }
      });
    }, res, 'Registration data validated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/helpers/validate-update
   * Validate manufacturer update data
   */
  async validateUpdateData(req: ValidateUpdateDataRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VALIDATE_UPDATE_DATA');

        try {
          this.helpersService.validateUpdateData(req.validatedBody);

          this.logAction(req, 'VALIDATE_UPDATE_DATA_SUCCESS', {
            businessId: req.businessId,
            updatedFields: Object.keys(req.validatedBody),
            hasName: !!req.validatedBody.name,
            hasContactEmail: !!req.validatedBody.contactEmail,
            hasMoq: req.validatedBody.moq !== undefined,
            servicesCount: req.validatedBody.servicesOffered?.length || 0,
            certificationsCount: req.validatedBody.certifications?.length || 0
          });

          return { valid: true, message: 'Update data is valid' };
        } catch (error: any) {
          this.logAction(req, 'VALIDATE_UPDATE_DATA_FAILED', {
            businessId: req.businessId,
            error: error.message,
            statusCode: error.statusCode
          });

          throw error;
        }
      });
    }, res, 'Update data validated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/helpers/analytics
   * Generate manufacturer analytics data
   */
  async generateManufacturerAnalytics(req: GenerateManufacturerAnalyticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_MANUFACTURER_ANALYTICS');

        const dateRange = req.validatedQuery?.startDate && req.validatedQuery?.endDate ? {
          start: new Date(req.validatedQuery.startDate),
          end: new Date(req.validatedQuery.endDate)
        } : undefined;

        const analytics = await this.helpersService.generateManufacturerAnalytics(
          req.validatedParams.manufacturerId,
          dateRange
        );

        this.logAction(req, 'GENERATE_MANUFACTURER_ANALYTICS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          hasDateRange: !!dateRange,
          startDate: dateRange?.start,
          endDate: dateRange?.end,
          profileViews: analytics.profileViews,
          connectionRequests: analytics.connectionRequests,
          activeConnections: analytics.activeConnections,
          productInquiries: analytics.productInquiries,
          profileCompleteness: analytics.profileCompleteness,
          industryRanking: analytics.industryRanking
        });

        return { analytics };
      });
    }, res, 'Manufacturer analytics generated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/helpers/invalidate-caches
   * Invalidate all caches related to a manufacturer
   */
  async invalidateManufacturerCaches(req: InvalidateManufacturerCachesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'INVALIDATE_MANUFACTURER_CACHES');

        await this.helpersService.invalidateManufacturerCaches(req.validatedParams.manufacturerId);

        this.logAction(req, 'INVALIDATE_MANUFACTURER_CACHES_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { message: 'Manufacturer caches invalidated successfully' };
      });
    }, res, 'Manufacturer caches invalidated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/helpers/format-for-public
   * Format manufacturer data for public display
   */
  async formatManufacturerForPublic(req: FormatManufacturerForPublicRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'FORMAT_MANUFACTURER_FOR_PUBLIC');

        const formattedManufacturer = this.helpersService.formatManufacturerForPublic(req.validatedBody.manufacturer);

        this.logAction(req, 'FORMAT_MANUFACTURER_FOR_PUBLIC_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: formattedManufacturer.id,
          name: formattedManufacturer.name,
          industry: formattedManufacturer.industry,
          isVerified: formattedManufacturer.isVerified,
          profileScore: formattedManufacturer.profileScore,
          servicesCount: formattedManufacturer.servicesOffered?.length || 0,
          certificationsCount: formattedManufacturer.certifications?.length || 0
        });

        return { formattedManufacturer };
      });
    }, res, 'Manufacturer formatted for public display successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/helpers/check-profile-complete
   * Check if manufacturer profile is complete
   */
  async isProfileComplete(req: IsProfileCompleteRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CHECK_PROFILE_COMPLETE');

        const isComplete = this.helpersService.isProfileComplete(req.validatedBody.manufacturer);

        this.logAction(req, 'CHECK_PROFILE_COMPLETE_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedBody.manufacturer._id || req.validatedBody.manufacturer.id,
          isComplete,
          name: req.validatedBody.manufacturer.name,
          industry: req.validatedBody.manufacturer.industry
        });

        return { isComplete };
      });
    }, res, 'Profile completeness checked successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/helpers/sanitize-search-params
   * Sanitize manufacturer search parameters
   */
  async sanitizeSearchParams(req: SanitizeSearchParamsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SANITIZE_SEARCH_PARAMS');

        const sanitizedParams = this.helpersService.sanitizeSearchParams(req.validatedBody.params);

        this.logAction(req, 'SANITIZE_SEARCH_PARAMS_SUCCESS', {
          businessId: req.businessId,
          originalParams: Object.keys(req.validatedBody.params),
          sanitizedParams: Object.keys(sanitizedParams),
          hasQuery: !!sanitizedParams.query,
          hasIndustry: !!sanitizedParams.industry,
          hasServices: !!sanitizedParams.services,
          hasLocation: !!sanitizedParams.location,
          limit: sanitizedParams.limit,
          offset: sanitizedParams.offset,
          sortBy: sanitizedParams.sortBy,
          sortOrder: sanitizedParams.sortOrder
        });

        return { sanitizedParams };
      });
    }, res, 'Search parameters sanitized successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerHelpersController = new ManufacturerHelpersController();
