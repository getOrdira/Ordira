// src/controllers/features/manufacturers/manufacturerProfile.controller.ts
// Manufacturer profile controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { manufacturerProfileCoreService } from '../../../services/manufacturers/core/manufacturerProfile.service';

/**
 * Manufacturer profile request interfaces
 */
interface SearchManufacturersRequest extends BaseRequest {
  validatedQuery?: {
    query?: string;
    industry?: string;
    services?: string[];
    minMoq?: number;
    maxMoq?: number;
    page?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'industry' | 'moq' | 'profileCompleteness' | 'plan';
    sortOrder?: 'asc' | 'desc';
  };
}

interface GetManufacturerProfileRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface GetProfileContextRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedQuery?: {
    brandId?: string;
  };
}

interface GetManufacturersByIndustryRequest extends BaseRequest {
  validatedQuery: {
    industry: string;
  };
}

interface GetAvailableIndustriesRequest extends BaseRequest {
}

interface GetAvailableServicesRequest extends BaseRequest {
}

interface ListManufacturerProfilesRequest extends BaseRequest {
}

/**
 * Manufacturer profile controller
 */
export class ManufacturerProfileController extends BaseController {
  private manufacturerProfileService = manufacturerProfileCoreService;

  /**
   * GET /api/manufacturers/search
   * Search manufacturers with basic filtering and pagination
   */
  async searchManufacturers(req: SearchManufacturersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SEARCH_MANUFACTURER_PROFILES');

        const searchOptions = {
          query: req.validatedQuery?.query,
          industry: req.validatedQuery?.industry,
          services: req.validatedQuery?.services,
          minMoq: req.validatedQuery?.minMoq,
          maxMoq: req.validatedQuery?.maxMoq,
          page: req.validatedQuery?.page || 1,
          limit: req.validatedQuery?.limit || 20,
          offset: req.validatedQuery?.offset || 0,
          sortBy: req.validatedQuery?.sortBy || 'name',
          sortOrder: req.validatedQuery?.sortOrder || 'asc'
        };

        const result = await this.manufacturerProfileService.searchManufacturers(searchOptions);

        this.logAction(req, 'SEARCH_MANUFACTURER_PROFILES_SUCCESS', {
          businessId: req.businessId,
          searchOptions: Object.keys(searchOptions),
          total: result.total,
          manufacturersCount: result.manufacturers.length
        });

        return result;
      });
    }, res, 'Manufacturer profiles search completed successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/profile
   * Get detailed manufacturer profile with context
   */
  async getManufacturerProfile(req: GetManufacturerProfileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURER_PROFILE');

        const profile = await this.manufacturerProfileService.getManufacturerProfile(req.validatedParams.manufacturerId);

        if (!profile) {
          throw new Error('Manufacturer profile not found');
        }

        this.logAction(req, 'GET_MANUFACTURER_PROFILE_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          profileCompleteness: profile.profileCompleteness
        });

        return { profile };
      });
    }, res, 'Manufacturer profile retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/profile/context
   * Get profile context for a specific brand
   */
  async getProfileContext(req: GetProfileContextRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_PROFILE_CONTEXT');

        const context = await this.manufacturerProfileService.getProfileContext(
          req.validatedParams.manufacturerId,
          req.validatedQuery?.brandId
        );

        this.logAction(req, 'GET_PROFILE_CONTEXT_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          brandId: req.validatedQuery?.brandId,
          connectionStatus: context.connectionStatus,
          canConnect: context.canConnect
        });

        return { context };
      });
    }, res, 'Profile context retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/industry/:industry
   * Get manufacturers by industry with enhanced data
   */
  async getManufacturersByIndustry(req: GetManufacturersByIndustryRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURERS_BY_INDUSTRY');

        const industryData = await this.manufacturerProfileService.getManufacturersByIndustry(req.validatedQuery.industry);

        this.logAction(req, 'GET_MANUFACTURERS_BY_INDUSTRY_SUCCESS', {
          businessId: req.businessId,
          industry: req.validatedQuery.industry,
          manufacturersCount: industryData.manufacturers.length,
          averageCompleteness: industryData.averageCompleteness,
          topServicesCount: industryData.topServices.length
        });

        return industryData;
      });
    }, res, 'Industry manufacturers retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/industries/available
   * Get available industries from all manufacturers
   */
  async getAvailableIndustries(req: GetAvailableIndustriesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_AVAILABLE_INDUSTRIES');

        const industries = await this.manufacturerProfileService.getAvailableIndustries();

        this.logAction(req, 'GET_AVAILABLE_INDUSTRIES_SUCCESS', {
          businessId: req.businessId,
          industriesCount: industries.length
        });

        return { industries };
      });
    }, res, 'Available industries retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/services/available
   * Get available services from all manufacturers
   */
  async getAvailableServices(req: GetAvailableServicesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_AVAILABLE_SERVICES');

        const services = await this.manufacturerProfileService.getAvailableServices();

        this.logAction(req, 'GET_AVAILABLE_SERVICES_SUCCESS', {
          businessId: req.businessId,
          servicesCount: services.length
        });

        return { services };
      });
    }, res, 'Available services retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/profiles/list
   * Return a lightweight list of all active manufacturers
   */
  async listManufacturerProfiles(req: ListManufacturerProfilesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'LIST_MANUFACTURER_PROFILES');

        const profiles = await this.manufacturerProfileService.listManufacturerProfiles();

        this.logAction(req, 'LIST_MANUFACTURER_PROFILES_SUCCESS', {
          businessId: req.businessId,
          profilesCount: profiles.length
        });

        return { profiles };
      });
    }, res, 'Manufacturer profiles list retrieved successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerProfileController = new ManufacturerProfileController();
