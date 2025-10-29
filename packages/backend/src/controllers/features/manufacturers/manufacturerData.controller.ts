// src/controllers/features/manufacturers/manufacturerData.controller.ts
// Manufacturer data controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { manufacturerDataCoreService } from '../../../services/manufacturers/core/manufacturerData.service';

/**
 * Manufacturer data request interfaces
 */
interface SearchManufacturersRequest extends BaseRequest {
  validatedQuery?: {
    query?: string;
    industry?: string;
    services?: string[];
    minMoq?: number;
    maxMoq?: number;
    location?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

interface GetManufacturerRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface UpdateManufacturerRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
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

interface DeleteManufacturerRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface GetManufacturersByIndustryRequest extends BaseRequest {
  validatedQuery: {
    industry: string;
    limit?: number;
  };
}

interface GetManufacturersByIdsRequest extends BaseRequest {
  validatedBody: {
    manufacturerIds: string[];
  };
}

interface GetManufacturerCountRequest extends BaseRequest {
  validatedQuery?: {
    criteria?: string;
  };
}

/**
 * Manufacturer data controller
 */
export class ManufacturerDataController extends BaseController {
  private manufacturerDataService = manufacturerDataCoreService;

  /**
   * GET /api/manufacturers/search
   * Search manufacturers with optimization and caching
   */
  async searchManufacturers(req: SearchManufacturersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SEARCH_MANUFACTURERS');

        const searchParams = {
          query: req.validatedQuery?.query,
          industry: req.validatedQuery?.industry,
          services: req.validatedQuery?.services,
          minMoq: req.validatedQuery?.minMoq,
          maxMoq: req.validatedQuery?.maxMoq,
          location: req.validatedQuery?.location,
          limit: req.validatedQuery?.limit || 20,
          offset: req.validatedQuery?.offset || 0,
          sortBy: req.validatedQuery?.sortBy,
          sortOrder: req.validatedQuery?.sortOrder || 'desc'
        };

        const result = await this.manufacturerDataService.searchManufacturers(searchParams);

        this.logAction(req, 'SEARCH_MANUFACTURERS_SUCCESS', {
          businessId: req.businessId,
          searchParams: Object.keys(searchParams),
          resultsCount: result.manufacturers?.length || 0
        });

        return result;
      });
    }, res, 'Manufacturers search completed successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId
   * Get manufacturer by ID with caching
   */
  async getManufacturerById(req: GetManufacturerRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURER_BY_ID');

        const manufacturer = await this.manufacturerDataService.getManufacturerById(
          req.validatedParams.manufacturerId,
          true // useCache
        );

        if (!manufacturer) {
          throw new Error('Manufacturer not found');
        }

        this.logAction(req, 'GET_MANUFACTURER_BY_ID_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { manufacturer };
      });
    }, res, 'Manufacturer retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/email/:email
   * Get manufacturer by email with optional caching
   */
  async getManufacturerByEmail(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const email = req.params.email;
        const skipCache = req.query.skipCache === 'true';

        this.recordPerformance(req, 'GET_MANUFACTURER_BY_EMAIL');

        const manufacturer = await this.manufacturerDataService.getManufacturerByEmail(email, skipCache);

        if (!manufacturer) {
          throw new Error('Manufacturer not found');
        }

        this.logAction(req, 'GET_MANUFACTURER_BY_EMAIL_SUCCESS', {
          businessId: req.businessId,
          email,
          skipCache
        });

        return { manufacturer };
      });
    }, res, 'Manufacturer retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/manufacturers/:manufacturerId
   * Update manufacturer profile with cache invalidation
   */
  async updateManufacturerProfile(req: UpdateManufacturerRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_MANUFACTURER_PROFILE');

        const sanitizedData = this.sanitizeInput(req.validatedBody);
        
        const updatedManufacturer = await this.manufacturerDataService.updateManufacturerProfile(
          req.validatedParams.manufacturerId,
          sanitizedData
        );

        this.logAction(req, 'UPDATE_MANUFACTURER_PROFILE_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          updatedFields: Object.keys(sanitizedData)
        });

        return { manufacturer: updatedManufacturer };
      });
    }, res, 'Manufacturer profile updated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/industry/:industry
   * Get manufacturers by industry with caching
   */
  async getManufacturersByIndustry(req: GetManufacturersByIndustryRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURERS_BY_INDUSTRY');

        const manufacturers = await this.manufacturerDataService.getManufacturersByIndustry(
          req.validatedQuery.industry,
          req.validatedQuery.limit || 20
        );

        this.logAction(req, 'GET_MANUFACTURERS_BY_INDUSTRY_SUCCESS', {
          businessId: req.businessId,
          industry: req.validatedQuery.industry,
          count: manufacturers.length
        });

        return { manufacturers };
      });
    }, res, 'Industry manufacturers retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * DELETE /api/manufacturers/:manufacturerId
   * Delete manufacturer with cache invalidation
   */
  async deleteManufacturer(req: DeleteManufacturerRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'DELETE_MANUFACTURER');

        await this.manufacturerDataService.deleteManufacturer(req.validatedParams.manufacturerId);

        this.logAction(req, 'DELETE_MANUFACTURER_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { message: 'Manufacturer deleted successfully' };
      });
    }, res, 'Manufacturer deleted successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/exists
   * Check if manufacturer exists
   */
  async manufacturerExists(req: GetManufacturerRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CHECK_MANUFACTURER_EXISTS');

        const exists = await this.manufacturerDataService.manufacturerExists(req.validatedParams.manufacturerId);

        this.logAction(req, 'CHECK_MANUFACTURER_EXISTS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          exists
        });

        return { exists };
      });
    }, res, 'Manufacturer existence checked successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/basic-info
   * Get basic manufacturer info (lightweight)
   */
  async getManufacturerBasicInfo(req: GetManufacturerRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURER_BASIC_INFO');

        const basicInfo = await this.manufacturerDataService.getManufacturerBasicInfo(req.validatedParams.manufacturerId);

        if (!basicInfo) {
          throw new Error('Manufacturer not found');
        }

        this.logAction(req, 'GET_MANUFACTURER_BASIC_INFO_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId
        });

        return { basicInfo };
      });
    }, res, 'Manufacturer basic info retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/bulk-get
   * Bulk get manufacturers by IDs
   */
  async getManufacturersByIds(req: GetManufacturersByIdsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURERS_BY_IDS');

        const manufacturers = await this.manufacturerDataService.getManufacturersByIds(req.validatedBody.manufacturerIds);

        this.logAction(req, 'GET_MANUFACTURERS_BY_IDS_SUCCESS', {
          businessId: req.businessId,
          requestedIds: req.validatedBody.manufacturerIds.length,
          foundCount: manufacturers.length
        });

        return { manufacturers };
      });
    }, res, 'Manufacturers retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/count
   * Get manufacturer count by criteria
   */
  async getManufacturerCount(req: GetManufacturerCountRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MANUFACTURER_COUNT');

        const criteria = req.validatedQuery?.criteria ? JSON.parse(req.validatedQuery.criteria) : {};
        const count = await this.manufacturerDataService.getManufacturerCount(criteria);

        this.logAction(req, 'GET_MANUFACTURER_COUNT_SUCCESS', {
          businessId: req.businessId,
          criteria: Object.keys(criteria),
          count
        });

        return { count };
      });
    }, res, 'Manufacturer count retrieved successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerDataController = new ManufacturerDataController();
